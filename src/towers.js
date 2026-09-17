import * as BABYLON from "@babylonjs/core";
import { createImpactEffect, createTracer } from "./effects.js";
import { damageAlien } from "./aliens.js";
import { cloneLoadedAsset, fitModelToHeight } from "./assets.js";
import { playSound, playSpatialSound, broadcastRadioComms } from "./sound.js";
import { triggerHaptic } from "./haptics.js";
import { updateMissionProgress } from "./retention.js";

export const DEFENSE_PADS = [
  { id: "pad_0", label: "NORTH SECTOR", position: new BABYLON.Vector3(0, 0, 10.5) },
  { id: "pad_1", label: "NORTHEAST SECTOR", position: new BABYLON.Vector3(7.4, 0, 7.4) },
  { id: "pad_2", label: "EAST SECTOR", position: new BABYLON.Vector3(10.5, 0, 0) },
  { id: "pad_3", label: "SOUTH SECTOR", position: new BABYLON.Vector3(0, 0, -10.5) },
  { id: "pad_4", label: "SOUTHWEST SECTOR", position: new BABYLON.Vector3(-7.4, 0, -7.4) },
  { id: "pad_5", label: "WEST SECTOR", position: new BABYLON.Vector3(-10.5, 0, 0) }
];

export const TURRET_CONFIGS = {
  gatling: {
    name: "Heavy Gatling Sentry",
    cost: 50,
    upgradeCostT2: 75,
    upgradeCostT3: 140,
    range: 16.5,
    cooldown: 380,
    damage: 0.46,
    color: new BABYLON.Color3(1.0, 0.2, 0.15),
    laserColor: new BABYLON.Color3(1.0, 0.1, 0.1),
    assetKey: "turretGatlingHeavy"
  },
  cryo: {
    name: "Cryo Freeze Sentry",
    cost: 70,
    upgradeCostT2: 85,
    upgradeCostT3: 150,
    range: 14.5,
    cooldown: 250,
    damage: 0.32,
    color: new BABYLON.Color3(0.1, 0.85, 1.0),
    laserColor: new BABYLON.Color3(0.0, 0.95, 1.0),
    assetKey: "turretCryoBeam"
  },
  mortar: {
    name: "Plasma Mortar Sentry",
    cost: 95,
    upgradeCostT2: 100,
    upgradeCostT3: 175,
    range: 22.0,
    cooldown: 1500,
    damage: 1.85,
    color: new BABYLON.Color3(1.0, 0.75, 0.1),
    laserColor: new BABYLON.Color3(1.0, 0.6, 0.05),
    assetKey: "turretGatlingHeavy"
  }
};

let defensePadMeshes = [];

export function createStarterTowers(context) {
  clearTowers(context);
  createDefensePads(context);
  // Deploy starter turrets at North (Gatling) and South (Cryo)
  deployTurretOnPad(context, "pad_0", "gatling", true);
  deployTurretOnPad(context, "pad_3", "cryo", true);
}

export function clearTowers(context) {
  const { game } = context;
  if (game?.towers) {
    game.towers.forEach(tower => {
      tower.meshes?.forEach(mesh => mesh.dispose());
      tower.model?.dispose();
      tower.overdriveAura?.dispose();
      tower.laserLine?.dispose();
    });
    game.towers = [];
  }

  defensePadMeshes.forEach(item => {
    item.padMesh?.dispose();
    item.ringMesh?.dispose();
  });
  defensePadMeshes = [];
}

export function createDefensePads(context) {
  const { scene } = context;

  const padMat = new BABYLON.StandardMaterial("DefensePadMat", scene);
  padMat.diffuseColor = new BABYLON.Color3(0.08, 0.12, 0.16);
  padMat.emissiveColor = new BABYLON.Color3(0.03, 0.07, 0.10);
  padMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

  const ringMat = new BABYLON.StandardMaterial("DefensePadRingMat", scene);
  ringMat.diffuseColor = new BABYLON.Color3(0.0, 0.9, 0.5);
  ringMat.emissiveColor = new BABYLON.Color3(0.0, 0.75, 0.42);
  ringMat.alpha = 0.65;

  DEFENSE_PADS.forEach(pad => {
    const padMesh = BABYLON.MeshBuilder.CreateCylinder(`DefensePad_${pad.id}`, {
      diameter: 2.4,
      height: 0.10,
      tessellation: 8
    }, scene);
    padMesh.position = pad.position.add(new BABYLON.Vector3(0, 0.05, 0));
    padMesh.material = padMat;
    padMesh.receiveShadows = true;

    const ringMesh = BABYLON.MeshBuilder.CreateTorus(`DefensePadRing_${pad.id}`, {
      diameter: 2.6,
      thickness: 0.045,
      tessellation: 32
    }, scene);
    ringMesh.position = pad.position.add(new BABYLON.Vector3(0, 0.08, 0));
    ringMesh.material = ringMat;
    ringMesh.isPickable = false;

    defensePadMeshes.push({
      pad,
      padMesh,
      ringMesh,
      ringMat
    });
  });
}

