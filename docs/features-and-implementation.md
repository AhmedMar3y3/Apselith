# APSELITH — Features and Implementation

Implementation report · 20 October 2026

## Product and visual identity

APSELITH is a browser-based educational satellite tracker and orbital mechanics laboratory. React, Vite and strict TypeScript form the application foundation. React Router separates the tracker, laboratory and Solar System. No custom backend, account or API credential is required.

The interface uses true-black backgrounds, charcoal panels, cyan navigation accents and amber selection indicators. A custom vector orbital monogram appears in the header and favicon. Matching wordmark and social artwork are in `public/brand`. The footer credits Ahmed Mar3y at https://ahmed-mar3y.space and links Gaza relief support to https://www.pcrf.net/.

## Detailed interactive Earth

CesiumJS renders an actual interactive WGS84 Earth globe with drag, zoom, overview, polar, selected-object focus and follow modes. A large initial camera view makes Earth the visual focus. NASA's historical 5400 × 2700 Blue Marble composite supplies detailed geographic imagery locally. It is not a live weather feed. Natural Earth imagery is the fallback. Optional day/night shading uses the shared simulation time.

The Cesium viewer is created once per mounted view, with cleanup for handlers, listeners, primitives and the viewer. Request-render mode reduces idle rendering. WebGL failures leave catalog and numeric information available. Cesium's required assets are copied by a Node script before development and production builds.

## Satellite design

Spacecraft are represented by custom SVG solar-panel glyphs. ISS/NORAD 25544 has a distinct station silhouette. Selected spacecraft use a larger amber symbol and a persistent name/NORAD label. Symbols are screen-sized schematics, not physical scale or measured spacecraft attitude. Earth naturally occludes markers on the far side.

`SatelliteLayer` owns a Cesium billboard collection and persistent label collection. It updates positions without rebuilding React components or recreating label entities every frame. Other catalog entries within 100 m of the selected object are hidden behind its symbol so attached modules with effectively identical published orbits do not obscure the selection. Numeric positions are never offset to separate symbols.

## Automatic camera targeting and Focus

Selecting a catalog object or globe marker requests a camera transition to that satellite. The renderer waits until a valid interpolated position exists, then flies to it and enables continuous follow. Request identity prevents an obsolete flight completion from following an older selection. After the initial flight, tracking updates only the satellite-centered reference frame while preserving the camera’s local position, direction, up and right vectors. Wheel/pinch zoom and drag rotation therefore remain under user control in Follow and Focus, instead of being overwritten by a fixed three-million-meter offset every update. A regression test exercises wheel zoom in both directions and drag rotation while tracking continues.

Focus expands the existing globe to fill the application viewport, removes the side panels and hides the header, timeline and footer. A small overlay retains the selected name, UTC time and playback state. Exit Focus and Escape restore the workspace and keyboard focus; selection and the clock stay intact. Overview/polar actions are hidden in Focus. The Cesium viewer is resized in place rather than recreated.

The desktop details column now matches the globe column height, with its own scroll area and no shorter contradictory height cap. Browser checks scroll to the final explanatory paragraph and compare column heights. Phone modal panels remain scrollable.

## Real sky background and Solar System

The sky uses Cesium's bundled Tycho star-map cubemap, rather than random dots. Cesium renders the modeled Sun and Moon at the simulation time. Astronomy Engine calculates apparent geocentric positions for the seven other planets. Stars & planets hides or restores this layer. Bodies appear in their modeled directions when in the camera field of view; they are not arranged decoratively around Earth.

Planet vectors start in equatorial J2000 (EQJ), rotate to true equator/equinox of date, then use Greenwich apparent sidereal time to obtain Earth-fixed directions. This is separate from SGP4's TEME conversion. Camera-relative rays intersect a 430-million-meter sky-symbol shell inside Cesium's far plane. This preserves viewing direction, including camera parallax, without claiming physical planet distances or correct lunar occultations for the symbols. Positions refresh each simulation minute; symbols are enlarged and are not telescope imagery. The supported planetary-date guardrail is 1600–2400, not an accuracy guarantee.

The `/solar-system` view uses heliocentric planetary vectors in the J2000 ecliptic frame. All eight planets are selectable, with Sun distance and ecliptic angles. An inner-planets filter improves readability. Distances are logarithmically compressed, planet sizes exaggerated and rings labeled as distance guides, not orbital trajectories. Its star image is visual context, not an observer sky chart.

