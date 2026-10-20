import {
  json2satrec,
  propagate,
  gstime,
  eciToEcf,
  eciToGeodetic,
  degreesLat,
  degreesLong,
  type SatRec,
} from 'satellite.js';
import { epochMs, type OrbitalElements } from '../../domain/satellite/catalog';
export type SatellitePosition = {
  id: number;
  time: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
};
export function createRecord(elements: OrbitalElements) {
  const record = json2satrec(elements);
  if (record.error)
    throw new Error(`SGP4 initialization failed (${record.error}).`);
  return record;
}
export function positionAt(
  record: SatRec,
  id: number,
  time: number,
): SatellitePosition {
  const date = new Date(time);
  const result = propagate(record, date);
  if (!result || record.error)
    throw new Error(`Propagation failed for NORAD ${id} (${record.error}).`);
  const gmst = gstime(date);
  // SGP4 TEME → Earth-fixed using satellite.js sidereal rotation. No ICRF reinterpretation.
  const fixed = eciToEcf(result.position, gmst);
  const rotatedVelocity = eciToEcf(result.velocity, gmst);
  const earthRate = 7.29211514670698e-5;
  const geodetic = eciToGeodetic(result.position, gmst);
  const values = [
    ...Object.values(fixed),
    geodetic.latitude,
    geodetic.longitude,
    geodetic.height,
  ];
  if (!values.every(Number.isFinite) || geodetic.height < 0)
    throw new Error(`Invalid or decayed position for NORAD ${id}.`);
  return {
    id,
    time,
    ...fixed,
    // Derivative in the rotating frame: R v_TEME − omega × r_fixed.
    vx: rotatedVelocity.x + earthRate * fixed.y,
    vy: rotatedVelocity.y - earthRate * fixed.x,
    vz: rotatedVelocity.z,
    latitude: degreesLat(geodetic.latitude),
    longitude: degreesLong(geodetic.longitude),
    altitude: geodetic.height,
    speed: Math.hypot(result.velocity.x, result.velocity.y, result.velocity.z),
  };
}
export function validatePredictionTime(
  elements: OrbitalElements,
  time: number,
) {
  if (
    !Number.isFinite(time) ||
    Math.abs(time - epochMs(elements)) > 14 * 86400000
  )
    throw new Error(
      'Prediction is outside the supported ±14-day element-epoch window. Refresh data or choose a closer time.',
    );
}
