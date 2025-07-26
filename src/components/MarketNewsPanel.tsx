import React from 'react';
import { Newspaper, TrendingUp, Building2, Ship, AlertTriangle, Handshake } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export const MarketNewsPanel: React.FC = () => {
  const { marketNews, npcCompanies, simulationDay } = useGameStore();

  const getNewsIcon = (type: string) => {
    switch (type) {
      case 'company_expansion': return <Building2 className="text-blue-600" size={20} />;
      case 'contract_win': return <TrendingUp className="text-green-600" size={20} />;
      case 'market_entry': return <Ship className="text-purple-600" size={20} />;
      case 'bankruptcy': return <AlertTriangle className="text-red-600" size={20} />;
      case 'merger': return <Handshake className="text-orange-600" size={20} />;
      default: return <Newspaper className="text-slate-600" size={20} />;
    }
  };

  const getNewsColor = (type: string, impact: string) => {
    if (impact === 'positive') return 'border-l-green-500 bg-green-50';
    if (impact === 'negative') return 'border-l-red-500 bg-red-50';
    return 'border-l-blue-500 bg-blue-50';
  };

  const getCompanyName = (companyId: string) => {
    if (companyId === 'player') return 'あなたの会社';
    const npc = npcCompanies.find(n => n.id === companyId);
    return npc?.name || '不明な会社';
  };

  const getTimeAgo = (day: number) => {
    const daysAgo = simulationDay - day;
    if (daysAgo === 0) return '今日';
    if (daysAgo === 1) return '昨日';
    return `${daysAgo}日前`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200">
      <div className="flex items-center gap-2 mb-6">
        <Newspaper className="text-blue-600" size={24} />
        <h2 className="text-2xl font-bold text-slate-800">市場ニュース</h2>
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
          {marketNews.length} 件
        </span>
      </div>

      {marketNews.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Newspaper size={48} className="mx-auto mb-4 opacity-50" />
          <p>まだニュースがありません</p>
          <p className="text-sm">市場活動が活発になるとニュースが表示されます</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {marketNews.map(news => (
            <div
              key={news.id}
              className={`border-l-4 rounded-lg p-4 ${getNewsColor(news.type, news.impact)}`}
            >
              <div className="flex items-start gap-3">
                {getNewsIcon(news.type)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-800">
                      {getCompanyName(news.companyId)}
                    </h4>
                    <span className="text-sm text-slate-500">
                      {getTimeAgo(news.day)}
                    </span>
                  </div>
                  <p className="text-slate-700">{news.message}</p>
                  
                  {/* News type badge */}
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      news.type === 'company_expansion' ? 'bg-blue-100 text-blue-700' :
                      news.type === 'contract_win' ? 'bg-green-100 text-green-700' :
                      news.type === 'market_entry' ? 'bg-purple-100 text-purple-700' :
                      news.type === 'bankruptcy' ? 'bg-red-100 text-red-700' :
                      news.type === 'merger' ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {news.type === 'company_expansion' && '🏢 事業拡大'}
                      {news.type === 'contract_win' && '📈 契約獲得'}
                      {news.type === 'market_entry' && '🚢 市場参入'}
                      {news.type === 'bankruptcy' && '⚠️ 経営危機'}
                      {news.type === 'merger' && '🤝 企業合併'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Market Activity Summary */}
      <div className="mt-6 pt-6 border-t border-slate-200">
        <h3 className="font-bold text-slate-800 mb-3">市場活動サマリー</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {marketNews.filter(n => n.type === 'company_expansion').length}
            </div>
            <div className="text-slate-600">事業拡大</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {marketNews.filter(n => n.type === 'contract_win').length}
            </div>
            <div className="text-slate-600">契約獲得</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">
              {marketNews.filter(n => n.type === 'market_entry').length}
            </div>
            <div className="text-slate-600">新規参入</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">
              {marketNews.filter(n => simulationDay - n.day <= 7).length}
            </div>
            <div className="text-slate-600">今週のニュース</div>
          </div>
        </div>
      </div>
    </div>
  );
};