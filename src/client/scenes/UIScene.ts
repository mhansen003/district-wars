// UIScene — HUD overlay with clickable action bar

import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import type { EconomySystem } from '../../shared/systems/EconomySystem';
import type { PlayerId, UnitType } from '../../shared/types';
import { TEAM_HEX, TEAM_COLORS } from '../../shared/types';
import { UNIT_CONFIGS } from '../../shared/config/units';
import { ECONOMY } from '../../shared/config/economy';

interface ActionButton {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
  hotkey: Phaser.GameObjects.Text;
  getCost: () => number;
  action: () => void;
}

export class UIScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private economy!: EconomySystem;
  private humanPlayer!: PlayerId;

  // HUD elements
  private coinText!: Phaser.GameObjects.Text;
  private incomeText!: Phaser.GameObjects.Text;
  private unitCountText!: Phaser.GameObjects.Text;
  private buildModeText!: Phaser.GameObjects.Text;
  private queueText!: Phaser.GameObjects.Text;
  private playerIndicators: Phaser.GameObjects.Text[] = [];
  private gameOverPanel: Phaser.GameObjects.Container | null = null;
  private instructionsPanel: Phaser.GameObjects.Container | null = null;
  private gamePaused: boolean = true;

  // Action bar
  private actionButtons: ActionButton[] = [];
  private actionBarContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'UIScene' });
  }

  init(data: { gameScene: GameScene; economy: EconomySystem; humanPlayer: PlayerId }): void {
    this.gameScene = data.gameScene;
    this.economy = data.economy;
    this.humanPlayer = data.humanPlayer;
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // --- Top-left: Economy panel ---
    this.add.rectangle(0, 0, 220, 90, 0x0d1117, 0.85)
      .setOrigin(0, 0).setStrokeStyle(1, 0x30363d);

    this.coinText = this.add.text(12, 10, '', {
      fontSize: '16px', color: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.incomeText = this.add.text(12, 32, '', {
      fontSize: '12px', color: '#8b949e', fontFamily: 'monospace',
    });
    this.unitCountText = this.add.text(12, 50, '', {
      fontSize: '12px', color: '#8b949e', fontFamily: 'monospace',
    });
    this.queueText = this.add.text(12, 68, '', {
      fontSize: '11px', color: '#a78bfa', fontFamily: 'monospace',
    });

    // Build mode indicator (top center)
    this.buildModeText = this.add.text(w / 2, 40, '', {
      fontSize: '14px', color: '#22d3ee', fontFamily: 'monospace',
      backgroundColor: '#0d1117', padding: { x: 10, y: 5 },
    }).setOrigin(0.5);

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

    // --- Bottom: Action Bar ---
    this.createActionBar();

    // --- Instructions on launch ---
    this.showInstructions();

    // H key toggles instructions
    this.input.keyboard!.on('keydown-H', () => {
      if (this.instructionsPanel) this.dismissInstructions();
      else if (!this.gameOverPanel) this.showInstructions();
    });

    // Listen for game over
    this.gameScene.events?.on('game-over', (winner: PlayerId) => this.showGameOver(winner));
    this.events.on('game-over', (winner: PlayerId) => this.showGameOver(winner));
  }

  // ─── Action Bar ────────────────────────────────────────

  private createActionBar(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Bar background
    const barH = 72;
    const barBg = this.add.rectangle(w / 2, h - barH / 2, w, barH, 0x0d1117, 0.92)
      .setStrokeStyle(1, 0x30363d);

    this.actionBarContainer = this.add.container(0, 0);
    this.actionBarContainer.add(barBg);

    // Section label helper
    const addSectionLabel = (x: number, text: string) => {
      const label = this.add.text(x, h - barH + 4, text, {
        fontSize: '9px', color: '#484f58', fontFamily: 'monospace',
      }).setOrigin(0.5, 0);
      this.actionBarContainer.add(label);
    };

    // Button definitions
    const buttonDefs = [
      // BUILD section
      { label: '⚡ Generator', hotkey: 'G', cost: ECONOMY.GENERATOR_BASE_COST, color: 0x22c55e,
        action: () => this.gameScene.enterBuildMode('generator'), section: 'BUILD' },
      { label: '🏠 Barracks', hotkey: 'B', cost: ECONOMY.BARRACKS_COST, color: 0x8b5cf6,
        action: () => this.gameScene.enterBuildMode('barracks'), section: 'BUILD' },
      // TRAIN section
      { label: '⚔ Trooper', hotkey: '1', cost: UNIT_CONFIGS.trooper.cost, color: 0xdc2626,
        action: () => this.gameScene.trainUnit('trooper'), section: 'TRAIN' },
      { label: '🏹 Archer', hotkey: '2', cost: UNIT_CONFIGS.archer.cost, color: 0x16a34a,
        action: () => this.gameScene.trainUnit('archer'), section: 'TRAIN' },
      { label: '🛡 Tank', hotkey: '3', cost: UNIT_CONFIGS.tank.cost, color: 0xf59e0b,
        action: () => this.gameScene.trainUnit('tank'), section: 'TRAIN' },
      { label: '👁 Scout', hotkey: '4', cost: UNIT_CONFIGS.scout.cost, color: 0x06b6d4,
        action: () => this.gameScene.trainUnit('scout'), section: 'TRAIN' },
    ];

    const btnW = 88;
    const btnH = 48;
    const gap = 6;
    const totalW = buttonDefs.length * (btnW + gap) - gap;
    const startX = (w - totalW) / 2 + btnW / 2;
    const btnY = h - barH / 2 + 2;

    // Section labels
    const buildCenterX = startX + (btnW + gap) * 0.5;
    const trainCenterX = startX + (btnW + gap) * 3.5;
    addSectionLabel(buildCenterX, 'BUILD');
    addSectionLabel(trainCenterX, 'TRAIN UNITS');

    // Separator line between BUILD and TRAIN
    const sepX = startX + (btnW + gap) * 2 - gap / 2 - btnW / 2;
    const sep = this.add.rectangle(sepX, btnY, 1, btnH, 0x30363d);
    this.actionBarContainer.add(sep);

    for (let i = 0; i < buttonDefs.length; i++) {
      const def = buttonDefs[i];
      const x = startX + i * (btnW + gap);
      const btn = this.createActionButton(x, btnY, btnW, btnH, def);
      this.actionButtons.push(btn);
    }

    // Help button (far right)
    const helpBtn = this.add.text(w - 16, h - barH / 2, '?', {
      fontSize: '18px', color: '#484f58', fontFamily: 'monospace', fontStyle: 'bold',
      backgroundColor: '#161b22', padding: { x: 8, y: 4 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    helpBtn.on('pointerover', () => helpBtn.setColor('#8b949e'));
    helpBtn.on('pointerout', () => helpBtn.setColor('#484f58'));
    helpBtn.on('pointerdown', () => {
      if (this.instructionsPanel) this.dismissInstructions();
      else this.showInstructions();
    });
    this.actionBarContainer.add(helpBtn);
  }

  private createActionButton(
    x: number, y: number, w: number, h: number,
    def: { label: string; hotkey: string; cost: number; color: number; action: () => void }
  ): ActionButton {
    const container = this.add.container(x, y);

    // Button background
    const bg = this.add.rectangle(0, 0, w, h, 0x161b22, 0.95)
      .setStrokeStyle(1, 0x30363d)
      .setInteractive({ useHandCursor: true });
    container.add(bg);

    // Colored accent bar at top
    const accent = this.add.rectangle(0, -h / 2 + 2, w - 2, 3, def.color, 0.8);
    container.add(accent);

    // Label
    const label = this.add.text(0, -6, def.label, {
      fontSize: '10px', color: '#e6edf3', fontFamily: 'monospace',
    }).setOrigin(0.5);
    container.add(label);

    // Cost
    const cost = this.add.text(0, 10, `$${def.cost}`, {
      fontSize: '10px', color: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(cost);

    // Hotkey badge
    const hotkey = this.add.text(w / 2 - 4, -h / 2 + 6, def.hotkey, {
      fontSize: '8px', color: '#6e7681', fontFamily: 'monospace',
      backgroundColor: '#0d1117', padding: { x: 3, y: 1 },
    }).setOrigin(1, 0);
    container.add(hotkey);

    // Click handler
    bg.on('pointerdown', () => def.action());
    bg.on('pointerover', () => bg.setStrokeStyle(1.5, 0x58a6ff));
    bg.on('pointerout', () => bg.setStrokeStyle(1, 0x30363d));

    this.actionBarContainer.add(container);

    return {
      container, bg, label, cost, hotkey,
      getCost: () => def.cost,
      action: def.action,
    };
  }

  // ─── Update Loop ───────────────────────────────────────

  update(): void {
    if (this.gameOverPanel) return;

    const coins = this.economy.getCoins(this.humanPlayer);
    const income = this.economy.getIncome(this.humanPlayer);
    const genCount = this.economy.players.get(this.humanPlayer)?.generatorCount ?? 0;
    const unitCount = this.gameScene.getUnitCount(this.humanPlayer);
    const training = this.gameScene.getTrainingProgress(this.humanPlayer);
    const buildMode = this.gameScene.getBuildMode();
    const winCondition = this.gameScene.getWinCondition();

    // Economy display
    this.coinText.setText(`$${Math.floor(coins)}`);
    this.incomeText.setText(`+${income.toFixed(1)}/sec  |  ${genCount} generators`);
    this.unitCountText.setText(`${unitCount} units`);

    // Training queue
    if (training.length > 0) {
      const queueStr = training.map(t => {
        const pct = Math.floor(t.progress * 100);
        return `${t.unitType[0].toUpperCase()}:${pct}%`;
      }).join('  ');
      this.queueText.setText(`Training: ${queueStr}`);
    } else {
      this.queueText.setText('');
    }

    // Build mode indicator
    if (buildMode) {
      this.buildModeText.setText(`PLACING ${buildMode.toUpperCase()} — Click map to place, ESC or right-click to cancel`);
      this.buildModeText.setVisible(true);
    } else {
      this.buildModeText.setVisible(false);
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

    // Action button affordability
    for (const btn of this.actionButtons) {
      const canAfford = coins >= btn.getCost();
      btn.bg.setAlpha(canAfford ? 1 : 0.4);
      btn.label.setAlpha(canAfford ? 1 : 0.4);
      btn.cost.setAlpha(canAfford ? 1 : 0.5);
      btn.cost.setColor(canAfford ? '#ffd700' : '#ef4444');
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
    const panelH = Math.min(440, h - 40);
    this.instructionsPanel.add(
      this.add.rectangle(0, 0, panelW, panelH, 0x0d1117, 0.97).setStrokeStyle(2, 0x30363d)
    );

    const lines: { text: string; style: Partial<Phaser.Types.GameObjects.Text.TextStyle>; y: number }[] = [
      { text: 'DISTRICT WARS', style: { fontSize: '24px', color: '#e6edf3', fontStyle: 'bold' }, y: -panelH / 2 + 32 },
      { text: 'Build. Battle. Conquer.', style: { fontSize: '12px', color: '#6e7681' }, y: -panelH / 2 + 55 },

      { text: 'YOUR GOAL', style: { fontSize: '13px', color: '#2563eb', fontStyle: 'bold' }, y: -panelH / 2 + 85 },
      { text: 'Destroy all 3 enemy HQs to capture their flags.', style: { fontSize: '12px', color: '#c9d1d9' }, y: -panelH / 2 + 102 },
      { text: 'You are RED. The AI controls Blue, Green, and Purple.', style: { fontSize: '12px', color: '#fca5a5' }, y: -panelH / 2 + 119 },

      { text: 'HOW TO PLAY', style: { fontSize: '13px', color: '#22c55e', fontStyle: 'bold' }, y: -panelH / 2 + 150 },
      { text: '1. Click the buttons at the bottom to build & train', style: { fontSize: '12px', color: '#c9d1d9' }, y: -panelH / 2 + 170 },
      { text: '2. Click the map to place buildings', style: { fontSize: '12px', color: '#c9d1d9' }, y: -panelH / 2 + 187 },
      { text: '3. Left-click or drag to select your units', style: { fontSize: '12px', color: '#c9d1d9' }, y: -panelH / 2 + 204 },
      { text: '4. Right-click to send selected units somewhere', style: { fontSize: '12px', color: '#c9d1d9' }, y: -panelH / 2 + 221 },
      { text: '5. Units auto-attack nearby enemies', style: { fontSize: '12px', color: '#c9d1d9' }, y: -panelH / 2 + 238 },

      { text: 'COMBAT ROCK-PAPER-SCISSORS', style: { fontSize: '13px', color: '#ef4444', fontStyle: 'bold' }, y: -panelH / 2 + 270 },
      { text: 'Trooper > Archer > Tank > Trooper', style: { fontSize: '14px', color: '#fca5a5', fontStyle: 'bold' }, y: -panelH / 2 + 290 },

      { text: 'TIPS', style: { fontSize: '13px', color: '#eab308', fontStyle: 'bold' }, y: -panelH / 2 + 320 },
      { text: 'Build Generators early for more income.', style: { fontSize: '11px', color: '#c9d1d9' }, y: -panelH / 2 + 338 },
      { text: 'You need a Barracks before you can train units.', style: { fontSize: '11px', color: '#c9d1d9' }, y: -panelH / 2 + 355 },
      { text: 'Scroll wheel to zoom. Middle-drag or arrows to pan.', style: { fontSize: '11px', color: '#c9d1d9' }, y: -panelH / 2 + 372 },
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
