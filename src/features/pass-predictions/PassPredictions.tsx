import { useEffect, useRef, useState } from 'react';
import type { OrbitalElements } from '../../domain/satellite/catalog';
import { ComputationClient } from '../../infrastructure/workers/client';
import {
  observerSchema,
  type Observer,
  type Pass,
} from '../../infrastructure/propagation/passes';
const utc = (value: number) => new Date(value).toISOString().slice(11, 19);
export function PassPredictions({
  satellite,
  time,
}: {
  satellite: OrbitalElements;
  time: number;
}) {
  const [observer, setObserver] = useState<Observer>({
    latitude: 30.0444,
    longitude: 31.2357,
    altitude: 0,
    minimumElevation: 10,
  });
  const [passes, setPasses] = useState<Pass[]>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [calculatedAt, setCalculatedAt] = useState<number>();
  const worker = useRef<ComputationClient | null>(null);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
      worker.current?.dispose();
    },
    [],
  );
  function changeObserver(next: Observer) {
    generation.current++;
    worker.current?.dispose();
    worker.current = null;
    setBusy(false);
    setObserver(next);
    setPasses(undefined);
    setError('');
  }
  async function calculate() {
    const parsed = observerSchema.safeParse(observer);
    if (!parsed.success) {
      setError(parsed.error.issues.map((issue) => issue.message).join(' '));
      return;
    }
    const request = ++generation.current;
    setBusy(true);
    setError('');
    setPasses(undefined);
    worker.current?.dispose();
    const client = new ComputationClient();
    worker.current = client;
    try {
      const result = await client.run({
        kind: 'passes',
        elements: satellite,
        time,
        observer: parsed.data,
      });
      if (request === generation.current && result.kind === 'passes') {
        setPasses(result.passes);
        setCalculatedAt(time);
      }
    } catch (failure) {
      if (request === generation.current)
        setError(
          failure instanceof Error
            ? failure.message
            : 'Pass calculation failed.',
        );
    } finally {
      if (request === generation.current) {
        setBusy(false);
        client.dispose();
        worker.current = null;
      }
    }
  }
  return (
    <section className="pass-section">
      <span className="eyebrow">GROUND STATION</span>
      <h3>Find your next pass</h3>
      <label htmlFor="preset">Observer preset</label>
      <select
        id="preset"
        onChange={(event) => {
          const presets: Record<string, [number, number]> = {
            cairo: [30.0444, 31.2357],
            london: [51.5074, -0.1278],
            newyork: [40.7128, -74.006],
          };
          const preset = presets[event.target.value];
          if (preset)
            changeObserver({
              ...observer,
              latitude: preset[0],
              longitude: preset[1],
            });
        }}
        defaultValue="cairo"
      >
        <option value="cairo">Cairo, Egypt</option>
        <option value="london">London, UK</option>
        <option value="newyork">New York, US</option>
      </select>
      <div className="observer-fields">
        {(
          ['latitude', 'longitude', 'altitude', 'minimumElevation'] as const
        ).map((key) => (
          <label key={key}>
            {
              {
                latitude: 'Latitude °',
                longitude: 'Longitude °',
                altitude: 'Altitude km',
                minimumElevation: 'Min. elevation °',
              }[key]
            }
            <input
              type="number"
              step="any"
              value={observer[key]}
              onChange={(event) =>
                changeObserver({
                  ...observer,
                  [key]: event.target.valueAsNumber,
                })
              }
            />
          </label>
        ))}
      </div>
      <button
        className="wide"
        onClick={() => {
          if (!navigator.geolocation) {
            setError('Geolocation is unavailable. Enter coordinates manually.');
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (position) =>
              changeObserver({
                ...observer,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                altitude: (position.coords.altitude ?? 0) / 1000,
              }),
            (failure) => setError(failure.message),
          );
        }}
      >
        Use my location
      </button>
      <button
        className="primary wide"
        disabled={busy}
        onClick={() => void calculate()}
      >
        {busy ? 'Calculating…' : 'Calculate next 24 hours'}
      </button>
      <p className="muted">
        Geometric passes above your threshold. Sunlight, weather and visual
        visibility are not calculated.
      </p>
      {error && (
        <p role="alert" className="warning">
          {error}
        </p>
      )}
      {passes && (
        <div>
          <p className="muted">
            Window starts{' '}
            {calculatedAt &&
              new Date(calculatedAt)
                .toISOString()
                .replace('T', ' ')
                .slice(0, 19)}{' '}
            UTC. Complete passes only.
          </p>
          {!passes.length ? (
            <p>No complete passes above this elevation in the next 24 hours.</p>
          ) : (
            passes.map((pass) => (
              <article className="pass-card" key={pass.rise}>
                <strong>
                  {new Date(pass.rise).toISOString().slice(0, 10)} ·{' '}
                  {utc(pass.rise)} UTC
                </strong>
                <dl>
                  <dt>Rise / peak / set</dt>
                  <dd>
                    {utc(pass.rise)} / {utc(pass.peak)} / {utc(pass.set)}
                  </dd>
                  <dt>Max elevation</dt>
                  <dd>{pass.maxElevation.toFixed(1)}°</dd>
                  <dt>Duration</dt>
                  <dd>{((pass.set - pass.rise) / 60000).toFixed(1)} min</dd>
                  <dt>Azimuth rise / peak / set</dt>
                  <dd>
                    {pass.riseAzimuth.toFixed(0)}° /{' '}
                    {pass.peakAzimuth.toFixed(0)}° /{' '}
                    {pass.setAzimuth.toFixed(0)}°
                  </dd>
                </dl>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
