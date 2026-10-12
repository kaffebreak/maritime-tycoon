import { v4 as uuidv4 } from 'uuid';
import { SeasonType, Storm, StormKind } from '../types/game';
import { LonLat, nmBetween, sampleRoute } from './seaRoutes';

interface StormKindInfo {
  label: string;
  emoji: string;
  radiusNm: [number, number];
  lifeDays: [number, number];
  // Share of a normal day's distance a ship covers inside the storm.
  speedFactor: number;
  // Hull condition lost per day inside the storm.
  damagePerDay: number;
}

export const STORM_KINDS: Record<StormKind, StormKindInfo> = {
  typhoon: { label: '台風', emoji: '🌀', radiusNm: [350, 550], lifeDays: [5, 9], speedFactor: 0.35, damagePerDay: 3 },
  hurricane: { label: 'ハリケーン', emoji: '🌀', radiusNm: [350, 550], lifeDays: [5, 9], speedFactor: 0.35, damagePerDay: 3 },
  cyclone: { label: 'サイクロン', emoji: '🌀', radiusNm: [300, 450], lifeDays: [4, 7], speedFactor: 0.4, damagePerDay: 2 },
  winter_storm: { label: '冬の嵐', emoji: '⛈️', radiusNm: [400, 650], lifeDays: [4, 8], speedFactor: 0.55, damagePerDay: 1 },
  fog: { label: '濃霧', emoji: '🌫️', radiusNm: [200, 350], lifeDays: [2, 4], speedFactor: 0.7, damagePerDay: 0 },
};

interface SpawnArea {
  kind: StormKind;
  name: string;
  lon: [number, number];
  lat: [number, number];
  // Degrees per day the storm drifts.
  drift: LonLat;
  // Daily chance of a new storm here, by season.
  chance: Record<SeasonType, number>;
}

const SPAWN_AREAS: SpawnArea[] = [
  {
    kind: 'typhoon', name: '西太平洋', lon: [128, 150], lat: [10, 22], drift: [-1.8, 1.2],
    chance: { spring: 0.03, summer: 0.15, autumn: 0.12, winter: 0.01 },
  },
  {
    kind: 'typhoon', name: '南シナ海', lon: [112, 120], lat: [10, 18], drift: [-1.2, 0.6],
    chance: { spring: 0.02, summer: 0.08, autumn: 0.08, winter: 0 },
  },
  {
    kind: 'hurricane', name: 'カリブ海', lon: [-65, -45], lat: [12, 22], drift: [-2, 1],
    chance: { spring: 0.01, summer: 0.1, autumn: 0.12, winter: 0 },
  },
  {
    kind: 'hurricane', name: 'メキシコ沖', lon: [-110, -95], lat: [12, 18], drift: [-1.5, 0.8],
    chance: { spring: 0.01, summer: 0.07, autumn: 0.06, winter: 0 },
  },
  {
    kind: 'cyclone', name: 'インド洋', lon: [62, 90], lat: [6, 16], drift: [-1, 0.8],
    chance: { spring: 0.06, summer: 0.02, autumn: 0.07, winter: 0.02 },
  },
  {
    kind: 'winter_storm', name: '北大西洋', lon: [-45, -15], lat: [40, 52], drift: [2.5, 0.5],
    chance: { spring: 0.04, summer: 0.01, autumn: 0.08, winter: 0.15 },
  },
  {
    kind: 'winter_storm', name: '北太平洋', lon: [155, 200], lat: [38, 48], drift: [3, 0.3],
    chance: { spring: 0.04, summer: 0.01, autumn: 0.07, winter: 0.14 },
  },
  {
    kind: 'winter_storm', name: '南極海', lon: [-70, 40], lat: [-48, -40], drift: [4, 0],
    chance: { spring: 0.06, summer: 0.08, autumn: 0.06, winter: 0.04 },
  },
  {
    kind: 'fog', name: '北海', lon: [-4, 6], lat: [49, 55], drift: [0, 0],
    chance: { spring: 0.08, summer: 0.04, autumn: 0.08, winter: 0.06 },
  },
  {
    kind: 'fog', name: 'ニューファンドランド沖', lon: [-55, -45], lat: [40, 46], drift: [0.3, 0],
    chance: { spring: 0.1, summer: 0.1, autumn: 0.03, winter: 0.02 },
  },
];

const MAX_STORMS = 8;

const between = ([min, max]: [number, number]) => min + Math.random() * (max - min);
const wrapLon = (lon: number) => ((lon + 540) % 360) - 180;

// Drift existing storms a day, drop the ones that have blown out, and
// maybe spawn new ones for the season.
export const advanceStorms = (storms: Storm[], season: SeasonType): { storms: Storm[]; spawned: Storm[] } => {
  const moved = storms
    .map(s => ({ ...s, lon: wrapLon(s.lon + s.drift[0]), lat: s.lat + s.drift[1], daysLeft: s.daysLeft - 1 }))
    .filter(s => s.daysLeft > 0);

  const spawned: Storm[] = [];
  for (const area of SPAWN_AREAS) {
    if (moved.length + spawned.length >= MAX_STORMS) break;
    if (Math.random() >= area.chance[season]) continue;
    const info = STORM_KINDS[area.kind];
    spawned.push({
      id: uuidv4(),
      kind: area.kind,
      areaName: area.name,
      lon: wrapLon(between(area.lon)),
      lat: between(area.lat),
      radiusNm: Math.round(between(info.radiusNm)),
      drift: [area.drift[0] * between([0.6, 1.3]), area.drift[1] * between([0.6, 1.3])],
      daysLeft: Math.round(between(info.lifeDays)),
    });
  }
  return { storms: [...moved, ...spawned], spawned };
};

// The storm covering `point`, if any (the strongest one when several overlap).
export const stormAt = (storms: Storm[], point: LonLat): Storm | undefined =>
  storms
    .filter(s => nmBetween(point, [s.lon, s.lat]) < s.radiusNm)
    .sort((a, b) => STORM_KINDS[a.kind].speedFactor - STORM_KINDS[b.kind].speedFactor)[0];

// Storms that currently sit across any part of a route.
export const stormsOnRoute = (storms: Storm[], points: LonLat[]): Storm[] => {
  const samples = sampleRoute(points, 150);
  return storms.filter(s => samples.some(({ point }) => nmBetween(point, [s.lon, s.lat]) < s.radiusNm));
};
