import * as BABYLON from "@babylonjs/core";
import { getStageThreatPlan, getWaveBriefing, getWaveDifficulty } from "./difficulty.js";
import { updateUI, showDamageIndicator } from "./ui.js";
import { createAlienExplosion, createAlienGibs, createGroundAcidDecal, triggerVisorAcidSplatter, pulseBaseDamage, applyCameraShake, createImpactEffect, addCameraTrauma } from "./effects.js";
import { createAmmoPack, createHealthPack } from "./pickups.js";
import { updateBestScore } from "./highScore.js";
import { playSound, startBossMusic, stopBossMusic, playSpatialSound, broadcastRadioComms, setMusicState } from "./sound.js";
import { cloneLoadedAsset, fitModelToHeight, getModelBounds } from "./assets.js";
import { showRewardChoices, showStageClearModal } from "./rewards.js";
import { awardCoins } from "./shop.js";
import { isRewardedContinueAvailable, showInterstitialAtBreakIfAvailable } from "./adBridge.js";
import { triggerHaptic } from "./haptics.js";
import { updateMissionProgress } from "./retention.js";
import { triggerAchievement } from "./achievements.js";

const ALIEN_VARIANTS = [
  {
    type: "spitter",
    score: 180,
    health: 0,
    speed: 0.92,
    damage: 1.2,
    scale: 1.45,
    color: new BABYLON.Color3(0.85, 0.3, 0.95),
    height: 4.6,
    assetKeys: ["alienSpitter", "alien"],
    assetKey: "alienSpitter"
  },
  {
    type: "wasp",
    score: 195,
    health: -1,
    speed: 1.35,
    damage: 1.0,
    scale: 1.35,
    color: new BABYLON.Color3(1.0, 0.85, 0.15),
    height: 3.8,
    assetKeys: ["alienScoutWasp"],
    assetKey: "alienScoutWasp",
    isFlying: true
  },
  {
    type: "brute",
    score: 320,
    health: 3,
    speed: 0.68,
    damage: 1.8,
    scale: 1.85,
    color: new BABYLON.Color3(1.0, 0.45, 0.1),
    height: 6.2,
    assetKeys: ["alienBruteArmored", "alienBrutePurple", "alienGoliathBoss"],
    assetKey: "alienBruteArmored"
  },
  {
    type: "boss",
    score: 1000,
    health: 12,
    speed: 0.54,
    damage: 2.4,
    scale: 2.8,
    color: new BABYLON.Color3(1, 0.15, 0.08),
    height: 9.2,
    assetKeys: ["alienGoliathBoss", "alienBossHorned"],
    assetKey: "alienGoliathBoss"
  },
  {
    type: "grunt",
    score: 120,
    health: 0,
    speed: 0.95,
    damage: 1.0,
    scale: 1.35,
    color: new BABYLON.Color3(0.85, 0.3, 0.95),
    height: 4.2,
    assetKeys: ["alienGruntGreen", "alien", "alienRunnerPurple"],
    assetKey: "alienGruntGreen"
  },
  {
    type: "runner",
    score: 140,
    health: -1,
    speed: 1.4,
    damage: 0.8,
    scale: 1.25,
    color: new BABYLON.Color3(1.0, 0.85, 0.15),
    height: 3.6,
    assetKeys: ["alienRunnerPurple", "alien", "alienGruntGreen"],
    assetKey: "alienRunnerPurple"
  }
];

const ALIEN_VARIANT_BY_TYPE = Object.fromEntries(ALIEN_VARIANTS.map(variant => [variant.type, variant]));