Sources: [Cesium skybox](https://cesium.com/learn/cesiumjs/ref-doc/SkyBox.html), [Astronomy Engine](https://github.com/cosinekitty/astronomy).

## Real catalog, search and local persistence

CelesTrak's `stations`, `starlink`, `gps-ops`, `galileo` and `weather` GP JSON groups are available through the Satellite group selector. Each loads on demand with its own IndexedDB cache, two-hour request throttle and dated offline snapshot. Zod validates element fields, numerical ranges, UTC epochs and supported ephemeris types. Invalid records are isolated; wholly invalid responses are rejected. Search supports partial names and NORAD IDs. Favorites persist locally as a validated list of identifiers, with filtering within the current group.

At capture, the new provider groups contained 11,124 Starlink, 32 operational GPS, 32 Galileo and 73 weather records. Full groups are searchable; lists reveal 60 rows at a time. Only up to 150 matches are sent to the propagation worker and renderer, always retaining the selected object. Stable memoized subsets avoid triggering new worker requests on every clock notification. Old group buffers are hidden during switching so positions from the previous group are not presented as part of the new selection. Trajectory windows extend to 24 hours for navigation satellites.

TanStack Query owns remote state. The data service uses a two-hour refresh policy, IndexedDB persistence, old-cache recovery and a clearly dated static snapshot. Snapshot source, download time and orbital epoch remain visible. Storage/provider errors are surfaced. No fabricated positions or performance values are substituted.

## SGP4 tracking and coordinate conversion

satellite.js 6.0.2 initializes SGP4 records from published OMM JSON. It returns TEME-related inertial positions and velocities. The adapter applies satellite.js sidereal rotation at each timestamp to produce approximate Earth-fixed coordinates; kilometers become meters only at the Cesium boundary. Geodetic conversion provides latitude, longitude and ellipsoidal altitude. Inertial speed is labeled separately from ground-relative motion.

Full Earth orientation parameters and polar motion are not included. Predictions outside ±14 days of element epoch are rejected, and elements older than 72 hours are labeled stale. These thresholds do not guarantee accuracy. ISS (ZARYA) is the catalog designation used for the ISS object, NORAD 25544.

## Smoother, time-correct movement

The original implementation assigned one position per simulation second, which produced visible stepping. The revised worker builds a forward buffer of ten-second SGP4 samples. Buffer coverage adapts to playback speed. Each sample contains its UTC timestamp, Earth-fixed position and Earth-fixed velocity.

Rotating-frame velocity is computed as **R v − ω × r**. Cubic Hermite interpolation uses these derivatives to calculate a position at the current authoritative simulation time. It does not ease toward an old result, shift the displayed timestamp, or extrapolate beyond available samples. A time jump hides out-of-range positions until a matching buffer arrives.

The globe evaluates buffered positions using `requestAnimationFrame`, capped at 30 updates per second in normal mode and four with reduced-motion preferences. This is a rendering target, not a measured FPS guarantee. React does not run orbital calculations or set per-frame marker state. Follow mode uses the same interpolated selected position. Hidden tabs stop render updates.

Tests compare interpolated ISS positions with direct SGP4 at integer-millisecond timestamps over multiple orbital phases. Tested ten-second brackets remain within one meter of direct propagation. That measures interpolation error, not error relative to the real spacecraft.

## Independent ISS position comparison

Public data was captured from Where the ISS At and Heavens-Above, and N2YO's tracking interface was reviewed. The comparison uses matching UTC timestamps and preserves source data in `docs/validation`.

At **2026-10-19 23:21:19 UTC**:

| Check                                                            | Result                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------ |
| APSELITH OMM prediction vs Where the ISS At position             | 276.6 m ground separation; +2.15 m altitude difference |
| Our propagation of WTIA's own TLE vs WTIA's API                  | 0.194 m ground separation; −1.91 m altitude difference |
| APSELITH OMM vs our propagation of Heavens-Above's published TLE | Less than 2 m 3D separation                            |

Five WTIA reference timestamps between **23:11:19 and 23:31:19 UTC** show approximately **271–297 m** ground separation using APSELITH's element set. Using WTIA's own TLE reduces ground differences to approximately **0.16–0.31 m**. This strongly suggests the cross-tracker discrepancy comes primarily from different published element sets. It does not establish exact physical spacecraft location or certified navigation accuracy.

Heavens-Above's published TLE was propagated with our engine: that comparison checks element normalization and agreement of inputs, not a second independent propagation engine. WTIA's API provides the independent numerical position reference. N2YO's numeric position was not captured, so no numerical agreement with N2YO is claimed.

Reproduce the captured comparison offline with:

```sh
node scripts/compare-iss.mjs
npm test
```

Sources: [WTIA API](https://wheretheiss.at/w/developer), [Heavens-Above ISS orbit](https://www.heavens-above.com/orbit.aspx?satid=25544), [N2YO ISS tracker](https://www.n2yo.com/?s=25544).

## Comparable products and direction

| Product          | Reviewed capabilities                                                                        | Implication for APSELITH                                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| N2YO             | Tracking map, orbit/footprint controls, centering, telemetry, many categories and pass tools | Our selection, orbit, follow and numeric details fit established tracking workflows; catalog breadth and footprints remain gaps |
| Heavens-Above    | Published TLE/epoch, orbit and ground-track views, observer-oriented predictions             | Element transparency and observation context are essential; independent pass validation remains necessary                       |
| Where the ISS At | Timestamped ISS positions and public TLE API                                                 | Useful independent position reference, with UTC and element epoch matched explicitly                                            |
| APSELITH         | Black 3D Earth experience, published elements, time travel and a separate two-body lab       | The core workflow is on track; the laboratory adds an educational mode, while mature observation coverage still needs work      |

APSELITH is not yet at full feature parity with these established services. Current priorities are independent pass-timing validation, broader real catalogs, representative GPU profiling and more cross-browser coverage.

## Timeline and playback

A Zustand store owns one simulation clock. UTC is derived from an anchor timestamp plus monotonic elapsed time. Pause, resume, speed selection, minute stepping, UTC jumps and real-time reset all operate on that clock. Satellite information, render interpolation, trajectories and laboratory motion use it. Native date input is explicitly interpreted as UTC.

## Trajectories and observation

The selected trajectory is generated by SGP4 sampling, not a decorative circular ellipse. Every sample is converted at its own timestamp to account for Earth rotation. A ground track can be displayed. Only the selected object gets a full path.

Observer latitude, longitude, altitude and minimum elevation feed geometric pass predictions in a temporary worker. Manual coordinates, presets and optional user-triggered geolocation are supported. Rise/set crossings are refined by bisection, with a numerical peak elevation search. Results report times, elevation, duration and azimuth. Observer coordinates stay local.

Only complete passes in the next 24 hours are returned. Grazing passes between ten-second samples can be missed. Illumination, observer darkness, weather and visual visibility are not computed. Independent reference validation of pass timing remains outstanding.

## Orbital mechanics laboratory

The laboratory uses a separate fictional elliptic two-body model. Users edit semi-major axis, eccentricity, inclination, RAAN, argument of perigee and initial mean anomaly. Kepler's equation is solved with bounded bisection. A rotation matrix orients orbital-plane coordinates; vis-viva supplies speed. Period, perigee/apogee and specific energy update from pure domain functions.

The SVG view shows Earth at the correct focus, perigee, apogee and the moving spacecraft. Users can choose an orbit-plane view or equatorial orthographic projection. Invalid, nonfinite and Earth-intersecting ellipses are rejected. Drag, oblateness, third bodies and maneuvers are omitted.

## Reliability, accessibility and verification

Worker messages use discriminated types and request IDs, with bounded pending requests, timeouts and stale-result protection. React effects clean up workers. Mobile panels use Radix Dialog for focus trapping, Escape and focus restoration. Native controls, labels, focus indicators, reduced-motion handling and an error boundary support accessible interaction.

Vitest covers reference SGP4 propagation, coordinate conventions, Kepler properties, clock calculations, validation/search, IndexedDB recovery, laboratory input, smooth interpolation and captured independent ISS comparisons. All 33 unit/integration tests pass. The seven original browser stories passed before this camera fix; targeted reruns verify selection/follow and the new wheel/drag regression in Follow and Focus. Browser coverage includes automatic camera follow, full-window Focus and exit on desktop/phone, details scrolling, planet selection, catalog groups and the tracker-to-laboratory workflow. CI includes formatting, lint, type checking, tests and production build. `vercel.json` configures static SPA hosting; no production deployment was performed.

Representative hardware benchmarks, a full accessibility audit and wider browser/device verification are still required before calling the whole master specification production-complete. See `docs/status.md` for the current scope.
