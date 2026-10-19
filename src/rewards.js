import { updateUI } from "./ui.js";
import { requestPointerLockSafely } from "./pointerLock.js";
import { playSound, broadcastRadioComms } from "./sound.js";
import { showInterstitialAtBreakIfAvailable } from "./adBridge.js";
import { triggerHaptic } from "./haptics.js";
import { STAGES, getStageData, getNextStageKey, selectStage, getStageNumber } from "./stages.js";
import { returnToMainMenu } from "./pause.js";
import { refreshShop } from "./shop.js";
import { triggerAchievement } from "./achievements.js";
import { saveGame } from "./saveSystem.js";
import { clearAliens } from "./aliens.js";
import { clearPickups } from "./pickups.js";
import { resetPlayer } from "./player.js";
import { createStarterTowers, refreshTowerModels } from "./towers.js";

const PERK_POOL = [
  {
    id: "repair",
    label: "Repair Shield",
    desc: "Restore +35 base shield and expand maximum shield integrity.",
    apply(game) {
      game.maxBaseHealth += 8;
      game.baseHealth = Math.min(game.maxBaseHealth, game.baseHealth + 35 + (game.shieldRegenBonus || 0));
      game.shieldRegenBonus = (game.shieldRegenBonus || 0) + 3;
      return `Shield repaired to ${game.baseHealth}/${game.maxBaseHealth}.`;
    }
  },
  {
    id: "ammo",
    label: "Extended Mags",
    desc: "Increase magazine capacity by +8 rounds and immediately reload.",
    apply(game) {
      game.maxAmmo += 8;
      game.ammo = game.maxAmmo;
      return `Magazine capacity expanded to ${game.maxAmmo}. Refilled!`;
    }
  },
  {
    id: "rifle",
    label: "Rifle Overclock",
    desc: "Boost plasma rifle fire rate by +14% and flat bullet damage.",
    apply(game) {
      game.fireRateMultiplier = Math.min(1.8, game.fireRateMultiplier + 0.14);
      game.playerDamageBonus = Math.min(5, (game.playerDamageBonus || 0) + 0.35);
      return `Rifle overclocked: fire rate x${game.fireRateMultiplier.toFixed(2)}, damage +${game.playerDamageBonus.toFixed(2)}.`;
    }
  },
  {
    id: "tesla",
    label: "Tesla Chain Rounds",
    desc: "Bullets arc lethal chain lightning to a secondary nearby target.",
    apply(game) {
      game.teslaChainActive = true;
      return `Tesla Chain Rounds active! Electric arcs will zap nearby aliens.`;
    }
  },
  {
    id: "cryo",
    label: "Cryo Chill Rounds",
    desc: "Bullets freeze aliens on impact, reducing their movement speed by 45%.",
    apply(game) {
      game.cryoRoundsActive = true;
      return `Cryo Chill Rounds active! Alien speed slowed on hit.`;
    }
  },
  {
    id: "napalm",
    label: "Napalm Munitions",
    desc: "Eliminated aliens detonate in a fire splash that damages nearby foes.",
    apply(game) {
      game.napalmBlastActive = true;
      return `Napalm Munitions active! Slain aliens explode.`;
    }
  },
  {
    id: "crit",
    label: "Targeting Optics",
    desc: "Increases critical hit chance by +15% to deal double damage.",
    apply(game) {
      game.critChanceBonus = (game.critChanceBonus || 0) + 0.15;
      return `Critical strike chance increased to ${Math.round(game.critChanceBonus * 100)}%!`;
    }
  },
  {
    id: "adrenaline",
    label: "Adrenaline Surge Boost",
    desc: "Adrenaline charges 50% faster from kill combos to unleash Orbital Strikes.",
    apply(game) {
      game.adrenaline = Math.min(game.maxAdrenaline, (game.adrenaline || 0) + 35);
      return `Adrenaline boosted! Orbital Ion Strike charges faster.`;
    }
  },
  {
    id: "turret",
    label: "Turret Overdrive",
    desc: "Automated defense turrets gain +40% fire rate and +25% attack range.",
    apply(game) {
      game.towers.forEach(t => {
        t.range *= 1.25;
        t.cooldown *= 0.6;
      });
      return `All base defense turrets overclocked!`;
    }
  }
];

