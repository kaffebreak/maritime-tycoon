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
  calculateDistance,
  SEASONAL_DEMAND_MULTIPLIERS
} from '../constants/gameData';
import { v4 as uuidv4 } from 'uuid';

interface GameStore extends GameState {
  // Actions
  initializeGame: (companyName?: string, founderName?: string, difficulty?: 'Easy' | 'Normal' | 'Hard') => void;
  setGameSpeed: (speed: GameState['gameSpeed']) => void;
  advanceSimulation: () => void;
  updateContractExpiration: () => void;
  maintainContractPool: () => void;
  
  // Ship management
  purchaseShip: (specId: string, name: string) => void;
  
  // Contract management
  generateContracts: () => void;
  assignContract: (contractId: string, shipId: string) => void;
  setAutoContract: (shipId: string, enabled: boolean, settings?: any) => void;
  processAutoContracts: () => void;
  
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

  // 30% chance for long-term contract
  const isLongTerm = Math.random() < 0.3;
  const duration = isLongTerm ? Math.floor(Math.random() * 60) + 30 : undefined; // 30-90 days
  const repeatCount = isLongTerm ? Math.floor(Math.random() * 8) + 2 : undefined; // 2-10 repeats
  return {
    id: uuidv4(),
    cargoType,
    amount,
    origin: origin.LOCODE,
    destination: destination.LOCODE,
    distanceNm: distance,
    freightRate,
    expiresDay: Math.floor(Math.random() * 30) + 7, // 7-37 days duration
    createdDay: 0, // Will be set when contract is generated
    status: 'available',
    contractType: isLongTerm ? 'long_term' : 'spot',
    duration,
    repeatCount,
  };
};

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  simulationDay: 0,
  gameSpeed: 1,
  cash: 0,
  difficulty: 'Normal',
  companyName: '',
  founderName: '',
  
  ports: SAMPLE_PORTS,
  shipSpecs: SAMPLE_SHIP_SPECS,
  fleet: [],
  contracts: [],
  activeVoyages: [],
  completedVoyages: [],
  
  fuelPrice: COST_FACTORS.fuel.VLSFO,
  globalEvents: [],
  
  newGlobalEvents: [],
  marketConditions: {
    season: 'spring',
    demandMultipliers: { Container: 1.0, Car: 1.0, Bulk: 1.0, Oil: 1.0, Passenger: 1.0 },
    fuelPrices: {
      VLSFO: COST_FACTORS.fuel.VLSFO,
      HFO: COST_FACTORS.fuel.HFO,
      trend: 'stable' as const,
    },
    competitionLevel: 'medium' as const,
  },
  
  achievements: [
    {
      id: 'first_voyage',
      title: '初航海',
      description: '最初の契約を完了する',
      type: 'first_voyage',
      requirement: 1,
      progress: 0,
      unlocked: false,
      reward: { cash: 100000, reputation: 5 },
    },
    {
      id: 'profit_milestone',
      title: '利益の達人',
      description: '累計利益$1,000,000を達成する',
      type: 'profit_milestone',
      requirement: 1000000,
      progress: 0,
      unlocked: false,
      reward: { cash: 500000, reputation: 10 },
    },
    {
      id: 'fleet_expansion',
      title: '艦隊司令官',
      description: '5隻の船舶を所有する',
      type: 'fleet_size',
      requirement: 5,
      progress: 0,
      unlocked: false,
      reward: { cash: 250000, reputation: 8 },
    },
    {
      id: 'route_master',
      title: '航路の達人',
      description: '100回の契約を完了する',
      type: 'route_master',
      requirement: 100,
      progress: 0,
      unlocked: false,
      reward: { cash: 1000000, reputation: 15 },
    },
  ],
  
  finances: {
    loans: [],
    creditRating: 80,
    taxes: {
      rate: 0.25,
      owed: 0,
      lastPaid: 0,
    },
  },
  
  totalRevenue: 0,
  totalCosts: 0,
  completedContracts: 0,

  initializeGame: (companyName?: string, founderName?: string, difficulty?: 'Easy' | 'Normal' | 'Hard') => {
    const difficultySettings = {
      Easy: 25_000_000,
      Normal: 15_000_000,
      Hard: 8_000_000,
    };
    
    const initialCash = difficulty ? difficultySettings[difficulty] : INITIAL_CASH;
    
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
      autoContract: false,
      autoSettings: {
        minProfitMargin: 15,
        maxDistance: 10000,
        preferredCargoTypes: ['Container'],
        riskTolerance: 'medium',
      },
    };

    const initialContracts = Array.from({ length: 12 }, () => {
      const contract = generateRandomContract(SAMPLE_PORTS);
      return { ...contract, createdDay: 0 };
    });
    set({
      simulationDay: 0,
      cash: initialCash,
      difficulty: difficulty || 'Normal',
      companyName: companyName || '',
      founderName: founderName || '',
      fleet: [starterShip],
      contracts: initialContracts,
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
    get().updateContractExpiration();
    get().maintainContractPool();
    get().triggerRandomEvents();
    get().triggerGlobalEvents();
    get().updateMarketConditions();
    get().checkAchievements();
    get().payLoanInstallments();
    get().checkMaintenanceNeeds();
    get().processAutoContracts();
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
      autoContract: false,
      autoSettings: {
        minProfitMargin: 15,
        maxDistance: 10000,
        preferredCargoTypes: [spec.class === 'Container' ? 'Container' : 
                             spec.class === 'PCTC' ? 'Car' :
                             spec.class === 'Tanker' ? 'Oil' :
                             spec.class === 'Bulker' ? 'Bulk' : 'Passenger'],
        riskTolerance: 'medium',
      },
    };

    set(prevState => ({
      cash: prevState.cash - spec.buildCost,
      fleet: [...prevState.fleet, newShip],
    }));
  },

  generateContracts: () => {
    const state = get();
    const newContracts = Array.from({ length: 6 }, () => {
      const contract = generateRandomContract(state.ports);
      return { ...contract, createdDay: state.simulationDay };
    });
    
    set(prevState => ({
      contracts: [
        ...prevState.contracts,
        ...newContracts
      ],
    }));
  },

  setAutoContract: (shipId, enabled, settings) => {
    set(prevState => ({
      fleet: prevState.fleet.map(ship =>
        ship.id === shipId
          ? {
              ...ship,
              autoContract: enabled,
              autoSettings: settings || ship.autoSettings,
            }
          : ship
      ),
    }));
  },

  processAutoContracts: () => {
    const state = get();
    const idleShipsWithAuto = state.fleet.filter(
      ship => ship.status === 'idle' && ship.autoContract
    );

    idleShipsWithAuto.forEach(ship => {
      const availableContracts = state.contracts.filter(contract => {
        if (contract.status !== 'available') return false;

        // Check ship compatibility
        const shipSpec = state.shipSpecs.find(s => s.id === ship.specId);
        if (!shipSpec) return false;

        // Ship type compatibility
        const canCarryCargoType = (() => {
          switch (contract.cargoType) {
            case 'Container': return shipSpec.class === 'Container';
            case 'Car': return shipSpec.class === 'PCTC';
            case 'Oil': return shipSpec.class === 'Tanker';
            case 'Bulk': return shipSpec.class === 'Bulker';
            case 'Passenger': return shipSpec.class === 'Cruise';
            default: return false;
          }
        })();

        if (!canCarryCargoType) return false;
        if (contract.amount > shipSpec.capacity) return false;

        // Check auto settings
        if (!ship.autoSettings.preferredCargoTypes.includes(contract.cargoType)) return false;
        if (contract.distanceNm > ship.autoSettings.maxDistance) return false;

        // Calculate profit margin
        const costs = get().calculateVoyageCosts(ship.id, contract.id);
        const revenue = contract.amount * contract.freightRate;
        const profitMargin = ((revenue - costs.total) / revenue) * 100;

        if (profitMargin < ship.autoSettings.minProfitMargin) return false;

        return true;
      });

      // Select best contract (highest profit margin)
      if (availableContracts.length > 0) {
        const bestContract = availableContracts.reduce((best, current) => {
          const bestCosts = get().calculateVoyageCosts(ship.id, best.id);
          const currentCosts = get().calculateVoyageCosts(ship.id, current.id);
          const bestMargin = ((best.amount * best.freightRate - bestCosts.total) / (best.amount * best.freightRate)) * 100;
          const currentMargin = ((current.amount * current.freightRate - currentCosts.total) / (current.amount * current.freightRate)) * 100;
          return currentMargin > bestMargin ? current : best;
        });

        // Double-check contract is still available before assigning
        const currentState = get();
        const stillAvailable = currentState.contracts.find(c => c.id === bestContract.id && c.status === 'available');
        if (stillAvailable) {
          get().assignContract(bestContract.id, ship.id);
        }
      }
    });
  },

  assignContract: (contractId, shipId) => {
    const state = get();
    const contract = state.contracts.find(c => c.id === contractId);
    const ship = state.fleet.find(s => s.id === shipId);
    
    // Check if contract is still available and ship is idle
    if (!contract || contract.status !== 'available' || !ship || ship.status !== 'idle') {
      return; // Contract already taken or ship not available
    }

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

  updateContractExpiration: () => {
    const state = get();
    
    set(prevState => ({
      contracts: prevState.contracts.map(contract => {
        if (contract.status === 'available') {
          const remainingDays = contract.expiresDay - (state.simulationDay - contract.createdDay);
          
          if (remainingDays <= 0) {
            return { ...contract, status: 'expired' as const };
          }
        }
        return contract;
      }),
    }));
  },

  maintainContractPool: () => {
    const state = get();
    const availableContracts = state.contracts.filter(c => c.status === 'available');
    const targetCount = 10;
    const minCount = 8;
    
    // If we have fewer than minimum contracts, generate new ones
    if (availableContracts.length < minCount) {
      const contractsToGenerate = targetCount - availableContracts.length;
      const newContracts = Array.from({ length: contractsToGenerate }, () => {
        const contract = generateRandomContract(state.ports);
        return { ...contract, createdDay: state.simulationDay };
      });
      
      set(prevState => ({
        contracts: [...prevState.contracts, ...newContracts],
      }));
    }
    
    // Clean up old expired contracts (keep only recent ones for history)
    const cutoffDay = state.simulationDay - 30; // Keep 30 days of history
    set(prevState => ({
      contracts: prevState.contracts.filter(contract => 
        contract.status !== 'expired' || 
        (contract.createdDay > cutoffDay)
      ),
    }));
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

  triggerGlobalEvents: () => {
    const state = get();
    
    // Seasonal events
    const dayOfYear = state.simulationDay % 365;
    const newSeason = dayOfYear < 91 ? 'spring' :
                     dayOfYear < 182 ? 'summer' :
                     dayOfYear < 273 ? 'autumn' : 'winter';
    
    if (newSeason !== state.marketConditions.season) {
      const seasonalEvent: GlobalEvent = {
        id: uuidv4(),
        type: 'seasonal_demand',
        title: `${newSeason === 'spring' ? '春' : newSeason === 'summer' ? '夏' : newSeason === 'autumn' ? '秋' : '冬'}の需要変動`,
        description: `季節の変化により貨物需要が変動しています`,
        startDay: state.simulationDay,
        duration: 90,
        effects: {
          demandMultiplier: SEASONAL_DEMAND_MULTIPLIERS[newSeason],
        },
      };
      
      set(prevState => ({
        newGlobalEvents: [...prevState.newGlobalEvents, seasonalEvent],
        marketConditions: {
          ...prevState.marketConditions,
          season: newSeason,
          demandMultipliers: SEASONAL_DEMAND_MULTIPLIERS[newSeason],
        },
      }));
    }
    
    // Economic events
    if (Math.random() < 0.002) { // 0.2% chance per day
      const isPositive = Math.random() > 0.5;
      const economicEvent: GlobalEvent = {
        id: uuidv4(),
        type: isPositive ? 'economic_boom' : 'recession',
        title: isPositive ? '経済好況' : '経済不況',
        description: isPositive ? '世界経済の好況により貨物需要が増加' : '経済不況により貨物需要が減少',
        startDay: state.simulationDay,
        duration: 60,
        effects: {
          demandMultiplier: isPositive ? 
            { Container: 1.3, Car: 1.2, Bulk: 1.1, Oil: 1.1, Passenger: 1.4 } :
            { Container: 0.8, Car: 0.7, Bulk: 0.9, Oil: 0.9, Passenger: 0.6 },
        },
      };
      
      set(prevState => ({
        newGlobalEvents: [...prevState.newGlobalEvents, economicEvent],
      }));
    }
  },

  updateMarketConditions: () => {
    const state = get();
    
    // Update fuel prices based on global events
    let fuelMultiplier = 1.0;
    state.newGlobalEvents.forEach(event => {
      if (event.effects.fuelPriceMultiplier) {
        fuelMultiplier *= event.effects.fuelPriceMultiplier;
      }
    });
    
    set(prevState => ({
      marketConditions: {
        ...prevState.marketConditions,
        fuelPrices: {
          VLSFO: COST_FACTORS.fuel.VLSFO * fuelMultiplier,
          HFO: COST_FACTORS.fuel.HFO * fuelMultiplier,
          trend: fuelMultiplier > 1.1 ? 'rising' : fuelMultiplier < 0.9 ? 'falling' : 'stable',
        },
      },
      fuelPrice: COST_FACTORS.fuel.VLSFO * fuelMultiplier,
    }));
  },

  checkAchievements: () => {
    const state = get();
    
    set(prevState => ({
      achievements: prevState.achievements.map(achievement => {
        if (achievement.unlocked) return achievement;
        
        let progress = 0;
        switch (achievement.type) {
          case 'first_voyage':
            progress = state.completedContracts;
            break;
          case 'profit_milestone':
            progress = state.totalRevenue - state.totalCosts;
            break;
          case 'fleet_size':
            progress = state.fleet.length;
            break;
          case 'route_master':
            progress = state.completedContracts;
            break;
        }
        
        const unlocked = progress >= achievement.requirement;
        
        if (unlocked && !achievement.unlocked) {
          // Award achievement rewards
          setTimeout(() => {
            if (achievement.reward.cash) {
              set(prev => ({ cash: prev.cash + (achievement.reward.cash || 0) }));
            }
            if (achievement.reward.reputation) {
              set(prev => ({ reputation: Math.min(100, prev.reputation + (achievement.reward.reputation || 0)) }));
            }
          }, 100);
        }
        
        return { ...achievement, progress, unlocked };
      }),
    }));
  },

  unlockAchievement: (achievementId) => {
    set(prevState => ({
      achievements: prevState.achievements.map(a =>
        a.id === achievementId ? { ...a, unlocked: true } : a
      ),
    }));
  },

  payTaxes: () => {
    const state = get();
    const profit = state.totalRevenue - state.totalCosts;
    const taxOwed = Math.max(0, profit * state.finances.taxes.rate);
    
    set(prevState => ({
      cash: prevState.cash - taxOwed,
      finances: {
        ...prevState.finances,
        taxes: {
          ...prevState.finances.taxes,
          lastPaid: state.simulationDay,
          owed: 0,
        },
      },
      totalCosts: prevState.totalCosts + taxOwed,
    }));
  },

  takeLoan: (amount, termDays) => {
    const state = get();
    const interestRate = 0.05 + (100 - state.finances.creditRating) * 0.001; // 5-15% based on credit
    const monthlyPayment = (amount * interestRate) / 12;
    
    const loan = {
      id: uuidv4(),
      amount,
      remainingAmount: amount,
      interestRate,
      monthlyPayment,
      startDay: state.simulationDay,
      termDays,
    };
    
    set(prevState => ({
      cash: prevState.cash + amount,
      finances: {
        ...prevState.finances,
        loans: [...prevState.finances.loans, loan],
      },
    }));
  },

  payLoanInstallments: () => {
    const state = get();
    
    // Pay monthly installments (every 30 days)
    if (state.simulationDay % 30 === 0 && state.simulationDay > 0) {
      let totalPayment = 0;
      
      const updatedLoans = state.finances.loans.map(loan => {
        if (loan.remainingAmount > 0) {
          const payment = Math.min(loan.monthlyPayment, loan.remainingAmount);
          totalPayment += payment;
          return {
            ...loan,
            remainingAmount: loan.remainingAmount - payment,
          };
        }
        return loan;
      }).filter(loan => loan.remainingAmount > 0);
      
      set(prevState => ({
        cash: prevState.cash - totalPayment,
        finances: {
          ...prevState.finances,
          loans: updatedLoans,
        },
        totalCosts: prevState.totalCosts + totalPayment,
      }));
    }
  },

  performMaintenance: (shipId, type) => {
    const state = get();
    const ship = state.fleet.find(s => s.id === shipId);
    const spec = state.shipSpecs.find(s => s.id === ship?.specId);
    
    if (!ship || !spec) return;
    
    const costs = {
      minor: spec.buildCost * 0.01,
      major: spec.buildCost * 0.05,
      drydock: spec.buildCost * 0.15,
    };
    
    const conditionImprovement = {
      minor: 20,
      major: 50,
      drydock: 100,
    };
    
    const cost = costs[type];
    
    if (state.cash >= cost) {
      set(prevState => ({
        cash: prevState.cash - cost,
        fleet: prevState.fleet.map(s =>
          s.id === shipId
            ? {
                ...s,
                condition: Math.min(100, s.condition + conditionImprovement[type]),
                lastMaintenance: state.simulationDay,
                status: type === 'drydock' ? 'maintenance' as const : s.status,
              }
            : s
        ),
        totalCosts: prevState.totalCosts + cost,
      }));
    }
  },

  checkMaintenanceNeeds: () => {
    const state = get();
    
    set(prevState => ({
      fleet: prevState.fleet.map(ship => {
        const daysSinceLastMaintenance = state.simulationDay - ship.lastMaintenance;
        const conditionDecay = Math.floor(daysSinceLastMaintenance / 30) * 2; // 2% per month
        const newCondition = Math.max(0, ship.condition - conditionDecay);
        
        return {
          ...ship,
          condition: newCondition,
        };
      }),
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