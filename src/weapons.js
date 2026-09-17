import * as BABYLON from "@babylonjs/core";
import { setWeaponStatus, updateUI } from "./ui.js";
import { damageAlien } from "./aliens.js";
import { applyCameraShake, createImpactEffect, createTracer, createFlameStreamEffect, flashAlienHit, showGunFireEffect } from "./effects.js";
import { playSound, broadcastRadioComms } from "./sound.js";
import { triggerHaptic } from "./haptics.js";
import { DEFAULT_WEAPONS } from "./gameState.js";

const WEAPON_ORDER = ["shotgun", "rifle", "rocket", "sniper", "flamethrower"];

export function switchWeapon(context, weaponId) {
  const { game, ui, attachWeaponModel } = context;
  if (!game.weapons) {
    game.weapons = JSON.parse(JSON.stringify(DEFAULT_WEAPONS));
  } else if (!game.weapons[weaponId]) {
    if (DEFAULT_WEAPONS[weaponId]) {
      game.weapons[weaponId] = JSON.parse(JSON.stringify(DEFAULT_WEAPONS[weaponId]));
    } else {
      return;
    }
  }

  if (game.activeWeapon === weaponId) return;

  if (game.reloading) {
    game.reloading = false;
  }

  if (game.activeWeapon === "sniper" && weaponId !== "sniper" && game.isSniperScoped) {
    toggleSniperScope(context, false);
  }

  // Save current ammo in current weapon slot
  if (game.weapons[game.activeWeapon]) {
    game.weapons[game.activeWeapon].ammo = game.ammo;
  }

  game.activeWeapon = weaponId;
  const wep = game.weapons[weaponId];
  game.ammo = wep.ammo;
  game.maxAmmo = wep.maxAmmo;
  game.shotDelay = wep.shotDelay;
  game.weaponStatus = "READY";
  game.weaponStatusUntil = 0;

  playSound("weapon_switch");
  triggerHaptic("light");

  if (attachWeaponModel) {
    attachWeaponModel(weaponId);
  }

  if (ui.message && !game.gameOver) {
    ui.message.textContent = `${wep.name} EQUIPPED`;
    setTimeout(() => {
      if (ui.message && ui.message.textContent === `${wep.name} EQUIPPED`) {
        ui.message.textContent = "Survive the alien attack";
      }
    }, 1000);
  }

  updateUI(ui, game);
}

export function cycleWeapon(context, direction = 1) {
  const { game } = context;
  const currentIndex = WEAPON_ORDER.indexOf(game.activeWeapon || "shotgun");
  const nextIndex = (currentIndex + direction + WEAPON_ORDER.length) % WEAPON_ORDER.length;
  switchWeapon(context, WEAPON_ORDER[nextIndex]);
}

function isTargetPickable(mesh) {
  if (!mesh.metadata) return false;
  if (mesh.metadata.alienRoot && !mesh.metadata.alienRoot.dead) return true;
  if (mesh.metadata.isAlienProjectile) return true;
  return false;
}

function handleRayHit(context, hit, damage) {
  const { scene, game } = context;
  if (!hit || !hit.pickedMesh) return;

  if (hit.pickedMesh.metadata.isAlienProjectile) {
    const projData = hit.pickedMesh.metadata.projectileData;
    createImpactEffect(scene, hit.pickedPoint, true, (game.effectsScale || 1) * 1.5);
    playSound("interception");
    triggerHaptic("medium");

    game.score += 75;
    game.killStreak = (game.killStreak || 0) + 1;
    game.adrenaline = Math.min(game.maxAdrenaline, (game.adrenaline || 0) + 6);
    if (context.ui?.message) context.ui.message.textContent = "THREAT INTERCEPTED! +75 PTS";
    updateUI(context.ui, game);

    if (projData) {
      game.alienProjectiles = (game.alienProjectiles || []).filter(p => p !== projData);
      if (projData.material) projData.material.dispose();
    }
    hit.pickedMesh.dispose();
    return;
  }

  const alien = hit.pickedMesh.metadata.alienRoot;
  if (!alien || alien.dead) return;
  createImpactEffect(scene, hit.pickedPoint, true, game.effectsScale);
  flashAlienHit(alien);
  playSound("alien_hit");
  damageAlien(context, alien, damage, "player");

  if (game.cryoRoundsActive) {
    alien.slowTimer = 3000;
    alien.slowMultiplier = 0.55;
  }

  if (game.teslaChainActive) {
    triggerTeslaChain(context, alien, hit.pickedPoint, damage * 0.45);
  }
}

