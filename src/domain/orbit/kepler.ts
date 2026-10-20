export const EARTH_RADIUS_KM = 6378.137;
export const MU = 398600.4418;
export type KeplerOrbit = {
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  raan: number;
  argumentOfPerigee: number;
  meanAnomaly: number;
};
export function orbitProperties(orbit: KeplerOrbit) {
  const { semiMajorAxis: a, eccentricity: e } = orbit;
  if (
    !Object.values(orbit).every(Number.isFinite) ||
    a <= 0 ||
    e < 0 ||
    e >= 1 ||
    orbit.inclination < 0 ||
    orbit.inclination > Math.PI
  )
    throw new Error(
      'Enter finite elliptic orbital elements (0 ≤ e < 1, 0° ≤ inclination ≤ 180°).',
    );
  const perigee = a * (1 - e) - EARTH_RADIUS_KM;
  if (perigee < 0)
    throw new Error(
      'This orbit intersects Earth. Increase the semi-major axis or reduce eccentricity.',
    );
  return {
    period: 2 * Math.PI * Math.sqrt(a ** 3 / MU),
    perigee,
    apogee: a * (1 + e) - EARTH_RADIUS_KM,
    energy: -MU / (2 * a),
  };
}
export function keplerPosition(orbit: KeplerOrbit, elapsedSeconds: number) {
  orbitProperties(orbit);
  const {
    semiMajorAxis: a,
    eccentricity: e,
    inclination: i,
    raan: node,
    argumentOfPerigee: w,
  } = orbit;
  const mean =
    (((orbit.meanAnomaly + Math.sqrt(MU / a ** 3) * elapsedSeconds) %
      (2 * Math.PI)) +
      2 * Math.PI) %
    (2 * Math.PI);
  let low = 0;
  let high = 2 * Math.PI;
  for (let iteration = 0; iteration < 60; iteration++) {
    const mid = (low + high) / 2;
    if (mid - e * Math.sin(mid) < mean) low = mid;
    else high = mid;
  }
  const E = (low + high) / 2;
  const x = a * (Math.cos(E) - e);
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const cn = Math.cos(node);
  const sn = Math.sin(node);
  const ci = Math.cos(i);
  const si = Math.sin(i);
  const position = {
    x: (cn * cw - sn * sw * ci) * x + (-cn * sw - sn * cw * ci) * y,
    y: (sn * cw + cn * sw * ci) * x + (-sn * sw + cn * cw * ci) * y,
    z: sw * si * x + cw * si * y,
  };
  const radius = a * (1 - e * Math.cos(E));
  return { position, speed: Math.sqrt(MU * (2 / radius - 1 / a)) };
}