export function deployTurretOnPad(context, padId, type = "gatling", free = false) {
  const { scene, game, materials } = context;
  const cfg = TURRET_CONFIGS[type] || TURRET_CONFIGS.gatling;
  const pad = DEFENSE_PADS.find(p => p.id === padId);
  if (!pad) return false;

  const existing = game.towers.find(t => t.padId === padId);
  if (existing) return false;

  if (!free) {
    if ((game.coins || 0) < cfg.cost) {
      if (context.ui?.message) context.ui.message.textContent = `Need ${cfg.cost} coins for ${cfg.name}!`;
      return false;
    }
    game.coins -= cfg.cost;
    playSound("turret_deploy");
    triggerHaptic("heavy");
    updateMissionProgress(context, "towers", 1);
  }

  const baseMat = new BABYLON.StandardMaterial(`TowerMat_${type}_${Math.random()}`, scene);
  baseMat.diffuseColor = cfg.color;
  baseMat.emissiveColor = cfg.color.scale(0.28);

  const rangeMat = new BABYLON.StandardMaterial(`TowerRangeMat_${type}_${Math.random()}`, scene);
  rangeMat.diffuseColor = cfg.color;
  rangeMat.emissiveColor = cfg.color.scale(0.22);
  rangeMat.alpha = 0.16;

  const base = BABYLON.MeshBuilder.CreateCylinder("DefenseTowerBase", { diameter: 1.3, height: 0.5, tessellation: 12 }, scene);
  base.position = pad.position.add(new BABYLON.Vector3(0, 0.25, 0));
  base.material = baseMat;

  const barrel = BABYLON.MeshBuilder.CreateCylinder("DefenseTowerBarrel", { diameter: 0.18, height: 1.7, tessellation: 8 }, scene);
  barrel.position = pad.position.add(new BABYLON.Vector3(0, 1.0, 0));
  barrel.rotation.x = Math.PI / 2;
  barrel.material = materials.gun;

  const rangeRing = BABYLON.MeshBuilder.CreateTorus("DefenseTowerRange", {
    diameter: cfg.range * 2,
    thickness: 0.035,
    tessellation: 96
  }, scene);
  rangeRing.position = pad.position.add(new BABYLON.Vector3(0, 0.06, 0));
  rangeRing.material = rangeMat;
  rangeRing.isPickable = false;

  const aura = BABYLON.MeshBuilder.CreateCylinder(`OverdriveAura_${pad.id}`, {
    diameter: 2.8,
    height: 1.8,
    tessellation: 16
  }, scene);
  aura.position = pad.position.add(new BABYLON.Vector3(0, 0.9, 0));
  aura.isPickable = false;
  aura.setEnabled(false);

  const auraMat = new BABYLON.StandardMaterial(`AuraMat_${pad.id}`, scene);
  auraMat.diffuseColor = new BABYLON.Color3(0.0, 0.9, 1.0);
  auraMat.emissiveColor = new BABYLON.Color3(0.2, 1.0, 1.0);
  auraMat.alpha = 0.35;
  auraMat.alphaMode = BABYLON.Engine.ALPHA_ADD;
  auraMat.disableLighting = true;
  auraMat.backFaceCulling = false;
  aura.material = auraMat;

  const turretAsset = context.loadedAssets?.[cfg.assetKey];
  let turretModel = null;
  if (turretAsset) {
    turretModel = cloneLoadedAsset(turretAsset, `TurretModel_${type}_${pad.id}`, {
      isPickable: false
    });
    if (turretModel) {
      fitModelToHeight(turretModel, 2.2, 0);
      turretModel.position = pad.position.clone();
      base.isVisible = false;
      barrel.isVisible = false;
      if (context.shadowGenerator?.getShadowMap()) {
        const renderList = context.shadowGenerator.getShadowMap().renderList;
        if (renderList) {
          turretModel.getChildMeshes(false).forEach(m => renderList.push(m));
        }
      }
    }
  }

  const tower = {
    padId,
    type,
    tier: 1,
    position: pad.position.clone(),
    meshes: [base, barrel, rangeRing],
    barrel,
    model: turretModel,
    rangeRing,
    overdriveAura: aura,
    auraMat,
    cooldown: cfg.cooldown,
    maxCooldown: cfg.cooldown,
    range: cfg.range,
    damage: cfg.damage,
    overdriveTimer: 0,
    overdriveCooldown: 0,
    laserLine: null
  };

  game.towers.push(tower);
  if (!free) {
    broadcastRadioComms(`${cfg.name} deployed in perimeter sector.`);
  }
  return tower;
}

