import { getWaveDifficulty } from "./difficulty.js";
import { STAGES } from "./stages.js";

export function getUI() {
  return {
    difficultyLabel: document.getElementById("difficultyLabel"),
    difficultyButtons: document.querySelectorAll(".difficultyBtn"),
    wave: document.getElementById("wave"),
    stage: document.getElementById("stage"),
    stageName: document.getElementById("stageName"),
    stageLabel: document.getElementById("stageLabel"),
    waveLabel: document.getElementById("waveLabel"),
    aliensLeft: document.getElementById("aliensLeft"),
    score: document.getElementById("score"),
    bestScore: document.getElementById("bestScore"),
    coins: document.getElementById("coins"),
    runCoins: document.getElementById("runCoins"),
    health: document.getElementById("health"),
    baseHealth: document.getElementById("baseHealth"),
    maxBaseHealth: document.getElementById("maxBaseHealth"),
    kills: document.getElementById("kills"),
    defenseKills: document.getElementById("defenseKills"),
    ammo: document.getElementById("ammo"),
    maxAmmo: document.getElementById("maxAmmo"),
    weaponStatus: document.getElementById("weaponStatus"),
    message: document.getElementById("message"),
    loadingOverlay: document.getElementById("loadingOverlay"),
    loadingText: document.getElementById("loadingText"),
    bossPanel: document.getElementById("bossPanel"),
    bossHealthFill: document.getElementById("bossHealthFill"),
    bossHealthText: document.getElementById("bossHealthText"),
    bossHudContainer: document.getElementById("bossHudContainer"),
    bossHudName: document.getElementById("bossHudName"),
    bossHudPhase: document.getElementById("bossHudPhase"),
    bossHealthBar: document.getElementById("bossHealthBar"),
    bossLagBar: document.getElementById("bossLagBar"),
    damageIndicatorContainer: document.getElementById("damageIndicatorContainer"),
    lowHealthVignette: document.getElementById("lowHealthVignette"),
    startOverlay: document.getElementById("startOverlay"),
    startButton: document.getElementById("startButton"),
    restartButton: document.getElementById("restartButton"),
    continueButton: document.getElementById("continueButton"),
    alienMapCanvas: document.getElementById("alienMapCanvas"),
    damageFlash: document.getElementById("damageFlash"),
    visorSplatter: document.getElementById("visorSplatter"),
    pauseOverlay: document.getElementById("pauseOverlay"),
    resumeButton: document.getElementById("resumeButton"),
    controlsButton: document.getElementById("controlsButton"),
    controlsOverlay: document.getElementById("controlsOverlay"),
    controlsCloseButton: document.getElementById("controlsCloseButton"),
    menuControlsButton: document.getElementById("menuControlsButton"),
    pauseRestartButton: document.getElementById("pauseRestartButton"),
    mainMenuButton: document.getElementById("mainMenuButton"),
    rewardOverlay: document.getElementById("rewardOverlay"),
    rewardTitle: document.getElementById("rewardTitle"),
    rewardSummary: document.getElementById("rewardSummary"),
    rewardButtons: document.querySelectorAll(".rewardBtn"),
    shopButtons: document.querySelectorAll(".shopBtn"),
    graphicsButtons: document.querySelectorAll(".graphicsBtn"),
    touchControlsToggle: document.getElementById("touchControlsToggle"),
    autoFireToggle: document.getElementById("autoFireToggle"),
    stageButtons: document.querySelectorAll(".stageBtn"),
    mobileControls: document.getElementById("mobileControls"),
    lookPad: document.getElementById("lookPad"),
    joystick: document.getElementById("joystick"),
    joystickKnob: document.getElementById("joystickKnob"),
    mobileFireButton: document.getElementById("mobileFireButton"),
    mobileReloadButton: document.getElementById("mobileReloadButton"),
    mobileSprintButton: document.getElementById("mobileSprintButton"),
    mobileUltimateButton: document.getElementById("mobileUltimateButton"),
    mobileFlashlightButton: document.getElementById("mobileFlashlightButton"),
    mobileWeaponButton: document.getElementById("mobileWeaponButton"),
    mobileTurretButton: document.getElementById("mobileTurretButton"),
    mobileSlideButton: document.getElementById("mobileSlideButton"),
    mobileEmpButton: document.getElementById("mobileEmpButton"),
    empBlastButton: document.getElementById("empBlastButton"),
    turretPrompt: document.getElementById("turretPrompt"),
    turretPromptTitle: document.getElementById("turretPromptTitle"),
    turretPromptAction: document.getElementById("turretPromptAction"),
    weaponSlots: document.getElementById("weaponSlots"),
    weaponSlotButtons: document.querySelectorAll(".weaponSlotBtn"),
    weaponNameLabel: document.getElementById("weaponNameLabel"),
    slotAmmoShotgun: document.getElementById("slotAmmoShotgun"),
    slotAmmoRifle: document.getElementById("slotAmmoRifle"),
    slotAmmoRocket: document.getElementById("slotAmmoRocket"),
    slotAmmoSniper: document.getElementById("slotAmmoSniper"),
    slotAmmoFlamethrower: document.getElementById("slotAmmoFlamethrower"),
    flashlightStatus: document.getElementById("flashlightStatus"),
    comboBadge: document.getElementById("comboBadge"),
    adrenalineFill: document.getElementById("adrenalineFill"),
    adrenalineText: document.getElementById("adrenalineText"),
    vipBadge: document.getElementById("vipBadge"),
    defeatOverlay: document.getElementById("defeatOverlay"),
    defeatTitle: document.getElementById("defeatTitle"),
    defeatSubtitle: document.getElementById("defeatSubtitle"),
    defeatWave: document.getElementById("defeatWave"),
    defeatKills: document.getElementById("defeatKills"),
    defeatScore: document.getElementById("defeatScore"),
    defeatBest: document.getElementById("defeatBest"),
    defeatContinueBtn: document.getElementById("defeatContinueBtn"),
    defeatRestartBtn: document.getElementById("defeatRestartBtn"),
    defeatMenuBtn: document.getElementById("defeatMenuBtn"),
    stageClearOverlay: document.getElementById("stageClearOverlay"),
    stageClearBadge: document.getElementById("stageClearBadge"),
    stageClearTitle: document.getElementById("stageClearTitle"),
    stageClearSubtitle: document.getElementById("stageClearSubtitle"),
    stageClearWaves: document.getElementById("stageClearWaves"),
    stageClearKills: document.getElementById("stageClearKills"),
    stageClearCoins: document.getElementById("stageClearCoins"),
    stageClearBaseHealth: document.getElementById("stageClearBaseHealth"),
    stageClearNextBtn: document.getElementById("stageClearNextBtn"),
    stageClearShopBtn: document.getElementById("stageClearShopBtn"),
    stageClearMenuBtn: document.getElementById("stageClearMenuBtn")
  };
}

