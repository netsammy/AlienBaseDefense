import { updateUI } from "./ui.js";

const REWARDS = {
  repair: {
    label: "Repair Shield",
    apply(game) {
      game.maxBaseHealth += 4;
      game.baseHealth = Math.min(game.maxBaseHealth, game.baseHealth + 26 + game.shieldRegenBonus);
      game.shieldRegenBonus += 2;
      return `Base shield max increased to ${game.maxBaseHealth}. Shield repaired to ${game.baseHealth}.`;
    }
  },
  ammo: {
    label: "Ammo Upgrade",
    apply(game) {
      game.maxAmmo += 5;
      game.ammo = game.maxAmmo;
      return `Magazine capacity increased to ${game.maxAmmo}. Ammo refilled.`;
    }
  },
  rifle: {
    label: "Rifle Tuning",
    apply(game) {
      game.fireRateMultiplier = Math.min(1.45, game.fireRateMultiplier + 0.12);
      game.playerDamageBonus = Math.min(3, game.playerDamageBonus + 0.25);
      return `Rifle tuned: fire rate x${game.fireRateMultiplier.toFixed(2)}, damage bonus +${game.playerDamageBonus.toFixed(2)}.`;
    }
  }
};

export function showRewardChoices(context) {
  const { game, ui } = context;
  game.paused = true;
  const defensesHelped = game.waveDefenseKills > 0;
  ui.rewardTitle.textContent = defensesHelped ? "WAVE SECURED" : "WAVE CLEARED";
  ui.rewardSummary.textContent = defensesHelped
    ? `Choose one upgrade. Rifle kills: ${game.wavePlayerKills}. Defense kills: ${game.waveDefenseKills}.`
    : `Choose one upgrade. You eliminated ${game.wavePlayerKills} aliens this wave.`;
  ui.rewardOverlay.style.display = "flex";
  ui.rewardButtons.forEach(button => {
    button.onclick = () => {
      const reward = REWARDS[button.dataset.reward];
      const result = reward.apply(game);
      game.paused = false;
      ui.rewardOverlay.style.display = "none";
      ui.message.textContent = `${reward.label} applied. ${result} Next wave in 3 seconds...`;
      updateUI(ui, game);
      game.waveTimer = setTimeout(() => context.startNextWave(), 3000);
    };
  });
}
