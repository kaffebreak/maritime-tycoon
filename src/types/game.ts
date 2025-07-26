export type CargoType = 'Container' | 'Car' | 'Bulk' | 'Oil' | 'Passenger';
export type ShipClass = 'Container' | 'PCTC' | 'Tanker' | 'Bulker' | 'Cruise';
export type PortSize = 'Large' | 'Medium' | 'Small';
export type ShipStatus = 'idle' | 'sailing' | 'loading' | 'maintenance';
export type Difficulty = 'Easy' | 'Normal' | 'Hard';
export type GameSpeed = 0 | 1 | 2 | 5;
export type WeatherCondition = 'clear' | 'rough' | 'storm' | 'fog';
export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';
export type GlobalEventType = 'fuel_surge' | 'economic_boom' | 'recession' | 'port_strike' | 'piracy_alert' | 'seasonal_demand';
export type AchievementType = 'first_voyage' | 'profit_milestone' | 'fleet_size' | 'route_master' | 'efficiency_expert';

export interface Port {
  LOCODE: string;
  name: string;
  country: string;
  continent: string;
  lat: number;
  lon: number;
  size: PortSize;
  supportedCargo: CargoType[];
  dock: number;
  fees: {
    port: number;
    cargo: Record<CargoType, number>;
  };
  congestion: number; // 0-100, affects waiting time
  facilities: {
    cranes: number;
    storage: number;
    fuel: boolean;
    repair: boolean;
  };
  weatherRisk: number; // 0-100, affects voyage safety
}

export interface ShipSpec {
  id: string;
  class: ShipClass;
  subclass: string;
  dwtOrGt: number;
  capacity: number;
  speedKt: number;
  fuelBurn100nm: number;
  buildCost: number;
  reliability: number; // 0-100, affects breakdown chance
  fuelEfficiency: number; // multiplier for fuel consumption
}

export interface ShipInstance {
  id: string;
  specId: string;
  name: string;
  status: ShipStatus;
  currentPort: string;
  destPort?: string;
  contractId?: string;
  etaDay: number;
  hp: number;
  ageYear: number;
  maintenanceCost: number;
  insuranceCost: number;
  condition: number; // 0-100, affects performance and costs
  lastMaintenance: number; // simulation day
  totalDistance: number; // nautical miles traveled
  crew: {
    captain: CrewMember;
    engineers: CrewMember[];
    sailors: CrewMember[];
  };
  // Auto contract settings
  autoContract: boolean;
  autoSettings: {
    minProfitMargin: number; // %
    maxDistance: number; // nautical miles
    preferredCargoTypes: CargoType[];
    riskTolerance: 'low' | 'medium' | 'high';
  };
}

export interface CrewMember {
  id: string;
  name: string;
  skill: number; // 0-100
  salary: number; // per day
  experience: number; // years
  specialization: 'navigation' | 'engineering' | 'cargo' | 'general';
}

export interface CargoContract {
  id: string;
  cargoType: CargoType;
  amount: number;
  origin: string;
  destination: string;
  distanceNm: number;
  freightRate: number;
  expiresDay: number;
  createdDay: number;
  status: 'available' | 'assigned' | 'completed' | 'expired';
  contractType: 'spot' | 'long_term';
  duration?: number; // days for long-term contracts
  repeatCount?: number; // remaining repeats for long-term
  priority: 'low' | 'normal' | 'high' | 'urgent';
  seasonalMultiplier: number; // demand based on season
  riskLevel: number; // 0-100, affects insurance and events
}

export interface Voyage {
  id: string;
  shipId: string;
  contractId: string;
  startDay: number;
  estimatedDays: number;
  currentProgress: number;
  costs: {
    fuel: number;
    port: number;
    cargo: number;
    maintenance: number;
    insurance: number;
  };
  revenue: number;
  events: VoyageEvent[];
}

export interface VoyageEvent {
  id: string;
  type: 'weather' | 'strike' | 'piracy' | 'fuel_surge' | 'demand_surge';
  message: string;
  day: number;
  impact: {
    delayDays?: number;
    costMultiplier?: number;
    revenueMultiplier?: number;
  };
  duration: number;
}

export interface GlobalEvent {
  id: string;
  type: GlobalEventType;
  title: string;
  description: string;
  startDay: number;
  duration: number;
  effects: {
    fuelPriceMultiplier?: number;
    demandMultiplier?: Record<CargoType, number>;
    portEfficiencyMultiplier?: number;
    riskMultiplier?: number;
  };
  affectedRegions?: string[]; // continent names
}

export interface Achievement {
  id: string;
  type: AchievementType;
  title: string;
  description: string;
  requirement: number;
  reward: {
    cash?: number;
    reputation?: number;
    unlocks?: string[];
  };
  unlocked: boolean;
  progress: number;
}

export interface CompanyFinances {
  loans: Loan[];
  insurance: InsurancePolicy[];
  taxes: {
    rate: number;
    lastPaid: number;
    owed: number;
  };
  creditRating: number; // 0-100
}

export interface Loan {
  id: string;
  amount: number;
  remainingAmount: number;
  interestRate: number;
  monthlyPayment: number;
  startDay: number;
  termDays: number;
}

export interface InsurancePolicy {
  id: string;
  type: 'hull' | 'cargo' | 'liability';
  coverage: number;
  premium: number; // per day
  deductible: number;
  active: boolean;
}

export interface MarketConditions {
  season: SeasonType;
  weatherPatterns: Record<string, WeatherCondition>; // by region
  fuelPrices: {
    VLSFO: number;
    HFO: number;
    trend: 'rising' | 'falling' | 'stable';
  };
  demandMultipliers: Record<CargoType, number>;
  competitionLevel: number; // 0-100
}

export interface GameState {
  // Core game state
  simulationDay: number;
  gameSpeed: GameSpeed;
  cash: number;
  difficulty: Difficulty;
  companyName: string;
  founderName: string;
  
  // Game entities
  ports: Port[];
  shipSpecs: ShipSpec[];
  fleet: ShipInstance[];
  contracts: CargoContract[];
  activeVoyages: Voyage[];
  completedVoyages: Voyage[];
  
  // Market conditions
  fuelPrice: number;
  globalEvents: VoyageEvent[];
  newGlobalEvents: GlobalEvent[];
  marketConditions: MarketConditions;
  achievements: Achievement[];
  finances: CompanyFinances;
  reputation: number; // 0-100
  researchPoints: number;
  unlockedFeatures: string[];
  
  // Statistics
  totalRevenue: number;
  totalCosts: number;
  completedContracts: number;
  totalDistanceTraveled: number;
  averageProfit: number;
  bestMonth: {
    month: number;
    profit: number;
  };
}

export interface CostFactors {
  fuel: {
    VLSFO: number;
    HFO: number;
  };
  portMultipliers: Record<PortSize, number>;
  cargoRates: Record<CargoType, number>;
  maintenanceRate: number;
  insuranceRate: number;
}

export interface KanbanColumn {
  id: string;
  title: string;
  items: (ShipInstance | CargoContract)[];
}