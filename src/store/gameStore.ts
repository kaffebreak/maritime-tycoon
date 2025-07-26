import { create } from 'zustand';
import { GameState, CargoContract, ShipInstance, Voyage, VoyageEvent, Port, ShipSpec } from '../types/game';
import { 
  INITIAL_CASH, 
  SAMPLE_PORTS, 
  SAMPLE_SHIP_SPECS, 
  COST_FACTORS, 
  FREIGHT_RATES,
  EVENT_PROBABILITIES,
  DIFFICULTY_MULTIPLIERS,
  calculateDistance 
} from '../constants/gameData';
import { v4 as uuidv4 } from 'uuid';

interface GameStore extends GameState {
  // Actions
  initializeGame: () => void;
  setGameSpeed: (speed: GameState['gameSpeed']) => void;
  advanceSimulation: () => void;
  
  // Ship management
  purchaseShip: (specId: string, name: string) => void;
  
  // Contract management
  generateContracts: () => void;
  assignContract: (contractId: string, shipId: string) => void;
  
  // Voyage management
  startVoyage: (shipId: string, contractId: string) => void;
  updateVoyages: () => void;
  
  // Event system
  triggerRandomEvents: () => void;
  
  // Utilities
  formatCurrency: (amount: number) => string;
  calculateVoyageCosts: (shipId: string, contractId: string) => {
    fuel: number;
    port: number;
    cargo: number;
    maintenance: number;
    insurance: number;
    total: number;
  };
}

