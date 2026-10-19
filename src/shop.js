import { saveGame } from "./saveSystem.js";
import { updateUI } from "./ui.js";

const SHOP_ITEMS = {
  rifleDamage: { label: "Rifle Damage", baseCost: 90, max: 10 },
  fireRate: { label: "Fire Rate", baseCost: 100, max: 8 },
  baseShield: { label: "Base Shield", baseCost: 110, max: 10 },
  turretDamage: { label: "Turret Damage", baseCost: 95, max: 10 },
  critChance: { label: "Crit Optics", baseCost: 120, max: 5 },
  shieldRegen: { label: "Nano Shield Repair", baseCost: 130, max: 6 }
};

export function setupShop(context) {
  const { ui } = context;
  ui.shopButtons.forEach(button => {
    button.addEventListener("click", () => buyUpgrade(context, button.dataset.shopItem));
  });

  refreshShop(context);
}

export function awardCoins(context, amount) {
  const { game } = context;
  game.coins += amount;
  game.runCoins += amount;
  saveGame(game);
  refreshShop(context);
}

export function buyUpgrade(context, key) {
  const { game, ui } = context;
  const item = SHOP_ITEMS[key];
  if (!item) return;

  const level = game.permanentUpgrades[key] || 0;
  const cost = getUpgradeCost(item, level);
  if (level >= item.max) {
    ui.message.textContent = `${item.label} is fully upgraded.`;
    return;
  }
  if (game.coins < cost) {
    ui.message.textContent = `Need ${cost} coins for ${item.label}.`;
    return;
  }

  game.coins -= cost;
  game.permanentUpgrades[key] = level + 1;
  saveGame(game);
  applyUpgradeStats(game);
  ui.message.textContent = `${item.label} upgraded to level ${level + 1}.`;
  updateUI(ui, game);
  refreshShop(context);
}

export function applyUpgradeStats(game) {
  game.fireRateMultiplier = Math.max(game.fireRateMultiplier, 1 + (game.permanentUpgrades.fireRate || 0) * 0.08);
  game.playerDamageBonus = Math.max(game.playerDamageBonus, (game.permanentUpgrades.rifleDamage || 0) * 0.25);
  game.critChanceBonus = (game.permanentUpgrades.critChance || 0) * 0.04;
  game.shieldRegenBonus = (game.permanentUpgrades.shieldRegen || 0) * 3;
}

export function refreshShop(context) {
  const { game, ui } = context;
  if (!ui.coins) return;
  ui.coins.textContent = game.coins;
  ui.runCoins.textContent = game.runCoins;

  ui.shopButtons.forEach(button => {
    const item = SHOP_ITEMS[button.dataset.shopItem];
    if (!item) return;
    const level = game.permanentUpgrades[button.dataset.shopItem] || 0;
    const cost = getUpgradeCost(item, level);
    const span = button.querySelector("span");
    if (span) {
      span.textContent = level >= item.max ? `Level ${level} / MAX` : `Level ${level} - ${cost} coins`;
    }
    button.disabled = level >= item.max;
  });
}

function getUpgradeCost(item, level) {
  return item.baseCost + level * 60;
}
