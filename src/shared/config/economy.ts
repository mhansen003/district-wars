// Economy Configuration

export const ECONOMY = {
  STARTING_COINS: 200,
  BASE_INCOME: 1,          // coins/sec with no generators
  MAX_GENERATORS: 10,
  GENERATOR_BASE_COST: 100,
  BARRACKS_COST: 150,
  TURRET_COST: 200,
} as const;

export interface GeneratorLevel {
  level: number;
  upgradeCost: number;
  coinsPerSecond: number;
  hp: number;
}

export const GENERATOR_LEVELS: GeneratorLevel[] = [
  { level: 1, upgradeCost: 0,   coinsPerSecond: 2, hp: 200 },
  { level: 2, upgradeCost: 250, coinsPerSecond: 5, hp: 350 },
  { level: 3, upgradeCost: 500, coinsPerSecond: 9, hp: 500 },
];
