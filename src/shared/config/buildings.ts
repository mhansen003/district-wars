// Building Configuration

import type { BuildingType } from '../types';

export interface BuildingConfig {
  type: BuildingType;
  displayName: string;
  cost: number;
  hp: number;
  width: number;     // pixels
  height: number;    // pixels
  color: number;     // placeholder color
}

export const BUILDING_CONFIGS: Record<BuildingType, BuildingConfig> = {
  hq: {
    type: 'hq',
    displayName: 'HQ',
    cost: 0,
    hp: 1000,
    width: 32,
    height: 32,
    color: 0xffd700,
  },
  generator: {
    type: 'generator',
    displayName: 'Generator',
    cost: 100,
    hp: 200,
    width: 20,
    height: 20,
    color: 0x22c55e,
  },
  barracks: {
    type: 'barracks',
    displayName: 'Barracks',
    cost: 150,
    hp: 400,
    width: 28,
    height: 28,
    color: 0x8b5cf6,
  },
  turret: {
    type: 'turret',
    displayName: 'Turret',
    cost: 200,
    hp: 300,
    width: 18,
    height: 18,
    color: 0xef4444,
  },
};
