import * as BABYLON from "@babylonjs/core";
import { updateUI } from "./ui.js";
import { playSound } from "./sound.js";

export function clearPickups(game) {
  for (const pickup of game.pickups) {
    if (pickup && !pickup.isDisposed()) pickup.dispose();
  }
  game.pickups = [];
}

export function createHealthPack(context, position) {
  const { scene, game } = context;
  const packMat = new BABYLON.StandardMaterial("HealthPackMat" + Math.random(), scene);
  packMat.diffuseColor = new BABYLON.Color3(1, 0.1, 0.1);
  packMat.emissiveColor = new BABYLON.Color3(0.5, 0, 0);

  const pack = BABYLON.MeshBuilder.CreateBox("HealthPack", { size: 0.7 }, scene);
  pack.position = position.add(new BABYLON.Vector3(0, 0.5, 0));
  pack.material = packMat;
  pack.pickupType = "health";
  game.pickups.push(pack);
}

export function createAmmoPack(context, position) {
  const { scene, game } = context;
  const packMat = new BABYLON.StandardMaterial("AmmoPackMat" + Math.random(), scene);
  packMat.diffuseColor = new BABYLON.Color3(1, 0.85, 0.05);
  packMat.emissiveColor = new BABYLON.Color3(0.45, 0.28, 0);

  const pack = BABYLON.MeshBuilder.CreateCylinder("AmmoPack", { diameter: 0.7, height: 0.65, tessellation: 8 }, scene);
  pack.position = position.add(new BABYLON.Vector3(0, 0.45, 0));
  pack.material = packMat;
  pack.pickupType = "ammo";
  game.pickups.push(pack);
}

export function updatePickups(context) {
  const { game, camera, ui } = context;
  for (const pickup of [...game.pickups]) {
    if (!pickup || pickup.isDisposed()) continue;
    pickup.rotation.y += 0.04;
    pickup.position.y += Math.sin(performance.now() / 250) * 0.0015;

    const dist = BABYLON.Vector3.Distance(pickup.position, camera.position);
    if (dist < 1.6 && !game.paused) {
      if (pickup.pickupType === "health") {
        game.health = Math.min(100, game.health + 25);
        ui.message.textContent = "Health restored +25";
      } else {
        game.ammo = game.maxAmmo;
        ui.message.textContent = "Ammo refilled";
      }

      game.pickups = game.pickups.filter(p => p !== pickup);
      playSound("pickup");
      pickup.material?.dispose();
      pickup.dispose();
      updateUI(ui, game);

      setTimeout(() => {
        if (!game.gameOver) ui.message.textContent = "Survive the alien attack";
      }, 1000);
    }
  }
}
