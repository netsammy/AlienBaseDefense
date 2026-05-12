import * as BABYLON from "@babylonjs/core";
import { getStageThreatPlan, getWaveBriefing, getWaveDifficulty } from "./difficulty.js";
import { updateUI } from "./ui.js";
import { createAlienExplosion } from "./effects.js";
import { createAmmoPack, createHealthPack } from "./pickups.js";
import { updateBestScore } from "./highScore.js";
import { playSound } from "./sound.js";
import { cloneAnimatedAsset, cloneLoadedAsset, fitModelToHeight, getModelBounds } from "./assets.js";
import { showRewardChoices } from "./rewards.js";
import { pulseBaseDamage } from "./effects.js";
import { awardCoins } from "./shop.js";

const ALIEN_VARIANTS = [
  { type: "grunt", score: 100, health: 0, speed: 1, damage: 1, scale: 1, color: new BABYLON.Color3(0.18, 0.82, 0.22), height: 3.15, assetKey: "alienGruntGreen" },
  { type: "mutant", score: 145, health: 0, speed: 1.35, damage: 0.9, scale: 1, color: new BABYLON.Color3(0.2, 0.95, 0.8), height: 3.2, animated: true },
  { type: "runner", score: 125, health: -1, speed: 1.45, damage: 0.75, scale: 0.82, color: new BABYLON.Color3(0.2, 0.95, 0.8), height: 2.65, assetKey: "alienRunnerPurple" },
  { type: "brute", score: 175, health: 2, speed: 0.72, damage: 1.45, scale: 1.28, color: new BABYLON.Color3(0.62, 0.95, 0.18), height: 3.85, assetKey: "alienBruteArmored" },
  { type: "boss", score: 750, health: 9, speed: 0.58, damage: 2.2, scale: 1.8, color: new BABYLON.Color3(1, 0.18, 0.08), height: 5.25, assetKey: "alienBossHorned" }
];

const ALIEN_VARIANT_BY_TYPE = Object.fromEntries(ALIEN_VARIANTS.map(variant => [variant.type, variant]));

