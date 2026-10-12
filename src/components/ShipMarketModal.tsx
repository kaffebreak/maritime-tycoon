import React, { useState } from 'react';
import { X, Ship, Hammer, Handshake, Tag } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { shipPrice, shipPriceFactor } from '../constants/freightMarket';
import { ageYears, charterHire, NEWBUILD_DAYS, NEWBUILD_DEPOSIT } from '../constants/shipMarket';
import { dailyOperatingCost } from '../constants/gameData';
import { ShipSpec } from '../types/game';

interface ShipMarketModalProps {
  onClose: () => void;
}

type Tab = 'secondhand' | 'newbuild' | 'charter';

const SHIP_ICON: Record<string, string> = {
  Container: '📦',
  PCTC: '🚗',
  Tanker: '🛢️',
  Bulker: '⚫',
  Cruise: '🚢',
};

const CAPACITY_UNIT: Record<string, string> = {
  Container: 'TEU',
  PCTC: '台',
  Tanker: 't',
  Bulker: 't',
  Cruise: '人',
};

const SpecSummary: React.FC<{ spec: ShipSpec; extra?: string }> = ({ spec, extra }) => (
  <div className="flex items-center gap-3 min-w-[220px]">
    <span className="text-2xl">{SHIP_ICON[spec.class]}</span>
    <div>
      <div className="font-medium text-slate-800">
        {spec.subclass} <span className="text-xs text-slate-500">{spec.class}</span>
      </div>
      <div className="text-xs text-slate-500">
        {spec.capacity.toLocaleString()}
        {CAPACITY_UNIT[spec.class]}・{spec.speedKt}ノット・燃費{spec.fuelBurn100nm}t/100海里
        {extra && `・${extra}`}
      </div>
    </div>
  </div>
);

// Buy secondhand, order from the yard, or hire a ship for a while.
export const ShipMarketModal: React.FC<ShipMarketModalProps> = ({ onClose }) => {
  const {
    shipSpecs,
    ports,
    cash,
    fleet,
    simulationDay,
    freightMarket,
    secondhandOffers,
    charterOffers,
    orderNewbuild,
    buySecondhand,
    charterIn,
    formatCurrency,
  } = useGameStore();
  const [tab, setTab] = useState<Tab>('secondhand');
  const [shipName, setShipName] = useState(`Ocean ${fleet.length + 1}`);

  const specOf = (id: string) => shipSpecs.find(s => s.id === id)!;
  const portName = (code: string) => ports.find(p => p.LOCODE === code)?.name ?? code;
  const name = shipName.trim();
  const done = () => {
    setShipName(`Ocean ${fleet.length + 2}`);
    onClose();
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'secondhand', label: '中古船を買う', icon: <Tag size={16} /> },
    { id: 'newbuild', label: '新造船を発注', icon: <Hammer size={16} /> },
    { id: 'charter', label: '船を借りる（用船）', icon: <Handshake size={16} /> },
  ];

  const button = (label: string, enabled: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      disabled={!enabled || !name}
      className="ml-auto px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Ship className="text-blue-600" />
            船舶市場
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium ${
                tab === t.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
            船名
            <input
              value={shipName}
              onChange={e => setShipName(e.target.value)}
              className="px-2 py-1 border border-slate-300 rounded-md w-40"
            />
          </label>
        </div>

        <div className="text-sm text-slate-600 mb-3">手元資金 {formatCurrency(cash)}</div>

        {tab === 'secondhand' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              中古船の値段は運賃相場と船齢で決まります。不況で安く買い、好況で高く売るのが船主の腕の見せどころです。売り物は毎月入れ替わります。
            </p>
            {secondhandOffers.map(offer => {
              const spec = specOf(offer.specId);
              return (
                <div key={offer.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 p-3 border border-slate-200 rounded-lg">
                  <SpecSummary spec={spec} extra={`船齢${ageYears(offer.builtDay, simulationDay).toFixed(0)}年`} />
                  <div className="text-sm text-slate-600">{portName(offer.port)}で引き渡し</div>
                  <div className="font-bold text-slate-800">{formatCurrency(offer.price)}</div>
                  {button('買う', cash >= offer.price, () => {
                    buySecondhand(offer.id, name);
                    done();
                  })}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'newbuild' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              発注時に{Math.round(NEWBUILD_DEPOSIT * 100)}%を払い、残りは約{Math.round(NEWBUILD_DAYS / 30)}か月後の竣工時（上海の造船所で引き渡し）に払います。船価は運賃相場につれて上下し、好況の発注は高くつきます。
            </p>
            {shipSpecs.map(spec => {
              const price = shipPrice(freightMarket, spec);
              const deposit = Math.round(price * NEWBUILD_DEPOSIT);
              return (
                <div key={spec.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 p-3 border border-slate-200 rounded-lg">
                  <SpecSummary spec={spec} />
                  <div>
                    <div className="font-bold text-slate-800">{formatCurrency(price)}</div>
                    <div className="text-xs text-slate-500">
                      相場 {Math.round(shipPriceFactor(freightMarket, spec.class) * 100)}%・頭金 {formatCurrency(deposit)}
                    </div>
                  </div>
                  {button('発注する', cash >= deposit, () => {
                    orderNewbuild(spec.id, name);
                    done();
                  })}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'charter' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              用船料を毎日払って他社の船を借ります。船員費や保険は船主持ちで、燃料費と港費だけこちらが払います。期間が終わると、港で待機しているときに船主へ返します。用船料の相場：
              {shipSpecs
                .filter(s => s.class === 'Bulker' || s.class === 'Tanker')
                .map(s => ` ${s.subclass} ${formatCurrency(charterHire(freightMarket, s))}/日`)
                .join('、')}
            </p>
            {charterOffers.map(offer => {
              const spec = specOf(offer.specId);
              return (
                <div key={offer.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 p-3 border border-slate-200 rounded-lg">
                  <SpecSummary spec={spec} extra={`船齢${ageYears(offer.builtDay, simulationDay).toFixed(0)}年`} />
                  <div className="text-sm text-slate-600">
                    {portName(offer.port)}で受け取り・{offer.days}日間
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{formatCurrency(offer.dailyHire)}/日</div>
                    <div className="text-xs text-slate-500">自社船なら維持費 {formatCurrency(dailyOperatingCost(spec))}/日</div>
                  </div>
                  {button('借りる', true, () => {
                    charterIn(offer.id, name);
                    done();
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
