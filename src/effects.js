import * as BABYLON from "@babylonjs/core";

const GUN_REST_POSITION = new BABYLON.Vector3(0.82, -0.72, 1.04);
const GUN_RECOIL_POSITION = new BABYLON.Vector3(0.86, -0.69, 0.92);

export function showGunFireEffect({ gunRoot, muzzle, muzzleLight }) {
  muzzle.isVisible = true;
  if (muzzleLight) muzzleLight.intensity = 2.8;
  const scale = gunRoot.metadata?.muzzleScale || 1;
  muzzle.scaling = new BABYLON.Vector3(1.9 * scale, 1.9 * scale, 1.9 * scale);

  gunRoot.position.copyFrom(GUN_RECOIL_POSITION);

  setTimeout(() => {
    muzzle.isVisible = false;
    if (muzzleLight) muzzleLight.intensity = 0;
    muzzle.scaling = new BABYLON.Vector3(1, 1, 1);
    gunRoot.position.copyFrom(GUN_REST_POSITION);
  }, 60);
}

let cameraShakeTrauma = 0;

export function addCameraTrauma(amount = 0.25) {
  cameraShakeTrauma = Math.min(1.0, cameraShakeTrauma + amount);
}

export function applyCameraShake(camera, intensity = 0.015) {
  addCameraTrauma(intensity * 14);
}

export function updateCameraShake(camera, deltaSec = 0.016) {
  if (cameraShakeTrauma <= 0.001 || !camera) return;
  const shake = cameraShakeTrauma * cameraShakeTrauma;
  camera.rotation.x += (Math.random() - 0.5) * 0.038 * shake;
  camera.rotation.y += (Math.random() - 0.5) * 0.038 * shake;
  camera.rotation.z = (Math.random() - 0.5) * 0.014 * shake;
  cameraShakeTrauma = Math.max(0, cameraShakeTrauma - deltaSec * 2.8);
  if (cameraShakeTrauma <= 0.001) {
    camera.rotation.z = 0;
  }
}

export function updateBaseShieldFeedback(context) {
  const { game, baseCore, materials } = context;
  if (!materials?.baseCore) return;
  const maxHealth = game.maxBaseHealth || 100;
  const ratio = Math.max(0, Math.min(1, game.baseHealth / maxHealth));
  const healthy = new BABYLON.Color3(0, 0.45, 0.65);
  const warning = new BABYLON.Color3(0.85, 0.08, 0.03);
  const color = BABYLON.Color3.Lerp(warning, healthy, ratio);
  materials.baseCore.emissiveColor = color;
  materials.baseCore.diffuseColor = color;
  if (baseCore && baseCore.isEnabled()) {
    const pulse = performance.now() < (context.basePulseUntil || 0) ? 0.35 : 0;
    const size = 1 + (1 - ratio) * 0.45 + pulse;
    baseCore.scaling = new BABYLON.Vector3(size, size, size);
  }
}

export function pulseBaseDamage(context) {
  context.basePulseUntil = performance.now() + 160;
}

export function createImpactEffect(scene, point, isAlienHit, effectsScale = 1) {
  if (!point) return;
  if (effectsScale <= 0.6 && !isAlienHit && Math.random() < 0.45) return;

  const impact = BABYLON.MeshBuilder.CreateSphere("Impact", {
    diameter: (isAlienHit ? 0.45 : 0.28) * effectsScale
  }, scene);
  impact.position = point.clone();
  impact.scaling = new BABYLON.Vector3(0.35, 0.35, 0.35);

  const mat = new BABYLON.StandardMaterial("ImpactMat" + Math.random(), scene);
  if (isAlienHit) {
    mat.diffuseColor = new BABYLON.Color3(0.2, 1, 0.2);
    mat.emissiveColor = new BABYLON.Color3(0.1, 0.8, 0.1);
  } else {
    mat.diffuseColor = new BABYLON.Color3(0, 0.9, 1);
    mat.emissiveColor = new BABYLON.Color3(0, 0.9, 1);
  }
  mat.alpha = 0.9;
  impact.material = mat;

  BABYLON.Animation.CreateAndStartAnimation(
    "impactScale",
    impact,
    "scaling",
    60,
    8,
    new BABYLON.Vector3(0.35, 0.35, 0.35),
    new BABYLON.Vector3(1.8, 1.8, 1.8),
    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
  );

  BABYLON.Animation.CreateAndStartAnimation(
    "impactFade",
    mat,
    "alpha",
    60,
    8,
    0.9,
    0,
    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
    null,
    () => {
      impact.dispose();
      mat.dispose();
    }
  );
}