export function upgradeTurret(context, tower) {
  const { game, ui } = context;
  if (!tower || tower.tier >= 3) return false;

  const cfg = TURRET_CONFIGS[tower.type] || TURRET_CONFIGS.gatling;
  const upgradeCost = tower.tier === 1 ? cfg.upgradeCostT2 : cfg.upgradeCostT3;

  if ((game.coins || 0) < upgradeCost) {
    if (ui?.message) ui.message.textContent = `Need ${upgradeCost} coins to upgrade ${cfg.name} to Tier ${tower.tier + 1}!`;
    return false;
  }

  game.coins -= upgradeCost;
  tower.tier++;
  playSound("turret_upgrade");
  triggerHaptic("heavy");

  if (tower.tier === 2) {
    tower.damage *= 1.5;
    tower.range *= 1.2;
    tower.maxCooldown *= 0.82;
  } else if (tower.tier === 3) {
    tower.damage *= 1.4;
    tower.range *= 1.2;
    tower.maxCooldown *= 0.75;
  }

  if (tower.rangeRing) {
    tower.rangeRing.scaling.set(tower.range / cfg.range, 1, tower.range / cfg.range);
  }

  if (ui?.message) {
    ui.message.textContent = `${cfg.name.toUpperCase()} UPGRADED TO TIER ${tower.tier}! Damage: +50%, Range: +20%`;
  }
  return true;
}

export function triggerTurretOverdrive(context, tower) {
  const { ui } = context;
  if (!tower) return false;
  if (tower.overdriveCooldown > 0) {
    if (ui?.message) ui.message.textContent = `Turret Overdrive cooling down (${Math.ceil(tower.overdriveCooldown / 1000)}s)`;
    return false;
  }

  tower.overdriveTimer = 8500;
  tower.overdriveCooldown = 22000;
  tower.overdriveAura?.setEnabled(true);
  playSound("turret_overdrive");
  triggerHaptic("heavy");

  if (ui?.message) {
    ui.message.textContent = "TURRET OVERDRIVE ACTIVE! 2.6X HYPER FIRE RATE (8 SECONDS)";
  }
  return true;
}

export function handleTurretContextualAction(context) {
  const { camera, game } = context;
  if (!camera || !game.started || game.gameOver || game.paused) return;

  const playerPos = camera.position;
  let nearestPad = null;
  let nearestDist = Number.POSITIVE_INFINITY;

  DEFENSE_PADS.forEach(pad => {
    const d = BABYLON.Vector3.Distance(playerPos, pad.position);
    if (d < 4.2 && d < nearestDist) {
      nearestPad = pad;
      nearestDist = d;
    }
  });

  if (!nearestPad) return;

  const tower = game.towers.find(t => t.padId === nearestPad.id);
  if (!tower) {
    const type = (game.coins || 0) >= 95 ? "mortar" : (game.coins || 0) >= 70 ? "cryo" : "gatling";
    deployTurretOnPad(context, nearestPad.id, type, false);
  } else {
    if (tower.overdriveCooldown <= 0) {
      triggerTurretOverdrive(context, tower);
    } else if (tower.tier < 3) {
      upgradeTurret(context, tower);
    }
  }
}