export function createAlien(context, position, difficulty, variant = ALIEN_VARIANTS[0]) {
  const { scene, game, materials, loadedAssets } = context;
  const root = new BABYLON.TransformNode("AlienRoot", scene);
  root.position = position.clone();
  root.health = Math.max(1, 2 + difficulty.healthBonus + variant.health);
  root.maxHealth = root.health;
  root.speed = difficulty.speed * variant.speed;
  root.damage = Math.max(1, Math.round(difficulty.damage * variant.damage));
  root.scoreValue = variant.score;
  root.variant = variant.type;
  root.attackCooldown = 0;
  root.baseAttackCooldown = 0;

  const variantMat = materials.alien.clone(`AlienMat_${variant.type}_${Math.random()}`);
  variantMat.diffuseColor = variant.color;
  variantMat.emissiveColor = variant.color.scale(0.38);

  const modelAsset = variant.animated
    ? loadedAssets.animatedAlien
    : loadedAssets[variant.assetKey] || loadedAssets.alien;
  const clonedModel = variant.animated
    ? cloneAnimatedAsset(modelAsset, `AlienModel_${variant.type}`, {
      parent: root,
      position: new BABYLON.Vector3(0, 0, 0),
      rotation: new BABYLON.Vector3(0, 0, 0),
      scaling: new BABYLON.Vector3(1, 1, 1),
      metadata: { alienRoot: root }
    })
    : { root: cloneLoadedAsset(modelAsset, `AlienModel_${variant.type}`, {
    parent: root,
    position: new BABYLON.Vector3(0, 0, 0),
    rotation: new BABYLON.Vector3(0, 0, 0),
    scaling: new BABYLON.Vector3(1, 1, 1),
    metadata: { alienRoot: root }
  }), animationGroups: [] };

  const modelRoot = clonedModel.root;

  if (modelRoot) {
    const fitted = fitModelToHeight(modelRoot, variant.height, 0);
    const bounds = getModelBounds(modelRoot);
    if (!fitted || !bounds || bounds.size.y < 0.2) {
      modelRoot.dispose();
    } else {
    root.animationGroups = clonedModel.animationGroups;
    root.currentAnimation = null;
    root.getChildMeshes(false).forEach(mesh => {
      mesh.metadata = { alienRoot: root };
      mesh.isPickable = true;
    });
    createAlienHealthBar(scene, root, variant.height);
    playAlienAnimation(root, "idle", true);
    game.aliens.push(root);
    return root;
    }
  }

  const body = BABYLON.MeshBuilder.CreateCapsule("AlienBody", {
    radius: 0.45,
    height: 1.8,
    tessellation: 16
  }, scene);
  body.parent = root;
  body.position.y = 1;
  body.scaling = new BABYLON.Vector3(variant.scale, variant.scale, variant.scale);
  body.material = variantMat;
  body.metadata = { alienRoot: root };

  const head = BABYLON.MeshBuilder.CreateSphere("AlienHead", { diameter: 0.78 }, scene);
  head.parent = root;
  head.position.y = 2.05;
  head.scaling = new BABYLON.Vector3(1.15 * variant.scale, variant.scale, variant.scale);
  head.material = variantMat;
  head.metadata = { alienRoot: root };

  for (const x of [-0.18, 0.18]) {
    const eye = BABYLON.MeshBuilder.CreateSphere("AlienEye", { diameter: 0.13 }, scene);
    eye.parent = root;
    eye.position = new BABYLON.Vector3(x, 2.12, -0.34);
    eye.material = materials.alienEye;
  }

  for (const x of [-0.52, 0.52]) {
    const arm = BABYLON.MeshBuilder.CreateCylinder("AlienArm", { diameter: 0.12, height: 1.2 }, scene);
    arm.parent = root;
    arm.position = new BABYLON.Vector3(x, 1.1, 0);
    arm.rotation.z = x > 0 ? -0.5 : 0.5;
    arm.scaling = new BABYLON.Vector3(variant.scale, variant.scale, variant.scale);
    arm.material = variantMat;
    arm.metadata = { alienRoot: root };
  }

  createAlienHealthBar(scene, root, variant.height);
  game.aliens.push(root);
  return root;
}

export function spawnWave(context) {
  const { game, ui } = context;
  if (game.gameOver) return;
  clearAliens(game);
  const difficulty = getWaveDifficulty(game);
  game.stage = difficulty.stage;
  game.spawnCount = difficulty.count;
  game.aliens = [];
  game.wavePlayerKills = 0;
  game.waveDefenseKills = 0;
  game.waveStarting = true;
  game.waveCountdown = 3;
  game.playerInvincibleUntil = performance.now() + difficulty.safetyShieldMs;

  updateUI(ui, game);
  runWaveCountdown(context, difficulty, 3);
}

function runWaveCountdown(context, difficulty, count) {
  const { game, ui } = context;
  if (game.gameOver || !game.started) return;
  if (game.paused) {
    game.waveTimer = setTimeout(() => runWaveCountdown(context, difficulty, count), 250);
    return;
  }

  if (count > 0) {
    game.waveCountdown = count;
    ui.message.textContent = `${getWaveBriefing(game, difficulty)} Attack starts in ${count}.`;
    game.waveTimer = setTimeout(() => runWaveCountdown(context, difficulty, count - 1), 1000);
    return;
  }

  game.waveCountdown = 0;
  ui.message.textContent = "Fight!";
  game.waveTimer = setTimeout(() => {
    if (game.gameOver || !game.started) return;
    finishWaveSpawn(context, difficulty);
  }, 700);
}

