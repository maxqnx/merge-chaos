// Creature evolution chain — Neon Cyberpunk palette
const CREATURES = [
  { level: 1, name: 'Slime',   color: 0x00ff88, size: 22, damage: 2,   hp: 5   },
  { level: 2, name: 'Goblin',  color: 0x00e5ff, size: 28, damage: 3,   hp: 10  },
  { level: 3, name: 'Orc',     color: 0x0066ff, size: 35, damage: 6,   hp: 20  },
  { level: 4, name: 'Troll',   color: 0x8800ff, size: 42, damage: 12,  hp: 40  },
  { level: 5, name: 'Dragon',  color: 0xff0088, size: 50, damage: 24,  hp: 80  },
  { level: 6, name: 'Phoenix', color: 0xff6600, size: 58, damage: 48,  hp: 160 },
  { level: 7, name: 'Titan',   color: 0xdd00ff, size: 66, damage: 96,  hp: 320 },
  { level: 8, name: 'God',     color: 0xf0f8ff, size: 75, damage: 192, hp: 640 },
];

const ENEMY_TYPES = [
  { name: 'Rat',    color: 0x8899cc, size: 18, hp: 8,   reward: 2,  speed: 70 },
  { name: 'Zombie', color: 0x00ff66, size: 24, hp: 23,  reward: 5,  speed: 46 },
  { name: 'Demon',  color: 0xff2244, size: 30, hp: 60,  reward: 8,  speed: 52 },
  { name: 'Boss',   color: 0xff0033, size: 44, hp: 300, reward: 35, speed: 35 },
];

const GAME_CONFIG = {
  attackRange: 200,
  attackCooldown: 700,   // was 1000 — snappier attack cadence
  attackMultiplier: 1,
  hpMultiplier: 1,
};

const SHOP_POOL = [
  { id: 'attack',   name: 'Power Surge',  desc: 'All creatures\ndeal +25% damage\n(max ×3)', cost: 35 },
  { id: 'repair',   name: 'Repair Base',  desc: 'Restore\n+25 Base HP',            cost: 20 },
  { id: 'freeze',   name: 'Slow Wave',    desc: 'Next wave starts\n25s later',      cost: 20 },
  { id: 'armor',    name: 'Armor Up',     desc: 'Creatures get\n+30% max HP',       cost: 40 },
];
