import React from 'react';
import { Trophy, TrendingUp, TrendingDown, Crown, Medal, Award, Building2, Ship, DollarSign } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export const RankingPanel: React.FC = () => {
  const { rankings, npcCompanies, formatCurrency, companyName } = useGameStore();

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="text-yellow-500" size={24} />;
      case 2: return <Medal className="text-gray-400" size={24} />;
      case 3: return <Award className="text-amber-600" size={24} />;
      default: return <Trophy className="text-slate-400" size={20} />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300';
      case 2: return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300';
      case 3: return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300';
      default: return 'bg-white border-slate-200';
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="text-green-600" size={16} />;
    if (change < 0) return <TrendingDown className="text-red-600" size={16} />;
    return <span className="text-slate-400">—</span>;
  };

  const getCompanyColor = (companyId: string) => {
    if (companyId === 'player') return '#3B82F6';
    const npc = npcCompanies.find(n => n.id === companyId);
    return npc?.color || '#64748B';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="text-yellow-600" size={24} />
        <h2 className="text-2xl font-bold text-slate-800">業界ランキング</h2>
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
          {rankings.length} 社
        </span>
      </div>

      {rankings.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Trophy size={48} className="mx-auto mb-4 opacity-50" />
          <p>ランキングデータを準備中...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rankings.map((entry, index) => {
            const isPlayer = entry.companyId === 'player';
            const npc = npcCompanies.find(n => n.id === entry.companyId);
            
            return (
              <div
                key={entry.companyId}
                className={`rounded-lg p-4 border-2 transition-all hover:shadow-md ${
                  isPlayer 
                    ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 ring-2 ring-blue-200' 
                    : getRankColor(entry.rank)
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(entry.rank)}
                      <span className="text-2xl font-bold text-slate-800">
                        #{entry.rank}
                      </span>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-800">
                          {isPlayer ? (companyName || 'あなたの会社') : entry.companyName}
                        </h3>
                        {isPlayer && (
                          <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                            YOU
                          </span>
                        )}
                      </div>
                      {npc && (
                        <p className="text-sm text-slate-600">
                          CEO: {npc.founderName} • {npc.strategy} 戦略
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm text-slate-500">スコア</div>
                      <div className="text-lg font-bold text-slate-800">
                        {entry.score.toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {getChangeIcon(entry.change)}
                      {entry.change !== 0 && (
                        <span className={`text-sm font-medium ${
                          entry.change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {Math.abs(entry.change)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div className="bg-white bg-opacity-50 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <DollarSign size={14} className="text-green-600" />
                      <span className="text-slate-600">収益</span>
                    </div>
                    <div className="font-bold text-green-700">
                      {formatCurrency(entry.metrics.revenue)}
                    </div>
                  </div>
                  
                  <div className="bg-white bg-opacity-50 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <TrendingUp size={14} className="text-blue-600" />
                      <span className="text-slate-600">利益</span>
                    </div>
                    <div className={`font-bold ${
                      entry.metrics.profit >= 0 ? 'text-blue-700' : 'text-red-600'
                    }`}>
                      {formatCurrency(entry.metrics.profit)}
                    </div>
                  </div>
                  
                  <div className="bg-white bg-opacity-50 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Ship size={14} className="text-purple-600" />
                      <span className="text-slate-600">船舶数</span>
                    </div>
                    <div className="font-bold text-purple-700">
                      {entry.metrics.fleetSize} 隻
                    </div>
                  </div>
                  
                  <div className="bg-white bg-opacity-50 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Award size={14} className="text-orange-600" />
                      <span className="text-slate-600">評判</span>
                    </div>
                    <div className="font-bold text-orange-700">
                      {entry.metrics.reputation.toFixed(0)}/100
                    </div>
                  </div>
                  
                  <div className="bg-white bg-opacity-50 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Building2 size={14} className="text-indigo-600" />
                      <span className="text-slate-600">シェア</span>
                    </div>
                    <div className="font-bold text-indigo-700">
                      {entry.metrics.marketShare.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Company color indicator */}
                <div className="mt-3 flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: getCompanyColor(entry.companyId) }}
                  />
                  <span className="text-xs text-slate-500">
                    {isPlayer ? 'あなたの会社' : `${npc?.strategy} 戦略`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Market Summary */}
      <div className="mt-6 pt-6 border-t border-slate-200">
        <h3 className="font-bold text-slate-800 mb-3">市場概況</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {rankings.length}
            </div>
            <div className="text-slate-600">参加企業</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(rankings.reduce((sum, r) => sum + r.metrics.revenue, 0))}
            </div>
            <div className="text-slate-600">総市場規模</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {rankings.reduce((sum, r) => sum + r.metrics.fleetSize, 0)}
            </div>
            <div className="text-slate-600">総船舶数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {rankings.length > 0 ? (rankings.reduce((sum, r) => sum + r.metrics.reputation, 0) / rankings.length).toFixed(0) : '0'}
            </div>
            <div className="text-slate-600">平均評判</div>
          </div>
        </div>
      </div>
    </div>
  );
};