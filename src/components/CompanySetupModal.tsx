import React, { useState } from 'react';
import { Building2, User, DollarSign, Anchor } from 'lucide-react';

interface CompanySetupModalProps {
  onComplete: (companyName: string, founderName: string, difficulty: 'Easy' | 'Normal' | 'Hard') => void;
}

export const CompanySetupModal: React.FC<CompanySetupModalProps> = ({ onComplete }) => {
  const [companyName, setCompanyName] = useState('');
  const [founderName, setFounderName] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Normal' | 'Hard'>('Normal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (companyName.trim() && founderName.trim()) {
      onComplete(companyName.trim(), founderName.trim(), difficulty);
    }
  };

  const difficultySettings = {
    Easy: {
      cash: 25_000_000,
      description: '初心者向け - 豊富な資金でスタート',
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
    },
    Normal: {
      cash: 15_000_000,
      description: '標準 - バランスの取れた挑戦',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
    },
    Hard: {
      cash: 8_000_000,
      description: '上級者向け - 厳しい資金制約',
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
    },
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Anchor className="text-blue-600" size={48} />
            <h1 className="text-3xl font-bold text-slate-800">Maritime Tycoon</h1>
          </div>
          <p className="text-slate-600">海運会社を設立して、世界の海を制覇しましょう！</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Building2 size={16} className="inline mr-2" />
              会社名
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="例: Ocean Express Lines"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              required
            />
          </div>

          {/* Founder Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <User size={16} className="inline mr-2" />
              創業者名
            </label>
            <input
              type="text"
              value={founderName}
              onChange={(e) => setFounderName(e.target.value)}
              placeholder="例: 田中 太郎"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              required
            />
          </div>

          {/* Difficulty Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              <DollarSign size={16} className="inline mr-2" />
              難易度選択
            </label>
            <div className="space-y-3">
              {(Object.keys(difficultySettings) as Array<keyof typeof difficultySettings>).map((level) => {
                const setting = difficultySettings[level];
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      difficulty === level
                        ? `${setting.bgColor} border-current`
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-bold text-lg ${difficulty === level ? setting.color : 'text-slate-800'}`}>
                        {level === 'Easy' ? 'イージー' : level === 'Normal' ? 'ノーマル' : 'ハード'}
                      </span>
                      <span className={`font-bold text-xl ${difficulty === level ? setting.color : 'text-slate-600'}`}>
                        ${(setting.cash / 1_000_000).toFixed(0)}M
                      </span>
                    </div>
                    <p className={`text-sm ${difficulty === level ? setting.color : 'text-slate-600'}`}>
                      {setting.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!companyName.trim() || !founderName.trim()}
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-medium text-lg"
          >
            海運会社を設立する
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          <p>🚢 世界の海で成功を掴みましょう！</p>
        </div>
      </div>
    </div>
  );
};