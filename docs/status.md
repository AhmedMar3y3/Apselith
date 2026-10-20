# Implementation status

This document distinguishes delivered functionality from remaining master-specification work.

## Implemented vertical slice

| Phase | Delivered                                                                                          |
| ----- | -------------------------------------------------------------------------------------------------- |
| 0     | Repository assessment, endpoint/CORS check, architecture, coordinate conventions and decisions     |
| 1     | React/Vite/strict TS, routing, theme, responsive shell, error boundary, tests, lint/format and CI  |
| 2     | Local Cesium assets/imagery, viewer lifecycle, camera presets and WebGL fallback                   |
| 3     | Real stations JSON, Zod validation, skipped-record reporting, IndexedDB/cache fallback and search  |
| 4     | SGP4 worker propagation, fixed coordinates, markers, details, focus/follow and selected trajectory |
| 5     | Shared UTC clock, play/pause, step, speed, jump and real-time reset                                |
| 6     | Worker request IDs, bounded pending work, stale-result protection and controlled resource disposal |
| 7     | Observer forms/presets, user-triggered geolocation and geometric pass results                      |
| 8     | Validated elliptic two-body model, animation, projected views and calculated properties            |
| 9     | Initial automated coverage, scientific documentation and static-host configuration                 |

This is not a claim that every phase meets the full production definition of done.

## Remaining work

- Independent reference comparison of pass timings, grazing/near-horizon and high-latitude cases.
- Representative hardware benchmarks for 100/1000/5000/10000 real objects, FPS, GPU memory and responsiveness; current initial catalog is deliberately small.
- Cooperative worker supersession during large batches and automatic restart recovery. Hung workers time out with a reload instruction.
- Additional catalog groups and richer object metadata beyond the five implemented groups.
- Full accessibility audit and cross-browser/device checks; initial Radix modal drawers are implemented on phones.
- Distinct past/future trajectory styling and further renderer profiling.
- More extensive scientific boundary tests and browser failure-path coverage.
- Actual production deployment, after review. Desktop tracker and laboratory screenshots are saved under `docs/screenshots`.

No invented telemetry, fake positions, performance numbers or visibility classifications are included.

## Verified on 2026-10-20

- TypeScript, ESLint, formatting and production build pass.
- 33 unit/integration tests pass, including Vallado SGP4, two-body references, IndexedDB recovery, interpolation and captured independent ISS comparisons.
- 7 Chromium tests pass: automatic selection/follow, full-window Focus and exit on desktop/phone, complete details scrolling, Solar System selection, catalog groups, clock, favorites, passes and laboratory workflows.
- Browser checks confirm a rendered globe with loaded imagery, true-black root background and the portfolio/PCRF footer URLs.
- Dependency audit after removing the vulnerable development plugin reported zero vulnerabilities.
- Visual inspection confirms a large, detailed Earth against black UI surfaces. Browser runs use software rendering and do not establish representative hardware performance.

## Follow camera interaction fix

Tracking now moves the satellite reference frame while retaining the user camera pose, removing the fixed-offset reset that fought zoom and rotation. A dedicated Chromium regression verifies wheel zoom in both directions, drag rotation and retained distance in Follow and Focus; the existing selection/follow story also passes after the fix. The interaction test uses advancing wall time because Cesium gesture inertia depends on elapsed Date time.
