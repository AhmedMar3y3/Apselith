import { lazy, Suspense } from 'react';
import { NavLink, Route, Routes } from 'react-router';
import { FlaskConical, Satellite, Orbit } from 'lucide-react';
import { Timeline } from '../features/timeline/Timeline';
import { SiteFooter } from './layouts/SiteFooter';
const Tracker = lazy(() =>
  import('../features/satellites/Tracker').then((module) => ({
    default: module.Tracker,
  })),
);
const Laboratory = lazy(() =>
  import('../features/orbital-simulator/Laboratory').then((module) => ({
    default: module.Laboratory,
  })),
);
const SolarSystem = lazy(() =>
  import('../features/solar-system/SolarSystem').then((module) => ({
    default: module.SolarSystem,
  })),
);
export function App() {
  return (
    <div className="app-shell">
      <a href="#workspace" className="skip-link">
        Skip to workspace
      </a>
      <header className="app-header">
        <NavLink className="brand" to="/">
          <img
            className="brand-mark"
            src="/brand/apselith-mark.svg"
            alt=""
            width="38"
            height="38"
          />
          <span>
            APSE<span className="brand-light">LITH</span>
            <small>AN EARTH ORBIT EXPLORER</small>
          </span>
        </NavLink>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            <Satellite size={17} /> Satellite tracker
          </NavLink>
          <NavLink to="/laboratory">
            <FlaskConical size={17} /> Orbital laboratory
          </NavLink>
          <NavLink to="/solar-system">
            <Orbit size={17} /> Solar System
          </NavLink>
        </nav>
        <span className="header-note">A different perspective.</span>
      </header>
      <div id="workspace" className="workspace">
        <Suspense fallback={<p role="status">Loading workspace…</p>}>
          <Routes>
            <Route path="/" element={<Tracker />} />
            <Route path="/laboratory" element={<Laboratory />} />
            <Route path="/solar-system" element={<SolarSystem />} />
            <Route
              path="*"
              element={
                <main className="fatal">
                  <h1>View not found</h1>
                  <NavLink to="/">Return to tracker</NavLink>
                </main>
              }
            />
          </Routes>
        </Suspense>
      </div>
      <Timeline />
      <SiteFooter />
    </div>
  );
}