export function flashAlienHit(alien) {
  if (!alien || alien.dead) return;
  alien.getChildMeshes().forEach(mesh => {
    if (!mesh.material) return;

    if (!mesh._baseEmissive) {
      mesh._baseEmissive = mesh.material.emissiveColor ? mesh.material.emissiveColor.clone() : new BABYLON.Color3(0, 0, 0);
    }

    mesh.material.emissiveColor = new BABYLON.Color3(0.9, 0.9, 0.9);

    if (mesh._flashHitTimeout) {
      clearTimeout(mesh._flashHitTimeout);
    }

    mesh._flashHitTimeout = setTimeout(() => {
      if (!mesh.isDisposed() && mesh.material && mesh._baseEmissive) {
        mesh.material.emissiveColor = mesh._baseEmissive;
      }
      mesh._flashHitTimeout = null;
    }, 90);
  });
}

export function createAlienExplosion(scene, alien, material, effectsScale = 1) {
  const explosion = BABYLON.MeshBuilder.CreateSphere("AlienExplosion", { diameter: 0.7 }, scene);
  explosion.position = alien.position.add(new BABYLON.Vector3(0, 1.2, 0));
  explosion.material = material;

  BABYLON.Animation.CreateAndStartAnimation(
    "explode",
    explosion,
    "scaling",
    60,
    12,
    new BABYLON.Vector3(1, 1, 1),
    new BABYLON.Vector3(3 * effectsScale, 3 * effectsScale, 3 * effectsScale),
    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
    null,
    () => explosion.dispose()
  );
}

export function createTracer(scene, camera, ray, bulletMat, powerScale = 1, effectsScale = 1) {
  if (effectsScale <= 0.6 && Math.random() < 0.22) return;
  const tracer = BABYLON.MeshBuilder.CreateCylinder("Tracer", {
    diameter: 0.035 * powerScale,
    height: 12 + powerScale * 1.5
  }, scene);
  tracer.material = bulletMat;
  tracer.rotation.x = Math.PI / 2;
  tracer.position = camera.position.add(ray.direction.scale(6));
  tracer.lookAt(camera.position.add(ray.direction.scale(20)));
  setTimeout(() => tracer.dispose(), 65);
}

// Active Gibs and Ground Decals pools
const activeGibs = [];
const activeDecals = [];
const MAX_ACTIVE_GIBS = 42;
const MAX_ACTIVE_DECALS = 32;

let cachedDecalTextures = {};

function getDecalTexture(scene, type) {
  try {
    const cached = cachedDecalTextures[type];
    if (cached && !cached._isDisposed && cached.isReady?.()) {
      return cached;
    }
  } catch (e) {
    // Regenerate texture if invalid
  }

  const dt = new BABYLON.DynamicTexture(`DecalTex_${type}`, 256, scene, false);
  const ctx = dt.getContext();
  const cx = 128;
  const cy = 128;

  ctx.clearRect(0, 0, 256, 256);

  let coreColor = "rgba(57, 255, 20, 0.92)";
  let rimColor = "rgba(25, 180, 10, 0.65)";
  let dripColor = "rgba(80, 255, 60, 0.85)";

  if (type === "wasp" || type === "runner") {
    coreColor = "rgba(0, 240, 255, 0.92)";
    rimColor = "rgba(0, 140, 220, 0.65)";
    dripColor = "rgba(80, 245, 255, 0.85)";
  } else if (type === "brute") {
    coreColor = "rgba(255, 120, 15, 0.95)";
    rimColor = "rgba(190, 60, 5, 0.68)";
    dripColor = "rgba(255, 160, 30, 0.85)";
  } else if (type === "boss") {
    coreColor = "rgba(255, 25, 20, 0.96)";
    rimColor = "rgba(160, 10, 10, 0.72)";
    dripColor = "rgba(255, 70, 50, 0.9)";
  }

  // Central irregular puddle
  ctx.fillStyle = rimColor;
  ctx.beginPath();
  const points = 16;
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const r = 52 + Math.sin(angle * 5) * 16 + Math.cos(angle * 3) * 12;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Core bubbling center
  ctx.fillStyle = coreColor;
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const r = 32 + Math.sin(angle * 4) * 9;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Radial splatter droplets
  ctx.fillStyle = dripColor;
  for (let i = 0; i < 28; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 55 + Math.random() * 58;
    const dropR = 2.5 + Math.random() * 5.5;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, dropR, 0, Math.PI * 2);
    ctx.fill();
  }

  dt.update();
  cachedDecalTextures[type] = dt;
  return dt;
}