export function fire(context) {
  const { scene, camera, game, materials, ui, gunRoot, muzzle, muzzleLight } = context;
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

  const wep = game.weapons?.[game.activeWeapon] || {
    id: "shotgun",
    name: "COMBAT SHOTGUN",
    ammo: 8,
    maxAmmo: 8,
    shotDelay: 420,
    reloadTime: 1300,
    pellets: 6,
    spread: 0.09,
    damageMult: 0.45,
    cameraShake: 0.026,
    sound: "shotgun_fire"
  };

  const now = performance.now();
  if (now - game.lastShot < wep.shotDelay / game.fireRateMultiplier) {
    setWeaponStatus(ui, game, "COOLDOWN", 160);
    return;
  }
  if (game.ammo <= 0) {
    setWeaponStatus(ui, game, "NO AMMO");
    reload(context);
    return;
  }

  game.lastShot = now;
  game.ammo--;
  if (game.weapons?.[game.activeWeapon]) {
    game.weapons[game.activeWeapon].ammo = game.ammo;
  }
  game.weaponStatus = "READY";
  game.weaponStatusUntil = 0;
  updateUI(ui, game);

  gunRoot.metadata = { ...(gunRoot.metadata || {}), muzzleScale: 1 + game.playerDamageBonus * 0.18 };
  showGunFireEffect({ gunRoot, muzzle, muzzleLight });

  // Branch firing mechanics based on active weapon
  if (wep.id === "rocket") {
    playSound(wep.sound || "rocket_launch");
    applyCameraShake(camera, wep.cameraShake || 0.045);
    triggerHaptic("heavy");
    launchRocket(context, wep);
    return;
  }

  if (wep.id === "sniper") {
    playSound(wep.sound || "plasma_sniper_fire");
    applyCameraShake(camera, wep.cameraShake || 0.038);
    triggerHaptic("heavy");

    const ray = camera.getForwardRay(130);
    const hits = scene.multiPickWithRay(ray, isTargetPickable);
    const powerScale = (1 + game.playerDamageBonus * 0.3) * 2.4;
    createTracer(scene, camera, ray, materials.bullet, powerScale, (game.effectsScale || 1) * 1.5);

    const hitAliens = new Set();
    if (hits && hits.length > 0) {
      for (const hit of hits) {
        if (hit.pickedMesh) {
          const alien = hit.pickedMesh.metadata?.alienRoot;
          if (alien && !alien.dead && !hitAliens.has(alien)) {
            hitAliens.add(alien);
            const isCrit = Math.random() < (game.critChanceBonus || 0) + 0.35;
            const baseDamage = (1 + game.playerDamageBonus) * (wep.damageMult || 4.8);
            const dmg = isCrit ? baseDamage * 2.5 : baseDamage;
            handleRayHit(context, hit, dmg);
            if (hitAliens.size >= 4) break;
          } else if (hit.pickedMesh.metadata?.isAlienProjectile) {
            handleRayHit(context, hit, 10);
          }
        }
      }
    }
    if (hitAliens.size === 0) {
      const missPoint = ray.origin.add(ray.direction.scale(35));
      createImpactEffect(scene, missPoint, false, game.effectsScale);
    }
    return;
  }

  if (wep.id === "flamethrower") {
    playSound(wep.sound || "flamethrower_burst");
    applyCameraShake(camera, wep.cameraShake || 0.008);
    triggerHaptic("light");

    createFlameStreamEffect(scene, camera, game.effectsScale);

    const forward = camera.getDirection(BABYLON.Vector3.Forward());
    const camPos = camera.position;
    const maxRange = 26;
    const coneAngleCos = 0.88; // ~28 degree cone

    const hitAliens = new Set();
    const baseDamage = (1 + game.playerDamageBonus) * (wep.damageMult || 0.35);

    // 1. Center Raycast for precise projectile intercept and point-blank impact
    const directRay = camera.getForwardRay(maxRange);
    const directHits = scene.multiPickWithRay(directRay, isTargetPickable);
    if (directHits && directHits.length > 0) {
      for (const h of directHits) {
        if (h.pickedMesh?.metadata?.isAlienProjectile) {
          handleRayHit(context, h, 10);
        } else if (h.pickedMesh?.metadata?.alienRoot) {
          const alien = h.pickedMesh.metadata.alienRoot;
          if (alien && !alien.dead && !hitAliens.has(alien)) {
            hitAliens.add(alien);
            handleRayHit(context, h, baseDamage);
            alien.burningTimer = 3500;
            alien.burningDamage = 0.45;
          }
        }
      }
    }

    // 2. Conical AoE sweep engulfing all aliens within the chemical fire stream
    if (game.aliens && game.aliens.length > 0) {
      for (const alien of game.aliens) {
        if (!alien || alien.dead || hitAliens.has(alien)) continue;
        const toAlien = alien.position.subtract(camPos);
        const dist = toAlien.length();
        if (dist <= maxRange) {
          const dir = toAlien.normalize();
          if (BABYLON.Vector3.Dot(forward, dir) >= coneAngleCos) {
            hitAliens.add(alien);
            flashAlienHit(alien);
            damageAlien(context, alien, baseDamage, "player");
            alien.burningTimer = 3500;
            alien.burningDamage = 0.45;
            createImpactEffect(scene, alien.position.add(new BABYLON.Vector3(0, 1.2, 0)), false, 0.7);
          }
        }
      }
    }

    // 3. Vaporize incoming alien projectiles inside the flame stream
    if (game.alienProjectiles && game.alienProjectiles.length > 0) {
      for (const proj of [...game.alienProjectiles]) {
        if (!proj.mesh || proj.mesh.isDisposed()) continue;
        const toProj = proj.mesh.position.subtract(camPos);
        if (toProj.length() <= maxRange) {
          if (BABYLON.Vector3.Dot(forward, toProj.normalize()) >= coneAngleCos) {
            createImpactEffect(scene, proj.mesh.position, true, 1.2);
            playSound("interception");
            proj.mesh.dispose();
            if (proj.material) proj.material.dispose();
            game.alienProjectiles = game.alienProjectiles.filter(p => p !== proj);
          }
        }
      }
    }

    return;
  }

  // Raycast based weapons (Shotgun & Rifle)
  const isCrit = Math.random() < (game.critChanceBonus || 0);
  triggerHaptic(isCrit ? "medium" : "light");
  playSound(wep.sound || "gun_fire");
  applyCameraShake(camera, wep.cameraShake || 0.018);

  const pellets = wep.pellets || 1;
  const spread = wep.spread || 0;
  const baseDamage = (1 + game.playerDamageBonus) * (wep.damageMult || 1.0);
  const finalDamage = isCrit ? baseDamage * 2 : baseDamage;

  for (let i = 0; i < pellets; i++) {
    let ray;
    if (spread === 0) {
      ray = camera.getForwardRay(85);
    } else {
      const forward = camera.getDirection(BABYLON.Vector3.Forward());
      const right = camera.getDirection(BABYLON.Vector3.Right());
      const up = camera.getDirection(BABYLON.Vector3.Up());
      const rx = (Math.random() - 0.5) * spread;
      const ry = (Math.random() - 0.5) * spread;
      const dir = forward.add(right.scale(rx)).add(up.scale(ry)).normalize();
      ray = new BABYLON.Ray(camera.position, dir, 80);
    }

    const hit = scene.pickWithRay(ray, isTargetPickable);
    const powerScale = (1 + game.playerDamageBonus * 0.22) * (wep.id === "shotgun" ? 0.85 : 1.2);
    createTracer(scene, camera, ray, materials.bullet, powerScale, game.effectsScale);

    if (hit && hit.pickedMesh) {
      handleRayHit(context, hit, finalDamage);
    } else {
      const missPoint = ray.origin.add(ray.direction.scale(18));
      createImpactEffect(scene, missPoint, false, game.effectsScale);
    }
  }
}

