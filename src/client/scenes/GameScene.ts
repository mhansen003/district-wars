// GameScene — Main gameplay with conveyor belt item system

import Phaser from 'phaser';
import { World } from '../../shared/ecs/World';
import { Position, Health, Attack, Movement, Owner, Building, Unit, Generator,
         Selectable, TrainingQueue, Collider, Renderable, Flag } from '../../shared/components';
import { EconomySystem } from '../../shared/systems/EconomySystem';
import { MovementSystem } from '../../shared/systems/MovementSystem';
import { CombatSystem } from '../../shared/systems/CombatSystem';
import { TrainingSystem } from '../../shared/systems/TrainingSystem';
import { WinConditionSystem } from '../../shared/systems/WinConditionSystem';
import { ConveyorSystem } from '../../shared/systems/ConveyorSystem';
import type { ConveyorItem, ConveyorItemType } from '../../shared/systems/ConveyorSystem';
import { UNIT_CONFIGS } from '../../shared/config/units';
import { BUILDING_CONFIGS } from '../../shared/config/buildings';
import { DISTRICT_SPAWNS, TEAM_HEX, TEAM_HEX_LIGHT, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '../../shared/types';
import type { PlayerId, EntityId, UnitType, BuildingType } from '../../shared/types';

export class GameScene extends Phaser.Scene {
  // ECS
  private world!: World;
  private economySystem!: EconomySystem;
  private movementSystem!: MovementSystem;
  private combatSystem!: CombatSystem;
  private trainingSystem!: TrainingSystem;
  private winCondition!: WinConditionSystem;
  private conveyorSystem!: ConveyorSystem;

  // Rendering
  private sprites: Map<EntityId, Phaser.GameObjects.Container> = new Map();
  private selectionBox: Phaser.GameObjects.Rectangle | null = null;
  private dragStart: { x: number; y: number } | null = null;

  // Player state
  private humanPlayer: PlayerId = 0;
  private selectedUnits: Set<EntityId> = new Set();

  // Conveyor drop preview
  private dropPreview: Phaser.GameObjects.Container | null = null;
  private droppingItem: ConveyorItem | null = null;

  // Game state
  private gameOver: boolean = false;
  private tickAccumulator: number = 0;
  private readonly TICK_RATE = 1 / 20;

  // AI timers
  private aiTimers: number[] = [0, 0, 0];

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
    this.conveyorSystem = new ConveyorSystem();

    this.createMap();

    // Initialize all 4 players
    for (let i = 0; i < 4; i++) {
      const pid = i as PlayerId;
      this.economySystem.initPlayer(pid);
      this.conveyorSystem.initPlayer(pid);
      this.spawnDistrict(pid);
    }

    // Camera
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.setZoom(1.5);
    this.cameras.main.centerOn(DISTRICT_SPAWNS[0].x, DISTRICT_SPAWNS[0].y);

    this.setupInput();

    // Launch UI
    this.scene.launch('UIScene', {
      gameScene: this,
      economy: this.economySystem,
      conveyor: this.conveyorSystem,
      humanPlayer: this.humanPlayer,
    });
  }

  private createMap(): void {
    this.add.rectangle(MAP_WIDTH / 2, MAP_HEIGHT / 2, MAP_WIDTH, MAP_HEIGHT, 0x0d1117);

    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x1a1f2b, 0.3);
    for (let x = 0; x <= MAP_WIDTH; x += TILE_SIZE) {
      gridGraphics.lineBetween(x, 0, x, MAP_HEIGHT);
    }
    for (let y = 0; y <= MAP_HEIGHT; y += TILE_SIZE) {
      gridGraphics.lineBetween(0, y, MAP_WIDTH, y);
    }

    const quadrantW = MAP_WIDTH / 2;
    const quadrantH = MAP_HEIGHT / 2;
    for (let i = 0; i < 4; i++) {
      const pid = i as PlayerId;
      const zoneX = pid === 1 || pid === 3 ? quadrantW : 0;
      const zoneY = pid === 2 || pid === 3 ? quadrantH : 0;
      this.add.rectangle(zoneX + quadrantW / 2, zoneY + quadrantH / 2, quadrantW, quadrantH, TEAM_HEX[pid], 0.04);
    }

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
  }

  private setupInput(): void {
    // Camera drag with middle mouse
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown()) {
        this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
      }

      // Update drop preview position
      if (this.droppingItem && this.dropPreview) {
        const worldPos = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.dropPreview.setPosition(worldPos.x, worldPos.y);
      }
    });

    // Left click: place dropping item or start selection
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        const worldPos = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

        if (this.droppingItem) {
          this.placeConveyorItem(this.droppingItem, worldPos.x, worldPos.y);
          return;
        }

        this.dragStart = { x: worldPos.x, y: worldPos.y };
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonReleased() && this.dragStart && !this.droppingItem) {
        const worldPos = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.handleSelection(this.dragStart, worldPos);
        this.dragStart = null;
        if (this.selectionBox) {
          this.selectionBox.destroy();
          this.selectionBox = null;
        }
      }
    });

    // Right click: move command or cancel drop
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        if (this.droppingItem) {
          this.cancelDrop();
          return;
        }
        if (this.selectedUnits.size > 0) {
          const worldPos = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
          this.issueCommand(worldPos.x, worldPos.y);
        }
      }
    });

    // ESC cancels drop
    this.input.keyboard!.on('keydown-ESCAPE', () => {
      if (this.droppingItem) this.cancelDrop();
      else this.clearSelection();
    });

    // Zoom
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _dx: number, dy: number) => {
      const zoom = this.cameras.main.zoom - dy * 0.001;
      this.cameras.main.setZoom(Phaser.Math.Clamp(zoom, 0.5, 3));
    });
  }

  // --- Conveyor Item Placement ---

  /** Called by UIScene when player picks up a conveyor item */
  public startDroppingItem(item: ConveyorItem): void {
    this.cancelDrop();
    this.droppingItem = item;
    this.clearSelection();

    // Create a ghost preview
    this.dropPreview = this.add.container(0, 0);
    const teamColor = TEAM_HEX[this.humanPlayer];

    if (item.isBuilding) {
      const cfg = BUILDING_CONFIGS[item.type as BuildingType];
      const rect = this.add.rectangle(0, 0, cfg.width, cfg.height, teamColor, 0.4);
      rect.setStrokeStyle(2, 0x22d3ee, 0.8);
      this.dropPreview.add(rect);
      const label = this.add.text(0, 0, item.icon, { fontSize: '14px' }).setOrigin(0.5);
      this.dropPreview.add(label);
    } else {
      const cfg = UNIT_CONFIGS[item.type as UnitType];
      const circle = this.add.circle(0, 0, cfg.radius + 2, teamColor, 0.4);
      circle.setStrokeStyle(2, 0x22d3ee, 0.8);
      this.dropPreview.add(circle);
      const label = this.add.text(0, 0, item.icon, { fontSize: '10px' }).setOrigin(0.5);
      this.dropPreview.add(label);
    }

    // Position at current mouse
    const pointer = this.input.activePointer;
    const worldPos = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.dropPreview.setPosition(worldPos.x, worldPos.y);
  }

  /** Cancel the current drop, return item to belt */
  public cancelDrop(): void {
    this.droppingItem = null;
    if (this.dropPreview) {
      this.dropPreview.destroy();
      this.dropPreview = null;
    }
  }

  public getDroppingItem(): ConveyorItem | null {
    return this.droppingItem;
  }

  private placeConveyorItem(item: ConveyorItem, x: number, y: number): void {
    // Consume item from belt
    this.conveyorSystem.useItem(this.humanPlayer, item.id);

    if (item.isBuilding) {
      this.spawnBuilding(item.type as BuildingType, this.humanPlayer, x, y);
    } else {
      this.spawnUnit(item.type as UnitType, this.humanPlayer, x, y);
    }

    // Clear drop state
    this.droppingItem = null;
    if (this.dropPreview) {
      this.dropPreview.destroy();
      this.dropPreview = null;
    }
  }

  // --- Entity Spawning ---

  public spawnBuilding(type: BuildingType, playerId: PlayerId, x: number, y: number): void {
    const cfg = BUILDING_CONFIGS[type];
    const components: object[] = [
      new Position(x, y),
      new Health(cfg.hp, cfg.hp),
      new Building(type),
      new Owner(playerId),
      new Renderable(type),
    ];
    if (type === 'generator') components.push(new Generator(2, 1));
    if (type === 'barracks') components.push(new TrainingQueue());
    this.world.createEntity(components);
  }

  public spawnUnit(type: UnitType, playerId: PlayerId, x: number, y: number): void {
    const cfg = UNIT_CONFIGS[type];
    this.world.createEntity([
      new Position(x, y),
      new Health(cfg.hp, cfg.hp),
      new Attack(cfg.damage, cfg.range, cfg.attackSpeed, cfg.isSiege),
      new Movement(cfg.moveSpeed),
      new Unit(type, cfg.strongAgainst, cfg.weakAgainst),
      new Owner(playerId),
      new Selectable(),
      new Collider(cfg.radius),
      new Renderable(type),
    ]);
  }

  // --- Selection & Commands ---

  private handleSelection(start: { x: number; y: number }, end: Phaser.Math.Vector2): void {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    const isClick = Math.abs(maxX - minX) < 5 && Math.abs(maxY - minY) < 5;

    this.clearSelection();

    if (isClick) {
      const allOwned = this.world.query(Position, Owner, Selectable);
      let nearest: EntityId | null = null;
      let nearestDist = 20;
      for (const eid of allOwned) {
        const owner = this.world.getComponent(eid, Owner)!;
        if (owner.playerId !== this.humanPlayer) continue;
        const pos = this.world.getComponent(eid, Position)!;
        const dx = pos.x - start.x;
        const dy = pos.y - start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) { nearest = eid; nearestDist = dist; }
      }
      if (nearest !== null) this.selectEntity(nearest);
    } else {
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

  // --- Public API for UIScene ---

  getConveyor(): ConveyorSystem { return this.conveyorSystem; }
  getEconomy(): EconomySystem { return this.economySystem; }
  getSelectedUnits(): Set<EntityId> { return this.selectedUnits; }
  getWorld(): World { return this.world; }
  getHumanPlayer(): PlayerId { return this.humanPlayer; }
  getWinCondition(): WinConditionSystem { return this.winCondition; }

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

    while (this.tickAccumulator >= this.TICK_RATE) {
      this.tickAccumulator -= this.TICK_RATE;
      this.gameTick(this.TICK_RATE);
    }

    this.renderEntities();
    this.renderSelectionBox();

    // Camera scroll
    const speed = 300 / this.cameras.main.zoom;
    const cursors = this.input.keyboard!.createCursorKeys();
    if (cursors.left.isDown) this.cameras.main.scrollX -= speed * dt;
    if (cursors.right.isDown) this.cameras.main.scrollX += speed * dt;
    if (cursors.up.isDown) this.cameras.main.scrollY -= speed * dt;
    if (cursors.down.isDown) this.cameras.main.scrollY += speed * dt;
  }

  private gameTick(dt: number): void {
    // Core systems
    this.economySystem.update(dt);
    this.conveyorSystem.update(dt, (pid) => this.economySystem.getIncome(pid));
    this.trainingSystem.update(dt);
    this.movementSystem.update(dt);
    this.combatSystem.update(dt);
    this.winCondition.update();

    // AI: use conveyor items automatically
    this.updateAI(dt);

    // Handle death events
    for (const evt of this.combatSystem.deathEvents) {
      const sprite = this.sprites.get(evt.entityId);
      if (sprite) { sprite.destroy(); this.sprites.delete(evt.entityId); }
    }

    this.world.flushRemovals();

    for (const eid of this.selectedUnits) {
      if (!this.world.exists(eid)) this.selectedUnits.delete(eid);
    }

    if (this.winCondition.isGameOver()) {
      this.gameOver = true;
      this.scene.get('UIScene').events.emit('game-over', this.winCondition.winner);
    }
  }

  // --- AI using conveyor items ---

  private updateAI(dt: number): void {
    for (let i = 0; i < 3; i++) {
      const pid = (i + 1) as PlayerId;
      if (this.winCondition.isEliminated(pid)) continue;

      this.aiTimers[i] += dt;
      const interval = i === 0 ? 2.5 : 1.5; // AI 1 is easy (slow), AI 2&3 faster
      if (this.aiTimers[i] < interval) continue;
      this.aiTimers[i] = 0;

      const belt = this.conveyorSystem.belts.get(pid);
      if (!belt || belt.length === 0) continue;

      // Pick the first item and use it
      const item = belt[0];
      this.conveyorSystem.useItem(pid, item.id);

      const spawn = DISTRICT_SPAWNS[pid];
      const offsetX = (Math.random() - 0.5) * 80;
      const offsetY = (Math.random() - 0.5) * 80;

      if (item.isBuilding) {
        this.spawnBuilding(item.type as BuildingType, pid, spawn.x + offsetX, spawn.y + offsetY);
      } else {
        // Spawn unit, then send it toward a target
        this.spawnUnit(item.type as UnitType, pid, spawn.x + offsetX, spawn.y + offsetY);

        // If AI has enough units, start attacking
        const unitCount = this.getUnitCount(pid);
        if (unitCount >= (i === 0 ? 5 : 4)) {
          this.sendAIUnitsToAttack(pid);
        }
      }
    }
  }

  private sendAIUnitsToAttack(playerId: PlayerId): void {
    // Find nearest non-eliminated enemy
    let targetPid: PlayerId | null = null;
    let nearestDist = Infinity;
    const mySpawn = DISTRICT_SPAWNS[playerId];

    for (const pid of [0, 1, 2, 3] as PlayerId[]) {
      if (pid === playerId || this.winCondition.isEliminated(pid)) continue;
      const s = DISTRICT_SPAWNS[pid];
      const d = Math.sqrt((s.x - mySpawn.x) ** 2 + (s.y - mySpawn.y) ** 2);
      if (d < nearestDist) { targetPid = pid; nearestDist = d; }
    }
    if (targetPid === null) return;

    const targetSpawn = DISTRICT_SPAWNS[targetPid];
    const units = this.world.query(Unit, Owner, Movement);
    for (const eid of units) {
      const owner = this.world.getComponent(eid, Owner)!;
      if (owner.playerId !== playerId) continue;
      const mov = this.world.getComponent(eid, Movement)!;
      if (mov.target) continue; // Already moving
      const attack = this.world.getComponent(eid, Attack);
      if (attack?.targetId !== null && attack?.targetId !== undefined && this.world.exists(attack.targetId)) continue;

      mov.target = {
        x: targetSpawn.x + (Math.random() - 0.5) * 60,
        y: targetSpawn.y + (Math.random() - 0.5) * 60,
      };
    }
  }

  // --- Rendering ---

  private renderEntities(): void {
    const allRenderable = this.world.query(Position, Renderable, Owner);

    for (const eid of allRenderable) {
      const pos = this.world.getComponent(eid, Position)!;
      const owner = this.world.getComponent(eid, Owner)!;
      const health = this.world.getComponent(eid, Health);
      const selectable = this.world.getComponent(eid, Selectable);
      const building = this.world.getComponent(eid, Building);
      const unit = this.world.getComponent(eid, Unit);

      let container = this.sprites.get(eid);
      if (!container) {
        container = this.createEntitySprite(owner, building, unit);
        this.sprites.set(eid, container);
      }

      container.setPosition(pos.x, pos.y);

      if (health) {
        const healthBar = container.getByName('healthBar') as Phaser.GameObjects.Rectangle;
        if (healthBar) {
          const barWidth = building ? BUILDING_CONFIGS[building.buildingType].width : 12;
          healthBar.setSize(barWidth * health.ratio, 2);
          healthBar.setX(-barWidth / 2 + (barWidth * health.ratio) / 2);
          if (health.ratio > 0.6) healthBar.setFillStyle(0x22c55e);
          else if (health.ratio > 0.3) healthBar.setFillStyle(0xeab308);
          else healthBar.setFillStyle(0xef4444);
        }
      }

      const selIndicator = container.getByName('selIndicator') as Phaser.GameObjects.Arc;
      if (selIndicator) selIndicator.setVisible(selectable?.selected ?? false);
    }

    for (const [eid, sprite] of this.sprites) {
      if (!this.world.exists(eid)) { sprite.destroy(); this.sprites.delete(eid); }
    }
  }

  private createEntitySprite(owner: Owner, building: Building | undefined, unit: Unit | undefined): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const teamColor = TEAM_HEX[owner.playerId];
    const teamColorLight = TEAM_HEX_LIGHT[owner.playerId];

    if (building) {
      const cfg = BUILDING_CONFIGS[building.buildingType];
      const rect = this.add.rectangle(0, 0, cfg.width, cfg.height, teamColor, 0.8);
      rect.setStrokeStyle(1, teamColorLight);
      container.add(rect);

      const label = building.buildingType === 'hq' ? 'HQ'
        : building.buildingType === 'generator' ? '$'
        : building.buildingType === 'barracks' ? 'B' : 'T';
      container.add(this.add.text(0, 0, label, {
        fontSize: building.buildingType === 'hq' ? '10px' : '8px',
        color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5));

      const barWidth = cfg.width;
      container.add(this.add.rectangle(0, -cfg.height / 2 - 5, barWidth, 3, 0x1a1f2b).setName('healthBg'));
      container.add(this.add.rectangle(0, -cfg.height / 2 - 5, barWidth, 2, 0x22c55e).setName('healthBar'));

      if (building.buildingType === 'hq') {
        container.add(this.add.text(0, -cfg.height / 2 - 14, '⚑', { fontSize: '12px' }).setOrigin(0.5));
      }
    } else if (unit) {
      const cfg = UNIT_CONFIGS[unit.unitType];
      const r = cfg.radius;
      const circle = this.add.circle(0, 0, r, teamColor, 0.9);
      circle.setStrokeStyle(1, teamColorLight);
      container.add(circle);

      container.add(this.add.text(0, 0, unit.unitType[0].toUpperCase(), {
        fontSize: '7px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5));

      container.add(this.add.rectangle(0, -r - 4, 12, 3, 0x1a1f2b).setName('healthBg'));
      container.add(this.add.rectangle(0, -r - 4, 12, 2, 0x22c55e).setName('healthBar'));

      container.add(this.add.circle(0, 0, r + 3)
        .setStrokeStyle(1, 0xffffff, 0.8).setFillStyle(0xffffff, 0.05)
        .setName('selIndicator').setVisible(false));
    }

    return container;
  }

  private renderSelectionBox(): void {
    if (this.dragStart && this.input.activePointer.leftButtonDown()) {
      const worldPos = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
      const x = Math.min(this.dragStart.x, worldPos.x);
      const y = Math.min(this.dragStart.y, worldPos.y);
      const w = Math.abs(worldPos.x - this.dragStart.x);
      const h = Math.abs(worldPos.y - this.dragStart.y);
      if (this.selectionBox) this.selectionBox.destroy();
      this.selectionBox = this.add.rectangle(x + w / 2, y + h / 2, w, h)
        .setStrokeStyle(1, 0x22d3ee, 0.8).setFillStyle(0x22d3ee, 0.1);
    }
  }
}
