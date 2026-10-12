import React, { useState } from 'react';
import { Hammer, Handshake, Tag } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { ShipInstance } from '../types/game';
import { ageYears, CHARTER_PERIODS, charterHire, shipValue } from '../constants/shipMarket';

// Sell an idle ship at today's value, or hire it out on time charter.
export const ShipDealButtons: React.FC<{ ship: ShipInstance }> = ({ ship }) => {
  const { shipSpecs, freightMarket, simulationDay, sellShip, charterOut, formatCurrency } = useGameStore();
  const [open, setOpen] = useState<'sell' | 'charter' | null>(null);
  const spec = shipSpecs.find(s => s.id === ship.specId);
  if (!spec || ship.charter) return null;

  const value = shipValue(freightMarket, spec, ship.builtDay, simulationDay);
  const hire = charterHire(freightMarket, spec);

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-500">
        船齢{ageYears(ship.builtDay, simulationDay).toFixed(0)}年・時価 {formatCurrency(value)}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(open === 'sell' ? null : 'sell')}
          className="flex-1 px-2 py-1.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          <Tag size={12} className="inline mr-1" />
          売る
        </button>
        <button
          onClick={() => setOpen(open === 'charter' ? null : 'charter')}
          className="flex-1 px-2 py-1.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          <Handshake size={12} className="inline mr-1" />
          貸し出す
        </button>
      </div>
      {open === 'sell' && (
        <div className="p-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 space-y-2">
          <div>{formatCurrency(value)}で売却します。</div>
          <button
            onClick={() => sellShip(ship.id)}
            className="w-full px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700"
          >
            売却する
          </button>
        </div>
      )}
      {open === 'charter' && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-900 space-y-2">
          <div>
            今の相場なら {formatCurrency(hire)}/日 で貸せます。期間中は運賃相場が動いても固定で、維持費はこちら持ちです。
          </div>
          <div className="flex gap-1">
            {CHARTER_PERIODS.map(days => (
              <button
                key={days}
                onClick={() => charterOut(ship.id, days)}
                className="flex-1 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                {days}日
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Ships hired out to others and ships still at the yard.
export const OffFleetColumn: React.FC = () => {
  const { fleet, newbuildOrders, simulationDay, formatCurrency, ports } = useGameStore();
  const out = fleet.filter(s => s.charter?.kind === 'out');
  if (out.length === 0 && newbuildOrders.length === 0) return null;

  return (
    <div className="bg-slate-50 rounded-lg p-4 min-h-[200px] w-72 shrink-0 space-y-4">
      {out.length > 0 && (
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
            <Handshake size={18} className="text-blue-600" />
            貸出中
          </h3>
          <div className="space-y-2">
            {out.map(ship => (
              <div key={ship.id} className="bg-white rounded-lg p-3 border border-slate-200 text-sm">
                <div className="font-medium text-slate-800">{ship.name}</div>
                <div className="text-xs text-slate-600">
                  {formatCurrency(ship.charter!.dailyHire)}/日・あと{Math.max(0, ship.charter!.endDay - simulationDay)}日
                </div>
                <div className="text-xs text-slate-500">
                  {ports.find(p => p.LOCODE === ship.currentPort)?.name}に戻ります
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {newbuildOrders.length > 0 && (
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
            <Hammer size={18} className="text-orange-600" />
            建造中
          </h3>
          <div className="space-y-2">
            {newbuildOrders.map(order => (
              <div key={order.id} className="bg-white rounded-lg p-3 border border-slate-200 text-sm">
                <div className="font-medium text-slate-800">{order.name}</div>
                <div className="text-xs text-slate-600">竣工まであと{order.deliveryDay - simulationDay}日</div>
                <div className="text-xs text-slate-500">竣工時に残金 {formatCurrency(order.price - order.paid)} を支払い</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
