import React, { useEffect, useState } from 'react';
import { GameHeader } from './components/GameHeader';
import { KanbanBoard } from './components/KanbanBoard';
import { Dashboard } from './components/Dashboard';
import { useGameStore } from './store/gameStore';
import { useGameTick } from './hooks/useGameTick';
import { BarChart3, Kanban } from 'lucide-react';

type ActiveTab = 'kanban' | 'dashboard';

function App() {
  const { initializeGame } = useGameStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('kanban');
  
  useGameTick();

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

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
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {activeTab === 'kanban' && <KanbanBoard />}
        {activeTab === 'dashboard' && <Dashboard />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-6 mt-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-400">
            Maritime Tycoon v2.2 | キーボードショートカット: 1-3(速度), 0(停止), K(運航管理), D(ダッシュボード)
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;