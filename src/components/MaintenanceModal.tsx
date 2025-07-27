import React, { useState } from 'react';
import { X, Wrench, DollarSign, Clock, TrendingUp, AlertTriangle, Calendar, CheckCircle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { ShipInstance, MaintenanceType } from '../types/game';
import { MAINTENANCE_COSTS, MAINTENANCE_DURATION, MAINTENANCE_CONDITION_RESTORE, MAINTENANCE_INTERVALS } from '../constants/gameData';

interface MaintenanceModalProps {
  ship: ShipInstance;
  onClose: () => void;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ ship, onClose }) => {
  const { 
    scheduleMaintenance, 
    startMaintenance, 
    formatCurrency, 
    cash, 
    shipSpecs, 
    simulationDay,
    ports 
  } = useGameStore();
  
  const [selectedType, setSelectedType] = useState<MaintenanceType>('minor');
  
  const shipSpec = shipSpecs.find(s => s.id === ship.specId);
  const currentPort = ports.find(p => p.LOCODE === ship.currentPort);
  
  if (!shipSpec) return null;
  
  const maintenanceOptions: Array<{
    type: MaintenanceType;
    name: string;
    description: string;
    icon: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  }> = [
    {
      type: 'minor',
      name: '定期点検',
      description: '日常的なメンテナンスと小修理',
      icon: '🔧',
      urgency: 'low',
    },
    {
      type: 'major',
      name: '大規模整備',
      description: '主要機器のオーバーホール',
      icon: '⚙️',
      urgency: 'medium',
    },
    {
      type: 'drydock',
      name: 'ドック入り',
      description: '船体の完全整備と塗装',
      icon: '🏗️',
      urgency: 'high',
    },
    {
      type: 'emergency',
      name: '緊急修理',
      description: '故障箇所の即座修理',
      icon: '🚨',
      urgency: 'critical',
    },
  ];
  
  const getMaintenanceInfo = (type: MaintenanceType) => ({
    cost: shipSpec.buildCost * MAINTENANCE_COSTS[type],
    duration: MAINTENANCE_DURATION[type],
    conditionRestore: MAINTENANCE_CONDITION_RESTORE[type],
  });
  
  const selectedInfo = getMaintenanceInfo(selectedType);
  const canAfford = cash >= selectedInfo.cost;
  
  const daysSinceLastMaintenance = simulationDay - ship.lastMaintenance;
  
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-300';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-300';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      default: return 'text-green-600 bg-green-100 border-green-300';
    }
  };
  
  const getRecommendedMaintenance = (): MaintenanceType => {
    if (ship.condition < 30) return 'emergency';
    if (daysSinceLastMaintenance >= MAINTENANCE_INTERVALS.drydock) return 'drydock';
    if (daysSinceLastMaintenance >= MAINTENANCE_INTERVALS.major) return 'major';
    return 'minor';
  };
  
  const recommendedType = getRecommendedMaintenance();
  
  const handleSchedule = () => {
    scheduleMaintenance(ship.id, selectedType);
    onClose();
  };
  
  const handleStart = () => {
    startMaintenance(ship.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="text-orange-600" />
            メンテナンス管理 - {ship.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ship Status */}
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="font-bold text-slate-800 mb-3">船舶状況</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">現在地:</span>
                  <span className="font-medium">{currentPort?.name || ship.currentPort}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">船舶状態:</span>
                  <span className={`font-medium ${
                    ship.condition >= 80 ? 'text-green-600' :
                    ship.condition >= 60 ? 'text-yellow-600' :
                    ship.condition >= 40 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {ship.condition.toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">前回メンテ:</span>
                  <span className="font-medium">{daysSinceLastMaintenance}日前</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">総航行距離:</span>
                  <span className="font-medium">{ship.totalDistance.toLocaleString()} nm</span>
                </div>
              </div>
            </div>

            {/* Current Maintenance Status */}
            {ship.scheduledMaintenance && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
                  <Calendar className="text-orange-600" size={20} />
                  予定されたメンテナンス
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>種類:</span>
                    <span className="font-medium capitalize">{ship.scheduledMaintenance.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>予定日数:</span>
                    <span className="font-medium">{ship.scheduledMaintenance.estimatedDays}日</span>
                  </div>
                  <div className="flex justify-between">
                    <span>予定費用:</span>
                    <span className="font-medium">{formatCurrency(ship.scheduledMaintenance.estimatedCost)}</span>
                  </div>
                </div>
                
                {ship.maintenanceStatus === 'scheduled' && (
                  <button
                    onClick={handleStart}
                    disabled={!canAfford}
                    className="w-full mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {canAfford ? 'メンテナンス開始' : '資金不足'}
                  </button>
                )}
              </div>
            )}

            {/* Maintenance History */}
            {ship.maintenanceHistory.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h3 className="font-bold text-slate-800 mb-3">メンテナンス履歴</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {ship.maintenanceHistory.slice(-3).map(record => (
                    <div key={record.id} className="text-sm border-b border-slate-200 pb-2">
                      <div className="flex justify-between">
                        <span className="capitalize font-medium">{record.type}</span>
                        <span className="text-slate-500">{record.completedDay - record.startDay}日前</span>
                      </div>
                      <div className="text-slate-600">
                        {record.port} • {formatCurrency(record.cost)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Maintenance Options */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800">メンテナンス種類を選択</h3>
            
            {/* Recommended Badge */}
            <div className={`p-3 rounded-lg border ${getUrgencyColor(
              recommendedType === 'emergency' ? 'critical' :
              recommendedType === 'drydock' ? 'high' :
              recommendedType === 'major' ? 'medium' : 'low'
            )}`}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} />
                <span className="font-medium">
                  推奨: {maintenanceOptions.find(o => o.type === recommendedType)?.name}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {maintenanceOptions.map(option => {
                const info = getMaintenanceInfo(option.type);
                const isRecommended = option.type === recommendedType;
                
                return (
                  <div
                    key={option.type}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedType === option.type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    } ${isRecommended ? 'ring-2 ring-orange-200' : ''}`}
                    onClick={() => setSelectedType(option.type)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                          <h4 className="font-medium text-slate-800 flex items-center gap-2">
                            {option.name}
                            {isRecommended && (
                              <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs">
                                推奨
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-slate-600">{option.description}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} />
                        <span>{formatCurrency(info.cost)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{info.duration}日</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp size={14} />
                        <span>+{info.conditionRestore}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cost Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">選択されたメンテナンス</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>費用:</span>
                  <span className="font-medium">{formatCurrency(selectedInfo.cost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>期間:</span>
                  <span className="font-medium">{selectedInfo.duration}日</span>
                </div>
                <div className="flex justify-between">
                  <span>状態回復:</span>
                  <span className="font-medium">+{selectedInfo.conditionRestore}%</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>完了後状態:</span>
                  <span className="font-bold text-green-600">
                    {Math.min(100, ship.condition + selectedInfo.conditionRestore).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
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
            onClick={handleSchedule}
            disabled={ship.scheduledMaintenance !== undefined || !canAfford}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            {!canAfford ? '資金不足' : 
             ship.scheduledMaintenance ? 'メンテナンス予定済み' : 
             'メンテナンス予約'}
          </button>
        </div>
      </div>
    </div>
  );
};