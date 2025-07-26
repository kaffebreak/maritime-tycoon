import React, { useState } from 'react';
import { X, Ship, DollarSign, Zap, Fuel } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

interface ShipPurchaseModalProps {
  onClose: () => void;
}

export const ShipPurchaseModal: React.FC<ShipPurchaseModalProps> = ({ onClose }) => {
  const { shipSpecs, cash, purchaseShip, formatCurrency } = useGameStore();
  const [selectedSpec, setSelectedSpec] = useState<string>('');
  const [shipName, setShipName] = useState('');

  const handlePurchase = () => {
    if (selectedSpec && shipName.trim()) {
      purchaseShip(selectedSpec, shipName.trim());
      onClose();
    }
  };

  const selectedShipSpec = shipSpecs.find(s => s.id === selectedSpec);
  const canAfford = selectedShipSpec ? cash >= selectedShipSpec.buildCost : false;

  const getShipIcon = (shipClass: string) => {
    switch (shipClass) {
      case 'Container': return '📦';
      case 'PCTC': return '🚗';
      case 'Tanker': return '🛢️';
      case 'Bulker': return '⚫';
      case 'Cruise': return '🚢';
      default: return '🚢';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Ship className="text-blue-600" />
            船舶購入
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ship Selection */}
          <div>
            <h3 className="font-bold text-slate-800 mb-4">船舶タイプを選択</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {shipSpecs.map(spec => (
                <div
                  key={spec.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedSpec === spec.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSelectedSpec(spec.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getShipIcon(spec.class)}</span>
                      <div>
                        <h4 className="font-medium text-slate-800">{spec.subclass}</h4>
                        <p className="text-sm text-slate-600">{spec.class}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-800">
                        {formatCurrency(spec.buildCost)}
                      </div>
                      <div className={`text-sm ${cash >= spec.buildCost ? 'text-green-600' : 'text-red-600'}`}>
                        {cash >= spec.buildCost ? '購入可能' : '資金不足'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Ship size={14} />
                      <span>{spec.capacity.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap size={14} />
                      <span>{spec.speedKt} ノット</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Fuel size={14} />
                      <span>{spec.fuelBurn100nm}t/100nm</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Purchase Details */}
          <div>
            <h3 className="font-bold text-slate-800 mb-4">購入詳細</h3>
            
            {selectedShipSpec ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">選択された船舶</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>タイプ:</span>
                      <span className="font-medium">{selectedShipSpec.subclass}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>積載量:</span>
                      <span className="font-medium">{selectedShipSpec.capacity.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>速度:</span>
                      <span className="font-medium">{selectedShipSpec.speedKt} ノット</span>
                    </div>
                    <div className="flex justify-between">
                      <span>燃費:</span>
                      <span className="font-medium">{selectedShipSpec.fuelBurn100nm} t/100nm</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span>建造費:</span>
                      <span className="font-bold text-lg">{formatCurrency(selectedShipSpec.buildCost)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    船舶名
                  </label>
                  <input
                    type="text"
                    value={shipName}
                    onChange={(e) => setShipName(e.target.value)}
                    placeholder="例: Ocean Pioneer"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-600">現在の資金:</span>
                    <span className="font-medium">{formatCurrency(cash)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-600">購入後残高:</span>
                    <span className={`font-medium ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(cash - selectedShipSpec.buildCost)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Ship size={48} className="mx-auto mb-4 opacity-50" />
                <p>船舶タイプを選択してください</p>
              </div>
            )}
          </div>
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
            onClick={handlePurchase}
            disabled={!selectedSpec || !shipName.trim() || !canAfford}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            購入する
          </button>
        </div>
      </div>
    </div>
  );
};