export function updateUI(ui, game) {
  const difficulty = getWaveDifficulty(game);
  if (ui.difficultyLabel) ui.difficultyLabel.textContent = difficulty.modeLabel;
  if (ui.stage) ui.stage.textContent = difficulty.stage;
  if (ui.stageName) ui.stageName.textContent = difficulty.name;
  const stageData = STAGES[game.selectedStage];
  if (ui.stageLabel) ui.stageLabel.textContent = stageData ? stageData.label : `Sector ${game.stage || 1}`;
  if (ui.waveLabel) {
    const waveInStage = ((game.wave - 1) % 3) + 1;
    ui.waveLabel.textContent = waveInStage === 3 ? "3 / 3 (BOSS CLIMAX)" : `${waveInStage} / 3`;
  }
  if (ui.wave) ui.wave.textContent = game.wave;
  if (ui.aliensLeft) ui.aliensLeft.textContent = game.aliens.length;
  if (ui.score) ui.score.textContent = game.score;
  if (ui.bestScore) ui.bestScore.textContent = game.bestScore;
  if (ui.coins) ui.coins.textContent = game.coins;
  if (ui.runCoins) ui.runCoins.textContent = game.runCoins;
  if (ui.health) ui.health.textContent = game.health;
  if (ui.baseHealth) ui.baseHealth.textContent = game.baseHealth;
  if (ui.maxBaseHealth) ui.maxBaseHealth.textContent = game.maxBaseHealth;
  if (ui.kills) ui.kills.textContent = game.playerKills;
  if (ui.defenseKills) ui.defenseKills.textContent = game.defenseKills;
  if (ui.ammo) ui.ammo.textContent = game.ammo;
  if (ui.maxAmmo) ui.maxAmmo.textContent = game.maxAmmo;
  if (ui.weaponStatus) ui.weaponStatus.textContent = getWeaponStatus(game);

  // Weapon Slots & Active Weapon HUD Sync
  if (game.weapons) {
    if (ui.slotAmmoShotgun && game.weapons.shotgun) {
      ui.slotAmmoShotgun.textContent = `${game.weapons.shotgun.ammo}/${game.weapons.shotgun.maxAmmo}`;
    }
    if (ui.slotAmmoRifle && game.weapons.rifle) {
      ui.slotAmmoRifle.textContent = `${game.weapons.rifle.ammo}/${game.weapons.rifle.maxAmmo}`;
    }
    if (ui.slotAmmoRocket && game.weapons.rocket) {
      ui.slotAmmoRocket.textContent = `${game.weapons.rocket.ammo}/${game.weapons.rocket.maxAmmo}`;
    }
    if (ui.slotAmmoSniper && game.weapons.sniper) {
      ui.slotAmmoSniper.textContent = `${game.weapons.sniper.ammo}/${game.weapons.sniper.maxAmmo}`;
    }
    if (ui.slotAmmoFlamethrower && game.weapons.flamethrower) {
      ui.slotAmmoFlamethrower.textContent = `${game.weapons.flamethrower.ammo}/${game.weapons.flamethrower.maxAmmo}`;
    }
    if (ui.weaponNameLabel && game.weapons[game.activeWeapon]) {
      ui.weaponNameLabel.textContent = game.weapons[game.activeWeapon].name;
    }
    if (ui.weaponSlotButtons) {
      ui.weaponSlotButtons.forEach(btn => {
        const isActive = btn.dataset.weapon === game.activeWeapon;
        btn.classList.toggle("active", isActive);
        btn.style.borderColor = isActive ? "#00d6ff" : "rgba(0, 220, 255, 0.3)";
        btn.style.background = isActive ? "rgba(0, 220, 255, 0.28)" : "rgba(0, 40, 60, 0.6)";
        btn.style.color = isActive ? "#ffffff" : "#aaaaaa";
      });
    }
    if (ui.mobileWeaponButton) {
      const slotNum = game.weapons[game.activeWeapon]?.slot || 1;
      ui.mobileWeaponButton.textContent = `GUN [${slotNum}]`;
    }
  }

  // Combo Streak Badge
  if (ui.comboBadge) {
    if (game.comboMultiplier > 1 && performance.now() - game.lastKillTime < 3000) {
      ui.comboBadge.style.display = "block";
      ui.comboBadge.textContent = `COMBO x${game.comboMultiplier}!`;
    } else {
      ui.comboBadge.style.display = "none";
    }
  }

  // Adrenaline Gauge & Ultimate Button
  const adrPercent = Math.min(1, Math.max(0, (game.adrenaline || 0) / (game.maxAdrenaline || 100)));
  if (ui.adrenalineFill) {
    ui.adrenalineFill.style.transform = `scaleX(${adrPercent})`;
  }
  if (ui.adrenalineText) {
    ui.adrenalineText.textContent = adrPercent >= 1 ? "ULTIMATE READY!" : `ADRENALINE ${Math.round(adrPercent * 100)}%`;
  }
  if (ui.mobileUltimateButton) {
    ui.mobileUltimateButton.classList.toggle("ready", adrPercent >= 1);
    ui.mobileUltimateButton.disabled = adrPercent < 1;
  }

  // EMP Blast Button Sync
  const empReady = (game.empCooldown || 0) <= 0;
  const empLabel = empReady ? "⚡ EMP READY [Q]" : `⚡ EMP ${Math.ceil(game.empCooldown)}s`;
  if (ui.empBlastButton) {
    ui.empBlastButton.textContent = empLabel;
    ui.empBlastButton.disabled = !empReady;
    ui.empBlastButton.style.background = empReady ? "rgba(0, 229, 255, 0.3)" : "rgba(0, 50, 70, 0.4)";
    ui.empBlastButton.style.borderColor = empReady ? "#00e5ff" : "rgba(0, 229, 255, 0.3)";
    ui.empBlastButton.style.color = empReady ? "#ffffff" : "#6699aa";
    ui.empBlastButton.style.boxShadow = empReady ? "0 0 14px rgba(0, 229, 255, 0.6)" : "none";
  }
  if (ui.mobileEmpButton) {
    ui.mobileEmpButton.textContent = empReady ? "⚡ EMP" : `${Math.ceil(game.empCooldown)}s`;
    ui.mobileEmpButton.disabled = !empReady;
    ui.mobileEmpButton.style.borderColor = empReady ? "#00e5ff" : "rgba(0, 229, 255, 0.3)";
    ui.mobileEmpButton.style.color = empReady ? "#ffffff" : "#6699aa";
    ui.mobileEmpButton.style.boxShadow = empReady ? "0 0 12px rgba(0, 229, 255, 0.5)" : "none";
  }
  if (ui.mobileSlideButton) {
    const slideReady = (game.slideCooldown || 0) <= 0;
    ui.mobileSlideButton.style.opacity = slideReady ? "1" : "0.5";
  }

  const vignette = ui.lowHealthVignette || document.getElementById("lowHealthVignette");
  if (vignette) {
    if (game.started && !game.gameOver && game.health > 0 && game.health <= 30) {
      const pulseSpeed = game.health <= 15 ? 0.009 : 0.005;
      const pulse = 0.38 + Math.sin(performance.now() * pulseSpeed) * 0.32;
      vignette.style.opacity = pulse.toFixed(2);
    } else {
      vignette.style.opacity = "0";
    }
  }

  updateBossPanel(ui, game);
  syncMobileControls(ui, game);
}

