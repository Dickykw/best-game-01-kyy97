// Dusty Yard — tuning + palette. One place for every number the game
// balances on, so a tweak never means hunting through the modules.
export const PALETTE = {
  canvas: '#14161a',
  surface: '#1e2228',
  hairline: '#2c323a',
  ink: '#e9e6df',
  muted: '#98a0a8',
  accent: '#f0a830',
  danger: '#ff5a2a',
  ally: '#19b5a6',
  sand: '#b59a6d',
  concrete: '#8d8578',
  rust: '#b45a2a',
  skyTop: '#16324a',
  skyBottom: '#e08a4e',
  dusk: '#3a5b68',
  sun: '#ffb36b',
  enemy: '#ff5a2a',
  siteA: '#f5a623',
  siteB: '#4aa8ff',
};

export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export const ARENA = {
  width: 56, depth: 40, wallHeight: 4.5,
  bounds: { minX: -27, maxX: 27, minZ: -19, maxZ: 19 },
  playerSpawn: { x: 0, z: 17.5, yaw: 0 },
  enemySpawns: [
    { x: -20, z: -17 }, { x: -10, z: -17 }, { x: 0, z: -17 },
    { x: 10, z: -17 }, { x: 20, z: -17 },
  ],
  siteA: { x: -19, z: -13.5, radius: 6 },
  siteB: { x: 19, z: -13.5, radius: 6 },
};

export const PLAYER = {
  eyeStand: 1.62, eyeCrouch: 1.05, radius: 0.38,
  walkSpeed: 5.2, crouchSpeed: 2.6, accel: 42, friction: 11,
  jumpSpeed: 5.4, gravity: 14, health: 100,
};

export const WEAPONS = {
  pistol: {
    label: 'Kestrel P9', price: 0, damage: 34, headMult: 3.0,
    gap: 0.16, auto: false, mag: 12, reserve: 36, reload: 1.4, kick: 0.035,
    spreadStill: 0.0016, spreadMove: 0.014,
  },
  rifle: {
    label: 'Longbow AR-7', price: 2700, damage: 30, headMult: 3.4,
    gap: 0.096, auto: true, mag: 30, reserve: 90, reload: 1.9, kick: 0.055,
    spreadStill: 0.0022, spreadMove: 0.028,
  },
  smg: {
    label: 'Hornet VK-9', price: 1500, damage: 22, headMult: 3.0,
    gap: 0.07, auto: true, mag: 32, reserve: 96, reload: 1.7, kick: 0.042,
    spreadStill: 0.0026, spreadMove: 0.038,
  },
};
export const GRENADE_PRICE = 400;

export const BOTS = {
  count: 5, health: 100, walkSpeed: 3.2, sightRange: 55, sightCone: 2.6,
  reactMin: 0.35, reactMax: 0.6, shotMin: 0.55, shotMax: 0.9,
  hitNear: 0.32, hitFar: 0.10, damageMin: 8, damageMax: 22,
  loseSight: 1.2, separation: 0.8,
};

export const BOMB = { plantTime: 3, fuseTime: 35, defuseTime: 5 };

export const ECONOMY = {
  start: 800, kill: 300, win: 900, loss: 400,
};

export const ROUND = {
  buyTime: 15, roundTime: 100, winScore: 3,
};
