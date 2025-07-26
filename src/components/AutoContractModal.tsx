import React, { useState } from 'react';
import { X, Settings, DollarSign, MapPin, Package, Shield } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { ShipInstance, CargoType } from '../types/game';

interface AutoContractModalProps {
  ship: ShipInstance;
  onClose: () => void;
}

export const AutoContractModal: React.FC<AutoContractModalProps> = ({ ship, onClose }) => {
  const { setAutoContract, shipSpecs } = useGameStore();
  const [enabled, setEnabled] = useState(ship.autoContract);
  const [minProfitMargin, setMinProfitMargin] = useState(ship.autoSettings.minProfitMargin);
  const [maxDistance, setMaxDistance] = useState(ship.autoSettings.maxDistance);
  const [preferredCargoTypes, setPreferredCargoTypes] = useState<CargoType[]>(ship.autoSettings.preferredCargoTypes);
  const [riskTolerance, setRiskTolerance] = useState(ship.autoSettings.riskTolerance);

  const shipSpec = shipSpecs.find(s => s.id === ship.specId);
  
  const availableCargoTypes: CargoType[] = (() => {
    switch (shipSpec?.class) {
      case 'Container': return ['Container'];
      case 'PCTC': return ['Car'];
      case 'Tanker': return ['Oil'];
      case 'Bulker': return ['Bulk'];
      case 'Cruise': return ['Passenger'];
      default: return ['Container', 'Car', 'Bulk', 'Oil', 'Passenger'];
    }
  })();

  const handleSave = () => {
    setAutoContract(ship.id, enabled, {
      minProfitMargin,
      maxDistance,
      preferredCargoTypes,
      riskTolerance,
    });
    onClose();
  };

  const handleCargoTypeToggle = (cargoType: CargoType) => {
    setPreferredCargoTypes(prev => 
      prev.includes(cargoType)
        ? prev.filter(t => t !== cargoType)
        : [...prev, cargoType]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-purple-600" />
            自動契約設定 - {ship.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-purple-800">自動契約受注</h3>
                <p className="text-sm text-purple-600">条件に合う契約を自動的に受注します</p>
              </div>
              <button
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enabled ? 'bg-purple-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {enabled && (
            <>
              {/* Profit Margin */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <DollarSign size={16} className="inline mr-1" />
                  最低利益率: {minProfitMargin}%
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={minProfitMargin}
                  onChange={(e) => setMinProfitMargin(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>5%</span>
                  <span>50%</span>
                </div>
              </div>

              {/* Max Distance */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <MapPin size={16} className="inline mr-1" />
                  最大航行距離: {maxDistance.toLocaleString()} nm
                </label>
                <input
                  type="range"
                  min="1000"
                  max="20000"
                  step="1000"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1,000 nm</span>
                  <span>20,000 nm</span>
                </div>
              </div>

              {/* Preferred Cargo Types */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  <Package size={16} className="inline mr-1" />
                  対応貨物タイプ
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableCargoTypes.map(cargoType => (
                    <button
                      key={cargoType}
                      onClick={() => handleCargoTypeToggle(cargoType)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        preferredCargoTypes.includes(cargoType)
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {cargoType === 'Container' && '📦 コンテナ'}
                      {cargoType === 'Car' && '🚗 自動車'}
                      {cargoType === 'Oil' && '🛢️ 石油'}
                      {cargoType === 'Bulk' && '⚫ バルク'}
                      {cargoType === 'Passenger' && '🚢 旅客'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk Tolerance */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  <Shield size={16} className="inline mr-1" />
                  リスク許容度
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map(risk => (
                    <button
                      key={risk}
                      onClick={() => setRiskTolerance(risk)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        riskTolerance === risk
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {risk === 'low' && '🛡️ 低リスク'}
                      {risk === 'medium' && '⚖️ 中リスク'}
                      {risk === 'high' && '⚡ 高リスク'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {riskTolerance === 'low' && '安全な航路と契約のみを選択'}
                  {riskTolerance === 'medium' && 'バランスの取れた契約を選択'}
                  {riskTolerance === 'high' && '高収益の契約を積極的に選択'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            設定を保存
          </button>
        </div>
      </div>
    </div>
  );
};