function syncMobileControls(ui, game) {
  if (!ui.mobileControls) return;
  const gameplayActive = game.started
    && !game.paused
    && !game.gameOver
    && ui.startOverlay.style.display !== "flex"
    && ui.pauseOverlay.style.display !== "flex"
    && ui.controlsOverlay.style.display !== "flex"
    && ui.rewardOverlay.style.display !== "flex"
    && (!ui.stageClearOverlay || ui.stageClearOverlay.style.display !== "flex")
    && (!ui.defeatOverlay || ui.defeatOverlay.style.display !== "flex");

  ui.mobileControls.classList.toggle("is-gameplay-active", gameplayActive);
  document.body.classList.toggle("show-touch-controls", Boolean(game.showTouchControls));
  if (ui.touchControlsToggle) ui.touchControlsToggle.checked = Boolean(game.showTouchControls);
}

function updateBossPanel(ui, game) {
  const container = ui.bossHudContainer || ui.bossPanel;
  if (!container) return;

  const boss = Array.isArray(game.aliens)
    ? game.aliens.find(alien => (alien.variant === "boss" || alien.type === "boss") && !alien.dead)
    : null;

  if (!boss || !game.started || game.gameOver) {
    container.style.display = "none";
    return;
  }

  container.style.display = "flex";
  const maxHp = boss.maxHealth || 12;
  const percent = Math.max(0, Math.min(100, (boss.health / maxHp) * 100));

  if (ui.bossHealthBar) {
    ui.bossHealthBar.style.width = `${percent}%`;
  } else if (ui.bossHealthFill) {
    ui.bossHealthFill.style.transform = `scaleX(${percent / 100})`;
  }

  if (ui.bossLagBar) {
    ui.bossLagBar.style.width = `${percent}%`;
  }

  if (ui.bossHealthText) {
    ui.bossHealthText.textContent = `${Math.ceil(boss.health)} / ${maxHp} HP (${Math.ceil(percent)}%)`;
  }

  if (ui.bossHudPhase) {
    if (boss.phase2Enraged) {
      ui.bossHudPhase.textContent = "PHASE 2: BLOODLUST FRENZY";
      ui.bossHudPhase.style.borderColor = "#ff1744";
      ui.bossHudPhase.style.color = "#ff5252";
    } else if (boss.eggsSpawned) {
      ui.bossHudPhase.textContent = "BIO-EGG PODS DEPLOYED";
      ui.bossHudPhase.style.borderColor = "#ffd700";
      ui.bossHudPhase.style.color = "#ffe66d";
    } else {
      ui.bossHudPhase.textContent = "PHASE 1: ARMORED SHELL";
      ui.bossHudPhase.style.borderColor = "#00e5ff";
      ui.bossHudPhase.style.color = "#84ffff";
    }
  }
}

