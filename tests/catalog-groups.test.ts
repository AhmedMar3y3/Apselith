import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCatalog } from '../src/domain/satellite/catalog';
import {
  CATALOG_GROUPS,
  isCatalogGroup,
  MAX_RENDERED_SATELLITES,
  renderingSubset,
} from '../src/domain/satellite/groups';
import { z } from 'zod';
const envelope = z.object({ fetchedAt: z.number(), records: z.unknown() });
describe('published catalog groups', () => {
  for (const group of CATALOG_GROUPS)
    it(`validates the real ${group.label} snapshot`, () => {
      const snapshot = envelope.parse(
        JSON.parse(
          readFileSync(`public/data/${group.id}.json`, 'utf8').replace(
            /^\uFEFF/,
            '',
          ),
        ),
      );
      const catalog = parseCatalog(snapshot.records);
      expect(catalog.satellites.length).toBeGreaterThan(10);
      expect(snapshot.fetchedAt).toBeGreaterThan(0);
      if (group.id === 'starlink') {
        expect(catalog.satellites.length).toBeGreaterThan(10000);
        const selected = catalog.satellites.at(-1);
        if (!selected) throw new Error('Missing last object');
        const visible = renderingSubset(catalog.satellites, selected);
        expect(visible).toHaveLength(MAX_RENDERED_SATELLITES);
        expect(visible).toContain(selected);
        expect(new Set(visible.map((row) => row.NORAD_CAT_ID)).size).toBe(
          MAX_RENDERED_SATELLITES,
        );
      }
    });
  it('accepts only supported provider groups', () => {
    expect(isCatalogGroup('gps-ops')).toBe(true);
    expect(isCatalogGroup('../invalid')).toBe(false);
  });
});
