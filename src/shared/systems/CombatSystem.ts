// Combat System — Target acquisition, damage, and death

import { World } from '../ecs/World';
import { SpatialGrid } from '../ecs/SpatialGrid';
import { Position, Health, Attack, Owner, Unit, Building, Movement } from '../components';
import { STRONG_MULTIPLIER, WEAK_MULTIPLIER, SIEGE_MULTIPLIER } from '../config/units';
import type { EntityId, PlayerId } from '../types';

export interface DeathEvent {
  entityId: EntityId;
  killedBy: PlayerId;
  wasBuilding: boolean;
  buildingType?: string;
}

export class CombatSystem {
  private spatialGrid = new SpatialGrid(64);
  public deathEvents: DeathEvent[] = [];

  constructor(private world: World) {}

  update(dt: number): void {
    this.deathEvents = [];

    // Rebuild spatial grid
    this.spatialGrid.clear();
    const allEntities = this.world.query(Position, Health, Owner);
    for (const eid of allEntities) {
      const pos = this.world.getComponent(eid, Position)!;
      this.spatialGrid.insert(eid, pos.x, pos.y);
    }

    // Process attackers
    const attackers = this.world.query(Position, Attack, Owner);
    for (const eid of attackers) {
      const attack = this.world.getComponent(eid, Attack)!;
      attack.updateCooldown(dt);

      if (!attack.canAttack()) continue;

      const pos = this.world.getComponent(eid, Position)!;
      const owner = this.world.getComponent(eid, Owner)!;

      // Find nearest enemy in range
      const target = this.findNearestEnemy(eid, pos, owner.playerId, attack.range);
      if (target === null) {
        attack.targetId = null;
        continue;
      }

      attack.targetId = target;

      // Calculate damage with multipliers
      let damage = attack.damage;
      const selfUnit = this.world.getComponent(eid, Unit);
      const targetUnit = this.world.getComponent(target, Unit);
      const targetBuilding = this.world.getComponent(target, Building);

      if (selfUnit && targetUnit) {
        if (selfUnit.strongAgainst.includes(targetUnit.unitType)) {
          damage *= STRONG_MULTIPLIER;
        } else if (selfUnit.weakAgainst.includes(targetUnit.unitType)) {
          damage *= WEAK_MULTIPLIER;
        }
      }

      if (attack.isSiege && targetBuilding) {
        damage *= SIEGE_MULTIPLIER;
      }

      // Deal damage
      const targetHealth = this.world.getComponent(target, Health)!;
      const isDead = targetHealth.takeDamage(damage);
      attack.resetCooldown();

      if (isDead) {
        this.deathEvents.push({
          entityId: target,
          killedBy: owner.playerId,
          wasBuilding: !!targetBuilding,
          buildingType: targetBuilding?.buildingType,
        });
        this.world.markForRemoval(target);
      }
    }

    // Also make units auto-move toward enemies if they have no move target
    const units = this.world.query(Position, Attack, Owner, Movement);
    for (const eid of units) {
      const mov = this.world.getComponent(eid, Movement)!;
      const attack = this.world.getComponent(eid, Attack)!;

      // If unit has no move target and no enemy in attack range, seek nearby enemy
      if (mov.target) continue;
      if (attack.targetId !== null && this.world.exists(attack.targetId)) continue;

      const pos = this.world.getComponent(eid, Position)!;
      const owner = this.world.getComponent(eid, Owner)!;

      // Look for enemies in a wider "aggro" radius
      const aggroRange = attack.range * 3;
      const target = this.findNearestEnemy(eid, pos, owner.playerId, aggroRange);
      if (target !== null) {
        const targetPos = this.world.getComponent(target, Position)!;
        // Move to within attack range of the enemy
        const dx = targetPos.x - pos.x;
        const dy = targetPos.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > attack.range) {
          const ratio = (dist - attack.range * 0.8) / dist;
          mov.target = {
            x: pos.x + dx * ratio,
            y: pos.y + dy * ratio,
          };
        }
      }
    }
  }

  private findNearestEnemy(
    selfId: EntityId,
    selfPos: Position,
    selfPlayer: PlayerId,
    range: number
  ): EntityId | null {
    const nearby = this.spatialGrid.queryRadius(selfPos.x, selfPos.y, range);
    let nearest: EntityId | null = null;
    let nearestDist = Infinity;

    for (const candidateId of nearby) {
      if (candidateId === selfId) continue;
      if (!this.world.exists(candidateId)) continue;

      const candidateOwner = this.world.getComponent(candidateId, Owner);
      if (!candidateOwner || candidateOwner.playerId === selfPlayer) continue;

      const candidateHealth = this.world.getComponent(candidateId, Health);
      if (!candidateHealth || candidateHealth.current <= 0) continue;

      const candidatePos = this.world.getComponent(candidateId, Position)!;
      const dx = candidatePos.x - selfPos.x;
      const dy = candidatePos.y - selfPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= range && dist < nearestDist) {
        nearest = candidateId;
        nearestDist = dist;
      }
    }

    return nearest;
  }
}
