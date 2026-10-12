import type { FreightMarket } from '../constants/freightMarket';
import type { CharterOffer, NewbuildOrder, SecondhandOffer } from '../constants/shipMarket';

export type CargoType = 'Container' | 'Car' | 'Bulk' | 'Oil' | 'Passenger';
export type ShipClass = 'Container' | 'PCTC' | 'Tanker' | 'Bulker' | 'Cruise';
export type PortSize = 'Large' | 'Medium' | 'Small';
export type ShipStatus = 'idle' | 'sailing' | 'loading' | 'maintenance' | 'chartered_out';
export type Difficulty = 'Easy' | 'Normal' | 'Hard';
export type GameSpeed = 0 | 1 | 2 | 5;
export type WeatherCondition = 'clear' | 'rough' | 'storm' | 'fog';
export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';
export type GlobalEventType = 'fuel_surge' | 'economic_boom' | 'recession' | 'port_strike' | 'piracy_alert' | 'seasonal_demand' | 'trade_war' | 'pandemic' | 'canal_blockage' | 'environmental_regulation' | 'tech_breakthrough' | 'geopolitical_crisis' | 'weather_event' | 'demand_surge';
export type AchievementType = 'first_voyage' | 'profit_milestone' | 'fleet_size' | 'route_master' | 'efficiency_expert';
export type CompanyType = 'player' | 'npc';
export type NPCStrategy = 'aggressive' | 'conservative' | 'balanced' | 'opportunistic';
export type MaintenanceType = 'minor' | 'major' | 'drydock' | 'emergency';
export type MaintenanceStatus = 'none' | 'scheduled' | 'in_progress' | 'completed';

export interface Port {
  LOCODE: string;
  name: string;
  country: string;
  continent: string;
  lat: number;
  lon: number;
  size: PortSize;
  supportedCargo: CargoType[];
  // Bulk trades run one way: ore leaves mining ports for steel mills.
  // Without these, the port both ships and receives supportedCargo.
  exports?: CargoType[];
  imports?: CargoType[];
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
  // Simulation day the ship was delivered from the yard; earlier than day 0
  // for ships bought secondhand.
  builtDay?: number;
  // Time charter: 'in' is a ship hired from another owner, 'out' is one of
  // ours hired to someone else. Hire is paid daily until endDay.
  charter?: { kind: 'in' | 'out'; dailyHire: number; endDay: number };
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
  maintenanceStatus: MaintenanceStatus;
  scheduledMaintenance?: {
    type: MaintenanceType;
    scheduledDay: number;
    estimatedDays: number;
    estimatedCost: number;
  };
  maintenanceHistory: MaintenanceRecord[];
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

export interface MaintenanceRecord {
  id: string;
  type: MaintenanceType;
  startDay: number;
  completedDay: number;
  cost: number;
  conditionBefore: number;
  conditionAfter: number;
  description: string;
  port: string;
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

// Paid when the ship sails, except opex: running costs are charged daily
// whether the ship sails or not, and are included here as an estimate.
export interface VoyageCosts {
  fuel: number;
  port: number;
  cargo: number;
  opex: number;
  total: number;
}

export interface Voyage {
  id: string;
  shipId: string;
  contractId: string;
  // Sea route the ship follows, as [lon, lat] points, and its name.
  route?: [number, number][];
  routeLabel?: string;
  routeNm?: number;
  // Storm the ship is currently caught in, so it is reported once.
  stormId?: string;
  startDay: number;
  estimatedDays: number;
  currentProgress: number;
  // Empty leg from where the ship was to the loading port; the route
  // starts with it.
  ballastNm?: number;
  costs: VoyageCosts;
  revenue: number;
  events: VoyageEvent[];
}

export type StormKind = 'typhoon' | 'hurricane' | 'cyclone' | 'winter_storm' | 'fog';

export interface Storm {
  id: string;
  kind: StormKind;
  areaName: string;
  lon: number;
  lat: number;
  radiusNm: number;
  drift: [number, number]; // degrees of [lon, lat] per day
  daysLeft: number;
}

export interface VoyageEvent {
  id: string;
  type: 'weather' | 'strike' | 'piracy' | 'fuel_surge' | 'demand_surge' | 'typhoon' | 'winter_storm' | 'fog_delay' | 'port_congestion';
  message: string;
  day: number;
  impact: {
    delayDays?: number;
    costMultiplier?: number;
    revenueMultiplier?: number;
    fuelMultiplier?: number;
    insuranceMultiplier?: number;
  };
  duration: number;
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  affectedRegions?: string[];
  riskZone?: string;
  cargoType?: CargoType;
}

export interface GlobalEvent {
  id: string;
  type: GlobalEventType;
  title: string;
  description: string;
  startDay: number;
  duration: number;
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  effects: {
    fuelPriceMultiplier?: number;
    demandMultiplier?: Record<CargoType, number>;
    portEfficiencyMultiplier?: number;
    riskMultiplier?: number;
    insuranceMultiplier?: number;
    maintenanceMultiplier?: number;
    contractPriceMultiplier?: number;
  };
  affectedRegions?: string[]; // continent names
  chainEvents?: string[]; // IDs of events this can trigger
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

export interface NPCCompany {
  id: string;
  name: string;
  founderName: string;
  type: CompanyType;
  strategy: NPCStrategy;
  cash: number;
  reputation: number;
  fleetSize: number;
  totalRevenue: number;
  totalCosts: number;
  completedContracts: number;
  marketShare: number;
  lastAction: string;
  founded: number; // simulation day
  color: string; // for UI display
}

export interface RankingEntry {
  companyId: string;
  companyName: string;
  rank: number;
  score: number;
  change: number; // rank change from last period
  metrics: {
    revenue: number;
    profit: number;
    fleetSize: number;
    reputation: number;
    marketShare: number;
  };
}

export interface MarketNews {
  id: string;
  type: 'company_expansion' | 'contract_win' | 'market_entry' | 'bankruptcy' | 'merger';
  companyId: string;
  message: string;
  day: number;
  impact: 'positive' | 'negative' | 'neutral';
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
    volatility: number; // 0-100, affects price swings
    lastChange: number; // simulation day
  };
  demandMultipliers: Record<CargoType, number>;
  competitionLevel: number; // 0-100
  economicClimate: 'recession' | 'stable' | 'growth' | 'boom';
  geopoliticalTension: number; // 0-100
  environmentalPressure: number; // 0-100, affects regulations
  technologyLevel: number; // 0-100, affects efficiency
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
  storms: Storm[];
  marketConditions: MarketConditions;
  achievements: Achievement[];
  finances: CompanyFinances;
  reputation: number; // 0-100
  freightMarket: FreightMarket;
  secondhandOffers: SecondhandOffer[];
  charterOffers: CharterOffer[];
  newbuildOrders: NewbuildOrder[];

  // Scenario being played, the company value it started from, and how it ended.
  scenarioId: string;
  startValue: number;
  // Company value at the start of each month.
  valueHistory: { day: number; value: number }[];
  // First day of the current run of negative cash.
  cashNegativeSince?: number;
  gameOver?: { result: 'won' | 'lost' | 'bankrupt' | 'finished'; day: number; value: number };
  
  // NPC and Competition
  npcCompanies: NPCCompany[];
  rankings: RankingEntry[];
  marketNews: MarketNews[];
  competitionLevel: number; // 0-100, affects contract availability
  
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