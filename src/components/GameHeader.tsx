import React from 'react';
import { Anchor, Play, Pause, FastForward, Calendar, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { BANKRUPTCY_GRACE_DAYS, SCENARIOS, scenarioTarget } from '../constants/scenarios';

export const GameHeader: React.FC = () => {
  const { 
    simulationDay, 
    gameSpeed, 
    cash, 
    companyName,
    founderName,
    setGameSpeed, 
    formatCurrency,
    globalEvents,
    getCompanyValue,
    scenarioId,
    startValue,
    cashNegativeSince,
  } = useGameStore();
  const companyValue = getCompanyValue();
  const scenario = SCENARIOS.find(s => s.id === scenarioId);
  const target = scenarioTarget(scenario, startValue);
  const daysLeft = scenario?.years ? Math.max(0, scenario.years * 365 - simulationDay) : undefined;
  const graceLeft = cashNegativeSince !== undefined ? BANKRUPTCY_GRACE_DAYS - (simulationDay - cashNegativeSince) : undefined;

  const speedOptions = [
    { value: 0 as const, label: '一時停止', icon: Pause },
    { value: 1 as const, label: '1倍速', icon: Play },
    { value: 2 as const, label: '2倍速', icon: FastForward },
    { value: 5 as const, label: '5倍速', icon: FastForward },
  ];

  const gameDate = new Date(2025, 0, 1 + simulationDay);

  return (
    <header className="bg-gradient-to-r from-slate-900 to-blue-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <Anchor className="text-blue-400" size={32} />
            <div>
              <h1 className="text-2xl font-bold">
                {companyName || 'Maritime Tycoon'}
              </h1>
              <p className="text-blue-200 text-sm">
                {founderName ? `CEO: ${founderName}` : '海運経営シミュレーション'}
              </p>
            </div>
          </div>

          {/* Game Status */}
          <div className="flex items-center gap-8">
            {/* Cash */}
            <div className="flex items-center gap-2">
              <DollarSign className="text-green-400" size={20} />
              <div>
                <div className="text-sm text-slate-300">資金</div>
                <div className={`text-lg font-bold ${cash < 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {formatCurrency(cash)}
                </div>
              </div>
            </div>

            {/* Company value against the scenario goal */}
            <div className="flex items-center gap-2" title="現金＋船の時価＋造船所への支払済み額−借入残高">
              <TrendingUp className="text-amber-400" size={20} />
              <div>
                <div className="text-sm text-slate-300">
                  企業価値{target ? ` / 目標 ${formatCurrency(target)}` : ''}
                </div>
                <div className="text-lg font-bold text-amber-300">{formatCurrency(companyValue)}</div>
                {target && (
                  <div className="w-full h-1 bg-slate-700 rounded mt-1">
                    <div
                      className="h-1 bg-amber-400 rounded"
                      style={{ width: `${Math.min(100, Math.max(0, (companyValue / target) * 100))}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Game Date */}
            <div className="flex items-center gap-2">
              <Calendar className="text-blue-400" size={20} />
              <div>
                <div className="text-sm text-slate-300">ゲーム内日付</div>
                <div className="text-lg font-bold">
                  {gameDate.toLocaleDateString('ja-JP')}
                </div>
                {daysLeft !== undefined && (
                  <div className="text-xs text-slate-300">
                    期限まで{daysLeft >= 365 ? `${(daysLeft / 365).toFixed(1)}年` : `${daysLeft}日`}
                  </div>
                )}
              </div>
            </div>

            {/* Speed Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-300">速度:</span>
              {speedOptions.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setGameSpeed(option.value)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      gameSpeed === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <Icon size={14} />
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-slate-400 ml-2">
              1日 = {gameSpeed === 0 ? '停止' : `${3/gameSpeed}秒`}
            </div>
          </div>
        </div>

        {graceLeft !== undefined && (
          <div className="mt-4 flex items-center gap-2 bg-red-600 bg-opacity-30 border border-red-400 rounded-lg px-3 py-2 text-sm">
            <AlertTriangle size={16} className="text-red-300" />
            <span>
              資金がマイナスです。あと{Math.max(0, graceLeft)}日のうちにプラスに戻さないと倒産します。船を売る・貸し出すなどで現金を作りましょう。
            </span>
          </div>
        )}

        {/* Global Events */}
        {globalEvents.length > 0 && (
          <div className="mt-4 flex gap-2">
            {globalEvents.map(event => (
              <div
                key={event.id}
                className="bg-yellow-600 bg-opacity-20 border border-yellow-500 rounded-lg px-3 py-1 text-sm"
              >
                <span className="font-medium">🌍 {event.message}</span>
                <span className="ml-2 text-yellow-200">
                  残り{event.duration - (simulationDay - event.day)}日
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};