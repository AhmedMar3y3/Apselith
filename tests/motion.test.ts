import { describe, expect, it } from 'vitest';
import {
  createRecord,
  positionAt,
} from '../src/infrastructure/propagation/sgp4';
import { interpolateTrack } from '../src/infrastructure/propagation/interpolation';
import { elementSchema, epochMs } from '../src/domain/satellite/catalog';
import snapshot from '../public/data/stations.json';
const iss = elementSchema.parse(
  snapshot.records.find((row) => row.NORAD_CAT_ID === 25544),
);
const epoch = epochMs(iss);
describe('time-correct smooth motion', () => {
  it('matches direct SGP4 throughout ten-second interpolation brackets to within one meter', () => {
    const record = createRecord(iss);
    for (const offset of [0, 900000, 2700000, 5400000]) {
      const start = epoch + offset;
      const track = {
        id: iss.NORAD_CAT_ID,
        samples: [
          positionAt(record, iss.NORAD_CAT_ID, start),
          positionAt(record, iss.NORAD_CAT_ID, start + 10000),
        ],
      };
      for (const delta of [0, 17, 1000, 2500, 5000, 9999, 10000]) {
        const interpolated = interpolateTrack(track, start + delta);
        const direct = positionAt(record, iss.NORAD_CAT_ID, start + delta);
        expect(interpolated).toBeDefined();
        if (!interpolated) throw new Error('Missing interpolation');
        expect(
          Math.hypot(
            interpolated.x - direct.x,
            interpolated.y - direct.y,
            interpolated.z - direct.z,
          ),
        ).toBeLessThan(0.001);
      }
    }
  });
  it('rejects extrapolation and gives the exact endpoint without easing lag', () => {
    const record = createRecord(iss);
    const a = positionAt(record, iss.NORAD_CAT_ID, epoch);
    const b = positionAt(record, iss.NORAD_CAT_ID, epoch + 10000);
    const track = { id: iss.NORAD_CAT_ID, samples: [a, b] };
    expect(interpolateTrack(track, epoch - 1)).toBeUndefined();
    expect(interpolateTrack(track, epoch + 10001)).toBeUndefined();
    expect(interpolateTrack(track, b.time)).toEqual(b);
    expect(interpolateTrack(track, epoch + 5000)?.time).toBe(epoch + 5000);
  });
  it('uses Earth-fixed velocity including Earth rotation', () => {
    const record = createRecord(iss);
    const p = positionAt(record, iss.NORAD_CAT_ID, epoch);
    const before = positionAt(record, iss.NORAD_CAT_ID, epoch - 500);
    const after = positionAt(record, iss.NORAD_CAT_ID, epoch + 500);
    expect(p.vx).toBeCloseTo(after.x - before.x, 3);
    expect(p.vy).toBeCloseTo(after.y - before.y, 3);
    expect(p.vz).toBeCloseTo(after.z - before.z, 3);
  });
});
