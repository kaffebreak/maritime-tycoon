import { Port, ShipClass, ShipSpec } from '../types/game';
import { dailyOperatingCost, DAYS_PER_YEAR } from './gameData';
import { FreightMarket, SEGMENT_OF_CLASS } from './freightMarket';

// Ships are bought, sold and hired at prices that move with the freight
// market: secondhand values swing harder than newbuild prices, and time
// charter hire follows the freight index.

export const SHIP_LIFE_YEARS = 25;
// Steel is worth something even when the ship is worn out.
const SCRAP_SHARE = 0.08;
export const NEWBUILD_DAYS = 365;
export const NEWBUILD_DEPOSIT = 0.2;
export const CHARTER_PERIODS = [90, 180, 365];
// The shipyard where newbuilds are delivered.
export const SHIPYARD_PORT = 'CNSHA';

const indexFor = (market: FreightMarket, shipClass: ShipClass) => {
  const segment = SEGMENT_OF_CLASS[shipClass];
  return segment ? market.segments[segment].index : 1;
};

export const ageYears = (builtDay: number | undefined, day: number) => Math.max(0, (day - (builtDay ?? day)) / DAYS_PER_YEAR);

export const secondhandFactor = (market: FreightMarket, shipClass: ShipClass) =>
  Math.min(2.5, Math.max(0.4, 0.35 + 0.65 * indexFor(market, shipClass)));

// What a ship would fetch if sold today.
export const shipValue = (market: FreightMarket, spec: ShipSpec, builtDay: number | undefined, day: number) => {
  const remainingLife = Math.max(SCRAP_SHARE, 1 - ageYears(builtDay, day) / SHIP_LIFE_YEARS);
  return Math.round(spec.buildCost * secondhandFactor(market, spec.class) * remainingLife);
};

// Daily hire for a ship on time charter: in a normal market it covers the
// owner's running costs and a modest return on the ship.
export const charterHire = (market: FreightMarket, spec: ShipSpec) => {
  const normal = dailyOperatingCost(spec) + (spec.buildCost * 0.05) / DAYS_PER_YEAR;
  return Math.round((normal * indexFor(market, spec.class)) / 100) * 100;
};

export interface SecondhandOffer {
  id: string;
  specId: string;
  builtDay: number;
  port: string;
  price: number;
}

export interface CharterOffer {
  id: string;
  specId: string;
  builtDay: number;
  port: string;
  days: number;
  dailyHire: number;
}

export interface NewbuildOrder {
  id: string;
  specId: string;
  name: string;
  orderDay: number;
  deliveryDay: number;
  price: number;
  paid: number;
}

// Mostly bulkers and tankers change hands; boxships less often.
const OFFER_CLASS_WEIGHT: Record<ShipClass, number> = {
  Bulker: 4,
  Tanker: 3,
  Container: 2,
  PCTC: 1,
  Cruise: 0,
};

const pickSpec = (specs: ShipSpec[], random: () => number) => {
  const weighted = specs.flatMap(s => Array(OFFER_CLASS_WEIGHT[s.class]).fill(s) as ShipSpec[]);
  return weighted[Math.floor(random() * weighted.length)];
};

const pick = <T,>(items: T[], random: () => number) => items[Math.floor(random() * items.length)];

export const generateSecondhandOffers = (
  specs: ShipSpec[],
  ports: Port[],
  market: FreightMarket,
  day: number,
  newId: () => string,
  random: () => number = Math.random,
): SecondhandOffer[] =>
  Array.from({ length: 5 }, () => {
    const spec = pickSpec(specs, random);
    const builtDay = day - Math.round((3 + random() * 17) * DAYS_PER_YEAR);
    return {
      id: newId(),
      specId: spec.id,
      builtDay,
      port: pick(ports, random).LOCODE,
      price: Math.round(shipValue(market, spec, builtDay, day) * (0.92 + random() * 0.16)),
    };
  });

export const generateCharterOffers = (
  specs: ShipSpec[],
  ports: Port[],
  market: FreightMarket,
  day: number,
  newId: () => string,
  random: () => number = Math.random,
): CharterOffer[] =>
  Array.from({ length: 4 }, () => {
    const spec = pickSpec(specs, random);
    return {
      id: newId(),
      specId: spec.id,
      builtDay: day - Math.round((2 + random() * 15) * DAYS_PER_YEAR),
      port: pick(ports, random).LOCODE,
      days: pick(CHARTER_PERIODS, random),
      // Owners ask a little over the going rate to let a ship go.
      dailyHire: Math.round((charterHire(market, spec) * (1 + random() * 0.12)) / 100) * 100,
    };
  });
