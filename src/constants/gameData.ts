import { Port, ShipSpec, CostFactors, CargoType } from '../types/game';

export const INITIAL_CASH = 15_000_000; // 15M USD - More realistic startup capital
export const SIMULATION_TICK_MS = 3000; // 3 seconds = 1 game day at 1x speed (slower pace)
export const DAYS_PER_MONTH = 30;
export const DAYS_PER_YEAR = 365;

export const COST_FACTORS: CostFactors = {
  fuel: {
    VLSFO: 650, // USD per tonne
    HFO: 470,   // USD per tonne
  },
  portMultipliers: {
    Large: 1.0,
    Medium: 0.7,
    Small: 0.4,
  },
  cargoRates: {
    Container: 12,  // USD per TEU
    Car: 15,        // USD per CEU
    Bulk: 8,        // USD per tonne
    Oil: 6,         // USD per tonne
    Passenger: 25,  // USD per PAX
  },
  maintenanceRate: 0.005, // 0.5% of build cost per year
  insuranceRate: 0.008,   // 0.8% of build cost per year
};

export const CREW_COSTS = {
  captain: 300,    // USD per day
  engineer: 200,   // USD per day
  sailor: 150,     // USD per day
};

export const MAINTENANCE_INTERVALS = {
  minor: 90,       // days
  major: 365,      // days
  drydock: 1825,   // days (5 years)
};

export const SAMPLE_PORTS: Port[] = [
  {
    LOCODE: 'JPTYO',
    name: 'Tokyo',
    country: 'JP',
    continent: 'Asia',
    lat: 35.63,
    lon: 139.81,
    size: 'Large',
    supportedCargo: ['Container', 'Car'],
    dock: 5,
    fees: {
      port: 8000,
      cargo: {
        Container: 12,
        Car: 15,
        Bulk: 8,
        Oil: 6,
        Passenger: 25,
      },
    },
    congestion: 75,
    facilities: {
      cranes: 12,
      storage: 50000,
      fuel: true,
      repair: true,
    },
    weatherRisk: 20,
  },
  {
    LOCODE: 'CNSHA',
    name: 'Shanghai',
    country: 'CN',
    continent: 'Asia',
    lat: 31.23,
    lon: 121.47,
    size: 'Large',
    supportedCargo: ['Container', 'Bulk'],
    dock: 8,
    fees: {
      port: 6000,
      cargo: {
        Container: 10,
        Car: 12,
        Bulk: 6,
        Oil: 5,
        Passenger: 20,
      },
    },
    congestion: 85,
    facilities: {
      cranes: 20,
      storage: 80000,
      fuel: true,
      repair: true,
    },
    weatherRisk: 15,
  },
  {
    LOCODE: 'SGSIN',
    name: 'Singapore',
    country: 'SG',
    continent: 'Asia',
    lat: 1.35,
    lon: 103.82,
    size: 'Large',
    supportedCargo: ['Container', 'Oil'],
    dock: 6,
    fees: {
      port: 7000,
      cargo: {
        Container: 11,
        Car: 14,
        Bulk: 7,
        Oil: 5,
        Passenger: 22,
      },
    },
    congestion: 60,
    facilities: {
      cranes: 15,
      storage: 60000,
      fuel: true,
      repair: true,
    },
    weatherRisk: 25,
  },
  {
    LOCODE: 'USNYC',
    name: 'New York',
    country: 'US',
    continent: 'North America',
    lat: 40.71,
    lon: -74.01,
    size: 'Large',
    supportedCargo: ['Container', 'Car'],
    dock: 4,
    fees: {
      port: 9000,
      cargo: {
        Container: 15,
        Car: 18,
        Bulk: 10,
        Oil: 8,
        Passenger: 30,
      },
    },
    congestion: 70,
    facilities: {
      cranes: 10,
      storage: 45000,
      fuel: true,
      repair: false,
    },
    weatherRisk: 30,
  },
  {
    LOCODE: 'USLAX',
    name: 'Los Angeles',
    country: 'US',
    continent: 'North America',
    lat: 34.05,
    lon: -118.24,
    size: 'Large',
    supportedCargo: ['Container', 'Car'],
    dock: 6,
    fees: {
      port: 8500,
      cargo: {
        Container: 14,
        Car: 17,
        Bulk: 9,
        Oil: 7,
        Passenger: 28,
      },
    },
    congestion: 65,
    facilities: {
      cranes: 14,
      storage: 55000,
      fuel: true,
      repair: true,
    },
    weatherRisk: 35,
  },
  {
    LOCODE: 'DEHAM',
    name: 'Hamburg',
    country: 'DE',
    continent: 'Europe',
    lat: 53.55,
    lon: 9.99,
    size: 'Large',
    supportedCargo: ['Container', 'Bulk'],
    dock: 5,
    fees: {
      port: 7500,
      cargo: {
        Container: 13,
        Car: 16,
        Bulk: 8,
        Oil: 6,
        Passenger: 25,
      },
    },
    congestion: 55,
    facilities: {
      cranes: 8,
      storage: 40000,
      fuel: true,
      repair: true,
    },
    weatherRisk: 40,
  },
];

