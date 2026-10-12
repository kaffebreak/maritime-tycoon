import { geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import landTopology from 'world-atlas/land-110m.json';
import type { LonLat } from './seaRoutes';

const topology = landTopology as unknown as Topology<{ land: GeometryCollection }>;
export const landFeature = feature(topology, topology.objects.land);

export const isOnLand = (point: LonLat) => geoContains(landFeature, point);

// The land map is coarse: straits narrow to a few miles and coastlines are
// approximate. Count a point as land only when it is land for this many
// nautical miles in every direction, so routes may hug coasts and thread
// straits but not cut across islands or peninsulas.
const COAST_TOLERANCE_NM = 10;

export const isInland = (point: LonLat) => {
  if (!isOnLand(point)) return false;
  const [lon, lat] = point;
  const dLat = COAST_TOLERANCE_NM / 60;
  const dLon = dLat / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  return [
    [lon + dLon, lat],
    [lon - dLon, lat],
    [lon, lat + dLat],
    [lon, lat - dLat],
  ].every(p => isOnLand(p as LonLat));
};
