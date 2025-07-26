import React, { useState } from 'react';
import { X, Ship, MapPin, Clock, DollarSign } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

interface RoutePlannerModalProps {
  contractId: string;
  onClose: () => void;
}

export const RoutePlannerModal: React.FC<RoutePlannerModalProps> = ({ contractId, onClose }) => {
  const { contracts, vessels, ports, acceptContract, calculateDistance, formatCurrency } = useGameStore();
  const [selectedVessel, setSelectedVessel] = useState<string>('');

  const contract = contracts.find(c => c.id === contractId);
  const availableVessels = vessels.filter(v => v.status === 'idle');

  if (!contract) return null;

  const fromPort = ports.find(p => p.id === contract.fromPort);
  const toPort = ports.find(p => p.id === contract.toPort);
  const distance = calculateDistance(contract.fromPort, contract.toPort);
  
  const selectedVesselData = vessels.find(v => v.id === selectedVessel);
  const estimatedDays = selectedVesselData ? distance / selectedVesselData.speedKn / 24 : 0;
  const fuelCost = selectedVesselData ? selectedVesselData.fuelConsumption * 50 * estimatedDays : 0;
  const revenue = contract.quantity * contract.ratePerUnit;
  const profit = revenue - fuelCost;

  const handleAccept = () => {
    if (selectedVessel) {
      acceptContract(contractId, selectedVessel);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Route Planner</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Route Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="text-blue-600" size={20} />
              <h3 className="font-bold text-blue-800">Route Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">From:</span>
                <div className="font-medium">{fromPort?.name} ({fromPort?.code})</div>
              </div>
              <div>
                <span className="text-slate-600">To:</span>
                <div className="font-medium">{toPort?.name} ({toPort?.code})</div>
              </div>
              <div>
                <span className="text-slate-600">Distance:</span>
                <div className="font-medium">{distance.toFixed(0)} nm</div>
              </div>
              <div>
                <span className="text-slate-600">Cargo:</span>
                <div className="font-medium capitalize">{contract.cargoType} ({contract.quantity} units)</div>
              </div>
            </div>
          </div>

          {/* Vessel Selection */}
          <div>
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Ship className="text-slate-600" size={20} />
              Select Vessel
            </h3>
            
            {availableVessels.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Ship size={48} className="mx-auto mb-4 opacity-50" />
                <p>No vessels available. All ships are currently sailing.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableVessels.map(vessel => (
                  <div
                    key={vessel.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedVessel === vessel.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setSelectedVessel(vessel.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-slate-800">{vessel.name}</h4>
                        <p className="text-sm text-slate-600 capitalize">
                          {vessel.type} • {vessel.capacity}t • {vessel.speedKn} knots
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <div>Fuel: {vessel.fuelConsumption}/day</div>
                        <div>Rep: {vessel.reputation}/100</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Financial Summary */}
          {selectedVessel && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="text-green-600" size={20} />
                <h3 className="font-bold text-green-800">Financial Summary</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Estimated Duration:</span>
                  <div className="font-medium">{estimatedDays.toFixed(1)} days</div>
                </div>
                <div>
                  <span className="text-slate-600">Revenue:</span>
                  <div className="font-medium text-green-600">{formatCurrency(revenue)}</div>
                </div>
                <div>
                  <span className="text-slate-600">Fuel Cost:</span>
                  <div className="font-medium text-red-600">-{formatCurrency(fuelCost)}</div>
                </div>
                <div>
                  <span className="text-slate-600">Estimated Profit:</span>
                  <div className={`font-bold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(profit)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAccept}
              disabled={!selectedVessel}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              Start Voyage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};