// What the player is playing for. Every scenario ends in bankruptcy if the
// company runs out of cash for too long.

export interface Scenario {
  id: string;
  title: string;
  description: string;
  // The game ends after this many years; none means play forever.
  years?: number;
  // Company value to reach to win.
  goalValue?: number;
  // Win at the deadline by growing company value by this multiple instead.
  goalGrowth?: number;
  // Freight market at the start (1 = normal), and the share of today's
  // fleet already on order.
  market?: { level: number; orderbook: number };
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'tycoon',
    title: '海運王への道',
    description: '10年以内に企業価値2億ドルを目指す。景気の波を読み、安く買って高く使う。',
    years: 10,
    goalValue: 200_000_000,
  },
  {
    id: 'slump',
    title: '大不況を生き抜け',
    description: '運賃が平年の半分まで落ち込んだ市場から始まる。3年後に企業価値を開始時の1.25倍にすれば勝ち。',
    years: 3,
    goalGrowth: 1.25,
    market: { level: 0.5, orderbook: 0.08 },
  },
  {
    id: 'boom',
    title: 'バブルの波に乗れ',
    description: '運賃が平年の2.5倍の好況から始まるが、造船所には船の注文が山積み。5年で企業価値1億ドルへ。',
    years: 5,
    goalValue: 100_000_000,
    market: { level: 2.5, orderbook: 0.45 },
  },
  {
    id: 'free',
    title: 'フリープレイ',
    description: '期限も目標もなし。倒産しない限り、好きなだけ船会社を経営できる。',
  },
];

// Days the company may stay in the red before it goes bankrupt.
export const BANKRUPTCY_GRACE_DAYS = 30;

// The company value a scenario asks for, if any.
export const scenarioTarget = (scenario: Scenario | undefined, startValue: number) =>
  scenario?.goalValue ?? (scenario?.goalGrowth ? Math.round(startValue * scenario.goalGrowth) : undefined);
