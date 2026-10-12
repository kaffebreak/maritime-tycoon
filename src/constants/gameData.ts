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

// Everyone aboard a merchant ship of this size, whatever its type.
export const CREW_COMPLEMENT = { captain: 1, engineer: 4, sailor: 16 };
export const STORES_AND_ADMIN_PER_DAY = 1000; // USD: provisions, lube oil, management fee

// What a ship costs to keep each day, sailing or not: crew, upkeep,
// insurance and running the office.
export const dailyOperatingCost = (spec: { buildCost: number }) => {
  const crew =
    CREW_COMPLEMENT.captain * CREW_COSTS.captain +
    CREW_COMPLEMENT.engineer * CREW_COSTS.engineer +
    CREW_COMPLEMENT.sailor * CREW_COSTS.sailor;
  const upkeep = (spec.buildCost * (COST_FACTORS.maintenanceRate + COST_FACTORS.insuranceRate)) / DAYS_PER_YEAR;
  return crew + upkeep + STORES_AND_ADMIN_PER_DAY;
};

export const MAINTENANCE_INTERVALS = {
  minor: 90,       // days - routine maintenance
  major: 365,      // days - major overhaul
  drydock: 1825,   // days (5 years) - complete refit
  emergency: 0,    // immediate - breakdown repair
};

export const MAINTENANCE_COSTS = {
  minor: 0.002,    // 0.2% of build cost
  major: 0.015,    // 1.5% of build cost
  drydock: 0.08,   // 8% of build cost
  emergency: 0.025, // 2.5% of build cost (expensive!)
};

export const MAINTENANCE_DURATION = {
  minor: 3,        // 3 days
  major: 14,       // 2 weeks
  drydock: 45,     // 6-7 weeks
  emergency: 7,    // 1 week
};