export function createGroundAcidDecal(scene, position, variantType = "spitter", size = 2.4) {
  if (!position || !scene) return;
  try {
    if (activeDecals.length >= MAX_ACTIVE_DECALS) {
      const oldest = activeDecals.shift();
      if (oldest) {
        try { oldest.mesh?.dispose(); } catch (e) {}
        try { oldest.material?.dispose(); } catch (e) {}
      }
    }

    const decal = BABYLON.MeshBuilder.CreateDisc(`AcidDecal_${Math.random()}`, {
      radius: size * 0.5,
      tessellation: 20
    }, scene);
    decal.rotation.x = Math.PI / 2;
    decal.rotation.z = Math.random() * Math.PI * 2;
    decal.position = new BABYLON.Vector3(position.x, 0.035, position.z);
    decal.isPickable = false;
    decal.checkCollisions = false;

    const mat = new BABYLON.StandardMaterial(`AcidDecalMat_${Math.random()}`, scene);
    const tex = getDecalTexture(scene, variantType);
    if (tex) {
      mat.diffuseTexture = tex;
      mat.diffuseTexture.hasAlpha = true;
      mat.useAlphaFromDiffuseTexture = true;
    }
    mat.emissiveColor = new BABYLON.Color3(0.65, 0.65, 0.65);
    mat.specularColor = BABYLON.Color3.Black();
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    mat.alpha = 0.88;
    decal.material = mat;

    activeDecals.push({
      mesh: decal,
      material: mat,
      createdTime: performance.now(),
      maxLife: 15000
    });
  } catch (err) {
    console.warn("createGroundAcidDecal safely handled error:", err);
  }
}

export function updateGroundDecals(delta) {
  if (activeDecals.length === 0) return;
  const now = performance.now();
  for (let i = activeDecals.length - 1; i >= 0; i--) {
    const item = activeDecals[i];
    const age = now - item.createdTime;
    if (age >= item.maxLife) {
      item.mesh.dispose();
      item.material.dispose();
      activeDecals.splice(i, 1);
      continue;
    }
    const remaining = item.maxLife - age;
    if (remaining < 4000) {
      item.material.alpha = (remaining / 4000) * 0.88;
    }
  }
}

