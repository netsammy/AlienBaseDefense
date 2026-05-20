export const game = {
  started: false,
  sprinting: false,
  paused: false,
  gameOver: false,
  continueUsed: false,
  continueInProgress: false,
  difficulty: "easy",
  selectedStage: "lahore-outskirts",
  graphicsQuality: "medium",
  showTouchControls: false,
  wave: 1,
  stage: 1,
  score: 0,
  bestScore: 0,
  coins: 0,
  runCoins: 0,
  permanentUpgrades: {
    rifleDamage: 0,
    fireRate: 0,
    baseShield: 0,
    turretDamage: 0
  },
  killStreak: 0,
  lastKillTime: 0,
  health: 100,
  maxBaseHealth: 100,
  baseHealth: 100,
  kills: 0,
  playerKills: 0,
  defenseKills: 0,
  wavePlayerKills: 0,
  waveDefenseKills: 0,
  maxAmmo: 30,
  ammo: 30,
  weaponStatus: "READY",
  weaponStatusUntil: 0,
  fireRateMultiplier: 1,
  shieldRegenBonus: 0,
  playerDamageBonus: 0,
  effectsScale: 1,
  towers: [],
  reloading: false,
  aliens: [],
  pickups: [],
  lastShot: 0,
  shotDelay: 135,
  spawnCount: 0,
  waveStarting: false,
  playerInvincibleUntil: 0,
  waveCountdown: 0,
  waveTimer: null,
  mobileMove: { x: 0, y: 0 },
  arenaRadius: 28,
  baseRadius: 8
};

export function resetGameState() {
  game.started = true;
  game.sprinting = false;
  game.paused = false;
  game.gameOver = false;
  game.continueUsed = false;
  game.continueInProgress = false;
  game.wave = 1;
  game.stage = 1;
  game.score = 0;
  game.runCoins = 0;
  game.killStreak = 0;
  game.lastKillTime = 0;
  game.health = 100;
  game.maxBaseHealth = 100 + game.permanentUpgrades.baseShield * 12;
  game.baseHealth = game.maxBaseHealth;
  game.kills = 0;
  game.playerKills = 0;
  game.defenseKills = 0;
  game.wavePlayerKills = 0;
  game.waveDefenseKills = 0;
  game.ammo = game.maxAmmo;
  game.weaponStatus = "READY";
  game.weaponStatusUntil = 0;
  game.fireRateMultiplier = 1 + game.permanentUpgrades.fireRate * 0.08;
  game.shieldRegenBonus = 0;
  game.playerDamageBonus = game.permanentUpgrades.rifleDamage * 0.25;
  game.effectsScale = game.graphicsQuality === "low" ? 0.55 : game.graphicsQuality === "high" ? 1.15 : 0.85;
  game.towers = [];
  game.reloading = false;
  game.lastShot = 0;
  game.spawnCount = 0;
  game.waveStarting = false;
  game.playerInvincibleUntil = performance.now() + 2500;
  game.waveCountdown = 0;
  game.mobileMove.x = 0;
  game.mobileMove.y = 0;
}
