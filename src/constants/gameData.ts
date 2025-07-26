import { Port, ShipSpec, CostFactors, CargoType } from '../types/game';

export const INITIAL_CASH = 250_000_000; // 250M USD
export const SIMULATION_TICK_MS = 1000; // 1 second = 1 game day at 1x speed

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
    buildCost: 150_000_000,
  },
  {
    id: 'FEEDER-1',
    class: 'Container',
    subclass: 'Feeder',
    dwtOrGt: 15000,
    capacity: 1200, // TEU
    speedKt: 18,
    fuelBurn100nm: 12,
    buildCost: 25_000_000,
  },
  {
    id: 'PCTC-1',
    class: 'PCTC',
    subclass: 'Large',
    dwtOrGt: 60000,
    capacity: 6000, // CEU
    speedKt: 20,
    fuelBurn100nm: 35,
    buildCost: 80_000_000,
  },
  {
    id: 'VLCC-1',
    class: 'Tanker',
    subclass: 'VLCC',
    dwtOrGt: 300000,
    capacity: 300000, // tonnes
    speedKt: 16,
    fuelBurn100nm: 55,
    buildCost: 120_000_000,
  },
  {
    id: 'BULK-1',
    class: 'Bulker',
    subclass: 'Capesize',
    dwtOrGt: 180000,
    capacity: 180000, // tonnes
    speedKt: 14,
    fuelBurn100nm: 40,
    buildCost: 60_000_000,
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