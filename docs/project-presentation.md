# APSELITH — GitHub and portfolio copy

## GitHub repository description

Interactive 3D satellite tracker and orbital mechanics lab with SGP4 predictions, a detailed Earth globe, Solar System exploration, and time controls. Built with React, TypeScript, and CesiumJS.

## Suggested GitHub topics

`satellite-tracking`, `orbital-mechanics`, `space`, `astronomy`, `cesiumjs`, `sgp4`, `react`, `typescript`, `vite`, `web-workers`, `data-visualization`, `solar-system`

## Portfolio project card

Prepared to match the visible project deck at [Ahmed Marey's portfolio](https://ahmed-mar3y.space/#projects): title, technology tags, descriptive paragraph, Contribution, Delivery and project link. These are suggested content values, not an inferred database schema.

| Field               | Suggested value                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| Project title       | APSELITH                                                                                        |
| Category / subtitle | Satellite Tracking & Orbital Exploration                                                        |
| Technology tags     | REACT · TYPESCRIPT · CESIUMJS · VITE · SATELLITE.JS · WEB WORKERS                               |
| Contribution        | Product design, visual identity and frontend engineering                                        |
| Delivery            | Personal project · Functional web application                                                   |
| Logo                | `public/brand/apselith-mark.svg`                                                                |
| Cover image         | `public/brand/apselith-project-cover.png`                                                       |
| Logo alt text       | APSELITH orbital logo                                                                           |
| Cover alt text      | APSELITH project artwork showing Earth, satellites and orbital paths against black space        |
| Live project URL    | Add the verified deployment URL when published                                                  |
| Source URL          | Add the GitHub repository URL after creating the repository                                     |
| Link label          | Explore live project (after deployment), or View source code (when the repository is available) |

### Description

Designed and built an interactive space exploration application that turns published orbital data into a detailed 3D Earth experience. Implemented satellite tracking with SGP4 predictions, smooth camera follow, geometric pass calculations and shared time controls, alongside a Solar System explorer and an educational orbital mechanics laboratory. Used Web Workers for orbital calculations and IndexedDB caching for resilient catalog access.

### Short description

A 3D satellite explorer with a detailed Earth globe, calculated satellite positions, immersive tracking, Solar System exploration and an interactive orbital mechanics lab.

### Optional case-study details

- **Challenge:** Present scientific orbital data through an understandable, responsive browser experience while keeping calculations separate from rendering.
- **Implementation:** React and strict TypeScript organize the interface; CesiumJS renders Earth; satellite.js performs SGP4 propagation in Web Workers. Hermite interpolation smooths motion, and a shared UTC clock coordinates tracking and simulations.
- **Data:** Validated CelesTrak catalogs cover stations, Starlink, operational GPS, Galileo and weather satellites. Per-group caching, request throttling and dated snapshots support provider failures.
- **Interaction:** Search, favorites, selected trajectories, ground tracks, automatic camera targeting and full-window Focus support exploration. Follow preserves the user's zoom and rotation.
- **Education:** Astronomy Engine supplies planetary positions, while a separate two-body laboratory demonstrates Keplerian motion and orbital properties.
- **Visual identity:** A custom orbital monogram, true-black interface, cyan accents and amber selection color connect the application and promotional artwork.
- **Validation:** Reference propagation tests, captured independent ISS comparisons, camera regression tests and browser workflow checks. These validate implementation behavior without claiming exact physical satellite locations.

## Artwork

Use the cover image above for the GitHub README and portfolio card. It is original AI-generated promotional artwork, not a screenshot, measured sky chart or physical-scale depiction. The existing vector logo remains the product identity. The source prompt and generation method are recorded in [visual identity](visual-identity.md).

No GitHub description or portfolio content was published automatically. This kit is ready to paste into those destinations.
