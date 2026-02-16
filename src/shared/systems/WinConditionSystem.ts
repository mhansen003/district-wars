// Win Condition System — Checks for HQ destruction and game over

import { World } from '../ecs/World';
import { Building, Owner, Flag, Health } from '../components';
import type { PlayerId } from '../types';

export class WinConditionSystem {
  public eliminatedPlayers: Set<PlayerId> = new Set();
  public winner: PlayerId | null = null;

  constructor(private world: World) {}

  update(): void {
    // Check which players still have an HQ
    const alivePlayers = new Set<PlayerId>();

    const hqs = this.world.query(Building, Owner, Health);
    for (const eid of hqs) {
      const building = this.world.getComponent(eid, Building)!;
      if (building.buildingType !== 'hq') continue;
      const health = this.world.getComponent(eid, Health)!;
      if (health.current <= 0) continue;
      const owner = this.world.getComponent(eid, Owner)!;
      alivePlayers.add(owner.playerId);
    }

    // Mark newly eliminated players
    for (const pid of [0, 1, 2, 3] as PlayerId[]) {
      if (!alivePlayers.has(pid) && !this.eliminatedPlayers.has(pid)) {
        this.eliminatedPlayers.add(pid);
      }
    }

    // Check for winner (last player standing)
    if (alivePlayers.size === 1 && this.winner === null) {
      this.winner = alivePlayers.values().next().value!;
    }

    // Edge case: all dead simultaneously
    if (alivePlayers.size === 0 && this.winner === null) {
      this.winner = 0; // fallback
    }
  }

  isEliminated(playerId: PlayerId): boolean {
    return this.eliminatedPlayers.has(playerId);
  }

  isGameOver(): boolean {
    return this.winner !== null;
  }
}