function finishWaveSpawn(context, difficulty) {
  const { game, ui } = context;
  if (game.gameOver) return;
  game.waveStarting = false;

  for (let i = 0; i < difficulty.count; i++) {
    const pos = getSpawnPosition(game, difficulty, i);
    const variant = getForcedWaveVariant(game, difficulty, i) || pickWaveVariant(context, difficulty, i);
    createAlien(context, pos, difficulty, variant);
  }

  ui.message.textContent = game.wave % 5 === 0
    ? "Boss wave! Horned boss has entered the arena. Keep it away from the red zone!"
    : `${getAlienMixLabel(difficulty)} Safety shield active.`;
  setTimeout(() => {
    if (!game.gameOver) ui.message.textContent = "Tip: move backwards, sprint with Shift, and keep aliens outside the red zone.";
  }, 1700);
  updateUI(ui, game);
}

function getSpawnPosition(game, difficulty, index) {
  if (game.wave === 1 && index === 0) {
    return new BABYLON.Vector3(0, 0, 20);
  }

  const angle = Math.random() * Math.PI * 2;
  const distance = difficulty.spawnMin + Math.random() * (difficulty.spawnMax - difficulty.spawnMin);
  return new BABYLON.Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
}

function pickWaveVariant(context, difficulty, index) {
  const { game, loadedAssets } = context;
  if (index === 0 && game.wave % 5 === 0) return ALIEN_VARIANTS[4];
  if (index === 0 && loadedAssets.animatedAlien) return ALIEN_VARIANTS[1];
  return pickAlienVariant(difficulty.stage);
}

function getForcedWaveVariant(game, difficulty, index) {
  if (index === 0 && game.wave % 5 === 0) return ALIEN_VARIANT_BY_TYPE.boss;
  if (index === 1 && difficulty.stage >= 1 && game.wave >= 2) return ALIEN_VARIANT_BY_TYPE.runner;
  if (index === 2 && difficulty.stage >= 2) return ALIEN_VARIANT_BY_TYPE.brute;
  if (index === 3 && difficulty.stage >= 3) return ALIEN_VARIANT_BY_TYPE.mutant;
  if (index === 4 && difficulty.stage >= 4) return ALIEN_VARIANT_BY_TYPE.brute;
  return null;
}

function pickAlienVariant(stage) {
  const weights = getStageThreatPlan(stage).weights;
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [type, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return ALIEN_VARIANT_BY_TYPE[type] || ALIEN_VARIANTS[0];
  }
  return ALIEN_VARIANTS[0];
}

function getAlienMixLabel(difficulty) {
  const weights = getStageThreatPlan(difficulty.stage).weights;
  const activeTypes = Object.entries(weights)
    .filter(([, weight]) => weight > 0)
    .map(([type]) => type.toUpperCase())
    .join(" / ");
  return `Incoming: ${activeTypes}.`;
}

export function clearAliens(game) {
  for (const alien of game.aliens) {
    alien.getChildMeshes().forEach(m => m.dispose());
    alien.dispose();
  }
  game.aliens = [];
}

export function damageAlien(context, alien, amount, source = "player") {
  if (!alien || alien.dead) return;
  alien.health -= amount;
  updateAlienHealthBar(alien);
  if (alien.health <= 0) killAlien(context, alien, source);
}