function launchRocket(context, wep) {
  const { scene, camera, game } = context;
  const ray = camera.getForwardRay(100);

  const rocketMesh = BABYLON.MeshBuilder.CreateCylinder("RocketProj", {
    diameterTop: 0.06,
    diameterBottom: 0.14,
    height: 0.65,
    tessellation: 12
  }, scene);
  rocketMesh.rotation.x = Math.PI / 2;

  const forward = camera.getDirection(BABYLON.Vector3.Forward());
  const right = camera.getDirection(BABYLON.Vector3.Right());
  const startPos = camera.position.add(forward.scale(0.85)).add(right.scale(0.22)).add(new BABYLON.Vector3(0, -0.15, 0));
  rocketMesh.position.copyFrom(startPos);
  rocketMesh.lookAt(startPos.add(ray.direction));

  const rocketMat = new BABYLON.StandardMaterial("RocketMat", scene);
  rocketMat.diffuseColor = new BABYLON.Color3(0.12, 0.14, 0.16);
  rocketMat.emissiveColor = new BABYLON.Color3(1.0, 0.45, 0.1);
  rocketMesh.material = rocketMat;
  rocketMesh.isPickable = false;

  const exhaustLight = new BABYLON.PointLight("RocketExhaust", BABYLON.Vector3.Zero(), scene);
  exhaustLight.parent = rocketMesh;
  exhaustLight.diffuse = new BABYLON.Color3(1.0, 0.55, 0.12);
  exhaustLight.range = 7;
  exhaustLight.intensity = 2.2;

  const speed = 42; // m/s
  const velocity = ray.direction.scale(speed);

  game.rocketsInFlight = game.rocketsInFlight || [];
  game.rocketsInFlight.push({
    mesh: rocketMesh,
    material: rocketMat,
    light: exhaustLight,
    velocity,
    spawnTime: performance.now(),
    maxLife: 3200,
    wep
  });
}

