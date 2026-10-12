import React, { useState } from 'react';
import { AlertTriangle, CloudLightning, Navigation, X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { PANAMA_MAX_DWT } from '../constants/seaRoutes';
import { stormsOnRoute, STORM_KINDS } from '../constants/weather';
import { BaseMap, PortMarker, RiskZoneLayer, StormLayer } from './map/MapBase';
import { CARGO_STYLE, linePath } from './map/mapProjection';

interface RouteChoiceModalProps {
  shipId: string;
  contractId: string;
  onClose: () => void;
}

// Lets the player pick which way a ship sails before it leaves port.
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

  if (!ship || !contract || !spec || !origin || !dest || routes.length === 0) return null;

  const revenue = contract.amount * contract.freightRate;
  const color = CARGO_STYLE[contract.cargoType].color;
  const rows = routes.map(route => {
    const costs = calculateVoyageCosts(shipId, contractId, route);
    return {
      route,
      days: Math.ceil(route.distanceNm / spec.speedKt / 24),
      cost: costs.total,
      profit: revenue - costs.total,
      storms: stormsOnRoute(storms, route.points),
    };
  });

  const confirm = () => {
    assignContract(contractId, shipId, selectedId);
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

        <BaseMap>
          <RiskZoneLayer />
          <StormLayer storms={storms} />
          {rows.map(({ route }) => (
            <path
              key={route.id}
              d={linePath(route.points)}
              fill="none"
              stroke={color}
              strokeWidth={route.id === selectedId ? 3 : 1.5}
              strokeOpacity={route.id === selectedId ? 0.9 : 0.25}
              strokeDasharray={route.id === selectedId ? undefined : '5 4'}
              className="cursor-pointer"
              onClick={() => setSelectedId(route.id)}
            />
          ))}
          <PortMarker port={origin} />
          <PortMarker port={dest} />
        </BaseMap>

        <div className="p-6 space-y-2">
          {rows.map(({ route, days, cost, profit, storms: routeStorms }) => (
            <label
              key={route.id}
              className={`flex flex-wrap items-center gap-x-6 gap-y-1 p-3 rounded-lg border cursor-pointer ${
                route.id === selectedId ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="route"
                checked={route.id === selectedId}
                onChange={() => setSelectedId(route.id)}
              />
              <div className="min-w-[180px]">
                <div className="font-semibold text-slate-800">{route.label}</div>
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
            </label>
          ))}

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
              className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
            >
              この航路で出航
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
