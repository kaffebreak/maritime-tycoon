import React from 'react';
import { Globe, TrendingUp, TrendingDown, AlertTriangle, Calendar } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export const GlobalEventsPanel: React.FC = () => {
  const { newGlobalEvents, marketConditions, simulationDay, formatCurrency } = useGameStore();

  const activeEvents = newGlobalEvents.filter(event => 
    simulationDay >= event.startDay && 
    simulationDay < event.startDay + event.duration
  );

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'economic_boom': return <TrendingUp className="text-green-600" size={20} />;
      case 'recession': return <TrendingDown className="text-red-600" size={20} />;
      case 'fuel_surge': return <AlertTriangle className="text-orange-600" size={20} />;
      case 'seasonal_demand': return <Calendar className="text-blue-600" size={20} />;
      case 'trade_war': return <AlertTriangle className="text-red-600" size={20} />;
      case 'pandemic': return <AlertTriangle className="text-purple-600" size={20} />;
      case 'canal_blockage': return <AlertTriangle className="text-orange-600" size={20} />;
      case 'environmental_regulation': return <Globe className="text-green-600" size={20} />;
      case 'tech_breakthrough': return <TrendingUp className="text-blue-600" size={20} />;
      case 'geopolitical_crisis': return <AlertTriangle className="text-red-600" size={20} />;
      default: return <Globe className="text-slate-600" size={20} />;
    }
  };

  const getSeasonIcon = (season: string) => {
    switch (season) {
      case 'spring': return '🌸';
      case 'summer': return '☀️';
      case 'autumn': return '🍂';
      case 'winter': return '❄️';
      default: return '🌍';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200">
      <div className="flex items-center gap-2 mb-6">
        <Globe className="text-blue-600" size={24} />
        <h2 className="text-2xl font-bold text-slate-800">世界情勢</h2>
      </div>

      {/* Market Conditions */}
      <div className="mb-6">
        <h3 className="font-bold text-slate-800 mb-3">市場状況</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{getSeasonIcon(marketConditions.season)}</span>
              <span className="font-medium text-blue-800">
                {marketConditions.season === 'spring' ? '春季' :
                 marketConditions.season === 'summer' ? '夏季' :
                 marketConditions.season === 'autumn' ? '秋季' : '冬季'}
              </span>
            </div>
            <div className="text-sm text-blue-600">
              季節による需要変動中
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⛽</span>
              <span className="font-medium text-orange-800">燃料価格</span>
            </div>
            <div className="text-sm text-orange-600">
              {marketConditions.fuelPrices.trend === 'rising' ? '📈 上昇中' :
               marketConditions.fuelPrices.trend === 'falling' ? '📉 下降中' : '➡️ 安定'}
            </div>
          </div>
        </div>
      </div>

      {/* Active Global Events */}
      <div>
        <h3 className="font-bold text-slate-800 mb-3">
          進行中のイベント ({activeEvents.length})
        </h3>
        
        {activeEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Globe size={48} className="mx-auto mb-4 opacity-50" />
            <p>現在、特別なイベントは発生していません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeEvents.map(event => {
              const remainingDays = event.startDay + event.duration - simulationDay;
              
              return (
                <div key={event.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    {getEventIcon(event.type)}
                    <div>
                      <h4 className="font-medium text-slate-800">{event.title}</h4>
                      <p className="text-sm text-slate-600">{event.description}</p>
                    </div>
                    <div className="ml-auto">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        event.severity === 'severe' ? 'bg-orange-100 text-orange-700' :
                        event.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {event.severity === 'critical' ? '🚨 重大' :
                         event.severity === 'severe' ? '⚠️ 深刻' :
                         event.severity === 'moderate' ? '📊 中程度' : '💡 軽微'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Risk Zone Display */}
                  {event.type === 'piracy_alert' && event.affectedRegions && (
                    <div className="mb-2 text-sm text-red-600">
                      <span className="font-medium">⚠️ 危険海域:</span> {event.affectedRegions.join(', ')}
                    </div>
                  )}
                  
                  {/* Cargo Type Display */}
                  {event.cargoType && (
                    <div className="mb-2 text-sm text-blue-600">
                      <span className="font-medium">📦 対象貨物:</span> {event.cargoType}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      残り {remainingDays} 日
                    </span>
                    
                    {/* Event Effects */}
                    <div className="flex gap-2">
                      {event.effects.fuelPriceMultiplier && (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          event.effects.fuelPriceMultiplier > 1 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          燃料 {event.effects.fuelPriceMultiplier > 1 ? '+' : ''}{((event.effects.fuelPriceMultiplier - 1) * 100).toFixed(0)}%
                        </span>
                      )}
                      
                      {event.effects.demandMultiplier && (
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                          需要変動
                        </span>
                      )}
                      
                      {event.effects.contractPriceMultiplier && (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          event.effects.contractPriceMultiplier > 1 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          運賃 {event.effects.contractPriceMultiplier > 1 ? '+' : ''}{((event.effects.contractPriceMultiplier - 1) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-slate-200 rounded-full h-1">
                      <div 
                        className={`h-1 rounded-full transition-all duration-1000 ${
                          event.severity === 'critical' ? 'bg-red-600' :
                          event.severity === 'severe' ? 'bg-orange-600' :
                          event.severity === 'moderate' ? 'bg-yellow-600' : 'bg-blue-600'
                        }`}
                        style={{ 
                          width: `${Math.max(0, (remainingDays / event.duration) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Affected Regions */}
                  {event.affectedRegions && event.affectedRegions.length > 0 && (
                    <div className="mt-2 text-xs text-slate-500">
                      影響地域: {event.affectedRegions.join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};