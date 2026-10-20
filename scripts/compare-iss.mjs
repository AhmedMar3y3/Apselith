import fs from 'node:fs';
import console from 'node:console';
import {
  json2satrec,
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLat,
  degreesLong,
} from 'satellite.js';
const inputs = JSON.parse(
  fs
    .readFileSync('docs/validation/iss-reference.json', 'utf8')
    .replace(/^\uFEFF/, ''),
);
const reference = inputs.reference;
const tle = inputs.referenceTle;
const snapshot = JSON.parse(
  fs.readFileSync('public/data/stations.json', 'utf8').replace(/^\uFEFF/, ''),
);
const lines = inputs.heavensAboveLines;
const omm = snapshot.records.find((row) => row.NORAD_CAT_ID === 25544);
if (!omm) throw new Error('ISS missing');
const date = new Date(reference.timestamp * 1000);
const calculate = (record, at = date) => {
  const state = propagate(record, at);
  if (!state) throw new Error('Propagation failed');
  const geo = eciToGeodetic(state.position, gstime(at));
  return {
    latitude: degreesLat(geo.latitude),
    longitude: degreesLong(geo.longitude),
    altitude: geo.height,
    speed: Math.hypot(state.velocity.x, state.velocity.y, state.velocity.z),
  };
};
const distance = (a, b) => {
  const rad = Math.PI / 180;
  const lat1 = a.latitude * rad;
  const lat2 = b.latitude * rad;
  const dlat = lat2 - lat1;
  const dlon = (b.longitude - a.longitude) * rad;
  return (
    6371 *
    2 *
    Math.asin(
      Math.min(
        1,
        Math.sqrt(
          Math.sin(dlat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2,
        ),
      ),
    )
  );
};
const candidates = {
  apselith: calculate(json2satrec(omm)),
  whereIssOwnTle: calculate(twoline2satrec(tle.line1, tle.line2)),
  heavensAboveTle: calculate(twoline2satrec(lines[0], lines[1])),
};
const result = {
  utc: date.toISOString(),
  reference,
  referenceTle: tle,
  heavensAboveLines: lines,
  apselithElements: omm,
  candidates: Object.fromEntries(
    Object.entries(candidates).map(([name, point]) => [
      name,
      {
        ...point,
        groundSeparationKm: distance(reference, point),
        altitudeDifferenceKm: point.altitude - reference.altitude,
        speedDifferenceKmS: point.speed - reference.velocity / 3600,
      },
    ]),
  ),
};
fs.writeFileSync(
  'docs/validation/iss-comparison.json',
  JSON.stringify(result, null, 2) + '\n',
);
const series = JSON.parse(
  fs
    .readFileSync('docs/validation/iss-reference-series.json', 'utf8')
    .replace(/^\uFEFF/, ''),
).map((sample) => {
  const at = new Date(sample.timestamp * 1000);
  const ours = calculate(json2satrec(omm), at);
  const sameTle = calculate(twoline2satrec(tle.line1, tle.line2), at);
  return {
    utc: at.toISOString(),
    reference: sample,
    apselith: ours,
    apselithGroundSeparationKm: distance(sample, ours),
    sameTleGroundSeparationKm: distance(sample, sameTle),
    altitudeDifferenceKm: ours.altitude - sample.altitude,
  };
});
fs.writeFileSync(
  'docs/validation/iss-series-comparison.json',
  JSON.stringify(series, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    {
      series: series.map(
        ({
          utc,
          apselithGroundSeparationKm,
          sameTleGroundSeparationKm,
          altitudeDifferenceKm,
        }) => ({
          utc,
          apselithGroundSeparationKm,
          sameTleGroundSeparationKm,
          altitudeDifferenceKm,
        }),
      ),
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({ utc: result.utc, comparisons: result.candidates }, null, 2),
);