const generateRandomContract = (ports: Port[]): CargoContract => {
  const origin = ports[Math.floor(Math.random() * ports.length)];
  const destination = ports[Math.floor(Math.random() * ports.length)];
  
  if (origin.LOCODE === destination.LOCODE) {
    return generateRandomContract(ports);
  }

  const supportedCargo = origin.supportedCargo.filter(cargo => 
    destination.supportedCargo.includes(cargo)
  );
  
  if (supportedCargo.length === 0) {
    return generateRandomContract(ports);
  }

  const cargoType = supportedCargo[Math.floor(Math.random() * supportedCargo.length)];
  const distance = calculateDistance(origin, destination);
  
  // Generate realistic cargo amounts based on type
  let amount: number;
  switch (cargoType) {
    case 'Container':
      amount = Math.floor(Math.random() * 5000) + 500; // 500-5500 TEU
      break;
    case 'Car':
      amount = Math.floor(Math.random() * 2000) + 200; // 200-2200 CEU
      break;
    case 'Bulk':
    case 'Oil':
      amount = Math.floor(Math.random() * 50000) + 10000; // 10k-60k tonnes
      break;
    case 'Passenger':
      amount = Math.floor(Math.random() * 1000) + 100; // 100-1100 PAX
      break;
    default:
      amount = 1000;
  }

  const baseRate = FREIGHT_RATES[cargoType];
  const distanceMultiplier = Math.max(0.5, Math.min(2.0, distance / 5000));
  const freightRate = baseRate * distanceMultiplier * (0.8 + Math.random() * 0.4);

  return {
    id: uuidv4(),
    cargoType,
    amount,
    origin: origin.LOCODE,
    destination: destination.LOCODE,
    distanceNm: distance,
    freightRate,
    expiresDay: Math.floor(Math.random() * 30) + 7, // 7-37 days
    status: 'available',
  };
};

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  simulationDay: 0,
  gameSpeed: 1,
  cash: INITIAL_CASH,
  difficulty: 'Normal',
  
  ports: SAMPLE_PORTS,
  shipSpecs: SAMPLE_SHIP_SPECS,
  fleet: [],
  contracts: [],
  activeVoyages: [],
  completedVoyages: [],
  
  fuelPrice: COST_FACTORS.fuel.VLSFO,
  globalEvents: [],
  
  totalRevenue: 0,
  totalCosts: 0,
  completedContracts: 0,

  initializeGame: () => {
    const starterShip: ShipInstance = {
      id: uuidv4(),
      specId: 'FEEDER-1',
      name: 'Ocean Pioneer',
      status: 'idle',
      currentPort: 'JPTYO',
      etaDay: 0,
      hp: 100,
      ageYear: 0,
      maintenanceCost: 0,
      insuranceCost: 0,
    };

    set({
      simulationDay: 0,
      fleet: [starterShip],
      contracts: Array.from({ length: 12 }, () => generateRandomContract(SAMPLE_PORTS)),
    });
  },

  setGameSpeed: (speed) => {
    set({ gameSpeed: speed });
  },

  advanceSimulation: () => {
    const state = get();
    if (state.gameSpeed === 0) return;

    set(prevState => ({
      simulationDay: prevState.simulationDay + 1,
    }));

    // Update voyages and trigger events
    get().updateVoyages();
    get().triggerRandomEvents();
  },

  purchaseShip: (specId, name) => {
    const state = get();
    const spec = state.shipSpecs.find(s => s.id === specId);
    if (!spec || state.cash < spec.buildCost) return;

    const newShip: ShipInstance = {
      id: uuidv4(),
      specId,
      name,
      status: 'idle',
      currentPort: 'JPTYO', // Default starting port
      etaDay: 0,
      hp: 100,
      ageYear: 0,
      maintenanceCost: 0,
      insuranceCost: 0,
    };

    set(prevState => ({
      cash: prevState.cash - spec.buildCost,
      fleet: [...prevState.fleet, newShip],
    }));
  },

  generateContracts: () => {
    const state = get();
    const newContracts = Array.from({ length: 8 }, () => generateRandomContract(state.ports));
    
    set(prevState => ({
      contracts: [
        ...prevState.contracts.filter(c => c.status === 'assigned'),
        ...newContracts
      ],
    }));
  },

  assignContract: (contractId, shipId) => {
    set(prevState => ({
      contracts: prevState.contracts.map(c =>
        c.id === contractId ? { ...c, status: 'assigned' as const } : c
      ),
      fleet: prevState.fleet.map(s =>
        s.id === shipId ? { ...s, contractId, status: 'loading' as const } : s
      ),
    }));

    // Start voyage after assignment
    setTimeout(() => get().startVoyage(shipId, contractId), 100);
  },

  startVoyage: (shipId, contractId) => {
    const state = get();
    const ship = state.fleet.find(s => s.id === shipId);
    const contract = state.contracts.find(c => c.id === contractId);
    const shipSpec = state.shipSpecs.find(s => s.id === ship?.specId);
    
    if (!ship || !contract || !shipSpec) return;

    const estimatedDays = Math.ceil(contract.distanceNm / shipSpec.speedKt / 24);
    const costs = get().calculateVoyageCosts(shipId, contractId);

    const voyage: Voyage = {
      id: uuidv4(),
      shipId,
      contractId,
      startDay: state.simulationDay,
      estimatedDays,
      currentProgress: 0,
      costs,
      revenue: contract.amount * contract.freightRate,
      events: [],
    };

    set(prevState => ({
      activeVoyages: [...prevState.activeVoyages, voyage],
      fleet: prevState.fleet.map(s =>
        s.id === shipId 
          ? { 
              ...s, 
              status: 'sailing' as const, 
              destPort: contract.destination,
              etaDay: state.simulationDay + estimatedDays 
            }
          : s
      ),
      cash: prevState.cash - costs.total,
      totalCosts: prevState.totalCosts + costs.total,
    }));
  },

  updateVoyages: () => {
    const state = get();
    
    set(prevState => {
      const updatedVoyages = prevState.activeVoyages.map(voyage => {
        const elapsed = state.simulationDay - voyage.startDay;
        const progress = Math.min(elapsed / voyage.estimatedDays, 1);
        
        return { ...voyage, currentProgress: progress };
      });

      // Complete finished voyages
      const completedVoyages = updatedVoyages.filter(v => v.currentProgress >= 1);
      const activeVoyages = updatedVoyages.filter(v => v.currentProgress < 1);

      // Calculate revenue for completed voyages
      let additionalRevenue = 0;
      let completedCount = 0;

      const updatedFleet = prevState.fleet.map(ship => {
        const completedVoyage = completedVoyages.find(v => v.shipId === ship.id);
        if (completedVoyage) {
          additionalRevenue += completedVoyage.revenue;
          completedCount++;
          
          const contract = prevState.contracts.find(c => c.id === completedVoyage.contractId);
          return {
            ...ship,
            status: 'idle' as const,
            currentPort: contract?.destination || ship.currentPort,
            destPort: undefined,
            contractId: undefined,
            etaDay: 0,
          };
        }
        return ship;
      });

      return {
        activeVoyages,
        completedVoyages: [...prevState.completedVoyages, ...completedVoyages],
        fleet: updatedFleet,
        cash: prevState.cash + additionalRevenue,
        totalRevenue: prevState.totalRevenue + additionalRevenue,
        completedContracts: prevState.completedContracts + completedCount,
        contracts: prevState.contracts.map(c => {
          const isCompleted = completedVoyages.some(v => v.contractId === c.id);
          return isCompleted ? { ...c, status: 'completed' as const } : c;
        }),
      };
    });
  },

  triggerRandomEvents: () => {
    const state = get();
    const multiplier = DIFFICULTY_MULTIPLIERS[state.difficulty];

    // Weather events for sailing ships
    state.fleet.filter(s => s.status === 'sailing').forEach(ship => {
      if (Math.random() < EVENT_PROBABILITIES.weather * multiplier.probability) {
        const event: VoyageEvent = {
          id: uuidv4(),
          type: 'weather',
          message: '悪天候により航行が遅延しています',
          day: state.simulationDay,
          impact: { delayDays: 1 * multiplier.effect },
          duration: 1,
        };

        set(prevState => ({
          activeVoyages: prevState.activeVoyages.map(v =>
            v.shipId === ship.id
              ? { ...v, events: [...v.events, event], estimatedDays: v.estimatedDays + (event.impact.delayDays || 0) }
              : v
          ),
        }));
      }
    });

    // Global fuel surge
    if (Math.random() < EVENT_PROBABILITIES.fuel_surge * multiplier.probability) {
      const event: VoyageEvent = {
        id: uuidv4(),
        type: 'fuel_surge',
        message: '燃料価格が急騰しています',
        day: state.simulationDay,
        impact: { costMultiplier: 1.5 * multiplier.effect },
        duration: 7,
      };

      set(prevState => ({
        globalEvents: [...prevState.globalEvents, event],
        fuelPrice: prevState.fuelPrice * (event.impact.costMultiplier || 1),
      }));
    }

    // Clean up expired events
    set(prevState => ({
      globalEvents: prevState.globalEvents.filter(e => 
        state.simulationDay - e.day < e.duration
      ),
    }));
  },

  calculateVoyageCosts: (shipId, contractId) => {
    const state = get();
    const ship = state.fleet.find(s => s.id === shipId);
    const contract = state.contracts.find(c => c.id === contractId);
    const shipSpec = state.shipSpecs.find(s => s.id === ship?.specId);
    const originPort = state.ports.find(p => p.LOCODE === contract?.origin);
    const destPort = state.ports.find(p => p.LOCODE === contract?.destination);

    if (!ship || !contract || !shipSpec || !originPort || !destPort) {
      return { fuel: 0, port: 0, cargo: 0, maintenance: 0, insurance: 0, total: 0 };
    }

    const days = Math.ceil(contract.distanceNm / shipSpec.speedKt / 24);
    
    const fuel = (contract.distanceNm / 100) * shipSpec.fuelBurn100nm * state.fuelPrice;
    const port = originPort.fees.port + destPort.fees.port;
    const cargo = contract.amount * originPort.fees.cargo[contract.cargoType];
    const maintenance = shipSpec.buildCost * COST_FACTORS.maintenanceRate / 365 * days;
    const insurance = shipSpec.buildCost * COST_FACTORS.insuranceRate / 365 * days;
    
    const total = fuel + port + cargo + maintenance + insurance;

    return { fuel, port, cargo, maintenance, insurance, total };
  },

  formatCurrency: (amount) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  },
}));