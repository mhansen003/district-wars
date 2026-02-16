// AI Controller — Simple state-machine AI for computer players

import { World } from '../ecs/World';
import { Position, Owner, Building, Unit, Health, Attack, Movement, Generator,
         TrainingQueue, Renderable } from '../components';
import { EconomySystem } from './EconomySystem';
import { TrainingSystem } from './TrainingSystem';
import { ECONOMY } from '../config/economy';
import { BUILDING_CONFIGS } from '../config/buildings';
import type { EntityId, PlayerId, UnitType } from '../types';
import { DISTRICT_SPAWNS, TILE_SIZE } from '../types';

type AIState = 'building_economy' | 'building_army' | 'attacking';

export class AIController {
  private state: AIState = 'building_economy';
  private decisionTimer: number = 0;
  private decisionInterval: number = 2; // seconds between decisions
  private attackTarget: PlayerId | null = null;

  constructor(
    private world: World,
    private playerId: PlayerId,
    private economy: EconomySystem,
    private training: TrainingSystem,
    private difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ) {
    if (difficulty === 'easy') this.decisionInterval = 4;
    if (difficulty === 'hard') this.decisionInterval = 1;
  }

  update(dt: number, eliminatedPlayers: Set<PlayerId>): void {
    this.decisionTimer += dt;
    if (this.decisionTimer < this.decisionInterval) return;
    this.decisionTimer = 0;

    // Count our units and generators
    const myUnits = this.getMyUnits();
    const myGenerators = this.economy.players.get(this.playerId)?.generatorCount ?? 0;
    const myCoins = this.economy.getCoins(this.playerId);
    const myBarracks = this.getMyBarracks();

    // State transitions
    if (myGenerators < 3 && this.state !== 'attacking') {
      this.state = 'building_economy';
    } else if (myUnits.length < this.getArmyThreshold()) {
      this.state = 'building_army';
    } else {
      this.state = 'attacking';
    }

    // Execute state
    switch (this.state) {
      case 'building_economy':
        this.doBuildEconomy(myCoins, myGenerators, myBarracks);
        break;
      case 'building_army':
        this.doBuildArmy(myCoins, myBarracks);
        break;
      case 'attacking':
        this.doAttack(myUnits, eliminatedPlayers);
        break;
    }
  }

  private getArmyThreshold(): number {
    switch (this.difficulty) {
      case 'easy': return 4;
      case 'medium': return 6;
      case 'hard': return 8;
    }
  }

  private doBuildEconomy(coins: number, genCount: number, barracks: EntityId[]): void {
    // Build barracks first if we don't have one
    if (barracks.length === 0 && coins >= ECONOMY.BARRACKS_COST) {
      this.buildBuilding('barracks');
      return;
    }

    // Build generators
    if (genCount < ECONOMY.MAX_GENERATORS && coins >= ECONOMY.GENERATOR_BASE_COST) {
      this.buildBuilding('generator');
      return;
    }

    // If we have money left, build some units too
    if (barracks.length > 0 && coins >= 50) {
      this.trainRandomUnit(barracks[0]);
    }
  }

  private doBuildArmy(coins: number, barracks: EntityId[]): void {
    if (barracks.length === 0) return;

    for (const bid of barracks) {
      if (coins >= 50) {
        this.trainRandomUnit(bid);
      }
    }
  }

  private doAttack(myUnits: EntityId[], eliminatedPlayers: Set<PlayerId>): void {
    // Pick target: nearest non-eliminated player
    if (this.attackTarget === null || eliminatedPlayers.has(this.attackTarget)) {
      this.attackTarget = this.pickTarget(eliminatedPlayers);
    }
    if (this.attackTarget === null) return;

    // Send all idle units to attack
    const targetSpawn = DISTRICT_SPAWNS[this.attackTarget];
    for (const uid of myUnits) {
      const mov = this.world.getComponent(uid, Movement);
      const attack = this.world.getComponent(uid, Attack);
      if (!mov || !attack) continue;

      // Only redirect if not already engaged in combat
      if (attack.targetId !== null && this.world.exists(attack.targetId)) continue;
      if (mov.target) continue;

      // Send toward enemy base with some spread
      const spread = (Math.random() - 0.5) * 60;
      mov.target = {
        x: targetSpawn.x + spread,
        y: targetSpawn.y + spread,
      };
    }

    // Also keep building units
    const barracks = this.getMyBarracks();
    const coins = this.economy.getCoins(this.playerId);
    for (const bid of barracks) {
      if (coins >= 50) {
        this.trainRandomUnit(bid);
      }
    }
  }

  private pickTarget(eliminatedPlayers: Set<PlayerId>): PlayerId | null {
    const myPos = DISTRICT_SPAWNS[this.playerId];
    let nearest: PlayerId | null = null;
    let nearestDist = Infinity;

    for (const pid of [0, 1, 2, 3] as PlayerId[]) {
      if (pid === this.playerId) continue;
      if (eliminatedPlayers.has(pid)) continue;

      const pos = DISTRICT_SPAWNS[pid];
      const dx = pos.x - myPos.x;
      const dy = pos.y - myPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearest = pid;
        nearestDist = dist;
      }
    }
    return nearest;
  }

  private trainRandomUnit(barracksId: EntityId): void {
    const types: UnitType[] = this.difficulty === 'easy'
      ? ['trooper', 'trooper', 'trooper']
      : ['trooper', 'trooper', 'archer', 'tank'];
    const unitType = types[Math.floor(Math.random() * types.length)];
    const cost = { trooper: 50, archer: 75, tank: 150, scout: 30 }[unitType];
    if (this.economy.spendCoins(this.playerId, cost)) {
      this.training.queueUnit(barracksId, unitType);
    }
  }

  private getMyUnits(): EntityId[] {
    return this.world.query(Unit, Owner, Position).filter(eid => {
      const owner = this.world.getComponent(eid, Owner)!;
      return owner.playerId === this.playerId;
    });
  }

  private getMyBarracks(): EntityId[] {
    return this.world.query(Building, Owner, Position).filter(eid => {
      const owner = this.world.getComponent(eid, Owner)!;
      const building = this.world.getComponent(eid, Building)!;
      return owner.playerId === this.playerId && building.buildingType === 'barracks';
    });
  }

  /** Build a building near the AI's base */
  private buildBuilding(type: 'generator' | 'barracks'): void {
    const cost = type === 'generator' ? ECONOMY.GENERATOR_BASE_COST : ECONOMY.BARRACKS_COST;
    if (!this.economy.spendCoins(this.playerId, cost)) return;

    const spawn = DISTRICT_SPAWNS[this.playerId];
    const cfg = BUILDING_CONFIGS[type];
    const offsetX = (Math.random() - 0.5) * 80;
    const offsetY = (Math.random() - 0.5) * 80;

    const components: object[] = [
      new Position(spawn.x + offsetX, spawn.y + offsetY),
      new Health(cfg.hp, cfg.hp),
      new Building(type),
      new Owner(this.playerId),
      new Renderable(type),
    ];

    if (type === 'generator') {
      components.push(new Generator(2, 1));
    }
    if (type === 'barracks') {
      components.push(new TrainingQueue());
    }

    this.world.createEntity(components);
  }
}
