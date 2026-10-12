import { create } from 'zustand';
import { GameState, CargoContract, CargoType, ShipInstance, Voyage, VoyageCosts, VoyageEvent, Port, ShipSpec } from '../types/game';
import { 
  INITIAL_CASH, 
  SAMPLE_PORTS, 
  SAMPLE_SHIP_SPECS, 
  COST_FACTORS, 
  FREIGHT_RATES,
  EVENT_PROBABILITIES,
  DIFFICULTY_MULTIPLIERS,
  calculateDistance,
  SEASONAL_DEMAND_MULTIPLIERS,
  NPC_COMPANY_NAMES,
  NPC_STRATEGIES,
  GLOBAL_EVENT_TEMPLATES,
  FUEL_PRICE_FACTORS,
  ECONOMIC_CYCLES,
  DIFFICULTY_EVENT_MODIFIERS,
  RANDOM_EVENTS,
  dailyOperatingCost,
  CARGO_LOTS,
  HANDLING_PAID_BY_OWNER,
  LOT_SIZE_PREMIUM,
  PORT_DAYS,
} from '../constants/gameData';
import { v4 as uuidv4 } from 'uuid';
import { getRouteOptions, pirateZoneAt, pointAlongRoute, RouteOption } from '../constants/seaRoutes';
import { advanceStorms, stormAt, STORM_KINDS } from '../constants/weather';
import {
  createFreightMarket,
  FreightMarket,
  MARKET_SEGMENTS,
  MarketSegment,
  rateIndexFor,
  SEGMENT_LABEL,
  shipPrice,
  stepMarket,
} from '../constants/freightMarket';
import {
  generateCharterOffers,
  generateSecondhandOffers,
  NEWBUILD_DAYS,
  NEWBUILD_DEPOSIT,
  SHIPYARD_PORT,
  charterHire,
  shipValue,
} from '../constants/shipMarket';

// Voyage costs plus how long the whole trip takes, empty leg included.
export interface VoyageEstimate extends VoyageCosts {
  days: number;
  ballastNm: number;
  ballastDays: number;
}

interface GameStore extends GameState {
  // Actions
  initializeGame: (companyName?: string, founderName?: string, difficulty?: 'Easy' | 'Normal' | 'Hard') => void;
  setGameSpeed: (speed: GameState['gameSpeed']) => void;
  advanceSimulation: () => void;
  updateContractExpiration: () => void;
  maintainContractPool: () => void;
  
  // Ship management
  orderNewbuild: (specId: string, name: string) => void;
  buySecondhand: (offerId: string, name: string) => void;
  sellShip: (shipId: string) => void;
  charterIn: (offerId: string, name: string) => void;
  charterOut: (shipId: string, days: number) => void;
  updateShipMarket: () => void;
  
  // Contract management
  generateContracts: () => void;
  assignContract: (contractId: string, shipId: string, route?: RouteOption) => void;
  setAutoContract: (shipId: string, enabled: boolean, settings?: any) => void;
  processAutoContracts: () => void;
  
  // Voyage management
  startVoyage: (shipId: string, contractId: string, route?: RouteOption) => void;
  updateVoyages: () => void;
  
  // Event system
  triggerRandomEvents: () => void;
  triggerWeatherEvents: () => void;
  updateFuelPrices: () => void;
  updateFreightMarket: () => void;
  triggerEconomicCycles: () => void;
  simulateMarketCompetition: () => void;
  triggerDetailedRandomEvents: () => void;
  isShipInRiskZone: (shipId: string) => string | null;
  
  // Utilities
  formatCurrency: (amount: number) => string;
  getRouteOptionsFor: (shipId: string, contractId: string) => RouteOption[];
  getBallastRoute: (shipId: string, contractId: string) => RouteOption | null;
  calculateVoyageCosts: (shipId: string, contractId: string, route?: RouteOption) => VoyageEstimate;
  chargeOperatingCosts: () => void;
}

// News is kept newest first.
const NEWS_KEPT = 50;
const prependNews = (news: GameState['marketNews'], items: GameState['marketNews']) =>
  [...items, ...news].slice(0, NEWS_KEPT);

const CREW_NAMES = ['Sato', 'Reyes', 'Novak', 'Okafor', 'Lindqvist', 'Tan', 'Silva', 'Kowalski'];

const crewMember = (role: 'navigation' | 'engineering' | 'general', salary: number) => ({
  id: uuidv4(),
  name: CREW_NAMES[Math.floor(Math.random() * CREW_NAMES.length)],
  skill: 50 + Math.floor(Math.random() * 40),
  salary,
  experience: 2 + Math.floor(Math.random() * 20),
  specialization: role,
});

// A ship ready to trade, at a port, built on builtDay.
const makeShip = (spec: ShipSpec, name: string, port: string, builtDay: number, day: number): ShipInstance => ({
  id: uuidv4(),
  specId: spec.id,
  name,
  status: 'idle',
  currentPort: port,
  builtDay,
  etaDay: 0,
  hp: 100,
  ageYear: Math.floor((day - builtDay) / 365),
  maintenanceCost: 0,
  insuranceCost: 0,
  condition: Math.max(40, Math.round(100 - ((day - builtDay) / 365) * 2.5)),
  lastMaintenance: day,
  totalDistance: 0,
  maintenanceStatus: 'none',
  maintenanceHistory: [],
  crew: {
    captain: crewMember('navigation', 300),
    engineers: Array.from({ length: 4 }, () => crewMember('engineering', 200)),
    sailors: Array.from({ length: 16 }, () => crewMember('general', 150)),
  },
  autoContract: false,
  autoSettings: {
    minProfitMargin: 15,
    maxDistance: 15000,
    preferredCargoTypes: [
      spec.class === 'Container' ? 'Container' :
      spec.class === 'PCTC' ? 'Car' :
      spec.class === 'Tanker' ? 'Oil' :
      spec.class === 'Bulker' ? 'Bulk' : 'Passenger',
    ],
    riskTolerance: 'medium',
  },
});

