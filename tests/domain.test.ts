import { describe, expect, it } from 'vitest';
import { clockTime } from '../src/domain/clock';
import {
  EARTH_RADIUS_KM,
  keplerPosition,
  MU,
  orbitProperties,
  type KeplerOrbit,
} from '../src/domain/orbit/kepler';
import {
  elementSchema,
  parseCatalog,
  searchCatalog,
} from '../src/domain/satellite/catalog';
import snapshot from '../public/data/stations.json';
const circular: KeplerOrbit = {
  semiMajorAxis: 7000,
  eccentricity: 0,
  inclination: 0,
  raan: 0,
  argumentOfPerigee: 0,
  meanAnomaly: 0,
};
describe('two-body mechanics', () => {
  it('matches the 7000 km circular reference orbit', () => {
    const result = orbitProperties(circular);
    expect(result.period).toBeCloseTo(5828.516638, 5);
    expect(keplerPosition(circular, 0).speed).toBeCloseTo(7.54605329, 7);
    const quarter = keplerPosition(circular, result.period / 4).position;
    expect(quarter.x).toBeCloseTo(0, 7);
    expect(quarter.y).toBeCloseTo(7000, 7);
  });
  it('puts Earth at a focus and conserves energy on an eccentric orbit', () => {
    const orbit = { ...circular, semiMajorAxis: 12000, eccentricity: 0.4 };
    const properties = orbitProperties(orbit);
    expect(properties.perigee).toBeCloseTo(7200 - EARTH_RADIUS_KM, 6);
    expect(properties.apogee).toBeCloseTo(16800 - EARTH_RADIUS_KM, 6);
    for (const seconds of [0, 1000, 4000]) {
      const state = keplerPosition(orbit, seconds);
      const radius = Math.hypot(
        state.position.x,
        state.position.y,
        state.position.z,
      );
      expect(state.speed ** 2 / 2 - MU / radius).toBeCloseTo(
        properties.energy,
        10,
      );
    }
  });
  it('rotates a polar orbit out of the equatorial plane', () => {
    const point = keplerPosition(
      { ...circular, inclination: Math.PI / 2 },
      orbitProperties(circular).period / 4,
    ).position;
    expect(point.y).toBeCloseTo(0, 8);
    expect(point.z).toBeCloseTo(7000, 8);
  });
  it('rejects intersecting, hyperbolic and nonfinite elements', () => {
    for (const invalid of [
      { ...circular, eccentricity: 0.5 },
      { ...circular, eccentricity: 1 },
      { ...circular, semiMajorAxis: NaN },
    ])
      expect(() => orbitProperties(invalid)).toThrow();
  });
});
describe('authoritative clock', () => {
  it('uses an elapsed-time anchor and honors pause without incremental drift', () => {
    const clock = {
      anchorUtc: 1000000,
      anchorMonotonic: 50,
      speed: 60,
      playing: true,
      live: false,
    };
    expect(clockTime(clock, 1050)).toBe(1060000);
    expect(clockTime({ ...clock, playing: false }, 99999)).toBe(1000000);
  });
});
describe('catalog boundary', () => {
  it('accepts the published snapshot and searches by name and catalog ID', () => {
    const parsed = parseCatalog(snapshot.records);
    expect(parsed.rejected).toBe(0);
    expect(searchCatalog(parsed.satellites, '25544')[0]?.OBJECT_NAME).toBe(
      'ISS (ZARYA)',
    );
    expect(searchCatalog(parsed.satellites, '  zarya  ')).toHaveLength(1);
  });
  it('isolates malformed records and rejects an entirely invalid catalog', () => {
    const valid = snapshot.records[0];
    expect(parseCatalog([valid, { EPOCH: 'yesterday' }]).rejected).toBe(1);
    expect(() => parseCatalog([{}])).toThrow();
    expect(elementSchema.safeParse({ ...valid, ECCENTRICITY: 1 }).success).toBe(
      false,
    );
  });
});
