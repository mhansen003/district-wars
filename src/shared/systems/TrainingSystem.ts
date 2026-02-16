// Training System — Processes barracks unit queues and spawns units

import { World } from '../ecs/World';
import { Position, Owner, TrainingQueue, Health, Attack, Movement, Unit, Selectable, Collider, Renderable } from '../components';
import { UNIT_CONFIGS } from '../config/units';
import type { EntityId, PlayerId, UnitType } from '../types';

export interface UnitSpawnEvent {
  entityId: EntityId;
  unitType: UnitType;
  playerId: PlayerId;
  x: number;
  y: number;
}

export class TrainingSystem {
  public spawnEvents: UnitSpawnEvent[] = [];

  constructor(private world: World) {}

  update(dt: number): void {
    this.spawnEvents = [];

    const barracks = this.world.query(TrainingQueue, Position, Owner);
    for (const eid of barracks) {
      const queue = this.world.getComponent(eid, TrainingQueue)!;
      if (queue.queue.length === 0) continue;

      const current = queue.queue[0];
      current.timeRemaining -= dt;

      if (current.timeRemaining <= 0) {
        // Spawn the unit
        queue.queue.shift();
        const pos = this.world.getComponent(eid, Position)!;
        const owner = this.world.getComponent(eid, Owner)!;
        const spawnedId = this.spawnUnit(current.unitType, owner.playerId, pos.x + 20, pos.y + 20);

        this.spawnEvents.push({
          entityId: spawnedId,
          unitType: current.unitType,
          playerId: owner.playerId,
          x: pos.x + 20,
          y: pos.y + 20,
        });
      }
    }
  }

  queueUnit(barracksId: EntityId, unitType: UnitType): boolean {
    const queue = this.world.getComponent(barracksId, TrainingQueue);
    if (!queue || queue.queue.length >= queue.maxQueue) return false;

    const config = UNIT_CONFIGS[unitType];
    queue.queue.push({ unitType, timeRemaining: config.trainTime });
    return true;
  }

  private spawnUnit(unitType: UnitType, playerId: PlayerId, x: number, y: number): EntityId {
    const cfg = UNIT_CONFIGS[unitType];
    return this.world.createEntity([
      new Position(x, y),
      new Health(cfg.hp, cfg.hp),
      new Attack(cfg.damage, cfg.range, cfg.attackSpeed, cfg.isSiege),
      new Movement(cfg.moveSpeed),
      new Unit(unitType, cfg.strongAgainst, cfg.weakAgainst),
      new Owner(playerId),
      new Selectable(),
      new Collider(cfg.radius),
      new Renderable(unitType),
    ]);
  }
}
