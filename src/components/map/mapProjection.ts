import { geoCircle, geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { landFeature } from '../../constants/land';
import { LonLat } from '../../constants/seaRoutes';
import { CargoType } from '../../types/game';

export const MAP_WIDTH = 960;
const MAP_HEIGHT = 500;
const CENTER_LON = 10;

export const CARGO_STYLE: Record<CargoType, { color: string; label: string }> = {
  Container: { color: '#2563eb', label: '📦 コンテナ' },
  Car: { color: '#9333ea', label: '🚗 自動車' },
  Bulk: { color: '#b45309', label: '⚫ バルク' },
  Oil: { color: '#0f172a', label: '🛢️ 石油' },
  Passenger: { color: '#db2777', label: '🚢 旅客' },
};

const projection = geoNaturalEarth1()
  .rotate([-CENTER_LON, 0])
  .fitSize([MAP_WIDTH, MAP_HEIGHT], { type: 'Sphere' });
export const mapPath = geoPath(projection);

export const landPath = mapPath(landFeature) ?? '';
export const graticulePath = mapPath(geoGraticule10()) ?? '';
export const spherePath = mapPath({ type: 'Sphere' }) ?? '';

// Crop the polar regions, where no ship ever sails.
export const TOP_Y = projection([CENTER_LON, 75])![1];
export const BOTTOM_Y = projection([CENTER_LON, -62])![1];

export const project = (point: LonLat) => projection(point) ?? [0, 0];

// Map coordinates back to [lon, lat], or null off the globe.
export const unproject = (x: number, y: number): LonLat | null => {
  const point = projection.invert?.([x, y]);
  return point && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90 ? (point as LonLat) : null;
};

export const linePath = (points: LonLat[]) => mapPath({ type: 'LineString', coordinates: points }) ?? '';

export const circlePath = (center: LonLat, radiusNm: number) =>
  mapPath(geoCircle().center(center).radius(radiusNm / 60)()) ?? '';

// Which side of the map's seam a longitude falls on, so a ship crossing the
// date line jumps instead of sliding across the whole map.
export const mapSide = (lon: number) => (((lon - CENTER_LON + 540) % 360) - 180 >= 0 ? 'e' : 'w');