export function showDamageIndicator(attackerPos, camera) {
  const container = document.getElementById("damageIndicatorContainer");
  if (!container || !attackerPos || !camera) return;

  const fwdRay = camera.getForwardRay ? camera.getForwardRay(1).direction : null;
  let fwdX = fwdRay ? fwdRay.x : 0;
  let fwdZ = fwdRay ? fwdRay.z : 1;
  const fwdLen = Math.hypot(fwdX, fwdZ) || 1;
  fwdX /= fwdLen;
  fwdZ /= fwdLen;

  const dx = attackerPos.x - camera.position.x;
  const dz = attackerPos.z - camera.position.z;
  const dist = Math.hypot(dx, dz) || 1;
  const dirX = dx / dist;
  const dirZ = dz / dist;

  const fwdAngle = Math.atan2(fwdX, fwdZ);
  const hitAngle = Math.atan2(dirX, dirZ);
  const diffAngle = hitAngle - fwdAngle;
  const deg = (diffAngle * 180) / Math.PI;

  const arc = document.createElement("div");
  arc.className = "damageArc";
  arc.style.transform = `rotate(${deg}deg)`;
  container.appendChild(arc);

  setTimeout(() => {
    arc.style.opacity = "0";
    setTimeout(() => arc.remove(), 550);
  }, 70);
}

