import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Ship, Package, MapPin, Clock, DollarSign, Plus, Settings, Repeat } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { ShipInstance, CargoContract } from '../types/game';
import { ShipPurchaseModal } from './ShipPurchaseModal';
import { AutoContractModal } from './AutoContractModal';

interface KanbanColumnProps {
  id: string;
  title: string;
  items: (ShipInstance | CargoContract)[];
  onDrop: (itemId: string, columnId: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, items }) => {
  return (
    <div className="bg-slate-50 rounded-lg p-4 min-h-[600px] w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          {id === 'ships' && <Ship size={20} className="text-blue-600" />}
          {id === 'contracts' && <Package size={20} className="text-green-600" />}
          {id === 'assigned' && <MapPin size={20} className="text-orange-600" />}
          {title}
        </h3>
        <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded-full text-sm">
          {items.length}
        </span>
      </div>
      
      <div className="space-y-3">
        {items.map(item => (
          <KanbanCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

const KanbanCard: React.FC<{ item: ShipInstance | CargoContract }> = ({ item }) => {
  const { ports, shipSpecs, formatCurrency, calculateVoyageCosts, fleet, assignContract, contracts, setAutoContract, simulationDay } = useGameStore();
  const [showAutoModal, setShowAutoModal] = useState(false);

  const isShip = 'specId' in item;
  
  if (isShip) {
    const ship = item as ShipInstance;
    const spec = shipSpecs.find(s => s.id === ship.specId);
    const currentPort = ports.find(p => p.LOCODE === ship.currentPort);
    
    const getShipTypeIcon = (shipClass: string) => {
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
      <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getShipTypeIcon(spec?.class || '')}</span>
            <div>
              <h4 className="font-medium text-slate-800">{ship.name}</h4>
              <p className="text-xs text-slate-500">{spec?.class} - {spec?.subclass}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ship.autoContract && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                自動
              </span>
            )}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              ship.status === 'idle' ? 'bg-green-100 text-green-700' :
              ship.status === 'sailing' ? 'bg-blue-100 text-blue-700' :
              ship.status === 'loading' ? 'bg-orange-100 text-orange-700' :
              'bg-red-100 text-red-700'
            }`}>
              {ship.status === 'idle' ? '待機中' :
               ship.status === 'sailing' ? '航行中' :
               ship.status === 'loading' ? '積込中' : 'メンテ中'}
            </span>
          </div>
        </div>
        
        <div className="text-sm text-slate-600 space-y-1">
          <div className="flex items-center gap-1">
            <Ship size={14} />
            <span>積載量: {spec?.capacity.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={14} />
            <span>{currentPort?.name}</span>
          </div>
          {ship.status === 'sailing' && ship.etaDay > 0 && (
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>ETA: {ship.etaDay}日後</span>
            </div>
          )}
        </div>

        {ship.status === 'idle' && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <button
              onClick={() => setShowAutoModal(true)}
              className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                ship.autoContract
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Settings size={14} className="inline mr-1" />
              {ship.autoContract ? '自動契約: ON' : '自動契約設定'}
            </button>
          </div>
        )}

        {showAutoModal && (
          <AutoContractModal
            ship={ship}
            onClose={() => setShowAutoModal(false)}
          />
        )}
      </div>
    );
  } else {
    const contract = item as CargoContract;
    const originPort = ports.find(p => p.LOCODE === contract.origin);
    const destPort = ports.find(p => p.LOCODE === contract.destination);
    const revenue = contract.amount * contract.freightRate;
    
    // 船種と場所による契約フィルタリング
    const availableShips = fleet.filter(ship => {
      if (ship.status !== 'idle') return false;
      
      const shipSpec = shipSpecs.find(s => s.id === ship.specId);
      if (!shipSpec) return false;
      
      // 船種による貨物対応チェック
      const canCarryCargoType = (() => {
        switch (contract.cargoType) {
          case 'Container':
            return shipSpec.class === 'Container';
          case 'Car':
            return shipSpec.class === 'PCTC';
          case 'Oil':
            return shipSpec.class === 'Tanker';
          case 'Bulk':
            return shipSpec.class === 'Bulker';
          case 'Passenger':
            return shipSpec.class === 'Cruise';
          default:
            return false;
        }
      })();
      
      if (!canCarryCargoType) return false;
      
      // 積載量チェック
      if (contract.amount > shipSpec.capacity) return false;
      
      // 現在地と出発港の距離チェック（同じ港または近隣港のみ）
      const currentPort = ports.find(p => p.LOCODE === ship.currentPort);
      if (!currentPort || !originPort) return false;
      
      // 同じ港または同じ大陸内の港のみ
      const isSamePort = ship.currentPort === contract.origin;
      const isSameContinent = currentPort.continent === originPort.continent;
      
      return isSamePort || isSameContinent;
    });

    // 最適な船舶でのコスト計算
    const bestShip = availableShips[0];
    const costs = bestShip ? calculateVoyageCosts(bestShip.id, contract.id) : null;
    const profit = costs ? revenue - costs.total : 0;
    const profitMargin = costs && revenue > 0 ? ((profit / revenue) * 100) : 0;
    
    // Calculate remaining days
    const remainingDays = contract.expiresDay - (simulationDay - contract.createdDay);
    const isUrgent = remainingDays <= 3;
    
    return (
      <div
        className={`bg-white rounded-lg p-4 shadow-sm border cursor-move hover:shadow-md transition-shadow ${
          isUrgent ? 'border-red-300 bg-red-50' : 'border-slate-200'
        }`}
        draggable
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-slate-800 capitalize">
            {contract.cargoType}
          </h4>
          <div className="text-right">
            <div className="text-green-600 font-bold text-sm">
              {formatCurrency(revenue)}
            </div>
            {contract.contractType === 'long_term' && (
              <div className="flex items-center gap-1 text-xs text-purple-600">
                <Repeat size={12} />
                長期 ({contract.repeatCount}回)
              </div>
            )}
          </div>
        </div>
        
        <div className="text-sm text-slate-600 space-y-1">
          <div className="flex items-center gap-1">
            <Package size={14} />
            <span>{contract.amount.toLocaleString()} 単位</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={14} />
            <span>{originPort?.name} → {destPort?.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>
              {contract.distanceNm.toFixed(0)} nm • 期限まで{remainingDays}日
              {contract.contractType === 'long_term' && ` • ${contract.duration}日間`}
            </span>
          </div>
        </div>

        {/* コストと利益の表示 */}
        {costs && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">収益:</span>
                <span className="font-medium text-green-600">{formatCurrency(revenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">コスト:</span>
                <span className="font-medium text-red-600">-{formatCurrency(costs.total)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-slate-700 font-medium">利益:</span>
                <span className={`font-bold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(profit)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">利益率:</span>
                <span className={`font-medium ${profitMargin > 15 ? 'text-green-600' : profitMargin > 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
            </div>
            
            {/* コスト内訳（詳細表示） */}
            <details className="mt-2">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                コスト詳細を表示
              </summary>
              <div className="mt-2 bg-slate-50 rounded p-2 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>燃料費:</span>
                  <span>{formatCurrency(costs.fuel)}</span>
                </div>
                <div className="flex justify-between">
                  <span>港湾費:</span>
                  <span>{formatCurrency(costs.port)}</span>
                </div>
                <div className="flex justify-between">
                  <span>貨物費:</span>
                  <span>{formatCurrency(costs.cargo)}</span>
                </div>
                <div className="flex justify-between">
                  <span>メンテナンス:</span>
                  <span>{formatCurrency(costs.maintenance)}</span>
                </div>
                <div className="flex justify-between">
                  <span>保険:</span>
                  <span>{formatCurrency(costs.insurance)}</span>
                </div>
              </div>
            </details>
          </div>
        )}
        
        {availableShips.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-slate-500 mb-2">
              対応可能船舶: {availableShips.length}隻
            </div>
            <button
              onClick={() => {
                const ship = availableShips[0];
                assignContract(contract.id, ship.id);
              }}
              className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                profit <= 0 
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : contract.contractType === 'long_term'
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {profit <= 0 ? '⚠️ 赤字契約を受ける' : 
               contract.contractType === 'long_term' ? '長期契約を受ける' : '契約を受ける'}
            </button>
            <div className="text-xs text-slate-600 mt-1">
              → {availableShips[0]?.name}
              {costs && (
                <span className={`ml-2 font-medium ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  (利益: {formatCurrency(profit)})
                </span>
              )}
            </div>
          </div>
        )}
        
        {availableShips.length === 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="text-center text-sm text-slate-500">
              {fleet.filter(s => s.status === 'idle').length === 0 
                ? '利用可能な船舶がありません'
                : '対応可能な船舶がありません'
              }
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {(() => {
                const idleShips = fleet.filter(s => s.status === 'idle');
                if (idleShips.length === 0) return '全船舶が航行中です';
                
                const wrongType = idleShips.filter(ship => {
                  const spec = shipSpecs.find(s => s.id === ship.specId);
                  if (!spec) return false;
                  
                  switch (contract.cargoType) {
                    case 'Container': return spec.class !== 'Container';
                    case 'Car': return spec.class !== 'PCTC';
                    case 'Oil': return spec.class !== 'Tanker';
                    case 'Bulk': return spec.class !== 'Bulker';
                    case 'Passenger': return spec.class !== 'Cruise';
                    default: return true;
                  }
                }).length;
                
                const wrongLocation = idleShips.filter(ship => {
                  const currentPort = ports.find(p => p.LOCODE === ship.currentPort);
                  return currentPort && originPort && 
                         ship.currentPort !== contract.origin && 
                         currentPort.continent !== originPort.continent;
                }).length;
                
                const wrongCapacity = idleShips.filter(ship => {
                  const spec = shipSpecs.find(s => s.id === ship.specId);
                  return spec && contract.amount > spec.capacity;
                }).length;
                
                if (wrongType > 0) return `船種不適合: ${wrongType}隻`;
                if (wrongLocation > 0) return `位置不適合: ${wrongLocation}隻`;
                if (wrongCapacity > 0) return `積載量不足: ${wrongCapacity}隻`;
                return '条件不適合';
              })()}
            </div>
          </div>
        )}
      </div>
    );
  }
};

