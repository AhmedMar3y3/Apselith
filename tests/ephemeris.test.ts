import { expect, it } from 'vitest';
import {
  AU_KM,
  projectSkyMarker,
  skyPlanetPositions,
  solarSystemPositions,
} from '../src/domain/astronomy/ephemeris';
it('places all eight planets at physically meaningful heliocentric distances', () => {
  const planets = solarSystemPositions(Date.parse('2000-01-01T12:00:00Z'));
  expect(planets).toHaveLength(8);
  const earth = planets.find((body) => body.body === 'Earth');
  const neptune = planets.find((body) => body.body === 'Neptune');
  expect(earth?.distanceAu).toBeGreaterThan(0.98);
  expect(earth?.distanceAu).toBeLessThan(1.02);
  expect(neptune?.distanceAu).toBeGreaterThan(29);
  expect(neptune?.distanceAu).toBeLessThan(31);
  for (const planet of planets)
    expect(Math.hypot(planet.x, planet.y, planet.z)).toBeCloseTo(
      planet.distanceAu,
      10,
    );
});
it('produces Earth-fixed apparent planetary positions and excludes Earth itself', () => {
  const planets = skyPlanetPositions(Date.parse('2026-10-20T00:00:00Z'));
  expect(planets).toHaveLength(7);
  expect(planets.some((planet) => String(planet.body) === 'Earth')).toBe(false);
  for (const planet of planets) {
    const au = Math.hypot(planet.x, planet.y, planet.z) / (AU_KM * 1000);
    expect(au).toBeGreaterThan(0.1);
    expect(au).toBeLessThan(35);
  }
});
it('changes planetary position with UTC and rejects unsupported dates', () => {
  const a = solarSystemPositions(Date.parse('2026-01-01T00:00:00Z'));
  const b = solarSystemPositions(Date.parse('2026-07-01T00:00:00Z'));
  expect(a.find((planet) => planet.body === 'Earth')?.x).not.toBe(
    b.find((planet) => planet.body === 'Earth')?.x,
  );
  expect(() => skyPlanetPositions(NaN)).toThrow();
  expect(() =>
    solarSystemPositions(Date.parse('1500-01-01T00:00:00Z')),
  ).toThrow();
});
it('keeps apparent viewing directions when projecting planets inside the render far plane', () => {
  const observer = { x: 12000000, y: 3000000, z: 1000000 };
  const target = { x: 8e10, y: -2e11, z: 4e10 };
  const point = projectSkyMarker(target, observer);
  const actual = [
    target.x - observer.x,
    target.y - observer.y,
    target.z - observer.z,
  ];
  const projected = [
    point.x - observer.x,
    point.y - observer.y,
    point.z - observer.z,
  ];
  const actualLength = Math.hypot(...actual);
  const projectedLength = Math.hypot(...projected);
  expect(projectedLength).toBeCloseTo(430000000, 3);
  for (let axis = 0; axis < 3; axis++)
    expect((actual[axis] ?? 0) / actualLength).toBeCloseTo(
      (projected[axis] ?? 0) / projectedLength,
      12,
    );
});
