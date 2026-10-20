import { z } from 'zod';

const angle = z.number().finite().min(0).lt(360);
export const elementSchema = z.object({
  OBJECT_NAME: z.string().min(1),
  OBJECT_ID: z.string(),
  NORAD_CAT_ID: z.number().int().positive(),
  EPOCH: z
    .string()
    .regex(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z?$/)
    .refine(
      (value) =>
        Number.isFinite(Date.parse(value.endsWith('Z') ? value : `${value}Z`)),
      'Invalid UTC epoch',
    ),
  MEAN_MOTION: z.number().positive().max(20),
  ECCENTRICITY: z.number().min(0).lt(1),
  INCLINATION: z.number().min(0).max(180),
  RA_OF_ASC_NODE: angle,
  ARG_OF_PERICENTER: angle,
  MEAN_ANOMALY: angle,
  BSTAR: z.number().finite(),
  MEAN_MOTION_DOT: z.number().finite(),
  MEAN_MOTION_DDOT: z.number().finite(),
  EPHEMERIS_TYPE: z.literal(0),
  CLASSIFICATION_TYPE: z.enum(['U', 'C']),
  ELEMENT_SET_NO: z.number().int().nonnegative(),
  REV_AT_EPOCH: z.number().int().nonnegative(),
});
export type OrbitalElements = z.infer<typeof elementSchema>;
export function parseCatalog(input: unknown) {
  const rows = z.array(z.unknown()).max(20000).parse(input);
  const satellites: OrbitalElements[] = [];
  let rejected = 0;
  const ids = new Set<number>();
  for (const row of rows) {
    const result = elementSchema.safeParse(row);
    if (result.success && !ids.has(result.data.NORAD_CAT_ID)) {
      satellites.push(result.data);
      ids.add(result.data.NORAD_CAT_ID);
    } else rejected++;
  }
  if (!satellites.length)
    throw new Error('The catalog contains no supported orbital elements.');
  return { satellites, rejected };
}
export function epochMs(elements: OrbitalElements) {
  return Date.parse(
    elements.EPOCH.endsWith('Z') ? elements.EPOCH : `${elements.EPOCH}Z`,
  );
}
export function searchCatalog(
  satellites: readonly OrbitalElements[],
  query: string,
) {
  const text = query.trim().toLowerCase();
  return satellites.filter(
    (satellite) =>
      satellite.OBJECT_NAME.toLowerCase().includes(text) ||
      String(satellite.NORAD_CAT_ID).includes(text),
  );
}