const ShipCompatibilityIndicator: React.FC<{ ship: ShipInstance; contract: CargoContract }> = ({ ship, contract }) => {
  const { ports, shipSpecs } = useGameStore();
  
  const shipSpec = shipSpecs.find(s => s.id === ship.specId);
  const currentPort = ports.find(p => p.LOCODE === ship.currentPort);
  const originPort = ports.find(p => p.LOCODE === contract.origin);
  
  if (!shipSpec || !currentPort || !originPort) return null;
  
  const canCarryCargoType = (() => {
    switch (contract.cargoType) {
      case 'Container': return shipSpec.class === 'Container';
      case 'Car': return shipSpec.class === 'PCTC';
      case 'Oil': return shipSpec.class === 'Tanker';
      case 'Bulk': return shipSpec.class === 'Bulker';
      case 'Passenger': return shipSpec.class === 'Cruise';
      default: return false;
    }
  })();
  
  const hasCapacity = contract.amount <= shipSpec.capacity;
  const isInRange = ship.currentPort === contract.origin || currentPort.continent === originPort.continent;
  
  const isCompatible = canCarryCargoType && hasCapacity && isInRange;
  
  return (
    <div className={`text-xs px-2 py-1 rounded-full ${
      isCompatible 
        ? 'bg-green-100 text-green-700' 
        : 'bg-red-100 text-red-700'
    }`}>
      {isCompatible ? '✓ 対応可能' : '✗ 対応不可'}
      {!canCarryCargoType && ' (船種)'}
      {!hasCapacity && ' (積載量)'}
      {!isInRange && ' (位置)'}
    </div>
  );
};