// Share of new cargo offers by trade.
const CARGO_WEIGHTS: [CargoType, number][] = [
  ['Bulk', 0.3],
  ['Oil', 0.25],
  ['Container', 0.3],
  ['Car', 0.15],
];

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const generateRandomContract = (ports: Port[], market: FreightMarket): CargoContract => {
  let roll = Math.random();
  const cargoType = (CARGO_WEIGHTS.find(([, w]) => (roll -= w) < 0) ?? CARGO_WEIGHTS[0])[0];
  const ships = (p: Port) => (p.exports ?? p.supportedCargo).includes(cargoType);
  const takes = (p: Port) => (p.imports ?? p.supportedCargo).includes(cargoType);

  const origin = pick(ports.filter(ships));
  const destination = pick(ports.filter(p => takes(p) && p.LOCODE !== origin?.LOCODE));
  if (!origin || !destination) return generateRandomContract(ports, market);

  // Freight is quoted on the shortest sea route.
  const distance = getRouteOptions(origin, destination)[0]?.distanceNm ?? calculateDistance(origin, destination);
  const amount = Math.round(pick(CARGO_LOTS[cargoType]) * (0.9 + Math.random() * 0.2));

  const { base, per1000nm } = FREIGHT_RATES[cargoType];
  const lotPremium = Math.pow(Math.max(...CARGO_LOTS[cargoType]) / amount, LOT_SIZE_PREMIUM[cargoType]);
  // The rate is fixed when the contract is offered, at today's market.
  const freightRate =
    (base + (per1000nm * distance) / 1000) *
    lotPremium *
    rateIndexFor(market, cargoType) *
    (0.85 + Math.random() * 0.3);

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
  storms: [],
  marketConditions: {
    season: 'spring',
    weatherPatterns: {},
    demandMultipliers: { Container: 1.0, Car: 1.0, Bulk: 1.0, Oil: 1.0, Passenger: 1.0 },
    fuelPrices: {
      VLSFO: COST_FACTORS.fuel.VLSFO,
      HFO: COST_FACTORS.fuel.HFO,
      trend: 'stable' as const,
      volatility: 20,
      lastChange: 0,
    },
    competitionLevel: 50,
    economicClimate: 'stable' as const,
    geopoliticalTension: 30,
    environmentalPressure: 40,
    technologyLevel: 50,
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
  
  // NPC and ranking system
  npcCompanies: [],
  rankings: [],
  marketNews: [],
  reputation: 50,
  freightMarket: createFreightMarket(0),
  secondhandOffers: [],
  charterOffers: [],
  newbuildOrders: [],

  initializeGame: (companyName?: string, founderName?: string, difficulty?: 'Easy' | 'Normal' | 'Hard') => {
    const difficultySettings = {
      Easy: 25_000_000,
      Normal: 15_000_000,
      Hard: 8_000_000,
    };
    
    const initialCash = difficulty ? difficultySettings[difficulty] : INITIAL_CASH;
    
    // A secondhand Handysize bulker, eight years old.
    const starterShip = makeShip(SAMPLE_SHIP_SPECS.find(s => s.id === 'BULK-HANDY')!, 'Ocean Pioneer', 'SGSIN', -8 * 365, 0);

    const freightMarket = createFreightMarket(0);
    const initialContracts = Array.from({ length: 12 }, () => {
      const contract = generateRandomContract(SAMPLE_PORTS, freightMarket);
      return { ...contract, createdDay: 0 };
    });
    set({
      simulationDay: 0,
      cash: initialCash,
      difficulty: difficulty || 'Normal',
      companyName: companyName || '',
      founderName: founderName || '',
      fleet: [starterShip],
      secondhandOffers: generateSecondhandOffers(SAMPLE_SHIP_SPECS, SAMPLE_PORTS, freightMarket, 0, uuidv4),
      charterOffers: generateCharterOffers(SAMPLE_SHIP_SPECS, SAMPLE_PORTS, freightMarket, 0, uuidv4),
      newbuildOrders: [],
      contracts: initialContracts,
      npcCompanies: [],
      rankings: [],
      marketNews: [],
      reputation: 50,
      freightMarket,
      storms: Array.from({ length: 6 }).reduce<GameState['storms']>(
        storms => advanceStorms(storms, get().marketConditions.season).storms,
        [],
      ),
    });
    
    // Initialize NPC companies after setting initial state
    get().initializeNPCCompanies();
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

    get().chargeOperatingCosts();

    // Update voyages and trigger events
    get().updateVoyages();
    get().updateContractExpiration();
    get().maintainContractPool();
    get().triggerRandomEvents();
    get().triggerWeatherEvents();
    get().updateFuelPrices();
    get().triggerEconomicCycles();
    get().triggerGlobalEvents();
    get().updateFreightMarket();
    get().updateShipMarket();
    get().simulateMarketCompetition();
    get().simulateNPCActions();
    get().updateRankings();
    get().checkAchievements();
    get().payLoanInstallments();
    get().checkMaintenanceNeeds();
    get().processAutoContracts();
    get().triggerDetailedRandomEvents();
  },

  // Order a ship from the yard: a deposit now, the rest on delivery.
  orderNewbuild: (specId, name) => {
    const state = get();
    const spec = state.shipSpecs.find(s => s.id === specId);
    if (!spec) return;
    const price = shipPrice(state.freightMarket, spec);
    const deposit = Math.round(price * NEWBUILD_DEPOSIT);
    if (state.cash < deposit) return;
    set(prev => ({
      cash: prev.cash - deposit,
      totalCosts: prev.totalCosts,
      newbuildOrders: [
        ...prev.newbuildOrders,
        {
          id: uuidv4(),
          specId,
          name,
          orderDay: state.simulationDay,
          deliveryDay: state.simulationDay + NEWBUILD_DAYS,
          price,
          paid: deposit,
        },
      ],
    }));
  },

  buySecondhand: (offerId, name) => {
    const state = get();
    const offer = state.secondhandOffers.find(o => o.id === offerId);
    const spec = offer && state.shipSpecs.find(s => s.id === offer.specId);
    if (!offer || !spec || state.cash < offer.price) return;
    set(prev => ({
      cash: prev.cash - offer.price,
      fleet: [...prev.fleet, makeShip(spec, name, offer.port, offer.builtDay, state.simulationDay)],
      secondhandOffers: prev.secondhandOffers.filter(o => o.id !== offerId),
    }));
  },

  sellShip: (shipId) => {
    const state = get();
    const ship = state.fleet.find(s => s.id === shipId);
    const spec = ship && state.shipSpecs.find(s => s.id === ship.specId);
    if (!ship || !spec || ship.status !== 'idle' || ship.charter) return;
    const value = shipValue(state.freightMarket, spec, ship.builtDay, state.simulationDay);
    set(prev => ({
      cash: prev.cash + value,
      fleet: prev.fleet.filter(s => s.id !== shipId),
      marketNews: prependNews(prev.marketNews, [
        {
          id: `news-${uuidv4()}`,
          type: 'company_expansion' as const,
          companyId: 'player',
          message: `${ship.name}を${prev.formatCurrency(value)}で売却しました`,
          day: state.simulationDay,
          impact: 'neutral' as const,
        },
      ]),
    }));
  },

  charterIn: (offerId, name) => {
    const state = get();
    const offer = state.charterOffers.find(o => o.id === offerId);
    const spec = offer && state.shipSpecs.find(s => s.id === offer.specId);
    if (!offer || !spec) return;
    const ship: ShipInstance = {
      ...makeShip(spec, name, offer.port, offer.builtDay, state.simulationDay),
      charter: { kind: 'in', dailyHire: offer.dailyHire, endDay: state.simulationDay + offer.days },
    };
    set(prev => ({
      fleet: [...prev.fleet, ship],
      charterOffers: prev.charterOffers.filter(o => o.id !== offerId),
    }));
  },

  charterOut: (shipId, days) => {
    const state = get();
    const ship = state.fleet.find(s => s.id === shipId);
    const spec = ship && state.shipSpecs.find(s => s.id === ship.specId);
    if (!ship || !spec || ship.status !== 'idle' || ship.charter) return;
    const dailyHire = charterHire(state.freightMarket, spec);
    set(prev => ({
      fleet: prev.fleet.map(s =>
        s.id === shipId
          ? { ...s, status: 'chartered_out' as const, charter: { kind: 'out' as const, dailyHire, endDay: state.simulationDay + days } }
          : s,
      ),
    }));
  },

  // Daily: deliver newbuilds, end time charters, refresh the sale and
  // charter lists once a month.
  updateShipMarket: () => {
    const state = get();
    const day = state.simulationDay;
    const news: string[] = [];

    const delivered = state.newbuildOrders.filter(o => o.deliveryDay <= day);
    const newShips = delivered.flatMap(order => {
      const spec = state.shipSpecs.find(s => s.id === order.specId);
      if (!spec) return [];
      news.push(`新造船${order.name}が竣工し、上海の造船所で引き渡されました`);
      return [makeShip(spec, order.name, SHIPYARD_PORT, day, day)];
    });
    const balanceDue = delivered.reduce((sum, o) => sum + (o.price - o.paid), 0);

    const fleet: ShipInstance[] = [];
    for (const ship of state.fleet) {
      if (ship.charter && day >= ship.charter.endDay) {
        if (ship.charter.kind === 'in' && ship.status === 'idle') {
          news.push(`用船していた${ship.name}を船主に返しました`);
          continue;
        }
        if (ship.charter.kind === 'out') {
          news.push(`貸し出していた${ship.name}が戻りました`);
          fleet.push({ ...ship, status: 'idle', charter: undefined });
          continue;
        }
      }
      fleet.push(ship);
    }

    const refresh = day % 30 === 0;
    set(prev => ({
      fleet: [...fleet, ...newShips],
      newbuildOrders: prev.newbuildOrders.filter(o => o.deliveryDay > day),
      cash: prev.cash - balanceDue,
      secondhandOffers: refresh
        ? generateSecondhandOffers(prev.shipSpecs, prev.ports, prev.freightMarket, day, uuidv4)
        : prev.secondhandOffers,
      charterOffers: refresh
        ? generateCharterOffers(prev.shipSpecs, prev.ports, prev.freightMarket, day, uuidv4)
        : prev.charterOffers,
      marketNews: prependNews(
        prev.marketNews,
        news.map(message => ({
          id: `news-${uuidv4()}`,
          type: 'company_expansion' as const,
          companyId: 'player',
          message,
          day,
          impact: 'neutral' as const,
        })),
      ),
    }));
  },

  generateContracts: () => {
    const state = get();
    const newContracts = Array.from({ length: 6 }, () => {
      const contract = generateRandomContract(state.ports, state.freightMarket);
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
          // Calculate daily progress more accurately
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

  assignContract: (contractId, shipId, route) => {
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
    setTimeout(() => get().startVoyage(shipId, contractId, route), 100);
  },

  startVoyage: (shipId, contractId, chosenRoute) => {
    const state = get();
    const ship = state.fleet.find(s => s.id === shipId);
    const contract = state.contracts.find(c => c.id === contractId);
    const shipSpec = state.shipSpecs.find(s => s.id === ship?.specId);
    
    if (!ship || !contract || !shipSpec) return;

    const route = chosenRoute ?? get().getRouteOptionsFor(shipId, contractId)[0];
    const ballast = get().getBallastRoute(shipId, contractId);
    const estimate = get().calculateVoyageCosts(shipId, contractId, route);
    // Running costs are charged day by day, so only the trip's own costs go now.
    const paidNow = estimate.fuel + estimate.port + estimate.cargo;

    // The ship first sails empty to the loading port, then carries the cargo.
    const points = route?.points && ballast ? [...ballast.points, ...route.points.slice(1)] : route?.points;
    const routeNm = route ? route.distanceNm + estimate.ballastNm : undefined;

    const voyage: Voyage = {
      id: uuidv4(),
      shipId,
      contractId,
      startDay: state.simulationDay,
      estimatedDays: estimate.days,
      currentProgress: 0,
      route: points,
      routeLabel: route?.label,
      routeNm,
      ballastNm: estimate.ballastNm,
      costs: estimate,
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
              etaDay: state.simulationDay + estimate.days 
            }
          : s
      ),
      cash: prevState.cash - paidNow,
      totalCosts: prevState.totalCosts + paidNow,
    }));
  },

  updateVoyages: () => {
    const state = get();

    const progressed = state.activeVoyages.map(voyage => {
      // Storms slow a ship down for the day it spends inside them.
      const storm = voyage.route && stormAt(state.storms, pointAlongRoute(voyage.route, voyage.currentProgress));
      const speedFactor = storm ? STORM_KINDS[storm.kind].speedFactor : 1;
      return {
        ...voyage,
        currentProgress: Math.min(1, voyage.currentProgress + speedFactor / voyage.estimatedDays),
        estimatedDays: voyage.estimatedDays + (1 - speedFactor),
      };
    });

    const arrived = progressed.filter(v => v.currentProgress >= 1);
    if (arrived.length === 0) {
      set({ activeVoyages: progressed });
      return;
    }

    const arrivedByShip = new Map(arrived.map(v => [v.shipId, v]));
    const arrivedContracts = new Set(arrived.map(v => v.contractId));
    const contractById = new Map(state.contracts.map(c => [c.id, c]));

    let revenue = 0;
    let reputation = state.reputation;
    const news: GameState['marketNews'] = [];
    const repeats: CargoContract[] = [];

    arrived.forEach(voyage => {
      const ship = state.fleet.find(s => s.id === voyage.shipId);
      const contract = contractById.get(voyage.contractId);
      if (!ship || !contract) return;

      revenue += voyage.revenue;
      // Bonus for an event-free voyage
      reputation = Math.min(100, reputation + (voyage.events.length === 0 ? 2 : 1));
      news.push({
        id: `news-${uuidv4()}`,
        type: 'contract_win',
        companyId: 'player',
        message: `${ship.name}が${contract.origin}から${contract.destination}への${contract.cargoType}輸送を完了しました`,
        day: state.simulationDay,
        impact: 'positive',
      });

      // Long-term contracts come back for the next run
      if (contract.contractType === 'long_term' && contract.repeatCount && contract.repeatCount > 1) {
        repeats.push({
          ...contract,
          id: uuidv4(),
          status: 'available',
          repeatCount: contract.repeatCount - 1,
          createdDay: state.simulationDay,
          expiresDay: contract.duration || 30,
        });
      }
    });

    set({
      activeVoyages: progressed.filter(v => v.currentProgress < 1),
      completedVoyages: [...state.completedVoyages, ...arrived],
      fleet: state.fleet.map(ship => {
        const voyage = arrivedByShip.get(ship.id);
        if (!voyage) return ship;
        const contract = contractById.get(voyage.contractId);
        return {
          ...ship,
          status: 'idle' as const,
          currentPort: contract?.destination ?? ship.currentPort,
          destPort: undefined,
          contractId: undefined,
          etaDay: 0,
          totalDistance: (ship.totalDistance ?? 0) + (voyage.routeNm ?? contract?.distanceNm ?? 0),
        };
      }),
      contracts: [
        ...state.contracts.map(c => (arrivedContracts.has(c.id) ? { ...c, status: 'completed' as const } : c)),
        ...repeats,
      ],
      cash: state.cash + revenue,
      totalRevenue: state.totalRevenue + revenue,
      completedContracts: state.completedContracts + arrived.length,
      reputation,
      marketNews: prependNews(state.marketNews, news),
    });

    // Ships on auto-contract look for their next job where they arrived.
    arrived.forEach(voyage => {
      const ship = get().fleet.find(s => s.id === voyage.shipId);
      if (!ship?.autoContract) return;
      const next = get().contracts.find(c =>
        c.status === 'available' &&
        ship.autoSettings.preferredCargoTypes.includes(c.cargoType) &&
        c.distanceNm <= ship.autoSettings.maxDistance
      );
      if (!next) return;
      const costs = get().calculateVoyageCosts(ship.id, next.id);
      const nextRevenue = next.amount * next.freightRate;
      if (((nextRevenue - costs.total) / nextRevenue) * 100 >= ship.autoSettings.minProfitMargin) {
        get().assignContract(next.id, ship.id);
      }
    });
  },

  chargeOperatingCosts: () => {
    const state = get();
    // Hired ships cost their hire (the owner runs them); ships we hire out
    // still cost us their upkeep but earn hire.
    const total = state.fleet.reduce((sum, ship) => {
      const spec = state.shipSpecs.find(s => s.id === ship.specId);
      if (ship.charter?.kind === 'in') return sum + ship.charter.dailyHire;
      const hireEarned = ship.charter?.kind === 'out' ? ship.charter.dailyHire : 0;
      return sum + (spec ? dailyOperatingCost(spec) : 0) - hireEarned;
    }, 0);
    if (total === 0) return;
    set(prev => ({
      cash: prev.cash - total,
      totalCosts: prev.totalCosts + Math.max(0, total),
      totalRevenue: prev.totalRevenue + Math.max(0, -total),
    }));
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
        const contract = generateRandomContract(state.ports, state.freightMarket);
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

    // Basic fuel surge (complementing the detailed fuel system)
    if (Math.random() < EVENT_PROBABILITIES.fuel_surge * multiplier.probability) {
      const event: VoyageEvent = {
        id: uuidv4(),
        type: 'fuel_surge',
        message: '燃料価格が急騰しています',
        day: state.simulationDay,
        impact: { costMultiplier: 1.5 * multiplier.effect },
        duration: 7,
        severity: 'moderate',
        affectedRegions: ['Global'],
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

  triggerWeatherEvents: () => {
    const state = get();
    const { storms, spawned } = advanceStorms(state.storms, state.marketConditions.season);

    spawned
      .filter(storm => storm.kind !== 'fog')
      .forEach(storm => {
        get().generateMarketNews('weather', 'global', `${storm.areaName}で${STORM_KINDS[storm.kind].label}が発生しました`);
      });

    const damage: Record<string, number> = {};
    const activeVoyages = state.activeVoyages.map(voyage => {
      const ship = state.fleet.find(s => s.id === voyage.shipId);
      if (!ship || !voyage.route) return voyage;

      const storm = stormAt(storms, pointAlongRoute(voyage.route, voyage.currentProgress));
      if (!storm) return voyage.stormId ? { ...voyage, stormId: undefined } : voyage;

      const info = STORM_KINDS[storm.kind];
      damage[ship.id] = info.damagePerDay;
      if (voyage.stormId === storm.id) return voyage;

      const message = `${ship.name}が${storm.areaName}の${info.label}に入り、減速しています`;
      get().generateMarketNews('weather', 'player', message);
      const event: VoyageEvent = {
        id: uuidv4(),
        type: storm.kind === 'fog' ? 'fog_delay' : storm.kind === 'winter_storm' ? 'winter_storm' : 'typhoon',
        message,
        day: state.simulationDay,
        impact: {},
        duration: storm.daysLeft,
        severity: info.damagePerDay >= 3 ? 'severe' : info.damagePerDay > 0 ? 'moderate' : 'minor',
      };
      return { ...voyage, stormId: storm.id, events: [...voyage.events, event] };
    });

    set(prevState => ({
      storms,
      activeVoyages: prevState.activeVoyages.map(v => activeVoyages.find(u => u.id === v.id) ?? v),
      fleet: prevState.fleet.map(ship =>
        damage[ship.id]
          ? { ...ship, condition: Math.max(0, (ship.condition ?? 100) - damage[ship.id]) }
          : ship
      ),
    }));
  },

  updateFuelPrices: () => {
    const state = get();
    const factors = FUEL_PRICE_FACTORS;
    const fuel = state.marketConditions.fuelPrices;

    // Prices wander around a level set by season, tension and events.
    const eventMultiplier = state.newGlobalEvents
      .filter(e => e.effects.fuelPriceMultiplier && state.simulationDay >= e.startDay && state.simulationDay < e.startDay + e.duration)
      .reduce((m, e) => m * (e.effects.fuelPriceMultiplier ?? 1), 1);
    const target =
      COST_FACTORS.fuel.VLSFO *
      factors.seasonalMultipliers[state.marketConditions.season] *
      (1 + (state.marketConditions.geopoliticalTension - 30) * factors.geopoliticalMultiplier * 3) *
      eventMultiplier;
    const noise = (Math.random() - 0.5) * factors.baseVolatility * 1.2;
    const VLSFO = Math.min(1400, Math.max(350, fuel.VLSFO + (target - fuel.VLSFO) * 0.02 + fuel.VLSFO * noise));
    const HFO = VLSFO * (COST_FACTORS.fuel.HFO / COST_FACTORS.fuel.VLSFO);

    const priceDiff = VLSFO - fuel.VLSFO;
    set(prevState => ({
      marketConditions: {
        ...prevState.marketConditions,
        fuelPrices: {
          VLSFO,
          HFO,
          trend: priceDiff > 5 ? 'rising' : priceDiff < -5 ? 'falling' : 'stable',
          volatility: fuel.volatility,
          lastChange: state.simulationDay,
        },
      },
      fuelPrice: VLSFO,
    }));
  },

  updateFreightMarket: () => {
    const state = get();
    const day = state.simulationDay;
    const { economicClimate, season } = state.marketConditions;

    // Cargo demand per segment, as a small tilt around normal: the freight
    // market's own supply/demand turns small tilts into big rate swings.
    const activeEvents = state.newGlobalEvents.filter(
      e => e.type !== 'seasonal_demand' && day >= e.startDay && day < e.startDay + e.duration,
    );
    const demand = Object.fromEntries(
      MARKET_SEGMENTS.map(segment => {
        let factor =
          1 +
          (ECONOMIC_CYCLES[economicClimate].demandMultiplier[segment] - 1) * 0.2 +
          (SEASONAL_DEMAND_MULTIPLIERS[season][segment] - 1) * 0.1;
        for (const e of activeEvents) {
          factor += ((e.effects.demandMultiplier?.[segment] ?? 1) - 1) * 0.2;
          // Blocked canals and longer detours tie up ships, like extra cargo.
          factor += ((e.effects.contractPriceMultiplier ?? 1) - 1) * 0.1;
        }
        return [segment, factor];
      }),
    ) as Record<MarketSegment, number>;

    const before = state.freightMarket;
    const after = stepMarket(before, day, demand);

    const news: { text: string; up: boolean }[] = [];
    for (const segment of MARKET_SEGMENTS) {
      const was = before.segments[segment].index;
      const now = after.segments[segment].index;
      const label = SEGMENT_LABEL[segment];
      const crossed = (level: number) => (was < level && now >= level) || (was >= level && now < level);
      if (crossed(2) && now >= 2) news.push({ text: `${label}の運賃が平年の2倍を超えました。船が足りていません`, up: true });
      else if (crossed(1.5) && now >= 1.5) news.push({ text: `${label}の運賃が高騰しています（平年の1.5倍）`, up: true });
      else if (crossed(0.7) && now < 0.7) news.push({ text: `${label}の運賃が低迷しています（平年の7割を割り込み）。船余りです`, up: false });
      else if (crossed(1) && now >= 1 && was < 0.85) news.push({ text: `${label}の運賃が平年並みに戻りました`, up: true });
    }

    set(prev => ({
      freightMarket: after,
      marketNews: prependNews(
        prev.marketNews,
        news.map(n => ({
          id: `news-${uuidv4()}`,
          type: 'market_entry' as const,
          companyId: 'global',
          message: n.text,
          day,
          impact: n.up ? ('positive' as const) : ('negative' as const),
        })),
      ),
    }));
  },

  triggerEconomicCycles: () => {
    const state = get();
    
    // The world economy may turn every half year; freight markets amplify it.
    if (state.simulationDay > 0 && state.simulationDay % 180 === 0 && Math.random() < 0.7) {
      const currentClimate = state.marketConditions.economicClimate;
      let newClimate = currentClimate;
      
      // Transition probabilities based on current state
      const transitions = {
        recession: { stable: 0.6, growth: 0.3, recession: 0.1 },
        stable: { recession: 0.2, growth: 0.4, boom: 0.1, stable: 0.3 },
        growth: { stable: 0.3, boom: 0.4, recession: 0.1, growth: 0.2 },
        boom: { growth: 0.5, stable: 0.3, recession: 0.2 },
      };
      
      const rand = Math.random();
      let cumulative = 0;
      
      for (const [climate, probability] of Object.entries(transitions[currentClimate])) {
        cumulative += probability;
        if (rand < cumulative) {
          newClimate = climate as any;
          break;
        }
      }
      
      if (newClimate !== currentClimate) {
        const cycleData = ECONOMIC_CYCLES[newClimate];
        
        set(prevState => ({
          marketConditions: {
            ...prevState.marketConditions,
            economicClimate: newClimate as any,
            demandMultipliers: cycleData.demandMultiplier,
            competitionLevel: Math.min(100, Math.max(0, 
              prevState.marketConditions.competitionLevel * cycleData.competitionMultiplier
            )),
          },
        }));
        
        // Generate news about economic change
        const economicNews = {
          recession: '世界経済が不況に突入しました',
          stable: '経済が安定期に入りました',
          growth: '経済成長期が始まりました',
          boom: '経済ブームが到来しました',
        };
        
        get().generateMarketNews('market_entry', 'global', economicNews[newClimate]);
      }
    }
  },

  simulateMarketCompetition: () => {
    const state = get();
    
    // Adjust competition level based on number of companies and market conditions
    const totalCompanies = state.npcCompanies.length + 1; // +1 for player
    const baseCompetition = Math.min(100, totalCompanies * 8); // More companies = more competition
    
    // Economic climate affects competition
    const economicMultiplier = {
      recession: 1.4, // Fierce competition for fewer contracts
      stable: 1.0,
      growth: 0.8,
      boom: 0.6, // Plenty of opportunities
    }[state.marketConditions.economicClimate];
    
    const newCompetitionLevel = Math.min(100, baseCompetition * economicMultiplier);
    
    set(prevState => ({
      marketConditions: {
        ...prevState.marketConditions,
        competitionLevel: newCompetitionLevel,
      },
    }));
    
    // High competition reduces contract availability
    if (newCompetitionLevel > 80 && Math.random() < 0.1) {
      // Remove some available contracts (taken by competitors)
      const availableContracts = state.contracts.filter(c => c.status === 'available');
      if (availableContracts.length > 3) {
        const contractToRemove = availableContracts[Math.floor(Math.random() * availableContracts.length)];
        set(prevState => ({
          contracts: prevState.contracts.map(c =>
            c.id === contractToRemove.id ? { ...c, status: 'assigned' as const } : c
          ),
        }));
      }
    }
  },

  triggerGlobalEvents: () => {
    const state = get();
    
    // Check for major global events
    Object.entries(GLOBAL_EVENT_TEMPLATES).forEach(([eventType, template]) => {
      if (Math.random() < template.probability) {
        const duration = template.duration[0] + Math.random() * (template.duration[1] - template.duration[0]);
        
        const globalEvent: GlobalEvent = {
          id: uuidv4(),
          type: eventType as GlobalEventType,
          title: template.title,
          description: template.description,
          startDay: state.simulationDay,
          duration: Math.floor(duration),
          severity: Math.random() < 0.1 ? 'critical' : Math.random() < 0.3 ? 'severe' : 'moderate',
          effects: template.effects,
          affectedRegions: template.affectedRegions,
          chainEvents: template.chainEvents,
        };
        
        set(prevState => ({
          newGlobalEvents: [...prevState.newGlobalEvents, globalEvent],
        }));
        
        // Generate market news
        get().generateMarketNews('market_entry', 'global', `${template.title}: ${template.description}`);
        
        // Trigger chain events
        if (template.chainEvents && Math.random() < 0.3) {
          template.chainEvents.forEach(chainEventType => {
            if (GLOBAL_EVENT_TEMPLATES[chainEventType]) {
              setTimeout(() => {
                const chainTemplate = GLOBAL_EVENT_TEMPLATES[chainEventType];
                const chainEvent: GlobalEvent = {
                  id: uuidv4(),
                  type: chainEventType as GlobalEventType,
                  title: chainTemplate.title,
                  description: `${template.title}の影響で${chainTemplate.description}`,
                  startDay: state.simulationDay + Math.floor(Math.random() * 30),
                  duration: Math.floor(chainTemplate.duration[0] + Math.random() * (chainTemplate.duration[1] - chainTemplate.duration[0])),
                  severity: 'moderate',
                  effects: chainTemplate.effects,
                  affectedRegions: chainTemplate.affectedRegions,
                };
                
                set(prevState => ({
                  newGlobalEvents: [...prevState.newGlobalEvents, chainEvent],
                }));
              }, 1000);
            }
          });
        }
      }
    });
    
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
        severity: 'minor',
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
        severity: isPositive ? 'moderate' : 'severe',
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
    
    // Clean up expired global events
    set(prevState => ({
      newGlobalEvents: prevState.newGlobalEvents.filter(event => 
        state.simulationDay < event.startDay + event.duration
      ),
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
        // Ship aging and condition degradation
        // Age ships (1 day = 1 day in game time)
        ship.ageYear += 1 / 365;
        
        // Condition degradation (2% per month = ~0.067% per day)
        ship.condition = Math.max(0, (ship.condition || 100) - 0.067);
        
        // Increase maintenance costs with age
        const ageFactor = 1 + (ship.ageYear * 0.05); // 5% increase per year
        ship.maintenanceCost = (state.shipSpecs.find(s => s.id === ship.specId)?.buildCost || 0) * 0.005 / 365 * ageFactor;
        
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

  triggerDetailedRandomEvents: () => {
    const state = get();
    const multiplier = DIFFICULTY_MULTIPLIERS[state.difficulty];

    // E2: 港ストライキ (0.5% per port per day)
    state.ports.forEach(port => {
      if (Math.random() < RANDOM_EVENTS.E2.probability * multiplier.probability) {
        const event: GlobalEvent = {
          id: uuidv4(),
          type: 'port_strike',
          title: `${port.name}港ストライキ`,
          description: `${port.name}港で労働争議が発生し、荷役作業が停止しています`,
          startDay: state.simulationDay,
          duration: RANDOM_EVENTS.E2.duration,
          severity: RANDOM_EVENTS.E2.severity,
          effects: {
            portEfficiencyMultiplier: 0, // Port completely closed
          },
          affectedRegions: [port.continent],
        };

        set(prevState => ({
          newGlobalEvents: [...prevState.newGlobalEvents, event],
        }));

        get().generateMarketNews('port_strike', 'global', `${port.name}港でストライキが発生`);
      }
    });

    // E3: 海賊被害 (0.2% per ship in risk zones)
    state.fleet.filter(s => s.status === 'sailing').forEach(ship => {
      const riskZone = get().isShipInRiskZone(ship.id);
      if (riskZone && Math.random() < RANDOM_EVENTS.E3.probability * multiplier.probability) {
        const isDelay = Math.random() < 0.7; // 70% chance for delay, 30% for insurance cost
        
        const event: VoyageEvent = {
          id: uuidv4(),
          type: 'piracy',
          message: isDelay 
            ? `${ship.name}が${riskZone}で海賊の脅威により迂回航行を余儀なくされています`
            : `${ship.name}が${riskZone}で海賊被害を受け、保険料が上昇しました`,
          day: state.simulationDay,
          impact: isDelay 
            ? { delayDays: 2, costMultiplier: RANDOM_EVENTS.E3.effects.voyageDelayMultiplier }
            : { insuranceMultiplier: RANDOM_EVENTS.E3.effects.insuranceMultiplier },
          duration: RANDOM_EVENTS.E3.duration,
          severity: RANDOM_EVENTS.E3.severity,
          riskZone,
        };

        set(prevState => ({
          activeVoyages: prevState.activeVoyages.map(v =>
            v.shipId === ship.id
              ? { 
                  ...v, 
                  events: [...v.events, event],
                  estimatedDays: isDelay ? v.estimatedDays * RANDOM_EVENTS.E3.effects.voyageDelayMultiplier : v.estimatedDays,
                  costs: isDelay ? v.costs : {
                    ...v.costs,
                    total: v.costs.total * RANDOM_EVENTS.E3.effects.insuranceMultiplier,
                  }
                }
              : v
          ),
        }));
      }
    });

    // E4: 燃料高騰 (0.1% global per day)
    if (Math.random() < RANDOM_EVENTS.E4.probability * multiplier.probability) {
      const event: GlobalEvent = {
        id: uuidv4(),
        type: 'fuel_surge',
        title: '燃料価格急騰',
        description: '地政学的要因により燃料価格が急激に上昇しています',
        startDay: state.simulationDay,
        duration: RANDOM_EVENTS.E4.duration,
        severity: RANDOM_EVENTS.E4.severity,
        effects: {
          fuelPriceMultiplier: RANDOM_EVENTS.E4.effects.fuelPriceMultiplier,
        },
      };

      set(prevState => ({
        newGlobalEvents: [...prevState.newGlobalEvents, event],
        fuelPrice: prevState.fuelPrice * RANDOM_EVENTS.E4.effects.fuelPriceMultiplier,
      }));

      get().generateMarketNews('fuel_surge', 'global', '燃料価格が50%急騰');
    }

    // E5: 需要急増 (0.2% per cargo type per day)
    const cargoTypes: CargoType[] = ['Container', 'Car', 'Bulk', 'Oil', 'Passenger'];
    cargoTypes.forEach(cargoType => {
      if (Math.random() < RANDOM_EVENTS.E5.probability * multiplier.probability) {
        const event: GlobalEvent = {
          id: uuidv4(),
          type: 'demand_surge',
          title: `${cargoType}需要急増`,
          description: `${cargoType}貨物の需要が急激に増加し、運賃が上昇しています`,
          startDay: state.simulationDay,
          duration: RANDOM_EVENTS.E5.duration,
          severity: RANDOM_EVENTS.E5.severity,
          effects: {
            demandMultiplier: { [cargoType]: RANDOM_EVENTS.E5.effects.freightRateMultiplier } as Record<CargoType, number>,
          },
          cargoType,
        };

        set(prevState => ({
          newGlobalEvents: [...prevState.newGlobalEvents, event],
        }));

        get().generateMarketNews('demand_surge', 'global', `${cargoType}貨物の需要が急増`);
      }
    });
  },

  isShipInRiskZone: (shipId) => {
    const state = get();
    const ship = state.fleet.find(s => s.id === shipId);
    if (!ship || ship.status !== 'sailing') return null;

    const voyage = state.activeVoyages.find(v => v.shipId === shipId);
    if (!voyage) return null;

    if (!voyage.route) return null;
    return pirateZoneAt(pointAlongRoute(voyage.route, voyage.currentProgress));
  },

  getRouteOptionsFor: (shipId, contractId) => {
    const state = get();
    const ship = state.fleet.find(s => s.id === shipId);
    const contract = state.contracts.find(c => c.id === contractId);
    const spec = state.shipSpecs.find(s => s.id === ship?.specId);
    const origin = state.ports.find(p => p.LOCODE === contract?.origin);
    const dest = state.ports.find(p => p.LOCODE === contract?.destination);
    if (!origin || !dest) return [];
    return getRouteOptions(origin, dest, spec);
  },

  // Shortest way for the ship to reach the loading port empty, or null if
  // it is already there.
  getBallastRoute: (shipId, contractId) => {
    const state = get();
    const ship = state.fleet.find(s => s.id === shipId);
    const contract = state.contracts.find(c => c.id === contractId);
    if (!ship || !contract || ship.currentPort === contract.origin) return null;
    const spec = state.shipSpecs.find(s => s.id === ship.specId);
    const from = state.ports.find(p => p.LOCODE === ship.currentPort);
    const to = state.ports.find(p => p.LOCODE === contract.origin);
    if (!from || !to) return null;
    return getRouteOptions(from, to, spec)[0] ?? null;
  },

  calculateVoyageCosts: (shipId, contractId, route) => {
    const state = get();
    const ship = state.fleet.find(s => s.id === shipId);
    const contract = state.contracts.find(c => c.id === contractId);
    const shipSpec = state.shipSpecs.find(s => s.id === ship?.specId);
    const originPort = state.ports.find(p => p.LOCODE === contract?.origin);
    const destPort = state.ports.find(p => p.LOCODE === contract?.destination);

    if (!ship || !contract || !shipSpec || !originPort || !destPort) {
      return { fuel: 0, port: 0, cargo: 0, opex: 0, total: 0, days: 0, ballastNm: 0, ballastDays: 0 };
    }

    // Costs follow the sea route; the shortest one unless a route is chosen.
    const seaRoute = route ?? get().getRouteOptionsFor(shipId, contractId)[0];
    const ballast = get().getBallastRoute(shipId, contractId);
    const ballastNm = ballast?.distanceNm ?? 0;
    const ladenNm = seaRoute?.distanceNm ?? contract.distanceNm;
    const distanceNm = ballastNm + ladenNm;
    const toDays = (nm: number) => Math.ceil(nm / shipSpec.speedKt / 24);
    // Sea days plus loading and discharging.
    const days = toDays(distanceNm) + PORT_DAYS * 2;

    const fuel = (distanceNm / 100) * shipSpec.fuelBurn100nm * state.fuelPrice;
    // Port dues grow with the ship's size.
    const sizeFactor = Math.max(1, Math.sqrt(shipSpec.dwtOrGt / 30000));
    const port =
      (originPort.fees.port + destPort.fees.port) * sizeFactor + (seaRoute?.canalFee ?? 0) + (ballast?.canalFee ?? 0);
    const cargo = HANDLING_PAID_BY_OWNER[contract.cargoType]
      ? contract.amount * (originPort.fees.cargo[contract.cargoType] + destPort.fees.cargo[contract.cargoType]) / 2
      : 0;
    const opex = dailyOperatingCost(shipSpec) * days;

    const total = fuel + port + cargo + opex;

    return { fuel, port, cargo, opex, total, days, ballastNm, ballastDays: ballastNm > 0 ? toDays(ballastNm) : 0 };
  },

  initializeNPCCompanies: () => {
    const state = get();
    const numNPCs = Math.min(5, NPC_COMPANY_NAMES.length);
    const selectedCompanies = NPC_COMPANY_NAMES.slice(0, numNPCs);
    const strategies: NPCStrategy[] = ['aggressive', 'conservative', 'balanced', 'opportunistic', 'balanced'];
    
    const npcCompanies = selectedCompanies.map((company, index) => ({
      id: uuidv4(),
      name: company.name,
      founderName: company.founder,
      type: 'npc' as const,
      strategy: strategies[index],
      cash: state.cash * (0.5 + Math.random() * 0.5), // 50-100% of player's starting cash
      reputation: 40 + Math.random() * 20, // 40-60 reputation
      fleetSize: 1 + Math.floor(Math.random() * 2), // 1-2 ships
      totalRevenue: 0,
      totalCosts: 0,
      completedContracts: 0,
      marketShare: 0,
      lastAction: 'Company founded',
      founded: state.simulationDay,
      color: company.color,
    }));
    
    set({ npcCompanies });
  },

  simulateNPCActions: () => {
    const state = get();
    
    state.npcCompanies.forEach(npc => {
      const strategy = NPC_STRATEGIES[npc.strategy];
      
      // Simulate contract completion and revenue
      if (Math.random() < 0.1) { // 10% chance per day to complete a contract
        const revenue = 500000 + Math.random() * 1000000; // Random revenue
        const costs = revenue * (0.6 + Math.random() * 0.2); // 60-80% cost ratio
        
        set(prevState => ({
          npcCompanies: prevState.npcCompanies.map(company =>
            company.id === npc.id
              ? {
                  ...company,
                  totalRevenue: company.totalRevenue + revenue,
                  totalCosts: company.totalCosts + costs,
                  cash: company.cash + (revenue - costs),
                  completedContracts: company.completedContracts + 1,
                  reputation: Math.min(100, company.reputation + 0.5),
                  lastAction: 'Completed voyage',
                }
              : company
          ),
        }));
        
        // Generate market news
        if (Math.random() < 0.3) {
          get().generateMarketNews('contract_win', npc.id, `${npc.name} secured a major shipping contract`);
        }
      }
      
      // Simulate fleet expansion
      if (Math.random() < strategy.expansionRate * 0.01 && npc.cash > 20000000) { // Expansion chance
        const shipCost = 15000000 + Math.random() * 50000000;
        if (npc.cash >= shipCost) {
          set(prevState => ({
            npcCompanies: prevState.npcCompanies.map(company =>
              company.id === npc.id
                ? {
                    ...company,
                    cash: company.cash - shipCost,
                    fleetSize: company.fleetSize + 1,
                    lastAction: 'Expanded fleet',
                  }
                : company
            ),
          }));
          
          get().generateMarketNews('company_expansion', npc.id, `${npc.name} adds new vessel to fleet`);
        }
      }
      
      // Simulate market competition (reduce available contracts)
      if (Math.random() < strategy.contractSelectivity) {
        const availableContracts = state.contracts.filter(c => c.status === 'available');
        if (availableContracts.length > 0) {
          const contractToTake = availableContracts[Math.floor(Math.random() * availableContracts.length)];
          
          set(prevState => ({
            contracts: prevState.contracts.map(c =>
              c.id === contractToTake.id ? { ...c, status: 'assigned' as const } : c
            ),
          }));
        }
      }
    });
  },

  updateRankings: () => {
    const state = get();
    
    // Calculate player metrics
    const playerProfit = state.totalRevenue - state.totalCosts;
    const playerScore = (
      playerProfit * 0.4 +
      state.reputation * 10000 +
      state.fleet.length * 50000 +
      state.completedContracts * 10000
    );
    
    // Create ranking entries
    const allCompanies = [
      {
        companyId: 'player',
        companyName: state.companyName || 'Your Company',
        score: playerScore,
        metrics: {
          revenue: state.totalRevenue,
          profit: playerProfit,
          fleetSize: state.fleet.length,
          reputation: state.reputation,
          marketShare: 0, // Will be calculated
        },
      },
      ...state.npcCompanies.map(npc => ({
        companyId: npc.id,
        companyName: npc.name,
        score: (
          (npc.totalRevenue - npc.totalCosts) * 0.4 +
          npc.reputation * 10000 +
          npc.fleetSize * 50000 +
          npc.completedContracts * 10000
        ),
        metrics: {
          revenue: npc.totalRevenue,
          profit: npc.totalRevenue - npc.totalCosts,
          fleetSize: npc.fleetSize,
          reputation: npc.reputation,
          marketShare: 0, // Will be calculated
        },
      })),
    ];
    
    // Sort by score and assign ranks
    allCompanies.sort((a, b) => b.score - a.score);
    
    // Calculate market share
    const totalRevenue = allCompanies.reduce((sum, company) => sum + company.metrics.revenue, 0);
    allCompanies.forEach(company => {
      company.metrics.marketShare = totalRevenue > 0 ? (company.metrics.revenue / totalRevenue) * 100 : 0;
    });
    
    const rankings = allCompanies.map((company, index) => {
      const previousRank = state.rankings.find(r => r.companyId === company.companyId)?.rank || index + 1;
      return {
        ...company,
        rank: index + 1,
        change: previousRank - (index + 1), // Positive = moved up, negative = moved down
      };
    });
    
    set({ rankings });
  },

  generateMarketNews: (type, companyId, message) => {
    const state = get();
    const newsItem = {
      id: uuidv4(),
      type: type as any,
      companyId,
      message,
      day: state.simulationDay,
      impact: 'neutral' as const,
    };
    
    set(prevState => ({
      marketNews: [newsItem, ...prevState.marketNews.slice(0, 19)], // Keep last 20 news items
    }));
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