// Generates components/canadaGeography.ts from real boundary data.
//
// The map used to carry hand-approximated coordinates, which read as a crude
// sketch — wrong coastlines, missing arctic archipelago, provinces the wrong
// relative size. This projects actual province boundaries instead.
//
// Run:  node scripts/generate-map-paths.mjs
//
// Source: click_that_hood canada.geojson (public domain, derived from
// Natural Earth). Fetched once and baked into a .ts file so the app ships
// static path strings with no runtime dependency on d3-geo or the network.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoConicConformal, geoPath, geoArea } from 'd3-geo';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SOURCE = 'https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/canada.geojson';

// GeoJSON name -> the numeric province codes this app uses (see PROVINCE_MAP
// in utils/constants.ts).
const NAME_TO_ID = {
  'Alberta': '1',
  'British Columbia': '2',
  'Manitoba': '3',
  'New Brunswick': '4',
  'Newfoundland and Labrador': '5',
  'Nova Scotia': '6',
  'Ontario': '7',
  'Prince Edward Island': '8',
  'Quebec': '9',
  'Saskatchewan': '10',
  'Northwest Territories': '11',
  'Nunavut': '12',
  'Yukon Territory': '13',
};

const WIDTH = 950;
const HEIGHT = 640;
const PADDING = 12;

// Rings smaller than this (in projected px²) are dropped. Canada has thousands
// of tiny arctic and coastal islands that add enormous path length and read as
// visual noise at this size. This keeps the major islands — Baffin, Victoria,
// Ellesmere, Newfoundland, Vancouver Island, Cape Breton, PEI — and discards
// the specks.
const MIN_RING_AREA = Number(process.env.MIN_RING_AREA ?? 16);

// Douglas-Peucker tolerance in projected px. Raw Natural Earth coastlines carry
// far more vertices than a 950px-wide map can resolve — Nunavut's archipelago
// alone was 99 KB of path data.
//
// Note this simplifies each province independently, so a shared border (say
// Ontario/Quebec) can diverge by up to the tolerance. That is deliberately kept
// below the 1px white stroke drawn between provinces, so any divergence is
// covered rather than showing as a sliver.
const SIMPLIFY_TOLERANCE = Number(process.env.SIMPLIFY_TOLERANCE ?? 0.6);

const ringAreaPx = (ring) => {
  // Shoelace formula on already-projected coordinates.
  let a = 0;
  for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a / 2);
};

// Perpendicular distance from p to the segment ab, squared.
const segDistSq = (p, a, b) => {
  let x = a[0], y = a[1];
  let dx = b[0] - x, dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) { x = b[0]; y = b[1]; }
    else if (t > 0) { x += dx * t; y += dy * t; }
  }
  dx = p[0] - x; dy = p[1] - y;
  return dx * dx + dy * dy;
};

const rdp = (points, tolSq) => {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  const last = points.length - 1;
  for (let i = 1; i < last; i++) {
    const d = segDistSq(points[i], points[0], points[last]);
    if (d > maxDist) { index = i; maxDist = d; }
  }
  if (maxDist > tolSq) {
    return [
      ...rdp(points.slice(0, index + 1), tolSq).slice(0, -1),
      ...rdp(points.slice(index), tolSq),
    ];
  }
  return [points[0], points[last]];
};

/** Simplify a closed ring, keeping it closed and never degenerate. */
const simplifyRing = (ring) => {
  const closed = ring.length > 1
    && ring[0][0] === ring[ring.length - 1][0]
    && ring[0][1] === ring[ring.length - 1][1];
  const open = closed ? ring.slice(0, -1) : ring;
  if (open.length <= 4) return ring;

  const simplified = rdp(open, SIMPLIFY_TOLERANCE * SIMPLIFY_TOLERANCE);
  // A ring needs at least 3 distinct points to enclose area.
  if (simplified.length < 3) return ring;
  return [...simplified, simplified[0]];
};