export const KanbanBoard: React.FC = () => {
  const { 
    fleet, 
    contracts, 
    assignContract, 
    generateContracts,
    activeVoyages,
    ports,
    shipSpecs,
    simulationDay
  } = useGameStore();
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedShipType, setSelectedShipType] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [contractTypeFilter, setContractTypeFilter] = useState<string>('all');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // フィルタリング
  const filteredFleet = fleet.filter(ship => {
    if (ship.status !== 'idle') return false;
    
    if (selectedShipType !== 'all') {
      const spec = shipSpecs.find(s => s.id === ship.specId);
      if (!spec || spec.class !== selectedShipType) return false;
    }
    
    if (selectedLocation !== 'all') {
      const currentPort = ports.find(p => p.LOCODE === ship.currentPort);
      if (!currentPort || currentPort.continent !== selectedLocation) return false;
    }
    
    return true;
  });

  const idleShips = filteredFleet;
  const availableContracts = contracts.filter(c => {
    if (c.status !== 'available') return false;
    if (contractTypeFilter !== 'all' && c.contractType !== contractTypeFilter) return false;
    
    // Filter out expired contracts
    const remainingDays = c.expiresDay - (simulationDay - c.createdDay);
    if (remainingDays <= 0) return false;
    
    return true;
  });
  const assignedPairs = activeVoyages.map(v => ({
    ship: fleet.find(s => s.id === v.shipId),
    contract: contracts.find(c => c.id === v.contractId),
  })).filter(pair => pair.ship && pair.contract);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeItem = [...idleShips, ...availableContracts].find(item => item.id === active.id);
    if (!activeItem) return;

    // Handle ship to contract assignment
    if ('specId' in activeItem && over.id.toString().startsWith('contract-')) {
      const contractId = over.id.toString().replace('contract-', '');
      assignContract(contractId, activeItem.id);
    }
    // Handle contract to ship assignment  
    else if ('cargoType' in activeItem && over.id.toString().startsWith('ship-')) {
      const shipId = over.id.toString().replace('ship-', '');
      assignContract(activeItem.id, shipId);
    }

    setActiveId(null);
  };

  const shipTypes = ['all', 'Container', 'PCTC', 'Tanker', 'Bulker', 'Cruise'];
  const continents = ['all', ...Array.from(new Set(ports.map(p => p.continent)))];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">運航管理ボード</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            船舶購入
          </button>
          <button
            onClick={generateContracts}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={16} />
            新規契約
          </button>
        </div>
      </div>

      {/* フィルター */}
      <div className="flex gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">船種:</span>
          <select
            value={selectedShipType}
            onChange={(e) => setSelectedShipType(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded-md text-sm"
          >
            {shipTypes.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? '全て' : type}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">地域:</span>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded-md text-sm"
          >
            {continents.map(continent => (
              <option key={continent} value={continent}>
                {continent === 'all' ? '全て' : continent}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">契約種別:</span>
          <select
            value={contractTypeFilter}
            onChange={(e) => setContractTypeFilter(e.target.value)}
            className="px-3 py-1 border border-slate-300 rounded-md text-sm"
          >
            <option value="all">全て</option>
            <option value="spot">スポット契約</option>
            <option value="long_term">長期契約</option>
          </select>
        </div>
        <div className="text-sm text-slate-600 flex items-center">
          表示中: 船舶 {idleShips.length}隻 / 契約 {availableContracts.length}件
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-4">
          <KanbanColumn
            id="ships"
            title="待機中の船舶"
            items={idleShips}
            onDrop={() => {}}
          />
          
          <KanbanColumn
            id="contracts"
            title="利用可能な契約"
            items={availableContracts}
            onDrop={() => {}}
          />
          
          <div className="bg-slate-50 rounded-lg p-4 min-h-[600px] w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <MapPin size={20} className="text-orange-600" />
                航行中
              </h3>
              <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded-full text-sm">
                {assignedPairs.length}
              </span>
            </div>
            
            <div className="space-y-4">
              {assignedPairs.map(({ ship, contract }) => {
                if (!ship || !contract) return null;
                
                const voyage = activeVoyages.find(v => v.shipId === ship.id);
                const progress = voyage ? voyage.currentProgress * 100 : 0;
                
                return (
                  <div key={`${ship.id}-${contract.id}`} className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                    <div className="mb-3">
                      <h4 className="font-medium text-slate-800">{ship.name}</h4>
                      <p className="text-sm text-slate-600 capitalize">
                        {contract.cargoType} • {contract.amount.toLocaleString()} 単位
                      </p>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-sm text-slate-600 mb-1">
                        <span>進捗</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    {voyage && voyage.events.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm">
                        <span className="text-yellow-800">
                          {voyage.events[voyage.events.length - 1].message}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="bg-white rounded-lg p-4 shadow-lg border border-slate-200 rotate-3">
              ドラッグ中...
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {showPurchaseModal && (
        <ShipPurchaseModal onClose={() => setShowPurchaseModal(false)} />
      )}
    </div>
  );
};