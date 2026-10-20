import { describe, expect, it } from 'vitest';
import {
  eciToEcf,
  eciToGeodetic,
  propagate,
  twoline2satrec,
} from 'satellite.js';
import { predictPasses } from '../src/infrastructure/propagation/passes';
import {
  createRecord,
  positionAt,
  validatePredictionTime,
} from '../src/infrastructure/propagation/sgp4';
import { elementSchema, epochMs } from '../src/domain/satellite/catalog';
import snapshot from '../public/data/stations.json';
const iss = elementSchema.parse(
  snapshot.records.find((row) => row.NORAD_CAT_ID === 25544),
);
describe('SGP4 reference and coordinate conventions', () => {
  it('matches Vallado verification case 00005 at epoch (km)', () => {
    const record = twoline2satrec(
      '1 00005U 58002B   00179.78495062  .00000023  00000-0  28098-4 0  4753',
      '2 00005  34.2682 348.7242 1859667 331.7664  19.3264 10.82419157413667',
    );
    const result = propagate(record, new Date('2000-06-27T18:50:19.733568Z'));
    expect(result?.position.x).toBeCloseTo(7022.46529266, 2);
    expect(result?.position.y).toBeCloseTo(-1400.08296755, 2);
    expect(result?.position.z).toBeCloseTo(0.03995155, 2);
  });
  it('uses the documented sidereal rotation sign and WGS84 equatorial radius', () => {
    const fixed = eciToEcf({ x: 7000, y: 0, z: 0 }, Math.PI / 2);
    expect(fixed.x).toBeCloseTo(0, 9);
    expect(fixed.y).toBeCloseTo(-7000, 9);
    const geodetic = eciToGeodetic({ x: 6378.137, y: 0, z: 0 }, 0);
    expect(geodetic.height).toBeCloseTo(0, 6);
    expect(geodetic.latitude).toBe(0);
  });
  it('propagates OMM elements and refuses unsupported prediction dates', () => {
    const point = positionAt(createRecord(iss), iss.NORAD_CAT_ID, epochMs(iss));
    expect(point.altitude).toBeGreaterThan(350);
    expect(point.altitude).toBeLessThan(500);
    expect(() =>
      validatePredictionTime(iss, epochMs(iss) + 15 * 86400000),
    ).toThrow();
  });
});
describe('geometric pass prediction', () => {
  it('finds complete passes with refined rise/set and maximum above threshold', () => {
    const observer = {
      latitude: 30.0444,
      longitude: 31.2357,
      altitude: 0,
      minimumElevation: 10,
    };
    const passes = predictPasses(iss, observer, epochMs(iss));
    expect(passes.length).toBeGreaterThan(0);
    for (const pass of passes) {
      expect(pass.rise).toBeLessThan(pass.peak);
      expect(pass.peak).toBeLessThan(pass.set);
      expect(pass.maxElevation).toBeGreaterThanOrEqual(10);
      expect(pass.maxElevation).toBeLessThanOrEqual(90);
      expect(pass.set - pass.rise).toBeLessThan(20 * 60000);
    }
  });
  it('rejects invalid observer coordinates', () => {
    expect(() =>
      predictPasses(
        iss,
        { latitude: 91, longitude: 0, altitude: 0, minimumElevation: 10 },
        epochMs(iss),
      ),
    ).toThrow();
  });
});
