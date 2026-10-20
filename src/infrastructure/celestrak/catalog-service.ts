import { openDB } from 'idb';
import { z } from 'zod';
import {
  parseCatalog,
  type OrbitalElements,
} from '../../domain/satellite/catalog';
export const REFRESH_MS = 2 * 60 * 60 * 1000;
import type { CatalogGroup } from '../../domain/satellite/groups';
const envelope = z.object({
  fetchedAt: z.number().finite(),
  records: z.unknown(),
});
export type Catalog = {
  satellites: OrbitalElements[];
  fetchedAt: number;
  source: 'network' | 'cache' | 'snapshot';
  rejected: number;
  warning?: string;
};
async function database() {
  // Keep the original storage namespace so the APSELITH rename preserves existing catalogs.
  return openDB('orbitlab', 1, {
    upgrade(db) {
      db.createObjectStore('catalogs');
    },
  });
}
export async function loadCatalog(
  group: CatalogGroup = 'stations',
): Promise<Catalog> {
  const endpoint = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`;
  const throttleKey = `orbitlab:last-fetch:${group}`;
  const warnings: string[] = [];
  let cached: Catalog | undefined;
  try {
    const db = await database();
    try {
      const raw: unknown = await db.get('catalogs', group);
      const parsed = envelope.safeParse(raw);
      if (parsed.success)
        cached = {
          ...parseCatalog(parsed.data.records),
          fetchedAt: parsed.data.fetchedAt,
          source: 'cache',
        };
    } finally {
      db.close();
    }
  } catch {
    warnings.push('Browser cache unavailable.');
  }
  if (cached && Date.now() - cached.fetchedAt < REFRESH_MS)
    return { ...cached, warning: warnings.join(' ') || undefined };
  // Cross-tab request throttling avoids repeated provider requests after failures.
  let lastAttempt = 0;
  try {
    lastAttempt =
      Number(localStorage.getItem(throttleKey)) ||
      (group === 'stations'
        ? Number(localStorage.getItem('orbitlab:last-fetch'))
        : 0) ||
      0;
  } catch {
    warnings.push('Request-throttle storage unavailable.');
  }
  if (Date.now() - lastAttempt >= REFRESH_MS) {
    try {
      try {
        localStorage.setItem(throttleKey, String(Date.now()));
      } catch {
        warnings.push(
          'Request timing could not be saved; avoid frequent reloads.',
        );
      }
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new Error(`Provider returned HTTP ${response.status}.`);
      const records: unknown = await response.json();
      const parsed = parseCatalog(records);
      const fetchedAt = Date.now();
      try {
        const db = await database();
        try {
          await db.put('catalogs', { records, fetchedAt }, group);
        } finally {
          db.close();
        }
      } catch {
        warnings.push('Catalog loaded, but could not be saved offline.');
      }
      return {
        ...parsed,
        fetchedAt,
        source: 'network',
        warning: warnings.join(' ') || undefined,
      };
    } catch (error) {
      warnings.push(
        error instanceof Error ? error.message : 'Provider unavailable.',
      );
    }
  } else warnings.push('Provider requests limited to once every two hours.');
  if (cached) return { ...cached, warning: warnings.join(' ') };
  const response = await fetch(`/data/${group}.json`);
  if (!response.ok)
    throw new Error(
      'Provider and offline catalog are unavailable. Try again later.',
    );
  const snapshot = envelope.parse(await response.json());
  return {
    ...parseCatalog(snapshot.records),
    fetchedAt: snapshot.fetchedAt,
    source: 'snapshot',
    warning: `${warnings.join(' ')} Using a dated offline snapshot.`,
  };
}