export function drawAlienMap(ui, game, camera) {
  const canvas = ui.alienMapCanvas;
  if (!canvas || !camera) return;

  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const center = size / 2;
  const radarRadius = center - 10;
  const worldRadius = game.arenaRadius + 8;
  const scale = radarRadius / worldRadius;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(center, center);

  ctx.fillStyle = "rgba(0, 12, 22, 0.92)";
  ctx.beginPath();
  ctx.arc(0, 0, radarRadius + 6, 0, Math.PI * 2);
  ctx.fill();

  drawRing(ctx, game.arenaRadius * scale, "rgba(0, 220, 255, 0.68)", 2);
  drawRing(ctx, game.baseRadius * scale, "rgba(255, 40, 40, 0.72)", 2);

  ctx.strokeStyle = "rgba(191, 246, 255, 0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-radarRadius, 0);
  ctx.lineTo(radarRadius, 0);
  ctx.moveTo(0, -radarRadius);
  ctx.lineTo(0, radarRadius);
  ctx.stroke();

  const fewAliensLeft = game.aliens.length > 0 && game.aliens.length <= 3;
  const pulse = Math.sin(performance.now() * 0.008) * 0.5 + 0.5;

  for (const alien of game.aliens) {
    if (!alien || alien.dead) continue;
    const x = clamp(alien.position.x * scale, -radarRadius, radarRadius);
    const y = clamp(alien.position.z * scale, -radarRadius, radarRadius);
    const color = getAlienMapColor(alien.variant);
    const dotSize = alien.variant === "boss" ? 5.8 : alien.variant === "brute" ? 4.6 : 3.8;

    ctx.shadowColor = color;
    ctx.shadowBlur = alien.variant === "boss" ? 14 : 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, dotSize, 0, Math.PI * 2);
    ctx.fill();

    if (fewAliensLeft) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, dotSize + 3 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();

      const angle = Math.atan2(y, x);
      const beaconR = radarRadius - 2;
      const bx = Math.cos(angle) * beaconR;
      const by = Math.sin(angle) * beaconR;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(bx, by, 2.5 + pulse * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPlayerMarker(ctx, camera, scale);
  ctx.restore();
}

export function setWeaponStatus(ui, game, status, durationMs = 700) {
  game.weaponStatus = status;
  game.weaponStatusUntil = performance.now() + durationMs;
  if (ui.weaponStatus) ui.weaponStatus.textContent = status;
}

function getWeaponStatus(game) {
  if (performance.now() < game.weaponStatusUntil) return game.weaponStatus;
  if (!game.started) return "STANDBY";
  if (game.gameOver) return "OFFLINE";
  if (game.paused) return "PAUSED";
  if (game.reloading) return "RELOADING";
  if (game.ammo <= 0) return "NO AMMO";
  return "READY";
}

function drawRing(ctx, radius, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPlayerMarker(ctx, camera, scale) {
  const x = clamp(camera.position.x * scale, -72, 72);
  const y = clamp(camera.position.z * scale, -72, 72);
  const heading = camera.rotation.y;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 6);
  ctx.lineTo(0, 3);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function getAlienMapColor(variant) {
  if (variant === "boss") return "rgba(255, 66, 42, 0.98)";
  if (variant === "brute") return "rgba(255, 140, 20, 0.98)";
  if (variant === "wasp") return "rgba(255, 220, 30, 0.98)";
  if (variant === "spitter") return "rgba(220, 80, 255, 0.98)";
  if (variant === "runner") return "rgba(255, 220, 30, 0.98)";
  return "rgba(220, 80, 255, 0.98)";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