export function killAlien(context, alien, source = "player") {
  if (!alien || alien.dead) return;
  const { game, ui, materials, scene } = context;
  alien.dead = true;
  const now = performance.now();
  game.killStreak = now - game.lastKillTime < 2500 ? game.killStreak + 1 : 1;
  game.lastKillTime = now;
  const comboMultiplier = Math.min(4, 1 + Math.floor((game.killStreak - 1) / 3));
  const earnedScore = (alien.scoreValue || 100) * comboMultiplier;
  game.score += earnedScore;
  awardCoins(context, Math.max(8, Math.round(earnedScore / 12)));
  game.kills++;
  if (source === "defense") {
    game.defenseKills++;
    game.waveDefenseKills++;
  } else {
    game.playerKills++;
    game.wavePlayerKills++;
  }
  if (comboMultiplier > 1) {
    ui.message.textContent = `Combo x${comboMultiplier}! +${earnedScore}`;
  }

  const dropRoll = Math.random();
  if (dropRoll < 0.16) {
    createHealthPack(context, alien.position.clone());
  } else if (dropRoll < 0.34) {
    createAmmoPack(context, alien.position.clone());
  }

  createAlienExplosion(scene, alien, materials.alien);
  playSound("alien_death");

  game.aliens = game.aliens.filter(a => a !== alien);
  setAlienHealthBarVisible(alien, false);
  alien.getChildMeshes().forEach(m => m.isPickable = false);
  if (alien.animationGroups?.length && playAlienAnimation(alien, "dying", false)) {
    setTimeout(() => {
      alien.getChildMeshes().forEach(m => m.dispose());
      alien.animationGroups?.forEach(group => group.dispose());
      alien.dispose();
    }, 900);
  } else {
    alien.getChildMeshes().forEach(m => m.dispose());
    alien.dispose();
  }

  if (game.aliens.length === 0 && game.started && !game.gameOver) {
    const clearedByDefense = game.waveDefenseKills > 0 && source === "defense";
    const waveClearMessage = clearedByDefense
      ? `Wave secured! Your towers finished the last alien. You killed ${game.wavePlayerKills}; defenses killed ${game.waveDefenseKills}.`
      : `Wave cleared! You eliminated all aliens. Rifle kills this wave: ${game.wavePlayerKills}.`;
    game.wave++;
    game.waveStarting = true;
    game.health = Math.min(100, game.health + 12);
    game.baseHealth = Math.min(game.maxBaseHealth, game.baseHealth + 8);
    game.ammo = game.maxAmmo;
    ui.message.textContent = `${waveClearMessage} Health, base shield, and ammo restored.`;
    showRewardChoices(context);
  }

  updateUI(ui, game);
}

export function damagePlayer(context, amount) {
  const { game, ui } = context;
  if (performance.now() < game.playerInvincibleUntil) return;

  game.health = Math.max(0, game.health - amount);
  ui.damageFlash.style.background = "rgba(255, 0, 0, 0.28)";
  setTimeout(() => ui.damageFlash.style.background = "rgba(255, 0, 0, 0)", 120);
  updateUI(ui, game);

  if (game.health <= 0) {
    game.gameOver = true;
    updateBestScore(game);
    updateUI(ui, game);
    ui.message.textContent = `Game Over - Final Score: ${game.score}. Press RESTART.`;
    document.exitPointerLock?.();
  }
}

export function damageBase(context, amount) {
  const { game, ui } = context;
  if (game.gameOver) return;

  game.baseHealth = Math.max(0, game.baseHealth - amount);
  ui.message.textContent = "Base shield damaged! Keep aliens outside the red zone!";
  pulseBaseDamage(context);
  playSound("base_damage");
  updateUI(ui, game);

  if (game.baseHealth <= 0) {
    game.gameOver = true;
    updateBestScore(game);
    updateUI(ui, game);
    ui.message.textContent = `Base destroyed - Final Score: ${game.score}. Press RESTART.`;
    document.exitPointerLock?.();
  }
}