export function createAlien(context, position, difficulty, variant = ALIEN_VARIANTS[0]) {
  const { scene, game, materials, loadedAssets } = context;
  const root = new BABYLON.TransformNode("AlienRoot", scene);
  root.position = position.clone();
  if (variant.isFlying) {
    root.position.y = 3.6 + Math.random() * 1.0;
  }
  root.health = Math.max(1, 2 + difficulty.healthBonus + variant.health);
  root.maxHealth = root.health;
  root.speed = difficulty.speed * variant.speed;
  root.damage = Math.max(1, Math.round(difficulty.damage * variant.damage));
  root.scoreValue = variant.score;
  root.variant = variant.type;
  root.isFlying = Boolean(variant.isFlying);
  root.flightPhase = Math.random() * Math.PI * 2;
  root.attackCooldown = 0;
  root.baseAttackCooldown = 0;

  const variantMat = materials.alien.clone(`AlienMat_${variant.type}_${Math.random()}`);
  variantMat.diffuseColor = variant.color;
  variantMat.emissiveColor = variant.color.scale(0.38);

  // Mix old and new 3D models seamlessly across spawns
  const candidateKeys = variant.assetKeys || (variant.assetKey ? [variant.assetKey] : []);
  const availableKeys = candidateKeys.filter(k => loadedAssets && loadedAssets[k]);
  const chosenKey = availableKeys.length > 0
    ? availableKeys[Math.floor(Math.random() * availableKeys.length)]
    : (candidateKeys[0] || variant.assetKey);

  const modelAsset = (loadedAssets && loadedAssets[chosenKey])
    || (loadedAssets && loadedAssets[variant.assetKey])
    || loadedAssets?.alien
    || loadedAssets?.alienGruntGreen
    || loadedAssets?.alienRunnerPurple
    || loadedAssets?.alienBruteArmored
    || loadedAssets?.alienBrutePurple
    || loadedAssets?.alienBossHorned
    || loadedAssets?.alienSpitter
    || loadedAssets?.alienScoutWasp
    || loadedAssets?.alienGoliathBoss;
  const clonedModel = { root: cloneLoadedAsset(modelAsset, `AlienModel_${variant.type}_${chosenKey}`, {
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
    root.modelRoot = modelRoot;
    root.baseScale = modelRoot.scaling.clone();
    root.basePosition = modelRoot.position.clone();
    root.baseRotation = modelRoot.rotation.clone();
    root.animWalkPhase = Math.random() * 10;
    root.animBreathPhase = Math.random() * 10;
    root.flinchAmount = 0;
    root.flinchDir = 0;
    root.attackAnimTimer = 0;
    root.attackAnimType = null;
    root.getChildMeshes(false).forEach(mesh => {
      mesh.metadata = { alienRoot: root };
      mesh.isPickable = true;
    });
    createAlienHealthBar(scene, root, variant.height);
    attachAlienTapetumEyes(scene, root, variant);
    addAlienToShadowMap(context, root);
    playAlienAnimation(root, "idle", true);
    game.aliens.push(root);
    return root;
    }
  }

  const body = BABYLON.MeshBuilder.CreateCapsule("AlienBody", {
    radius: 0.65,
    height: 2.5,
    tessellation: 16
  }, scene);
  body.parent = root;
  body.position.y = 1.35;
  body.scaling = new BABYLON.Vector3(variant.scale, variant.scale, variant.scale);
  body.material = variantMat;
  body.metadata = { alienRoot: root };

  const head = BABYLON.MeshBuilder.CreateSphere("AlienHead", { diameter: 1.15 }, scene);
  head.parent = root;
  head.position.y = 2.85;
  head.scaling = new BABYLON.Vector3(1.15 * variant.scale, variant.scale, variant.scale);
  head.material = variantMat;
  head.metadata = { alienRoot: root };

  for (const x of [-0.25, 0.25]) {
    const eye = BABYLON.MeshBuilder.CreateSphere("AlienEye", { diameter: 0.20 }, scene);
    eye.parent = root;
    eye.position = new BABYLON.Vector3(x, 2.92, -0.48);
    eye.material = materials.alienEye;
  }

  for (const x of [-0.75, 0.75]) {
    const arm = BABYLON.MeshBuilder.CreateCylinder("AlienArm", { diameter: 0.18, height: 1.6 }, scene);
    arm.parent = root;
    arm.position = new BABYLON.Vector3(x, 1.5, 0);
    arm.rotation.z = x > 0 ? -0.5 : 0.5;
    arm.scaling = new BABYLON.Vector3(variant.scale, variant.scale, variant.scale);
    arm.material = variantMat;
    arm.metadata = { alienRoot: root };
  }

  createAlienHealthBar(scene, root, variant.height);
  attachAlienTapetumEyes(scene, root, variant);
  addAlienToShadowMap(context, root);
  game.aliens.push(root);
  return root;
}

export function spawnWave(context) {
  const { game, ui } = context;
  if (game.gameOver) return;
  clearAliens(game, context);
  const difficulty = getWaveDifficulty(game);
  game.stage = difficulty.stage;
  game.spawnCount = difficulty.count;
  game.aliens = [];
  game.wavePlayerKills = 0;
  game.waveDefenseKills = 0;
  game.waveStarting = true;
  game.waveCountdown = 3;
  game.playerInvincibleUntil = performance.now() + difficulty.safetyShieldMs;
  setMusicState("ambient");

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

  const isBossWave = (game.wave === 3 || game.wave % 5 === 0);
  ui.message.textContent = isBossWave
    ? "BOSS WARNING! Goliath Bio-Titan has entered the arena. Protect the fusion core!"
    : `${getAlienMixLabel(difficulty)} Safety shield active.`;
  if (isBossWave) {
    playSound("boss_warning");
    setMusicState("boss");
    broadcastRadioComms("Warning! Goliath class bio-titan approaching perimeter!", true);
  } else {
    setMusicState("combat");
    broadcastRadioComms(`Sector Wave ${game.wave} incoming. Defend the core.`);
  }
  setTimeout(() => {
    if (!game.gameOver) ui.message.textContent = "Tip: move backwards, sprint with Shift, and keep aliens outside the red zone.";
  }, 1700);
  updateUI(ui, game);
}

function getSpawnPosition(game, difficulty, index) {
  if (game.wave === 1 && index === 0) {
    return new BABYLON.Vector3(0, 0, 18);
  }

  const angle = Math.random() * Math.PI * 2;
  const arenaR = game.arenaRadius || 28;
  const minSpawn = arenaR - 6; // ~22m
  const maxSpawn = arenaR - 1.5; // ~26.5m (safely within boundary fence)
  const distance = minSpawn + Math.random() * (maxSpawn - minSpawn);
  return new BABYLON.Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
}

function pickWaveVariant(context, difficulty, index) {
  const { game } = context;
  if (index === 0 && (game.wave === 3 || game.wave % 5 === 0)) return ALIEN_VARIANT_BY_TYPE.boss;
  return pickAlienVariant(difficulty.stage);
}

function getForcedWaveVariant(game, difficulty, index) {
  if (index === 0 && (game.wave === 3 || game.wave % 5 === 0)) return ALIEN_VARIANT_BY_TYPE.boss;
  if (index === 0 && game.wave === 1) return ALIEN_VARIANT_BY_TYPE.spitter;
  if (index === 1 && game.wave === 1) return ALIEN_VARIANT_BY_TYPE.wasp;
  if (index === 0 && game.wave === 2) return ALIEN_VARIANT_BY_TYPE.brute;
  if (index === 1 && game.wave === 2) return ALIEN_VARIANT_BY_TYPE.wasp;
  if (index === 2 && game.wave === 2) return ALIEN_VARIANT_BY_TYPE.spitter;
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
    .map(([type]) => {
      if (type === "spitter") return "ACID SPITTERS";
      if (type === "wasp") return "FLYING WASPS";
      if (type === "brute") return "GOLIATH TITANS";
      if (type === "grunt") return "BIO GRUNTS";
      if (type === "runner") return "INSECTOID RUNNERS";
      return type.toUpperCase();
    })
    .join(" / ");
  return `Incoming: ${activeTypes}.`;
}

export function clearAliens(game, context = null) {
  for (const alien of game.aliens) {
    if (alien) {
      disposeAlienTapetumEyes(alien);
      alien.getChildMeshes().forEach(m => m.dispose());
      alien.dispose();
    }
  }
  game.aliens = [];

  if (context?.shadowGenerator?.getShadowMap()) {
    const renderList = context.shadowGenerator.getShadowMap().renderList;
    if (renderList) {
      context.shadowGenerator.getShadowMap().renderList = renderList.filter(m => !m.isDisposed());
    }
  }

  if (game.alienProjectiles) {
    for (const proj of game.alienProjectiles) {
      if (proj.mesh) {
        try { proj.mesh.dispose(); } catch (e) {}
      }
      if (proj.material) {
        try { proj.material.dispose(); } catch (e) {}
      }
    }
    game.alienProjectiles = [];
  }
}

export function damageAlien(context, alien, amount, source = "player") {
  if (!alien || alien.dead) return;
  alien.flinchAmount = 1.0;
  alien.flinchDir = (Math.random() - 0.5) * 0.4;
  if (source === "player") alien.playerTagged = true;
  if (source === "defense" && !alien.playerTagged) {
    alien.health = Math.max(1, alien.health - amount);
    updateAlienHealthBar(alien);
    return;
  }
  alien.health -= amount;
  updateAlienHealthBar(alien);

  // Goliath Boss Multi-Phase Mechanics
  if (alien.variant === "boss" && alien.health > 0) {
    // Phase 2: Brood Egg Pod Launch (at <= 66% HP)
    if (!alien.phaseEggPodsSpawned && alien.health <= alien.maxHealth * 0.66) {
      alien.phaseEggPodsSpawned = true;
      playSpatialSound("egg_pod_spawn", alien.position, context.camera, 1.4);
      broadcastRadioComms("Warning! Titan has deployed Bio-Egg Pods! Destroy them before they hatch!", true);
      triggerHaptic("heavy");
      if (context.camera) applyCameraShake(context.camera, 0.035);
      if (context.ui?.message) {
        context.ui.message.textContent = "BIO-EGG PODS DEPLOYED! DESTROY THEM BEFORE THEY HATCH!";
        context.ui.message.style.background = "rgba(40, 180, 40, 0.9)";
        context.ui.message.style.borderColor = "#00e676";
      }
      spawnBossEggPods(context, alien);
    }

    // Phase 3: Crimson Bloodlust Enrage (at <= 30% HP)
    if (!alien.phase3Enraged && alien.health <= alien.maxHealth * 0.30) {
      alien.phase3Enraged = true;
      alien.speed *= 1.45;
      playSpatialSound("boss_enrage", alien.position, context.camera, 1.8);
      broadcastRadioComms("Critical! Titan has entered Bloodlust Frenzy! Massive kinetic spike!", true);
      triggerHaptic("heavy");
      if (context.camera) applyCameraShake(context.camera, 0.055);
      if (context.ui?.message) {
        context.ui.message.textContent = "CRIMSON BLOODLUST! BOSS SPEED +45% & SPREAD BARRAGE!";
        context.ui.message.style.background = "rgba(220, 20, 10, 0.95)";
        context.ui.message.style.borderColor = "#ff3838";
      }
      // Turn boss model meshes glowing crimson
      alien.getChildMeshes(false).forEach(mesh => {
        if (mesh.material) {
          try {
            mesh.material.emissiveColor = new BABYLON.Color3(1.0, 0.12, 0.05);
          } catch (e) {}
        }
      });
    }
  }

  if (alien.health <= 0) killAlien(context, alien, source);
}

export function killAlien(context, alien, source = "player") {
  if (!alien || alien.dead) return;
  const { game, ui, materials, scene } = context;
  alien.dead = true;
  const now = performance.now();
  game.killStreak = now - game.lastKillTime < 2800 ? game.killStreak + 1 : 1;
  game.lastKillTime = now;
  const comboMultiplier = Math.min(10, 1 + Math.floor((game.killStreak - 1) / 2));
  game.comboMultiplier = comboMultiplier;
  game.adrenaline = Math.min(game.maxAdrenaline, (game.adrenaline || 0) + 4 + comboMultiplier * 1.5);
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
  updateMissionProgress(context, "kills", 1);
  updateMissionProgress(context, "combo", comboMultiplier);

  // Trigger Combat Achievements
  triggerAchievement(context, "first_blood");
  if (game.kills >= 50) triggerAchievement(context, "swarm_slayer");
  if (alien.variant === "boss") triggerAchievement(context, "titan_vanquished");
  if (game.activeWeapon === "sniper") triggerAchievement(context, "deadshot");
  if (game.activeWeapon === "flamethrower" || alien.burningTimer > 0) triggerAchievement(context, "pyro_master");
  if (comboMultiplier >= 5) triggerAchievement(context, "combo_king");

  if (game.napalmBlastActive) {
    triggerNapalmExplosion(context, alien.position);
  }

  if (comboMultiplier > 1) {
    ui.message.textContent = `Combo x${comboMultiplier}! Adrenaline +${Math.round(4 + comboMultiplier * 1.5)}%`;
  }

  const dropRoll = Math.random();
  if (dropRoll < 0.16) {
    createHealthPack(context, alien.position.clone());
  } else if (dropRoll < 0.34) {
    createAmmoPack(context, alien.position.clone());
  }

  createAlienExplosion(scene, alien, materials.alien, game.effectsScale);
  playSpatialSound("alien_death", alien.position, context.camera);
  playSpatialSound("alien_splatter", alien.position, context.camera);
  if (alien.variant === "boss") stopBossMusic();

  // Phase 1: Bio-Gibs & Decapitation Chunks
  const impactDir = context.camera?.getForwardRay ? context.camera.getForwardRay(1).direction : null;
  createAlienGibs(scene, alien.position, alien.variant, impactDir, game.effectsScale || 1);

  // Phase 1: Persistent Ground Acid Splatter Decals
  const decalRadius = alien.variant === "boss" ? 4.6 : alien.variant === "brute" ? 3.4 : 2.2;
  createGroundAcidDecal(scene, alien.position, alien.variant, decalRadius);

  // Phase 1: Visor Acid Splatter on Close-Quarters Kills (< 5.5m)
  if (context.camera && BABYLON.Vector3.Distance(context.camera.position, alien.position) < 5.5) {
    triggerVisorAcidSplatter(ui, alien.variant);
    playSound("acid_sizzle");
  }

  removeAlienFromShadowMap(context, alien);
  disposeAlienTapetumEyes(alien);

  game.aliens = game.aliens.filter(a => a !== alien);
  setAlienHealthBarVisible(alien, false);
  alien.getChildMeshes().forEach(m => m.isPickable = false);

  const model = alien.modelRoot;
  if (model) {
    const startTime = performance.now();
    const animObserver = scene.onBeforeRenderObservable.add(() => {
      const elapsed = performance.now() - startTime;
      if (elapsed > 400 || alien.isDisposed()) {
        scene.onBeforeRenderObservable.remove(animObserver);
        alien.getChildMeshes().forEach(m => m.dispose());
        alien.dispose();
        return;
      }
      if (alien.variant === "wasp" || alien.isFlying) {
        model.rotation.y += 0.28;
        model.rotation.z += 0.2;
        alien.position.y = Math.max(0.1, alien.position.y - 0.12);
      } else if (alien.variant === "boss" || alien.variant === "brute") {
        model.rotation.x = (model.rotation.x || 0) + 0.08;
        alien.position.y = Math.max(0.1, alien.position.y - 0.02);
      } else {
        model.rotation.z = (model.rotation.z || 0) + 0.14;
      }
    });
  } else {
    alien.getChildMeshes().forEach(m => m.dispose());
    alien.dispose();
  }

  if (game.aliens.length === 0 && game.started && !game.gameOver) {
    setMusicState("ambient");
    playSound("wave_clear");
    broadcastRadioComms("Sector secured. Good shooting, Defender. Repairing shields.");
    updateMissionProgress(context, "waves", 1);

    if (game.baseHealth >= game.maxBaseHealth) {
      triggerAchievement(context, "iron_core");
    }

    const clearedByDefense = game.waveDefenseKills > 0 && source === "defense";
    const waveClearMessage = clearedByDefense
      ? `Wave secured! Your towers finished the last alien. You killed ${game.wavePlayerKills}; defenses killed ${game.waveDefenseKills}.`
      : `Wave cleared! You eliminated all aliens. Rifle kills this wave: ${game.wavePlayerKills}.`;

    if (game.isEndless) {
      game.endlessHighScore = Math.max(game.endlessHighScore || 0, game.wave);
      game.wave++;
      game.waveStarting = true;
      game.health = Math.min(100, game.health + 15);
      game.baseHealth = Math.min(game.maxBaseHealth, game.baseHealth + 12 + (game.shieldRegenBonus || 0));
      game.ammo = game.maxAmmo;
      ui.message.textContent = `ENDLESS WAVE ${game.wave - 1} CLEARED! High Score: Wave ${game.endlessHighScore}`;
      showRewardChoices(context);
    } else {
      const isStageFinalWave = (game.wave % 3 === 0);
      game.wave++;
      game.waveStarting = true;
      game.health = Math.min(100, game.health + 15);
      game.baseHealth = Math.min(game.maxBaseHealth, game.baseHealth + 12 + (game.shieldRegenBonus || 0));
      game.ammo = game.maxAmmo;
      ui.message.textContent = `${waveClearMessage} Base shield regenerated.`;
      if (isStageFinalWave) {
        showStageClearModal(context);
      } else {
        showRewardChoices(context);
      }
    }
  }

  updateUI(ui, game);
}

export function damagePlayer(context, amount, attackerPos = null) {
  const { camera, game, ui } = context;
  if (!game.started || game.gameOver || game.paused) return;
  if (performance.now() < game.playerInvincibleUntil) return;

  game.health = Math.max(0, game.health - amount);
  triggerHaptic("medium");
  addCameraTrauma(0.28);
  if (attackerPos && camera) {
    showDamageIndicator(attackerPos, camera);
  }
  ui.damageFlash.style.background = "rgba(255, 0, 0, 0.28)";
  setTimeout(() => ui.damageFlash.style.background = "rgba(255, 0, 0, 0)", 120);
  updateUI(ui, game);

  if (game.health <= 0) {
    triggerGameOver(context, "PLAYER ELIMINATED BY ALIEN SWARM");
  }
}

export function damageBase(context, amount) {
  const { game, ui } = context;
  if (!game.started || game.gameOver || game.paused) return;

  game.baseHealth = Math.max(0, game.baseHealth - amount);
  triggerHaptic("warning");
  addCameraTrauma(0.20);
  ui.message.textContent = "Base shield damaged! Keep aliens outside the red zone!";
  pulseBaseDamage(context);
  playSound("base_damage");
  if (game.baseHealth <= 35 && game.baseHealth > 0) {
    broadcastRadioComms("Emergency! Fusion core is critical! Clear the perimeter!", true);
  }
  updateUI(ui, game);

  if (game.baseHealth <= 0) {
    triggerGameOver(context, "DEFENSE FUSION CORE DESTROYED");
  }
}

function triggerGameOver(context, subtitle) {
  const { game, ui } = context;
  if (game.gameOver) return;
  game.gameOver = true;

  setMusicState("off");
  stopBossMusic();
  playSound("game_over");
  triggerHaptic("heavy");
  updateBestScore(game);
  updateUI(ui, game);

  try {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  } catch (e) {
    console.warn("exitPointerLock error", e);
  }

  // Tactical Voice-Over Announcer on Game Over / Defeat
  broadcastRadioComms("Game over! You lose! Defense perimeter breached! Press R or click Retry to try again!", true);

  showDefeatOptions(context, subtitle);
}

function showDefeatOptions(context, subtitle) {
  const { game, ui } = context;
  const canContinue = isRewardedContinueAvailable() && !game.continueUsed;
  game.continueInProgress = false;

  document.body.classList.add("is-game-over");
  document.body.classList.toggle("is-defeat-active", canContinue);

  if (ui.defeatOverlay) {
    if (ui.defeatSubtitle) ui.defeatSubtitle.textContent = subtitle || "DEFENSE PERIMETER BREACHED — YOU LOSE";
    if (ui.defeatWave) ui.defeatWave.textContent = game.wave;
    if (ui.defeatKills) ui.defeatKills.textContent = game.kills || game.playerKills || 0;
    if (ui.defeatScore) ui.defeatScore.textContent = game.score;
    if (ui.defeatBest) ui.defeatBest.textContent = game.bestScore;

    if (ui.defeatRestartBtn) {
      ui.defeatRestartBtn.textContent = "RETRY MISSION [PRESS R / ENTER]";
    }

    if (ui.defeatContinueBtn) {
      ui.defeatContinueBtn.style.display = canContinue ? "block" : "none";
      ui.defeatContinueBtn.disabled = false;
      ui.defeatContinueBtn.textContent = "WATCH AD TO CONTINUE";
    }

    ui.defeatOverlay.style.display = "flex";
  }

  if (ui.message) {
    ui.message.textContent = "GAME OVER — YOU LOSE! Press R or Click to Retry";
    ui.message.style.background = "rgba(180, 20, 20, 0.95)";
    ui.message.style.borderColor = "#ff3838";
    ui.message.style.color = "#ffffff";
    ui.message.style.boxShadow = "0 0 36px rgba(255, 50, 50, 0.9)";
  }

  if (!canContinue && !game.noAds) {
    setTimeout(() => {
      showInterstitialAtBreakIfAvailable("game-over", game.wave).catch(() => {});
    }, 400);
  }
}

function triggerNapalmExplosion(context, position) {
  const { scene, game } = context;
  createAlienExplosion(scene, { position }, context.materials.alien, 1.4);
  for (const nearby of game.aliens) {
    if (nearby && !nearby.dead && BABYLON.Vector3.Distance(nearby.position, position) < 7.5) {
      damageAlien(context, nearby, 1.4 + game.playerDamageBonus * 0.4, "player");
    }
  }
}

export function fireAlienProjectile(context, alien, projType = "grunt", customOffset = null) {
  const { scene, camera, game } = context;
  if (!alien || alien.dead || game.gameOver) return;

  alien.attackAnimTimer = 1.0;
  alien.attackAnimType = projType;

  const yOffset = alien.variant === "boss" ? 5.8 : alien.variant === "brute" ? 3.8 : alien.variant === "wasp" ? 0.6 : 2.6;
  const origin = alien.position.add(new BABYLON.Vector3(0, yOffset, 0));

  let diameter = 0.58;
  let color = new BABYLON.Color3(0.2, 1, 0.25); // grunt neon green
  let damage = 8;
  let speed = 0.44;

  if (projType === "spitter") {
    diameter = 0.74;
    color = new BABYLON.Color3(0.85, 0.25, 1); // spitter violet acid
    damage = 14;
    speed = 0.36;
  } else if (projType === "wasp") {
    diameter = 0.58;
    color = new BABYLON.Color3(1, 0.82, 0.12); // wasp amber stinger
    damage = 10;
    speed = 0.52;
  } else if (projType === "brute") {
    diameter = 0.95;
    color = new BABYLON.Color3(1, 0.45, 0.05); // brute molten orange
    damage = 20;
    speed = 0.32;
  } else if (projType === "boss") {
    diameter = 1.25;
    color = new BABYLON.Color3(1, 0.08, 0.15); // boss crimson red
    damage = 16;
    speed = 0.46;
  }

  const projMesh = BABYLON.MeshBuilder.CreateSphere(`AlienProj_${Math.random()}`, { diameter }, scene);
  projMesh.position = origin.clone();

  const mat = getProjectileMaterial(scene, projType, color);
  projMesh.material = mat;

  // Aim primarily at player, occasionally at base
  const aimAtBase = Math.random() < 0.25;
  const targetPos = aimAtBase ? new BABYLON.Vector3(0, 1.8, 0) : camera.position.clone();
  targetPos.y += (Math.random() - 0.5) * 0.35;

  let dir = targetPos.subtract(origin).normalize();
  if (customOffset) {
    const cross = BABYLON.Vector3.Cross(dir, BABYLON.Vector3.Up()).normalize();
    dir = dir.add(cross.scale(customOffset)).normalize();
  }

  const projData = {
    mesh: projMesh,
    material: mat,
    direction: dir,
    speed,
    damage,
    projType,
    createdTime: performance.now(),
    maxLife: 4500
  };

  projMesh.metadata = {
    isAlienProjectile: true,
    projectileData: projData
  };
  projMesh.isPickable = true;

  if (!game.alienProjectiles) game.alienProjectiles = [];
  game.alienProjectiles.push(projData);
  playSound("alien_shoot");
}

const projMaterialCache = new Map();
function getProjectileMaterial(scene, projType, color) {
  let mat = projMaterialCache.get(projType);
  if (!mat || mat.isDisposed()) {
    mat = new BABYLON.StandardMaterial(`SharedAlienProjMat_${projType}`, scene);
    mat.diffuseColor = color;
    mat.emissiveColor = color.scale(1.4);
    mat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    projMaterialCache.set(projType, mat);
  }
  return mat;
}

export function updateAlienProjectiles(context, delta) {
  const { scene, camera, game } = context;
  if (!game.alienProjectiles || game.alienProjectiles.length === 0) return;

  const now = performance.now();
  const remaining = [];

  for (const proj of game.alienProjectiles) {
    if (!proj.mesh || proj.mesh.isDisposed()) continue;

    if (now - proj.createdTime > proj.maxLife || proj.mesh.position.y < 0.1) {
      createImpactEffect(scene, proj.mesh.position, false, (game.effectsScale || 1) * 0.8);
      createGroundAcidDecal(scene, proj.mesh.position, proj.projType, 1.4);
      proj.mesh.dispose();
      continue;
    }

    const step = proj.speed * (delta / 16.67);
    proj.mesh.position.addInPlace(proj.direction.scale(step));

    const distToPlayer = BABYLON.Vector3.Distance(proj.mesh.position, camera.position);
    if (distToPlayer < 1.4) {
      createImpactEffect(scene, proj.mesh.position, true, (game.effectsScale || 1) * 1.2);
      triggerVisorAcidSplatter(context.ui, proj.projType);
      playSound("acid_sizzle");
      damagePlayer(context, proj.damage, proj.mesh.position);
      proj.mesh.dispose();
      continue;
    }

    const distToBase = Math.sqrt(proj.mesh.position.x * proj.mesh.position.x + proj.mesh.position.z * proj.mesh.position.z);
    if (distToBase < (game.baseRadius || 8) && proj.mesh.position.y < 4.0) {
      createImpactEffect(scene, proj.mesh.position, true, (game.effectsScale || 1) * 1.2);
      damageBase(context, Math.max(1, Math.round(proj.damage * 0.7)));
      proj.mesh.dispose();
      continue;
    }

    remaining.push(proj);
  }

  game.alienProjectiles = remaining;
}

export function updateAliens(context) {
  const { engine, camera, game } = context;
  if (!game.started || game.paused || game.gameOver) return;
  const delta = engine.getDeltaTime();

  updateAlienProjectiles(context, delta);
  updateTapetumLucidumGlow(context);

  for (const alien of [...game.aliens]) {
    if (!alien || alien.dead) continue;

    if (alien.slowTimer > 0) {
      alien.slowTimer -= delta;
      if (alien.slowTimer <= 0) alien.slowMultiplier = 1;
    }
    const activeSlow = alien.slowMultiplier || (performance.now() < (alien.slowUntil || 0) ? 0.45 : 1);

    // Burning Damage Over Time (Flamethrower)
    if (alien.burningTimer > 0) {
      alien.burningTimer -= delta;
      alien.burningTick = (alien.burningTick || 0) + delta;
      if (alien.burningTick >= 350) {
        alien.burningTick = 0;
        damageAlien(context, alien, alien.burningDamage || 0.45, "player");
        createImpactEffect(context.scene, alien.position.add(new BABYLON.Vector3(0, 1.2, 0)), false, 0.6);
      }
    }

    const direction = camera.position.subtract(alien.position);
    direction.y = 0;
    const distanceToPlayer = direction.length();
    const distanceFromCenter = Math.sqrt(alien.position.x * alien.position.x + alien.position.z * alien.position.z);

    let isMoving = false;
    // Guaranteed inward march if alien is outside combat perimeter zone (> 20m)
    if (distanceFromCenter > 20) {
      const toCenter = new BABYLON.Vector3(-alien.position.x, 0, -alien.position.z).normalize();
      alien.position.addInPlace(toCenter.scale(alien.speed * activeSlow * (delta / 16.67)));
      alien.lookAt(new BABYLON.Vector3(0, alien.position.y, 0));
      isMoving = true;
    } else if (alien.variant === "wasp" || alien.isFlying) {
      alien.flightPhase = (alien.flightPhase || Math.random() * 10) + delta * 0.005;
      const targetHoverY = 3.0 + Math.sin(alien.flightPhase) * 0.55;
      alien.position.y += (targetHoverY - alien.position.y) * 0.08;

      const toPlayer = camera.position.subtract(alien.position);
      const dist3D = toPlayer.length();
      toPlayer.normalize();

      alien.lookAt(new BABYLON.Vector3(camera.position.x, alien.position.y, camera.position.z));

      // Phase 3: Coordinated Swooping Dive-Bomb AI
      alien.diveBombCooldown = (alien.diveBombCooldown || (4200 + Math.random() * 3200)) - delta;
      if (alien.diveBombCooldown <= 0 && dist3D > 6 && dist3D < 19) {
        alien.isDiving = true;
        alien.diveTimer = 1100;
        alien.diveBombCooldown = 6500 + Math.random() * 3000;
      }

      if (alien.isDiving && alien.diveTimer > 0) {
        alien.diveTimer -= delta;
        const diveSpeed = alien.speed * 1.8 * activeSlow * (delta / 16.67);
        alien.position.addInPlace(toPlayer.scale(diveSpeed));
        alien.position.y = Math.max(1.3, alien.position.y - delta * 0.0035);
        isMoving = true;
        if (alien.diveTimer <= 0) alien.isDiving = false;
      } else if (dist3D > 8) {
        alien.position.addInPlace(toPlayer.scale(alien.speed * activeSlow * (delta / 16.67)));
        isMoving = true;
      } else {
        const strafe = new BABYLON.Vector3(-toPlayer.z, 0, toPlayer.x).scale(0.42);
        alien.position.addInPlace(strafe.scale(alien.speed * activeSlow * (delta / 16.67)));
        isMoving = true;

        alien.waspShootCooldown = (alien.waspShootCooldown || (1800 + Math.random() * 1000)) - delta;
        if (alien.waspShootCooldown <= 0) {
          alien.waspShootCooldown = 2200 + Math.random() * 800;
          fireAlienProjectile(context, alien, "wasp");
        }
      }

      if (dist3D < 2.5) {
        alien.attackCooldown -= delta;
        if (alien.attackCooldown <= 0) {
          alien.attackCooldown = 850;
          damagePlayer(context, alien.damage, alien.position);
        }
      }
    } else if (alien.variant === "spitter") {
      if (distanceToPlayer > 11 || distanceFromCenter > 17) {
        direction.normalize();
        const lateral = new BABYLON.Vector3(-direction.z, 0, direction.x).scale(Math.sin((alien.animWalkPhase || 0) * 1.2) * 0.28);
        const moveDir = direction.add(lateral).normalize();
        alien.position.addInPlace(moveDir.scale(alien.speed * activeSlow * (delta / 16.67)));
        alien.lookAt(camera.position);
        isMoving = true;
      } else {
        alien.lookAt(camera.position);
        isMoving = false;
        alien.spitterCooldown = (alien.spitterCooldown || 2200) - delta;
        if (alien.spitterCooldown <= 0) {
          alien.spitterCooldown = 2400;
          fireAlienProjectile(context, alien, "spitter");
          if (Math.random() < 0.35) {
            setTimeout(() => {
              if (alien && !alien.dead && !game.gameOver) {
                fireAlienProjectile(context, alien, "spitter", (Math.random() - 0.5) * 0.25);
              }
            }, 260);
          }
        }
      }
    } else if (alien.variant === "runner") {
      if (distanceToPlayer > 1.8) {
        direction.normalize();
        const tangent = new BABYLON.Vector3(-direction.z, 0, direction.x).scale(0.35);
        const flankDir = direction.add(tangent).normalize();
        alien.position.addInPlace(flankDir.scale(alien.speed * activeSlow * (delta / 16.67)));
        alien.lookAt(camera.position);
        isMoving = true;
      } else {
        alien.lookAt(camera.position);
        isMoving = false;
        alien.attackCooldown -= delta;
        if (alien.attackCooldown <= 0) {
          alien.attackCooldown = 750;
          damagePlayer(context, alien.damage, alien.position);
        }
      }
    } else if (alien.variant === "boss") {
      // Phase 3: Boss Stomp Ground Shockwaves
      alien.bossStompCooldown = (alien.bossStompCooldown || 6500) - delta;
      if (distanceToPlayer < 14 && alien.bossStompCooldown <= 0) {
        alien.bossStompCooldown = alien.phase2Enraged ? 4800 : 7200;
        alien.attackAnimTimer = 1.0;
        triggerBossShockwave(context, alien.position);
      }

      if (distanceToPlayer > 8) {
        direction.normalize();
        alien.position.addInPlace(direction.scale(alien.speed * activeSlow * (delta / 16.67)));
        alien.lookAt(camera.position);
        isMoving = true;

        alien.bossShootCooldown = (alien.bossShootCooldown || 3200) - delta;
        if (alien.bossShootCooldown <= 0) {
          alien.bossShootCooldown = alien.phase2Enraged ? 2100 : 3400;
          if (alien.phase2Enraged) {
            // 5-way spread barrage
            fireAlienProjectile(context, alien, "boss", -0.42);
            fireAlienProjectile(context, alien, "boss", -0.21);
            fireAlienProjectile(context, alien, "boss", 0);
            fireAlienProjectile(context, alien, "boss", 0.21);
            fireAlienProjectile(context, alien, "boss", 0.42);
          } else {
            // 3-way spread barrage
            fireAlienProjectile(context, alien, "boss", -0.28);
            fireAlienProjectile(context, alien, "boss", 0);
            fireAlienProjectile(context, alien, "boss", 0.28);
          }
        }
      } else {
        alien.lookAt(camera.position);
        isMoving = false;
        alien.attackCooldown -= delta;
        if (alien.attackCooldown <= 0) {
          alien.attackCooldown = alien.phase2Enraged ? 700 : 1100;
          damagePlayer(context, alien.damage * (alien.phase2Enraged ? 1.3 : 1.0), alien.position);
        }
      }
    } else if (alien.variant === "brute") {
      if (distanceToPlayer > 2.2) {
        direction.normalize();
        alien.position.addInPlace(direction.scale(alien.speed * activeSlow * (delta / 16.67)));
        alien.lookAt(camera.position);
        isMoving = true;

        // Brute fires heavy bio-rocket occasionally at mid range
        if (distanceToPlayer > 8 && distanceToPlayer < 24) {
          alien.bruteShootCooldown = (alien.bruteShootCooldown || 4200) - delta;
          if (alien.bruteShootCooldown <= 0) {
            alien.bruteShootCooldown = 4800;
            fireAlienProjectile(context, alien, "brute");
          }
        }
      } else {
        alien.lookAt(camera.position);
        isMoving = false;
        alien.attackCooldown -= delta;
        if (alien.attackCooldown <= 0) {
          alien.attackCooldown = 1100;
          damagePlayer(context, alien.damage, alien.position);
        }
      }
    } else {
      // Grunt
      if (distanceToPlayer > 1.8) {
        direction.normalize();
        alien.position.addInPlace(direction.scale(alien.speed * activeSlow * (delta / 16.67)));
        alien.lookAt(camera.position);
        isMoving = true;

        // Grunts fire plasma bolts occasionally from medium range
        if (distanceToPlayer > 7 && distanceToPlayer < 22) {
          alien.gruntShootCooldown = (alien.gruntShootCooldown || (3200 + Math.random() * 2000)) - delta;
          if (alien.gruntShootCooldown <= 0) {
            alien.gruntShootCooldown = 3800 + Math.random() * 1800;
            fireAlienProjectile(context, alien, "grunt");
          }
        }
      } else {
        alien.lookAt(camera.position);
        isMoving = false;
        alien.attackCooldown -= delta;
        if (alien.attackCooldown <= 0) {
          alien.attackCooldown = 900;
          damagePlayer(context, alien.damage, alien.position);
        }
      }
    }

    alien.baseAttackCooldown -= delta;
    if (distanceFromCenter < game.baseRadius && alien.baseAttackCooldown <= 0) {
      alien.baseAttackCooldown = 1000;
      damageBase(context, alien.damage || 2);
    }

    updateAlienProceduralAnimation(alien, delta, isMoving);
  }
}

function updateAlienProceduralAnimation(alien, delta, isMoving) {
  const model = alien.modelRoot;
  if (!model || !alien.baseScale) return;

  const dtSec = delta / 1000;
  const time = performance.now() * 0.001;

  alien.animBreathPhase = (alien.animBreathPhase || 0) + dtSec * 2.2;
  if (isMoving) {
    const walkSpeedFactor = alien.variant === "wasp" ? 4.8 : alien.variant === "spitter" ? 6.4 : 4.2;
    alien.animWalkPhase = (alien.animWalkPhase || 0) + dtSec * walkSpeedFactor * (alien.speed || 1);
  }

  if (alien.flinchAmount > 0) {
    alien.flinchAmount = Math.max(0, alien.flinchAmount - dtSec * 7.5);
  }

  if (alien.attackAnimTimer > 0) {
    alien.attackAnimTimer = Math.max(0, alien.attackAnimTimer - dtSec * 3.2);
  }

  let posX = alien.basePosition.x;
  let posY = alien.basePosition.y;
  let posZ = alien.basePosition.z;

  let rotX = alien.baseRotation.x;
  let rotY = alien.baseRotation.y;
  let rotZ = alien.baseRotation.z;

  let scaleX = alien.baseScale.x;
  let scaleY = alien.baseScale.y;
  let scaleZ = alien.baseScale.z;

  const isBoss = alien.variant === "boss";

  if (alien.variant === "wasp" || alien.isFlying) {
    // 1. High-frequency 60Hz wing-beat micro-vibration
    const wingVibe = Math.sin(time * 38) * 0.055;
    rotZ += wingVibe;
    rotX += Math.cos(time * 34) * 0.035;

    // 2. Aerial hovering fluid bobbing
    const hoverBob = Math.sin(time * 4.2 + (alien.flightPhase || 0)) * 0.18;
    posY += hoverBob;

    if (isMoving) {
      rotX += 0.22;
      rotZ += Math.sin((alien.animWalkPhase || 0) * 0.7) * 0.16;
    }

    // 3. Attack thrust (stinger snap)
    if (alien.attackAnimTimer > 0) {
      const attackProgress = Math.sin(alien.attackAnimTimer * Math.PI);
      posZ += attackProgress * 0.35;
      rotX += attackProgress * 0.32;
    }
  } else if (alien.variant === "spitter") {
    if (isMoving) {
      // Serpentine stride: yaw undulation & lateral sway
      rotY += Math.sin(alien.animWalkPhase) * 0.15;
      rotZ += Math.cos(alien.animWalkPhase) * 0.08;
      // Rhythmic step heave
      const stepHeave = Math.sin(alien.animWalkPhase * 2) * 0.09;
      posY += Math.abs(stepHeave);
      rotX += stepHeave * 0.6;

      scaleZ *= 1.0 + Math.sin(alien.animWalkPhase * 2) * 0.05;
      scaleY *= 1.0 - Math.sin(alien.animWalkPhase * 2) * 0.04;
    } else {
      // Idle breathing
      const breath = Math.sin(alien.animBreathPhase * 1.8) * 0.04;
      scaleX *= 1.0 + breath;
      scaleY *= 1.0 - breath * 0.8;
      scaleZ *= 1.0 + breath * 0.5;
      rotY += Math.sin(alien.animBreathPhase * 0.9) * 0.06;
    }

    // Mortar launch recoil & lunging
    if (alien.attackAnimTimer > 0) {
      const attackProgress = Math.sin(alien.attackAnimTimer * Math.PI);
      rotX += attackProgress * -0.38;
      posZ += attackProgress * 0.25;
      posY += attackProgress * 0.18;
    }
  } else {
    // Goliath Heavy Titan & Boss
    if (isMoving) {
      const stompFactor = isBoss ? 1.4 : 1.0;
      const step = Math.abs(Math.sin(alien.animWalkPhase * 1.6));
      posY += step * 0.18 * stompFactor;
      rotZ += Math.sin(alien.animWalkPhase * 1.6) * 0.11 * stompFactor;
      rotX += (0.08 + Math.sin(alien.animWalkPhase * 3.2) * 0.05) * stompFactor;

      scaleY *= 1.0 - step * 0.06;
      scaleX *= 1.0 + step * 0.04;
    } else {
      // Idle heavy breathing
      const breath = Math.sin(alien.animBreathPhase * 1.2) * 0.05;
      scaleX *= 1.0 + breath;
      scaleZ *= 1.0 + breath * 0.8;
      scaleY *= 1.0 - breath * 0.4;
      rotX += Math.sin(alien.animBreathPhase * 0.6) * 0.03;
    }

    // Ground slam / barrage windup & slam
    if (alien.attackAnimTimer > 0) {
      const attackProgress = Math.sin(alien.attackAnimTimer * Math.PI);
      rotX += attackProgress * (alien.attackAnimTimer > 0.5 ? -0.35 : 0.38);
      posY += attackProgress * (alien.attackAnimTimer > 0.5 ? 0.35 : -0.15);
      scaleY *= 1.0 + attackProgress * 0.12;
    }
  }

  // Hit flinch recoil
  if (alien.flinchAmount > 0) {
    const flinch = alien.flinchAmount;
    rotX -= flinch * 0.22;
    rotZ += flinch * (alien.flinchDir || 0.15);
    posZ -= flinch * 0.18;
    scaleY *= 1.0 - flinch * 0.05;
  }

  model.position.x = posX;
  model.position.y = posY;
  model.position.z = posZ;

  model.rotation.x = rotX;
  model.rotation.y = rotY;
  model.rotation.z = rotZ;

  model.scaling.x = scaleX;
  model.scaling.y = scaleY;
  model.scaling.z = scaleZ;
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

const TAPETUM_CONFIGS = {
  spitter: {
    color: new BABYLON.Color3(1.0, 0.78, 0.12), // amber predatory flare
    spread: 0.32,
    height: 3.20,
    forward: 0.55,
    radius: 0.12
  },
  wasp: {
    color: new BABYLON.Color3(0.12, 0.90, 1.0), // electric sapphire cyan flare
    spread: 0.26,
    height: 1.10,
    forward: 0.48,
    radius: 0.10
  },
  brute: {
    color: new BABYLON.Color3(1.0, 0.16, 0.06), // demonic blood crimson
    spread: 0.55,
    height: 4.80,
    forward: 0.82,
    radius: 0.18
  },
  boss: {
    color: new BABYLON.Color3(1.0, 0.06, 0.02), // hellfire blazing red-orange
    spread: 0.80,
    height: 6.90,
    forward: 1.15,
    radius: 0.26
  },
  grunt: {
    color: new BABYLON.Color3(0.72, 1.0, 0.15), // toxic green-amber
    spread: 0.30,
    height: 2.85,
    forward: 0.50,
    radius: 0.11
  },
  runner: {
    color: new BABYLON.Color3(0.85, 0.25, 1.0), // violet-cyan
    spread: 0.25,
    height: 1.05,
    forward: 0.48,
    radius: 0.095
  }
};

function attachAlienTapetumEyes(scene, root, variant) {
  const cfg = TAPETUM_CONFIGS[variant.type] || TAPETUM_CONFIGS.grunt;

  const eyeL = BABYLON.MeshBuilder.CreateDisc(`AlienTapetumEyeL_${Math.random()}`, {
    radius: cfg.radius,
    tessellation: 16
  }, scene);

  const eyeR = BABYLON.MeshBuilder.CreateDisc(`AlienTapetumEyeR_${Math.random()}`, {
    radius: cfg.radius,
    tessellation: 16
  }, scene);

  eyeL.parent = root;
  eyeR.parent = root;

  eyeL.position = new BABYLON.Vector3(-cfg.spread, cfg.height, cfg.forward);
  eyeR.position = new BABYLON.Vector3(cfg.spread, cfg.height, cfg.forward);

  eyeL.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  eyeR.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

  eyeL.isPickable = false;
  eyeR.isPickable = false;
  eyeL.checkCollisions = false;
  eyeR.checkCollisions = false;
  eyeL.metadata = { isEyeGlow: true, alienRoot: root };
  eyeR.metadata = { isEyeGlow: true, alienRoot: root };

  const eyeMat = new BABYLON.StandardMaterial(`TapetumEyeMat_${variant.type}_${Math.random()}`, scene);
  eyeMat.diffuseColor = cfg.color;
  eyeMat.emissiveColor = cfg.color.scale(0.22);
  eyeMat.specularColor = new BABYLON.Color3(1, 1, 1);
  eyeMat.disableLighting = true;
  eyeMat.backFaceCulling = false;

  eyeL.material = eyeMat;
  eyeR.material = eyeMat;

  root.tapetumEyes = {
    left: eyeL,
    right: eyeR,
    material: eyeMat,
    baseColor: cfg.color,
    baseRadius: cfg.radius,
    baseHeight: cfg.height,
    baseForward: cfg.forward,
    baseSpread: cfg.spread,
    intensity: 0.22
  };
}

function disposeAlienTapetumEyes(alien) {
  if (!alien.tapetumEyes) return;
  try {
    if (alien.tapetumEyes.left) {
      try { alien.tapetumEyes.left.dispose(); } catch (e) {}
    }
    if (alien.tapetumEyes.right) {
      try { alien.tapetumEyes.right.dispose(); } catch (e) {}
    }
    if (alien.tapetumEyes.material) {
      try { alien.tapetumEyes.material.dispose(); } catch (e) {}
    }
  } catch (e) {
    console.warn("disposeAlienTapetumEyes error", e);
  }
  alien.tapetumEyes = null;
}

function addAlienToShadowMap(context, root) {
  if (!context?.shadowGenerator || !context.shadowGenerator.getShadowMap()) return;
  const renderList = context.shadowGenerator.getShadowMap().renderList;
  if (!renderList) return;
  root.getChildMeshes(false).forEach(mesh => {
    if (mesh.metadata?.isEyeGlow) return;
    if (mesh.name?.includes("AlienHealth")) return;
    renderList.push(mesh);
  });
}

function removeAlienFromShadowMap(context, root) {
  if (!context?.shadowGenerator || !context.shadowGenerator.getShadowMap()) return;
  const renderList = context.shadowGenerator.getShadowMap().renderList;
  if (!renderList || renderList.length === 0) return;
  const alienMeshes = new Set(root.getChildMeshes(false));
  context.shadowGenerator.getShadowMap().renderList = renderList.filter(mesh => !alienMeshes.has(mesh) && !mesh.isDisposed());
}

function updateTapetumLucidumGlow(context) {
  const { camera, game } = context;
  if (!game.aliens || game.aliens.length === 0) return;

  const flashlightActive = Boolean(game.flashlightOn && context.flashlight && context.flashlight.isEnabled());
  const camForward = camera.getForwardRay ? camera.getForwardRay(1).direction : camera.cameraDirection;

  for (const alien of game.aliens) {
    if (!alien || alien.dead || !alien.tapetumEyes) continue;
    const eyes = alien.tapetumEyes;

    if (alien.modelRoot && alien.basePosition) {
      const dY = alien.modelRoot.position.y - alien.basePosition.y;
      eyes.left.position.y = eyes.baseHeight + dY;
      eyes.right.position.y = eyes.baseHeight + dY;
    }

    if (!flashlightActive) {
      if (eyes.intensity !== 0.22) {
        eyes.intensity = 0.22;
        eyes.material.emissiveColor = eyes.baseColor.scale(0.22);
        eyes.left.scaling.set(1.0, 1.0, 1.0);
        eyes.right.scaling.set(1.0, 1.0, 1.0);
      }
      continue;
    }

    const eyeWorldPos = alien.position.add(new BABYLON.Vector3(0, eyes.baseHeight, 0));
    const toAlien = eyeWorldPos.subtract(camera.position);
    const dist = toAlien.length();

    if (dist > 48) {
      if (eyes.intensity !== 0.22) {
        eyes.intensity = 0.22;
        eyes.material.emissiveColor = eyes.baseColor.scale(0.22);
        eyes.left.scaling.set(1.0, 1.0, 1.0);
        eyes.right.scaling.set(1.0, 1.0, 1.0);
      }
      continue;
    }

    const dirToAlien = toAlien.normalize();
    const spotDot = BABYLON.Vector3.Dot(camForward, dirToAlien);

    if (spotDot < 0.84) {
      if (eyes.intensity !== 0.22) {
        eyes.intensity = 0.22;
        eyes.material.emissiveColor = eyes.baseColor.scale(0.22);
        eyes.left.scaling.set(1.0, 1.0, 1.0);
        eyes.right.scaling.set(1.0, 1.0, 1.0);
      }
      continue;
    }

    const coneFactor = Math.min(1.0, (spotDot - 0.84) / 0.15);
    const distFactor = Math.max(0.15, 1.0 - (dist / 48));
    const retroFactor = coneFactor * distFactor;

    const flareIntensity = 0.25 + retroFactor * 4.2;
    const flareScale = 1.0 + retroFactor * 2.4;

    eyes.intensity = flareIntensity;
    eyes.left.scaling.set(flareScale, flareScale, flareScale);
    eyes.right.scaling.set(flareScale, flareScale, flareScale);

    const glint = Math.max(0, (retroFactor - 0.55) * 2.2);
    eyes.material.emissiveColor = eyes.baseColor.scale(flareIntensity).add(new BABYLON.Color3(glint, glint, glint));
  }
}

function triggerBossShockwave(context, bossPosition) {
  const { scene, camera } = context;
  if (!scene || !bossPosition) return;

  playSpatialSound("boss_stomp", bossPosition, camera, 1.5);
  if (camera) applyCameraShake(camera, 0.038);

  const ring = BABYLON.MeshBuilder.CreateTorus(`BossShockwave_${Math.random()}`, {
    diameter: 1.0,
    thickness: 0.24,
    tessellation: 48
  }, scene);
  ring.position = bossPosition.clone();
  ring.position.y = 0.14;
  ring.isPickable = false;

  const mat = new BABYLON.StandardMaterial(`BossShockwaveMat_${Math.random()}`, scene);
  mat.diffuseColor = new BABYLON.Color3(1, 0.1, 0.05);
  mat.emissiveColor = new BABYLON.Color3(1, 0.25, 0.08);
  mat.alpha = 0.85;
  mat.disableLighting = true;
  ring.material = mat;

  const startTime = performance.now();
  const maxRadius = 18.0;
  const speed = 14.0;
  let hitPlayer = false;

  const obs = scene.onBeforeRenderObservable.add(() => {
    const elapsed = (performance.now() - startTime) / 1000;
    const currentRadius = elapsed * speed;
    ring.scaling.set(currentRadius, 1, currentRadius);
    mat.alpha = Math.max(0, 0.85 * (1 - currentRadius / maxRadius));

    if (!hitPlayer && camera) {
      const dist = BABYLON.Vector3.Distance(
        new BABYLON.Vector3(camera.position.x, 0, camera.position.z),
        new BABYLON.Vector3(bossPosition.x, 0, bossPosition.z)
      );
      if (Math.abs(dist - currentRadius) < 1.4) {
        hitPlayer = true;
        // Jump evasion: if player is airborne (height > 2.0m), they leap over the ground shockwave!
        const isAirborne = camera.position.y > 2.0;
        if (!isAirborne) {
          applyCameraShake(camera, 0.045);
          damagePlayer(context, 18, bossPosition);
          playSound("base_damage");
          const knockDir = camera.position.subtract(bossPosition).normalize();
          camera.cameraDirection.addInPlace(knockDir.scale(0.38));
          if (context.ui?.message) {
            context.ui.message.textContent = "SEISMIC STOMP HIT! (TIP: JUMP WITH SPACE TO EVADE)";
          }
        }
      }
    }

    if (currentRadius >= maxRadius) {
      scene.onBeforeRenderObservable.remove(obs);
      ring.dispose();
      mat.dispose();
    }
  });
}

function spawnBossEggPods(context, bossAlien) {
  const offsets = [
    new BABYLON.Vector3(-6.5, 0, 2.5),
    new BABYLON.Vector3(6.5, 0, -2.5)
  ];

  offsets.forEach(offset => {
    const podPos = bossAlien.position.add(offset);
    podPos.y = 0;
    createEggPod(context, podPos);
  });
}

function createEggPod(context, position) {
  const { scene, game, camera } = context;
  const podMesh = BABYLON.MeshBuilder.CreateSphere(`EggPod_${Math.random()}`, {
    diameterX: 1.6,
    diameterY: 2.2,
    diameterZ: 1.6,
    segments: 16
  }, scene);
  podMesh.position.copyFrom(position);
  podMesh.position.y = 1.1;

  const podMat = new BABYLON.StandardMaterial(`EggPodMat_${Math.random()}`, scene);
  podMat.diffuseColor = new BABYLON.Color3(0.15, 0.5, 0.1);
  podMat.emissiveColor = new BABYLON.Color3(0.2, 0.85, 0.25);
  podMat.specularPower = 32;
  podMesh.material = podMat;

  const pod = podMesh;
  pod.variant = "pod";
  pod.maxHealth = 4.0;
  pod.health = 4.0;
  pod.gestationTimer = 6500;
  pod.damage = 0;
  pod.score = 150;
  pod.speed = 0;
  pod.dead = false;

  podMesh.metadata = { alienRoot: pod };
  createAlienHealthBar(scene, pod, 2.3);

  const obs = scene.onBeforeRenderObservable.add(() => {
    if (pod.dead || pod.isDisposed()) {
      scene.onBeforeRenderObservable.remove(obs);
      return;
    }
    const delta = context.engine.getDeltaTime();
    pod.gestationTimer -= delta;

    const urgency = 1.0 + (1 - Math.max(0, pod.gestationTimer / 6500)) * 2.5;
    const pulse = 1.0 + Math.sin(performance.now() * 0.008 * urgency) * 0.12;
    podMesh.scaling.set(pulse, 1.0 / pulse, pulse);

    if (pod.gestationTimer <= 0) {
      scene.onBeforeRenderObservable.remove(obs);
      hatchEggPod(context, pod);
    }
  });

  game.aliens.push(pod);
}

function hatchEggPod(context, pod) {
  if (pod.dead || pod.isDisposed()) return;
  const { game, scene } = context;
  pod.dead = true;

  playSpatialSound("egg_pod_hatch", pod.position, context.camera, 1.3);
  createAlienExplosion(scene, pod.position, new BABYLON.Color3(0.2, 0.9, 0.3));

  for (let i = 0; i < 2; i++) {
    const offset = new BABYLON.Vector3(i === 0 ? -1.5 : 1.5, 0, (Math.random() - 0.5) * 1.5);
    createAlien(context, pod.position.add(offset), getWaveDifficulty(game), ALIEN_VARIANT_BY_TYPE.runner);
  }

  game.aliens = game.aliens.filter(a => a !== pod);
  pod.getChildMeshes().forEach(m => m.dispose());
  pod.dispose();
}
