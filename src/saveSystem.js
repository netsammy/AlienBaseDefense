const SAVE_KEY = "alienBaseDefense.save.v2";

const DEFAULT_SAVE = {
  coins: 0,
  selectedStage: "lahore-outskirts",
  graphicsQuality: "medium",
  showTouchControls: false,
  autoFire: true,
  noAds: false,
  loginStreak: 1,
  lastLoginDate: 0,
  missionsDate: "",
  dailyMissions: [],
  permanentUpgrades: {
    rifleDamage: 0,
    fireRate: 0,
    baseShield: 0,
    turretDamage: 0,
    critChance: 0,
    shieldRegen: 0
  }
};

export function loadSave(game) {
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem("alienBaseDefense.save.v1");
    const save = JSON.parse(raw || "null") || DEFAULT_SAVE;
    game.coins = Number.isFinite(save.coins) ? save.coins : 0;
    game.selectedStage = save.selectedStage || DEFAULT_SAVE.selectedStage;
    game.graphicsQuality = save.graphicsQuality || DEFAULT_SAVE.graphicsQuality;
    game.showTouchControls = Boolean(save.showTouchControls);
    game.autoFire = typeof save.autoFire === "boolean" ? save.autoFire : true;
    game.noAds = Boolean(save.noAds);
    game.loginStreak = Number.isFinite(save.loginStreak) ? save.loginStreak : 1;
    game.lastLoginDate = Number.isFinite(save.lastLoginDate) ? save.lastLoginDate : 0;
    game.missionsDate = save.missionsDate || "";
    game.dailyMissions = Array.isArray(save.dailyMissions) ? save.dailyMissions : [];
    game.unlockedAchievements = Array.isArray(save.unlockedAchievements) ? save.unlockedAchievements : [];
    game.endlessHighScore = Number.isFinite(save.endlessHighScore) ? save.endlessHighScore : 0;
    game.permanentUpgrades = {
      ...DEFAULT_SAVE.permanentUpgrades,
      ...(save.permanentUpgrades || {})
    };
  } catch {
    game.coins = DEFAULT_SAVE.coins;
    game.selectedStage = DEFAULT_SAVE.selectedStage;
    game.graphicsQuality = DEFAULT_SAVE.graphicsQuality;
    game.showTouchControls = DEFAULT_SAVE.showTouchControls;
    game.autoFire = DEFAULT_SAVE.autoFire;
    game.noAds = DEFAULT_SAVE.noAds;
    game.unlockedAchievements = [];
    game.endlessHighScore = 0;
    game.permanentUpgrades = { ...DEFAULT_SAVE.permanentUpgrades };
  }
}

export function saveGame(game) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      coins: game.coins,
      selectedStage: game.selectedStage,
      graphicsQuality: game.graphicsQuality,
      showTouchControls: Boolean(game.showTouchControls),
      autoFire: Boolean(game.autoFire),
      noAds: Boolean(game.noAds),
      loginStreak: game.loginStreak,
      lastLoginDate: game.lastLoginDate,
      missionsDate: game.missionsDate,
      dailyMissions: game.dailyMissions,
      unlockedAchievements: game.unlockedAchievements || [],
      endlessHighScore: game.endlessHighScore || 0,
      permanentUpgrades: game.permanentUpgrades
    }));
  } catch {
    // Ignore storage quota errors
  }
}
