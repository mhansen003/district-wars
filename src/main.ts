// District Wars — Entry Point

import Phaser from 'phaser';
import { GameScene } from './client/scenes/GameScene';
import { UIScene } from './client/scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#0d1117',
  scene: [GameScene, UIScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    mouse: {
      preventDefaultWheel: true,
    },
  },
  render: {
    pixelArt: true,
    antialias: false,
  },
};

// Only start the game when the Play button is clicked (or auto-start if hash is #play)
function startGame(): void {
  const landing = document.getElementById('landing');
  const gameContainer = document.getElementById('game-container');
  if (landing) landing.style.display = 'none';
  if (gameContainer) gameContainer.style.display = 'block';
  new Phaser.Game(config);
}

// Wire up the play button
const playBtn = document.getElementById('play-btn');
if (playBtn) {
  playBtn.addEventListener('click', startGame);
  (playBtn as HTMLButtonElement).disabled = false;
}

// Auto-start if #play hash
if (window.location.hash === '#play') {
  startGame();
}

console.log('District Wars v0.1.0 — Build. Battle. Conquer.');
