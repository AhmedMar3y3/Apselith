import {
  Body,
  GeoVector,
  HelioVector,
  RotateVector,
  Rotation_EQJ_ECL,
  Rotation_EQJ_EQD,
  SiderealTime,
} from 'astronomy-engine';
export const AU_KM = 149597870.7;
export function projectSkyMarker(
  target: { x: number; y: number; z: number },
  observer: { x: number; y: number; z: number },
) {
  const x = target.x - observer.x;
  const y = target.y - observer.y;
  const z = target.z - observer.z;
  const range = Math.hypot(x, y, z);
  if (!Number.isFinite(range) || range === 0)
    throw new Error('Invalid celestial viewing direction.');
  // Direction-preserving camera-centered sky shell stays within Cesium's far plane.
  // It is a sky symbol, not a relocated physical planet or an occultation model.
  const scale = 430000000 / range;
  return {
    x: observer.x + x * scale,
    y: observer.y + y * scale,
    z: observer.z + z * scale,
  };
}
export const PLANETS = [
  { body: Body.Mercury, color: '#b7aca1' },
  { body: Body.Venus, color: '#e0c28b' },
  { body: Body.Earth, color: '#7fc9ed' },
  { body: Body.Mars, color: '#de9676' },
  { body: Body.Jupiter, color: '#d2bda3' },
  { body: Body.Saturn, color: '#d6c88f' },
  { body: Body.Uranus, color: '#9fdadd' },
  { body: Body.Neptune, color: '#829eea' },
] as const;
function checkedDate(time: number) {
  const date = new Date(time);
  if (
    !Number.isFinite(time) ||
    date.getUTCFullYear() < 1600 ||
    date.getUTCFullYear() > 2400
  )
    throw new Error('Planetary views support dates from 1600 through 2400.');
  return date;
}
export function solarSystemPositions(time: number) {
  const date = checkedDate(time);
  return PLANETS.map((planet) => {
    const vector = RotateVector(
      Rotation_EQJ_ECL(),
      HelioVector(planet.body, date),
    );
    return {
      ...planet,
      x: vector.x,
      y: vector.y,
      z: vector.z,
      distanceAu: Math.hypot(vector.x, vector.y, vector.z),
    };
  });
}
export function skyPlanetPositions(time: number) {
  const date = checkedDate(time);
  const rotation = Rotation_EQJ_EQD(date);
  const angle = (SiderealTime(date) * Math.PI) / 12;
  return PLANETS.filter((planet) => planet.body !== Body.Earth).map(
    (planet) => {
      // Apparent geocentric EQJ → true equator/equinox of date → Earth-fixed via GAST.
      // This is separate from the satellite TEME conversion; no polar-motion correction.
      const vector = RotateVector(rotation, GeoVector(planet.body, date, true));
      const metersPerAu = AU_KM * 1000;
      return {
        ...planet,
        x:
          (Math.cos(angle) * vector.x + Math.sin(angle) * vector.y) *
          metersPerAu,
        y:
          (-Math.sin(angle) * vector.x + Math.cos(angle) * vector.y) *
          metersPerAu,
        z: vector.z * metersPerAu,
      };
    },
  );
}
