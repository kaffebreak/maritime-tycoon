import React from 'react';
import { Trophy, Star, Gift, CheckCircle, Circle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export const AchievementsPanel: React.FC = () => {
  const { achievements, formatCurrency } = useGameStore();

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

  const getProgressPercentage = (achievement: any) => {
    return Math.min(100, (achievement.progress / achievement.requirement) * 100);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="text-yellow-600" size={24} />
        <h2 className="text-2xl font-bold text-slate-800">実績・称号</h2>
        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm font-medium">
          {unlockedAchievements.length}/{achievements.length}
        </span>
      </div>

      {/* Unlocked Achievements */}
      {unlockedAchievements.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <CheckCircle className="text-green-600" size={20} />
            獲得済み実績 ({unlockedAchievements.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unlockedAchievements.map(achievement => (
              <div key={achievement.id} className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className="text-yellow-600" size={20} />
                  <div>
                    <h4 className="font-bold text-yellow-800">{achievement.title}</h4>
                    <p className="text-sm text-yellow-700">{achievement.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-yellow-600 font-medium">
                    達成済み ✨
                  </span>
                  
                  {/* Rewards */}
                  <div className="flex gap-2">
                    {achievement.reward.cash && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        <Gift size={12} />
                        {formatCurrency(achievement.reward.cash)}
                      </span>
                    )}
                    {achievement.reward.reputation && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                        <Star size={12} />
                        +{achievement.reward.reputation}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Achievements */}
      <div>
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Circle className="text-slate-400" size={20} />
          未獲得実績 ({lockedAchievements.length})
        </h3>
        <div className="space-y-4">
          {lockedAchievements.map(achievement => {
            const progressPercentage = getProgressPercentage(achievement);
            
            return (
              <div key={achievement.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <Circle className="text-slate-400" size={20} />
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-800">{achievement.title}</h4>
                    <p className="text-sm text-slate-600">{achievement.description}</p>
                  </div>
                  
                  {/* Rewards Preview */}
                  <div className="flex gap-2">
                    {achievement.reward.cash && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
                        <Gift size={12} />
                        {formatCurrency(achievement.reward.cash)}
                      </span>
                    )}
                    {achievement.reward.reputation && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
                        <Star size={12} />
                        +{achievement.reward.reputation}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      進捗: {achievement.progress.toLocaleString()} / {achievement.requirement.toLocaleString()}
                    </span>
                    <span className="font-medium text-slate-700">
                      {progressPercentage.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};