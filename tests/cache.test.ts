import 'fake-indexeddb/auto';
import { openDB, deleteDB } from 'idb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  loadCatalog,
  REFRESH_MS,
} from '../src/infrastructure/celestrak/catalog-service';
import snapshot from '../public/data/stations.json';
beforeEach(async () => {
  localStorage.clear();
  await deleteDB('orbitlab');
});
afterEach(() => vi.unstubAllGlobals());
it('validates and saves network data, then serves cache without a second fetch', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(snapshot.records)));
  vi.stubGlobal('fetch', fetcher);
  expect((await loadCatalog()).source).toBe('network');
  expect((await loadCatalog()).source).toBe('cache');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('reports a failed provider and retains stale cached elements', async () => {
  const db = await openDB('orbitlab', 1, {
    upgrade(database) {
      database.createObjectStore('catalogs');
    },
  });
  await db.put(
    'catalogs',
    { fetchedAt: Date.now() - REFRESH_MS - 1, records: snapshot.records },
    'stations',
  );
  db.close();
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  const result = await loadCatalog();
  expect(result.source).toBe('cache');
  expect(result.warning).toContain('offline');
});
it('uses an explicitly labeled static snapshot when no cache exists', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(new Response(JSON.stringify(snapshot))),
  );
  const result = await loadCatalog();
  expect(result.source).toBe('snapshot');
  expect(result.fetchedAt).toBe(snapshot.fetchedAt);
  expect(result.warning).toContain('dated offline snapshot');
});
it('keeps each group cache and request throttle independent', async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(snapshot.records))),
    );
  vi.stubGlobal('fetch', fetcher);
  expect((await loadCatalog('stations')).source).toBe('network');
  expect((await loadCatalog('gps-ops')).source).toBe('network');
  expect((await loadCatalog('stations')).source).toBe('cache');
  expect((await loadCatalog('gps-ops')).source).toBe('cache');
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(String(fetcher.mock.calls[1]?.[0])).toContain('GROUP=gps-ops');
});
