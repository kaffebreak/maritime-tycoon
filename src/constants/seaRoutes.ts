import { geoDistance, geoInterpolate } from 'd3-geo';
import { Port } from '../types/game';

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
  AZORES: [-28.0, 38.0],
  GRAND_BANKS: [-50.0, 42.0],
  NY_OFF: [-73.0, 40.2],
  HATTERAS: [-74.5, 34.5],
  BAHAMAS_E: [-71.0, 25.0],
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
  ['MALACCA_S', 'MALACCA_N'],
  ['MALACCA_N', 'ANDAMAN'],
  ['ANDAMAN', 'SRI_LANKA'],
  ['SRI_LANKA', 'ARABIAN'],
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
  ['FINISTERRE', 'USHANT'],
  ['USHANT', 'DOVER'],
  ['USHANT', 'GRAND_BANKS'],
  ['USHANT', 'AZORES'],
  ['DOVER', 'NORTH_SEA'],
  ['NORTH_SEA', 'ELBE'],
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

export const nmBetween = (a: LonLat, b: LonLat) => geoDistance(a, b) * EARTH_RADIUS_NM;

const adjacency: Record<string, { to: string; nm: number }[]> = {};
for (const [a, b] of LANES) {
  const nm = nmBetween(WAYPOINTS[a], WAYPOINTS[b]);
  (adjacency[a] ??= []).push({ to: b, nm });
  (adjacency[b] ??= []).push({ to: a, nm });
}

const shortestPath = (start: string, goal: string): string[] | null => {
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

const routeCache = new Map<string, LonLat[]>();

// Sea route between two ports as a list of [lon, lat] points, port to port.
export const getSeaRoute = (from: Port, to: Port): LonLat[] => {
  const key = `${from.LOCODE}-${to.LOCODE}`;
  const cached = routeCache.get(key);
  if (cached) return cached;

  const start = PORT_ACCESS[from.LOCODE];
  const goal = PORT_ACCESS[to.LOCODE];
  const lanePath = start && goal ? shortestPath(start, goal) : null;
  const route: LonLat[] = [
    [from.lon, from.lat],
    ...(lanePath ?? []).map(id => WAYPOINTS[id]),
    [to.lon, to.lat],
  ];
  routeCache.set(key, route);
  return route;
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
