import { eciToGeodetic, degreesLat, degreesLong } from 'satellite.js';
import type { SatellitePosition } from './sgp4';
export type SatelliteTrack = { id: number; samples: SatellitePosition[] };
/** Cubic Hermite in Earth-fixed km, using Earth-fixed km/s derivatives. Never extrapolate. */
export function interpolateTrack(
  track: SatelliteTrack,
  time: number,
): SatellitePosition | undefined {
  const first = track.samples[0];
  const last = track.samples.at(-1);
  if (!first || !last || time < first.time || time > last.time)
    return undefined;
  if (time === last.time) return last;
  let low = 0;
  let high = track.samples.length - 1;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    const sample = track.samples[mid];
    if (!sample) return undefined;
    if (sample.time <= time) low = mid;
    else high = mid;
  }
  const a = track.samples[low];
  const b = track.samples[high];
  if (!a || !b || b.time <= a.time) return undefined;
  const seconds = (b.time - a.time) / 1000;
  const t = (time - a.time) / (b.time - a.time);
  const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
  const h10 = t ** 3 - 2 * t ** 2 + t;
  const h01 = -2 * t ** 3 + 3 * t ** 2;
  const h11 = t ** 3 - t ** 2;
  const axis = (p0: number, p1: number, v0: number, v1: number) =>
    h00 * p0 + h10 * seconds * v0 + h01 * p1 + h11 * seconds * v1;
  const fixed = {
    x: axis(a.x, b.x, a.vx, b.vx),
    y: axis(a.y, b.y, a.vy, b.vy),
    z: axis(a.z, b.z, a.vz, b.vz),
  };
  const geo = eciToGeodetic(fixed, 0);
  return {
    ...a,
    ...fixed,
    time,
    latitude: degreesLat(geo.latitude),
    longitude: degreesLong(geo.longitude),
    altitude: geo.height,
    speed: a.speed + (b.speed - a.speed) * t,
  };
}
