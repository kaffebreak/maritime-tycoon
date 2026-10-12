import { geoDistance, geoInterpolate } from 'd3-geo';
import { Port, ShipSpec } from '../types/game';
import { RISK_ZONES } from './gameData';

// [lon, lat]
export type LonLat = [number, number];

const EARTH_RADIUS_NM = 3440.065;

// Sea-lane waypoints so routes follow the oceans instead of cutting over land.
const WAYPOINTS: Record<string, LonLat> = {
  TOKYO_BAY: [139.75, 35.0],
  TOKYO_OFF: [140.2, 34.5],
  KYUSHU_S: [129.8, 30.0],
  ECS: [123.0, 30.6],
  TAIWAN_STRAIT: [119.8, 24.0],
  SCS_N: [115.5, 19.0],
  SCS_MID: [111.0, 12.0],
  SCS_S: [106.5, 5.0],
  SG: [104.3, 1.2],
  KARIMATA: [108.0, -2.0],
  SUNDA: [105.7, -6.3],
  INDIAN_E: [100.0, -12.0],
  MALACCA_S: [101.2, 2.4],
  MALACCA_N: [98.5, 5.0],
  ANDAMAN: [95.0, 6.2],
  SRI_LANKA: [80.5, 5.0],
  ARABIAN: [62.0, 14.0],
  ADEN: [48.0, 12.4],
  BAB: [43.3, 12.7],
  RED_MID: [38.5, 20.5],
  RED_N: [34.7, 27.0],
  SUEZ: [32.5, 29.9],
  PORT_SAID: [32.3, 31.6],
  CRETE_S: [25.0, 34.0],
  SICILY: [12.0, 36.8],
  GIBRALTAR: [-5.6, 35.95],
  CAPE_ST_VINCENT: [-9.5, 36.8],
  FINISTERRE: [-10.0, 43.5],
  USHANT: [-5.8, 48.6],
  DOVER: [1.5, 51.0],
  NORTH_SEA: [4.0, 53.5],
  ELBE: [8.0, 54.1],
  INDIAN_MID: [55.0, -30.0],
  CAPE_AGULHAS: [20.0, -36.5],
  ST_HELENA: [-5.0, -15.0],
  WEST_AFRICA: [-20.0, 10.0],
  CANARIES: [-18.0, 28.0],
  AZORES: [-28.0, 38.0],
  GRAND_BANKS: [-50.0, 42.0],
  NY_OFF: [-73.0, 40.2],
  HATTERAS: [-74.5, 34.5],
  BAHAMAS_E: [-71.0, 25.0],
  ANTILLES: [-58.0, 15.0],
  BRAZIL_E: [-30.0, -6.0],
  BRAZIL_S: [-42.0, -26.0],
  ARGENTINA: [-60.0, -45.0],
  CAPE_HORN: [-67.0, -57.5],
  CHILE: [-78.0, -40.0],
  PERU: [-84.0, -10.0],
  WINDWARD: [-73.8, 20.2],
  CARIB: [-77.0, 13.0],
  COLON: [-79.9, 9.4],
  BALBOA: [-79.5, 8.8],
  PANAMA_PAC: [-80.0, 7.0],
  MEXICO_S: [-95.0, 14.0],
  CABO: [-110.0, 21.5],
  BAJA: [-118.0, 30.0],
  LAX_OFF: [-118.6, 33.4],
};

