import {
  ecfToLookAngles,
  degreesToRadians,
  radiansToDegrees,
} from 'satellite.js';
import { z } from 'zod';
import type { OrbitalElements } from '../../domain/satellite/catalog';
import { createRecord, positionAt, validatePredictionTime } from './sgp4';
export const observerSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().min(-0.5).max(10),
  minimumElevation: z.number().min(0).max(80),
});
export type Observer = z.infer<typeof observerSchema>;
export type Pass = {
  rise: number;
  peak: number;
  set: number;
  maxElevation: number;
  riseAzimuth: number;
  peakAzimuth: number;
  setAzimuth: number;
};
export function predictPasses(
  elements: OrbitalElements,
  input: Observer,
  start: number,
): Pass[] {
  const observer = observerSchema.parse(input);
  const end = start + 24 * 3600000;
  validatePredictionTime(elements, start);
  validatePredictionTime(elements, end);
  const record = createRecord(elements);
  const location = {
    latitude: degreesToRadians(observer.latitude),
    longitude: degreesToRadians(observer.longitude),
    height: observer.altitude,
  };
  const look = (time: number) => {
    const p = positionAt(record, elements.NORAD_CAT_ID, time);
    const angles = ecfToLookAngles(location, p);
    return {
      elevation: radiansToDegrees(angles.elevation),
      azimuth: radiansToDegrees(angles.azimuth),
    };
  };
  const crossing = (left: number, right: number, rising: boolean) => {
    while (right - left > 250) {
      const middle = (left + right) / 2;
      if (look(middle).elevation >= observer.minimumElevation === rising)
        right = middle;
      else left = middle;
    }
    return (left + right) / 2;
  };
  const results: Pass[] = [];
  let previous = look(start).elevation;
  let rise: number | undefined;
  for (let time = start + 10000; time <= end; time += 10000) {
    const elevation = look(time).elevation;
    if (
      previous < observer.minimumElevation &&
      elevation >= observer.minimumElevation
    )
      rise = crossing(time - 10000, time, true);
    if (
      rise !== undefined &&
      previous >= observer.minimumElevation &&
      elevation < observer.minimumElevation
    ) {
      const set = crossing(time - 10000, time, false);
      let low = rise;
      let high = set;
      for (let iteration = 0; iteration < 32; iteration++) {
        const first = low + (high - low) / 3;
        const second = high - (high - low) / 3;
        if (look(first).elevation < look(second).elevation) low = first;
        else high = second;
      }
      const peak = (low + high) / 2;
      results.push({
        rise,
        peak,
        set,
        maxElevation: look(peak).elevation,
        riseAzimuth: look(rise).azimuth,
        peakAzimuth: look(peak).azimuth,
        setAzimuth: look(set).azimuth,
      });
      rise = undefined;
    }
    previous = elevation;
  }
  return results;
}