export function createAlienGibs(scene, position, variantType = "spitter", impactDir = null, effectsScale = 1) {
  if (!position) return;
  const gibColors = {
    spitter: { diffuse: new BABYLON.Color3(0.3, 0.95, 0.25), emissive: new BABYLON.Color3(0.2, 0.7, 0.15) },
    grunt: { diffuse: new BABYLON.Color3(0.4, 1.0, 0.2), emissive: new BABYLON.Color3(0.25, 0.8, 0.1) },
    wasp: { diffuse: new BABYLON.Color3(0.15, 0.85, 1.0), emissive: new BABYLON.Color3(0.1, 0.5, 0.8) },
    runner: { diffuse: new BABYLON.Color3(0.85, 0.25, 1.0), emissive: new BABYLON.Color3(0.5, 0.1, 0.8) },
    brute: { diffuse: new BABYLON.Color3(1.0, 0.42, 0.08), emissive: new BABYLON.Color3(0.7, 0.25, 0.04) },
    boss: { diffuse: new BABYLON.Color3(1.0, 0.1, 0.08), emissive: new BABYLON.Color3(0.8, 0.05, 0.02) }
  };
  const color = gibColors[variantType] || gibColors.spitter;

  const count = variantType === "boss" ? 8 : variantType === "brute" ? 6 : 5;
  const isHeavy = variantType === "boss" || variantType === "brute";

  for (let i = 0; i < count; i++) {
    if (activeGibs.length >= MAX_ACTIVE_GIBS) {
      const oldest = activeGibs.shift();
      oldest?.mesh?.dispose();
      oldest?.material?.dispose();
    }

    let mesh;
    const kind = i % 3;
    const s = (isHeavy ? 1.4 : 1.0) * effectsScale;

    if (kind === 0) {
      mesh = BABYLON.MeshBuilder.CreateBox(`GibCarapace_${Math.random()}`, {
        width: 0.32 * s,
        height: 0.20 * s,
        depth: 0.28 * s
      }, scene);
    } else if (kind === 1) {
      mesh = BABYLON.MeshBuilder.CreateCylinder(`GibSpike_${Math.random()}`, {
        diameterTop: 0.02 * s,
        diameterBottom: 0.14 * s,
        height: 0.42 * s,
        tessellation: 8
      }, scene);
    } else {
      mesh = BABYLON.MeshBuilder.CreateSphere(`GibGore_${Math.random()}`, {
        diameter: 0.24 * s,
        segments: 8
      }, scene);
    }

    mesh.position = position.clone();
    mesh.position.y += 0.8 + Math.random() * 0.8;
    mesh.isPickable = false;
    mesh.checkCollisions = false;

    const mat = new BABYLON.StandardMaterial(`GibMat_${Math.random()}`, scene);
    mat.diffuseColor = color.diffuse;
    mat.emissiveColor = color.emissive;
    mat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    mesh.material = mat;

    const angle = Math.random() * Math.PI * 2;
    const speed = 3.5 + Math.random() * 5.5;
    const dirBiasX = impactDir ? impactDir.x * 3.5 : 0;
    const dirBiasZ = impactDir ? impactDir.z * 3.5 : 0;

    activeGibs.push({
      mesh,
      material: mat,
      vx: Math.cos(angle) * speed + dirBiasX,
      vy: 4.5 + Math.random() * 4.5,
      vz: Math.sin(angle) * speed + dirBiasZ,
      rx: (Math.random() - 0.5) * 12,
      ry: (Math.random() - 0.5) * 12,
      rz: (Math.random() - 0.5) * 12,
      createdTime: performance.now(),
      maxLife: 3600
    });
  }
}

export function updateAlienGibs(delta) {
  if (activeGibs.length === 0) return;
  const dt = Math.min(0.05, delta / 1000);
  const now = performance.now();
  const gravity = 18.0;

  for (let i = activeGibs.length - 1; i >= 0; i--) {
    const gib = activeGibs[i];
    const age = now - gib.createdTime;

    if (age >= gib.maxLife) {
      gib.mesh.dispose();
      gib.material.dispose();
      activeGibs.splice(i, 1);
      continue;
    }

    const remaining = gib.maxLife - age;
    if (remaining < 700) {
      const scale = remaining / 700;
      gib.mesh.scaling.set(scale, scale, scale);
    }

    gib.vy -= gravity * dt;
    gib.mesh.position.x += gib.vx * dt;
    gib.mesh.position.y += gib.vy * dt;
    gib.mesh.position.z += gib.vz * dt;

    gib.mesh.rotation.x += gib.rx * dt;
    gib.mesh.rotation.y += gib.ry * dt;
    gib.mesh.rotation.z += gib.rz * dt;

    if (gib.mesh.position.y <= 0.08) {
      gib.mesh.position.y = 0.08;
      if (gib.vy < -1.6) {
        gib.vy = -gib.vy * 0.42;
        gib.vx *= 0.68;
        gib.vz *= 0.68;
        gib.rx *= 0.65;
        gib.ry *= 0.65;
        gib.rz *= 0.65;
      } else {
        gib.vy = 0;
        gib.vx *= 0.82;
        gib.vz *= 0.82;
        gib.rx *= 0.75;
        gib.ry *= 0.75;
        gib.rz *= 0.75;
      }
    }
  }
}

let visorSplatterTimeout = null;

