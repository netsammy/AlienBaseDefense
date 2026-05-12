import * as BABYLON from "@babylonjs/core";
import { createImpactEffect, createTracer } from "./effects.js";
import { damageAlien } from "./aliens.js";

const TOWER_SLOTS = [
  new BABYLON.Vector3(9, 0, 0),
  new BABYLON.Vector3(-9, 0, 0),
  new BABYLON.Vector3(0, 0, 9),
  new BABYLON.Vector3(0, 0, -9)
];

export function createStarterTowers(context) {
  clearTowers(context);
  TOWER_SLOTS.slice(0, 2).forEach((position, index) => createTower(context, position, index === 0 ? "plasma" : "slow"));
}

export function clearTowers(context) {
  context.game.towers.forEach(tower => {
    tower.meshes.forEach(mesh => mesh.dispose());
  });
  context.game.towers = [];
}

export function createTower(context, position, type = "plasma") {
  const { scene, game, materials } = context;
  const baseMat = new BABYLON.StandardMaterial(`TowerMat_${type}_${Math.random()}`, scene);
  baseMat.diffuseColor = type === "slow" ? new BABYLON.Color3(0.2, 0.45, 1) : new BABYLON.Color3(0.9, 0.75, 0.12);
  baseMat.emissiveColor = baseMat.diffuseColor.scale(0.25);

  const range = type === "slow" ? 13.5 : 15.5;
  const rangeMat = new BABYLON.StandardMaterial(`TowerRangeMat_${type}_${Math.random()}`, scene);
  rangeMat.diffuseColor = baseMat.diffuseColor;
  rangeMat.emissiveColor = baseMat.diffuseColor.scale(0.22);
  rangeMat.alpha = 0.18;

  const base = BABYLON.MeshBuilder.CreateCylinder("DefenseTowerBase", { diameter: 1.2, height: 0.5, tessellation: 10 }, scene);
  base.position = position.add(new BABYLON.Vector3(0, 0.25, 0));
  base.material = baseMat;

  const barrel = BABYLON.MeshBuilder.CreateCylinder("DefenseTowerBarrel", { diameter: 0.18, height: 1.7, tessellation: 8 }, scene);
  barrel.position = position.add(new BABYLON.Vector3(0, 1.0, 0));
  barrel.rotation.x = Math.PI / 2;
  barrel.material = materials.gun;

  const rangeRing = BABYLON.MeshBuilder.CreateTorus("DefenseTowerRange", {
    diameter: range * 2,
    thickness: 0.035,
    tessellation: 96
  }, scene);
  rangeRing.position = position.add(new BABYLON.Vector3(0, 0.06, 0));
  rangeRing.material = rangeMat;
  rangeRing.isPickable = false;

  game.towers.push({
    type,
    position: position.clone(),
    meshes: [base, barrel, rangeRing],
    barrel,
    cooldown: 450 + Math.random() * 350,
    range,
    damage: type === "slow" ? 0.22 : 0.42
  });
}

export function updateTowers(context) {
  const { engine, game, scene, materials } = context;
  if (!game.started || game.paused || game.gameOver || game.waveStarting) return;
  const delta = engine.getDeltaTime();

  for (const tower of game.towers) {
    tower.cooldown -= delta;
    const target = findTarget(game, tower);
    if (!target) continue;

    tower.barrel.lookAt(target.position.add(new BABYLON.Vector3(0, 1.2, 0)));
    if (tower.cooldown > 0) continue;

    tower.cooldown = tower.type === "slow" ? 1150 : 780;
    const ray = new BABYLON.Ray(tower.position.add(new BABYLON.Vector3(0, 1.1, 0)), target.position.subtract(tower.position).normalize(), tower.range);
    createTracer(scene, { position: ray.origin }, ray, tower.type === "slow" ? materials.zone : materials.bullet);
    createImpactEffect(scene, target.position.add(new BABYLON.Vector3(0, 1.2, 0)), true);

    if (tower.type === "slow") {
      target.slowUntil = performance.now() + 900;
    }
    damageAlien(context, target, tower.damage + game.permanentUpgrades.turretDamage * 0.12, "defense");
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
