import React, { useEffect, useState } from 'react';
import { GameHeader } from './components/GameHeader';
import { KanbanBoard } from './components/KanbanBoard';
import { Dashboard } from './components/Dashboard';
import { GlobalEventsPanel } from './components/GlobalEventsPanel';
import { AchievementsPanel } from './components/AchievementsPanel';
import { FinancialPanel } from './components/FinancialPanel';
import { CompanySetupModal } from './components/CompanySetupModal';
import { RankingPanel } from './components/RankingPanel';
import { MarketNewsPanel } from './components/MarketNewsPanel';
import { useGameStore } from './store/gameStore';
import { useGameTick } from './hooks/useGameTick';
import { BarChart3, Kanban } from 'lucide-react';
import { Globe, Trophy, DollarSign, Users, Newspaper } from 'lucide-react';

type ActiveTab = 'kanban' | 'dashboard' | 'events' | 'achievements' | 'finance' | 'ranking' | 'news';

function App() {
  const { initializeGame } = useGameStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('kanban');
  const [showSetup, setShowSetup] = useState(true);
  
  useGameTick();

  const handleCompanySetup = (companyName: string, founderName: string, difficulty: 'Easy' | 'Normal' | 'Hard') => {
    initializeGame(companyName, founderName, difficulty);
    setShowSetup(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const { setGameSpeed } = useGameStore.getState();
      
      switch (e.key) {
        case '1':
          setGameSpeed(1);
          break;
        case '2':
          setGameSpeed(2);
          break;
        case '3':
          setGameSpeed(5);
          break;
        case '0':
          setGameSpeed(0);
          break;
        case 'k':
          setActiveTab('kanban');
          break;
        case 'd':
          setActiveTab('dashboard');
          break;
        case 'e':
          setActiveTab('events');
          break;
        case 'a':
          setActiveTab('achievements');
          break;
        case 'f':
          setActiveTab('finance');
          break;
        case 'r':
          setActiveTab('ranking');
          break;
        case 'n':
          setActiveTab('news');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (showSetup) {
    return <CompanySetupModal onComplete={handleCompanySetup} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50">
      <GameHeader />
      
      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'kanban'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Kanban size={16} />
              運航管理 (K)
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <BarChart3 size={16} />
              ダッシュボード (D)
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'events'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Globe size={16} />
              世界情勢 (E)
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'achievements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Trophy size={16} />
              実績 (A)
            </button>
            <button
              onClick={() => setActiveTab('finance')}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'finance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <DollarSign size={16} />
              財務 (F)
            </button>
            <button
              onClick={() => setActiveTab('ranking')}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'ranking'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Users size={16} />
              ランキング (R)
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'news'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Newspaper size={16} />
              ニュース (N)
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {activeTab === 'kanban' && <KanbanBoard />}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'events' && (
          <div className="p-6">
            <GlobalEventsPanel />
          </div>
        )}
        {activeTab === 'achievements' && (
          <div className="p-6">
            <AchievementsPanel />
          </div>
        )}
        {activeTab === 'finance' && (
          <div className="p-6">
            <FinancialPanel />
          </div>
        )}
        {activeTab === 'ranking' && (
          <div className="p-6">
            <RankingPanel />
          </div>
        )}
        {activeTab === 'news' && (
          <div className="p-6">
            <MarketNewsPanel />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-6 mt-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-400">
            Maritime Tycoon v4.0 | キーボードショートカット: 1-3(速度), 0(停止), K(運航管理), D(ダッシュボード), E(世界情勢), A(実績), F(財務), R(ランキング), N(ニュース)
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;