const LANES: [string, string][] = [
  ['TOKYO_BAY', 'TOKYO_OFF'],
  ['TOKYO_OFF', 'KYUSHU_S'],
  ['TOKYO_OFF', 'LAX_OFF'],
  ['KYUSHU_S', 'ECS'],
  ['ECS', 'TAIWAN_STRAIT'],
  ['TAIWAN_STRAIT', 'SCS_N'],
  ['SCS_N', 'SCS_MID'],
  ['SCS_MID', 'SCS_S'],
  ['SCS_S', 'SG'],
  ['SG', 'MALACCA_S'],
  ['SG', 'KARIMATA'],
  ['SCS_S', 'KARIMATA'],
  ['KARIMATA', 'SUNDA'],
  ['SUNDA', 'INDIAN_E'],
  ['INDIAN_E', 'SRI_LANKA'],
  ['INDIAN_E', 'INDIAN_MID'],
  ['MALACCA_S', 'MALACCA_N'],
  ['MALACCA_N', 'ANDAMAN'],
  ['ANDAMAN', 'SRI_LANKA'],
  ['SRI_LANKA', 'ARABIAN'],
  ['SRI_LANKA', 'INDIAN_MID'],
  ['ARABIAN', 'ADEN'],
  ['ADEN', 'BAB'],
  ['BAB', 'RED_MID'],
  ['RED_MID', 'RED_N'],
  ['RED_N', 'SUEZ'],
  ['SUEZ', 'PORT_SAID'],
  ['PORT_SAID', 'CRETE_S'],
  ['CRETE_S', 'SICILY'],
  ['SICILY', 'GIBRALTAR'],
  ['GIBRALTAR', 'CAPE_ST_VINCENT'],
  ['CAPE_ST_VINCENT', 'FINISTERRE'],
  ['CAPE_ST_VINCENT', 'AZORES'],
  ['CAPE_ST_VINCENT', 'CANARIES'],
  ['FINISTERRE', 'USHANT'],
  ['USHANT', 'DOVER'],
  ['USHANT', 'GRAND_BANKS'],
  ['USHANT', 'AZORES'],
  ['DOVER', 'NORTH_SEA'],
  ['NORTH_SEA', 'ELBE'],
  ['INDIAN_MID', 'CAPE_AGULHAS'],
  ['CAPE_AGULHAS', 'ST_HELENA'],
  ['ST_HELENA', 'WEST_AFRICA'],
  ['ST_HELENA', 'BRAZIL_E'],
  ['WEST_AFRICA', 'CANARIES'],
  ['WEST_AFRICA', 'ANTILLES'],
  ['BRAZIL_E', 'ANTILLES'],
  ['BRAZIL_E', 'BRAZIL_S'],
  ['BRAZIL_S', 'ARGENTINA'],
  ['ARGENTINA', 'CAPE_HORN'],
  ['CAPE_HORN', 'CHILE'],
  ['CHILE', 'PERU'],
  ['PERU', 'PANAMA_PAC'],
  ['PERU', 'MEXICO_S'],
  ['ANTILLES', 'BAHAMAS_E'],
  ['GRAND_BANKS', 'NY_OFF'],
  ['AZORES', 'NY_OFF'],
  ['AZORES', 'BAHAMAS_E'],
  ['NY_OFF', 'HATTERAS'],
  ['HATTERAS', 'BAHAMAS_E'],
  ['BAHAMAS_E', 'WINDWARD'],
  ['WINDWARD', 'CARIB'],
  ['CARIB', 'COLON'],
  ['COLON', 'BALBOA'],
  ['BALBOA', 'PANAMA_PAC'],
  ['PANAMA_PAC', 'MEXICO_S'],
  ['MEXICO_S', 'CABO'],
  ['CABO', 'BAJA'],
  ['BAJA', 'LAX_OFF'],
];

// Where each port joins the lane network.
const PORT_ACCESS: Record<string, string> = {
  JPTYO: 'TOKYO_BAY',
  CNSHA: 'ECS',
  SGSIN: 'SG',
  USNYC: 'NY_OFF',
  USLAX: 'LAX_OFF',
  DEHAM: 'ELBE',
};

// Ships heavier than this do not fit the Panama Canal locks.
export const PANAMA_MAX_DWT = 120_000;

const CANALS = {
  suez: { node: 'SUEZ', name: 'スエズ運河', baseFee: 50_000, feePerDwt: 2 },
  panama: { node: 'COLON', name: 'パナマ運河', baseFee: 40_000, feePerDwt: 2.5 },
} as const;
type CanalId = keyof typeof CANALS;

// Landmarks that name a route, in the order they are checked.
const LANDMARKS: { node: string; label: string }[] = [
  { node: 'SUEZ', label: 'スエズ運河' },
  { node: 'COLON', label: 'パナマ運河' },
  { node: 'CAPE_AGULHAS', label: '喜望峰' },
  { node: 'CAPE_HORN', label: 'ホーン岬' },
  { node: 'SUNDA', label: 'スンダ海峡' },
  { node: 'MALACCA_N', label: 'マラッカ海峡' },
];

export const PIRACY_RADIUS_NM = 280;

export const nmBetween = (a: LonLat, b: LonLat) => geoDistance(a, b) * EARTH_RADIUS_NM;

const adjacency: Record<string, { to: string; nm: number }[]> = {};
for (const [a, b] of LANES) {
  const nm = nmBetween(WAYPOINTS[a], WAYPOINTS[b]);
  (adjacency[a] ??= []).push({ to: b, nm });
  (adjacency[b] ??= []).push({ to: a, nm });
}

const shortestPath = (start: string, goal: string, blocked: Set<string>): string[] | null => {
  const dist: Record<string, number> = { [start]: 0 };
  const prev: Record<string, string> = {};
  const open = new Set([start]);

  while (open.size > 0) {
    let current = '';
    for (const node of open) {
      if (!current || dist[node] < dist[current]) current = node;
    }
    if (current === goal) break;
    open.delete(current);
    for (const { to, nm } of adjacency[current] ?? []) {
      if (blocked.has(to)) continue;
      const candidate = dist[current] + nm;
      if (candidate < (dist[to] ?? Infinity)) {
        dist[to] = candidate;
        prev[to] = current;
        open.add(to);
      }
    }
  }

  if (dist[goal] === undefined) return null;
  const path = [goal];
  while (path[0] !== start) path.unshift(prev[path[0]]);
  return path;
};

