import React, { useState } from 'react';
import { Building2, TrendingUp, Plus, Calendar } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { RoutePlannerModal } from './RoutePlannerModal';

export const PortPanel: React.FC = () => {
  const { contracts, ports, formatCurrency, generateContracts } = useGameStore();
  const [showRoutePlanner, setShowRoutePlanner] = useState(false);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);

  const availableContracts = contracts.filter(c => c.status === 'available');

  const getCargoIcon = (type: string) => {
    switch (type) {
      case 'container': return '📦';
      case 'tanker': return '🛢️';
      case 'bulk': return '⚫';
      case 'vehicle': return '🚗';
      default: return '📦';
    }
  };

  const getPortName = (portId: string) => {
    return ports.find(p => p.id === portId)?.name || portId;
  };

  const handleAcceptContract = (contractId: string) => {
    setSelectedContract(contractId);
    setShowRoutePlanner(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Building2 className="text-blue-600" size={24} />
          <h2 className="text-2xl font-bold text-slate-800">Port Contracts</h2>
        </div>
        <button
          onClick={generateContracts}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New Contracts
        </button>
      </div>

      <div className="space-y-4">
        {availableContracts.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Building2 size={48} className="mx-auto mb-4 opacity-50" />
            <p>No contracts available. Generate new ones!</p>
          </div>
        ) : (
          availableContracts.map(contract => {
            const revenue = contract.quantity * contract.ratePerUnit;
            
            return (
              <div key={contract.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getCargoIcon(contract.cargoType)}</span>
                    <div>
                      <h3 className="font-bold text-slate-800">
                        {getPortName(contract.fromPort)} → {getPortName(contract.toPort)}
                      </h3>
                      <p className="text-sm text-slate-600 capitalize">
                        {contract.cargoType} • {contract.quantity} units
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(revenue)}
                    </div>
                    <div className="text-sm text-slate-500">
                      {formatCurrency(contract.ratePerUnit)}/unit
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      <span>Due: {contract.deadline.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp size={16} />
                      <span>Rep: +{contract.reputation}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleAcceptContract(contract.id)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Accept Contract
                </button>
              </div>
            );
          })
        )}
      </div>

      {showRoutePlanner && selectedContract && (
        <RoutePlannerModal
          contractId={selectedContract}
          onClose={() => {
            setShowRoutePlanner(false);
            setSelectedContract(null);
          }}
        />
      )}
    </div>
  );
};