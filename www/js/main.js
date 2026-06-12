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
      debug: false,
      enableSleeping: true,
      positionIterations: 3,
      velocityIterations: 3,
      constraintIterations: 1,
      frictionAirLinear: 0.001,
      frictionAirAngular: 0.001
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
    clearBeforeRender: true,
    maxLights: 8,
    batchSize: 2048
  },
  fps: { target: isMobile ? 40 : 60, forceSetTimeOut: false }
});
