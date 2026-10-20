import { useState } from 'react';
import {
  EARTH_RADIUS_KM,
  keplerPosition,
  orbitProperties,
  type KeplerOrbit,
} from '../../domain/orbit/kepler';
import { useClock } from '../timeline/clock-store';
const radians = Math.PI / 180;
const initial: KeplerOrbit = {
  semiMajorAxis: 10000,
  eccentricity: 0.2,
  inclination: 35 * radians,
  raan: 25 * radians,
  argumentOfPerigee: 30 * radians,
  meanAnomaly: 0,
};
const fields = [
  {
    key: 'semiMajorAxis',
    label: 'Semi-major axis',
    unit: 'km',
    min: 6500,
    max: 50000,
    step: 10,
  },
  {
    key: 'eccentricity',
    label: 'Eccentricity',
    unit: '',
    min: 0,
    max: 0.9,
    step: 0.01,
  },
  {
    key: 'inclination',
    label: 'Inclination',
    unit: '°',
    min: 0,
    max: 180,
    step: 1,
  },
  {
    key: 'raan',
    label: 'Ascending node (RAAN)',
    unit: '°',
    min: 0,
    max: 360,
    step: 1,
  },
  {
    key: 'argumentOfPerigee',
    label: 'Argument of perigee',
    unit: '°',
    min: 0,
    max: 360,
    step: 1,
  },
  {
    key: 'meanAnomaly',
    label: 'Initial mean anomaly',
    unit: '°',
    min: 0,
    max: 360,
    step: 1,
  },
] as const;
function calculate(orbit: KeplerOrbit, elapsed: number) {
  try {
    return {
      valid: true as const,
      properties: orbitProperties(orbit),
      state: keplerPosition(orbit, elapsed),
    };
  } catch (error) {
    return {
      valid: false as const,
      error: error instanceof Error ? error.message : 'Invalid orbit.',
    };
  }
}
export function Laboratory() {
  const [orbit, setOrbit] = useState(initial);
  const [epoch, setEpoch] = useState(() => useClock.getState().now);
  const [projection, setProjection] = useState(false);
  const now = useClock((state) => state.now);
  const result = calculate(orbit, (now - epoch) / 1000);
  const displayOrbit = projection
    ? orbit
    : { ...orbit, inclination: 0, raan: 0, argumentOfPerigee: 0 };
  const scale = 260 / (orbit.semiMajorAxis * (1 + orbit.eccentricity));
  const project = (position: { x: number; y: number; z: number }) =>
    `${400 + position.x * scale},${310 - position.y * scale}`;
  const path = result.valid
    ? Array.from({ length: 241 }, (_, index) =>
        project(
          keplerPosition(displayOrbit, (index / 240) * result.properties.period)
            .position,
        ),
      ).join(' ')
    : '';
  const position = result.valid
    ? keplerPosition(displayOrbit, (now - epoch) / 1000).position
    : undefined;
  const perigee = result.valid
    ? keplerPosition({ ...displayOrbit, meanAnomaly: 0 }, 0).position
    : undefined;
  const apogee = result.valid
    ? keplerPosition({ ...displayOrbit, meanAnomaly: Math.PI }, 0).position
    : undefined;
  return (
    <main className="lab-layout">
      <aside className="panel lab-controls">
        <span className="eyebrow">THE ORBITAL LABORATORY</span>
        <h1>Build an orbit.</h1>
        <p className="muted">
          An idealized two-body experiment. Change the elements and explore the
          consequences.
        </p>
        <div className="data-badge">EDUCATIONAL SIMULATION</div>
        {fields.map((field) => {
          const angular = field.unit === '°';
          const value = orbit[field.key] / (angular ? radians : 1);
          return (
            <label className="orbit-field" key={field.key}>
              <span>
                {field.label} <small>{field.unit}</small>
              </span>
              <input
                aria-label={field.label}
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                value={Number.isFinite(value) ? Number(value.toFixed(4)) : ''}
                onChange={(event) =>
                  setOrbit((current) => ({
                    ...current,
                    [field.key]:
                      event.target.valueAsNumber * (angular ? radians : 1),
                  }))
                }
              />
            </label>
          );
        })}
        <button
          className="wide"
          onClick={() => {
            setOrbit(initial);
            setEpoch(now);
          }}
        >
          Reset experiment
        </button>
      </aside>
      <section className="lab-visual">
        <div className="view-heading">
          <span className="eyebrow">KEPLERIAN ORBIT / EARTH AT FOCUS</span>
          <label>
            <input
              type="checkbox"
              checked={projection}
              onChange={(event) => setProjection(event.target.checked)}
            />{' '}
            Equatorial projection
          </label>
        </div>
        {result.valid ? (
          <svg
            viewBox="0 0 800 620"
            role="img"
            aria-label="Calculated elliptical orbit with Earth at one focus, perigee, apogee, and moving simulated satellite"
          >
            <defs>
              <radialGradient id="earth">
                <stop stopColor="#376b7b" />
                <stop offset="0.7" stopColor="#183d57" />
                <stop offset="1" stopColor="#10263c" />
              </radialGradient>
            </defs>
            <line
              x1="80"
              x2="720"
              y1="310"
              y2="310"
              stroke="#1d3044"
              strokeDasharray="3 7"
            />
            <line
              x1="400"
              x2="400"
              y1="30"
              y2="590"
              stroke="#1d3044"
              strokeDasharray="3 7"
            />
            <circle
              cx="400"
              cy="310"
              r={EARTH_RADIUS_KM * scale}
              fill="url(#earth)"
              stroke="#4a8795"
            />
            <text
              x="400"
              y="315"
              textAnchor="middle"
              fill="#9ab3c4"
              fontSize="12"
              letterSpacing="3"
            >
              EARTH
            </text>
            <polyline
              points={path}
              fill="none"
              stroke="#e8bc74"
              strokeWidth="1.7"
            />
            {perigee && (
              <g transform={`translate(${project(perigee)})`}>
                <circle r="4" fill="#e8bc74" />
                <text y="-14" textAnchor="middle" fill="#e8bc74" fontSize="12">
                  PERIGEE
                </text>
              </g>
            )}
            {apogee && (
              <g transform={`translate(${project(apogee)})`}>
                <circle r="4" fill="#e8bc74" />
                <text y="-14" textAnchor="middle" fill="#e8bc74" fontSize="12">
                  APOGEE
                </text>
              </g>
            )}
            {position && (
              <g transform={`translate(${project(position)})`}>
                <circle r="13" fill="#72e4e9" opacity="0.15" />
                <circle r="5" fill="#72e4e9" />
              </g>
            )}
          </svg>
        ) : (
          <div className="lab-invalid" role="alert">
            <h2>Orbit cannot be simulated</h2>
            <p>{result.error}</p>
          </div>
        )}
        <p className="lab-caption">
          {projection
            ? 'Orthographic view onto the reference equatorial plane. Orientation elements rotate the ellipse in 3D.'
            : 'Orbit-plane view. Orientation angles do not change the ellipse within its own plane.'}
          <br />
          Motion follows Kepler’s equation, using the shared simulation clock.
        </p>
      </section>
      <aside className="panel lab-results">
        <span className="eyebrow">CALCULATED PROPERTIES</span>
        <h2>The shape of motion</h2>
        {result.valid && (
          <>
            <div className="altitude">
              <strong>{(result.properties.period / 60).toFixed(1)}</strong>
              <span>
                min
                <br />
                PERIOD
              </span>
            </div>
            <dl>
              <dt>Perigee altitude</dt>
              <dd>{result.properties.perigee.toFixed(1)} km</dd>
              <dt>Apogee altitude</dt>
              <dd>{result.properties.apogee.toFixed(1)} km</dd>
              <dt>Current speed</dt>
              <dd>{result.state.speed.toFixed(3)} km/s</dd>
              <dt>Specific energy</dt>
              <dd>{result.properties.energy.toFixed(3)} km²/s²</dd>
            </dl>
          </>
        )}
        <section>
          <h3>Model assumptions</h3>
          <p className="muted">
            Spherical Earth, point-mass gravity and an unperturbed elliptic
            orbit. No drag, oblateness, third bodies or maneuvers.
          </p>
          <p className="muted">
            Orientation is relative to an abstract inertial equatorial frame.
            This experiment is separate from published satellite data.
          </p>
          <p className="muted">
            Earth-intersecting trajectories are rejected. Low perigees may
            encounter substantial atmospheric drag that this model omits.
          </p>
        </section>
      </aside>
    </main>
  );
}
