import { cpSync, mkdirSync } from 'node:fs';
mkdirSync('public/cesium', { recursive: true });
for (const folder of ['Workers', 'ThirdParty', 'Assets', 'Widgets']) {
  cpSync(
    `node_modules/cesium/Build/Cesium/${folder}`,
    `public/cesium/${folder}`,
    { recursive: true },
  );
}
