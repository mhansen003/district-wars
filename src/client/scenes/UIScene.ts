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
      '[G] Generator ($100)  [B] Barracks ($150)  [1] Trooper ($50)  [2] Archer ($75)  [3] Tank ($150)  [4] Scout ($30)  [RMB] Move  [ESC] Cancel'
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
