# Foundation decisions

- **Vite instead of Next.js**: all core work occurs in the browser; SSR and a server runtime add no required capability. Vite provides a simple static distribution.
- **CesiumJS**: globe navigation, time-aware illumination and efficient primitive collections are established capabilities. Static assets are copied with a small Node script following [Cesium's integration guidance](https://cesium.com/blog/2024/02/13/configuring-vite-or-webpack-for-cesiumjs/). Its large lazy-loaded bundle is an accepted initial tradeoff.
- **satellite.js 6.0.2**: validated SGP4/SDP4 implementation with native OMM JSON support. Version 7.1.0's barrel exports caused Vite to bundle WebAssembly pthread worker entries and fail the production build with unsupported top-level await in IIFE output. Pinning the compatible 6.x line avoids an unneeded WASM integration. Reassess before upgrading.
- **No backend**: CelesTrak JSON access was verified with wildcard CORS. Browser caching and a real dated snapshot cover provider failure without a proxy or credentials.
- **Workers**: calculations are separate from React and rendering; one tracking worker and a short-lived pass worker suffice for the small initial group.
- **IndexedDB**: asynchronous storage fits structured catalog data. Small favorites and request timestamps use localStorage, with validation and visible storage errors.
- **Direct JSON plus static fallback**: JSON supports six-digit catalog numbers and avoids legacy TLE naming/field limitations. A static snapshot keeps the app inspectable offline but is always dated.
- **No copy plugin**: the initially installed static-copy plugin pulled in a vulnerable glob dependency. Node's built-in file copy needs no extra package and preserves Cesium's asset structure.
- **Accessible primitives**: semantic buttons/forms and native inputs handle ordinary controls. A local sheet-style wrapper uses Radix Dialog for mobile focus management, Escape handling and modal semantics, following the compositional shadcn/ui approach.