export const SAMPLE_SHIP_SPECS: ShipSpec[] = [
  {
    id: 'ULCS-1',
    class: 'Container',
    subclass: 'Ultra Large',
    dwtOrGt: 200000,
    capacity: 20000, // TEU
    speedKt: 22,
    fuelBurn100nm: 45,
    buildCost: 180_000_000, // Increased cost
    reliability: 85,
    fuelEfficiency: 1.0,
  },
  {
    id: 'FEEDER-1',
    class: 'Container',
    subclass: 'Feeder',
    dwtOrGt: 15000,
    capacity: 1200, // TEU
    speedKt: 18,
    fuelBurn100nm: 12,
    buildCost: 35_000_000, // Increased cost
    reliability: 90,
    fuelEfficiency: 1.1,
  },
  {
    id: 'PCTC-1',
    class: 'PCTC',
    subclass: 'Large',
    dwtOrGt: 60000,
    capacity: 6000, // CEU
    speedKt: 20,
    fuelBurn100nm: 35,
    buildCost: 95_000_000, // Increased cost
    reliability: 88,
    fuelEfficiency: 1.05,
  },
  {
    id: 'VLCC-1',
    class: 'Tanker',
    subclass: 'VLCC',
    dwtOrGt: 300000,
    capacity: 300000, // tonnes
    speedKt: 16,
    fuelBurn100nm: 55,
    buildCost: 140_000_000, // Increased cost
    reliability: 82,
    fuelEfficiency: 0.95,
  },
  {
    id: 'BULK-1',
    class: 'Bulker',
    subclass: 'Capesize',
    dwtOrGt: 180000,
    capacity: 180000, // tonnes
    speedKt: 14,
    fuelBurn100nm: 40,
    buildCost: 75_000_000, // Increased cost
    reliability: 87,
    fuelEfficiency: 1.02,
  },
];

export const FREIGHT_RATES: Record<CargoType, number> = {
  Container: 1200, // USD per TEU
  Car: 800,        // USD per CEU
  Bulk: 25,        // USD per tonne
  Oil: 35,         // USD per tonne
  Passenger: 150,  // USD per PAX
};

export const EVENT_PROBABILITIES = {
  weather: 0.04,      // 4% per ship per day
  strike: 0.005,      // 0.5% per port per day
  piracy: 0.002,      // 0.2% per ship in risk zones
  fuel_surge: 0.001,  // 0.1% global per day
  demand_surge: 0.002, // 0.2% per cargo type per day
};

export const DIFFICULTY_MULTIPLIERS = {
  Easy: { probability: 0.5, effect: 0.5 },
  Normal: { probability: 1.0, effect: 1.0 },
  Hard: { probability: 2.0, effect: 1.5 },
};

