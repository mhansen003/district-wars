// District Wars — Shared Type Definitions

export type EntityId = number;

export type PlayerId = 0 | 1 | 2 | 3;

export type UnitType = 'trooper' | 'archer' | 'tank' | 'scout';

export type BuildingType = 'hq' | 'generator' | 'barracks' | 'turret';

export type TeamColor = 'red' | 'blue' | 'green' | 'purple';

export const TEAM_COLORS: Record<PlayerId, TeamColor> = {
  0: 'red',
  1: 'blue',
  2: 'green',
  3: 'purple',
};

export const TEAM_HEX: Record<PlayerId, number> = {
  0: 0xdc2626,
  1: 0x2563eb,
  2: 0x16a34a,
  3: 0x9333ea,
};

export const TEAM_HEX_LIGHT: Record<PlayerId, number> = {
  0: 0xfca5a5,
  1: 0x93c5fd,
  2: 0x86efac,
  3: 0xd8b4fe,
};

export interface Point {
  x: number;
  y: number;
}

// Map constants
export const TILE_SIZE = 16;
export const MAP_COLS = 64;
export const MAP_ROWS = 64;
export const MAP_WIDTH = MAP_COLS * TILE_SIZE;   // 1024
export const MAP_HEIGHT = MAP_ROWS * TILE_SIZE;  // 1024

// District spawn positions (center of each quadrant, in pixels)
export const DISTRICT_SPAWNS: Record<PlayerId, Point> = {
  0: { x: 12 * TILE_SIZE, y: 12 * TILE_SIZE },  // NW
  1: { x: 52 * TILE_SIZE, y: 12 * TILE_SIZE },  // NE
  2: { x: 12 * TILE_SIZE, y: 52 * TILE_SIZE },  // SW
  3: { x: 52 * TILE_SIZE, y: 52 * TILE_SIZE },  // SE
};
