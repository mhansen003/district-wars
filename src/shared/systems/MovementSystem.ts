// Movement System — Moves entities toward their target position

import { World } from '../ecs/World';
import { Position, Movement } from '../components';
import type { EntityId } from '../types';

export class MovementSystem {
  constructor(private world: World) {}

  update(dt: number): void {
    const movers = this.world.query(Position, Movement);
    for (const eid of movers) {
      const pos = this.world.getComponent(eid, Position)!;
      const mov = this.world.getComponent(eid, Movement)!;

      if (!mov.target) continue;

      const dx = mov.target.x - pos.x;
      const dy = mov.target.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2) {
        // Arrived
        pos.x = mov.target.x;
        pos.y = mov.target.y;
        mov.target = null;
        continue;
      }

      // Move toward target
      const step = mov.speed * dt;
      if (step >= dist) {
        pos.x = mov.target.x;
        pos.y = mov.target.y;
        mov.target = null;
      } else {
        pos.x += (dx / dist) * step;
        pos.y += (dy / dist) * step;
      }
    }
  }

  /** Set a move target for an entity */
  setTarget(entityId: EntityId, x: number, y: number): void {
    const mov = this.world.getComponent(entityId, Movement);
    if (mov) {
      mov.target = { x, y };
    }
  }
}