export function updateRockets(context) {
  const { scene, game, engine } = context;
  if (!game.rocketsInFlight || game.rocketsInFlight.length === 0) return;

  const dt = (engine.getDeltaTime() || 16) * 0.001;
  const now = performance.now();
  const surviving = [];

  for (const rocket of game.rocketsInFlight) {
    if (now - rocket.spawnTime > rocket.maxLife) {
      detonateRocket(context, rocket.mesh.position, rocket.wep);
      rocket.mesh.dispose();
      rocket.material?.dispose();
      continue;
    }

    const currentPos = rocket.mesh.position.clone();
    const moveStep = rocket.velocity.scale(dt);
    const nextPos = currentPos.add(moveStep);
    const stepDist = moveStep.length();

    // Check collision along step
    const ray = new BABYLON.Ray(currentPos, rocket.velocity.clone().normalize(), stepDist + 0.3);
    const hit = scene.pickWithRay(ray, isTargetPickable);

    if (hit && hit.pickedMesh) {
      detonateRocket(context, hit.pickedPoint || nextPos, rocket.wep);
      rocket.mesh.dispose();
      rocket.material?.dispose();
      continue;
    }

    // Ground impact check
    if (nextPos.y <= 0.2) {
      nextPos.y = 0.2;
      detonateRocket(context, nextPos, rocket.wep);
      rocket.mesh.dispose();
      rocket.material?.dispose();
      continue;
    }

    rocket.mesh.position.copyFrom(nextPos);
    surviving.push(rocket);
  }

  game.rocketsInFlight = surviving;
}

