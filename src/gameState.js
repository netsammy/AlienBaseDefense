import { getStageNumber } from "./stages.js";

export const DEFAULT_WEAPONS = {
  shotgun: {
    id: "shotgun",
    name: "COMBAT SHOTGUN",
    slot: 1,
    ammo: 8,
    maxAmmo: 8,
    shotDelay: 420,
    reloadTime: 1300,
    pellets: 6,
    spread: 0.09,
    damageMult: 0.45,
    cameraShake: 0.026,
    sound: "shotgun_fire"
  },
  rifle: {
    id: "rifle",
    name: "PLASMA RIFLE",
    slot: 2,
    ammo: 32,
    maxAmmo: 32,
    shotDelay: 120,
    reloadTime: 1000,
    pellets: 1,
    spread: 0,
    damageMult: 1.0,
    cameraShake: 0.012,
    sound: "plasma_fire"
  },
  rocket: {
    id: "rocket",
    name: "ROCKET LAUNCHER",
    slot: 3,
    ammo: 3,
    maxAmmo: 3,
    shotDelay: 850,
    reloadTime: 1700,
    explosionRadius: 7.5,
    damageMult: 4.5,
    cameraShake: 0.045,
    sound: "rocket_launch"
  },
  sniper: {
    id: "sniper",
    name: "PLASMA RAILGUN",
    slot: 4,
    ammo: 5,
    maxAmmo: 5,
    shotDelay: 800,
    reloadTime: 1700,
    pellets: 1,
    spread: 0,
    damageMult: 4.8,
    cameraShake: 0.038,
    sound: "plasma_sniper_fire",
    isSniper: true
  },
  flamethrower: {
    id: "flamethrower",
    name: "CHEMICAL FLAMETHROWER",
    slot: 5,
    ammo: 60,
    maxAmmo: 60,
    shotDelay: 80,
    reloadTime: 2000,
    pellets: 3,
    spread: 0.16,
    damageMult: 0.32,
    cameraShake: 0.008,
    sound: "flamethrower_burst",
    isFlame: true
  }
};

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
  autoFire: false,
  noAds: false,
  isEndless: false,
  isSniperScoped: false,
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
    turretDamage: 0,
    critChance: 0,
    shieldRegen: 0
  },
  killStreak: 0,
  lastKillTime: 0,
  comboMultiplier: 1,
  comboTimer: 0,
  adrenaline: 0,
  maxAdrenaline: 100,
  activePerks: [],
  critChanceBonus: 0,
  teslaChainActive: false,
  cryoRoundsActive: false,
  napalmBlastActive: false,
  health: 100,
  maxBaseHealth: 100,
  baseHealth: 100,
  kills: 0,
  playerKills: 0,
  defenseKills: 0,
  wavePlayerKills: 0,
  waveDefenseKills: 0,
  activeWeapon: "shotgun",
  weapons: JSON.parse(JSON.stringify(DEFAULT_WEAPONS)),
  rocketsInFlight: [],
  maxAmmo: 8,
  ammo: 8,
  weaponStatus: "READY",
  weaponStatusUntil: 0,
  fireRateMultiplier: 1,
  shieldRegenBonus: 0,
  playerDamageBonus: 0,
  effectsScale: 1,
  towers: [],
  reloading: false,
  aliens: [],
  alienProjectiles: [],
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
  baseRadius: 8,
  flashlightOn: true,
  empCooldown: 0,
  empMaxCooldown: 20,
  slideCooldown: 0,
  loginStreak: 1,
  lastLoginDate: 0,
  canClaimDaily: true,
  dailyMissions: [],
  missionsDate: ""
};

export function resetGameState() {
  game.started = true;
  game.sprinting = false;
  game.paused = false;
  game.gameOver = false;
  game.flashlightOn = true;
  game.empCooldown = 0;
  game.slideCooldown = 0;
  game.continueUsed = false;
  game.continueInProgress = false;
  game.wave = 1;
  game.stage = getStageNumber(game.selectedStage) || 1;
  game.score = 0;
  game.runCoins = 0;
  game.killStreak = 0;
  game.lastKillTime = 0;
  game.comboMultiplier = 1;
  game.comboTimer = 0;
  game.adrenaline = 0;
  game.activePerks = [];
  game.teslaChainActive = false;
  game.cryoRoundsActive = false;
  game.napalmBlastActive = false;
  game.critChanceBonus = game.permanentUpgrades.critChance * 0.04;
  game.health = 100;
  game.maxBaseHealth = 100 + game.permanentUpgrades.baseShield * 12;
  game.baseHealth = game.maxBaseHealth;
  game.kills = 0;
  game.playerKills = 0;
  game.defenseKills = 0;
  game.wavePlayerKills = 0;
  game.waveDefenseKills = 0;
  game.activeWeapon = "shotgun";
  game.weapons = JSON.parse(JSON.stringify(DEFAULT_WEAPONS));
  game.rocketsInFlight = [];
  game.maxAmmo = game.weapons.shotgun.maxAmmo;
  game.ammo = game.weapons.shotgun.ammo;
  game.weaponStatus = "READY";
  game.weaponStatusUntil = 0;
  game.fireRateMultiplier = 1 + game.permanentUpgrades.fireRate * 0.08;
  game.shieldRegenBonus = game.permanentUpgrades.shieldRegen * 3;
  game.playerDamageBonus = game.permanentUpgrades.rifleDamage * 0.25;
  game.effectsScale = game.graphicsQuality === "low" ? 0.55 : game.graphicsQuality === "high" ? 1.15 : 0.85;
  game.towers = [];
  game.alienProjectiles = [];
  game.reloading = false;
  game.lastShot = 0;
  game.spawnCount = 0;
  game.waveStarting = false;
  game.waveCombatActive = false;
  game.activeWaveAlienCount = 0;
  game.playerInvincibleUntil = performance.now() + 2500;
  game.waveCountdown = 0;
  game.mobileMove.x = 0;
  game.mobileMove.y = 0;
}
