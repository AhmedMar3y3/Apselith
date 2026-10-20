import type { OrbitalElements } from './catalog';
export const CATALOG_GROUPS = [
  { id: 'stations', label: 'Space stations' },
  { id: 'starlink', label: 'Starlink' },
  { id: 'gps-ops', label: 'GPS (operational)' },
  { id: 'galileo', label: 'Galileo' },
  { id: 'weather', label: 'Weather satellites' },
] as const;
export type CatalogGroup = (typeof CATALOG_GROUPS)[number]['id'];
export function isCatalogGroup(value: string): value is CatalogGroup {
  return CATALOG_GROUPS.some((group) => group.id === value);
}
export const MAX_RENDERED_SATELLITES = 150;
export function renderingSubset(
  matches: OrbitalElements[],
  selected: OrbitalElements | undefined,
) {
  const subset = matches.slice(0, MAX_RENDERED_SATELLITES);
  if (
    selected &&
    !subset.some((row) => row.NORAD_CAT_ID === selected.NORAD_CAT_ID)
  ) {
    if (subset.length === MAX_RENDERED_SATELLITES) subset.pop();
    subset.push(selected);
  }
  return subset;
}
