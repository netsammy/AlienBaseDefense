import { getWaveDifficulty } from "./difficulty.js";

export function getUI() {
  return {
    difficultyLabel: document.getElementById("difficultyLabel"),
    difficultyButtons: document.querySelectorAll(".difficultyBtn"),
    wave: document.getElementById("wave"),
    stage: document.getElementById("stage"),
    stageName: document.getElementById("stageName"),
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
    startOverlay: document.getElementById("startOverlay"),
    startButton: document.getElementById("startButton"),
    restartButton: document.getElementById("restartButton"),
    alienMapCanvas: document.getElementById("alienMapCanvas"),
    damageFlash: document.getElementById("damageFlash"),
    pauseOverlay: document.getElementById("pauseOverlay"),
    resumeButton: document.getElementById("resumeButton"),
    pauseRestartButton: document.getElementById("pauseRestartButton"),
    mainMenuButton: document.getElementById("mainMenuButton"),
    alienGalleryButton: document.getElementById("alienGalleryButton"),
    alienGalleryOverlay: document.getElementById("alienGalleryOverlay"),
    alienGalleryClose: document.getElementById("alienGalleryClose"),
    alienPreviewCanvas: document.getElementById("alienPreviewCanvas"),
    alienPreviewButtons: document.querySelectorAll(".alienPreviewBtn"),
    rewardOverlay: document.getElementById("rewardOverlay"),
    rewardTitle: document.getElementById("rewardTitle"),
    rewardSummary: document.getElementById("rewardSummary"),
    rewardButtons: document.querySelectorAll(".rewardBtn"),
    shopButtons: document.querySelectorAll(".shopBtn"),
    stageButtons: document.querySelectorAll(".stageBtn"),
    mobileControls: document.getElementById("mobileControls"),
    joystick: document.getElementById("joystick"),
    joystickKnob: document.getElementById("joystickKnob"),
    mobileFireButton: document.getElementById("mobileFireButton"),
    mobileReloadButton: document.getElementById("mobileReloadButton"),
    mobileSprintButton: document.getElementById("mobileSprintButton")
  };
}

export function updateUI(ui, game) {
  const difficulty = getWaveDifficulty(game);
  ui.difficultyLabel.textContent = difficulty.modeLabel;
  ui.stage.textContent = difficulty.stage;
  ui.stageName.textContent = difficulty.name;
  ui.wave.textContent = game.wave;
  ui.aliensLeft.textContent = game.aliens.length;
  ui.score.textContent = game.score;
  ui.bestScore.textContent = game.bestScore;
  ui.coins.textContent = game.coins;
  ui.runCoins.textContent = game.runCoins;
  ui.health.textContent = game.health;
  ui.baseHealth.textContent = game.baseHealth;
  ui.maxBaseHealth.textContent = game.maxBaseHealth;
  ui.kills.textContent = game.playerKills;
  ui.defenseKills.textContent = game.defenseKills;
  ui.ammo.textContent = game.ammo;
  ui.maxAmmo.textContent = game.maxAmmo;
  ui.weaponStatus.textContent = getWeaponStatus(game);
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
  }

  drawPlayerMarker(ctx, camera, scale);
  ctx.restore();
}

export function setWeaponStatus(ui, game, status, durationMs = 700) {
  game.weaponStatus = status;
  game.weaponStatusUntil = performance.now() + durationMs;
  ui.weaponStatus.textContent = status;
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
  if (variant === "brute") return "rgba(200, 255, 76, 0.96)";
  if (variant === "runner") return "rgba(66, 245, 255, 0.96)";
  if (variant === "mutant") return "rgba(128, 255, 210, 0.96)";
  return "rgba(92, 255, 115, 0.96)";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
