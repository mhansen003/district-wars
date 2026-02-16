// UIScene — HUD overlay rendered on top of the game scene

import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import type { EconomySystem } from '../../shared/systems/EconomySystem';
import type { PlayerId } from '../../shared/types';
import { TEAM_HEX, TEAM_COLORS } from '../../shared/types';
import { UNIT_CONFIGS } from '../../shared/config/units';
import { ECONOMY } from '../../shared/config/economy';

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
  private helpText!: Phaser.GameObjects.Text;
  private playerIndicators: Phaser.GameObjects.Text[] = [];
  private gameOverPanel: Phaser.GameObjects.Container | null = null;
  private instructionsPanel: Phaser.GameObjects.Container | null = null;
  private gamePaused: boolean = true; // Start paused until instructions dismissed

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

    // Top-left: Economy panel
    const panelBg = this.add.rectangle(0, 0, 220, 90, 0x0d1117, 0.85)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x30363d);

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

    // Build mode indicator
    this.buildModeText = this.add.text(w / 2, 40, '', {
      fontSize: '14px', color: '#22d3ee', fontFamily: 'monospace',
      backgroundColor: '#0d1117',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5);

    // Top-right: Player status indicators
    for (let i = 0; i < 4; i++) {
      const pid = i as PlayerId;
      const color = `#${TEAM_HEX[pid].toString(16).padStart(6, '0')}`;
      const label = i === 0 ? 'YOU' : `AI ${i}`;
      const indicator = this.add.text(w - 120, 10 + i * 20, `● ${label}`, {
        fontSize: '12px',
        color,
        fontFamily: 'monospace',
        fontStyle: 'bold',
      });
      this.playerIndicators.push(indicator);
    }

    // Bottom: Control hints
    this.helpText = this.add.text(w / 2, h - 10, '', {
      fontSize: '11px',
      color: '#6e7681',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5, 1);

    this.updateHelp();

    // Show instructions on launch
    this.showInstructions();

    // H key toggles instructions
    this.input.keyboard!.on('keydown-H', () => {
      if (this.instructionsPanel) {
        this.dismissInstructions();
      } else if (!this.gameOverPanel) {
        this.showInstructions();
      }
    });

    // Listen for game over
    this.gameScene.events?.on('game-over', (winner: PlayerId) => {
      this.showGameOver(winner);
    });
    // Also listen on this scene
    this.events.on('game-over', (winner: PlayerId) => {
      this.showGameOver(winner);
    });
  }

  private updateHelp(): void {
    this.helpText.setText(
      '[G] Generator  [B] Barracks  [1] Trooper  [2] Archer  [3] Tank  [4] Scout  [RMB] Move  [H] Help  [ESC] Cancel'
    );
  }

  update(): void {
    if (this.gameOverPanel) return;

    const coins = this.economy.getCoins(this.humanPlayer);
    const income = this.economy.getIncome(this.humanPlayer);
    const genCount = this.economy.players.get(this.humanPlayer)?.generatorCount ?? 0;
    const unitCount = this.gameScene.getUnitCount(this.humanPlayer);
    const training = this.gameScene.getTrainingProgress(this.humanPlayer);
    const buildMode = this.gameScene.getBuildMode();
    const winCondition = this.gameScene.getWinCondition();

    // Update economy display
    this.coinText.setText(`💰 ${Math.floor(coins)} coins`);
    this.incomeText.setText(`📈 +${income.toFixed(1)}/sec  ⚡ ${genCount} generators`);
    this.unitCountText.setText(`⚔ ${unitCount} units`);

    // Training queue
    if (training.length > 0) {
      const queueStr = training.map(t => {
        const pct = Math.floor(t.progress * 100);
        return `${t.unitType[0].toUpperCase()}:${pct}%`;
      }).join('  ');
      this.queueText.setText(`🔨 ${queueStr}`);
    } else {
      this.queueText.setText('');
    }

    // Build mode indicator
    if (buildMode) {
      this.buildModeText.setText(`⬜ PLACING ${buildMode.toUpperCase()} — Click to place, ESC to cancel`);
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
  }

  private showInstructions(): void {
    if (this.instructionsPanel) return;

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Pause the game scene
    this.gamePaused = true;
    this.gameScene.scene.pause();

    this.instructionsPanel = this.add.container(w / 2, h / 2);

    // Dimmed backdrop
    const dimBg = this.add.rectangle(0, 0, w, h, 0x000000, 0.6);
    this.instructionsPanel.add(dimBg);

    // Modal panel
    const panelW = Math.min(580, w - 40);
    const panelH = Math.min(520, h - 40);
    const panel = this.add.rectangle(0, 0, panelW, panelH, 0x0d1117, 0.97)
      .setStrokeStyle(2, 0x30363d);
    this.instructionsPanel.add(panel);

    const lines: { text: string; style: Partial<Phaser.Types.GameObjects.Text.TextStyle>; yOffset: number }[] = [
      { text: 'HOW TO PLAY', style: { fontSize: '22px', color: '#e6edf3', fontStyle: 'bold' }, yOffset: -panelH / 2 + 30 },

      { text: 'OBJECTIVE', style: { fontSize: '13px', color: '#2563eb', fontStyle: 'bold' }, yOffset: -panelH / 2 + 65 },
      { text: 'Destroy all 3 enemy HQs to capture their flags and win.', style: { fontSize: '12px', color: '#8b949e' }, yOffset: -panelH / 2 + 82 },

      { text: 'ECONOMY', style: { fontSize: '13px', color: '#22c55e', fontStyle: 'bold' }, yOffset: -panelH / 2 + 112 },
      { text: 'You earn coins automatically. Build Generators to earn more.', style: { fontSize: '12px', color: '#8b949e' }, yOffset: -panelH / 2 + 129 },
      { text: 'Spend coins on buildings or soldiers — every coin is a choice.', style: { fontSize: '12px', color: '#8b949e' }, yOffset: -panelH / 2 + 146 },

      { text: 'COMBAT', style: { fontSize: '13px', color: '#ef4444', fontStyle: 'bold' }, yOffset: -panelH / 2 + 176 },
      { text: 'Trooper beats Archer.  Archer beats Tank.  Tank beats Trooper.', style: { fontSize: '12px', color: '#fca5a5' }, yOffset: -panelH / 2 + 193 },
      { text: 'Units auto-attack nearby enemies. Right-click to direct them.', style: { fontSize: '12px', color: '#8b949e' }, yOffset: -panelH / 2 + 210 },

      { text: 'CONTROLS', style: { fontSize: '13px', color: '#a78bfa', fontStyle: 'bold' }, yOffset: -panelH / 2 + 245 },
      { text: 'Left click          Select units / buildings', style: { fontSize: '11px', color: '#c9d1d9' }, yOffset: -panelH / 2 + 265 },
      { text: 'Left drag           Box-select multiple units', style: { fontSize: '11px', color: '#c9d1d9' }, yOffset: -panelH / 2 + 282 },
      { text: 'Right click         Move / attack command', style: { fontSize: '11px', color: '#c9d1d9' }, yOffset: -panelH / 2 + 299 },
      { text: 'Middle drag         Pan camera', style: { fontSize: '11px', color: '#c9d1d9' }, yOffset: -panelH / 2 + 316 },
      { text: 'Scroll wheel        Zoom in / out', style: { fontSize: '11px', color: '#c9d1d9' }, yOffset: -panelH / 2 + 333 },
      { text: 'Arrow keys          Pan camera', style: { fontSize: '11px', color: '#c9d1d9' }, yOffset: -panelH / 2 + 350 },

      { text: 'HOTKEYS', style: { fontSize: '13px', color: '#eab308', fontStyle: 'bold' }, yOffset: -panelH / 2 + 380 },
      { text: 'G  Build Generator ($100)    1  Train Trooper ($50)', style: { fontSize: '11px', color: '#c9d1d9' }, yOffset: -panelH / 2 + 400 },
      { text: 'B  Build Barracks  ($150)    2  Train Archer  ($75)', style: { fontSize: '11px', color: '#c9d1d9' }, yOffset: -panelH / 2 + 417 },
      { text: 'H  Toggle this help          3  Train Tank   ($150)', style: { fontSize: '11px', color: '#c9d1d9' }, yOffset: -panelH / 2 + 434 },
      { text: 'ESC  Cancel action           4  Train Scout   ($30)', style: { fontSize: '11px', color: '#c9d1d9' }, yOffset: -panelH / 2 + 451 },
    ];

    for (const line of lines) {
      const textObj = this.add.text(0, line.yOffset, line.text, {
        ...line.style,
        fontFamily: 'monospace',
      } as Phaser.Types.GameObjects.Text.TextStyle).setOrigin(0.5);
      this.instructionsPanel.add(textObj);
    }

    // Start button
    const startBtn = this.add.text(0, panelH / 2 - 35, '[ START GAME ]', {
      fontSize: '16px',
      color: '#22c55e',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      backgroundColor: '#161b22',
      padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setColor('#4ade80'));
    startBtn.on('pointerout', () => startBtn.setColor('#22c55e'));
    startBtn.on('pointerdown', () => this.dismissInstructions());
    this.instructionsPanel.add(startBtn);

    // Tip at very bottom
    const tipText = this.add.text(0, panelH / 2 - 10, 'Press H anytime to show this again', {
      fontSize: '10px',
      color: '#484f58',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.instructionsPanel.add(tipText);
  }

  private dismissInstructions(): void {
    if (this.instructionsPanel) {
      this.instructionsPanel.destroy();
      this.instructionsPanel = null;
    }
    this.gamePaused = false;
    this.gameScene.scene.resume();
  }

  private showGameOver(winner: PlayerId): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.gameOverPanel = this.add.container(w / 2, h / 2);

    const bg = this.add.rectangle(0, 0, 400, 200, 0x0d1117, 0.95)
      .setStrokeStyle(2, 0x30363d);
    this.gameOverPanel.add(bg);

    const isWin = winner === this.humanPlayer;
    const title = this.add.text(0, -50, isWin ? 'VICTORY!' : 'DEFEAT', {
      fontSize: '36px',
      color: isWin ? '#22c55e' : '#ef4444',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.gameOverPanel.add(title);

    const subtitle = this.add.text(0, 0, isWin
      ? 'You conquered all four districts!'
      : `${TEAM_COLORS[winner].toUpperCase()} district won the war.`, {
      fontSize: '14px',
      color: '#8b949e',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.gameOverPanel.add(subtitle);

    const restartBtn = this.add.text(0, 50, '[ PLAY AGAIN ]', {
      fontSize: '16px',
      color: '#2563eb',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      backgroundColor: '#161b22',
      padding: { x: 20, y: 10 },
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
