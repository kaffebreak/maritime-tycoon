import React from 'react';
import { TrendingUp, Ship, DollarSign, Award } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export const DashboardPanel: React.FC = () => {
  const { cash, reputation, activeVoyages, vessels, formatCurrency, toggleCurrency, currency } = useGameStore();

  const activeVessels = vessels.filter(v => v.status === 'sailing').length;
  const idleVessels = vessels.filter(v => v.status === 'idle').length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="text-blue-600" size={24} />
          Company Dashboard
        </h2>
        <button
          onClick={toggleCurrency}
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200 transition-colors"
        >
          {currency}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="text-green-600" size={20} />
            <span className="text-green-700 font-medium">Cash</span>
          </div>
          <div className="text-2xl font-bold text-green-800">
            {formatCurrency(cash)}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Award className="text-blue-600" size={20} />
            <span className="text-blue-700 font-medium">Reputation</span>
          </div>
          <div className="text-2xl font-bold text-blue-800">
            {reputation}/100
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Ship className="text-orange-600" size={20} />
            <span className="text-orange-700 font-medium">Active Voyages</span>
          </div>
          <div className="text-2xl font-bold text-orange-800">
            {activeVoyages.length}
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Ship className="text-slate-600" size={20} />
            <span className="text-slate-700 font-medium">Fleet Status</span>
          </div>
          <div className="text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Active: {activeVessels}</span>
              <span>Idle: {idleVessels}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};