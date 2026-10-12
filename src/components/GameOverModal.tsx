import React from 'react';
import { Trophy, Skull, Flag, Anchor } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { SCENARIOS, scenarioTarget } from '../constants/scenarios';

const RESULT = {
  won: { title: '目標達成！', icon: Trophy, color: 'text-amber-500' },
  lost: { title: '目標に届かず', icon: Flag, color: 'text-slate-500' },
  bankrupt: { title: '倒産', icon: Skull, color: 'text-red-600' },
  finished: { title: 'ゲーム終了', icon: Anchor, color: 'text-blue-600' },
};

// Company value over time as a small line chart.
const ValueChart: React.FC<{ points: { day: number; value: number }[]; goal?: number }> = ({ points, goal }) => {
  if (points.length < 2) return null;
  const w = 480;
  const h = 140;
  const maxDay = points[points.length - 1].day || 1;
  const values = points.map(p => p.value).concat(goal ? [goal] : []);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const x = (day: number) => (day / maxDay) * w;
  const y = (v: number) => h - ((v - min) / (max - min || 1)) * h;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-36 bg-slate-50 rounded-md">
      <line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke="#cbd5e1" />
      {goal && <line x1={0} x2={w} y1={y(goal)} y2={y(goal)} stroke="#f59e0b" strokeDasharray="4 4" />}
      <path d={line} fill="none" stroke="#2563eb" strokeWidth={2} />
    </svg>
  );
};

export const GameOverModal: React.FC<{ onNewGame: () => void }> = ({ onNewGame }) => {
  const { gameOver, scenarioId, startValue, valueHistory, completedContracts, totalRevenue, fleet, formatCurrency } =
    useGameStore();
  if (!gameOver) return null;

  const scenario = SCENARIOS.find(s => s.id === scenarioId);
  const { title, icon: Icon, color } = RESULT[gameOver.result];
  const years = (gameOver.day / 365).toFixed(1);
  const target = scenarioTarget(scenario, startValue);

  const reason = {
    won: scenario?.goalValue
      ? `${years}年で企業価値${formatCurrency(scenario.goalValue)}に到達しました。`
      : `${years}年を乗り切り、企業価値を${formatCurrency(target ?? 0)}まで伸ばしました。`,
    lost: scenario?.goalValue
      ? `期限の${scenario.years}年が来ました。目標の${formatCurrency(scenario.goalValue)}には届きませんでした。`
      : `${scenario?.years}年たちましたが、目標の${formatCurrency(target ?? 0)}（開始時の${scenario?.goalGrowth}倍）には届きませんでした。`,
    bankrupt: `資金がマイナスのまま30日が過ぎ、${years}年目で会社は倒産しました。`,
    finished: `${years}年の経営を終えました。`,
  }[gameOver.result];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-xl w-full">
        <div className="text-center mb-6">
          <Icon className={`mx-auto mb-2 ${color}`} size={56} />
          <h2 className="text-3xl font-bold text-slate-800">{title}</h2>
          <div className="text-sm text-slate-500 mt-1">{scenario?.title}</div>
          <p className="text-slate-600 mt-3">{reason}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="p-3 bg-slate-50 rounded-md">
            <div className="text-slate-500">最終企業価値</div>
            <div className="text-xl font-bold text-slate-800">{formatCurrency(gameOver.value)}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-md">
            <div className="text-slate-500">{target ? '目標' : '開始時の企業価値'}</div>
            <div className="text-xl font-bold text-slate-800">{formatCurrency(target ?? startValue)}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-md">
            <div className="text-slate-500">完了した航海</div>
            <div className="text-xl font-bold text-slate-800">{completedContracts}件</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-md">
            <div className="text-slate-500">累計運賃収入・船隊</div>
            <div className="text-xl font-bold text-slate-800">
              {formatCurrency(totalRevenue)}・{fleet.length}隻
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-xs text-slate-500 mb-1">企業価値の推移{target ? '（点線が目標）' : ''}</div>
          <ValueChart points={[...valueHistory, { day: gameOver.day, value: gameOver.value }]} goal={target} />
        </div>

        <button
          onClick={onNewGame}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          新しい会社を始める
        </button>
      </div>
    </div>
  );
};