const routeLength = (points: LonLat[]) =>
  points.slice(1).reduce((sum, p, i) => sum + nmBetween(points[i], p), 0);

// Waypoints inside a pirate zone; a ship sailing past them is exposed.
const PIRATE_NODES = Object.keys(WAYPOINTS).filter(id =>
  Object.values(RISK_ZONES).some(
    zone => nmBetween(WAYPOINTS[id], [zone.coordinates.lon, zone.coordinates.lat]) < PIRACY_RADIUS_NM,
  ),
);

export interface RouteOption {
  id: string;
  label: string;
  points: LonLat[];
  distanceNm: number;
  canalFee: number;
  canals: string[];
  pirateZones: string[];
}

const routeLabel = (path: string[]) => {
  const names = LANDMARKS.filter(l => path.includes(l.node)).map(l => l.label);
  return names.length > 0 ? `${names.join('・')}経由` : '直行';
};

// The pirate zones a route passes through, by name.
export const pirateZonesOnRoute = (points: LonLat[]): string[] =>
  Object.values(RISK_ZONES)
    .filter(zone => {
      const center: LonLat = [zone.coordinates.lon, zone.coordinates.lat];
      return points.some(p => nmBetween(p, center) < PIRACY_RADIUS_NM);
    })
    .map(zone => zone.name);

// The pirate zone a ship at `point` is in, if any.
export const pirateZoneAt = (point: LonLat): string | null =>
  Object.values(RISK_ZONES).find(
    zone => nmBetween(point, [zone.coordinates.lon, zone.coordinates.lat]) < PIRACY_RADIUS_NM,
  )?.name ?? null;

// The routes a ship can take between two ports, shortest first. Each is a
// genuinely different path: the shortest, then avoiding canals or pirates.
export const getRouteOptions = (from: Port, to: Port, spec?: ShipSpec): RouteOption[] => {
  const start = PORT_ACCESS[from.LOCODE];
  const goal = PORT_ACCESS[to.LOCODE];
  const tooBigForPanama = (spec?.dwtOrGt ?? 0) > PANAMA_MAX_DWT;
  const always = tooBigForPanama ? [CANALS.panama.node] : [];

  const exclusions: string[][] = [
    [],
    [CANALS.suez.node],
    [CANALS.panama.node],
    PIRATE_NODES.filter(id => id !== start && id !== goal),
    [CANALS.suez.node, CANALS.panama.node],
  ];

  const options: RouteOption[] = [];
  const seen = new Set<string>();
  for (const excluded of exclusions) {
    const lanePath = start && goal ? shortestPath(start, goal, new Set([...always, ...excluded])) : null;
    if (start && goal && !lanePath) continue;
    const path = lanePath ?? [];
    const key = path.join('>');
    if (seen.has(key)) continue;
    seen.add(key);

    const points: LonLat[] = [[from.lon, from.lat], ...path.map(id => WAYPOINTS[id]), [to.lon, to.lat]];
    const canals = (Object.keys(CANALS) as CanalId[]).filter(id => path.includes(CANALS[id].node));
    options.push({
      id: key || 'direct',
      label: routeLabel(path),
      points,
      distanceNm: Math.round(routeLength(points)),
      canalFee: canals.reduce(
        (sum, id) => sum + CANALS[id].baseFee + CANALS[id].feePerDwt * (spec?.dwtOrGt ?? 0),
        0,
      ),
      canals: canals.map(id => CANALS[id].name),
      pirateZones: pirateZonesOnRoute(points),
    });
  }
  return options.sort((a, b) => a.distanceNm - b.distanceNm);
};

// Locate `progress` (0-1) along a route, measured by distance sailed:
// the point itself and the index of the leg it lies on.
const locateOnRoute = (route: LonLat[], progress: number): { point: LonLat; leg: number } => {
  const legs = route.slice(1).map((p, i) => nmBetween(route[i], p));
  const total = legs.reduce((sum, nm) => sum + nm, 0);
  let remaining = Math.max(0, Math.min(1, progress)) * total;

  for (let i = 0; i < legs.length; i++) {
    if (remaining <= legs[i] || i === legs.length - 1) {
      const t = legs[i] === 0 ? 0 : Math.min(1, remaining / legs[i]);
      return { point: geoInterpolate(route[i], route[i + 1])(t) as LonLat, leg: i };
    }
    remaining -= legs[i];
  }
  return { point: route[route.length - 1], leg: route.length - 2 };
};

export const pointAlongRoute = (route: LonLat[], progress: number): LonLat =>
  locateOnRoute(route, progress).point;

// The part of a route still ahead of a ship at `progress`.
export const remainingRoute = (route: LonLat[], progress: number): LonLat[] => {
  const { point, leg } = locateOnRoute(route, progress);
  return [point, ...route.slice(leg + 1)];
};
