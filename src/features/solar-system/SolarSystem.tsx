import { useMemo, useState } from 'react';
import { Body } from 'astronomy-engine';
import { solarSystemPositions } from '../../domain/astronomy/ephemeris';
import { useClock } from '../timeline/clock-store';
function calculate(time: number) {
  try {
    return { ok: true as const, planets: solarSystemPositions(time) };
  } catch (failure) {
    return {
      ok: false as const,
      error:
        failure instanceof Error
          ? failure.message
          : 'Ephemeris calculation failed.',
    };
  }
}
export function SolarSystem() {
  const time = useClock((state) => state.now);
  const minute = Math.floor(time / 60000);
  const result = useMemo(() => calculate(minute * 60000), [minute]);
  const [selected, setSelected] = useState<Body>(Body.Earth);
  const [innerOnly, setInnerOnly] = useState(false);
  const body = result.ok
    ? result.planets.find((planet) => planet.body === selected)
    : undefined;
  return (
    <main className="solar-layout">
      <section className="solar-intro">
        <span className="eyebrow">BEYOND EARTH ORBIT</span>
        <h1>Our celestial neighborhood.</h1>
        <p className="muted">
          Calculated planetary positions at the shared UTC time. Explore the
          eight planets around the Sun.
        </p>
        <label>
          <input
            type="checkbox"
            checked={innerOnly}
            onChange={(event) => setInnerOnly(event.target.checked)}
          />{' '}
          Inner planets only
        </label>
        <p className="muted">
          Schematic view from above the J2000 ecliptic. Distances are
          logarithmically compressed and planet sizes enlarged for readability.
          Rings are distance guides, not orbital trajectories.
        </p>
      </section>
      <section className="solar-map" aria-label="Solar System diagram">
        {result.ok ? (
          <svg
            viewBox="0 0 1100 760"
            role="img"
            aria-label="Sun and eight planets at calculated heliocentric positions"
          >
            <defs>
              <radialGradient id="sunGlow">
                <stop stopColor="#fff3b8" />
                <stop offset=".5" stopColor="#f7c76c" />
                <stop offset="1" stopColor="#e79035" />
              </radialGradient>
            </defs>
            <circle cx="550" cy="380" r="28" fill="#edaf4a" opacity=".08" />
            <circle cx="550" cy="380" r="17" fill="url(#sunGlow)" />
            <text
              x="550"
              y="420"
              textAnchor="middle"
              fill="#ebc37e"
              fontSize="11"
              letterSpacing="3"
            >
              SUN
            </text>
            {result.planets
              .filter((planet) => !innerOnly || planet.distanceAu < 2)
              .map((planet) => {
                const radius = innerOnly
                  ? 70 + 160 * Math.log1p(planet.distanceAu)
                  : 25 + 85 * Math.log1p(planet.distanceAu);
                const angle = Math.atan2(planet.y, planet.x);
                const x = 550 + radius * Math.cos(angle);
                const y = 380 - radius * Math.sin(angle);
                return (
                  <g key={planet.body}>
                    <circle
                      cx="550"
                      cy="380"
                      r={radius}
                      fill="none"
                      stroke="#262626"
                      strokeDasharray="2 7"
                    />
                    <g
                      role="button"
                      tabIndex={0}
                      aria-label={`Select ${planet.body}`}
                      onClick={() => setSelected(planet.body)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelected(planet.body);
                        }
                      }}
                      className="planet-target"
                    >
                      <circle cx={x} cy={y} r="17" fill="transparent" />
                      {selected === planet.body && (
                        <circle
                          cx={x}
                          cy={y}
                          r="14"
                          stroke={planet.color}
                          strokeOpacity=".6"
                          fill="none"
                        />
                      )}
                      {planet.body === Body.Saturn && (
                        <ellipse
                          cx={x}
                          cy={y}
                          rx="12"
                          ry="4"
                          fill="none"
                          stroke={planet.color}
                          transform={`rotate(-25 ${x} ${y})`}
                        />
                      )}
                      <circle
                        cx={x}
                        cy={y}
                        r={planet.body === Body.Jupiter ? 8 : 6}
                        fill={planet.color}
                      />
                      <text
                        x={x}
                        y={y - 22}
                        fill={planet.color}
                        textAnchor="middle"
                        fontSize="12"
                      >
                        {planet.body}
                      </text>
                    </g>
                  </g>
                );
              })}
          </svg>
        ) : (
          <p className="warning" role="alert">
            {result.error}
          </p>
        )}
      </section>
      <aside className="panel solar-details">
        <span className="eyebrow">PLANETARY EPHEMERIS</span>
        <h2>{body?.body ?? 'Select a planet'}</h2>
        {body && (
          <>
            <div className="altitude">
              <strong>{body.distanceAu.toFixed(3)}</strong>
              <span>
                AU
                <br />
                FROM SUN
              </span>
            </div>
            <dl>
              <dt>Ecliptic longitude</dt>
              <dd>
                {(
                  ((Math.atan2(body.y, body.x) * 180) / Math.PI + 360) %
                  360
                ).toFixed(2)}
                °
              </dd>
              <dt>Ecliptic latitude</dt>
              <dd>
                {(
                  (Math.atan2(body.z, Math.hypot(body.x, body.y)) * 180) /
                  Math.PI
                ).toFixed(2)}
                °
              </dd>
            </dl>
          </>
        )}
        <p className="muted">
          One AU is approximately 149.6 million kilometers. Positions come from
          Astronomy Engine and update each simulation minute. Planet colors and
          symbols are schematic, not live imagery.
        </p>
        <div className="planet-list">
          {result.ok &&
            result.planets.map((planet) => (
              <button
                key={planet.body}
                aria-pressed={selected === planet.body}
                onClick={() => setSelected(planet.body)}
              >
                <span style={{ color: planet.color }}>●</span>
                {planet.body}
                <small>{planet.distanceAu.toFixed(2)} AU</small>
              </button>
            ))}
        </div>
      </aside>
    </main>
  );
}
