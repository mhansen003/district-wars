// Economy System — Manages coin generation and spending per player

import { World } from '../ecs/World';
import { Generator, Owner } from '../components';
import { ECONOMY } from '../config/economy';
import type { PlayerId } from '../types';

export interface PlayerEconomy {
  coins: number;
  income: number;
  generatorCount: number;
}

export class EconomySystem {
  public players: Map<PlayerId, PlayerEconomy> = new Map();

  constructor(private world: World) {}

  initPlayer(playerId: PlayerId): void {
    this.players.set(playerId, {
      coins: ECONOMY.STARTING_COINS,
      income: ECONOMY.BASE_INCOME,
      generatorCount: 0,
    });
  }

  getCoins(playerId: PlayerId): number {
    return this.players.get(playerId)?.coins ?? 0;
  }

  getIncome(playerId: PlayerId): number {
    return this.players.get(playerId)?.income ?? 0;
  }

  canAfford(playerId: PlayerId, amount: number): boolean {
    return this.getCoins(playerId) >= amount;
  }

  spendCoins(playerId: PlayerId, amount: number): boolean {
    const economy = this.players.get(playerId);
    if (!economy || economy.coins < amount) return false;
    economy.coins -= amount;
    return true;
  }

  addCoins(playerId: PlayerId, amount: number): void {
    const economy = this.players.get(playerId);
    if (economy) economy.coins += amount;
  }

  update(dt: number): void {
    // Recalculate income from generators
    const incomeMap = new Map<PlayerId, number>();
    const countMap = new Map<PlayerId, number>();

    const generators = this.world.query(Generator, Owner);
    for (const eid of generators) {
      const gen = this.world.getComponent(eid, Generator)!;
      const owner = this.world.getComponent(eid, Owner)!;
      incomeMap.set(owner.playerId, (incomeMap.get(owner.playerId) ?? 0) + gen.coinsPerSecond);
      countMap.set(owner.playerId, (countMap.get(owner.playerId) ?? 0) + 1);
    }

    // Apply income to each player
    for (const [playerId, economy] of this.players) {
      const genIncome = incomeMap.get(playerId) ?? 0;
      economy.income = ECONOMY.BASE_INCOME + genIncome;
      economy.generatorCount = countMap.get(playerId) ?? 0;
      economy.coins += economy.income * dt;
    }
  }
}