export function showRewardChoices(context) {
  const { canvas, game, ui } = context;
  game.paused = true;
  document.exitPointerLock?.();
  const defensesHelped = game.waveDefenseKills > 0;
  const justClearedWave = ((game.wave - 2) % 3) + 1;
  const nextWaveNum = justClearedWave + 1;
  const totalWaveAliens = (game.wavePlayerKills || 0) + (game.waveDefenseKills || 0);

  ui.rewardTitle.textContent = `WAVE ${justClearedWave} OF 3 CLEARED`;
  ui.rewardSummary.textContent = defensesHelped
    ? `All ${totalWaveAliens} aliens eliminated! (You: ${game.wavePlayerKills} | Base Sentry: ${game.waveDefenseKills}). Choose one perk card before Wave ${nextWaveNum} of 3.`
    : `All ${totalWaveAliens} aliens eliminated! Choose one perk card before Wave ${nextWaveNum} of 3.`;

  // Draw 3 random distinct perks
  const shuffled = [...PERK_POOL].sort(() => 0.5 - Math.random());
  const selectedPerks = shuffled.slice(0, 3);

  ui.rewardButtons.forEach((button, index) => {
    const perk = selectedPerks[index] || PERK_POOL[index];
    button.dataset.reward = perk.id;
    button.innerHTML = `<strong>${perk.label}</strong><span>${perk.desc}</span>`;
    button.onclick = async () => {
      const result = perk.apply(game);
      playSound("reward_select");
      triggerHaptic("success");
      ui.rewardOverlay.style.display = "none";
      ui.message.textContent = `${perk.label} applied! ${result} Wave ${nextWaveNum} starting in 3 seconds...`;
      updateUI(ui, game);
      if (!game.noAds) {
        await showInterstitialAtBreakIfAvailable("wave-clear", game.wave - 1);
      }
      game.paused = false;
      requestPointerLockSafely(canvas);
      game.waveTimer = setTimeout(() => context.startNextWave(), 3000);
    };
  });

  ui.rewardOverlay.style.display = "flex";
}

