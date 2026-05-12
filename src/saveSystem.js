const SAVE_KEY = "alienBaseDefense.save.v1";

const DEFAULT_SAVE = {
  coins: 0,
  selectedStage: "lahore-outskirts",
  graphicsQuality: "medium",
  permanentUpgrades: {
    rifleDamage: 0,
    fireRate: 0,
    baseShield: 0,
    turretDamage: 0
  }
};

export function loadSave(game) {
  try {
    const save = JSON.parse(localStorage.getItem(SAVE_KEY) || "null") || DEFAULT_SAVE;
    game.coins = Number.isFinite(save.coins) ? save.coins : 0;
    game.selectedStage = save.selectedStage || DEFAULT_SAVE.selectedStage;
    game.graphicsQuality = save.graphicsQuality || DEFAULT_SAVE.graphicsQuality;
    game.permanentUpgrades = {
      ...DEFAULT_SAVE.permanentUpgrades,
      ...(save.permanentUpgrades || {})
    };
  } catch {
    game.coins = DEFAULT_SAVE.coins;
    game.selectedStage = DEFAULT_SAVE.selectedStage;
    game.graphicsQuality = DEFAULT_SAVE.graphicsQuality;
    game.permanentUpgrades = { ...DEFAULT_SAVE.permanentUpgrades };
  }
}

export function saveGame(game) {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    coins: game.coins,
    selectedStage: game.selectedStage,
    graphicsQuality: game.graphicsQuality,
    permanentUpgrades: game.permanentUpgrades
  }));
}
