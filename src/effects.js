import * as BABYLON from "@babylonjs/core";

const GUN_REST_POSITION = new BABYLON.Vector3(0.82, -0.72, 1.04);
const GUN_RECOIL_POSITION = new BABYLON.Vector3(0.86, -0.69, 0.92);

export function showGunFireEffect({ gunRoot, muzzle }) {
  muzzle.isVisible = true;
  muzzle.scaling = new BABYLON.Vector3(1.9, 1.9, 1.9);

  gunRoot.position.copyFrom(GUN_RECOIL_POSITION);

  setTimeout(() => {
    muzzle.isVisible = false;
    muzzle.scaling = new BABYLON.Vector3(1, 1, 1);
    gunRoot.position.copyFrom(GUN_REST_POSITION);
  }, 60);
}

export function applyCameraShake(camera, intensity = 0.015) {
  camera.rotation.x += (Math.random() - 0.5) * intensity;
  camera.rotation.y += (Math.random() - 0.5) * intensity;
}

export function updateBaseShieldFeedback(context) {
  const { game, baseCore, materials } = context;
  const ratio = Math.max(0, Math.min(1, game.baseHealth / 100));
  const healthy = new BABYLON.Color3(0, 0.9, 1);
  const warning = new BABYLON.Color3(1, 0.08, 0.03);
  const color = BABYLON.Color3.Lerp(warning, healthy, ratio);
  materials.baseCore.emissiveColor = color;
  materials.baseCore.diffuseColor = color;
  const pulse = performance.now() < (context.basePulseUntil || 0) ? 0.35 : 0;
  const size = 1 + (1 - ratio) * 0.45 + pulse;
  baseCore.scaling = new BABYLON.Vector3(size, size, size);
}

export function pulseBaseDamage(context) {
  context.basePulseUntil = performance.now() + 160;
}

export function createImpactEffect(scene, point, isAlienHit) {
  if (!point) return;

  const impact = BABYLON.MeshBuilder.CreateSphere("Impact", {
    diameter: isAlienHit ? 0.45 : 0.28
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
  alien.getChildMeshes().forEach(mesh => {
    if (!mesh.material) return;

    const originalMaterial = mesh.material;
    const hitMaterial = originalMaterial.clone("HitFlashMat" + Math.random());
    hitMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
    mesh.material = hitMaterial;

    setTimeout(() => {
      if (!mesh.isDisposed()) mesh.material = originalMaterial;
      hitMaterial.dispose();
    }, 80);
  });
}

export function createAlienExplosion(scene, alien, material) {
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
    new BABYLON.Vector3(3, 3, 3),
    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
    null,
    () => explosion.dispose()
  );
}

export function createTracer(scene, camera, ray, bulletMat) {
  const tracer = BABYLON.MeshBuilder.CreateCylinder("Tracer", { diameter: 0.035, height: 12 }, scene);
  tracer.material = bulletMat;
  tracer.rotation.x = Math.PI / 2;
  tracer.position = camera.position.add(ray.direction.scale(6));
  tracer.lookAt(camera.position.add(ray.direction.scale(20)));
  setTimeout(() => tracer.dispose(), 65);
}