export function showStageClearModal(context) {
  const { canvas, game, ui } = context;
  game.paused = true;
  document.exitPointerLock?.();

  playSound("stage_victory");
  triggerHaptic("heavy");

  const currentStageKey = game.selectedStage || "lahore-outskirts";
  const currentStage = getStageData(currentStageKey);
  const nextStageKey = getNextStageKey(currentStageKey);
  const nextStage = nextStageKey ? getStageData(nextStageKey) : null;

  const coreHealthPercent = Math.max(0, Math.min(100, Math.round((game.baseHealth / game.maxBaseHealth) * 100)));
  let rank = "B";
  let stageClearBonus = 250;
  let rankLabel = "RANK B • FIELD SURVIVOR";
  if (coreHealthPercent >= 80) {
    rank = "S";
    stageClearBonus = 400;
    rankLabel = "RANK S • PERFECT PERIMETER";
  } else if (coreHealthPercent >= 50) {
    rank = "A";
    stageClearBonus = 325;
    rankLabel = "RANK A • TACTICAL VICTORY";
  }

  game.coins += stageClearBonus;
  game.runCoins += stageClearBonus;
  game.health = Math.min(100, game.health + 35);
  game.baseHealth = Math.min(game.maxBaseHealth, game.baseHealth + 50);
  game.ammo = game.maxAmmo;
  updateUI(ui, game);

  broadcastRadioComms(`Sector secured with Rank ${rank}! Core integrity held at ${coreHealthPercent} percent. Bonus credited. Prepare for next deployment.`, true);
  triggerAchievement(context, "sector_liberator");

  if (ui.stageClearOverlay) {
    if (ui.stageClearBadge) {
      ui.stageClearBadge.textContent = rankLabel;
      if (rank === "S") {
        ui.stageClearBadge.style.border = "1px solid #ffd700";
        ui.stageClearBadge.style.color = "#ffe066";
        ui.stageClearBadge.style.background = "rgba(255, 215, 0, 0.22)";
        ui.stageClearBadge.style.boxShadow = "0 0 16px rgba(255, 215, 0, 0.55)";
      } else if (rank === "A") {
        ui.stageClearBadge.style.border = "1px solid #00e5ff";
        ui.stageClearBadge.style.color = "#80f3ff";
        ui.stageClearBadge.style.background = "rgba(0, 229, 255, 0.2)";
        ui.stageClearBadge.style.boxShadow = "0 0 14px rgba(0, 229, 255, 0.45)";
      } else {
        ui.stageClearBadge.style.border = "1px solid #00e676";
        ui.stageClearBadge.style.color = "#69f0ae";
        ui.stageClearBadge.style.background = "rgba(0, 230, 118, 0.2)";
        ui.stageClearBadge.style.boxShadow = "none";
      }
    }
    if (ui.stageClearTitle) {
      ui.stageClearTitle.textContent = nextStage ? `STAGE CLEARED! [RANK ${rank}]` : `CAMPAIGN CONQUERED! [RANK ${rank}]`;
    }
    if (ui.stageClearSubtitle) {
      ui.stageClearSubtitle.textContent = nextStage
        ? `${currentStage.label.toUpperCase()} SECURED!`
        : `ALL 20 CITIES LIBERATED FROM THE ALIEN SWARM!`;
    }
    if (ui.stageClearWaves) {
      ui.stageClearWaves.textContent = "3 / 3 WAVES COMPLETED";
    }
    if (ui.stageClearKills) {
      ui.stageClearKills.textContent = `${game.playerKills || 0} TOTAL ALIEN KILLS`;
    }
    if (ui.stageClearCoins) {
      ui.stageClearCoins.textContent = `+${stageClearBonus} CREDITS (RANK ${rank} BOUNTY)`;
    }
    if (ui.stageClearBonus) {
      ui.stageClearBonus.textContent = `+${stageClearBonus} CREDITS (RANK ${rank} BOUNTY)`;
    }
    if (ui.stageClearBaseHealth) {
      ui.stageClearBaseHealth.textContent = `${game.baseHealth} / ${game.maxBaseHealth} HP (${coreHealthPercent}%)`;
    }

    if (ui.stageClearNextBtn) {
      if (nextStage) {
        ui.stageClearNextBtn.style.display = "block";
        ui.stageClearNextBtn.textContent = `PROCEED TO NEXT STAGE: ${nextStage.label.toUpperCase()} [ENTER]`;
        const handleProceed = async (e) => {
          e?.preventDefault?.();
          e?.stopPropagation?.();
          if (ui.stageClearOverlay) ui.stageClearOverlay.style.display = "none";
          document.body.classList.remove("is-defeat-active");
          document.body.classList.remove("is-game-over");

          // Advance to next city stage
          selectStage(context, nextStageKey);
          game.wave = 1;
          game.stage = getStageNumber(nextStageKey);

          // Clear entities and leftovers from previous stage
          clearAliens(game, context);
          if (game.alienProjectiles) {
            game.alienProjectiles.forEach(p => p.mesh?.dispose?.());
            game.alienProjectiles = [];
          }
          clearPickups(game);

          // Reset player safely inside base and deploy fresh starter towers
          if (context.camera) resetPlayer(context.camera);
          createStarterTowers(context);
          refreshTowerModels(context);
          context.refreshStageTheme?.();

          // Save campaign progression
          saveGame(game);

          broadcastRadioComms(`Deploying squad to ${nextStage.label}. Protect the fusion core!`, true);
          updateUI(ui, game);

          if (!game.noAds) {
            showInterstitialAtBreakIfAvailable("stage-clear", game.stage).catch(() => {});
          }

          game.paused = false;
          game.gameOver = false;
          requestPointerLockSafely(canvas);
          context.startNextWave();
        };

        ui.stageClearNextBtn.onclick = handleProceed;
        ui.stageClearNextBtn.onpointerup = handleProceed;
        ui.stageClearNextBtn.ontouchend = handleProceed;
      } else {
        ui.stageClearNextBtn.style.display = "block";
        ui.stageClearNextBtn.textContent = "CAMPAIGN COMPLETE — PLAY ENDLESS DEFENSE [ENTER]";
        const handleEndless = async (e) => {
          e?.preventDefault?.();
          e?.stopPropagation?.();
          if (ui.stageClearOverlay) ui.stageClearOverlay.style.display = "none";
          document.body.classList.remove("is-defeat-active");
          document.body.classList.remove("is-game-over");

          selectStage(context, "lahore-outskirts");
          game.isEndless = true;
          game.difficulty = "hard";
          game.wave = 1;
          game.stage = 1;

          clearAliens(game, context);
          if (game.alienProjectiles) {
            game.alienProjectiles.forEach(p => p.mesh?.dispose?.());
            game.alienProjectiles = [];
          }
          clearPickups(game);

          if (context.camera) resetPlayer(context.camera);
          createStarterTowers(context);
          refreshTowerModels(context);
          context.refreshStageTheme?.();

          saveGame(game);
          broadcastRadioComms("Entering Endless Nightmare Defense! Swarm threat level maximum!", true);
          updateUI(ui, game);

          game.paused = false;
          game.gameOver = false;
          requestPointerLockSafely(canvas);
          context.startNextWave();
        };

        ui.stageClearNextBtn.onclick = handleEndless;
        ui.stageClearNextBtn.onpointerup = handleEndless;
        ui.stageClearNextBtn.ontouchend = handleEndless;
      }
    }

    const mainView = document.getElementById("stageClearMainView");
    const shopView = document.getElementById("stageClearShopView");
    if (mainView) mainView.style.display = "block";
    if (shopView) shopView.style.display = "none";

    if (ui.stageClearShopBtn) {
      ui.stageClearShopBtn.onclick = () => {
        if (mainView) mainView.style.display = "none";
        if (shopView) shopView.style.display = "block";
        const shopCoins = document.getElementById("stageClearShopCoins");
        if (shopCoins) shopCoins.textContent = game.coins;
        refreshShop(context);
      };
    }

    const shopDoneBtn = document.getElementById("stageClearShopDoneBtn");
    if (shopDoneBtn) {
      shopDoneBtn.onclick = () => {
        ui.stageClearNextBtn?.click();
      };
    }

    const shopBackBtn = document.getElementById("stageClearShopBackBtn");
    if (shopBackBtn) {
      shopBackBtn.onclick = () => {
        if (mainView) mainView.style.display = "block";
        if (shopView) shopView.style.display = "none";
      };
    }

    if (ui.stageClearMenuBtn) {
      ui.stageClearMenuBtn.onclick = () => {
        ui.stageClearOverlay.style.display = "none";
        returnToMainMenu(context);
      };
    }

    ui.stageClearOverlay.style.display = "flex";
  }
}

