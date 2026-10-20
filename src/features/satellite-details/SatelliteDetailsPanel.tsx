import { Crosshair, Eye, Star } from 'lucide-react';
import { epochMs, type OrbitalElements } from '../../domain/satellite/catalog';
import type { SatellitePosition } from '../../infrastructure/propagation/sgp4';
import { PassPredictions } from '../pass-predictions/PassPredictions';
import { useClock } from '../timeline/clock-store';
import { ResponsivePanel } from '../../shared/ui/ResponsivePanel';
export function SatelliteDetailsPanel({
  satellite,
  category,
  position,
  time,
  favorite,
  onFavorite,
  onCamera,
  following,
  orbit,
  onOrbit,
  ground,
  onGround,
  minutes,
  onMinutes,
}: {
  satellite: OrbitalElements;
  category: string;
  position?: SatellitePosition;
  time: number;
  favorite: boolean;
  onFavorite: () => void;
  onCamera: (mode: 'focus' | 'follow') => void;
  following: boolean;
  orbit: boolean;
  onOrbit: (value: boolean) => void;
  ground: boolean;
  onGround: (value: boolean) => void;
  minutes: number;
  onMinutes: (value: number) => void;
}) {
  const realNow = useClock((state) => state.realNow);
  const age = (realNow - epochMs(satellite)) / 3600000;
  return (
    <ResponsivePanel
      className="details panel"
      title="Object details"
      side="right"
    >
      <div className="panel-kicker">
        <span className="eyebrow">OBJECT TELEMETRY</span>
        <button
          aria-label={favorite ? 'Remove favorite' : 'Save favorite'}
          aria-pressed={favorite}
          onClick={onFavorite}
        >
          <Star size={17} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <h2>{satellite.OBJECT_NAME}</h2>
      <p className="muted">
        NORAD {satellite.NORAD_CAT_ID} <span className="divider">/</span>{' '}
        {category}
      </p>
      <div className="data-badge">
        {age > 72 ? 'STALE ELEMENTS' : 'PUBLISHED ELEMENTS'} · {age.toFixed(0)}h
        old
      </div>
      <div className="action-row">
        <button
          id="satellite-focus"
          disabled={!position}
          onClick={() => onCamera('focus')}
        >
          <Crosshair size={15} /> Focus
        </button>
        <button
          disabled={!position}
          className={following ? 'active' : ''}
          onClick={() => onCamera('follow')}
        >
          <Eye size={15} /> Follow
        </button>
      </div>
      <section>
        <h3>
          Predicted position <span>SGP4</span>
        </h3>
        {position ? (
          <>
            <div className="altitude">
              <strong>{position.altitude.toFixed(1)}</strong>
              <span>
                km
                <br />
                ALTITUDE
              </span>
            </div>
            <dl>
              <dt>Position time UTC</dt>
              <dd>{new Date(position.time).toISOString().slice(11, 19)}</dd>
              <dt>Latitude</dt>
              <dd>{position.latitude.toFixed(2)}°</dd>
              <dt>Longitude</dt>
              <dd>{position.longitude.toFixed(2)}°</dd>
              <dt>Inertial speed</dt>
              <dd>{position.speed.toFixed(3)} km/s</dd>
            </dl>
          </>
        ) : (
          <p className="warning">
            Position unavailable at this time. Check element age and prediction
            range.
          </p>
        )}
      </section>
      <section>
        <h3>Orbital elements</h3>
        <dl>
          <dt>Inclination</dt>
          <dd>{satellite.INCLINATION.toFixed(2)}°</dd>
          <dt>Eccentricity</dt>
          <dd>{satellite.ECCENTRICITY.toFixed(6)}</dd>
          <dt>Mean period</dt>
          <dd>{(1440 / satellite.MEAN_MOTION).toFixed(2)} min</dd>
          <dt>Element epoch UTC</dt>
          <dd className="small-value">
            {new Date(epochMs(satellite))
              .toISOString()
              .slice(0, 19)
              .replace('T', ' ')}
          </dd>
        </dl>
        <div className="reference-links">
          <a
            href={`https://www.n2yo.com/?s=${satellite.NORAD_CAT_ID}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Compare on N2YO ↗
          </a>
          <a
            href={`https://www.heavens-above.com/orbit.aspx?satid=${satellite.NORAD_CAT_ID}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Heavens-Above ↗
          </a>
        </div>
        <p className="muted">
          Compare at the same UTC with the same element epoch. These links open
          external trackers at their current time.
        </p>
      </section>
      <section>
        <h3>Visualization</h3>
        <label className="toggle">
          <span>Predicted trajectory</span>
          <input
            type="checkbox"
            checked={orbit}
            onChange={(event) => onOrbit(event.target.checked)}
          />
        </label>
        <label className="toggle">
          <span>Ground track</span>
          <input
            type="checkbox"
            checked={ground}
            onChange={(event) => onGround(event.target.checked)}
          />
        </label>
        <label className="toggle">
          Trajectory window
          <select
            value={minutes}
            onChange={(event) => onMinutes(Number(event.target.value))}
          >
            {[90, 180, 360, 720, 1440].map((value) => (
              <option key={value} value={value}>
                ±{value / 2} min
              </option>
            ))}
          </select>
        </label>
      </section>
      <PassPredictions
        key={satellite.NORAD_CAT_ID}
        satellite={satellite}
        time={time}
      />
      <p className="muted footnote">
        Educational predictions from CelesTrak orbital elements. Accuracy
        degrades away from the epoch. Not for navigation or collision avoidance.
      </p>
    </ResponsivePanel>
  );
}
