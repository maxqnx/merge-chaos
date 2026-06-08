const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const W = Math.min(window.innerWidth, 430);
const H = Math.min(window.innerHeight, 932);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: W,
  height: H,
  backgroundColor: '#1a0a2e',
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1.8 },
      debug: false
    }
  },
  scene: [BootScene, GameScene, UIScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
  }
});
