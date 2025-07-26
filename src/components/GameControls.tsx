import React from 'react';
import { Play, Pause, FastForward, RotateCcw } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export const GameControls: React.FC = () => {
  const { gameSpeed, setGameSpeed, gameTime } = useGameStore();

  const speedOptions = [
    { value: 0, label: 'Pause', icon: Pause },
    { value: 1, label: '1x', icon: Play },
    { value: 3, label: '3x', icon: FastForward },
    { value: 5, label: '5x', icon: FastForward },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-800">Game Time</h3>
          <p className="text-sm text-slate-600">
            {gameTime.toLocaleDateString()} {gameTime.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {speedOptions.map(option => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setGameSpeed(option.value)}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  gameSpeed === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon size={14} />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};