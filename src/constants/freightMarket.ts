import { CargoType, ShipClass } from '../types/game';

// Freight markets follow the shipping cycle: when cargo outgrows the fleet,
// rates soar, owners order ships, the ships arrive a couple of years later
// and rates crash until old ships are scrapped. Each segment has its own
// fleet and orderbook, so they boom and bust at different times.

export type MarketSegment = 'Container' | 'Car' | 'Bulk' | 'Oil';
export const MARKET_SEGMENTS: MarketSegment[] = ['Bulk', 'Oil', 'Container', 'Car'];

export const SEGMENT_LABEL: Record<MarketSegment, string> = {
  Bulk: 'ドライバルク',
  Oil: 'タンカー',
  Container: 'コンテナ',
  Car: '自動車船',
};

export interface SegmentMarket {
  // Freight rate relative to normal (1 = normal).
  index: number;
  // Cargo to carry and ships to carry it, both relative to day 0.
  demand: number;
  supply: number;
  // Ships ordered by the whole industry, as a share of today's fleet.
  orderbook: { deliveryDay: number; amount: number }[];
}

export interface FreightMarket {
  segments: Record<MarketSegment, SegmentMarket>;
  // One sample a week, oldest first.
  history: { day: number; index: Record<MarketSegment, number> }[];
}

const DEMAND_GROWTH_PER_YEAR = 0.03;
// Rates react far more than volumes: a few % too few ships doubles them,
// while a surplus drags them down more slowly (owners lay ships up).
const ELASTICITY_SHORTAGE = 9;
const ELASTICITY_SURPLUS = 4;
const INDEX_MIN = 0.45;
const INDEX_MAX = 4;
// How quickly rates chase the supply/demand balance each day.
const ADJUST_PER_DAY = 0.04;
const NOISE_PER_DAY = 0.015;
export const BUILD_DAYS = 720;
const HISTORY_EVERY_DAYS = 7;
const HISTORY_MAX = 520;

export const SEGMENT_OF_CLASS: Partial<Record<ShipClass, MarketSegment>> = {
  Container: 'Container',
  PCTC: 'Car',
  Tanker: 'Oil',
  Bulker: 'Bulk',
};

export const segmentOfCargo = (cargo: CargoType): MarketSegment | null =>
  cargo === 'Passenger' ? null : cargo;

export const rateIndexFor = (market: FreightMarket, cargo: CargoType) => {
  const segment = segmentOfCargo(cargo);
  return segment ? market.segments[segment].index : 1;
};

// Newbuild prices follow freight rates, but less wildly.
export const shipPriceFactor = (market: FreightMarket, shipClass: ShipClass) => {
  const segment = SEGMENT_OF_CLASS[shipClass];
  if (!segment) return 1;
  return Math.min(1.6, Math.max(0.7, 0.7 + 0.3 * market.segments[segment].index));
};

export const shipPrice = (market: FreightMarket, spec: { buildCost: number; class: ShipClass }) =>
  Math.round(spec.buildCost * shipPriceFactor(market, spec.class));

export const orderbookShare = (segment: SegmentMarket) =>
  segment.orderbook.reduce((sum, order) => sum + order.amount, 0) / segment.supply;

const gaussian = (random: () => number) => {
  const u = 1 - random();
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const stepSegment = (
  segment: SegmentMarket,
  day: number,
  demandFactor: number,
  random: () => number,
): SegmentMarket => {
  const demand = segment.demand * (1 + DEMAND_GROWTH_PER_YEAR / 365);
  let supply = segment.supply;
  let orderbook = segment.orderbook;

  // Ships ordered two years ago join the fleet.
  const delivered = orderbook.filter(o => o.deliveryDay <= day);
  if (delivered.length > 0) {
    supply += delivered.reduce((sum, o) => sum + o.amount, 0);
    orderbook = orderbook.filter(o => o.deliveryDay > day);
  }

  // Once a month owners order ships when rates are good and scrap old ones
  // when rates are bad.
  if (day % 30 === 0) {
    const ordered = supply * (0.002 + Math.min(1, Math.max(0, segment.index - 0.95)) * 0.02);
    orderbook = [...orderbook, { deliveryDay: day + BUILD_DAYS, amount: ordered }];
    supply -= supply * (0.0015 + Math.max(0, 0.9 - segment.index) * 0.03);
  }

  const balance = (demand * demandFactor) / supply;
  const elasticity = balance > 1 ? ELASTICITY_SHORTAGE : ELASTICITY_SURPLUS;
  const target = Math.min(INDEX_MAX, Math.max(INDEX_MIN, Math.pow(balance, elasticity)));
  const index = Math.min(
    INDEX_MAX,
    Math.max(
      INDEX_MIN,
      segment.index + (target - segment.index) * ADJUST_PER_DAY + gaussian(random) * NOISE_PER_DAY * segment.index,
    ),
  );

  return { index, demand, supply, orderbook };
};

export const stepMarket = (
  market: FreightMarket,
  day: number,
  demandFactors: Record<MarketSegment, number>,
  random: () => number = Math.random,
): FreightMarket => {
  const segments = Object.fromEntries(
    MARKET_SEGMENTS.map(s => [s, stepSegment(market.segments[s], day, demandFactors[s], random)]),
  ) as Record<MarketSegment, SegmentMarket>;

  const history =
    day % HISTORY_EVERY_DAYS === 0
      ? [
          ...market.history,
          { day, index: Object.fromEntries(MARKET_SEGMENTS.map(s => [s, segments[s].index])) as Record<MarketSegment, number> },
        ].slice(-HISTORY_MAX)
      : market.history;

  return { segments, history };
};

// A market that has already been running for a few years, so each game
// starts at a different point in the cycle and the chart has a past.
export const createFreightMarket = (startDay: number, random: () => number = Math.random): FreightMarket => {
  const warmUpDays = 3 * 365;
  let market: FreightMarket = {
    segments: Object.fromEntries(
      MARKET_SEGMENTS.map(s => {
        const index = 0.6 + random() * 1.2;
        const supply = 1;
        return [
          s,
          {
            index,
            demand: Math.pow(index, 1 / (index > 1 ? ELASTICITY_SHORTAGE : ELASTICITY_SURPLUS)) * supply,
            supply,
            orderbook: Array.from({ length: BUILD_DAYS / 30 }, (_, i) => ({
              deliveryDay: startDay - warmUpDays + i * 30,
              amount: supply * 0.002 * random() * 2,
            })),
          },
        ];
      }),
    ) as Record<MarketSegment, SegmentMarket>,
    history: [],
  };
  // Past booms and slumps hit each segment differently.
  let demand = {} as Record<MarketSegment, number>;
  for (let day = startDay - warmUpDays; day < startDay; day++) {
    if ((day - startDay + warmUpDays) % 180 === 0) {
      demand = Object.fromEntries(MARKET_SEGMENTS.map(s => [s, 1 + gaussian(random) * 0.04])) as Record<MarketSegment, number>;
    }
    market = stepMarket(market, day, demand, random);
  }
  return market;
};
