import React, { useState } from 'react';
import { AlertTriangle, CloudLightning, Navigation, PenLine, Undo2, X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { buildCustomRoute, LonLat, PANAMA_MAX_DWT } from '../constants/seaRoutes';
import { stormsOnRoute, STORM_KINDS } from '../constants/weather';
import { BaseMap, PortMarker, RiskZoneLayer, StormLayer } from './map/MapBase';
import { CARGO_STYLE, linePath, project } from './map/mapProjection';

interface RouteChoiceModalProps {
  shipId: string;
  contractId: string;
  onClose: () => void;
}

const CUSTOM_ID = 'custom';

// Lets the player pick which way a ship sails before it leaves port, or
// draw their own route by clicking waypoints on the sea.
export const RouteChoiceModal: React.FC<RouteChoiceModalProps> = ({ shipId, contractId, onClose }) => {
  const {
    fleet,
    contracts,
    ports,
    shipSpecs,
    storms,
    getRouteOptionsFor,
    calculateVoyageCosts,
    assignContract,
    formatCurrency,
  } = useGameStore();

  const ship = fleet.find(s => s.id === shipId);
  const contract = contracts.find(c => c.id === contractId);
  const spec = shipSpecs.find(s => s.id === ship?.specId);
  const origin = ports.find(p => p.LOCODE === contract?.origin);
  const dest = ports.find(p => p.LOCODE === contract?.destination);
  const routes = getRouteOptionsFor(shipId, contractId);
  const [selectedId, setSelectedId] = useState(routes[0]?.id);
  const [drawing, setDrawing] = useState(false);
  const [via, setVia] = useState<LonLat[]>([]);

  if (!ship || !contract || !spec || !origin || !dest || routes.length === 0) return null;

  const custom = drawing || via.length > 0 ? buildCustomRoute(origin, dest, via, spec) : null;
  const customProblem = !custom
    ? null
    : custom.landLegs.length > 0
      ? '陸地を横切っている区間（赤い線）があります。海の上に経由地を置いてください。'
      : custom.tooBigForPanama
        ? `この船は大きすぎてパナマ運河を通れません（${PANAMA_MAX_DWT.toLocaleString()} DWTまで）。`
        : null;

  const revenue = contract.amount * contract.freightRate;
  const color = CARGO_STYLE[contract.cargoType].color;
  const rows = [...routes, ...(custom ? [{ ...custom.route, id: CUSTOM_ID }] : [])].map(route => {
    const costs = calculateVoyageCosts(shipId, contractId, route);
    return {
      route,
      days: Math.ceil(route.distanceNm / spec.speedKt / 24),
      cost: costs.total,
      profit: revenue - costs.total,
      storms: stormsOnRoute(storms, route.points),
    };
  });
  const selected = rows.find(r => r.route.id === selectedId) ?? rows[0];
  const canSail = selected.route.id !== CUSTOM_ID || !customProblem;

  const startDrawing = () => {
    setDrawing(true);
    setSelectedId(CUSTOM_ID);
  };

  const addWaypoint = (point: LonLat) => {
    if (!drawing) return;
    setVia(prev => [...prev, point]);
    setSelectedId(CUSTOM_ID);
  };

  const confirm = () => {
    if (!canSail) return;
    assignContract(contractId, shipId, selected.route);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Navigation className="text-blue-600" />
            航路を選ぶ：{ship.name}（{origin.name} → {dest.name}）
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-6 py-2 bg-slate-50 border-b border-slate-200 text-sm">
          {drawing ? (
            <>
              <span className="text-blue-700 font-medium">
                海をクリックして経由地を置いてください（{via.length}か所）
              </span>
              <button
                onClick={() => setVia(prev => prev.slice(0, -1))}
                disabled={via.length === 0}
                className="ml-auto flex items-center gap-1 px-3 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <Undo2 size={14} />
                1つ戻す
              </button>
              <button
                onClick={() => setVia([])}
                disabled={via.length === 0}
                className="px-3 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                やり直す
              </button>
              <button
                onClick={() => setDrawing(false)}
                className="px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                描き終わる
              </button>
            </>
          ) : (
            <button
              onClick={startDrawing}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-white border border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <PenLine size={14} />
              {via.length > 0 ? '描いた航路を編集する' : '自分で航路を描く'}
            </button>
          )}
        </div>

        <BaseMap onMapClick={addWaypoint} className={drawing ? 'cursor-crosshair' : ''}>
          <RiskZoneLayer />
          <StormLayer storms={storms} />
          {rows
            .filter(({ route }) => route.id !== CUSTOM_ID)
            .map(({ route }) => (
              <path
                key={route.id}
                d={linePath(route.points)}
                fill="none"
                stroke={color}
                strokeWidth={route.id === selected.route.id ? 3 : 1.5}
                strokeOpacity={route.id === selected.route.id ? 0.9 : drawing ? 0.15 : 0.25}
                strokeDasharray={route.id === selected.route.id ? undefined : '5 4'}
                className={drawing ? '' : 'cursor-pointer'}
                pointerEvents={drawing ? 'none' : undefined}
                onClick={() => setSelectedId(route.id)}
              />
            ))}
          {custom &&
            custom.route.points.slice(1).map((point, i) => (
              <path
                key={`leg-${i}`}
                d={linePath([custom.route.points[i], point])}
                fill="none"
                stroke={custom.landLegs.includes(i) ? '#dc2626' : '#0d9488'}
                strokeWidth={selected.route.id === CUSTOM_ID ? 3 : 1.5}
                strokeOpacity={selected.route.id === CUSTOM_ID ? 0.95 : 0.4}
                pointerEvents="none"
              />
            ))}
          {via.map((point, i) => {
            const [x, y] = project(point);
            return (
              <g key={i} pointerEvents="none">
                <circle cx={x} cy={y} r={6} fill="#0d9488" stroke="#fff" strokeWidth={1.5} />
                <text x={x} y={y + 3} textAnchor="middle" fontSize={8} fontWeight={700} fill="#fff">
                  {i + 1}
                </text>
              </g>
            );
          })}
          <PortMarker port={origin} />
          <PortMarker port={dest} />
        </BaseMap>

        <div className="p-6 space-y-2">
          {rows.map(({ route, days, cost, profit, storms: routeStorms }) => {
            const isCustom = route.id === CUSTOM_ID;
            return (
              <label
                key={route.id}
                className={`flex flex-wrap items-center gap-x-6 gap-y-1 p-3 rounded-lg border cursor-pointer ${
                  route.id === selected.route.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="route"
                  checked={route.id === selected.route.id}
                  onChange={() => setSelectedId(route.id)}
                />
                <div className="min-w-[180px]">
                  <div className={`font-semibold ${isCustom ? 'text-teal-700' : 'text-slate-800'}`}>
                    {isCustom && '✏️ '}
                    {route.label}
                  </div>
                  <div className="text-xs text-slate-500">
                    {route.distanceNm.toLocaleString()}海里・約{days}日
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  費用 {formatCurrency(cost)}
                  {route.canalFee > 0 && (
                    <span className="text-xs text-slate-500">（運河通航料 {formatCurrency(route.canalFee)}）</span>
                  )}
                </div>
                <div className={`text-sm font-semibold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  利益 {formatCurrency(profit)}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {route.pirateZones.map(zone => (
                    <span key={zone} className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      海賊：{zone}
                    </span>
                  ))}
                  {routeStorms.map(storm => (
                    <span
                      key={storm.id}
                      className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 flex items-center gap-1"
                    >
                      <CloudLightning size={12} />
                      {storm.areaName}に{STORM_KINDS[storm.kind].label}
                    </span>
                  ))}
                </div>
                {isCustom && customProblem && <div className="w-full text-xs text-red-600">{customProblem}</div>}
              </label>
            );
          })}

          {spec.dwtOrGt > PANAMA_MAX_DWT && (
            <p className="text-xs text-slate-500">
              この船は大きすぎてパナマ運河を通れません（{PANAMA_MAX_DWT.toLocaleString()} DWTまで）。
            </p>
          )}
          <p className="text-xs text-slate-500">
            嵐の中では船が減速し、台風やハリケーンでは船体も傷みます。嵐は日ごとに動くので、出航時の天気は目安です。
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100">
              やめる
            </button>
            <button
              onClick={confirm}
              disabled={!canSail}
              className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              この航路で出航
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