function detonateRocket(context, position, wep = {}) {
  const { scene, camera, game } = context;
  const explosionRadius = wep.explosionRadius || 7.5;
  const baseDmg = (1 + game.playerDamageBonus) * (wep.damageMult || 4.5);

  playSound("rocket_explode");
  applyCameraShake(camera, 0.048);
  triggerHaptic("heavy");

  createImpactEffect(scene, position, true, (game.effectsScale || 1) * 2.2);

  // Fiery Expanding Blast Sphere FX
  const blastSphere = BABYLON.MeshBuilder.CreateSphere("BlastSphere", { diameter: 3.5, segments: 16 }, scene);
  blastSphere.position.copyFrom(position);
  blastSphere.isPickable = false;

  const blastMat = new BABYLON.StandardMaterial("BlastMat", scene);
  blastMat.emissiveColor = new BABYLON.Color3(1.0, 0.5, 0.1);
  blastMat.diffuseColor = new BABYLON.Color3(1.0, 0.8, 0.2);
  blastMat.alpha = 0.85;
  blastMat.alphaMode = BABYLON.Engine.ALPHA_ADD;
  blastMat.disableLighting = true;
  blastSphere.material = blastMat;

  let animStep = 0;
  const timer = setInterval(() => {
    animStep++;
    blastSphere.scaling.scaleInPlace(1.15);
    blastMat.alpha -= 0.11;
    if (animStep >= 8) {
      clearInterval(timer);
      blastSphere.dispose();
      blastMat.dispose();
    }
  }, 30);

  // Radial Area of Effect Damage
  const victims = [...(game.aliens || [])];
  for (const alien of victims) {
    if (!alien || alien.dead) continue;
    const dist = BABYLON.Vector3.Distance(alien.position, position);
    if (dist <= explosionRadius) {
      const falloff = 1 - (dist / explosionRadius) * 0.65;
      const damage = baseDmg * Math.max(0.35, falloff);
      flashAlienHit(alien);
      damageAlien(context, alien, damage, "player");
    }
  }
}

function triggerTeslaChain(context, sourceAlien, hitPoint, damage) {
  const { scene, game, materials } = context;
  const nearby = game.aliens.find(a => a !== sourceAlien && !a.dead && BABYLON.Vector3.Distance(a.position, sourceAlien.position) < 12);
  if (!nearby) return;

  const ray = new BABYLON.Ray(hitPoint, nearby.position.subtract(hitPoint).normalize(), BABYLON.Vector3.Distance(hitPoint, nearby.position));
  createTracer(scene, { position: hitPoint }, ray, materials.zone, 1.2, game.effectsScale);
  flashAlienHit(nearby);
  damageAlien(context, nearby, damage, "player");
}

export function checkAutoFire(context) {
  const { camera, game, scene } = context;
  if (!game.autoFire || !game.started || game.paused || game.gameOver || game.reloading) return;

  const wep = game.weapons?.[game.activeWeapon] || { shotDelay: 420 };
  if (performance.now() - game.lastShot < wep.shotDelay / game.fireRateMultiplier) return;

  const maxRange = wep.id === "flamethrower" ? 26 : 65;
  const ray = camera.getForwardRay(maxRange);
  const hit = scene.pickWithRay(ray, isTargetPickable);
  if (hit && hit.pickedMesh) {
    fire(context);
    return;
  }

  // Flamethrower cone auto-trigger
  if (wep.id === "flamethrower" && game.aliens && game.aliens.length > 0) {
    const forward = camera.getDirection(BABYLON.Vector3.Forward());
    const camPos = camera.position;
    for (const alien of game.aliens) {
      if (!alien || alien.dead) continue;
      const toAlien = alien.position.subtract(camPos);
      if (toAlien.length() <= 24) {
        if (BABYLON.Vector3.Dot(forward, toAlien.normalize()) >= 0.88) {
          fire(context);
          return;
        }
      }
    }
  }
}

