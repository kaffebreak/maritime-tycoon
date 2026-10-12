import React, { useMemo, useState } from 'react';
import { Anchor, CloudLightning, Map as MapIcon, Navigation, Wrench } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { SIMULATION_TICK_MS } from '../constants/gameData';
import { getRouteOptions, LonLat, pointAlongRoute, remainingRoute } from '../constants/seaRoutes';
import { stormAt, STORM_KINDS } from '../constants/weather';
import { CargoType, ShipInstance, Storm } from '../types/game';
import { BaseMap, PortMarker, RiskZoneLayer, StormLayer } from './map/MapBase';
import { CARGO_STYLE, linePath, mapSide, project } from './map/mapProjection';

const STATUS_LABEL: Record<ShipInstance['status'], string> = {
  idle: '待機中',
  sailing: '航行中',
  loading: '積込中',
  maintenance: '整備中',
};

interface ShipOnMap {
  ship: ShipInstance;
  position: [number, number];
  heading: number;
  side: string;
  route?: LonLat[];
  routeLabel?: string;
  storm?: Storm;
  cargoType?: CargoType;
  originName?: string;
  destName?: string;
  progress?: number;
  daysLeft?: number;
  // Still on the empty leg to the loading port.
  ballast?: boolean;
}

export const WorldMap: React.FC = () => {
  const { fleet, ports, activeVoyages, contracts, simulationDay, gameSpeed, shipSpecs, storms } = useGameStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const portByCode = useMemo(() => new Map(ports.map(p => [p.LOCODE, p])), [ports]);

  const shipsOnMap = useMemo(() => {
    const sailing: ShipOnMap[] = [];
    const docked = new Map<string, ShipInstance[]>();

    for (const ship of fleet) {
      const voyage = activeVoyages.find(v => v.shipId === ship.id);
      const contract = voyage && contracts.find(c => c.id === voyage.contractId);
      const origin = contract && portByCode.get(contract.origin);
      const dest = contract && portByCode.get(contract.destination);

      if (!voyage || !contract || !origin || !dest) {
        const list = docked.get(ship.currentPort) ?? [];
        list.push(ship);
        docked.set(ship.currentPort, list);
        continue;
      }

      const route = voyage.route ?? getRouteOptions(origin, dest)[0].points;
      const here = pointAlongRoute(route, voyage.currentProgress);
      const ahead = pointAlongRoute(route, Math.min(1, voyage.currentProgress + 0.02));
      const [x, y] = project(here);
      const [ax, ay] = project(ahead);
      sailing.push({
        ship,
        position: [x, y],
        heading: (Math.atan2(ay - y, ax - x) * 180) / Math.PI,
        side: mapSide(here[0]),
        route,
        routeLabel: voyage.routeLabel,
        storm: stormAt(storms, here),
        cargoType: contract.cargoType,
        originName: origin.name,
        destName: dest.name,
        progress: voyage.currentProgress,
        daysLeft: Math.max(0, Math.ceil(voyage.startDay + voyage.estimatedDays - simulationDay)),
        ballast: !!voyage.ballastNm && !!voyage.routeNm && voyage.currentProgress < voyage.ballastNm / voyage.routeNm,
      });
    }
    return { sailing, docked };
  }, [fleet, activeVoyages, contracts, portByCode, simulationDay, storms]);

  const selectedShip = fleet.find(s => s.id === selectedId);
  const selectedSailing = shipsOnMap.sailing.find(s => s.ship.id === selectedId);

  // Ships move once per game day; animate between days at the tick rate.
  const moveMs = gameSpeed === 0 ? 0 : SIMULATION_TICK_MS / gameSpeed;

  return (
    <div className="p-6 space-y-4">
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <MapIcon className="text-blue-600" size={20} />
            <h2 className="text-lg font-bold text-slate-800">世界地図</h2>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            {Object.entries(CARGO_STYLE).map(([type, style]) => (
              <span key={type} className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: style.color }} />
                {style.label}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-400/50 border border-red-500" />
              海賊多発海域
            </span>
            <span className="flex items-center gap-1">🌀 台風・ハリケーン ⛈️ 嵐 🌫️ 濃霧（入ると減速）</span>
          </div>
        </div>

        <BaseMap onClick={() => setSelectedId(null)}>
          <RiskZoneLayer />
          <StormLayer storms={storms} />

          {shipsOnMap.sailing.map(s => {
            const isSelected = s.ship.id === selectedId;
            const color = CARGO_STYLE[s.cargoType!].color;
            const remaining = remainingRoute(s.route!, s.progress!);
            return (
              <path
                key={`route-${s.ship.id}`}
                d={linePath(remaining)}
                fill="none"
                stroke={color}
                strokeOpacity={selectedId && !isSelected ? 0.2 : 0.7}
                strokeWidth={isSelected ? 2.5 : 1.5}
                strokeDasharray="5 4"
              />
            );
          })}

          {ports.map(port => {
            const [x, y] = project([port.lon, port.lat]);
            const docked = shipsOnMap.docked.get(port.LOCODE) ?? [];
            return (
              <PortMarker key={port.LOCODE} port={port}>
                {docked.length > 0 && (
                  <g
                    className="cursor-pointer"
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedId(docked[0].id);
                    }}
                  >
                    <rect x={x + 6} y={y + 2} width={26} height={14} rx={7} fill="#16a34a" />
                    <text x={x + 19} y={y + 12.5} textAnchor="middle" fontSize={9} fill="#fff" fontWeight={700}>
                      ⚓{docked.length}
                    </text>
                  </g>
                )}
              </PortMarker>
            );
          })}

          {shipsOnMap.sailing.map(s => {
            const isSelected = s.ship.id === selectedId;
            const color = CARGO_STYLE[s.cargoType!].color;
            return (
              <g
                key={`${s.ship.id}-${s.side}`}
                className="cursor-pointer"
                style={{
                  transform: `translate(${s.position[0]}px, ${s.position[1]}px)`,
                  transition: `transform ${moveMs}ms linear`,
                }}
                onClick={e => {
                  e.stopPropagation();
                  setSelectedId(s.ship.id);
                }}
              >
                {isSelected && <circle r={12} fill={color} fillOpacity={0.2} />}
                {s.storm && (
                  <text x={7} y={-5} fontSize={10}>
                    {STORM_KINDS[s.storm.kind].emoji}
                  </text>
                )}
                <g transform={`rotate(${s.heading})`}>
                  <path d="M8,0 L-6,-5 L-3,0 L-6,5 Z" fill={color} stroke="#fff" strokeWidth={1.2} />
                </g>
                {isSelected && (
                  <text
                    y={-12}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={700}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    {s.ship.name}
                  </text>
                )}
              </g>
            );
          })}
        </BaseMap>

        {fleet.length === 0 && (
          <p className="px-5 py-3 text-sm text-slate-500 border-t border-slate-200">
            まだ船がありません。運航管理タブで船を購入すると、ここに表示されます。
          </p>
        )}
      </div>

      {selectedShip && (
        <div className="bg-white rounded-lg shadow border border-slate-200 p-4 flex flex-wrap items-center gap-x-8 gap-y-2">
          <div>
            <div className="text-xs text-slate-500">
              {shipSpecs.find(spec => spec.id === selectedShip.specId)?.subclass}
            </div>
            <div className="font-bold text-slate-800">{selectedShip.name}</div>
          </div>
          {selectedSailing ? (
            <>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Navigation size={16} className="text-blue-600" />
                {selectedSailing.originName} → {selectedSailing.destName}
                {selectedSailing.routeLabel && (
                  <span className="text-slate-500">（{selectedSailing.routeLabel}）</span>
                )}
              </div>
              {selectedSailing.storm && (
                <div className="flex items-center gap-1 text-sm font-medium text-violet-700">
                  <CloudLightning size={16} />
                  {STORM_KINDS[selectedSailing.storm.kind].label}の中を減速航行中
                </div>
              )}
              <div className="text-sm text-slate-700">{CARGO_STYLE[selectedSailing.cargoType!].label}</div>
              <div className="flex-1 min-w-[160px]">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>進捗 {Math.round(selectedSailing.progress! * 100)}%</span>
                  <span>到着まで あと{selectedSailing.daysLeft}日</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${selectedSailing.progress! * 100}%`,
                      background: CARGO_STYLE[selectedSailing.cargoType!].color,
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              {selectedShip.status === 'maintenance' ? (
                <Wrench size={16} className="text-red-600" />
              ) : (
                <Anchor size={16} className="text-green-600" />
              )}
              {portByCode.get(selectedShip.currentPort)?.name ?? selectedShip.currentPort}で
              {STATUS_LABEL[selectedShip.status]}
            </div>
          )}
        </div>
      )}

      {fleet.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-slate-200 divide-y divide-slate-100">
          {fleet.map(ship => {
            const sailing = shipsOnMap.sailing.find(s => s.ship.id === ship.id);
            return (
              <button
                key={ship.id}
                onClick={() => setSelectedId(ship.id)}
                className={`w-full text-left px-4 py-2 flex items-center gap-3 text-sm hover:bg-slate-50 ${
                  ship.id === selectedId ? 'bg-blue-50' : ''
                }`}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ background: sailing ? CARGO_STYLE[sailing.cargoType!].color : '#16a34a' }}
                />
                <span className="font-medium text-slate-800 w-40 truncate">{ship.name}</span>
                <span className="text-slate-600">
                  {sailing
                    ? `${sailing.ballast ? `${sailing.originName}へ空船回航中、その後 ` : ''}${sailing.originName} → ${sailing.destName}（あと${sailing.daysLeft}日）${
                        sailing.storm ? ` ${STORM_KINDS[sailing.storm.kind].emoji}${STORM_KINDS[sailing.storm.kind].label}で減速中` : ''
                      }`
                    : `${portByCode.get(ship.currentPort)?.name ?? ship.currentPort}で${STATUS_LABEL[ship.status]}`}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
