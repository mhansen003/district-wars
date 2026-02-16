// UIScene — HUD overlay with conveyor belt item system

import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import type { EconomySystem } from '../../shared/systems/EconomySystem';
import type { ConveyorSystem, ConveyorItem } from '../../shared/systems/ConveyorSystem';
import type { PlayerId } from '../../shared/types';
import { TEAM_HEX, TEAM_COLORS } from '../../shared/types';

// Visual constants for the conveyor belt
const SLOT_W = 64;
const SLOT_H = 56;
const SLOT_GAP = 6;
const BAR_H = 80;

export class UIScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private economy!: EconomySystem;
  private conveyor!: ConveyorSystem;
  private humanPlayer!: PlayerId;

  // HUD elements
  private coinText!: Phaser.GameObjects.Text;
  private incomeText!: Phaser.GameObjects.Text;
  private unitCountText!: Phaser.GameObjects.Text;
  private playerIndicators: Phaser.GameObjects.Text[] = [];
  private gameOverPanel: Phaser.GameObjects.Container | null = null;
  private instructionsPanel: Phaser.GameObjects.Container | null = null;
  private gamePaused: boolean = true;

  // Conveyor belt UI
  private beltContainer!: Phaser.GameObjects.Container;
  private slotContainers: Phaser.GameObjects.Container[] = [];
  private timerBar!: Phaser.GameObjects.Rectangle;
  private timerBarBg!: Phaser.GameObjects.Rectangle;
  private nextItemText!: Phaser.GameObjects.Text;
  private dropIndicator!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene' });
  }

  init(data: {
    gameScene: GameScene;
    economy: EconomySystem;
    conveyor: ConveyorSystem;
    humanPlayer: PlayerId;
  }): void {
    this.gameScene = data.gameScene;
    this.economy = data.economy;
    this.conveyor = data.conveyor;
    this.humanPlayer = data.humanPlayer;
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // --- Top-left: Economy panel ---
    this.add.rectangle(0, 0, 200, 65, 0x0d1117, 0.85)
      .setOrigin(0, 0).setStrokeStyle(1, 0x30363d);

    this.coinText = this.add.text(12, 10, '', {
      fontSize: '16px', color: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.incomeText = this.add.text(12, 32, '', {
      fontSize: '12px', color: '#8b949e', fontFamily: 'monospace',
    });
    this.unitCountText = this.add.text(12, 48, '', {
      fontSize: '11px', color: '#8b949e', fontFamily: 'monospace',
    });

    // --- Top-right: Player status ---
    for (let i = 0; i < 4; i++) {
      const pid = i as PlayerId;
      const color = `#${TEAM_HEX[pid].toString(16).padStart(6, '0')}`;
      const label = i === 0 ? 'YOU' : `AI ${i}`;
      const indicator = this.add.text(w - 120, 10 + i * 20, `● ${label}`, {
        fontSize: '12px', color, fontFamily: 'monospace', fontStyle: 'bold',
      });
      this.playerIndicators.push(indicator);
    }

    // --- Bottom: Conveyor Belt ---
    this.createConveyorBelt();

    // Drop indicator (top center, shown when holding an item)
    this.dropIndicator = this.add.text(w / 2, 40, '', {
      fontSize: '14px', color: '#22d3ee', fontFamily: 'monospace',
      backgroundColor: '#0d1117', padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setVisible(false);

    // --- Instructions on launch ---
    this.showInstructions();

    // H or ? key toggles instructions
    this.input.keyboard!.on('keydown-H', () => {
      if (this.instructionsPanel) this.dismissInstructions();
      else if (!this.gameOverPanel) this.showInstructions();
    });

    // Listen for game over
    this.gameScene.events?.on('game-over', (winner: PlayerId) => this.showGameOver(winner));
    this.events.on('game-over', (winner: PlayerId) => this.showGameOver(winner));
  }

  // ─── Conveyor Belt ───────────────────────────────────────

  private createConveyorBelt(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.beltContainer = this.add.container(0, 0);

    // Bar background
    const barBg = this.add.rectangle(w / 2, h - BAR_H / 2, w, BAR_H, 0x0d1117, 0.92)
      .setStrokeStyle(1, 0x30363d);
    this.beltContainer.add(barBg);

    // "CONVEYOR" label
    const beltLabel = this.add.text(w / 2, h - BAR_H + 5, 'CONVEYOR BELT', {
      fontSize: '9px', color: '#484f58', fontFamily: 'monospace',
    }).setOrigin(0.5, 0);
    this.beltContainer.add(beltLabel);

    // Create 5 slot containers
    const totalW = this.conveyor.MAX_SLOTS * (SLOT_W + SLOT_GAP) - SLOT_GAP;
    const startX = (w - totalW) / 2 + SLOT_W / 2;
    const slotY = h - BAR_H / 2 + 4;

    for (let i = 0; i < this.conveyor.MAX_SLOTS; i++) {
      const x = startX + i * (SLOT_W + SLOT_GAP);
      const slot = this.createSlot(x, slotY, i);
      this.slotContainers.push(slot);
    }

    // Timer bar below slots
    const timerBarW = totalW;
    const timerBarY = h - 10;
    this.timerBarBg = this.add.rectangle(w / 2, timerBarY, timerBarW, 4, 0x1a1f2b);
    this.beltContainer.add(this.timerBarBg);
    this.timerBar = this.add.rectangle(
      w / 2 - timerBarW / 2, timerBarY, 0, 4, 0x22d3ee
    ).setOrigin(0, 0.5);
    this.beltContainer.add(this.timerBar);

    // Next item text
    this.nextItemText = this.add.text(w / 2 + timerBarW / 2 + 8, timerBarY, '', {
      fontSize: '10px', color: '#6e7681', fontFamily: 'monospace',
    }).setOrigin(0, 0.5);
    this.beltContainer.add(this.nextItemText);

    // Help button (far right of bar)
    const helpBtn = this.add.text(w - 16, h - BAR_H / 2, '?', {
      fontSize: '18px', color: '#484f58', fontFamily: 'monospace', fontStyle: 'bold',
      backgroundColor: '#161b22', padding: { x: 8, y: 4 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    helpBtn.on('pointerover', () => helpBtn.setColor('#8b949e'));
    helpBtn.on('pointerout', () => helpBtn.setColor('#484f58'));
    helpBtn.on('pointerdown', () => {
      if (this.instructionsPanel) this.dismissInstructions();
      else this.showInstructions();
    });
    this.beltContainer.add(helpBtn);
  }

  private createSlot(x: number, y: number, _index: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Slot background
    const bg = this.add.rectangle(0, 0, SLOT_W, SLOT_H, 0x161b22, 0.95)
      .setStrokeStyle(1, 0x30363d)
      .setInteractive({ useHandCursor: true });
    bg.setName('slotBg');
    container.add(bg);

    // Colored accent bar at top (hidden until item present)
    const accent = this.add.rectangle(0, -SLOT_H / 2 + 2, SLOT_W - 2, 3, 0x484f58, 0.3);
    accent.setName('accent');
    container.add(accent);

    // Icon (large, centered)
    const icon = this.add.text(0, -6, '', {
      fontSize: '18px', fontFamily: 'monospace',
    }).setOrigin(0.5);
    icon.setName('icon');
    container.add(icon);

    // Label (small, below icon)
    const label = this.add.text(0, 14, '', {
      fontSize: '8px', color: '#8b949e', fontFamily: 'monospace',
    }).setOrigin(0.5);
    label.setName('label');
    container.add(label);

    // Slot number in corner
    const num = this.add.text(SLOT_W / 2 - 4, -SLOT_H / 2 + 4, '', {
      fontSize: '8px', color: '#30363d', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    num.setName('num');
    container.add(num);

    // Click handler — pick up item
    bg.on('pointerdown', () => this.onSlotClick(_index));
    bg.on('pointerover', () => {
      const belt = this.conveyor.belts.get(this.humanPlayer);
      if (belt && belt[_index]) {
        bg.setStrokeStyle(1.5, 0x58a6ff);
      }
    });
    bg.on('pointerout', () => bg.setStrokeStyle(1, 0x30363d));

    this.beltContainer.add(container);
    return container;
  }

  private onSlotClick(index: number): void {
    // Don't pick up items while already dropping one
    if (this.gameScene.getDroppingItem()) return;

    const belt = this.conveyor.belts.get(this.humanPlayer);
    if (!belt || !belt[index]) return;

    const item = belt[index];
    this.gameScene.startDroppingItem(item);
  }

  // ─── Update Loop ───────────────────────────────────────

  update(): void {
    if (this.gameOverPanel) return;

    const income = this.economy.getIncome(this.humanPlayer);
    const genCount = this.economy.players.get(this.humanPlayer)?.generatorCount ?? 0;
    const unitCount = this.gameScene.getUnitCount(this.humanPlayer);
    const belt = this.conveyor.belts.get(this.humanPlayer) ?? [];
    const winCondition = this.gameScene.getWinCondition();
    const droppingItem = this.gameScene.getDroppingItem();

    // Economy display
    this.coinText.setText(`+${income.toFixed(1)}/sec`);
    this.incomeText.setText(`${genCount} generators`);
    this.unitCountText.setText(`${unitCount} units`);

    // Update conveyor slots
    for (let i = 0; i < this.conveyor.MAX_SLOTS; i++) {
      const slot = this.slotContainers[i];
      const item = belt[i] ?? null;
      this.updateSlot(slot, item, i);
    }

    // Timer bar
    const timeRemaining = this.conveyor.getTimeRemaining(this.humanPlayer);
    const interval = this.conveyor.getInterval(this.humanPlayer, income);
    const progress = belt.length >= this.conveyor.MAX_SLOTS ? 0 : 1 - (timeRemaining / interval);
    const totalW = this.conveyor.MAX_SLOTS * (SLOT_W + SLOT_GAP) - SLOT_GAP;
    const w = this.cameras.main.width;
    this.timerBar.setPosition(w / 2 - totalW / 2, this.timerBar.y);
    this.timerBar.setSize(totalW * Math.max(0, Math.min(1, progress)), 4);

    if (belt.length >= this.conveyor.MAX_SLOTS) {
      this.nextItemText.setText('FULL');
      this.nextItemText.setColor('#ef4444');
      this.timerBar.setFillStyle(0xef4444);
    } else {
      this.nextItemText.setText(`${timeRemaining.toFixed(1)}s`);
      this.nextItemText.setColor('#6e7681');
      this.timerBar.setFillStyle(0x22d3ee);
    }

    // Drop indicator
    if (droppingItem) {
      this.dropIndicator.setText(
        `PLACING ${droppingItem.label.toUpperCase()} ${droppingItem.icon} — Click map to place, ESC/right-click to cancel`
      );
      this.dropIndicator.setVisible(true);
    } else {
      this.dropIndicator.setVisible(false);
    }

    // Player status
    for (let i = 0; i < 4; i++) {
      const pid = i as PlayerId;
      const eliminated = winCondition.isEliminated(pid);
      const label = i === 0 ? 'YOU' : `AI ${i}`;
      const units = this.gameScene.getUnitCount(pid);
      if (eliminated) {
        this.playerIndicators[i].setText(`✕ ${label} [ELIMINATED]`);
        this.playerIndicators[i].setAlpha(0.4);
      } else {
        this.playerIndicators[i].setText(`● ${label}  ⚔${units}`);
      }
    }
  }

  private updateSlot(slot: Phaser.GameObjects.Container, item: ConveyorItem | null, index: number): void {
    const bg = slot.getByName('slotBg') as Phaser.GameObjects.Rectangle;
    const accent = slot.getByName('accent') as Phaser.GameObjects.Rectangle;
    const icon = slot.getByName('icon') as Phaser.GameObjects.Text;
    const label = slot.getByName('label') as Phaser.GameObjects.Text;
    const num = slot.getByName('num') as Phaser.GameObjects.Text;

    if (item) {
      // Filled slot
      const colorHex = `#${item.color.toString(16).padStart(6, '0')}`;
      accent.setFillStyle(item.color, 0.9);
      icon.setText(item.icon);
      label.setText(item.label);
      label.setColor(colorHex);
      num.setText(`${index + 1}`);
      num.setColor('#484f58');
      bg.setAlpha(1);
      bg.setFillStyle(0x161b22, 0.95);

      // Highlight if this item is currently being dropped
      const dropping = this.gameScene.getDroppingItem();
      if (dropping && dropping.id === item.id) {
        bg.setStrokeStyle(2, 0x22d3ee);
        bg.setAlpha(0.6);
      }
    } else {
      // Empty slot
      accent.setFillStyle(0x484f58, 0.15);
      icon.setText('');
      label.setText('');
      num.setText(`${index + 1}`);
      num.setColor('#21262d');
      bg.setAlpha(0.5);
      bg.setFillStyle(0x0d1117, 0.6);
    }
  }

  // ─── Instructions Modal ────────────────────────────────

  private showInstructions(): void {
    if (this.instructionsPanel) return;

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.gamePaused = true;
    this.gameScene.scene.pause();

    this.instructionsPanel = this.add.container(w / 2, h / 2);

    // Dimmed backdrop
    this.instructionsPanel.add(this.add.rectangle(0, 0, w * 2, h * 2, 0x000000, 0.6));

    // Modal panel
    const panelW = Math.min(500, w - 40);
    const panelH = Math.min(460, h - 40);
    this.instructionsPanel.add(
      this.add.rectangle(0, 0, panelW, panelH, 0x0d1117, 0.97).setStrokeStyle(2, 0x30363d)
    );

    const lines: { text: string; style: Partial<Phaser.Types.GameObjects.Text.TextStyle>; y: number }[] = [
      { text: 'DISTRICT WARS', style: { fontSize: '24px', color: '#e6edf3', fontStyle: 'bold' }, y: -panelH / 2 + 32 },
      { text: 'Build. Battle. Conquer.', style: { fontSize: '12px', color: '#6e7681' }, y: -panelH / 2 + 55 },

      { text: 'YOUR GOAL', style: { fontSize: '13px', color: '#2563eb', fontStyle: 'bold' }, y: -panelH / 2 + 85 },
      { text: 'Destroy all 3 enemy HQs to capture their flags.', style: { fontSize: '12px', color: '#c9d1d9' }, y: -panelH / 2 + 102 },
      { text: 'You are RED. The AI controls Blue, Green, and Purple.', style: { fontSize: '12px', color: '#fca5a5' }, y: -panelH / 2 + 119 },

      { text: 'THE CONVEYOR BELT', style: { fontSize: '13px', color: '#22c55e', fontStyle: 'bold' }, y: -panelH / 2 + 150 },
      { text: 'Random items appear on your conveyor belt at the bottom.', style: { fontSize: '12px', color: '#c9d1d9' }, y: -panelH / 2 + 170 },
      { text: 'Click an item to pick it up, then click the map to place it.', style: { fontSize: '12px', color: '#c9d1d9' }, y: -panelH / 2 + 187 },
      { text: 'Buildings go where you click. Units spawn & fight automatically.', style: { fontSize: '12px', color: '#c9d1d9' }, y: -panelH / 2 + 204 },
      { text: 'Build Generators to speed up item delivery!', style: { fontSize: '11px', color: '#22d3ee' }, y: -panelH / 2 + 224 },

      { text: 'UNIT CONTROLS', style: { fontSize: '13px', color: '#f59e0b', fontStyle: 'bold' }, y: -panelH / 2 + 254 },
      { text: 'Left-click or drag to select your units.', style: { fontSize: '12px', color: '#c9d1d9' }, y: -panelH / 2 + 274 },
      { text: 'Right-click to send selected units somewhere.', style: { fontSize: '12px', color: '#c9d1d9' }, y: -panelH / 2 + 291 },
      { text: 'Units auto-attack nearby enemies.', style: { fontSize: '12px', color: '#c9d1d9' }, y: -panelH / 2 + 308 },

      { text: 'COMBAT ROCK-PAPER-SCISSORS', style: { fontSize: '13px', color: '#ef4444', fontStyle: 'bold' }, y: -panelH / 2 + 340 },
      { text: 'Trooper > Archer > Tank > Trooper', style: { fontSize: '14px', color: '#fca5a5', fontStyle: 'bold' }, y: -panelH / 2 + 360 },

      { text: 'TIPS', style: { fontSize: '13px', color: '#eab308', fontStyle: 'bold' }, y: -panelH / 2 + 392 },
      { text: 'ESC or right-click to cancel placing an item.', style: { fontSize: '11px', color: '#c9d1d9' }, y: -panelH / 2 + 410 },
      { text: 'Scroll wheel to zoom. Middle-drag or arrows to pan.', style: { fontSize: '11px', color: '#c9d1d9' }, y: -panelH / 2 + 427 },
    ];

    for (const line of lines) {
      this.instructionsPanel.add(
        this.add.text(0, line.y, line.text, {
          ...line.style, fontFamily: 'monospace',
        } as Phaser.Types.GameObjects.Text.TextStyle).setOrigin(0.5)
      );
    }

    // Start button
    const startBtn = this.add.text(0, panelH / 2 - 40, '[ START GAME ]', {
      fontSize: '18px', color: '#22c55e', fontFamily: 'monospace', fontStyle: 'bold',
      backgroundColor: '#161b22', padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    startBtn.on('pointerover', () => startBtn.setColor('#4ade80'));
    startBtn.on('pointerout', () => startBtn.setColor('#22c55e'));
    startBtn.on('pointerdown', () => this.dismissInstructions());
    this.instructionsPanel.add(startBtn);

    // Tip
    this.instructionsPanel.add(
      this.add.text(0, panelH / 2 - 12, 'Press ? or H anytime to show this again', {
        fontSize: '10px', color: '#484f58', fontFamily: 'monospace',
      }).setOrigin(0.5)
    );
  }

  private dismissInstructions(): void {
    if (this.instructionsPanel) {
      this.instructionsPanel.destroy();
      this.instructionsPanel = null;
    }
    this.gamePaused = false;
    this.gameScene.scene.resume();
  }

  // ─── Game Over ─────────────────────────────────────────

  private showGameOver(winner: PlayerId): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.gameOverPanel = this.add.container(w / 2, h / 2);

    this.gameOverPanel.add(
      this.add.rectangle(0, 0, 400, 200, 0x0d1117, 0.95).setStrokeStyle(2, 0x30363d)
    );

    const isWin = winner === this.humanPlayer;
    this.gameOverPanel.add(
      this.add.text(0, -50, isWin ? 'VICTORY!' : 'DEFEAT', {
        fontSize: '36px', color: isWin ? '#22c55e' : '#ef4444',
        fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5)
    );

    this.gameOverPanel.add(
      this.add.text(0, 0, isWin
        ? 'You conquered all four districts!'
        : `${TEAM_COLORS[winner].toUpperCase()} district won the war.`, {
        fontSize: '14px', color: '#8b949e', fontFamily: 'monospace',
      }).setOrigin(0.5)
    );

    const restartBtn = this.add.text(0, 50, '[ PLAY AGAIN ]', {
      fontSize: '16px', color: '#2563eb', fontFamily: 'monospace', fontStyle: 'bold',
      backgroundColor: '#161b22', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    restartBtn.on('pointerover', () => restartBtn.setColor('#3b82f6'));
    restartBtn.on('pointerout', () => restartBtn.setColor('#2563eb'));
    restartBtn.on('pointerdown', () => {
      this.scene.stop('UIScene');
      this.scene.stop('GameScene');
      this.scene.start('GameScene');
    });
    this.gameOverPanel.add(restartBtn);
  }
}
