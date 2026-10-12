import React from 'react';
import { RISK_ZONES } from '../../constants/gameData';
import { LonLat, PIRACY_RADIUS_NM } from '../../constants/seaRoutes';
import { STORM_KINDS } from '../../constants/weather';
import { Port, Storm } from '../../types/game';
import {
  BOTTOM_Y,
  circlePath,
  graticulePath,
  landPath,
  MAP_WIDTH,
  project,
  spherePath,
  TOP_Y,
} from './mapProjection';

const STORM_COLOR: Record<Storm['kind'], string> = {
  typhoon: '#7c3aed',
  hurricane: '#7c3aed',
  cyclone: '#7c3aed',
  winter_storm: '#475569',
  fog: '#94a3b8',
};

export const StormLayer: React.FC<{ storms: Storm[] }> = ({ storms }) => (
  <g pointerEvents="none">
    {storms.map(storm => {
      const [x, y] = project([storm.lon, storm.lat]);
      const info = STORM_KINDS[storm.kind];
      return (
        <g key={storm.id}>
          <path
            d={circlePath([storm.lon, storm.lat], storm.radiusNm)}
            fill={STORM_COLOR[storm.kind]}
            fillOpacity={storm.kind === 'fog' ? 0.35 : 0.22}
            stroke={STORM_COLOR[storm.kind]}
            strokeOpacity={0.6}
            strokeDasharray={storm.kind === 'fog' ? '2 3' : undefined}
          />
          <text x={x} y={y + 5} textAnchor="middle" fontSize={14}>
            {info.emoji}
          </text>
          <text
            x={x}
            y={y + 17}
            textAnchor="middle"
            fontSize={8}
            fontWeight={600}
            fill={STORM_COLOR[storm.kind]}
            stroke="#fff"
            strokeWidth={2.5}
            paintOrder="stroke"
          >
            {info.label}
          </text>
        </g>
      );
    })}
  </g>
);

export const RiskZoneLayer: React.FC = () => (
  <g pointerEvents="none">
    {Object.values(RISK_ZONES).map(zone => {
      const center: LonLat = [zone.coordinates.lon, zone.coordinates.lat];
      const [x, y] = project(center);
      return (
        <g key={zone.name}>
          <path
            d={circlePath(center, PIRACY_RADIUS_NM)}
            fill="#f87171"
            fillOpacity={0.25}
            stroke="#ef4444"
            strokeDasharray="3 2"
          />
          <text x={x} y={y + 20} textAnchor="middle" fontSize={8} fill="#b91c1c">
            ☠ {zone.name}
          </text>
        </g>
      );
    })}
  </g>
);

export const PortMarker: React.FC<{ port: Port; children?: React.ReactNode }> = ({ port, children }) => {
  const [x, y] = project([port.lon, port.lat]);
  return (
    <g>
      <circle cx={x} cy={y} r={5} fill="#fff" stroke="#1e3a8a" strokeWidth={2} />
      <text
        x={x}
        y={y - 9}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="#1e293b"
        stroke="#fff"
        strokeWidth={3}
        paintOrder="stroke"
      >
        {port.name}
      </text>
      {children}
    </g>
  );
};

export const BaseMap: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string }> = ({
  children,
  onClick,
  className = '',
}) => (
  <svg
    viewBox={`0 ${TOP_Y} ${MAP_WIDTH} ${BOTTOM_Y - TOP_Y}`}
    className={`w-full h-auto block bg-sky-100 ${className}`}
    onClick={onClick}
  >
    <path d={spherePath} fill="#bfdbfe" />
    <path d={graticulePath} fill="none" stroke="#93c5fd" strokeWidth={0.5} />
    <path d={landPath} fill="#ecfccb" stroke="#84cc16" strokeWidth={0.6} />
    {children}
  </svg>
);
