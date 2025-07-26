export type CargoType = 'Container' | 'Car' | 'Bulk' | 'Oil' | 'Passenger';
export type ShipClass = 'Container' | 'PCTC' | 'Tanker' | 'Bulker' | 'Cruise';
export type PortSize = 'Large' | 'Medium' | 'Small';
export type ShipStatus = 'idle' | 'sailing' | 'loading' | 'maintenance';
export type Difficulty = 'Easy' | 'Normal' | 'Hard';
export type GameSpeed = 0 | 1 | 2 | 5;

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
  // Auto contract settings
  autoContract: boolean;
  autoSettings: {
    minProfitMargin: number; // %
    maxDistance: number; // nautical miles
    preferredCargoTypes: CargoType[];
    riskTolerance: 'low' | 'medium' | 'high';
  };
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
  status: 'available' | 'assigned' | 'completed' | 'expired';
  contractType: 'spot' | 'long_term';
  duration?: number; // days for long-term contracts
  repeatCount?: number; // remaining repeats for long-term
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

export interface GameState {
  // Core game state
  simulationDay: number;
  gameSpeed: GameSpeed;
  cash: number;
  difficulty: Difficulty;
  
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
  
  // Statistics
  totalRevenue: number;
  totalCosts: number;
  completedContracts: number;
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