import React from 'react';
import { Ship, Clock, MapPin, Anchor } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export const FleetPanel: React.FC = () => {
  const { vessels, activeVoyages, ports } = useGameStore();

  const getVesselTypeIcon = (type: string) => {
    switch (type) {
      case 'container': return '📦';
      case 'tanker': return '🛢️';
      case 'bulk': return '⚫';
      case 'vehicle': return '🚗';
      default: return '🚢';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sailing': return 'text-blue-600 bg-blue-100';
      case 'idle': return 'text-green-600 bg-green-100';
      case 'loading': return 'text-orange-600 bg-orange-100';
      case 'maintenance': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200">
      <div className="flex items-center gap-2 mb-6">
        <Ship className="text-blue-600" size={24} />
        <h2 className="text-2xl font-bold text-slate-800">Fleet Management</h2>
      </div>

      <div className="space-y-4">
        {vessels.map(vessel => {
          const voyage = activeVoyages.find(v => v.vesselId === vessel.id);
          const fromPort = voyage ? ports.find(p => p.id === voyage.fromPort) : null;
          const toPort = voyage ? ports.find(p => p.id === voyage.toPort) : null;
          
          return (
            <div key={vessel.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getVesselTypeIcon(vessel.type)}</span>
                  <div>
                    <h3 className="font-bold text-slate-800">{vessel.name}</h3>
                    <p className="text-sm text-slate-600 capitalize">{vessel.type} • {vessel.capacity}t</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vessel.status)}`}>
                  {vessel.status}
                </span>
              </div>

              {voyage && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin size={16} />
                    <span>{fromPort?.name} → {toPort?.name}</span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(voyage.currentProgress * 100, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      <span>ETA: {voyage.etaDays.toFixed(1)} days</span>
                    </div>
                    <span>{(voyage.currentProgress * 100).toFixed(1)}% complete</span>
                  </div>

                  {voyage.events.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                      <div className="text-sm text-yellow-800">
                        <strong>Latest Event:</strong> {voyage.events[voyage.events.length - 1].message}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {vessel.status === 'idle' && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Anchor size={16} />
                  <span>Ready for next voyage</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};