export function triggerAdrenalineSurge(context) {
  const { scene, camera, game, materials, ui } = context;
  if (game.adrenaline < game.maxAdrenaline || !game.started || game.paused || game.gameOver) return;

  game.adrenaline = 0;
  triggerHaptic("heavy");
  applyCameraShake(camera, 0.05);
  playSound("gun_fire");

  const beam = BABYLON.MeshBuilder.CreateCylinder("OrbitalBeam", {
    diameter: 8,
    height: 120,
    tessellation: 24
  }, scene);
  beam.position = new BABYLON.Vector3(0, 50, 0);
  const beamMat = new BABYLON.StandardMaterial("OrbitalBeamMat", scene);
  beamMat.emissiveColor = new BABYLON.Color3(0, 0.85, 1);
  beamMat.alpha = 0.85;
  beam.material = beamMat;

  let animFrame = 0;
  const interval = setInterval(() => {
    animFrame++;
    beam.scaling.x *= 1.12;
    beam.scaling.z *= 1.12;
    beamMat.alpha -= 0.12;
    if (animFrame >= 8) {
      clearInterval(interval);
      beam.dispose();
      beamMat.dispose();
    }
  }, 40);

  const targetAliens = [...game.aliens];
  for (const alien of targetAliens) {
    if (alien && !alien.dead) {
      flashAlienHit(alien);
      damageAlien(context, alien, 1000, "player");
    }
  }

  if (ui.message) ui.message.textContent = "ORBITAL ION STRIKE DEPLOYED!";
  broadcastRadioComms("Orbital Ion strike deployed! Stand by for impact!");
  updateUI(ui, game);
}

export function reload(context) {
  const { game, ui } = context;
  const wep = game.weapons?.[game.activeWeapon] || { name: "Weapon", maxAmmo: 8, reloadTime: 1200 };
  if (game.reloading || game.ammo === wep.maxAmmo || game.paused || game.gameOver) return;

  game.reloading = true;
  ui.message.textContent = `Reloading ${wep.name}...`;
  setWeaponStatus(ui, game, "RELOADING", wep.reloadTime + 100);
  playSound("reload");

  setTimeout(() => {
    game.ammo = wep.maxAmmo;
    if (game.weapons?.[game.activeWeapon]) {
      game.weapons[game.activeWeapon].ammo = wep.maxAmmo;
    }
    game.reloading = false;
    game.weaponStatus = "READY";
    game.weaponStatusUntil = 0;
    if (!game.gameOver) ui.message.textContent = `${wep.name} Ready`;
    setTimeout(() => {
      if (!game.gameOver && ui.message.textContent === `${wep.name} Ready`) {
        ui.message.textContent = "Survive the alien attack";
      }
    }, 800);
    updateUI(ui, game);
  }, wep.reloadTime);
}