const fetchSource = async () => {
  const cache = path.join(root, 'scripts', '.cache-canada.geojson');
  if (fs.existsSync(cache)) return JSON.parse(fs.readFileSync(cache, 'utf8'));
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Failed to fetch source geometry: HTTP ${res.status}`);
  const text = await res.text();
  fs.writeFileSync(cache, text);
  return JSON.parse(text);
};

const geo = await fetchSource();
const features = geo.features.filter(f => NAME_TO_ID[f.properties.name]);
if (features.length !== 13) {
  throw new Error(`Expected 13 provinces/territories, matched ${features.length}`);
}

// Lambert Conformal Conic with the standard parallels Statistics Canada uses
// for national maps. This is the projection Canadians expect to see: it keeps
// provincial shapes recognisable and doesn't smear the north the way Mercator
// does.
const projection = geoConicConformal()
  .parallels([49, 77])
  .rotate([91.87, 0])
  .fitExtent(
    [[PADDING, PADDING], [WIDTH - PADDING, HEIGHT - PADDING]],
    { type: 'FeatureCollection', features }
  );

const pathGen = geoPath(projection);

const fmt = (n) => {
  // 1dp is well below what a 950px-wide map can resolve, and drops the
  // trailing ".0" that would otherwise pad every integer coordinate.
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

/**
 * Project a feature to screen space, drop rings too small to see, simplify the
 * survivors, and emit SVG path data.
 *
 * Holes (interior rings) are kept when they survive the area filter — SVG's
 * default nonzero fill rule renders them correctly given the source winding.
 */
const projectFeature = (feature) => {
  const geom = feature.geometry;
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;

  const parts = [];
  for (const poly of polys) {
    const rings = [];
    for (const ring of poly) {
      const projected = ring
        .map(c => projection(c))
        .filter(p => p && isFinite(p[0]) && isFinite(p[1]));
      if (projected.length < 4) continue;
      if (ringAreaPx(projected) < MIN_RING_AREA) continue;
      rings.push(simplifyRing(projected));
    }
    // rings[0] is the outer boundary; if it didn't survive, the island is gone.
    if (rings.length) parts.push(rings);
  }
  if (!parts.length) return null;

  const d = parts
    .flat()
    .map(ring => 'M' + ring.map(p => `${fmt(p[0])},${fmt(p[1])}`).join('L') + 'Z')
    .join('');

  return d;
};

// Label anchor: centroid of the province's LARGEST polygon, not of the whole
// multipolygon. A whole-shape centroid lands in open water for provinces split
// across islands (Newfoundland and Labrador is the worst offender).
const labelAnchor = (feature) => {
  const geom = feature.geometry;
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  let best = null;
  let bestArea = -1;
  for (const poly of polys) {
    const a = geoArea({ type: 'Polygon', coordinates: poly });
    if (a > bestArea) { bestArea = a; best = poly; }
  }
  const c = pathGen.centroid({ type: 'Polygon', coordinates: best });
  return c && isFinite(c[0]) ? [Math.round(c[0]), Math.round(c[1])] : null;
};

const paths = {};
const anchors = {};
const areas = {};

for (const f of features) {
  const id = NAME_TO_ID[f.properties.name];
  const d = projectFeature(f);
  if (!d) throw new Error(`No geometry survived for ${f.properties.name}`);
  paths[id] = d;
  anchors[id] = labelAnchor(f);
  areas[id] = Math.round(pathGen.area(f));
}

const order = Object.keys(NAME_TO_ID).map(n => NAME_TO_ID[n]).sort((a, b) => Number(a) - Number(b));
const byId = Object.fromEntries(Object.entries(NAME_TO_ID).map(([n, i]) => [i, n]));

const out = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-map-paths.mjs
//
// Province boundaries projected with a Lambert Conformal Conic projection
// (standard parallels 49°N/77°N, central meridian 91.87°W) — the projection
// Statistics Canada uses for national maps. Islands smaller than ${MIN_RING_AREA}px² are
// omitted and coordinates are rounded to 1dp to keep the payload small.
//
// Source geometry: click_that_hood canada.geojson (public domain, derived from
// Natural Earth).

export const MAP_VIEWBOX = '0 0 ${WIDTH} ${HEIGHT}';

/** Province code -> SVG path data. Codes match PROVINCE_MAP in utils/constants. */
export const PROVINCE_PATHS: Record<string, string> = {
${order.map(id => `  // ${byId[id]}\n  '${id}': '${paths[id]}',`).join('\n')}
};

/** Label anchor points, at the centroid of each province's largest landmass. */
export const PROVINCE_LABEL_ANCHORS: Record<string, [number, number]> = {
${order.map(id => `  '${id}': [${anchors[id][0]}, ${anchors[id][1]}],`).join('\n')}
};

/** Rendered area in px², used to decide which labels fit inside the shape. */
export const PROVINCE_RENDERED_AREA: Record<string, number> = {
${order.map(id => `  '${id}': ${areas[id]},`).join('\n')}
};
`;

const dest = path.join(root, 'components', 'canadaGeography.ts');
fs.writeFileSync(dest, out);

console.log(`wrote ${dest}`);
console.log(`viewBox 0 0 ${WIDTH} ${HEIGHT}, ${(out.length / 1024).toFixed(1)} KB`);
console.log('\nprovince           area(px²)   anchor      path chars');
for (const id of order) {
  console.log(
    `  ${byId[id].padEnd(26)} ${String(areas[id]).padStart(7)}   ` +
    `${String(anchors[id][0]).padStart(3)},${String(anchors[id][1]).padStart(3)}   ` +
    `${String(paths[id].length).padStart(6)}`
  );
}