export function handleTurretUpgradeDirect(context) {
  const { camera, game } = context;
  if (!camera || !game.started || game.gameOver || game.paused) return;

  const playerPos = camera.position;
  let nearestTower = null;
  let nearestDist = Number.POSITIVE_INFINITY;

  game.towers.forEach(t => {
    const d = BABYLON.Vector3.Distance(playerPos, t.position);
    if (d < 4.5 && d < nearestDist) {
      nearestTower = t;
      nearestDist = d;
    }
  });

  if (nearestTower) {
    upgradeTurret(context, nearestTower);
  }
}

export function refreshTowerModels(context) {
  if (!context?.game?.towers) return;
  context.game.towers.forEach(tower => {
    if (tower.model) return;
    const cfg = TURRET_CONFIGS[tower.type] || TURRET_CONFIGS.gatling;
    const turretAsset = context.loadedAssets?.[cfg.assetKey];
    if (!turretAsset) return;
    const turretModel = cloneLoadedAsset(turretAsset, `TurretModel_${tower.type}_${tower.padId}`, {
      isPickable: false
    });
    if (turretModel) {
      fitModelToHeight(turretModel, 2.2, 0);
      turretModel.position = tower.position.clone();
      if (tower.meshes?.[0]) tower.meshes[0].isVisible = false;
      if (tower.meshes?.[1]) tower.meshes[1].isVisible = false;
      tower.model = turretModel;
    }
  });
}

export function updateTowers(context) {
  const { engine, game, scene, materials } = context;
  if (!game.started || game.paused || game.gameOver || game.waveStarting) return;
  const delta = engine.getDeltaTime();
  const time = performance.now() * 0.001;

  defensePadMeshes.forEach(item => {
    const isOccupied = game.towers.some(t => t.padId === item.pad.id);
    const alpha = isOccupied ? 0.35 + Math.sin(time * 2.5) * 0.1 : 0.65 + Math.sin(time * 4.2) * 0.22;
    item.ringMat.alpha = alpha;
    if (!isOccupied) {
      item.ringMesh.rotation.y += delta * 0.0015;
    }
  });

  updateTurretInteractionHUD(context);

  for (const tower of game.towers) {
    if (tower.overdriveTimer > 0) {
      tower.overdriveTimer -= delta;
      if (tower.overdriveAura) {
        tower.overdriveAura.rotation.y += delta * 0.008;
        const pulse = 1.0 + Math.sin(time * 12) * 0.12;
        tower.overdriveAura.scaling.set(pulse, 1.0, pulse);
      }
      if (tower.overdriveTimer <= 0) {
        tower.overdriveAura?.setEnabled(false);
      }
    }
    if (tower.overdriveCooldown > 0) {
      tower.overdriveCooldown -= delta;
    }

    const fireMultiplier = tower.overdriveTimer > 0 ? 2.6 : 1.0;
    tower.cooldown -= delta * fireMultiplier;

    const target = findTarget(game, tower);
    if (!target) {
      if (tower.laserLine) {
        tower.laserLine.dispose();
        tower.laserLine = null;
      }
      continue;
    }

    const targetPos = target.position.add(new BABYLON.Vector3(0, target.variant === "boss" ? 2.8 : target.variant === "wasp" ? 0.4 : 1.2, 0));
    const muzzleOrigin = tower.position.add(new BABYLON.Vector3(0, 1.2, 0));

    if (tower.model) {
      tower.model.lookAt(targetPos);
    } else if (tower.barrel) {
      tower.barrel.lookAt(targetPos);
    }

    if (scene) {
      if (tower.laserLine) tower.laserLine.dispose();
      const laserColor = tower.overdriveTimer > 0 ? new BABYLON.Color4(0.2, 1.0, 1.0, 0.85) : (tower.type === "cryo" ? new BABYLON.Color4(0.1, 0.9, 1.0, 0.65) : new BABYLON.Color4(1.0, 0.15, 0.1, 0.7));
      tower.laserLine = BABYLON.MeshBuilder.CreateLines(`TurretLaser_${tower.padId}`, {
        points: [muzzleOrigin, targetPos],
        colors: [laserColor, laserColor]
      }, scene);
      tower.laserLine.isPickable = false;
    }

    if (tower.cooldown > 0) continue;

    tower.cooldown = tower.maxCooldown;

    const ray = new BABYLON.Ray(muzzleOrigin, targetPos.subtract(muzzleOrigin).normalize(), tower.range);
    const tracerMat = tower.overdriveTimer > 0 ? materials.zone : (tower.type === "cryo" ? materials.zone : materials.bullet);
    createTracer(scene, { position: ray.origin }, ray, tracerMat, tower.tier * 0.8);
    createImpactEffect(scene, targetPos, true);
    playSpatialSound(tower.type === "mortar" ? "rocket_launch" : "plasma_fire", muzzleOrigin, context.camera, 0.42);

    if (tower.type === "cryo") {
      target.slowUntil = performance.now() + 1200;
    } else if (tower.type === "mortar") {
      for (const nearby of game.aliens) {
        if (nearby && !nearby.dead && BABYLON.Vector3.Distance(nearby.position, target.position) < 6.5) {
          damageAlien(context, nearby, tower.damage * 0.75, "defense");
        }
      }
    }

    damageAlien(context, target, tower.damage + (game.permanentUpgrades?.turretDamage || 0) * 0.15, "defense");
  }
}

