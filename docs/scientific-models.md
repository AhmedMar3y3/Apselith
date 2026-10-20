# Scientific models and validation

## Published elements and propagation

The CelesTrak GP JSON fields describe SGP4 mean elements. They are not general osculating Keplerian elements. `json2satrec` initializes the record; `propagate` uses UTC timestamps. Input validation rejects unsupported ephemeris types, nonfinite fields, eccentricity outside [0,1), invalid inclinations and nonpositive mean motion. Catalog identity supports more than five digits.

SGP4 outputs are TEME-related Cartesian positions (km) and inertial velocities (km/s). We use satellite.js `gstime(date)` and `eciToEcf` to apply its documented sidereal rotation to an Earth-fixed position. That is an approximate TEME-to-Earth-fixed treatment, without Earth orientation parameters, polar motion or a full ITRF realization. It must not be called a TEME-to-ICRF conversion. Cesium receives these fixed x/y/z components multiplied by 1000. Velocity shown is the magnitude of the SGP4 inertial velocity, not ground-relative speed.

`eciToGeodetic` provides ellipsoidal latitude, longitude and altitude using satellite.js's Earth geometry. Observer look angles use Earth-fixed positions with observer latitude/longitude in radians and altitude in km.

Selected paths propagate 241 timestamps across the chosen past/future window. Every sample uses its own sidereal time. The rendered path is therefore an Earth-fixed locus, not a single-epoch inertial orbital ellipse. Ground tracks use geodetic sample coordinates and are drawn 2 km above the surface for readability. They are not terrain-following tracks. The path updates once per simulation minute.

## Time and guardrails

Orbital epochs without a timezone suffix are interpreted as UTC, as CelesTrak specifies. Absolute times use UTC milliseconds. The shared clock uses an anchor UTC timestamp and monotonic elapsed time, supporting pause and scaling without interval accumulation. Native `datetime-local` input is labeled UTC and interpreted as UTC explicitly.

Data age is wall-clock time since element epoch. Stale means older than 72 hours, not that accuracy has been quantified. A ±14-day element-age limit rejects unsupported prediction windows. This threshold is a UI guardrail, not a promise of accuracy within it.

## Geometric passes

The next 24 hours are sampled every 10 seconds. Crossing brackets are bisected to 250 ms; the elevation peak is refined using ternary search. Results include complete rise-to-set passes above a configurable threshold. In-progress passes and passes ending beyond the window are omitted. Very short grazing passes between samples may be missed; peak search assumes a smooth single elevation maximum. High-latitude and near-stationary cases require additional independent validation before this should be treated as a mature prediction product.

Pass visibility is not computed. Geometric elevation does not imply illumination, observer darkness, brightness or clear weather.

## Laboratory

Internal distance is km, time seconds, and angles radians. Gravitational parameter μ = 398600.4418 km³/s²; Earth reference radius = 6378.137 km. The model is an unperturbed elliptic two-body orbit:

- Period: 2π√(a³/μ).
- Mean anomaly advances at √(μ/a³).
- Eccentric anomaly solves E − e sin E = M with 60 bounded bisection iterations.
- Orbital-plane coordinates: x = a(cos E − e), y = a√(1 − e²)sin E.
- Orientation: Rz(RAAN) Rx(inclination) Rz(argument of perigee).
- Speed: √[μ(2/r − 1/a)]. Specific energy: −μ/(2a).

Earth is at the focus, not the center of the ellipse. Perigee/apogee altitudes are a(1∓e) − Earth radius. Earth-intersecting ellipses, nonfinite inputs and e ≥ 1 are rejected. Low perigee orbits can be mathematically valid but physically short-lived due to omitted drag. The diagram labels whether it shows the orbital plane or an orthographic equatorial projection. Initial phase is mean anomaly, never mislabeled true anomaly.

## Reference tests

The SGP4 test uses Vallado verification satellite 00005 at epoch with reference TEME position [7022.46529266, −1400.08296755, 0.03995155] km and a 0.01 km comparison precision to accommodate JavaScript millisecond date truncation. Reference: [Vallado software and verification material](https://celestrak.org/software/vallado-sw.php).

A 7000 km circular orbit has period 5828.516638 s and speed 7.54605329 km/s using the stated μ. Tests compare these independently tabulated values, eccentric perigee/apogee radii and energy conservation. Coordinate checks verify the quarter-turn rotation sign and the equatorial geodetic radius case. Pass tests currently check ordering, duration, thresholds and invalid coordinates; they are not yet an independent pass-timing validation.

## Stars and Solar System

The star background is Cesium’s bundled Tycho cubemap. Cesium models the Sun and Moon at the shared clock time. Astronomy Engine calculates apparent geocentric planet vectors in EQJ; rotation to true equator/equinox of date followed by Greenwich apparent sidereal rotation produces Earth-fixed vectors. This conversion is separate from satellite TEME propagation. Ephemerides refresh once per simulation minute.

Planet symbols are projected along camera-relative rays onto a 430-million-meter shell within the renderer far plane. Directions are preserved, but symbol distance, size and lunar occultation are not physical representations. The Solar System diagram uses heliocentric J2000 ecliptic vectors, logarithmic distance compression and exaggerated body sizes. Rings are distance guides rather than calculated orbital paths. The 1600–2400 date guardrail does not assert uniform accuracy. Source: [Astronomy Engine](https://github.com/cosinekitty/astronomy).
