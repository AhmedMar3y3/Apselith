import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Crosshair,
  Globe2,
  Layers,
  Search,
  Satellite,
  Star,
  Minimize2,
} from 'lucide-react';
import {
  loadCatalog,
  REFRESH_MS,
} from '../../infrastructure/celestrak/catalog-service';
import {
  searchCatalog,
  type OrbitalElements,
} from '../../domain/satellite/catalog';
import { useClock } from '../timeline/clock-store';
import { useTracking } from './use-tracking';
import { useFavorites } from '../favorites/use-favorites';
import { SatelliteDetailsPanel } from '../satellite-details/SatelliteDetailsPanel';
import { ResponsivePanel } from '../../shared/ui/ResponsivePanel';
import {
  CATALOG_GROUPS,
  isCatalogGroup,
  renderingSubset,
  type CatalogGroup,
} from '../../domain/satellite/groups';
const Globe = lazy(() =>
  import('../globe/Globe').then((module) => ({ default: module.Globe })),
);
const emptyCatalog: OrbitalElements[] = [];
export function Tracker() {
  const [group, setGroup] = useState<CatalogGroup>('stations');
  const [listLimit, setListLimit] = useState(60);
  const groupLabel =
    CATALOG_GROUPS.find((item) => item.id === group)?.label ?? group;
  const catalog = useQuery({
    queryKey: ['catalog', group],
    queryFn: () => loadCatalog(group),
    staleTime: REFRESH_MS,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const satellites = catalog.data?.satellites ?? emptyCatalog;
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(25544);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [orbit, setOrbit] = useState(true);
  const [ground, setGround] = useState(false);
  const [labels, setLabels] = useState(true);
  const [grid, setGrid] = useState(false);
  const [lighting, setLighting] = useState(false);
  const [sky, setSky] = useState(true);
  const [minutes, setMinutes] = useState(180);
  const [focusMode, setFocusMode] = useState(false);
  const exitFocusButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!focusMode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('tracking-focus');
    exitFocusButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setFocusMode(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove('tracking-focus');
      document.removeEventListener('keydown', onKey);
      requestAnimationFrame(() => {
        const button =
          document.getElementById('satellite-focus') ??
          document.querySelector<HTMLButtonElement>(
            '.mobile-panel-trigger.right',
          );
        button?.focus();
      });
    };
  }, [focusMode]);
  const [camera, setCamera] = useState<{
    mode: 'overview' | 'focus' | 'follow' | 'polar';
    nonce: number;
  }>({ mode: 'overview', nonce: 0 });
  const time = useClock((state) => state.now);
  const playing = useClock((state) => state.playing);
  const speed = useClock((state) => state.speed);
  const favorites = useFavorites();
  const selected =
    satellites.find((satellite) => satellite.NORAD_CAT_ID === selectedId) ??
    satellites[0];
  const results = useMemo(
    () =>
      searchCatalog(satellites, query).filter(
        (satellite) =>
          !favoritesOnly || favorites.ids.includes(satellite.NORAD_CAT_ID),
      ),
    [satellites, query, favoritesOnly, favorites.ids],
  );
  const rendered = useMemo(
    () => renderingSubset(results, selected),
    [results, selected],
  );
  const tracking = useTracking(rendered, time, selected, orbit, minutes);
  const selectSatellite = (id: number) => {
    setSelectedId(id);
    setCamera((previous) => ({ mode: 'follow', nonce: previous.nonce + 1 }));
  };
  return (
    <main className={`tracker-layout${focusMode ? ' focus-mode' : ''}`}>
      {!focusMode && (
        <>
          <ResponsivePanel
            className="catalog panel"
            title="Satellite catalog"
            side="left"
          >
            <span className="eyebrow">EXPLORE EARTH ORBIT</span>
            <h1>A world in motion.</h1>
            <p className="muted intro">
              Discover the objects orbiting our planet.
            </p>
            <label className="category-picker">
              Satellite group
              <select
                aria-label="Satellite group"
                value={group}
                onChange={(event) => {
                  if (!isCatalogGroup(event.target.value)) return;
                  setGroup(event.target.value);
                  setQuery('');
                  setSelectedId(0);
                  setFavoritesOnly(false);
                  setListLimit(60);
                  setCamera((previous) => ({
                    mode: 'overview',
                    nonce: previous.nonce + 1,
                  }));
                }}
              >
                {CATALOG_GROUPS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="search-box">
              <Search size={17} />
              <input
                aria-label="Search satellites"
                placeholder="Search name or NORAD ID"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setListLimit(60);
                }}
              />
              <kbd>/</kbd>
            </label>
            <div className="filter-tabs">
              <button
                className={!favoritesOnly ? 'active' : ''}
                onClick={() => {
                  setFavoritesOnly(false);
                  setListLimit(60);
                }}
              >
                <Satellite size={14} /> All objects
              </button>
              <button
                className={favoritesOnly ? 'active' : ''}
                onClick={() => {
                  setFavoritesOnly(true);
                  setListLimit(60);
                }}
              >
                <Star size={14} /> Favorites
              </button>
            </div>
            <div className="list-header">
              <span>
                {favoritesOnly
                  ? 'SAVED IN THIS GROUP'
                  : groupLabel.toUpperCase()}
              </span>
              <span>{results.length}</span>
            </div>
            {catalog.isPending && (
              <p role="status">Loading published orbital elements…</p>
            )}
            {catalog.error && (
              <div role="alert" className="warning">
                <p>{catalog.error.message}</p>
                <button onClick={() => void catalog.refetch()}>
                  Retry catalog
                </button>
              </div>
            )}
            <div className="satellite-list" aria-label="Satellite catalog">
              {results.slice(0, listLimit).map((satellite) => (
                <button
                  className={`satellite-item ${selected?.NORAD_CAT_ID === satellite.NORAD_CAT_ID ? 'selected' : ''}`}
                  key={satellite.NORAD_CAT_ID}
                  onClick={() => selectSatellite(satellite.NORAD_CAT_ID)}
                  aria-pressed={
                    selected?.NORAD_CAT_ID === satellite.NORAD_CAT_ID
                  }
                >
                  <span className="satellite-icon">
                    <Satellite size={18} />
                  </span>
                  <span>
                    <strong>{satellite.OBJECT_NAME}</strong>
                    <small>NORAD {satellite.NORAD_CAT_ID}</small>
                  </span>
                  {favorites.ids.includes(satellite.NORAD_CAT_ID) ? (
                    <Star size={12} />
                  ) : (
                    <span className="object-dot" />
                  )}
                </button>
              ))}
              {results.length > listLimit && (
                <button
                  className="wide"
                  onClick={() => setListLimit((value) => value + 60)}
                >
                  Show more ({Math.min(listLimit, results.length)} of{' '}
                  {results.length})
                </button>
              )}
              {!catalog.isPending && !results.length && (
                <p className="muted">
                  {favoritesOnly
                    ? 'No matching favorites. Save an object from its details panel.'
                    : 'No satellites match your search.'}
                </p>
              )}
            </div>
            {results.length > rendered.length && (
              <p className="muted">
                {rendered.length} objects on globe. Search all{' '}
                {satellites.length.toLocaleString()} objects to narrow the view.
                Selected object is always included.
              </p>
            )}
            <div className="catalog-source">
              <span className="eyebrow">ORBITAL DATA / CELESTRAK</span>
              {catalog.data && (
                <>
                  <p>
                    {catalog.data.source.toUpperCase()} · {satellites.length}{' '}
                    validated objects
                  </p>
                  <small>
                    Fetched{' '}
                    {new Date(catalog.data.fetchedAt)
                      .toISOString()
                      .replace('T', ' ')
                      .slice(0, 16)}{' '}
                    UTC
                  </small>
                  {catalog.data.rejected > 0 && (
                    <p className="warning">
                      {catalog.data.rejected} unsupported records skipped.
                    </p>
                  )}
                </>
              )}
              {favorites.error && (
                <p className="warning" role="status">
                  {favorites.error}
                </p>
              )}
            </div>
          </ResponsivePanel>
        </>
      )}
      <section className="visualization" aria-label="Earth visualization">
        {focusMode && (
          <div className="focus-toolbar">
            <div>
              <span className="eyebrow">FOCUS / TRACKING</span>
              <strong>{selected?.OBJECT_NAME ?? 'Satellite'}</strong>
              <small>
                {new Date(time).toISOString().replace('T', ' ').slice(0, 19)}{' '}
                UTC · {playing ? `${speed}×` : 'Paused'}
              </small>
            </div>
            <button ref={exitFocusButton} onClick={() => setFocusMode(false)}>
              <Minimize2 size={16} /> Exit Focus <kbd>Esc</kbd>
            </button>
          </div>
        )}
        <div className="view-heading">
          <span className="eyebrow">
            <span className="status-dot" /> EARTH ORBIT EXPLORER
          </span>
          <span className="view-tag">3D / EARTH FIXED</span>
        </div>
        <Suspense
          fallback={<p className="globe-loading">Loading Earth renderer…</p>}
        >
          <Globe
            positions={tracking.positions}
            tracks={tracking.tracks}
            selectedName={selected?.OBJECT_NAME ?? 'Selected satellite'}
            trajectory={tracking.trajectory}
            selectedId={selected?.NORAD_CAT_ID ?? selectedId}
            onSelect={selectSatellite}
            time={time}
            groundTrack={ground}
            labels={labels}
            grid={grid}
            lighting={lighting}
            camera={camera}
            expanded={focusMode}
            sky={sky}
          />
        </Suspense>
        <div className="camera-controls">
          <label>
            <input
              type="checkbox"
              checked={sky}
              onChange={(event) => setSky(event.target.checked)}
            />{' '}
            Stars & planets
          </label>
          <label>
            <input
              type="checkbox"
              checked={lighting}
              onChange={(event) => setLighting(event.target.checked)}
            />{' '}
            Day/night
          </label>
          <button
            className="earth-view-control"
            onClick={() =>
              setCamera((value) => ({
                mode: 'overview',
                nonce: value.nonce + 1,
              }))
            }
          >
            <Globe2 size={15} /> Overview
          </button>
          <button
            className="earth-view-control"
            onClick={() =>
              setCamera((value) => ({ mode: 'polar', nonce: value.nonce + 1 }))
            }
          >
            <Crosshair size={15} /> Polar
          </button>
          <label>
            <Layers size={15} />
            <input
              type="checkbox"
              checked={grid}
              onChange={(event) => setGrid(event.target.checked)}
            />{' '}
            Grid
          </label>
          <label>
            <input
              type="checkbox"
              checked={labels}
              onChange={(event) => setLabels(event.target.checked)}
            />{' '}
            Label
          </label>
        </div>
        <div className="view-note">
          Spacecraft & planet symbols · not to scale{' '}
          <span className="legend-dot amber" /> Selected / trajectory
        </div>
        {(tracking.error || catalog.data?.warning) && (
          <div className="data-warning" role="status">
            {tracking.error || catalog.data?.warning}
          </div>
        )}
      </section>
      {!focusMode &&
        (selected ? (
          <SatelliteDetailsPanel
            satellite={selected}
            category={groupLabel}
            position={tracking.positions.find(
              (position) => position.id === selected.NORAD_CAT_ID,
            )}
            time={time}
            favorite={favorites.ids.includes(selected.NORAD_CAT_ID)}
            onFavorite={() => favorites.toggle(selected.NORAD_CAT_ID)}
            onCamera={(mode) => {
              if (mode === 'focus') setFocusMode(true);
              setCamera((previous) => ({
                mode: 'follow',
                nonce: previous.nonce + 1,
              }));
            }}
            following={camera.mode === 'follow'}
            orbit={orbit}
            onOrbit={setOrbit}
            ground={ground}
            onGround={setGround}
            minutes={minutes}
            onMinutes={setMinutes}
          />
        ) : (
          <aside className="details panel">
            <h2>Object details</h2>
            <p className="muted">
              Select an object when the catalog is available.
            </p>
          </aside>
        ))}
    </main>
  );
}
