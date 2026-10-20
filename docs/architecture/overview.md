# Architecture

The repository initially contained only `docs/implementation.md`; no existing application or Git repository was present. The application is a static Vite React SPA with `/` for tracking, `/laboratory` for fictional experiments and `/solar-system` for calculated planetary positions.

## Module boundaries

- `domain`: runtime-validated orbital elements, search, pure clock calculation and two-body math. No React, Cesium or storage dependencies.
- `infrastructure/celestrak`: endpoint access, normalization, IndexedDB persistence, fallback selection and request throttling.
- `infrastructure/propagation`: satellite.js adapter, explicit TEME-to-Earth-fixed conversion and geometric pass algorithms.
- `infrastructure/workers`: discriminated request/response protocol, IDs, bounded pending requests and resource disposal.
- `features`: user-facing workflows. Tracking calls the worker client; views do not invoke SGP4 directly.
- `app`: routing, providers and styling. `shared/ui`: error recovery and reusable primitives.

## Data flow

TanStack Query invokes the catalog service. The service validates IndexedDB cache, returns recent cache without a network request, or attempts GP JSON at most once per two hours. On failure, old valid cache wins over the bundled snapshot. Unsupported records are skipped with a visible count, while wholly invalid responses fail validation. Query retries are disabled to avoid provider request storms.

The tracker selects an object from the normalized catalog. A shared Zustand clock owns the authoritative timestamp, derived from UTC and monotonic anchors. The timeline publishes UI ticks; the renderer evaluates that same clock per animation frame. A speed-adaptive worker buffer contains ten-second Earth-fixed position/velocity samples. Cubic Hermite interpolation produces time-correct intermediate positions without extrapolation. Hidden tabs skip updates. Trajectory requests are quantized to simulation minutes.

The tracking worker caches SGP4 records by NORAD ID and element epoch. Requests carry IDs. At most three requests may be pending per client. Effect generation cleanup ignores obsolete responses. The pass workflow creates one temporary calculation worker to avoid blocking tracking, and terminates it after completion or observer changes. No per-satellite workers exist. There is not yet cooperative cancellation within an executing batch; the small initial catalog bounds work. Worker failures surface in the UI.

## Rendering

Cesium is lazy-loaded. One viewer is created per mounted globe, with explicit handler and viewer destruction. BillboardCollection holds custom spacecraft symbols, LabelCollection holds a persistent selected label, and PolylineCollection holds only the selected trajectory. Kilometers become meters at the Cesium boundary. Cesium's clock is assigned the shared UTC time and does not run independently. Follow uses the same interpolated satellite position; overview/focus actions release the previous camera transform. Rendering targets 30 Hz, or four Hz for reduced-motion preferences; this is not an FPS guarantee.

NASA's historical Blue Marble composite is served locally as the primary detailed texture. Natural Earth imagery, workers, widgets and textures are copied from the installed Cesium package before dev/build; Natural Earth is a fallback. No ion token or online base map is required. Day/night shading is optional. WebGL failure leaves catalog and numeric details accessible. Request-render mode avoids unnecessary idle frames, and renderer errors surface explicitly.

## State ownership

Catalog groups (`stations`, `starlink`, `gps-ops`, `galileo`, `weather`) are selected on demand. Query keys, IndexedDB entries, provider request throttles and snapshot paths are independent per group. Search covers the full validated group; a memoized subset of up to 150 objects, including the selection, bounds worker and renderer work. Lists reveal 60 rows per page. Snapshot identity prevents an old group's buffer from appearing during a category switch.

Remote data: Query. Shared simulation time: Zustand. Search, selection and layer controls: feature-local React state. Large calculation outputs stay outside global state. Favorites: small validated localStorage list. Catalog: validated IndexedDB envelope. Observer location is never transmitted.

## Discovery evidence

On 2026-10-19 at 22:49:16 UTC, a request to the `stations` JSON endpoint returned HTTP 200, `Content-Type: application/json; charset=UTF-8`, and `Access-Control-Allow-Origin: *` with an Origin header. No cache-control header was observed; the application therefore implements its own two-hour policy. Endpoint availability/CORS can change, which is why the static fallback remains available. See [CelesTrak usage policy](https://celestrak.org/usage-policy.php) and [GP format/refresh guidance](https://celestrak.org/NORAD/documentation/gp-data-formats.php).

## Sky and camera transitions

Selection requests a camera flight once a valid interpolated satellite position exists, then follows that same position. Transition identity prevents stale completions from overriding a newer selection. Focus expands and resizes the existing viewer; it does not create another viewer.

Cesium provides the Tycho star cubemap and modeled Sun/Moon. Pure Astronomy Engine calculations provide planet vectors separately from the SGP4 pipeline. The globe projects those vectors onto a camera-relative symbol shell; the Solar System route presents heliocentric vectors with explicitly compressed distances.