export function triggerKineticEmpBlast(context) {
  const { scene, camera, game, ui, baseCore } = context;
  if (!game.started || game.paused || game.gameOver) return;

  if ((game.empCooldown || 0) > 0) {
    if (ui?.message && !game.gameOver) {
      ui.message.textContent = `EMP RECHARGING: ${Math.ceil(game.empCooldown)}s`;
    }
    return;
  }

  game.empCooldown = 20; // 20s recharge
  playSound("emp_blast");
  triggerHaptic("heavy");
  applyCameraShake(camera, 0.05);

  const origin = baseCore?.position ? baseCore.position.clone() : new BABYLON.Vector3(0, 1.5, 0);

  // Expanding EMP Shockwave Ring & Electric Pulse Dome
  const shockwave = BABYLON.MeshBuilder.CreateTorus("EmpShockwaveRing", {
    diameter: 4,
    thickness: 1.8,
    tessellation: 36
  }, scene);
  shockwave.position = origin.clone();
  shockwave.rotation.x = Math.PI / 2;

  const innerDome = BABYLON.MeshBuilder.CreateSphere("EmpShockwaveDome", {
    diameter: 3,
    segments: 16
  }, scene);
  innerDome.position = origin.clone();

  const empMat = new BABYLON.StandardMaterial("EmpBlastMat", scene);
  empMat.emissiveColor = new BABYLON.Color3(0, 0.95, 1);
  empMat.diffuseColor = new BABYLON.Color3(0.2, 0.8, 1);
  empMat.alpha = 0.88;
  shockwave.material = empMat;
  innerDome.material = empMat;

  let currentRadius = 2;
  const maxRadius = 38;
  const expandSpeed = 42;

  const empAnimInterval = setInterval(() => {
    currentRadius += expandSpeed * 0.035;
    const scale = currentRadius / 2;
    shockwave.scaling.set(scale, scale, scale);
    innerDome.scaling.set(scale * 0.75, scale * 0.75, scale * 0.75);
    empMat.alpha = Math.max(0, 0.88 * (1 - (currentRadius / maxRadius)));

    if (currentRadius >= maxRadius) {
      clearInterval(empAnimInterval);
      shockwave.dispose();
      innerDome.dispose();
      empMat.dispose();
    }
  }, 35);

  // 1. Vaporize all Hostile Projectiles
  if (game.alienProjectiles && game.alienProjectiles.length > 0) {
    const toRemove = [];
    for (const proj of game.alienProjectiles) {
      if (proj && proj.mesh) {
        const dist = BABYLON.Vector3.Distance(proj.mesh.position, origin);
        if (dist <= maxRadius + 6) {
          toRemove.push(proj);
          createImpactEffect(scene, proj.mesh.position, true, 1.6);
          if (proj.mesh) proj.mesh.dispose();
          if (proj.material) proj.material.dispose();
        }
      }
    }
    game.alienProjectiles = game.alienProjectiles.filter(p => !toRemove.includes(p));
  }

  // 2. Disorient, Damage & Knock Back Swarms
  let aliensHit = 0;
  for (const alien of [...game.aliens]) {
    if (!alien || alien.dead) continue;
    const dist = BABYLON.Vector3.Distance(alien.position, origin);
    if (dist <= maxRadius) {
      aliensHit++;
      flashAlienHit(alien);

      // Radial knockback away from base
      const knockDir = alien.position.subtract(origin);
      knockDir.y = 0;
      if (knockDir.lengthSquared() > 0.01) {
        knockDir.normalize();
        alien.position.addInPlace(knockDir.scale(11));
      }

      // Stun alien for 3.2 seconds
      alien.stunTimer = 3.2;

      // Heavy EMP energy damage
      damageAlien(context, alien, 200, "emp");
    }
  }

  // 3. Disorient Boss if present
  if (game.bossAlien && !game.bossAlien.dead) {
    game.bossAlien.stunTimer = 3.5;
    flashAlienHit(game.bossAlien);
    damageAlien(context, game.bossAlien, 350, "emp");
  }

  if (ui?.message) {
    ui.message.textContent = `⚡ KINETIC EMP BLAST DETONATED! (${aliensHit} PURGED)`;
  }
  broadcastRadioComms("EMP discharge confirmed! Hostile perimeter purged!");
  updateUI(ui, game);
}

export function toggleSniperScope(context, forceState = null) {
  const { camera, game } = context;
  if (!camera || !game) return;
  if (forceState !== null) {
    game.isSniperScoped = forceState;
  } else {
    game.isSniperScoped = !game.isSniperScoped;
  }

  const targetFov = game.isSniperScoped ? 0.32 : 0.85;
  camera.fov = targetFov;

  const scopeOverlay = document.getElementById("sniperScopeOverlay");
  if (scopeOverlay) {
    scopeOverlay.style.display = game.isSniperScoped ? "block" : "none";
  }
}

