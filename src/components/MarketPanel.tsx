import React, { useMemo, useState } from 'react';
import { Fuel, TrendingDown, TrendingUp, Minus, LineChart } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import {
  BUILD_DAYS,
  MARKET_SEGMENTS,
  MarketSegment,
  orderbookShare,
  SEGMENT_LABEL,
} from '../constants/freightMarket';

// Fixed categorical order, one hue per segment.
const SEGMENT_COLOR: Record<MarketSegment, string> = {
  Bulk: '#2a78d6',
  Oil: '#eb6834',
  Container: '#1baf7a',
  Car: '#eda100',
};

const CLIMATE_LABEL = { recession: '不況', stable: '安定', growth: '成長', boom: '好況' } as const;

const describe = (index: number) =>
  index >= 2 ? '高騰' : index >= 1.3 ? '好調' : index >= 0.85 ? '平年並み' : index >= 0.55 ? '低迷' : '大不況';

const W = 720;
const H = 260;
const PAD = { left: 40, right: 96, top: 12, bottom: 28 };

const RateChart: React.FC = () => {
  const { freightMarket, simulationDay } = useGameStore();
  const [hover, setHover] = useState<number | null>(null);
  // Weekly samples plus today, so the line ends where the cards are.
  const history = useMemo(
    () => [
      ...freightMarket.history.filter(h => h.day < simulationDay),
      {
        day: simulationDay,
        index: Object.fromEntries(MARKET_SEGMENTS.map(s => [s, freightMarket.segments[s].index])) as Record<MarketSegment, number>,
      },
    ],
    [freightMarket, simulationDay],
  );

  const { x, y, ticks } = useMemo(() => {
    const first = history[0]?.day ?? simulationDay - 1;
    const last = Math.max(simulationDay, first + 1);
    const top = Math.max(2, ...history.flatMap(h => MARKET_SEGMENTS.map(s => h.index[s])));
    const yMax = Math.ceil(top * 2) / 2;
    const x = (day: number) => PAD.left + ((day - first) / (last - first)) * (W - PAD.left - PAD.right);
    const y = (v: number) => PAD.top + (1 - v / yMax) * (H - PAD.top - PAD.bottom);
    const ticks = Array.from({ length: Math.floor(yMax / 0.5) + 1 }, (_, i) => i * 0.5);
    return { x, y, ticks };
  }, [history, simulationDay]);

  if (history.length < 2) return null;

  const yearTicks: number[] = [];
  for (let d = simulationDay; d >= history[0].day; d -= 365) yearTicks.push(d);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    history.forEach((h, i) => {
      if (Math.abs(x(h.day) - px) < Math.abs(x(history[best].day) - px)) best = i;
    });
    setHover(best);
  };

  const latest = history[history.length - 1];
  // Spread end labels so they never overlap.
  const labelY = MARKET_SEGMENTS.map(s => ({ s, y: y(latest.index[s]) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < labelY.length; i++) labelY[i].y = Math.max(labelY[i].y, labelY[i - 1].y + 14);

  const hovered = hover !== null ? history[hover] : null;
  const agoLabel = (day: number) => {
    const years = (simulationDay - day) / 365;
    return years < 0.05 ? '今' : `${years.toFixed(years < 1 ? 1 : 0)}年前`;
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto select-none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="運賃指数の推移"
      >
        {ticks.map(t => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 1 ? '#94a3b8' : '#e2e8f0'} strokeDasharray={t === 1 ? '4 3' : undefined} />
            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill="#64748b">
              {Math.round(t * 100)}
            </text>
          </g>
        ))}
        <text x={PAD.left + 4} y={y(1) - 4} fontSize={9} fill="#64748b">平年=100</text>
        {yearTicks.map(d => (
          <text key={d} x={x(d)} y={H - 8} textAnchor="middle" fontSize={10} fill="#64748b">
            {agoLabel(d)}
          </text>
        ))}
        {MARKET_SEGMENTS.map(s => (
          <polyline
            key={s}
            fill="none"
            stroke={SEGMENT_COLOR[s]}
            strokeWidth={2}
            strokeLinejoin="round"
            points={history.map(h => `${x(h.day)},${y(h.index[s])}`).join(' ')}
          />
        ))}
        {labelY.map(({ s, y: ly }) => (
          <g key={s}>
            <circle cx={x(latest.day)} cy={y(latest.index[s])} r={4} fill={SEGMENT_COLOR[s]} stroke="#fff" strokeWidth={2} />
            <text x={W - PAD.right + 8} y={ly + 4} fontSize={11} fill="#334155">
              {SEGMENT_LABEL[s]} {Math.round(latest.index[s] * 100)}
            </text>
          </g>
        ))}
        {hovered && (
          <g pointerEvents="none">
            <line x1={x(hovered.day)} x2={x(hovered.day)} y1={PAD.top} y2={H - PAD.bottom} stroke="#94a3b8" />
            {MARKET_SEGMENTS.map(s => (
              <circle key={s} cx={x(hovered.day)} cy={y(hovered.index[s])} r={4} fill={SEGMENT_COLOR[s]} stroke="#fff" strokeWidth={2} />
            ))}
          </g>
        )}
        <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} fill="transparent" />
      </svg>
      {hovered && (
        <div
          className="absolute top-2 bg-white/95 border border-slate-200 rounded-md shadow px-3 py-2 text-xs pointer-events-none"
          style={{ left: `${Math.min(70, (x(hovered.day) / W) * 100)}%` }}
        >
          <div className="font-medium text-slate-700 mb-1">{agoLabel(hovered.day)}</div>
          {MARKET_SEGMENTS.map(s => (
            <div key={s} className="flex items-center gap-2 text-slate-700">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: SEGMENT_COLOR[s] }} />
              <span className="w-20">{SEGMENT_LABEL[s]}</span>
              <span className="font-medium tabular-nums">{Math.round(hovered.index[s] * 100)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-4 px-2 pt-1 text-xs text-slate-600">
        {MARKET_SEGMENTS.map(s => (
          <span key={s} className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5" style={{ background: SEGMENT_COLOR[s] }} />
            {SEGMENT_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  );
};

export const MarketPanel: React.FC = () => {
  const { freightMarket, marketConditions, formatCurrency } = useGameStore();
  const history = freightMarket.history;
  const quarterAgo = history[Math.max(0, history.length - 14)];
  const fuel = marketConditions.fuelPrices;
  const FuelTrend = fuel.trend === 'rising' ? TrendingUp : fuel.trend === 'falling' ? TrendingDown : Minus;

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow border border-slate-200 p-4">
          <div className="text-sm text-slate-500">世界経済</div>
          <div className="text-2xl font-bold text-slate-800">{CLIMATE_LABEL[marketConditions.economicClimate]}</div>
          <p className="text-xs text-slate-500 mt-1">景気は半年ごとに変わることがあります。好況では荷物が増え、運賃が上がります。</p>
        </div>
        <div className="bg-white rounded-lg shadow border border-slate-200 p-4">
          <div className="text-sm text-slate-500 flex items-center gap-1">
            <Fuel size={14} /> 燃料価格（VLSFO）
          </div>
          <div className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            {formatCurrency(fuel.VLSFO)}/t
            <FuelTrend size={18} className="text-slate-500" />
          </div>
          <p className="text-xs text-slate-500 mt-1">季節・国際情勢・事件で上下します。航海の燃料費はこの価格で計算されます。</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-slate-200 p-4">
        <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
          <LineChart size={18} className="text-blue-600" />
          運賃指数の推移（平年=100）
        </h2>
        <RateChart />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MARKET_SEGMENTS.map(s => {
          const seg = freightMarket.segments[s];
          const change = quarterAgo ? seg.index / quarterAgo.index[s] - 1 : 0;
          return (
            <div key={s} className="bg-white rounded-lg shadow border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: SEGMENT_COLOR[s] }} />
                {SEGMENT_LABEL[s]}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold text-slate-800 tabular-nums">{Math.round(seg.index * 100)}</span>
                <span className="text-sm text-slate-600">{describe(seg.index)}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                3か月前比 {change >= 0 ? '+' : ''}
                {Math.round(change * 100)}%
              </div>
              <div className="text-xs text-slate-500 mt-2">
                建造中の船：今の船腹の{Math.round(orderbookShare(seg) * 100)}%
                <br />
                （発注から約{Math.round(BUILD_DAYS / 365)}年で完成し、船が余れば運賃が下がります）
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500">
        契約の運賃は、契約が出された日の相場で決まります。運賃が高いうちに長期契約を取れば、相場が下がっても高い運賃のまま運べます。新造船の値段も相場につれて上下します。
      </p>
    </div>
  );
};