function updateTurretInteractionHUD(context) {
  const { camera, game, ui } = context;
  if (!camera || !ui?.turretPrompt) return;

  const playerPos = camera.position;
  let nearestPad = null;
  let nearestDist = Number.POSITIVE_INFINITY;

  DEFENSE_PADS.forEach(pad => {
    const d = BABYLON.Vector3.Distance(playerPos, pad.position);
    if (d < 4.2 && d < nearestDist) {
      nearestPad = pad;
      nearestDist = d;
    }
  });

  if (!nearestPad) {
    ui.turretPrompt.style.display = "none";
    if (ui.mobileTurretButton) ui.mobileTurretButton.style.display = "none";
    return;
  }

  const tower = game.towers.find(t => t.padId === nearestPad.id);
  ui.turretPrompt.style.display = "block";
  if (ui.mobileTurretButton) ui.mobileTurretButton.style.display = "block";

  if (!tower) {
    ui.turretPromptTitle.textContent = `${nearestPad.label} • UNASSIGNED PAD`;
    ui.turretPromptAction.textContent = "PRESS [E] / TAP SENTRY TO BUILD GATLING (50 COINS)";
    if (ui.mobileTurretButton) ui.mobileTurretButton.textContent = "BUILD SENTRY";
  } else {
    const cfg = TURRET_CONFIGS[tower.type] || TURRET_CONFIGS.gatling;
    const canUpgrade = tower.tier < 3;
    const upgradeCost = tower.tier === 1 ? cfg.upgradeCostT2 : cfg.upgradeCostT3;
    const isOverdriveReady = tower.overdriveCooldown <= 0;

    ui.turretPromptTitle.textContent = `${nearestPad.label} • ${cfg.name.toUpperCase()} [TIER ${tower.tier}]`;
    if (tower.overdriveTimer > 0) {
      ui.turretPromptAction.textContent = `OVERDRIVE ACTIVE! 2.6X FIRE RATE (${Math.ceil(tower.overdriveTimer / 1000)}s)`;
      if (ui.mobileTurretButton) ui.mobileTurretButton.textContent = "BOOSTING";
    } else if (isOverdriveReady) {
      ui.turretPromptAction.textContent = `[E] OVERDRIVE BOOST ${canUpgrade ? `| [U] UPGRADE TIER ${tower.tier + 1} (${upgradeCost}C)` : ""}`;
      if (ui.mobileTurretButton) ui.mobileTurretButton.textContent = "OVERDRIVE";
    } else {
      ui.turretPromptAction.textContent = `OVERDRIVE CD: ${Math.ceil(tower.overdriveCooldown / 1000)}s ${canUpgrade ? `| [U] UPGRADE TIER ${tower.tier + 1} (${upgradeCost}C)` : "[MAX TIER]"}`;
      if (ui.mobileTurretButton) ui.mobileTurretButton.textContent = canUpgrade ? "UPGRADE" : "SENTRY";
    }
  }
}

function findTarget(game, tower) {
  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const alien of game.aliens) {
    if (!alien || alien.dead) continue;
    const distance = BABYLON.Vector3.Distance(tower.position, alien.position);
    if (distance < tower.range && distance < bestDistance) {
      best = alien;
      bestDistance = distance;
    }
  }
  return best;
}
