# District Wars — Comprehensive Project Blueprint

> **Version:** 1.0.0
> **Date:** 2026-02-15
> **Author:** Mark Hansen
> **Status:** Design Phase

---

## Table of Contents

1. [Phase 1: Game Design Document (GDD)](#phase-1-game-design-document)
2. [Phase 2: System Architecture & Technical Design](#phase-2-system-architecture--technical-design)
3. [Phase 3: Implementation Plan & Code Skeletons](#phase-3-implementation-plan--code-skeletons)
4. [Phase 4: Project Management & Planning](#phase-4-project-management--planning)
5. [Phase 5: Marketing, Branding & Launch](#phase-5-marketing-branding--launch)

---

## Game Overview

**District Wars** is a 4-player real-time strategy (RTS) game with a clean economic tension at its core: every coin you spend building your economy is a coin you didn't spend on your army, and vice versa. Players each control a district with a central HQ and a flag. The last district standing wins.

**Key Pillars:**
- **Accessible Depth:** Simple to learn (build generators or soldiers), deep to master (timing, composition, map control)
- **Meaningful Decisions:** Every coin spent is a permanent commitment — economy vs. military is never "solved"
- **Fast Matches:** Target 8–15 minutes per game to encourage "one more round"
- **Visual Clarity:** 2D top-down with distinct district color themes — always know who owns what

---

# Phase 1: Game Design Document

## 1.1 Core Gameplay Loop

### Minute-by-Minute Player Experience

**Opening (0:00–2:00) — "The Build-Up"**
Every player starts with 200 coins, a Level 1 HQ, and a base income of 1 coin/second. The first decision is immediate: do you rush-build 2 generators (200 coins) to hit 5 coins/sec by minute one, or spend 150 coins on 3 Troopers for an early rush while your opponent invests in economy?

**Early Game (2:00–5:00) — "Scouting & Commitment"**
Players who invested in economy now have income superiority and can begin mixed spending. Players who rushed militarily must capitalize on their temporary unit advantage before the economic players catch up. Scout units reveal enemy generator counts, letting you gauge whether to attack now or turtle up.

**Mid Game (5:00–10:00) — "Clash & Control"**
All players are actively producing units and fighting over map objectives (neutral resource nodes, chokepoints). Tech tree choices start to diverge — one player unlocks Siege Tanks for base-cracking, another invests in Turrets for defense. The first player elimination often happens here.

**Late Game (10:00–15:00) — "Conquest"**
Surviving players have established economies and army compositions. The game accelerates: capturing an eliminated player's resource nodes grants a significant boost. Final pushes target the remaining HQs.

### The Decision Cycle (Every 5–10 Seconds)

```
┌──────────────┐
│   EARN       │ ← Coins flow in automatically from generators
│  (Passive)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   DECIDE     │ ← Spend on economy (generators/upgrades)?
│  (Active)    │    Or military (units/turrets/abilities)?
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   DEPLOY     │ ← Place buildings, queue units, direct army
│  (Active)    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   ENGAGE     │ ← Units auto-fight when in range;
│ (Semi-Auto)  │    player chooses WHERE to send them
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  CONQUER     │ ← Destroy enemy HQ → capture their flag
│  (Goal)      │    → absorb their territory
└──────────────┘
```

### Creative Mechanics for Depth

**Mechanic 1: Tech Tree (3 Branches)**

Each player has a simple 3-branch tech tree, unlocked by spending coins at their HQ. Branches are mutually exclusive per tier — you can only pick ONE upgrade per tier, forcing specialization.

```
TIER 1 (Cost: 300 coins) — Pick ONE:
├── [FORTIFY]   → Unlocks Turrets + HQ gains +200 HP
├── [MOBILIZE]  → Unlocks Tanks + All units gain +1 Speed
└── [PROSPER]   → Generators cost 20% less + Unlock Level 2 upgrades

TIER 2 (Cost: 600 coins) — Pick ONE:
├── [IRON WALL] → Turrets gain splash damage + Walls buildable
├── [BLITZ]     → Unlocks Elite Trooper (double damage, double cost)
└── [EMPIRE]    → Generators produce 50% more + Unlock Level 3 upgrades
```

**Mechanic 2: District Abilities (Global Cooldowns)**

Each player gets ONE special ability on a 90-second cooldown, chosen at game start:

| Ability | Effect | Duration | Cooldown |
|:--------|:-------|:---------|:---------|
| **Emergency Reinforcements** | Instantly spawn 5 Troopers at your HQ | Instant | 90s |
| **Economic Boom** | All generators produce 3x output | 15 seconds | 90s |
| **Sabotage** | Target enemy's generators are disabled | 10 seconds | 90s |
| **Shield Wall** | All your buildings become invulnerable | 8 seconds | 90s |

**Mechanic 3: Neutral Map Objectives**

The map contains 4 neutral structures positioned between districts:

| Objective | Bonus When Captured | Capture Method |
|:----------|:-------------------|:---------------|
| **Gold Mine** | +3 coins/sec to controlling player | Station 2 units nearby for 10s |
| **Watchtower** | Reveals fog of war in a wide radius | Station 1 unit nearby for 5s |
| **Armory** | All units gain +5 damage | Station 3 units nearby for 15s |
| **Healing Spring** | Units near it regenerate 5 HP/sec | Station 1 unit nearby for 5s |

Neutral objectives reset to neutral 30 seconds after the controlling player's units leave.

---

## 1.2 Economy Design

### Base Parameters

| Parameter | Value | Notes |
|:----------|:------|:------|
| Starting Coins | 200 | Enough for 2 generators OR 4 Troopers |
| Base Income | 1 coin/sec | Passive, always active even with 0 generators |
| Max Generators | 10 per player | Hard cap to prevent infinite scaling |

### Generator Stats & Upgrade Path

| Level | Build/Upgrade Cost | Output (coins/sec) | Cumulative Cost | HP |
|:------|:-------------------|:-------------------|:----------------|:---|
| 1 (Base) | 100 | +2 | 100 | 200 |
| 2 | 250 | +3 (5 total) | 350 | 350 |
| 3 | 500 | +4 (9 total) | 850 | 500 |

**Diminishing Returns Analysis:**

This is the most critical balance lever in the entire game. Here's why:

```
STRATEGY A: Build 4 Level 1 Generators
  Cost: 4 × 100 = 400 coins
  Income: 4 × 2 = +8 coins/sec (+ 1 base = 9 total)
  Payback time: 400 ÷ 8 = 50 seconds

STRATEGY B: Build 1 Generator, upgrade to Level 3
  Cost: 100 + 250 + 500 = 850 coins
  Income: 1 × 9 = +9 coins/sec (+ 1 base = 10 total)
  Payback time: 850 ÷ 9 = 94 seconds

STRATEGY C: Build 2 Level 2 Generators
  Cost: 2 × 350 = 700 coins
  Income: 2 × 5 = +10 coins/sec (+ 1 base = 11 total)
  Payback time: 700 ÷ 10 = 70 seconds
```

**Key Insight:** Strategy A gives the fastest payback (50s) but your generators are fragile (200 HP each, 4 targets to defend). Strategy B gives the slowest payback (94s) but your single generator is a 500 HP fortress. Strategy C is the middle ground. This creates a **genuine strategic choice** — not a single "correct" answer.

**Why Diminishing Returns Matter:**

Without diminishing returns, the first player to gain an economic lead would snowball uncontrollably. If generators always cost 100 and always produced +2/sec, a player with a 2-generator lead would *always* grow that lead faster. The increasing upgrade costs ensure that:

1. **Late generators are less efficient** — the 10th generator gives you less bang-per-coin than the 1st
2. **Military investment becomes relatively more attractive** as your economy grows
3. **Catch-up mechanics emerge naturally** — a behind player's next generator is cheaper (relative to income) than the leading player's next one

### Economy Curves (Target)

```
Time →  0s    30s    60s    120s    180s    300s
        ─────────────────────────────────────────
Pure    200   230    290    440     710     1450   coins total
Econ    1/s   3/s    5/s    9/s     13/s    17/s   income

Balanced 200  220    250    350     550     900    coins total
Build   1/s   2/s    3/s    5/s     7/s     9/s    income

Rush    200   210    220    230     240     260    coins total
Military 1/s  1/s    1/s    1/s     1/s     1/s    income
         (but 6+ troopers at 60s)
```

---

## 1.3 Unit & Building Design

### Unit Roster

| Unit | Cost | HP | Damage | Attack Speed | Range | Move Speed | Strong vs. | Weak vs. |
|:-----|:-----|:---|:-------|:-------------|:------|:-----------|:-----------|:---------|
| **Trooper** | 50 | 100 | 10 | 1.0s | Melee (1) | 5 | Archer | Tank |
| **Archer** | 75 | 60 | 15 | 1.5s | 6 tiles | 4 | Tank | Trooper |
| **Tank** | 150 | 300 | 25 | 2.0s | Melee (1) | 3 | Trooper | Archer |
| **Scout** | 30 | 40 | 5 | 0.8s | Melee (1) | 8 | — | Everything |

**Rock-Paper-Scissors Dynamics Explained:**

```
    TROOPER ──beats──▶ ARCHER
       ▲                  │
       │                  │
    beaten by          beats
       │                  │
       │                  ▼
      TANK ◀──beaten by── ARCHER

Why each matchup works:
• Trooper vs Archer: Troopers close distance fast (speed 5 vs 4) and
  have nearly 2x HP. Archers get ~2 shots before melee contact.
• Archer vs Tank: Tanks are slow (speed 3) and Archers outrange them.
  An Archer kites a Tank indefinitely, dealing 15 DPS from safety.
• Tank vs Trooper: Tanks have 3x HP and 2.5x damage. A Trooper needs
  30 hits to kill a Tank; a Tank needs 4 hits to kill a Trooper.
```

**DPS Analysis:**

| Unit | DPS | Cost per DPS | HP per Coin |
|:-----|:----|:-------------|:------------|
| Trooper | 10.0 | 5.0 coins | 2.0 HP |
| Archer | 10.0 | 7.5 coins | 0.8 HP |
| Tank | 12.5 | 12.0 coins | 2.0 HP |
| Scout | 6.25 | 4.8 coins | 1.3 HP |

Troopers are the most cost-efficient in raw stats, but Archers' range and Tanks' bulk create the counter dynamics.

### Buildings

| Building | Cost | HP | Range | Damage | Attack Speed | Notes |
|:---------|:-----|:---|:------|:-------|:-------------|:------|
| **HQ (Headquarters)** | — | 1000 | — | — | — | Starting building. Destruction = elimination. |
| **Generator** | 100+ | 200–500 | — | — | — | Produces coins. See economy section. |
| **Barracks** | 150 | 400 | — | — | — | Required to train units. Queues up to 3. |
| **Turret** | 200 | 300 | 5 tiles | 20 | 1.5s | Defensive. Cannot move. Requires FORTIFY tech. |
| **Wall Segment** | 25 | 500 | — | — | — | Blocks movement. Requires IRON WALL tech. |

### Win Condition: Flag Capture

1. Each player starts with a **Flag** planted on top of their **HQ building**
2. When an HQ is destroyed (reduced to 0 HP), the attacking player **captures that district's flag**
3. The eliminated player's remaining buildings crumble over 10 seconds (dramatic effect), and their generators transfer to the conquering player at 50% efficiency
4. **An eliminated player is OUT** — no respawns, no comeback mechanic. This keeps games short.
5. **Victory:** The player who holds all 4 flags (including their own) wins the game
6. **Edge case:** If two players destroy each other's HQ simultaneously, the player who dealt the killing blow *first* (by game tick) gets the flag

### Map Design

```
┌─────────────────────────────────────────────┐
│                                             │
│   [P1 District]          [P2 District]      │
│   ┌───────┐    Watchtower   ┌───────┐       │
│   │ HQ+Flag│   ◆           │ HQ+Flag│      │
│   │ Gen Gen│     Gold Mine  │ Gen Gen│      │
│   │Barracks│   ◇           │Barracks│      │
│   └───────┘                └───────┘       │
│                                             │
│      Gold Mine  ◇    ◇  Gold Mine           │
│                                             │
│   ┌───────┐    Armory      ┌───────┐       │
│   │ HQ+Flag│   ◆           │ HQ+Flag│      │
│   │ Gen Gen│  Healing Spr.  │ Gen Gen│      │
│   │Barracks│   ◆           │Barracks│      │
│   └───────┘                └───────┘       │
│   [P3 District]          [P4 District]      │
│                                             │
└─────────────────────────────────────────────┘

Map Size: 64×64 tiles (each tile = 16×16 pixels = 1024×1024 total)
District Size: ~20×20 tiles each
Neutral Zone: Central 24×24 area between all districts
```

Each district is positioned in a corner, ensuring equidistant travel times between any two adjacent players. The neutral zone in the center creates a natural "battleground" where armies clash over objectives.

---

# Phase 2: System Architecture & Technical Design

## 2.1 Technology Stack

### Recommended: Phaser.js 3 + TypeScript + WebSockets

| Component | Technology | Justification |
|:----------|:-----------|:--------------|
| **Game Engine** | Phaser.js 3 | 2D-native, web-based (deploys to Vercel), massive community, built-in physics, tilemaps, and sprite management |
| **Language** | TypeScript | Type safety catches bugs early in a complex system with many interacting components |
| **Multiplayer** | Socket.io + Node.js | Real-time bidirectional communication, handles reconnection gracefully |
| **Server** | Node.js (Express) | Same language as client reduces context-switching; lightweight for game state authority |
| **Deployment** | Vercel (client + serverless API routes) | Single deployment target; Vercel Serverless Functions for matchmaking, WebSocket via Vercel's Edge Runtime or Ably/Pusher for real-time |
| **State Management** | Custom ECS | Lightweight, game-specific; avoids framework overhead |
| **Build Tool** | Vite | Fast HMR for development, optimized builds for production |
| **Testing** | Vitest | Fast, TypeScript-native, compatible with Vite |

**Why Phaser.js over Godot or Unity?**

1. **Web-native deployment** — aligns with the Vercel workflow; no download barrier for players
2. **Multiplayer architecture** — WebSockets are first-class in the browser; Godot/Unity require additional networking plugins
3. **Fast prototyping** — Hot module replacement means you see changes instantly
4. **Accessibility** — Players share a URL, not a download link. Critical for a 4-player game where you need friends to join
5. **Portfolio value** — A web game is instantly playable by anyone reviewing the project

### High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Renderer  │  │    UI    │  │  Input   │  │  Audio  │ │
│  │ (Phaser)  │  │ Manager  │  │ Handler  │  │ Manager │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────────┘ │
│       │              │             │                     │
│       └──────────────┼─────────────┘                     │
│                      │                                   │
│              ┌───────┴────────┐                          │
│              │ Game Client    │                          │
│              │ (Prediction &  │                          │
│              │  Interpolation)│                          │
│              └───────┬────────┘                          │
│                      │                                   │
│              ┌───────┴────────┐                          │
│              │ Network Client │◄─── Socket.io ──────┐   │
│              └────────────────┘                      │   │
└──────────────────────────────────────────────────────│───┘
                                                       │
                         ┌─────────────────────────────┘
                         │  WebSocket Connection
                         ▼
┌──────────────────────────────────────────────────────────┐
│                 GAME SERVER (Node.js)                     │
│                                                          │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ Network      │  │  Room     │  │  Match           │  │
│  │ Manager      │  │  Manager  │  │  Maker           │  │
│  └──────┬───────┘  └─────┬─────┘  └──────────────────┘  │
│         │                │                               │
│         └────────────────┘                               │
│                │                                         │
│        ┌───────┴────────┐                                │
│        │  Game State    │                                │
│        │  (Authoritative│                                │
│        │   Server)      │                                │
│        └───────┬────────┘                                │
│                │                                         │
│  ┌─────────────┼─────────────────────┐                   │
│  │             │                     │                   │
│  ▼             ▼                     ▼                   │
│ ┌──────┐  ┌──────────┐  ┌────────────────┐              │
│ │ ECS  │  │ Economy  │  │ Combat         │              │
│ │Engine│  │ System   │  │ System         │              │
│ └──────┘  └──────────┘  └────────────────┘              │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐       │
│  │ AI       │  │Pathfind  │  │ Win Condition    │       │
│  │ System   │  │ System   │  │ System           │       │
│  └──────────┘  └──────────┘  └──────────────────┘       │
└──────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|:----------|:---------------|
| **GameState** | Authoritative source of truth. Runs on server. Processes all game logic at 20 ticks/sec. |
| **GameClient** | Client-side prediction for smooth movement. Reconciles with server state on each tick. |
| **ECSEngine** | Manages all entities (units, buildings) as compositions of components. Runs systems each tick. |
| **EconomySystem** | Calculates coin generation per player per tick. Processes build/upgrade transactions. |
| **CombatSystem** | Resolves attacks, applies damage, handles unit death and building destruction. |
| **AISystem** | Drives computer-controlled players. Evaluates game state and issues commands. |
| **PathfindSystem** | A* pathfinding on the tilemap. Caches paths, handles dynamic obstacle avoidance. |
| **NetworkManager** | Serializes/deserializes game state deltas. Handles player connections/disconnections. |
| **UIManager** | Renders coin counters, unit queues, minimap, tech tree UI. Observes game state changes. |
| **InputHandler** | Translates clicks/key presses into game commands (select, move, attack, build). |

---

## 2.2 Design Patterns

### Pattern 1: Entity-Component-System (ECS)

**Why ECS over Inheritance?**

In a traditional OOP approach, you might design:

```
Unit → MeleeUnit → Trooper
Unit → RangedUnit → Archer
Building → ProductionBuilding → Barracks
Building → DefensiveBuilding → Turret
```

This creates problems fast. What about a Turret that can also produce units? A unit that gains ranged abilities via a tech upgrade? Deep inheritance hierarchies are rigid and lead to the "diamond problem."

**ECS separates data from behavior:**

```
ENTITIES are just IDs:
  Entity #42, Entity #43, Entity #44

COMPONENTS are pure data:
  PositionComponent  { x: number, y: number }
  HealthComponent    { current: number, max: number }
  AttackComponent    { damage: number, range: number, cooldown: number }
  MovementComponent  { speed: number, target: { x, y } | null }
  GeneratorComponent { coinsPerSec: number, ownerPlayerId: number }
  SpriteComponent    { textureKey: string, animationState: string }

SYSTEMS are pure logic (run each tick):
  MovementSystem    → queries all entities with Position + Movement
  CombatSystem      → queries all entities with Position + Attack + Health
  EconomySystem     → queries all entities with Generator
  RenderSystem      → queries all entities with Position + Sprite
```

**Concrete Example — Creating a Trooper vs. an Archer:**

```typescript
// Trooper = Entity with these components:
world.createEntity([
  new PositionComponent(100, 200),
  new HealthComponent(100, 100),
  new AttackComponent(10, 1, 1.0),      // 10 dmg, 1 range (melee), 1s cooldown
  new MovementComponent(5),
  new SpriteComponent('trooper'),
  new OwnerComponent(playerId),
  new SelectableComponent(),
]);

// Archer = same pattern, different values:
world.createEntity([
  new PositionComponent(100, 200),
  new HealthComponent(60, 60),
  new AttackComponent(15, 6, 1.5),      // 15 dmg, 6 range, 1.5s cooldown
  new MovementComponent(4),
  new SpriteComponent('archer'),
  new OwnerComponent(playerId),
  new SelectableComponent(),
]);

// Turret = same pattern, NO MovementComponent:
world.createEntity([
  new PositionComponent(300, 400),
  new HealthComponent(300, 300),
  new AttackComponent(20, 5, 1.5),
  // No MovementComponent — it can't move!
  new SpriteComponent('turret'),
  new OwnerComponent(playerId),
]);
```

The beauty: the `CombatSystem` doesn't know or care if it's processing a Trooper, Archer, or Turret. It just queries for entities with `Position + Attack + Health` and runs the same logic.

### Pattern 2: Observer Pattern (Event-Driven UI)

**Problem:** The `UIManager` needs to update the coin counter whenever coins change. Without Observer, you'd poll every frame:

```typescript
// BAD: Polling (runs 60x/sec even when nothing changes)
update() {
  this.coinText.setText(`Coins: ${this.player.coins}`);
}
```

**Solution:** The `PlayerState` emits events that the UI subscribes to:

```typescript
// PlayerState.ts (Subject)
class PlayerState extends EventEmitter {
  private _coins: number = 200;

  get coins() { return this._coins; }

  addCoins(amount: number) {
    this._coins += amount;
    this.emit('coins-changed', this._coins);  // Notify observers
  }

  spendCoins(amount: number): boolean {
    if (this._coins < amount) return false;
    this._coins -= amount;
    this.emit('coins-changed', this._coins);  // Notify observers
    return true;
  }
}

// UIManager.ts (Observer)
class UIManager {
  constructor(playerState: PlayerState) {
    playerState.on('coins-changed', (newTotal) => {
      this.coinText.setText(`Coins: ${newTotal}`);
    });

    playerState.on('unit-created', (unitType) => {
      this.showNotification(`${unitType} trained!`);
    });
  }
}
```

**Additional patterns used:**

| Pattern | Where Applied | Why |
|:--------|:-------------|:----|
| **Command Pattern** | Player inputs → serializable commands sent to server | Enables networking, replays, and undo |
| **State Machine** | Unit AI states (Idle → Moving → Attacking → Dead) | Clean transitions, prevents invalid states |
| **Object Pool** | Bullet/projectile recycling | Avoids GC spikes from constant create/destroy |
| **Singleton** | GameManager, AudioManager | Single instance needed, global access required |

---

## 2.3 Performance & Scalability

### Primary Bottleneck: Unit Count × Queries

In a 4-player game, each player might have 20–50 units by mid-game. That's 80–200 active entities. Each unit needs to:
1. Find the nearest enemy (naive: O(n²) every frame)
2. Check if targets are in attack range
3. Pathfind to a destination
4. Avoid collisions with allies

At 60 FPS, naive approaches break down around 100+ units.

### Optimization: Spatial Partitioning with a Grid

For a tile-based game, a **spatial hash grid** is simpler and faster than a Quadtree:

```typescript
class SpatialGrid {
  private cellSize: number;
  private grid: Map<string, Set<number>>; // "x,y" → Set of entity IDs

  constructor(cellSize: number = 64) { // 4 tiles per cell
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  private key(x: number, y: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }

  insert(entityId: number, x: number, y: number) {
    const k = this.key(x, y);
    if (!this.grid.has(k)) this.grid.set(k, new Set());
    this.grid.get(k)!.add(entityId);
  }

  // Query: find all entities within `range` of (x, y)
  queryRadius(x: number, y: number, range: number): number[] {
    const results: number[] = [];
    const minCellX = Math.floor((x - range) / this.cellSize);
    const maxCellX = Math.floor((x + range) / this.cellSize);
    const minCellY = Math.floor((y - range) / this.cellSize);
    const maxCellY = Math.floor((y + range) / this.cellSize);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const cell = this.grid.get(`${cx},${cy}`);
        if (cell) {
          for (const id of cell) results.push(id);
        }
      }
    }
    return results;
  }
}

// Usage in CombatSystem:
// Instead of checking ALL 200 units, only check units in nearby cells
const nearbyEnemies = spatialGrid.queryRadius(unit.x, unit.y, unit.attackRange);
// Typically returns 0-5 entities instead of 200
```

**Performance gain:** O(n²) → O(n × k) where k is the average entities per cell neighborhood (usually < 10).

### Networking Model: State Synchronization

**Deterministic Lockstep:**
- All clients simulate the same game; only *inputs* are sent
- Requires byte-identical simulation across all clients (very hard in JS due to floating-point)
- One slow client freezes ALL clients
- Used by: StarCraft, Age of Empires

**State Synchronization (Recommended):**
- Server runs the authoritative simulation
- Clients send commands ("move unit #42 to position 300,200")
- Server broadcasts game state deltas to all clients
- Clients interpolate between received states for smooth rendering
- One slow client only affects themselves

**Why State Sync wins for District Wars:**
1. **JavaScript floating-point** is not deterministic across browsers — lockstep would require fixed-point math
2. **4 players** means one laggy connection in lockstep freezes 3 others
3. **Simpler anti-cheat** — server is authoritative, clients can't lie about game state
4. **Reconnection** is trivial — server sends full state snapshot on rejoin
5. **The unit count is manageable** — 200 units × ~50 bytes each = ~10KB per state update at 20Hz = ~200KB/sec bandwidth (very reasonable)

### Tick Rate & Bandwidth Budget

| Parameter | Value |
|:----------|:------|
| Server tick rate | 20 Hz (every 50ms) |
| Client render rate | 60 FPS |
| Client interpolation buffer | 100ms (2 server ticks) |
| State delta size (typical) | 1–5 KB per tick |
| Max bandwidth per client | ~200 KB/sec |
| Max entities supported | 500 (well above game needs) |

---

# Phase 3: Implementation Plan & Code Skeletons

## 3.1 Implementation Steps

### Step 1: Project Scaffolding (Day 1–2)

```
district-wars/
├── src/
│   ├── client/
│   │   ├── scenes/
│   │   │   ├── BootScene.ts       # Asset loading
│   │   │   ├── MenuScene.ts       # Main menu
│   │   │   ├── GameScene.ts       # Main gameplay
│   │   │   └── UIScene.ts         # HUD overlay
│   │   ├── systems/
│   │   │   ├── RenderSystem.ts    # Sprite rendering
│   │   │   └── InputSystem.ts     # Mouse/keyboard handling
│   │   ├── ui/
│   │   │   ├── CoinCounter.ts
│   │   │   ├── UnitQueue.ts
│   │   │   ├── Minimap.ts
│   │   │   └── TechTreePanel.ts
│   │   ├── network/
│   │   │   └── ClientSocket.ts    # Socket.io client wrapper
│   │   └── main.ts                # Phaser game config & entry
│   │
│   ├── server/
│   │   ├── GameRoom.ts            # Per-match game room
│   │   ├── ServerGameState.ts     # Authoritative state
│   │   ├── AIController.ts        # Bot player logic
│   │   └── index.ts               # Express + Socket.io server
│   │
│   ├── shared/
│   │   ├── ecs/
│   │   │   ├── World.ts           # ECS world container
│   │   │   ├── Entity.ts          # Entity ID management
│   │   │   └── Component.ts       # Base component types
│   │   ├── components/
│   │   │   ├── PositionComponent.ts
│   │   │   ├── HealthComponent.ts
│   │   │   ├── AttackComponent.ts
│   │   │   ├── MovementComponent.ts
│   │   │   ├── GeneratorComponent.ts
│   │   │   ├── OwnerComponent.ts
│   │   │   └── BuildingComponent.ts
│   │   ├── systems/
│   │   │   ├── EconomySystem.ts
│   │   │   ├── CombatSystem.ts
│   │   │   ├── MovementSystem.ts
│   │   │   ├── PathfindingSystem.ts
│   │   │   └── WinConditionSystem.ts
│   │   ├── commands/
│   │   │   └── GameCommand.ts     # Command types (Move, Build, Attack...)
│   │   ├── config/
│   │   │   ├── units.ts           # Unit stat tables
│   │   │   ├── buildings.ts       # Building stat tables
│   │   │   ├── economy.ts         # Economy constants
│   │   │   └── tech.ts            # Tech tree definitions
│   │   └── types.ts               # Shared type definitions
│   │
├── assets/
│   ├── sprites/
│   ├── tilemaps/
│   ├── audio/
│   └── ui/
├── tests/
│   ├── economy.test.ts
│   ├── combat.test.ts
│   ├── ecs.test.ts
│   └── pathfinding.test.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### Step 2: ECS Core (Day 2–3)

Build the entity-component-system foundation that everything else sits on.

### Step 3: Economy System (Day 3–4)

Implement generators, coin flow, and the spend/earn cycle.

### Step 4: Unit Creation & Movement (Day 4–6)

Barracks → unit spawning → A* pathfinding → movement.

### Step 5: Combat System (Day 6–8)

Target acquisition, damage dealing, unit death, building destruction.

### Step 6: Win Condition & Game Flow (Day 8–9)

HQ destruction detection, flag capture, player elimination, victory screen.

### Step 7: AI Opponent (Day 9–11)

Simple state-machine AI that can build generators, produce units, and attack.

### Step 8: Multiplayer (Day 11–14)

Socket.io integration, authoritative server, client prediction.

### Step 9: UI & Polish (Day 14–16)

Full HUD, tech tree panel, minimap, sound effects, visual feedback.

### Step 10: Balancing & Playtesting (Day 16–18)

Iterate on unit stats, economy numbers, and AI difficulty.

---

## 3.2 Code Skeletons

### ECS World

```typescript
// src/shared/ecs/World.ts

type ComponentClass = new (...args: any[]) => any;
type EntityId = number;

export class World {
  private nextEntityId: EntityId = 0;
  private entities: Map<EntityId, Map<ComponentClass, any>> = new Map();

  createEntity(components: any[]): EntityId {
    const id = this.nextEntityId++;
    const componentMap = new Map<ComponentClass, any>();
    for (const component of components) {
      componentMap.set(component.constructor as ComponentClass, component);
    }
    this.entities.set(id, componentMap);
    return id;
  }

  removeEntity(id: EntityId): void {
    this.entities.delete(id);
  }

  getComponent<T>(entityId: EntityId, componentClass: new (...args: any[]) => T): T | undefined {
    return this.entities.get(entityId)?.get(componentClass) as T | undefined;
  }

  /** Query all entities that have ALL of the specified components */
  query(...componentClasses: ComponentClass[]): EntityId[] {
    const results: EntityId[] = [];
    for (const [id, components] of this.entities) {
      if (componentClasses.every(cls => components.has(cls))) {
        results.push(id);
      }
    }
    return results;
  }

  /** Total entity count (useful for debugging/testing) */
  get entityCount(): number {
    return this.entities.size;
  }
}

// --- Test Cases ---
// Test: Creating an entity returns a unique ID
// Test: query([HealthComponent, AttackComponent]) returns only entities with BOTH
// Test: removeEntity removes it from all future queries
// Test: getComponent returns undefined for components the entity doesn't have
```

### Components

```typescript
// src/shared/components/PositionComponent.ts
export class PositionComponent {
  constructor(public x: number, public y: number) {}
}

// src/shared/components/HealthComponent.ts
export class HealthComponent {
  constructor(public current: number, public max: number) {}

  takeDamage(amount: number): boolean {
    this.current = Math.max(0, this.current - amount);
    return this.current <= 0; // returns true if dead
  }

  heal(amount: number): void {
    this.current = Math.min(this.max, this.current + amount);
  }
}

// src/shared/components/AttackComponent.ts
export class AttackComponent {
  public cooldownRemaining: number = 0;

  constructor(
    public damage: number,
    public range: number,
    public cooldown: number // seconds between attacks
  ) {}

  canAttack(): boolean {
    return this.cooldownRemaining <= 0;
  }

  attack(): void {
    this.cooldownRemaining = this.cooldown;
  }

  updateCooldown(delta: number): void {
    this.cooldownRemaining = Math.max(0, this.cooldownRemaining - delta);
  }
}

// src/shared/components/MovementComponent.ts
export class MovementComponent {
  public target: { x: number; y: number } | null = null;
  public path: { x: number; y: number }[] = [];

  constructor(public speed: number) {}
}

// src/shared/components/GeneratorComponent.ts
export class GeneratorComponent {
  constructor(
    public coinsPerSecond: number,
    public level: number = 1
  ) {}
}

// src/shared/components/OwnerComponent.ts
export class OwnerComponent {
  constructor(public playerId: number) {}
}

// src/shared/components/BuildingComponent.ts
export type BuildingType = 'hq' | 'generator' | 'barracks' | 'turret' | 'wall';

export class BuildingComponent {
  constructor(public buildingType: BuildingType) {}
}

// --- Test Cases ---
// Test: HealthComponent.takeDamage(30) on 100 HP → current = 70, returns false
// Test: HealthComponent.takeDamage(200) on 100 HP → current = 0, returns true (dead)
// Test: AttackComponent cooldown: canAttack() true → attack() → canAttack() false
//       → updateCooldown(fullCooldown) → canAttack() true again
```

### Economy System

```typescript
// src/shared/systems/EconomySystem.ts

import { World } from '../ecs/World';
import { GeneratorComponent } from '../components/GeneratorComponent';
import { OwnerComponent } from '../components/OwnerComponent';

export interface PlayerEconomy {
  coins: number;
  income: number; // coins per second (for UI display)
}

export class EconomySystem {
  private playerEconomies: Map<number, PlayerEconomy> = new Map();
  private readonly BASE_INCOME = 1; // coins/sec

  constructor(private world: World) {}

  initPlayer(playerId: number, startingCoins: number = 200) {
    this.playerEconomies.set(playerId, {
      coins: startingCoins,
      income: this.BASE_INCOME,
    });
  }

  getCoins(playerId: number): number {
    return this.playerEconomies.get(playerId)?.coins ?? 0;
  }

  getIncome(playerId: number): number {
    return this.playerEconomies.get(playerId)?.income ?? 0;
  }

  spendCoins(playerId: number, amount: number): boolean {
    const economy = this.playerEconomies.get(playerId);
    if (!economy || economy.coins < amount) return false;
    economy.coins -= amount;
    return true;
  }

  /** Called every server tick */
  update(deltaSeconds: number): void {
    // Recalculate income for each player
    const incomeByPlayer = new Map<number, number>();

    const generatorEntities = this.world.query(GeneratorComponent, OwnerComponent);
    for (const entityId of generatorEntities) {
      const gen = this.world.getComponent(entityId, GeneratorComponent)!;
      const owner = this.world.getComponent(entityId, OwnerComponent)!;
      const current = incomeByPlayer.get(owner.playerId) ?? 0;
      incomeByPlayer.set(owner.playerId, current + gen.coinsPerSecond);
    }

    // Apply income
    for (const [playerId, economy] of this.playerEconomies) {
      const generatorIncome = incomeByPlayer.get(playerId) ?? 0;
      economy.income = this.BASE_INCOME + generatorIncome;
      economy.coins += economy.income * deltaSeconds;
    }
  }
}

// --- Test Cases ---
// Test: Player starts with 200 coins
// Test: After 10 seconds with 0 generators, player has 200 + (1 × 10) = 210 coins
// Test: After adding a generator (2 coins/sec), income becomes 3 coins/sec
// Test: spendCoins(250) with 200 coins returns false, balance unchanged
// Test: spendCoins(150) with 200 coins returns true, balance = 50
// Test: Destroying a generator (removing entity) reduces income on next tick
```

### Combat System

```typescript
// src/shared/systems/CombatSystem.ts

import { World } from '../ecs/World';
import { PositionComponent } from '../components/PositionComponent';
import { HealthComponent } from '../components/HealthComponent';
import { AttackComponent } from '../components/AttackComponent';
import { OwnerComponent } from '../components/OwnerComponent';

export class CombatSystem {
  private spatialGrid: SpatialGrid; // See performance section

  constructor(private world: World) {
    this.spatialGrid = new SpatialGrid(64);
  }

  update(deltaSeconds: number): void {
    // Rebuild spatial grid each tick (fast for <500 entities)
    this.spatialGrid.clear();
    const allCombatants = this.world.query(PositionComponent, HealthComponent, OwnerComponent);
    for (const entityId of allCombatants) {
      const pos = this.world.getComponent(entityId, PositionComponent)!;
      this.spatialGrid.insert(entityId, pos.x, pos.y);
    }

    // Process attacks
    const attackers = this.world.query(PositionComponent, AttackComponent, OwnerComponent);
    for (const entityId of attackers) {
      const attack = this.world.getComponent(entityId, AttackComponent)!;
      attack.updateCooldown(deltaSeconds);

      if (!attack.canAttack()) continue;

      const pos = this.world.getComponent(entityId, PositionComponent)!;
      const owner = this.world.getComponent(entityId, OwnerComponent)!;

      // Find nearest enemy in range
      const target = this.findNearestEnemy(entityId, pos, owner.playerId, attack.range);
      if (target === null) continue;

      // Deal damage
      const targetHealth = this.world.getComponent(target, HealthComponent)!;
      const isDead = targetHealth.takeDamage(attack.damage);
      attack.attack(); // Reset cooldown

      if (isDead) {
        this.world.removeEntity(target);
        // Emit event: entity destroyed (for UI, sounds, etc.)
      }
    }
  }

  private findNearestEnemy(
    selfId: number,
    selfPos: PositionComponent,
    selfPlayerId: number,
    range: number
  ): number | null {
    const nearby = this.spatialGrid.queryRadius(selfPos.x, selfPos.y, range);
    let nearest: number | null = null;
    let nearestDist = Infinity;

    for (const candidateId of nearby) {
      if (candidateId === selfId) continue;
      const candidateOwner = this.world.getComponent(candidateId, OwnerComponent);
      if (!candidateOwner || candidateOwner.playerId === selfPlayerId) continue;

      const candidatePos = this.world.getComponent(candidateId, PositionComponent)!;
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

// --- Test Cases ---
// Test: Two enemy troopers within range attack each other and take damage
// Test: Two allied units within range do NOT attack each other
// Test: An attacker on cooldown does NOT deal damage until cooldown expires
// Test: A unit killed (0 HP) is removed from the world
// Test: A unit with range 6 does NOT attack an enemy at distance 7
```

### Game Commands (for Networking)

```typescript
// src/shared/commands/GameCommand.ts

export type GameCommand =
  | { type: 'move';       playerId: number; unitIds: number[]; targetX: number; targetY: number }
  | { type: 'attack';     playerId: number; unitIds: number[]; targetEntityId: number }
  | { type: 'build';      playerId: number; buildingType: string; x: number; y: number }
  | { type: 'train';      playerId: number; barracksId: number; unitType: string }
  | { type: 'upgrade';    playerId: number; buildingId: number }
  | { type: 'tech';       playerId: number; techId: string }
  | { type: 'ability';    playerId: number; abilityId: string; targetX?: number; targetY?: number };

// Commands are validated on the server before execution.
// The server checks:
// 1. Does this player own the referenced units/buildings?
// 2. Can the player afford this action?
// 3. Is the action valid (e.g., building placement not blocked)?
```

### Player State (with Observer Pattern)

```typescript
// src/client/PlayerState.ts

import { EventEmitter } from 'events';

export class PlayerState extends EventEmitter {
  private _coins: number = 200;
  private _income: number = 1;
  private _selectedUnits: number[] = [];

  get coins(): number { return this._coins; }
  get income(): number { return this._income; }
  get selectedUnits(): number[] { return [...this._selectedUnits]; }

  updateFromServer(coins: number, income: number): void {
    const coinsChanged = this._coins !== coins;
    const incomeChanged = this._income !== income;
    this._coins = coins;
    this._income = income;
    if (coinsChanged) this.emit('coins-changed', coins);
    if (incomeChanged) this.emit('income-changed', income);
  }

  selectUnits(unitIds: number[]): void {
    this._selectedUnits = unitIds;
    this.emit('selection-changed', unitIds);
  }

  clearSelection(): void {
    this._selectedUnits = [];
    this.emit('selection-changed', []);
  }
}

// --- Test Cases ---
// Test: updateFromServer(300, 5) emits 'coins-changed' with 300
// Test: updateFromServer with same values does NOT emit events
// Test: selectUnits returns a copy (modifying returned array doesn't affect state)
```

### Unit Configuration

```typescript
// src/shared/config/units.ts

export interface UnitConfig {
  type: string;
  displayName: string;
  cost: number;
  hp: number;
  damage: number;
  attackSpeed: number;    // seconds between attacks
  range: number;          // tiles
  moveSpeed: number;      // tiles per second
  trainTime: number;      // seconds to produce
  strongAgainst: string[];
  weakAgainst: string[];
  damageMultiplierStrong: number;
  damageMultiplierWeak: number;
}

export const UNIT_CONFIGS: Record<string, UnitConfig> = {
  trooper: {
    type: 'trooper',
    displayName: 'Trooper',
    cost: 50,
    hp: 100,
    damage: 10,
    attackSpeed: 1.0,
    range: 1,
    moveSpeed: 5,
    trainTime: 3,
    strongAgainst: ['archer'],
    weakAgainst: ['tank'],
    damageMultiplierStrong: 1.5,
    damageMultiplierWeak: 0.5,
  },
  archer: {
    type: 'archer',
    displayName: 'Archer',
    cost: 75,
    hp: 60,
    damage: 15,
    attackSpeed: 1.5,
    range: 6,
    moveSpeed: 4,
    trainTime: 4,
    strongAgainst: ['tank'],
    weakAgainst: ['trooper'],
    damageMultiplierStrong: 1.5,
    damageMultiplierWeak: 0.5,
  },
  tank: {
    type: 'tank',
    displayName: 'Tank',
    cost: 150,
    hp: 300,
    damage: 25,
    attackSpeed: 2.0,
    range: 1,
    moveSpeed: 3,
    trainTime: 6,
    strongAgainst: ['trooper'],
    weakAgainst: ['archer'],
    damageMultiplierStrong: 1.5,
    damageMultiplierWeak: 0.5,
  },
  scout: {
    type: 'scout',
    displayName: 'Scout',
    cost: 30,
    hp: 40,
    damage: 5,
    attackSpeed: 0.8,
    range: 1,
    moveSpeed: 8,
    trainTime: 2,
    strongAgainst: [],
    weakAgainst: [],
    damageMultiplierStrong: 1.0,
    damageMultiplierWeak: 1.0,
  },
};
```

### Building Configuration

```typescript
// src/shared/config/buildings.ts

export interface BuildingConfig {
  type: string;
  displayName: string;
  cost: number;
  hp: number;
  buildTime: number; // seconds
}

export interface GeneratorUpgrade {
  level: number;
  upgradeCost: number;
  coinsPerSecond: number;
  hp: number;
}

export const BUILDING_CONFIGS: Record<string, BuildingConfig> = {
  hq: { type: 'hq', displayName: 'Headquarters', cost: 0, hp: 1000, buildTime: 0 },
  generator: { type: 'generator', displayName: 'Generator', cost: 100, hp: 200, buildTime: 5 },
  barracks: { type: 'barracks', displayName: 'Barracks', cost: 150, hp: 400, buildTime: 8 },
  turret: { type: 'turret', displayName: 'Turret', cost: 200, hp: 300, buildTime: 6 },
  wall: { type: 'wall', displayName: 'Wall', cost: 25, hp: 500, buildTime: 1 },
};

export const GENERATOR_UPGRADES: GeneratorUpgrade[] = [
  { level: 1, upgradeCost: 0,   coinsPerSecond: 2, hp: 200 },
  { level: 2, upgradeCost: 250, coinsPerSecond: 5, hp: 350 },
  { level: 3, upgradeCost: 500, coinsPerSecond: 9, hp: 500 },
];
```

---

# Phase 4: Project Management & Planning

## 4.1 Milestones & Timeline

### Overview (6-Week Sprint Plan)

```
Week 1–2: M1 — Core Gameplay Prototype
Week 2–3: M2 — Multiplayer Integration
Week 3–4: M3 — AI & Tech Tree
Week 4–5: M4 — UI, Audio & Polish
Week 5–6: M5 — Playtesting, Balancing & Launch
```

---

### M1: Core Gameplay Prototype (Week 1–2)

**Goal:** Single-player version. One human player, one dummy AI. Core loop works end-to-end.

**Deliverables:**
- [ ] Phaser.js project scaffolded with Vite + TypeScript
- [ ] Tilemap rendering — 64×64 grid, 4 distinct district zones
- [ ] ECS world with entity creation/deletion/query
- [ ] Player starts with HQ, 1 Generator, 1 Barracks, 200 coins
- [ ] Generators produce coins every tick (visible in UI counter)
- [ ] Click Barracks → Train Trooper (deducts coins, spawns unit after delay)
- [ ] Select units → Right-click to move (A* pathfinding)
- [ ] Units auto-attack enemies in range
- [ ] Destroy enemy HQ → "Victory" screen
- [ ] Basic sprite placeholders (colored rectangles are fine)

**Exit Criteria:** A playtester can build generators, train troopers, march them to the enemy base, and win the game.

---

### M2: Multiplayer Integration (Week 2–3)

**Goal:** 2–4 players can connect and play a real-time game.

**Deliverables:**
- [ ] Node.js game server with Socket.io
- [ ] Lobby system — create/join game rooms
- [ ] Authoritative server game loop running at 20 ticks/sec
- [ ] Client sends commands → server validates → server broadcasts state
- [ ] Client-side interpolation for smooth movement between server ticks
- [ ] Player disconnection handling (AI takes over disconnected player)
- [ ] Fog of war — can only see your own units and area around them
- [ ] Deploy to Vercel (client + API routes)

**Exit Criteria:** 4 browser tabs connected to the same game, each controlling a different district, with smooth gameplay.

---

### M3: AI & Tech Tree (Week 3–4)

**Goal:** Competent AI opponents and strategic depth via tech tree.

**Deliverables:**
- [ ] AI difficulty levels (Easy, Medium, Hard)
  - **Easy:** Builds randomly, attacks nearest, no ability usage
  - **Medium:** Follows build order, scouts, uses abilities on cooldown
  - **Hard:** Adapts composition to counter player, times abilities strategically
- [ ] Tech tree UI panel (click HQ → choose branch)
- [ ] Tier 1 and Tier 2 tech unlocks implemented
- [ ] Turret building (requires FORTIFY tech)
- [ ] Tank unit (requires MOBILIZE tech)
- [ ] Generator cost reduction (requires PROSPER tech)
- [ ] All 3 non-Trooper units: Archer, Tank, Scout

**Exit Criteria:** A human player can play against 3 AI opponents at Medium difficulty and the game feels challenging and fair.

---

### M4: UI, Audio & Polish (Week 4–5)

**Goal:** Game looks and feels polished enough for public playtesting.

**Deliverables:**
- [ ] Full HUD: coin counter, income rate, unit count, minimap
- [ ] Unit health bars above sprites
- [ ] Building placement preview (ghost image before confirming)
- [ ] Unit selection box (click-drag to select multiple)
- [ ] Control groups (Ctrl+1 to assign, 1 to select group)
- [ ] District ability button with cooldown indicator
- [ ] Victory/defeat screens with stats (units killed, coins earned, time)
- [ ] Sound effects: unit commands, attacks, building placement, destruction
- [ ] Background music (lo-fi ambient loop)
- [ ] Sprite art: distinct visual identity per district (color-coded)
- [ ] Particle effects for attacks, explosions, coin generation

**Exit Criteria:** Screenshots are shareable. A new player can understand the UI without explanation.

---

### M5: Playtesting, Balancing & Launch (Week 5–6)

**Goal:** Balanced, stable, publicly playable.

**Deliverables:**
- [ ] Automated balance testing: simulate 1000 AI-vs-AI games, check win rates
- [ ] Balance passes:
  - All-Trooper rush should beat all-Generator by minute 3 but lose by minute 5
  - Tank spam should be counterable by Archers (2:1 cost ratio, Archers win)
  - No single tech branch should have >55% win rate
- [ ] Stress test: 4 players with 50 units each, confirm <16ms frame time
- [ ] Tutorial/onboarding: tooltip hints for first-time players
- [ ] Landing page with "Play Now" button
- [ ] Analytics: track match length, popular strategies, quit rates
- [ ] Bug bash: fix all known issues
- [ ] Launch! Share link, gather feedback

**Exit Criteria:** Game is live, playable, and balanced. No game-breaking bugs.

---

## 4.2 Risk Register

| Risk | Impact | Probability | Mitigation |
|:-----|:-------|:------------|:-----------|
| Multiplayer desync | High | Medium | Authoritative server; extensive integration tests for state sync |
| Balance issues (one strategy dominates) | Medium | High | Data-driven: log all matches, run AI simulations, iterate on numbers |
| Scope creep (too many unit types, mechanics) | High | High | Strict adherence to milestones; new ideas go to "Phase 2 Backlog" |
| Performance with many units | Medium | Low | Spatial grid from day 1; profile early, optimize hot paths |
| Player acquisition (nobody plays) | High | Medium | Web-based = zero friction; focus on "share a link" multiplayer |
| WebSocket relay costs | Low | Medium | Vercel handles client; use Ably/Pusher free tier or PartyKit for real-time sync |

## 4.3 Task Tracking Structure

Recommended GitHub Issues label system:

| Label | Color | Description |
|:------|:------|:------------|
| `milestone:M1` | `#0e8a16` | Core prototype |
| `milestone:M2` | `#1d76db` | Multiplayer |
| `milestone:M3` | `#5319e7` | AI & Tech |
| `milestone:M4` | `#fbca04` | Polish |
| `milestone:M5` | `#e4e669` | Launch |
| `type:feature` | `#a2eeef` | New functionality |
| `type:bug` | `#d73a4a` | Something broken |
| `type:balance` | `#f9d0c4` | Game balance tuning |
| `type:art` | `#bfd4f2` | Visual assets |
| `priority:critical` | `#b60205` | Blocks milestone |
| `priority:high` | `#d93f0b` | Important but not blocking |
| `priority:low` | `#0e8a16` | Nice to have |

---

# Phase 5: Marketing, Branding & Launch

## 5.1 Brand Identity

**Name:** District Wars
**Tagline:** "Build. Battle. Conquer."
**Secondary tagline:** "Every coin is a choice."

**Visual Identity:**
- **Color Palette:** Each district has a signature color:
  - District 1 (NW): Crimson Red `#DC2626`
  - District 2 (NE): Ocean Blue `#2563EB`
  - District 3 (SW): Forest Green `#16A34A`
  - District 4 (SE): Royal Purple `#9333EA`
- **UI Theme:** Dark background (`#0D1117`) with bright accent colors — GitHub Dark inspired
- **Typography:** Monospace for in-game counters (conveys data/strategy), sans-serif for menus

**Logo Concept:**
```
   ╔═══╗ ╔═══╗
   ║ ⚔ ║ ║ ⚔ ║    DISTRICT
   ╚═══╝ ╚═══╝      WARS
   ╔═══╗ ╔═══╗
   ║ ⚔ ║ ║ ⚔ ║
   ╚═══╝ ╚═══╝
```
Four squares (representing districts) arranged in a 2×2 grid, each with a flag/sword icon, in the four district colors.

## 5.2 Landing Page

**URL:** `district-wars.vercel.app`
**Repo:** `github.com/mhansen003/district-wars`

**Hero Section:**
- Animated game preview (GIF or short video)
- "Play Now" button → jumps straight to game (no account required)
- "Create Private Room" button → generates shareable room link

**How It Works Section:**
1. "Build generators to earn coins"
2. "Train soldiers to fight"
3. "Conquer all four districts to win"

**Features Section:**
- "4-Player Real-Time Battles"
- "No Download Required — Play in Your Browser"
- "Share a Link, Start a War"
- "Smart AI Opponents for Solo Play"

## 5.3 Launch Channels

| Channel | Action | Timing |
|:--------|:-------|:-------|
| **Reddit** | Post to r/webgames, r/indiegaming, r/playmygame | Launch day |
| **Hacker News** | "Show HN: District Wars — a browser-based 4-player RTS" | Launch day |
| **Twitter/X** | GIF of gameplay + "Built this in 6 weeks" thread | Launch day |
| **Discord** | Create a District Wars Discord for community & feedback | Pre-launch |
| **itch.io** | List as free web game | Launch day |
| **Product Hunt** | Submit as a launch | Day 2–3 |

## 5.4 Post-Launch Roadmap (Future Phases)

| Feature | Priority | Effort | Impact |
|:--------|:---------|:-------|:-------|
| **Ranked Matchmaking** | High | 2 weeks | Retention — gives players a reason to keep playing |
| **Replay System** | Medium | 1 week | Learning tool + shareable highlights |
| **Map Editor** | Medium | 2 weeks | Community engagement + content creation |
| **Mobile Support** | High | 2 weeks | Doubles potential player base |
| **5th & 6th Unit Types** | Low | 1 week | Depth — only if current 4 get stale |
| **Campaign Mode** | Low | 4 weeks | Single-player content for solo players |
| **Seasons & Cosmetics** | Low | 3 weeks | Monetization path if game takes off |

---

## Appendix A: Balance Simulation Framework

To validate balance without endless manual playtesting, run automated AI-vs-AI simulations:

```typescript
// tools/balance-sim.ts

async function runSimulation(strategyA: string, strategyB: string, rounds: number = 1000) {
  let winsA = 0;
  let winsB = 0;

  for (let i = 0; i < rounds; i++) {
    const result = simulateGame([
      createAI(strategyA),
      createAI(strategyB),
      createAI('random'),
      createAI('random'),
    ]);
    if (result.winner === 0) winsA++;
    if (result.winner === 1) winsB++;
  }

  console.log(`${strategyA} vs ${strategyB}: ${winsA}/${winsB} (${rounds} rounds)`);
  console.log(`Win rate A: ${(winsA / rounds * 100).toFixed(1)}%`);

  // Alert if win rate is outside 40-60% band
  const winRate = winsA / rounds;
  if (winRate < 0.4 || winRate > 0.6) {
    console.warn('⚠️ BALANCE WARNING: Win rate outside acceptable range!');
  }
}

// Run key matchups
await runSimulation('rush', 'economy');      // Should be close to 50/50
await runSimulation('troopers_only', 'mixed'); // Mixed should win 55-60%
await runSimulation('fortify_tech', 'blitz_tech'); // Should be close to 50/50
```

## Appendix B: Key Constants Reference

```typescript
// Quick-reference for all tunable game constants

export const GAME_CONSTANTS = {
  // Timing
  SERVER_TICK_RATE: 20,           // Hz
  CLIENT_RENDER_RATE: 60,         // FPS
  INTERPOLATION_BUFFER: 100,     // ms
  MAX_MATCH_DURATION: 20 * 60,   // 20 minutes (seconds)

  // Economy
  STARTING_COINS: 200,
  BASE_INCOME: 1,                 // coins/sec
  MAX_GENERATORS: 10,

  // Map
  MAP_WIDTH: 64,                  // tiles
  MAP_HEIGHT: 64,                 // tiles
  TILE_SIZE: 16,                  // pixels
  DISTRICT_SIZE: 20,              // tiles

  // Combat
  DAMAGE_MULTIPLIER_STRONG: 1.5,
  DAMAGE_MULTIPLIER_WEAK: 0.5,

  // Neutral Objectives
  CAPTURE_RESET_TIME: 30,        // seconds after units leave

  // Abilities
  ABILITY_COOLDOWN: 90,           // seconds
  REINFORCEMENTS_COUNT: 5,
  ECONOMIC_BOOM_MULTIPLIER: 3,
  ECONOMIC_BOOM_DURATION: 15,
  SABOTAGE_DURATION: 10,
  SHIELD_WALL_DURATION: 8,
} as const;
```

---

*End of Blueprint v1.0.0*
