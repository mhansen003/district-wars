// GameScene — Main gameplay scene. Manages ECS world, rendering, and input.

import Phaser from 'phaser';
import { World } from '../../shared/ecs/World';
import { Position, Health, Attack, Movement, Owner, Building, Unit, Generator,
         Selectable, TrainingQueue, Collider, Renderable, Flag } from '../../shared/components';
import { EconomySystem } from '../../shared/systems/EconomySystem';
import { MovementSystem } from '../../shared/systems/MovementSystem';
import { CombatSystem } from '../../shared/systems/CombatSystem';
import { TrainingSystem } from '../../shared/systems/TrainingSystem';
import { WinConditionSystem } from '../../shared/systems/WinConditionSystem';
import { AIController } from '../../shared/systems/AIController';
import { UNIT_CONFIGS } from '../../shared/config/units';
import { BUILDING_CONFIGS } from '../../shared/config/buildings';
import { ECONOMY } from '../../shared/config/economy';
import { DISTRICT_SPAWNS, TEAM_HEX, TEAM_HEX_LIGHT, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '../../shared/types';
import type { PlayerId, EntityId, UnitType } from '../../shared/types';

export class GameScene extends Phaser.Scene {
  // ECS
  private world!: World;
  private economySystem!: EconomySystem;
  private movementSystem!: MovementSystem;
  private combatSystem!: CombatSystem;
  private trainingSystem!: TrainingSystem;
  private winCondition!: WinConditionSystem;
  private aiControllers: AIController[] = [];

  // Rendering
  private sprites: Map<EntityId, Phaser.GameObjects.Container> = new Map();
  private selectionBox: Phaser.GameObjects.Rectangle | null = null;
  private dragStart: { x: number; y: number } | null = null;

  // Player state
  private humanPlayer: PlayerId = 0;
  private selectedUnits: Set<EntityId> = new Set();

  // UI elements (in-world)
  private buildPreview: Phaser.GameObjects.Rectangle | null = null;
  private buildMode: 'generator' | 'barracks' | null = null;

  // Game state
  private gameOver: boolean = false;
  private tickAccumulator: number = 0;
  private readonly TICK_RATE = 1 / 20; // 20 Hz

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.world = new World();
    this.economySystem = new EconomySystem(this.world);
    this.movementSystem = new MovementSystem(this.world);
    this.combatSystem = new CombatSystem(this.world);
    this.trainingSystem = new TrainingSystem(this.world);
    this.winCondition = new WinConditionSystem(this.world);

    // Draw map background
    this.createMap();

    // Initialize all 4 players
    for (let i = 0; i < 4; i++) {
      const pid = i as PlayerId;
      this.economySystem.initPlayer(pid);
      this.spawnDistrict(pid);
    }

    // Set up AI for players 1, 2, 3
    const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'medium'];
    for (let i = 1; i <= 3; i++) {
      this.aiControllers.push(
        new AIController(this.world, i as PlayerId, this.economySystem, this.trainingSystem, difficulties[i - 1])
      );
    }

    // Camera setup
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.setZoom(1.5);
    this.cameras.main.centerOn(DISTRICT_SPAWNS[0].x, DISTRICT_SPAWNS[0].y);

    // Input setup
    this.setupInput();

    // Launch UI scene on top
    this.scene.launch('UIScene', {
      gameScene: this,
      economy: this.economySystem,
      humanPlayer: this.humanPlayer,
    });
  }

  private createMap(): void {
    // Dark background
    this.add.rectangle(MAP_WIDTH / 2, MAP_HEIGHT / 2, MAP_WIDTH, MAP_HEIGHT, 0x0d1117);

    // Grid lines
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x1a1f2b, 0.3);
    for (let x = 0; x <= MAP_WIDTH; x += TILE_SIZE) {
      gridGraphics.lineBetween(x, 0, x, MAP_HEIGHT);
    }
    for (let y = 0; y <= MAP_HEIGHT; y += TILE_SIZE) {
      gridGraphics.lineBetween(0, y, MAP_WIDTH, y);
    }

    // District zones (tinted quadrants)
    const quadrantW = MAP_WIDTH / 2;
    const quadrantH = MAP_HEIGHT / 2;
    for (let i = 0; i < 4; i++) {
      const pid = i as PlayerId;
      const spawn = DISTRICT_SPAWNS[pid];
      const zoneX = pid === 1 || pid === 3 ? quadrantW : 0;
      const zoneY = pid === 2 || pid === 3 ? quadrantH : 0;
      const zone = this.add.rectangle(
        zoneX + quadrantW / 2, zoneY + quadrantH / 2,
        quadrantW, quadrantH,
        TEAM_HEX[pid], 0.04
      );
    }

    // Border between districts
    const borderGraphics = this.add.graphics();
    borderGraphics.lineStyle(2, 0x30363d, 0.6);
    borderGraphics.lineBetween(MAP_WIDTH / 2, 0, MAP_WIDTH / 2, MAP_HEIGHT);
    borderGraphics.lineBetween(0, MAP_HEIGHT / 2, MAP_WIDTH, MAP_HEIGHT / 2);
  }

  private spawnDistrict(playerId: PlayerId): void {
    const spawn = DISTRICT_SPAWNS[playerId];

    // HQ
    this.world.createEntity([
      new Position(spawn.x, spawn.y),
      new Health(1000, 1000),
      new Building('hq'),
      new Owner(playerId),
      new Renderable('hq'),
      new Flag(),
    ]);

    // Starting generator
    this.world.createEntity([
      new Position(spawn.x - 30, spawn.y - 30),
      new Health(200, 200),
      new Building('generator'),
      new Generator(2, 1),
      new Owner(playerId),
      new Renderable('generator'),
    ]);

    // Starting barracks
    this.world.createEntity([
      new Position(spawn.x + 30, spawn.y + 20),
      new Health(400, 400),
      new Building('barracks'),
      new TrainingQueue(),
      new Owner(playerId),
      new Renderable('barracks'),
    ]);
  }

  private setupInput(): void {
    // Camera drag with middle mouse / arrow keys
    const cursors = this.input.keyboard!.createCursorKeys();
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown()) {
        this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
      }
    });

    // Left click: select / place building
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        const worldPos = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

        if (this.buildMode) {
          this.placeBuildingAt(worldPos.x, worldPos.y);
          return;
        }

        // Start selection box
        this.dragStart = { x: worldPos.x, y: worldPos.y };
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonReleased() && this.dragStart && !this.buildMode) {
        const worldPos = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.handleSelection(this.dragStart, worldPos);
        this.dragStart = null;
        if (this.selectionBox) {
          this.selectionBox.destroy();
          this.selectionBox = null;
        }
      }
    });

    // Right click: move/attack command, or cancel build mode
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        if (this.buildMode) {
          this.buildMode = null;
          return;
        }
        if (this.selectedUnits.size > 0) {
          const worldPos = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
          this.issueCommand(worldPos.x, worldPos.y);
        }
      }
    });

    // Keyboard shortcuts
    this.input.keyboard!.on('keydown-G', () => this.enterBuildMode('generator'));
    this.input.keyboard!.on('keydown-B', () => this.enterBuildMode('barracks'));
    this.input.keyboard!.on('keydown-ESCAPE', () => {
      this.buildMode = null;
      this.clearSelection();
    });

    // Unit training hotkeys
    this.input.keyboard!.on('keydown-ONE', () => this.trainUnit('trooper'));
    this.input.keyboard!.on('keydown-TWO', () => this.trainUnit('archer'));
    this.input.keyboard!.on('keydown-THREE', () => this.trainUnit('tank'));
    this.input.keyboard!.on('keydown-FOUR', () => this.trainUnit('scout'));

    // Zoom
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _dx: number, dy: number) => {
      const zoom = this.cameras.main.zoom - dy * 0.001;
      this.cameras.main.setZoom(Phaser.Math.Clamp(zoom, 0.5, 3));
    });
  }

  private handleSelection(start: { x: number; y: number }, end: Phaser.Math.Vector2): void {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    const isClick = Math.abs(maxX - minX) < 5 && Math.abs(maxY - minY) < 5;

    this.clearSelection();

    if (isClick) {
      // Click selection — pick nearest own entity
      const allOwned = this.world.query(Position, Owner, Selectable);
      let nearest: EntityId | null = null;
      let nearestDist = 20; // click radius

      for (const eid of allOwned) {
        const owner = this.world.getComponent(eid, Owner)!;
        if (owner.playerId !== this.humanPlayer) continue;
        const pos = this.world.getComponent(eid, Position)!;
        const dx = pos.x - start.x;
        const dy = pos.y - start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
          nearest = eid;
          nearestDist = dist;
        }
      }

      if (nearest !== null) {
        this.selectEntity(nearest);
      }
    } else {
      // Box selection — select all own units in box
      const units = this.world.query(Position, Owner, Unit, Selectable);
      for (const eid of units) {
        const owner = this.world.getComponent(eid, Owner)!;
        if (owner.playerId !== this.humanPlayer) continue;
        const pos = this.world.getComponent(eid, Position)!;
        if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
          this.selectEntity(eid);
        }
      }
    }
  }

  private selectEntity(entityId: EntityId): void {
    this.selectedUnits.add(entityId);
    const sel = this.world.getComponent(entityId, Selectable);
    if (sel) sel.selected = true;
  }

  private clearSelection(): void {
    for (const eid of this.selectedUnits) {
      const sel = this.world.getComponent(eid, Selectable);
      if (sel) sel.selected = false;
    }
    this.selectedUnits.clear();
  }

  private issueCommand(x: number, y: number): void {
    for (const eid of this.selectedUnits) {
      if (!this.world.exists(eid)) continue;
      const mov = this.world.getComponent(eid, Movement);
      if (mov) {
        const spread = this.selectedUnits.size > 1 ? (Math.random() - 0.5) * 30 : 0;
        mov.target = { x: x + spread, y: y + spread };
      }
    }
  }

  public enterBuildMode(type: 'generator' | 'barracks'): void {
    this.buildMode = type;
    this.clearSelection();
  }

  private placeBuildingAt(x: number, y: number): void {
    if (!this.buildMode) return;
    const cost = this.buildMode === 'generator' ? ECONOMY.GENERATOR_BASE_COST : ECONOMY.BARRACKS_COST;

    if (!this.economySystem.spendCoins(this.humanPlayer, cost)) {
      // Can't afford — flash UI
      this.buildMode = null;
      return;
    }

    const cfg = BUILDING_CONFIGS[this.buildMode];
    const components: object[] = [
      new Position(x, y),
      new Health(cfg.hp, cfg.hp),
      new Building(this.buildMode),
      new Owner(this.humanPlayer),
      new Renderable(this.buildMode),
    ];

    if (this.buildMode === 'generator') {
      components.push(new Generator(2, 1));
    }
    if (this.buildMode === 'barracks') {
      components.push(new TrainingQueue());
    }

    this.world.createEntity(components);
    this.buildMode = null;
  }

  public trainUnit(unitType: UnitType): void {
    const cfg = UNIT_CONFIGS[unitType];

    // Find a selected barracks, or any owned barracks
    let barracksId: EntityId | null = null;

    for (const eid of this.selectedUnits) {
      const building = this.world.getComponent(eid, Building);
      if (building?.buildingType === 'barracks') {
        barracksId = eid;
        break;
      }
    }

    if (barracksId === null) {
      // Find first owned barracks
      const allBarracks = this.world.query(Building, Owner, TrainingQueue);
      for (const eid of allBarracks) {
        const owner = this.world.getComponent(eid, Owner)!;
        const building = this.world.getComponent(eid, Building)!;
        if (owner.playerId === this.humanPlayer && building.buildingType === 'barracks') {
          barracksId = eid;
          break;
        }
      }
    }

    if (barracksId === null) return;

    if (this.economySystem.spendCoins(this.humanPlayer, cfg.cost)) {
      this.trainingSystem.queueUnit(barracksId, unitType);
    }
  }

  // --- Public API for UIScene ---

  getEconomy(): EconomySystem { return this.economySystem; }
  getSelectedUnits(): Set<EntityId> { return this.selectedUnits; }
  getWorld(): World { return this.world; }
  getHumanPlayer(): PlayerId { return this.humanPlayer; }
  getBuildMode(): string | null { return this.buildMode; }
  getWinCondition(): WinConditionSystem { return this.winCondition; }

  getTrainingProgress(playerId: PlayerId): { unitType: string; progress: number }[] {
    const barracks = this.world.query(Building, Owner, TrainingQueue);
    const results: { unitType: string; progress: number }[] = [];
    for (const eid of barracks) {
      const owner = this.world.getComponent(eid, Owner)!;
      if (owner.playerId !== playerId) continue;
      const queue = this.world.getComponent(eid, TrainingQueue)!;
      for (const item of queue.queue) {
        const totalTime = UNIT_CONFIGS[item.unitType].trainTime;
        results.push({
          unitType: item.unitType,
          progress: 1 - (item.timeRemaining / totalTime),
        });
      }
    }
    return results;
  }

  getUnitCount(playerId: PlayerId): number {
    return this.world.query(Unit, Owner).filter(eid =>
      this.world.getComponent(eid, Owner)!.playerId === playerId
    ).length;
  }

  // --- Main Game Loop ---

  update(time: number, delta: number): void {
    if (this.gameOver) return;

    const dt = delta / 1000;
    this.tickAccumulator += dt;

    // Fixed timestep game logic at 20 Hz
    while (this.tickAccumulator >= this.TICK_RATE) {
      this.tickAccumulator -= this.TICK_RATE;
      this.gameTick(this.TICK_RATE);
    }

    // Render at full framerate
    this.renderEntities();
    this.renderSelectionBox();

    // Camera scroll with arrow keys
    const speed = 300 / this.cameras.main.zoom;
    const cursors = this.input.keyboard!.createCursorKeys();
    if (cursors.left.isDown) this.cameras.main.scrollX -= speed * dt;
    if (cursors.right.isDown) this.cameras.main.scrollX += speed * dt;
    if (cursors.up.isDown) this.cameras.main.scrollY -= speed * dt;
    if (cursors.down.isDown) this.cameras.main.scrollY += speed * dt;
  }

  private gameTick(dt: number): void {
    // Update systems
    this.economySystem.update(dt);
    this.trainingSystem.update(dt);
    this.movementSystem.update(dt);
    this.combatSystem.update(dt);
    this.winCondition.update();

    // Update AI
    for (const ai of this.aiControllers) {
      ai.update(dt, this.winCondition.eliminatedPlayers);
    }

    // Handle spawn events (create sprites)
    for (const evt of this.trainingSystem.spawnEvents) {
      // Sprite will be created in renderEntities
    }

    // Handle death events (remove sprites)
    for (const evt of this.combatSystem.deathEvents) {
      const sprite = this.sprites.get(evt.entityId);
      if (sprite) {
        sprite.destroy();
        this.sprites.delete(evt.entityId);
      }
    }

    // Clean up destroyed entities
    this.world.flushRemovals();

    // Clean up selected units that no longer exist
    for (const eid of this.selectedUnits) {
      if (!this.world.exists(eid)) this.selectedUnits.delete(eid);
    }

    // Check game over
    if (this.winCondition.isGameOver()) {
      this.gameOver = true;
      this.scene.get('UIScene').events.emit('game-over', this.winCondition.winner);
    }
  }

  // --- Rendering ---

  private renderEntities(): void {
    const allRenderable = this.world.query(Position, Renderable, Owner);

    for (const eid of allRenderable) {
      const pos = this.world.getComponent(eid, Position)!;
      const renderable = this.world.getComponent(eid, Renderable)!;
      const owner = this.world.getComponent(eid, Owner)!;
      const health = this.world.getComponent(eid, Health);
      const selectable = this.world.getComponent(eid, Selectable);
      const building = this.world.getComponent(eid, Building);
      const unit = this.world.getComponent(eid, Unit);

      let container = this.sprites.get(eid);

      if (!container) {
        container = this.createEntitySprite(eid, renderable, owner, building, unit);
        this.sprites.set(eid, container);
      }

      // Update position
      container.setPosition(pos.x, pos.y);

      // Update health bar
      if (health) {
        const healthBar = container.getByName('healthBar') as Phaser.GameObjects.Rectangle;
        const healthBg = container.getByName('healthBg') as Phaser.GameObjects.Rectangle;
        if (healthBar && healthBg) {
          const barWidth = building ? BUILDING_CONFIGS[building.buildingType].width : 12;
          healthBar.setSize(barWidth * health.ratio, 2);
          healthBar.setX(-barWidth / 2 + (barWidth * health.ratio) / 2);

          // Color based on health
          if (health.ratio > 0.6) healthBar.setFillStyle(0x22c55e);
          else if (health.ratio > 0.3) healthBar.setFillStyle(0xeab308);
          else healthBar.setFillStyle(0xef4444);
        }
      }

      // Selection indicator
      const selIndicator = container.getByName('selIndicator') as Phaser.GameObjects.Arc;
      if (selIndicator) {
        selIndicator.setVisible(selectable?.selected ?? false);
      }
    }

    // Remove sprites for entities that no longer exist
    for (const [eid, sprite] of this.sprites) {
      if (!this.world.exists(eid)) {
        sprite.destroy();
        this.sprites.delete(eid);
      }
    }
  }

  private createEntitySprite(
    eid: EntityId,
    renderable: Renderable,
    owner: Owner,
    building: Building | undefined,
    unit: Unit | undefined
  ): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const teamColor = TEAM_HEX[owner.playerId];
    const teamColorLight = TEAM_HEX_LIGHT[owner.playerId];

    if (building) {
      const cfg = BUILDING_CONFIGS[building.buildingType];
      const rect = this.add.rectangle(0, 0, cfg.width, cfg.height, teamColor, 0.8);
      rect.setStrokeStyle(1, teamColorLight);
      container.add(rect);

      // Building type indicator
      const label = building.buildingType === 'hq' ? 'HQ'
        : building.buildingType === 'generator' ? '$'
        : building.buildingType === 'barracks' ? 'B'
        : 'T';
      const text = this.add.text(0, 0, label, {
        fontSize: building.buildingType === 'hq' ? '10px' : '8px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(text);

      // Health bar
      const barWidth = cfg.width;
      const healthBg = this.add.rectangle(0, -cfg.height / 2 - 5, barWidth, 3, 0x1a1f2b).setName('healthBg');
      const healthBar = this.add.rectangle(0, -cfg.height / 2 - 5, barWidth, 2, 0x22c55e).setName('healthBar');
      container.add(healthBg);
      container.add(healthBar);

      // Flag on HQ
      if (building.buildingType === 'hq') {
        const flag = this.add.text(0, -cfg.height / 2 - 14, '⚑', {
          fontSize: '12px',
        }).setOrigin(0.5);
        container.add(flag);
      }
    } else if (unit) {
      const cfg = UNIT_CONFIGS[unit.unitType];
      const radius = cfg.radius;

      // Unit body
      const circle = this.add.circle(0, 0, radius, teamColor, 0.9);
      circle.setStrokeStyle(1, teamColorLight);
      container.add(circle);

      // Unit type indicator (small letter)
      const label = unit.unitType[0].toUpperCase();
      const text = this.add.text(0, 0, label, {
        fontSize: '7px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(text);

      // Health bar
      const healthBg = this.add.rectangle(0, -radius - 4, 12, 3, 0x1a1f2b).setName('healthBg');
      const healthBar = this.add.rectangle(0, -radius - 4, 12, 2, 0x22c55e).setName('healthBar');
      container.add(healthBg);
      container.add(healthBar);

      // Selection circle (hidden by default)
      const selIndicator = this.add.circle(0, 0, radius + 3)
        .setStrokeStyle(1, 0xffffff, 0.8)
        .setFillStyle(0xffffff, 0.05)
        .setName('selIndicator')
        .setVisible(false);
      container.add(selIndicator);
    }

    return container;
  }

  private renderSelectionBox(): void {
    if (this.dragStart && this.input.activePointer.leftButtonDown()) {
      const worldPos = this.cameras.main.getWorldPoint(
        this.input.activePointer.x,
        this.input.activePointer.y
      );
      const x = Math.min(this.dragStart.x, worldPos.x);
      const y = Math.min(this.dragStart.y, worldPos.y);
      const w = Math.abs(worldPos.x - this.dragStart.x);
      const h = Math.abs(worldPos.y - this.dragStart.y);

      if (this.selectionBox) this.selectionBox.destroy();
      this.selectionBox = this.add.rectangle(x + w / 2, y + h / 2, w, h)
        .setStrokeStyle(1, 0x22d3ee, 0.8)
        .setFillStyle(0x22d3ee, 0.1);
    }
  }
}
