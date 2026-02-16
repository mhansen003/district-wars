// Unit Configuration

import type { UnitType } from '../types';
import { TILE_SIZE } from '../types';

export interface UnitConfig {
  type: UnitType;
  displayName: string;
  cost: number;
  hp: number;
  damage: number;
  attackSpeed: number;       // seconds between attacks
  range: number;             // pixels (converted from tiles)
  moveSpeed: number;         // pixels per second (converted from tiles/sec)
  trainTime: number;         // seconds
  isSiege: boolean;
  strongAgainst: UnitType[];
  weakAgainst: UnitType[];
  radius: number;            // collision radius in pixels
  color: number;             // placeholder sprite color
}

export const UNIT_CONFIGS: Record<UnitType, UnitConfig> = {
  trooper: {
    type: 'trooper',
    displayName: 'Trooper',
    cost: 50,
    hp: 100,
    damage: 10,
    attackSpeed: 1.0,
    range: 1.2 * TILE_SIZE,       // ~19px melee
    moveSpeed: 5 * TILE_SIZE,     // 80 px/s
    trainTime: 3,
    isSiege: false,
    strongAgainst: ['archer'],
    weakAgainst: ['tank'],
    radius: 6,
    color: 0xffffff,
  },
  archer: {
    type: 'archer',
    displayName: 'Archer',
    cost: 75,
    hp: 60,
    damage: 15,
    attackSpeed: 1.5,
    range: 6 * TILE_SIZE,         // 96px ranged
    moveSpeed: 4 * TILE_SIZE,     // 64 px/s
    trainTime: 4,
    isSiege: false,
    strongAgainst: ['tank'],
    weakAgainst: ['trooper'],
    radius: 5,
    color: 0x00ff88,
  },
  tank: {
    type: 'tank',
    displayName: 'Tank',
    cost: 150,
    hp: 300,
    damage: 25,
    attackSpeed: 2.0,
    range: 1.5 * TILE_SIZE,       // ~24px melee
    moveSpeed: 3 * TILE_SIZE,     // 48 px/s
    trainTime: 6,
    isSiege: true,
    strongAgainst: ['trooper'],
    weakAgainst: ['archer'],
    radius: 8,
    color: 0xff8800,
  },
  scout: {
    type: 'scout',
    displayName: 'Scout',
    cost: 30,
    hp: 40,
    damage: 5,
    attackSpeed: 0.8,
    range: 1.2 * TILE_SIZE,
    moveSpeed: 8 * TILE_SIZE,     // 128 px/s — fastest
    trainTime: 2,
    isSiege: false,
    strongAgainst: [],
    weakAgainst: [],
    radius: 4,
    color: 0xffff00,
  },
};

/** Damage multiplier when attacking a unit you're strong against */
export const STRONG_MULTIPLIER = 1.5;
/** Damage multiplier when attacking a unit you're weak against */
export const WEAK_MULTIPLIER = 0.5;
/** Bonus damage multiplier for siege units vs buildings */
export const SIEGE_MULTIPLIER = 2.0;
