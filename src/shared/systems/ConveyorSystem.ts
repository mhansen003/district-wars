// Conveyor System — Random item generation on a per-player conveyor belt

import type { PlayerId } from '../types';

export type ConveyorItemType =
  | 'generator'
  | 'barracks'
  | 'trooper'
  | 'archer'
  | 'tank'
  | 'scout'
  | 'turret';

export interface ConveyorItem {
  id: number;
  type: ConveyorItemType;
  isBuilding: boolean;
  label: string;
  icon: string;
  color: number;
}

// Spawn weights (higher = more common)
const ITEM_WEIGHTS: { type: ConveyorItemType; weight: number }[] = [
  { type: 'trooper',   weight: 28 },
  { type: 'generator', weight: 22 },
  { type: 'archer',    weight: 16 },
  { type: 'scout',     weight: 14 },
  { type: 'tank',      weight: 10 },
  { type: 'barracks',  weight: 7 },
  { type: 'turret',    weight: 3 },
];

const TOTAL_WEIGHT = ITEM_WEIGHTS.reduce((sum, w) => sum + w.weight, 0);

const ITEM_DEFS: Record<ConveyorItemType, Omit<ConveyorItem, 'id'>> = {
  generator: { type: 'generator', isBuilding: true,  label: 'Generator', icon: '⚡', color: 0x22c55e },
  barracks:  { type: 'barracks',  isBuilding: true,  label: 'Barracks',  icon: '🏠', color: 0x8b5cf6 },
  turret:    { type: 'turret',    isBuilding: true,  label: 'Turret',    icon: '🔫', color: 0xef4444 },
  trooper:   { type: 'trooper',   isBuilding: false, label: 'Trooper',   icon: '⚔',  color: 0xdc2626 },
  archer:    { type: 'archer',    isBuilding: false, label: 'Archer',    icon: '🏹', color: 0x16a34a },
  tank:      { type: 'tank',      isBuilding: false, label: 'Tank',      icon: '🛡',  color: 0xf59e0b },
  scout:     { type: 'scout',     isBuilding: false, label: 'Scout',     icon: '👁',  color: 0x06b6d4 },
};

export class ConveyorSystem {
  public belts: Map<PlayerId, ConveyorItem[]> = new Map();
  private timers: Map<PlayerId, number> = new Map();
  private nextItemId: number = 0;

  public readonly MAX_SLOTS = 5;
  public readonly BASE_INTERVAL = 4.0;     // seconds between items at base income
  public readonly MIN_INTERVAL = 1.5;      // fastest possible rate
  public readonly INCOME_SCALE = 0.25;     // how much income reduces interval

  initPlayer(playerId: PlayerId): void {
    this.belts.set(playerId, []);
    this.timers.set(playerId, 1.0); // first item comes fast
  }

  /** Update the conveyor — call each game tick */
  update(dt: number, getIncome: (pid: PlayerId) => number): void {
    for (const [playerId, belt] of this.belts) {
      const timer = (this.timers.get(playerId) ?? 0) - dt;

      if (timer <= 0) {
        // Spawn a new item
        if (belt.length < this.MAX_SLOTS) {
          belt.push(this.rollRandomItem());
        }
        // Reset timer — faster with more income
        const income = getIncome(playerId);
        const interval = Math.max(
          this.MIN_INTERVAL,
          this.BASE_INTERVAL - (income - 1) * this.INCOME_SCALE
        );
        this.timers.set(playerId, interval);
      } else {
        this.timers.set(playerId, timer);
      }
    }
  }

  /** Remove an item from a player's belt (when they use it) */
  useItem(playerId: PlayerId, itemId: number): ConveyorItem | null {
    const belt = this.belts.get(playerId);
    if (!belt) return null;
    const idx = belt.findIndex(item => item.id === itemId);
    if (idx === -1) return null;
    return belt.splice(idx, 1)[0];
  }

  /** AI helper: get the first item of a certain category */
  getFirstOfType(playerId: PlayerId, isBuilding: boolean): ConveyorItem | null {
    const belt = this.belts.get(playerId);
    if (!belt) return null;
    return belt.find(item => item.isBuilding === isBuilding) ?? null;
  }

  /** AI helper: get the first item matching a specific type */
  getFirstByType(playerId: PlayerId, type: ConveyorItemType): ConveyorItem | null {
    const belt = this.belts.get(playerId);
    if (!belt) return null;
    return belt.find(item => item.type === type) ?? null;
  }

  /** Get current interval for a player (for UI display) */
  getInterval(playerId: PlayerId, income: number): number {
    return Math.max(this.MIN_INTERVAL, this.BASE_INTERVAL - (income - 1) * this.INCOME_SCALE);
  }

  /** Get time until next item */
  getTimeRemaining(playerId: PlayerId): number {
    return this.timers.get(playerId) ?? 0;
  }

  private rollRandomItem(): ConveyorItem {
    let roll = Math.random() * TOTAL_WEIGHT;
    for (const entry of ITEM_WEIGHTS) {
      roll -= entry.weight;
      if (roll <= 0) {
        return { id: this.nextItemId++, ...ITEM_DEFS[entry.type] };
      }
    }
    // Fallback
    return { id: this.nextItemId++, ...ITEM_DEFS['trooper'] };
  }
}