export function triggerVisorAcidSplatter(ui, variantType = "spitter") {
  const el = ui?.visorSplatter || document.getElementById("visorSplatter");
  if (!el) return;

  const splatColors = {
    spitter: "radial-gradient(ellipse at 15% 18%, rgba(57, 255, 20, 0.45) 0%, transparent 45%), radial-gradient(circle at 82% 76%, rgba(57, 255, 20, 0.40) 0%, transparent 40%), radial-gradient(circle at 50% 92%, rgba(40, 200, 15, 0.35) 0%, transparent 35%)",
    wasp: "radial-gradient(ellipse at 85% 20%, rgba(0, 230, 255, 0.45) 0%, transparent 45%), radial-gradient(circle at 18% 82%, rgba(0, 230, 255, 0.38) 0%, transparent 38%)",
    brute: "radial-gradient(ellipse at 20% 25%, rgba(255, 120, 20, 0.5) 0%, transparent 50%), radial-gradient(circle at 78% 70%, rgba(220, 80, 10, 0.45) 0%, transparent 40%)",
    boss: "radial-gradient(ellipse at 18% 22%, rgba(255, 20, 20, 0.55) 0%, transparent 48%), radial-gradient(circle at 82% 80%, rgba(255, 30, 30, 0.48) 0%, transparent 44%), radial-gradient(circle at 50% 10%, rgba(200, 10, 10, 0.4) 0%, transparent 35%)"
  };

  el.style.background = splatColors[variantType] || splatColors.spitter;
  el.classList.add("splat-active");

  clearTimeout(visorSplatterTimeout);
  visorSplatterTimeout = setTimeout(() => {
    el.classList.remove("splat-active");
  }, 120);
}

let cachedFlameMatA = null;
let cachedFlameMatB = null;

export function createFlameStreamEffect(scene, camera, effectsScale = 1) {
  if (!scene || !camera) return;

  if (!cachedFlameMatA || cachedFlameMatA.isDisposed()) {
    cachedFlameMatA = new BABYLON.StandardMaterial("FlameMatA", scene);
    cachedFlameMatA.emissiveColor = new BABYLON.Color3(1.0, 0.42, 0.05);
    cachedFlameMatA.diffuseColor = new BABYLON.Color3(1.0, 0.25, 0.0);
    cachedFlameMatA.alpha = 0.85;
  }
  if (!cachedFlameMatB || cachedFlameMatB.isDisposed()) {
    cachedFlameMatB = new BABYLON.StandardMaterial("FlameMatB", scene);
    cachedFlameMatB.emissiveColor = new BABYLON.Color3(1.0, 0.82, 0.15);
    cachedFlameMatB.diffuseColor = new BABYLON.Color3(1.0, 0.6, 0.05);
    cachedFlameMatB.alpha = 0.9;
  }

  const forward = camera.getDirection(BABYLON.Vector3.Forward());
  const right = camera.getDirection(BABYLON.Vector3.Right());
  const up = camera.getDirection(BABYLON.Vector3.Up());
  const muzzlePos = camera.position.add(forward.scale(0.75)).add(right.scale(0.18)).add(up.scale(-0.14));

  const count = effectsScale <= 0.6 ? 2 : 4;
  for (let i = 0; i < count; i++) {
    const puff = BABYLON.MeshBuilder.CreateSphere("FlamePuff", { diameter: 0.34, segments: 6 }, scene);
    puff.isPickable = false;
    puff.checkCollisions = false;
    puff.material = i % 2 === 0 ? cachedFlameMatA : cachedFlameMatB;

    const spreadX = (Math.random() - 0.5) * 0.18;
    const spreadY = (Math.random() - 0.5) * 0.18;
    const dir = forward.add(right.scale(spreadX)).add(up.scale(spreadY)).normalize();
    const spawnDist = 0.4 + Math.random() * 0.7;
    puff.position = muzzlePos.add(dir.scale(spawnDist));

    const targetDist = 12 + Math.random() * 14;
    const endPos = muzzlePos.add(dir.scale(targetDist));
    const targetScale = (1.8 + Math.random() * 1.2) * (effectsScale || 1);

    const animDuration = 8;
    BABYLON.Animation.CreateAndStartAnimation(
      "flameMove",
      puff,
      "position",
      60,
      animDuration,
      puff.position,
      endPos,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    BABYLON.Animation.CreateAndStartAnimation(
      "flameGrow",
      puff,
      "scaling",
      60,
      animDuration,
      new BABYLON.Vector3(1, 1, 1),
      new BABYLON.Vector3(targetScale, targetScale, targetScale),
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
      null,
      () => {
        puff.dispose();
      }
    );
  }
}