export const SEASONAL_DEMAND_MULTIPLIERS = {
  spring: { Container: 1.1, Car: 1.2, Bulk: 1.0, Oil: 0.9, Passenger: 1.3 },
  summer: { Container: 1.2, Car: 1.0, Bulk: 1.1, Oil: 1.0, Passenger: 1.5 },
  autumn: { Container: 1.3, Car: 1.1, Bulk: 1.2, Oil: 1.1, Passenger: 1.0 },
  winter: { Container: 1.0, Car: 0.9, Bulk: 0.9, Oil: 1.2, Passenger: 0.8 },
};

export const ACHIEVEMENTS_DATA = [
  {
    id: 'first_voyage',
    type: 'first_voyage' as const,
    title: '処女航海',
    description: '初めての航海を完了する',
    requirement: 1,
    reward: { cash: 100000, reputation: 5 },
  },
  {
    id: 'profit_1m',
    type: 'profit_milestone' as const,
    title: '百万長者',
    description: '累計利益100万ドルを達成',
    requirement: 1000000,
    reward: { cash: 500000, reputation: 10 },
  },
  {
    id: 'fleet_5',
    type: 'fleet_size' as const,
    title: '小艦隊',
    description: '5隻の船舶を保有',
    requirement: 5,
    reward: { cash: 1000000, reputation: 15 },
  },
  {
    id: 'route_master',
    type: 'route_master' as const,
    title: '航路の達人',
    description: '100回の航海を完了',
    requirement: 100,
    reward: { cash: 2000000, reputation: 20 },
  },
];

export const NPC_COMPANY_NAMES = [
  { name: 'Pacific Maritime Corp', founder: 'John Anderson', color: '#EF4444' },
  { name: 'Global Shipping Lines', founder: 'Maria Rodriguez', color: '#10B981' },
  { name: 'Ocean Express Ltd', founder: 'Chen Wei', color: '#8B5CF6' },
  { name: 'Atlantic Cargo Co', founder: 'Ahmed Hassan', color: '#F59E0B' },
  { name: 'Nordic Shipping AS', founder: 'Lars Eriksson', color: '#06B6D4' },
  { name: 'Mediterranean Lines', founder: 'Giuseppe Romano', color: '#EC4899' },
  { name: 'Asia Pacific Fleet', founder: 'Hiroshi Tanaka', color: '#84CC16' },
  { name: 'European Maritime', founder: 'Klaus Mueller', color: '#6366F1' },
];

export const NPC_STRATEGIES = {
  aggressive: {
    contractSelectivity: 0.3, // accepts 30% of available contracts
    profitMarginThreshold: 5, // accepts low-margin contracts
    expansionRate: 0.8, // high ship purchase rate
    riskTolerance: 0.9,
  },
  conservative: {
    contractSelectivity: 0.1, // accepts 10% of available contracts
    profitMarginThreshold: 25, // only high-margin contracts
    expansionRate: 0.2, // low ship purchase rate
    riskTolerance: 0.3,
  },
  balanced: {
    contractSelectivity: 0.2, // accepts 20% of available contracts
    profitMarginThreshold: 15, // moderate profit margins
    expansionRate: 0.5, // moderate expansion
    riskTolerance: 0.6,
  },
  opportunistic: {
    contractSelectivity: 0.4, // accepts 40% of available contracts
    profitMarginThreshold: 10, // flexible on margins
    expansionRate: 0.6, // adapts to market conditions
    riskTolerance: 0.7,
  },
};

// Distance calculation helper (simplified great circle)
export const calculateDistance = (port1: Port, port2: Port): number => {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = (port2.lat - port1.lat) * Math.PI / 180;
  const dLon = (port2.lon - port1.lon) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(port1.lat * Math.PI / 180) * Math.cos(port2.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};