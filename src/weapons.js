import { setWeaponStatus, updateUI } from "./ui.js";
import { damageAlien } from "./aliens.js";
import { applyCameraShake, createImpactEffect, createTracer, flashAlienHit, showGunFireEffect } from "./effects.js";
import { playSound } from "./sound.js";

export function fire(context) {
  const { scene, camera, game, materials, ui, gunRoot, muzzle } = context;
  if (!game.started) {
    setWeaponStatus(ui, game, "START GAME");
    return;
  }
  if (game.paused) {
    setWeaponStatus(ui, game, "PAUSED");
    return;
  }
  if (game.gameOver) {
    setWeaponStatus(ui, game, "OFFLINE");
    return;
  }
  if (game.reloading) {
    setWeaponStatus(ui, game, "RELOADING");
    return;
  }
  const now = performance.now();
  if (now - game.lastShot < game.shotDelay / game.fireRateMultiplier) {
    setWeaponStatus(ui, game, "COOLDOWN", 180);
    return;
  }
  if (game.ammo <= 0) {
    setWeaponStatus(ui, game, "NO AMMO");
    reload(context);
    return;
  }

  game.lastShot = now;
  game.ammo--;
  game.weaponStatus = "READY";
  game.weaponStatusUntil = 0;
  updateUI(ui, game);
  showGunFireEffect({ gunRoot, muzzle });
  applyCameraShake(camera, 0.018);
  playSound("gun_fire");

  const ray = camera.getForwardRay(85);
  const hit = scene.pickWithRay(ray, mesh => mesh.metadata && mesh.metadata.alienRoot);
  createTracer(scene, camera, ray, materials.bullet);

  if (hit && hit.pickedMesh) {
    const alien = hit.pickedMesh.metadata.alienRoot;
    if (!alien || alien.dead) return;
    createImpactEffect(scene, hit.pickedPoint, true);
    flashAlienHit(alien);
    playSound("alien_hit");
    damageAlien(context, alien, 1 + game.playerDamageBonus, "player");
  } else {
    const missPoint = ray.origin.add(ray.direction.scale(18));
    createImpactEffect(scene, missPoint, false);
  }
}

export function reload(context) {
  const { game, ui } = context;
  if (game.reloading || game.ammo === game.maxAmmo || game.paused || game.gameOver) return;
  game.reloading = true;
  ui.message.textContent = "Reloading...";
  setWeaponStatus(ui, game, "RELOADING", 1200);
  playSound("reload");
  setTimeout(() => {
    game.ammo = game.maxAmmo;
    game.reloading = false;
    game.weaponStatus = "READY";
    game.weaponStatusUntil = 0;
    if (!game.gameOver) ui.message.textContent = "Weapon ready";
    setTimeout(() => {
      if (!game.gameOver) ui.message.textContent = "Survive the alien attack";
    }, 800);
    updateUI(ui, game);
  }, 1100);
}