export function updateAliens(context) {
  const { engine, camera, game } = context;
  if (!game.started || game.paused || game.gameOver) return;
  const delta = engine.getDeltaTime();

  for (const alien of [...game.aliens]) {
    if (!alien || alien.dead) continue;

    const direction = camera.position.subtract(alien.position);
    direction.y = 0;
    const distanceToPlayer = direction.length();
    const distanceFromCenter = Math.sqrt(alien.position.x * alien.position.x + alien.position.z * alien.position.z);

    if (distanceToPlayer > 1.8) {
      direction.normalize();
      const slowMultiplier = performance.now() < (alien.slowUntil || 0) ? 0.45 : 1;
      alien.position.addInPlace(direction.scale(alien.speed * slowMultiplier * (delta / 16.67)));
      alien.lookAt(camera.position);
      playAlienAnimation(alien, "run", true);
    } else {
      playAlienAnimation(alien, "idle", true);
      alien.attackCooldown -= delta;
      if (alien.attackCooldown <= 0) {
        alien.attackCooldown = 900;
        damagePlayer(context, alien.damage);
      }
    }

    alien.baseAttackCooldown -= delta;
    if (distanceFromCenter < game.baseRadius && alien.baseAttackCooldown <= 0) {
      alien.baseAttackCooldown = 1000;
      damageBase(context, 2);
    }

    alien.rotation.z = Math.sin(performance.now() / 180 + alien.position.x) * 0.04;
  }
}

function createAlienHealthBar(scene, alien, height) {
  const width = Math.max(0.9, Math.min(1.8, height * 0.36));
  const y = height + 0.36;

  const backMat = new BABYLON.StandardMaterial(`AlienHealthBack_${Math.random()}`, scene);
  backMat.diffuseColor = new BABYLON.Color3(0.05, 0.07, 0.08);
  backMat.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.02);
  backMat.disableLighting = true;

  const fillMat = new BABYLON.StandardMaterial(`AlienHealthFill_${Math.random()}`, scene);
  fillMat.diffuseColor = new BABYLON.Color3(0.2, 1, 0.26);
  fillMat.emissiveColor = new BABYLON.Color3(0.1, 0.8, 0.16);
  fillMat.disableLighting = true;

  const back = BABYLON.MeshBuilder.CreatePlane("AlienHealthBack", { width, height: 0.1 }, scene);
  back.parent = alien;
  back.position.y = y;
  back.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  back.material = backMat;
  back.isPickable = false;

  const fill = BABYLON.MeshBuilder.CreatePlane("AlienHealthFill", { width, height: 0.068 }, scene);
  fill.parent = alien;
  fill.position.y = y - 0.001;
  fill.position.z = -0.004;
  fill.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  fill.material = fillMat;
  fill.isPickable = false;

  alien.healthBar = { back, fill, width, fillMat };
  updateAlienHealthBar(alien);
}

function updateAlienHealthBar(alien) {
  if (!alien.healthBar || !alien.maxHealth) return;
  const percent = Math.max(0, Math.min(1, alien.health / alien.maxHealth));
  alien.healthBar.fill.scaling.x = percent;
  alien.healthBar.fill.position.x = -alien.healthBar.width * (1 - percent) * 0.5;
  alien.healthBar.fillMat.emissiveColor = percent > 0.5
    ? new BABYLON.Color3(0.1, 0.8, 0.16)
    : percent > 0.25
      ? new BABYLON.Color3(0.95, 0.72, 0.08)
      : new BABYLON.Color3(1, 0.12, 0.08);
  alien.healthBar.fillMat.diffuseColor = alien.healthBar.fillMat.emissiveColor;
}

function setAlienHealthBarVisible(alien, visible) {
  alien.healthBar?.back?.setEnabled(visible);
  alien.healthBar?.fill?.setEnabled(visible);
}

function playAlienAnimation(alien, kind, loop) {
  if (!alien.animationGroups?.length) return false;
  const group = findAnimationGroup(alien.animationGroups, kind);
  if (!group || alien.currentAnimation === group.name) return Boolean(group);

  alien.animationGroups.forEach(animationGroup => animationGroup.stop());
  group.start(loop);
  alien.currentAnimation = group.name;
  return true;
}

function findAnimationGroup(groups, kind) {
  const patterns = {
    idle: ["idle", "breathing"],
    run: ["run", "walk"],
    dying: ["dying", "death"]
  }[kind];

  return groups.find(group => patterns.some(pattern => group.name.toLowerCase().includes(pattern)));
}
