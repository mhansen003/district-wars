// ECS Components — Pure data containers

import type { PlayerId, UnitType, BuildingType, Point } from '../types';

/** World position in pixels */
export class Position {
  constructor(public x: number, public y: number) {}
}

/** Hit points */
export class Health {
  constructor(public current: number, public max: number) {}

  takeDamage(amount: number): boolean {
    this.current = Math.max(0, this.current - amount);
    return this.current <= 0;
  }

  get ratio(): number {
    return this.current / this.max;
  }
}

/** Attack capability */
export class Attack {
  public cooldownRemaining: number = 0;
  public targetId: number | null = null;

  constructor(
    public damage: number,
    public range: number,      // pixels
    public cooldown: number,   // seconds between attacks
    public isSiege: boolean = false  // bonus damage vs buildings
  ) {}

  canAttack(): boolean {
    return this.cooldownRemaining <= 0;
  }

  resetCooldown(): void {
    this.cooldownRemaining = this.cooldown;
  }

  updateCooldown(dt: number): void {
    if (this.cooldownRemaining > 0) {
      this.cooldownRemaining = Math.max(0, this.cooldownRemaining - dt);
    }
  }
}

/** Movement capability */
export class Movement {
  public target: Point | null = null;
  public path: Point[] = [];

  constructor(public speed: number) {} // pixels per second
}

/** Coin generator */
export class Generator {
  constructor(
    public coinsPerSecond: number,
    public level: number = 1
  ) {}
}

/** Who owns this entity */
export class Owner {
  constructor(public playerId: PlayerId) {}
}

/** Building marker */
export class Building {
  constructor(public buildingType: BuildingType) {}
}

/** Unit marker with type info */
export class Unit {
  constructor(
    public unitType: UnitType,
    public strongAgainst: UnitType[] = [],
    public weakAgainst: UnitType[] = []
  ) {}
}

/** Can be selected by the player */
export class Selectable {
  public selected: boolean = false;
}

/** Unit training queue for barracks */
export class TrainingQueue {
  public queue: { unitType: UnitType; timeRemaining: number }[] = [];
  public maxQueue: number = 3;
}

/** Visual representation reference (links to Phaser sprite) */
export class Renderable {
  public spriteId: string = '';
  public healthBarId: string = '';
  constructor(public textureKey: string, public scale: number = 1) {}
}

/** Flag marker — the objective */
export class Flag {
  public captured: boolean = false;
  public capturedBy: PlayerId | null = null;
}

/** Collision size for spatial queries */
export class Collider {
  constructor(public radius: number) {}
}
