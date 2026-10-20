import { expect, it } from 'vitest';
import { twoline2satrec } from 'satellite.js';
import fixture from '../docs/validation/iss-comparison.json';
import {
  positionAt,
  createRecord,
} from '../src/infrastructure/propagation/sgp4';
import { elementSchema } from '../src/domain/satellite/catalog';
it('reproduces the independent WTIA position with its own published TLE', () => {
  const record = twoline2satrec(
    fixture.referenceTle.line1,
    fixture.referenceTle.line2,
  );
  const point = positionAt(record, 25544, fixture.reference.timestamp * 1000);
  expect(point.latitude).toBeCloseTo(fixture.reference.latitude, 5);
  expect(point.longitude).toBeCloseTo(fixture.reference.longitude, 5);
  // Different ellipsoid constants in independent engines can differ by a few meters.
  expect(Math.abs(point.altitude - fixture.reference.altitude)).toBeLessThan(
    0.003,
  );
});
it('keeps APSELITH OMM and Heavens-Above TLE predictions within two meters at the captured UTC', () => {
  const point = positionAt(
    createRecord(elementSchema.parse(fixture.apselithElements)),
    25544,
    fixture.reference.timestamp * 1000,
  );
  const [line1, line2] = fixture.heavensAboveLines;
  if (!line1 || !line2) throw new Error('Missing reference TLE');
  const reference = positionAt(
    twoline2satrec(line1, line2),
    25544,
    fixture.reference.timestamp * 1000,
  );
  expect(
    Math.hypot(
      point.x - reference.x,
      point.y - reference.y,
      point.z - reference.z,
    ),
  ).toBeLessThan(0.002);
});