export const MAINTENANCE_CONDITION_RESTORE = {
  minor: 15,       // +15 condition points
  major: 40,       // +40 condition points
  drydock: 100,    // restore to 100%
  emergency: 25,   // +25 condition points
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

// Risk zones for piracy and other maritime threats
export const RISK_ZONES = {
  'Gulf of Aden': {
    name: 'アデン湾・バブエルマンデブ海峡',
    coordinates: { lat: 12.5, lon: 43.5 },
    pirateRisk: 0.8, // High risk
    affectedPorts: ['SAJNA', 'DJJIB', 'YEHOD'], // Jeddah, Djibouti, Hodeidah
  },
  'Strait of Malacca': {
    name: 'マラッカ海峡',
    coordinates: { lat: 2.5, lon: 102.0 },
    pirateRisk: 0.4, // Medium risk
    affectedPorts: ['SGSIN', 'MYPKG', 'IDBLW'], // Singapore, Port Klang, Belawan
  },
  'Gulf of Guinea': {
    name: 'ギニア湾',
    coordinates: { lat: 0.0, lon: 5.0 },
    pirateRisk: 0.9, // Very high risk
    affectedPorts: ['NGLAG', 'GHLTE', 'CIABJ'], // Lagos, Tema, Abidjan
  },
};

// Difficulty modifiers for random events (6-4)
export const DIFFICULTY_EVENT_MODIFIERS = {
  Easy: { 
    probabilityMultiplier: 0.5,  // ×0.5 probability
    effectMultiplier: 0.5        // -50% effect
  },
  Normal: { 
    probabilityMultiplier: 1.0,  // ×1.0 probability  
    effectMultiplier: 1.0        // 100% effect
  },
  Hard: { 
    probabilityMultiplier: 2.0,  // ×2.0 probability
    effectMultiplier: 1.5        // +50% effect
  },
};

// Detailed random events based on specification
export const RANDOM_EVENTS = {
  E1: {
    id: 'E1',
    name: '悪天候',
    probability: 0.04, // 4% per ship per day
    scope: 'ship',
    effects: {
      voyageDelayMultiplier: 1.2, // +20% voyage time
    },
    duration: 1, // Immediate effect (1 day)
    severity: 'moderate' as const,
  },
  E2: {
    id: 'E2',
    name: '港ストライキ',
    probability: 0.005, // 0.5% per port per day
    scope: 'port',
    effects: {
      portClosed: true,
      dockClosed: true,
    },
    duration: 7, // 7 days
    severity: 'severe' as const,
  },
  E3: {
    id: 'E3',
    name: '海賊被害',
    probability: 0.002, // 0.2% per ship in risk zones
    scope: 'ship_risk_zone',
    effects: {
      voyageDelayMultiplier: 1.3, // +30% delay
      insuranceMultiplier: 1.005, // +0.5% insurance
    },
    duration: 1, // Immediate
    severity: 'severe' as const,
  },
  E4: {
    id: 'E4',
    name: '燃料高騰',
    probability: 0.001, // 0.1% global per day
    scope: 'global',
    effects: {
      fuelPriceMultiplier: 1.5, // ×1.5 fuel price
    },
    duration: 7, // 7 days
    severity: 'critical' as const,
  },
  E5: {
    id: 'E5',
    name: '需要急増',
    probability: 0.002, // 0.2% per cargo type per day
    scope: 'cargo_type',
    effects: {
      freightRateMultiplier: 1.3, // +30% freight rate
    },
    duration: 10, // 10 days
    severity: 'moderate' as const,
  },
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

// Weather and event probabilities by region and season
export const REGIONAL_WEATHER_PATTERNS = {
  'Asia': {
    spring: { typhoon: 0.02, fog: 0.05, clear: 0.7 },
    summer: { typhoon: 0.08, storm: 0.1, clear: 0.6 },
    autumn: { typhoon: 0.05, storm: 0.08, clear: 0.65 },
    winter: { storm: 0.06, fog: 0.08, clear: 0.7 },
  },
  'Europe': {
    spring: { storm: 0.04, fog: 0.06, clear: 0.75 },
    summer: { clear: 0.85, storm: 0.02 },
    autumn: { storm: 0.06, fog: 0.05, clear: 0.7 },
    winter: { winter_storm: 0.1, fog: 0.08, clear: 0.6 },
  },
  'North America': {
    spring: { storm: 0.05, clear: 0.75 },
    summer: { clear: 0.8, storm: 0.03 },
    autumn: { storm: 0.06, clear: 0.7 },
    winter: { winter_storm: 0.08, clear: 0.65 },
  },
};

// Global event templates with realistic probabilities
export const GLOBAL_EVENT_TEMPLATES = {
  trade_war: {
    probability: 0.0005, // 0.05% per day
    title: '貿易戦争',
    description: '主要国間の貿易摩擦により関税が引き上げられました',
    duration: [180, 365], // 6-12 months
    effects: {
      demandMultiplier: { Container: 0.8, Car: 0.7, Bulk: 0.9 },
      contractPriceMultiplier: 1.2,
    },
    affectedRegions: ['Asia', 'North America'],
  },
  pandemic: {
    probability: 0.0001, // 0.01% per day (rare but impactful)
    title: 'パンデミック',
    description: '世界的な感染症拡大により物流が大幅に制限されています',
    duration: [365, 730], // 1-2 years
    effects: {
      demandMultiplier: { Container: 0.6, Car: 0.4, Passenger: 0.1, Bulk: 0.8 },
      portEfficiencyMultiplier: 0.7,
      fuelPriceMultiplier: 0.8,
    },
    chainEvents: ['economic_recession'],
  },
  canal_blockage: {
    probability: 0.0002, // 0.02% per day
    title: '運河封鎖',
    description: 'スエズ運河で大型船舶が座礁し、航路が封鎖されています',
    duration: [7, 30], // 1 week to 1 month
    effects: {
      demandMultiplier: { Container: 1.3, Oil: 1.4 }, // Alternative routes in high demand
      fuelPriceMultiplier: 1.2,
      contractPriceMultiplier: 1.5,
    },
    affectedRegions: ['Asia', 'Europe'],
  },
  environmental_regulation: {
    probability: 0.0003, // 0.03% per day
    title: '環境規制強化',
    description: 'IMOが新たな排出ガス規制を導入しました',
    duration: [365, 1825], // 1-5 years (permanent change)
    effects: {
      fuelPriceMultiplier: 1.15, // Cleaner fuel costs more
      maintenanceMultiplier: 1.1, // Compliance costs
    },
  },
  tech_breakthrough: {
    probability: 0.0001, // 0.01% per day
    title: '技術革新',
    description: '新しい船舶推進技術により燃費効率が大幅に改善されました',
    duration: [730, 3650], // 2-10 years (gradual adoption)
    effects: {
      fuelPriceMultiplier: 0.9, // More efficient = less fuel needed
      maintenanceMultiplier: 0.95,
    },
  },
  geopolitical_crisis: {
    probability: 0.0004, // 0.04% per day
    title: '地政学的危機',
    description: '地域紛争により海上保険料が上昇しています',
    duration: [90, 365], // 3-12 months
    effects: {
      insuranceMultiplier: 1.5,
      riskMultiplier: 1.3,
    },
    affectedRegions: ['Middle East', 'Asia'],
  },
};

// Fuel price volatility factors
export const FUEL_PRICE_FACTORS = {
  baseVolatility: 0.02, // 2% daily variation
  seasonalMultipliers: {
    spring: 1.0,
    summer: 1.1, // Higher demand for travel
    autumn: 1.05,
    winter: 1.15, // Heating demand
  },
  geopoliticalMultiplier: 0.001, // Per tension point
  supplyShockMultiplier: 0.05, // Major events
};

// Economic cycle parameters
export const ECONOMIC_CYCLES = {
  recession: {
    demandMultiplier: { Container: 0.7, Car: 0.6, Bulk: 0.8, Oil: 0.9, Passenger: 0.5 },
    contractPriceMultiplier: 0.8,
    competitionMultiplier: 1.3, // More competition for fewer contracts
  },
  stable: {
    demandMultiplier: { Container: 1.0, Car: 1.0, Bulk: 1.0, Oil: 1.0, Passenger: 1.0 },
    contractPriceMultiplier: 1.0,
    competitionMultiplier: 1.0,
  },
  growth: {
    demandMultiplier: { Container: 1.2, Car: 1.3, Bulk: 1.1, Oil: 1.1, Passenger: 1.4 },
    contractPriceMultiplier: 1.1,
    competitionMultiplier: 0.9,
  },
  boom: {
    demandMultiplier: { Container: 1.5, Car: 1.6, Bulk: 1.3, Oil: 1.2, Passenger: 1.8 },
    contractPriceMultiplier: 1.3,
    competitionMultiplier: 0.7,
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