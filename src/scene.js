import * as BABYLON from "@babylonjs/core";
import "@babylonjs/core/Culling/ray";
import { game, resetGameState } from "./gameState.js";
import { drawAlienMap, updateUI } from "./ui.js";
import { applyPlayerLocomotion, createPlayerCamera, keepPlayerInsideArena, resetPlayer } from "./player.js";
import { clearAliens, spawnWave, updateAliens } from "./aliens.js";
import { clearPickups, updatePickups } from "./pickups.js";
import { loadBestScore } from "./highScore.js";
import { BACKGROUND_ASSET_KEYS, CORE_ASSET_KEYS, cloneLoadedAsset, fitModelToLargestAxis, fitModelToLargestAxisOnGround, loadModelAssets } from "./assets.js";
import { updateBaseShieldFeedback, updateAlienGibs, updateGroundDecals, updateCameraShake } from "./effects.js";
import { createStarterTowers, refreshTowerModels, updateTowers } from "./towers.js";
import { loadSave, saveGame } from "./saveSystem.js";
import { setupShop, refreshShop } from "./shop.js";
import { setupStageSelect, STAGES } from "./stages.js";
import { setupGraphicsQuality } from "./graphics.js";
import { playSound, stopBossMusic, updateAudioListener, broadcastRadioComms } from "./sound.js";
import { requestPointerLockSafely } from "./pointerLock.js";
import { showRewardedContinueIfAvailable } from "./adBridge.js";
import { updateRockets } from "./weapons.js";
import { updateTacticalVoice, resetTacticalVoice } from "./tacticalVoice.js";

const FIRST_RUN_ASSET_KEYS = [
  "fpsHeavyShotgun",
  "fpsRocketLauncher",
  "rifle",
  "plasmaCannon",
  "turretGatlingHeavy",
  "turretCryoBeam",
  "alienSpitter",
  "alienScoutWasp",
  "alienGoliathBoss",
  "scifiFusionCore",
  "supplyDropPod",
  "streetPlanterBarrier",
  "sandbagWall",
  "roadBarricadeUrdu",
  "marketStallCrates"
];

function createProceduralGroundTexture(scene, game) {
  const size = 1024;
  const texture = new BABYLON.DynamicTexture("GroundTarmacTexture", size, scene, false);
  const ctx = texture.getContext();

  // Dark asphalt base
  ctx.fillStyle = "#0d1015";
  ctx.fillRect(0, 0, size, size);

  // Gritty asphalt noise / tarmac flecks
  for (let i = 0; i < 24000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const shade = Math.floor(18 + Math.random() * 30);
    ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 5})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  const cx = size / 2;
  const cy = size / 2;
  const pxPerMeter = size / 90;

  // Sci-fi hexagonal circuit grid (subtle neon glow)
  ctx.strokeStyle = "rgba(0, 190, 255, 0.08)";
  ctx.lineWidth = 1.5;
  const hexRadius = 42;
  for (let gx = 0; gx < size; gx += hexRadius * 1.5) {
    for (let gy = 0; gy < size; gy += hexRadius * 1.732) {
      const offsetX = (Math.floor(gy / (hexRadius * 1.732)) % 2) * hexRadius * 0.75;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const ang = (k * Math.PI) / 3;
        const hx = gx + offsetX + hexRadius * 0.46 * Math.cos(ang);
        const hy = gy + hexRadius * 0.46 * Math.sin(ang);
        if (k === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  // Outer Arena Perimeter Ring (arenaRadius)
  const outerR = (game.arenaRadius || 28) * pxPerMeter;
  ctx.save();
  ctx.strokeStyle = "rgba(0, 220, 255, 0.45)";
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 14]);
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.stroke();

  // Radial boundary tick marks
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(0, 220, 255, 0.28)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 36; i++) {
    const ang = (i / 36) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * (outerR - 12), cy + Math.sin(ang) * (outerR - 12));
    ctx.lineTo(cx + Math.cos(ang) * (outerR + 12), cy + Math.sin(ang) * (outerR + 12));
    ctx.stroke();
  }
  ctx.restore();

  // Inner Base Red Danger Ring (baseRadius)
  const innerR = (game.baseRadius || 8) * pxPerMeter;
  ctx.save();
  ctx.strokeStyle = "rgba(255, 45, 30, 0.65)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.stroke();

  // Yellow hazard dashed stripe
  ctx.strokeStyle = "rgba(255, 205, 0, 0.75)";
  ctx.lineWidth = 3.5;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.arc(cx, cy, innerR - 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Sci-fi base defense stencils
  ctx.fillStyle = "rgba(0, 230, 255, 0.75)";
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  ctx.fillText("SECTOR 07 • LAHORE BASE DEFENSE PERIMETER", cx, cy - innerR - 18);
  ctx.fillText("RESTRICTED COMBAT ZONE — LETHAL FORCE ACTIVE", cx, cy + innerR + 26);

  texture.update();
  return texture;
}

function createPerimeterFloodlights(scene) {
  const corners = [
    { x: 26, z: 26, rotY: Math.PI * 1.25 },
    { x: -26, z: 26, rotY: Math.PI * 0.75 },
    { x: -26, z: -26, rotY: Math.PI * 0.25 },
    { x: 26, z: -26, rotY: Math.PI * 1.75 }
  ];

  const poleMat = new BABYLON.StandardMaterial("FloodlightPoleMat", scene);
  poleMat.diffuseColor = new BABYLON.Color3(0.12, 0.14, 0.18);
  poleMat.specularColor = new BABYLON.Color3(0.55, 0.6, 0.65);

  const lampMat = new BABYLON.StandardMaterial("FloodlightLampMat", scene);
  lampMat.diffuseColor = new BABYLON.Color3(0.9, 0.95, 1);
  lampMat.emissiveColor = new BABYLON.Color3(0.85, 0.92, 1);

  corners.forEach((c, idx) => {
    const mast = BABYLON.MeshBuilder.CreateCylinder(`FloodMast_${idx}`, {
      diameterTop: 0.24,
      diameterBottom: 0.42,
      height: 7.2,
      tessellation: 8
    }, scene);
    mast.position = new BABYLON.Vector3(c.x, 3.6, c.z);
    mast.material = poleMat;
    mast.checkCollisions = true;

    const head = BABYLON.MeshBuilder.CreateBox(`FloodHead_${idx}`, {
      width: 1.3,
      height: 0.45,
      depth: 0.55
    }, scene);
    head.position = new BABYLON.Vector3(c.x, 7.2, c.z);
    head.rotation.y = c.rotY;
    head.material = poleMat;

    const lens = BABYLON.MeshBuilder.CreatePlane(`FloodLens_${idx}`, {
      width: 1.1,
      height: 0.38
    }, scene);
    lens.position = new BABYLON.Vector3(c.x, 7.2, c.z);
    lens.rotation.y = c.rotY;
    lens.rotation.x = 0.35;
    lens.material = lampMat;

    const spot = new BABYLON.SpotLight(
      `FloodSpot_${idx}`,
      new BABYLON.Vector3(c.x, 7.2, c.z),
      new BABYLON.Vector3(-c.x, -5, -c.z).normalize(),
      Math.PI / 3.2,
      24,
      scene
    );
    spot.diffuse = new BABYLON.Color3(0.82, 0.9, 1);
    spot.intensity = 0.85;
    spot.range = 45;
  });
}

function createMaterials(scene, game) {
  const ground = new BABYLON.StandardMaterial("GroundMat", scene);
  ground.diffuseTexture = createProceduralGroundTexture(scene, game);
  ground.specularColor = new BABYLON.Color3(0.22, 0.25, 0.32);
  ground.specularPower = 32;

  const zone = new BABYLON.StandardMaterial("DefenseZoneMat", scene);
  zone.diffuseColor = new BABYLON.Color3(0, 0.7, 1);
  zone.emissiveColor = new BABYLON.Color3(0, 0.25, 0.45);
  zone.alpha = 0.45;

  const danger = new BABYLON.StandardMaterial("DangerZoneMat", scene);
  danger.diffuseColor = new BABYLON.Color3(1, 0.05, 0.05);
  danger.emissiveColor = new BABYLON.Color3(0.45, 0.02, 0.02);
  danger.alpha = 0.5;

  const bullet = new BABYLON.StandardMaterial("BulletMat", scene);
  bullet.diffuseColor = new BABYLON.Color3(0, 0.9, 1);
  bullet.emissiveColor = new BABYLON.Color3(0, 0.9, 1);

  const baseCore = new BABYLON.StandardMaterial("BaseCoreMat", scene);
  baseCore.diffuseColor = new BABYLON.Color3(0, 0.9, 1);
  baseCore.emissiveColor = new BABYLON.Color3(0, 0.9, 1);

  const alien = new BABYLON.StandardMaterial("AlienMat", scene);
  alien.diffuseColor = new BABYLON.Color3(0.18, 0.82, 0.22);
  alien.emissiveColor = new BABYLON.Color3(0.04, 0.16, 0.04);

  const alienEye = new BABYLON.StandardMaterial("AlienEyeMat", scene);
  alienEye.diffuseColor = new BABYLON.Color3(1, 0.05, 0.02);
  alienEye.emissiveColor = new BABYLON.Color3(1, 0.05, 0.02);

  const base = new BABYLON.StandardMaterial("BaseMat", scene);
  base.diffuseColor = new BABYLON.Color3(0.08, 0.09, 0.11);
  base.specularColor = new BABYLON.Color3(0.8, 0.85, 0.9);

  const gun = new BABYLON.StandardMaterial("GunMat", scene);
  gun.diffuseColor = new BABYLON.Color3(0.08, 0.09, 0.11);
  gun.specularColor = new BABYLON.Color3(0.8, 0.85, 0.9);

  return { ground, zone, danger, bullet, baseCore, alien, alienEye, base, gun };
}

function createEnvironment(scene, game, materials) {
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogColor = new BABYLON.Color3(0.012, 0.018, 0.032);
  scene.fogDensity = 0.011;

  // Cinematic Sci-Fi Bloom Glow Layer
  try {
    const glow = new BABYLON.GlowLayer("glow", scene, {
      mainTextureRatio: 0.5,
      blurKernelSize: 24
    });
    glow.intensity = 0.22;
    scene.glowLayer = glow;
  } catch (e) {
    console.warn("GlowLayer disabled:", e);
  }

  const light = new BABYLON.HemisphericLight("SkyLight", new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.28;
  light.groundColor = new BABYLON.Color3(0.01, 0.02, 0.04);

  const moonLight = new BABYLON.DirectionalLight("MoonLight", new BABYLON.Vector3(-0.35, -1, 0.45), scene);
  moonLight.position = new BABYLON.Vector3(20, 40, -20);
  moonLight.diffuse = new BABYLON.Color3(0.22, 0.32, 0.52);
  moonLight.intensity = 0.65;

  const ground = BABYLON.MeshBuilder.CreateGround("Ground", { width: 90, height: 90 }, scene);
  ground.material = materials.ground;
  ground.receiveShadows = true;
  ground.checkCollisions = true;

  const defenseZone = BABYLON.MeshBuilder.CreateTorus("DefenseZone", {
    diameter: game.arenaRadius * 2,
    thickness: 0.16,
    tessellation: 128
  }, scene);
  defenseZone.position.y = 0.08;
  defenseZone.material = materials.zone;

  const innerDangerZone = BABYLON.MeshBuilder.CreateTorus("InnerDangerZone", {
    diameter: game.baseRadius * 2,
    thickness: 0.24,
    tessellation: 128
  }, scene);
  innerDangerZone.position.y = 0.12;
  innerDangerZone.material = materials.danger;

  const baseTower = BABYLON.MeshBuilder.CreateCylinder("BaseTower", {
    diameterTop: 1.3,
    diameterBottom: 2.2,
    height: 3.2,
    tessellation: 12
  }, scene);
  baseTower.position = new BABYLON.Vector3(0, 1.6, 0);
  baseTower.material = materials.base;
  baseTower.metadata = { fallbackBase: true };

  const baseCore = BABYLON.MeshBuilder.CreateSphere("BaseCore", { diameter: 0.75 }, scene);
  baseCore.position = new BABYLON.Vector3(0, 3.55, 0);
  baseCore.material = materials.baseCore;

  const beacon = BABYLON.MeshBuilder.CreateTorus("BaseBeacon", { diameter: 4.2, thickness: 0.035, tessellation: 96 }, scene);
  beacon.position = new BABYLON.Vector3(0, 3.55, 0);
  beacon.material = materials.baseCore;

  for (let i = 0; i < 42; i++) {
    const rock = BABYLON.MeshBuilder.CreateBox("Debris", {
      width: 0.8 + Math.random() * 2.2,
      height: 0.2 + Math.random() * 0.9,
      depth: 0.8 + Math.random() * 2.2
    }, scene);
    rock.position = new BABYLON.Vector3((Math.random() - 0.5) * 80, 0.15, (Math.random() - 0.5) * 80);
    rock.rotation.y = Math.random() * Math.PI;
    rock.material = materials.ground;
    rock.checkCollisions = true;
  }

  createOuterArenaDetails(scene, materials);
  createNightSkyDome(scene);
  createPanoramicSkyline(scene);
  createAlienBloodMoon(scene);
  createAlienBioMist(scene);
  createPerimeterBillboards(scene);
  createSkyscrapers(scene);
  createPerimeterFloodlights(scene);

  return { baseCore, beacon, baseTower };
}

function attachBaseCoreModel(context) {
  if (context.baseModel) return;
  const coreAsset = context.loadedAssets?.scifiFusionCore;
  if (!coreAsset) return;
  const core = cloneLoadedAsset(coreAsset, "SciFiFusionCoreModel", {
    isPickable: false
  });
  if (!core) return;
  fitModelToLargestAxisOnGround(core, 4.4, 0);
  core.position = new BABYLON.Vector3(0, 0, 0);
  context.baseModel = core;
  if (context.baseTower) context.baseTower.setEnabled(false);
  if (context.baseCore) context.baseCore.setEnabled(false);
  if (context.beacon) context.beacon.setEnabled(false);

  if (context.shadowGenerator?.getShadowMap()) {
    const renderList = context.shadowGenerator.getShadowMap().renderList;
    if (renderList) {
      core.getChildMeshes(false).forEach(m => renderList.push(m));
    }
  }
}

function clearStageTheme(context) {
  if (context.shadowGenerator?.getShadowMap()) {
    const renderList = context.shadowGenerator.getShadowMap().renderList;
    if (renderList) {
      const stageMeshes = new Set();
      context.stageThemeMeshes.forEach(mesh => {
        if (mesh.getChildMeshes) {
          mesh.getChildMeshes(false).forEach(m => stageMeshes.add(m));
        }
        stageMeshes.add(mesh);
      });
      context.shadowGenerator.getShadowMap().renderList = renderList.filter(m => !stageMeshes.has(m) && !m.isDisposed());
    }
  }
  context.stageThemeMeshes.forEach(mesh => mesh.dispose());
  context.stageThemeMeshes = [];
}

let currentWeatherParticleSystem = null;
let lightningObserver = null;

function updateStageWeather(context) {
  const { scene, game } = context;
  if (!scene) return;

  if (currentWeatherParticleSystem) {
    try {
      currentWeatherParticleSystem.stop();
      currentWeatherParticleSystem.dispose();
    } catch (e) {}
    currentWeatherParticleSystem = null;
  }
  if (lightningObserver) {
    scene.onBeforeRenderObservable.remove(lightningObserver);
    lightningObserver = null;
  }

  const stage = STAGES[game.selectedStage];
  const weather = stage?.weather || "smog";

  if (weather === "rain") {
    scene.fogColor = new BABYLON.Color3(0.015, 0.022, 0.038);
    scene.fogDensity = 0.014;

    const rain = new BABYLON.ParticleSystem("RainWeather", 1200, scene);
    rain.emitter = new BABYLON.Vector3(0, 22, 0);
    rain.minEmitBox = new BABYLON.Vector3(-28, 0, -28);
    rain.maxEmitBox = new BABYLON.Vector3(28, 0, 28);
    rain.color1 = new BABYLON.Color4(0.5, 0.7, 1.0, 0.6);
    rain.color2 = new BABYLON.Color4(0.3, 0.5, 0.8, 0.3);
    rain.minSize = 0.06;
    rain.maxSize = 0.14;
    rain.minLifeTime = 0.65;
    rain.maxLifeTime = 0.85;
    rain.emitRate = 800;
    rain.gravity = new BABYLON.Vector3(2.5, -42, 1.5);
    rain.direction1 = new BABYLON.Vector3(1, -1, 0.5);
    rain.direction2 = new BABYLON.Vector3(1.5, -1, 1);
    rain.start();
    currentWeatherParticleSystem = rain;

    let nextLightningTime = performance.now() + 6000 + Math.random() * 6000;
    const skyLight = scene.getLightByName("SkyLight");
    const baseSkyIntensity = skyLight ? skyLight.intensity : 0.28;

    lightningObserver = scene.onBeforeRenderObservable.add(() => {
      const now = performance.now();
      if (now >= nextLightningTime) {
        nextLightningTime = now + 9000 + Math.random() * 8000;
        if (skyLight) skyLight.intensity = 1.6;
        scene.clearColor = new BABYLON.Color4(0.4, 0.55, 0.7, 1.0);
        setTimeout(() => {
          if (skyLight) skyLight.intensity = baseSkyIntensity;
          scene.clearColor = new BABYLON.Color4(0.01, 0.01, 0.02, 1.0);
        }, 120);
      }
    });

  } else if (weather === "sandstorm") {
    scene.fogColor = new BABYLON.Color3(0.048, 0.028, 0.014);
    scene.fogDensity = 0.024;

    const sand = new BABYLON.ParticleSystem("SandWeather", 900, scene);
    sand.emitter = new BABYLON.Vector3(-26, 6, 0);
    sand.minEmitBox = new BABYLON.Vector3(0, -6, -28);
    sand.maxEmitBox = new BABYLON.Vector3(0, 14, 28);
    sand.color1 = new BABYLON.Color4(0.85, 0.55, 0.25, 0.45);
    sand.color2 = new BABYLON.Color4(0.65, 0.38, 0.15, 0.15);
    sand.minSize = 0.15;
    sand.maxSize = 0.35;
    sand.minLifeTime = 1.4;
    sand.maxLifeTime = 2.2;
    sand.emitRate = 500;
    sand.gravity = new BABYLON.Vector3(26, -2.5, 0);
    sand.start();
    currentWeatherParticleSystem = sand;

  } else if (weather === "snow") {
    scene.fogColor = new BABYLON.Color3(0.018, 0.026, 0.038);
    scene.fogDensity = 0.013;

    const snow = new BABYLON.ParticleSystem("SnowWeather", 800, scene);
    snow.emitter = new BABYLON.Vector3(0, 18, 0);
    snow.minEmitBox = new BABYLON.Vector3(-28, 0, -28);
    snow.maxEmitBox = new BABYLON.Vector3(28, 0, 28);
    snow.color1 = new BABYLON.Color4(0.9, 0.95, 1.0, 0.7);
    snow.color2 = new BABYLON.Color4(0.7, 0.85, 1.0, 0.3);
    snow.minSize = 0.08;
    snow.maxSize = 0.22;
    snow.minLifeTime = 2.2;
    snow.maxLifeTime = 3.4;
    snow.emitRate = 350;
    snow.gravity = new BABYLON.Vector3(1.2, -6.5, 0.8);
    snow.start();
    currentWeatherParticleSystem = snow;

  } else {
    scene.fogColor = new BABYLON.Color3(0.028, 0.022, 0.016);
    scene.fogDensity = 0.011;

    const smog = new BABYLON.ParticleSystem("SmogWeather", 400, scene);
    smog.emitter = new BABYLON.Vector3(0, 4, 0);
    smog.minEmitBox = new BABYLON.Vector3(-26, -3, -26);
    smog.maxEmitBox = new BABYLON.Vector3(26, 12, 26);
    smog.color1 = new BABYLON.Color4(1.0, 0.65, 0.2, 0.35);
    smog.color2 = new BABYLON.Color4(0.9, 0.4, 0.1, 0.05);
    smog.minSize = 0.08;
    smog.maxSize = 0.18;
    smog.minLifeTime = 3.0;
    smog.maxLifeTime = 5.0;
    smog.emitRate = 90;
    smog.gravity = new BABYLON.Vector3(0.4, 0.8, 0.3);
    smog.start();
    currentWeatherParticleSystem = smog;
  }
}

function refreshStageTheme(context) {
  clearStageTheme(context);
  updateStageWeather(context);
  const { scene, game } = context;
  const palette = getStagePalette(game.selectedStage);
  const selectedStage = game.selectedStage;

  const panelMat = new BABYLON.StandardMaterial(`StagePanel_${game.selectedStage}`, scene);
  panelMat.diffuseColor = new BABYLON.Color3(0.08, 0.12, 0.18);
  panelMat.emissiveColor = palette.accent.scale(0.12);
  panelMat.specularColor = new BABYLON.Color3(0.2, 0.25, 0.3);

  const basePanels = [
    new BABYLON.Vector3(3.2, 0.9, 2.8),
    new BABYLON.Vector3(-3.2, 0.9, 2.8),
    new BABYLON.Vector3(3.2, 0.9, -2.8),
    new BABYLON.Vector3(-3.2, 0.9, -2.8)
  ];
  basePanels.forEach(position => {
    const panel = BABYLON.MeshBuilder.CreateBox(`${palette.prefix}BasePanel`, { width: 1.2, height: 1.1, depth: 0.12 }, scene);
    panel.position = position;
    panel.lookAt(BABYLON.Vector3.Zero());
    panel.material = panelMat;
    context.stageThemeMeshes.push(panel);
  });

  palette.props.forEach(prop => {
    if (prop.assetKey && addStageAssetProp(context, prop)) return;

    const box = BABYLON.MeshBuilder.CreateBox(prop.name, prop.size, scene);
    box.position = prop.position.clone();
    box.position.y += (prop.size?.height || 0) * 0.5;
    box.rotation.y = prop.rotation;
    box.material = panelMat;
    box.checkCollisions = Boolean(prop.checkCollisions);
    context.stageThemeMeshes.push(box);
  });

  const missingAssetKeys = palette.props
    .map(prop => prop.assetKey)
    .filter(Boolean)
    .filter(assetKey => !Object.prototype.hasOwnProperty.call(context.loadedAssets, assetKey));

  if (missingAssetKeys.length > 0 && context.stageAssetLoadingEnabled) {
    const loadToken = Symbol(selectedStage);
    context.stageThemeLoadToken = loadToken;
    loadModelAssets(scene, context.loadedAssets, missingAssetKeys).then(() => {
      if (context.stageThemeLoadToken === loadToken && game.selectedStage === selectedStage) {
        refreshStageTheme(context);
      }
    });
  }
}

function getStageAssetKeys(stageId) {
  return getStagePalette(stageId).props
    .map(prop => prop.assetKey)
    .filter(Boolean);
}

function addStageAssetProp(context, prop) {
  const { loadedAssets } = context;
  const asset = loadedAssets[prop.assetKey];
  if (!asset) return false;

  const model = cloneLoadedAsset(asset, prop.name, {
    isPickable: false
  });
  if (!model) return false;

  const fitted = fitModelToLargestAxisOnGround(model, prop.targetSize || 3, prop.groundY || 0);
  if (!fitted) {
    model.dispose();
    return false;
  }

  model.position.x += prop.position.x;
  model.position.y += prop.position.y;
  model.position.z += prop.position.z;
  model.rotation = new BABYLON.Vector3(0, prop.rotation || 0, 0);
  model.getChildMeshes(false).forEach(mesh => {
    mesh.checkCollisions = Boolean(prop.checkCollisions);
  });
  if (context.shadowGenerator?.getShadowMap()) {
    const renderList = context.shadowGenerator.getShadowMap().renderList;
    if (renderList) {
      model.getChildMeshes(false).forEach(m => renderList.push(m));
    }
  }
  context.stageThemeMeshes.push(model);
  return true;
}

const SHARED_STAGE_PROPS = [
  {
    name: "StreetPlanterBarrier",
    assetKey: "streetPlanterBarrier",
    position: new BABYLON.Vector3(18, 0, 18),
    targetSize: 3.7,
    rotation: 0.75,
    size: { width: 3.2, height: 1.0, depth: 1.0 },
    material: "secondary",
    checkCollisions: true
  },
  {
    name: "StreetPlanterBarrier",
    assetKey: "streetPlanterBarrier",
    position: new BABYLON.Vector3(-21, 0, -10),
    targetSize: 3.4,
    rotation: -0.35,
    size: { width: 3.2, height: 1.0, depth: 1.0 },
    material: "secondary",
    checkCollisions: true
  },
  {
    name: "SandbagWall",
    assetKey: "sandbagWall",
    position: new BABYLON.Vector3(9, 0, -22),
    targetSize: 4.3,
    rotation: -0.1,
    size: { width: 3.3, height: 1.1, depth: 0.8 },
    material: "accent",
    checkCollisions: true
  },
  {
    name: "SandbagWall",
    assetKey: "sandbagWall",
    position: new BABYLON.Vector3(-10, 0, 22),
    targetSize: 4.1,
    rotation: 0.25,
    size: { width: 3.3, height: 1.1, depth: 0.8 },
    material: "accent",
    checkCollisions: true
  },
  {
    name: "RoadBarricadeUrdu",
    assetKey: "roadBarricadeUrdu",
    position: new BABYLON.Vector3(23, 0, -4),
    targetSize: 3.4,
    rotation: 1.35,
    size: { width: 2.3, height: 1.1, depth: 0.25 },
    material: "sign",
    checkCollisions: true
  },
  {
    name: "RoadBarricadeUrdu",
    assetKey: "roadBarricadeUrdu",
    position: new BABYLON.Vector3(-23, 0, 6),
    targetSize: 3.4,
    rotation: 1.35,
    size: { width: 2.3, height: 1.1, depth: 0.25 },
    material: "sign",
    checkCollisions: true
  },
  {
    name: "SectorSignBoard",
    assetKey: "sectorSignBoard",
    position: new BABYLON.Vector3(3, 0, 25),
    targetSize: 3.7,
    rotation: 0,
    size: { width: 2.8, height: 1.6, depth: 1.5 },
    material: "sign",
    checkCollisions: true
  },
  {
    name: "CityWatchtower",
    assetKey: "cityWatchtower",
    position: new BABYLON.Vector3(-25, 0, -19),
    targetSize: 4.7,
    rotation: 0.15,
    size: { width: 0.7, height: 4.4, depth: 0.7 },
    material: "sign",
    checkCollisions: true
  }
];

const STAGE_PROP_ROTATION = {
  "lahore-outskirts": 0,
  "food-street": 0.32,
  "minar-zone": -0.28,
  "karachi-harbor": 0.55,
  "islamabad-sector": -0.48,
  "peshawar-gate": 0.82
};

function withSharedStageProps(stageId, palette) {
  return {
    ...palette,
    props: [
      ...palette.props,
      ...getSharedStageProps(stageId, palette.prefix)
    ]
  };
}

function getSharedStageProps(stageId, prefix) {
  const rotationOffset = STAGE_PROP_ROTATION[stageId] || 0;
  return SHARED_STAGE_PROPS.map((prop, index) => ({
    ...prop,
    name: `${prefix}Shared${prop.name}${index + 1}`,
    position: rotateAroundCenter(prop.position, rotationOffset),
    rotation: prop.rotation + rotationOffset
  }));
}

function rotateAroundCenter(position, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new BABYLON.Vector3(
    position.x * cos - position.z * sin,
    position.y,
    position.x * sin + position.z * cos
  );
}

function getStagePalette(stageId) {
  const common = {
    lahore: {
      prefix: "Lahore",
      accent: new BABYLON.Color3(0.95, 0.14, 0.32),
      secondary: new BABYLON.Color3(0.98, 0.72, 0.2),
      sign: new BABYLON.Color3(0.05, 0.35, 0.2),
      props: [
        { name: "MarketStallCrates", assetKey: "marketStallCrates", position: new BABYLON.Vector3(15, 0, 11), targetSize: 4.2, rotation: 0.3, size: { width: 2.4, height: 1.4, depth: 1.2 }, material: "secondary", checkCollisions: true },
        { name: "UpgradeShopWorkbench", assetKey: "upgradeShopWorkbench", position: new BABYLON.Vector3(-16, 0, -12), targetSize: 4, rotation: -0.5, size: { width: 2.4, height: 1.4, depth: 1.2 }, material: "secondary", checkCollisions: true },
        { name: "MarketStallCrates", assetKey: "marketStallCrates", position: new BABYLON.Vector3(-10, 0, 15), targetSize: 3.6, rotation: -0.8, size: { width: 2.8, height: 1.2, depth: 1.2 }, material: "secondary", checkCollisions: true }
      ]
    }
  };

  if (stageId === "karachi-harbor") {
    return withSharedStageProps(stageId, {
      prefix: "Karachi",
      accent: new BABYLON.Color3(0.05, 0.45, 0.85),
      secondary: new BABYLON.Color3(0.95, 0.38, 0.08),
      sign: new BABYLON.Color3(0.08, 0.22, 0.32),
      props: [
        { name: "KarachiContainerA", assetKey: "karachiShippingContainer", position: new BABYLON.Vector3(17, 0, 9), targetSize: 4.8, rotation: 0.1, size: { width: 3.6, height: 1.4, depth: 1.3 }, material: "secondary", checkCollisions: true },
        { name: "KarachiContainerB", assetKey: "karachiShippingContainer", position: new BABYLON.Vector3(-15, 0, -13), targetSize: 5.4, rotation: -0.4, size: { width: 4.2, height: 1.4, depth: 1.3 }, material: "accent", checkCollisions: true },
        { name: "KarachiContainerC", assetKey: "karachiShippingContainer", position: new BABYLON.Vector3(8, 0, -18), targetSize: 4.6, rotation: 1.1, size: { width: 3.8, height: 1.4, depth: 1.3 }, material: "accent", checkCollisions: true }
      ]
    });
  }

  if (stageId === "islamabad-sector") {
    return withSharedStageProps(stageId, {
      prefix: "Islamabad",
      accent: new BABYLON.Color3(0.75, 0.85, 0.9),
      secondary: new BABYLON.Color3(0.14, 0.55, 0.35),
      sign: new BABYLON.Color3(0.3, 0.42, 0.5),
      props: [
        { name: "SectorSignBoard", assetKey: "sectorSignBoard", position: new BABYLON.Vector3(15, 0, 12), targetSize: 4.2, rotation: 0.45, size: { width: 2.8, height: 1.6, depth: 1.5 }, material: "accent", checkCollisions: true },
        { name: "SectorSignBoard", assetKey: "sectorSignBoard", position: new BABYLON.Vector3(4, 0, -17), targetSize: 3.8, rotation: -0.25, size: { width: 2.8, height: 1.6, depth: 1.5 }, material: "accent", checkCollisions: true }
      ]
    });
  }

  if (stageId === "peshawar-gate") {
    return withSharedStageProps(stageId, {
      prefix: "Peshawar",
      accent: new BABYLON.Color3(0.68, 0.38, 0.18),
      secondary: new BABYLON.Color3(0.88, 0.68, 0.38),
      sign: new BABYLON.Color3(0.25, 0.18, 0.12),
      props: [
        { name: "PeshawarGate", assetKey: "peshawarGate", position: new BABYLON.Vector3(15, 0, 11), targetSize: 5.2, rotation: 0, size: { width: 4.0, height: 2.8, depth: 1.2 }, material: "accent", checkCollisions: true },
        { name: "MarketStallCrates", assetKey: "marketStallCrates", position: new BABYLON.Vector3(-16, 0, -13), targetSize: 4.4, rotation: -0.35, size: { width: 3.2, height: 1.4, depth: 1.3 }, material: "secondary", checkCollisions: true },
        { name: "PeshawarGateSmall", assetKey: "peshawarGate", position: new BABYLON.Vector3(-20, 0, 7), targetSize: 4.2, rotation: 0.9, size: { width: 4.0, height: 2.8, depth: 1.2 }, material: "accent", checkCollisions: true }
      ]
    });
  }

  return withSharedStageProps(stageId, common.lahore);
}

function createOuterArenaDetails(scene, materials) {
  const crystalMat = new BABYLON.StandardMaterial("CrystalMat", scene);
  crystalMat.diffuseColor = new BABYLON.Color3(0.18, 0.55, 0.78);
  crystalMat.emissiveColor = new BABYLON.Color3(0.02, 0.13, 0.22);

  const postMat = new BABYLON.StandardMaterial("PostMat", scene);
  postMat.diffuseColor = new BABYLON.Color3(0.12, 0.13, 0.16);
  postMat.specularColor = new BABYLON.Color3(0.4, 0.45, 0.5);

  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const radius = 33 + Math.random() * 6;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const post = BABYLON.MeshBuilder.CreateCylinder("PerimeterPost", { diameter: 0.3, height: 2.2, tessellation: 6 }, scene);
    post.position = new BABYLON.Vector3(x, 1.1, z);
    post.rotation.y = angle;
    post.material = postMat;

    if (i % 2 === 0) {
      const crystal = BABYLON.MeshBuilder.CreatePolyhedron("EnergyCrystal", { type: 1, size: 0.8 }, scene);
      crystal.position = new BABYLON.Vector3(x * 1.08, 0.75, z * 1.08);
      crystal.rotation.y = Math.random() * Math.PI;
      crystal.scaling.y = 1.8;
      crystal.material = crystalMat;
    }
  }

  const starMat = new BABYLON.StandardMaterial("StarMat", scene);
  starMat.emissiveColor = new BABYLON.Color3(0.8, 0.95, 1);
  for (let i = 0; i < 70; i++) {
    const star = BABYLON.MeshBuilder.CreateSphere("Star", { diameter: 0.045 + Math.random() * 0.045 }, scene);
    star.position = new BABYLON.Vector3((Math.random() - 0.5) * 95, 14 + Math.random() * 26, (Math.random() - 0.5) * 95);
    star.material = starMat;
    star.isPickable = false;
  }
}

const BILLBOARD_TEXTURE_PATHS = [
  "/textures/billboards/billboard_highway_lahore.jpg",
  "/textures/billboards/billboard_gourmet.jpg",
  "/textures/billboards/billboard_jazz4g.jpg",
  "/textures/billboards/billboard_metrobus.jpg",
  "/textures/billboards/billboard_pakola.jpg",
  "/textures/billboards/billboard_shezan.jpg",
  "/textures/billboards/billboard_tapal.jpg"
];

function createNightSkyDome(scene) {
  // Deep midnight cosmic sphere enclosing the upper sky
  const skyDome = BABYLON.MeshBuilder.CreateSphere("NightSkyDome", { diameter: 290, segments: 16, sideOrientation: BABYLON.Mesh.BACKSIDE }, scene);
  skyDome.position = new BABYLON.Vector3(0, 0, 0);
  skyDome.isPickable = false;

  const skyMat = new BABYLON.StandardMaterial("NightSkyMat", scene);
  skyMat.diffuseColor = new BABYLON.Color3(0.005, 0.008, 0.018);
  skyMat.emissiveColor = new BABYLON.Color3(0.005, 0.008, 0.018);
  skyMat.specularColor = BABYLON.Color3.Black();
  skyMat.disableLighting = true;
  skyMat.backFaceCulling = false;
  skyDome.material = skyMat;
}

function createPanoramicSkyline(scene) {
  // Panoramic Lahore Skyline Backdrop in Nocturnal Alien Night Mode
  const radius = 125;
  const height = 36;
  const panorama = BABYLON.MeshBuilder.CreateCylinder("LahoreSkylinePanorama", {
    diameter: radius * 2,
    height: height,
    tessellation: 64,
    sideOrientation: BABYLON.Mesh.BACKSIDE,
    cap: BABYLON.Mesh.NO_CAP
  }, scene);

  // Position so the city silhouette aligns with the ground horizon without reaching overhead
  panorama.position = new BABYLON.Vector3(0, 14, 0);
  panorama.isPickable = false;

  const mat = new BABYLON.StandardMaterial("LahoreSkylineMat", scene);
  const tex = new BABYLON.Texture("/textures/skyline/lahore_skyline_panorama.jpg", scene);
  tex.uScale = -2; // Invert horizontally so panorama faces inward correctly, tile 2x for full 360 wrap
  tex.vScale = 1;
  mat.diffuseTexture = tex;
  mat.emissiveTexture = tex;
  // Deep dark nocturnal tint: turns the skyline into an eerie, dark alien midnight silhouette
  mat.emissiveColor = new BABYLON.Color3(0.08, 0.10, 0.16);
  mat.diffuseColor = new BABYLON.Color3(0.04, 0.05, 0.08);
  mat.specularColor = BABYLON.Color3.Black();
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  mat.fogEnabled = false;
  panorama.material = mat;

  return panorama;
}

function createAlienBloodMoon(scene) {
  // Ominous Giant Alien Blood Moon looming in the midnight sky
  const moon = BABYLON.MeshBuilder.CreateSphere("AlienBloodMoon", { diameter: 14, segments: 24 }, scene);
  moon.position = new BABYLON.Vector3(65, 55, 100);
  moon.isPickable = false;

  const moonMat = new BABYLON.StandardMaterial("AlienMoonMat", scene);
  moonMat.diffuseColor = new BABYLON.Color3(0.75, 0.12, 0.16);
  moonMat.emissiveColor = new BABYLON.Color3(0.55, 0.08, 0.12);
  moonMat.specularColor = new BABYLON.Color3(0.15, 0.05, 0.05);
  moon.material = moonMat;

  scene.onBeforeRenderObservable.add(() => {
    moon.rotation.y += 0.0004;
  });
}

function createAlienBioMist(scene) {
  // Spooky ground bio-mist / alien spores drifting across the dark tarmac
  const sporeCount = 48;
  const sporeMat = new BABYLON.StandardMaterial("BioSporeMat", scene);
  sporeMat.emissiveColor = new BABYLON.Color3(0.15, 0.95, 0.5);
  sporeMat.diffuseColor = new BABYLON.Color3(0.1, 0.8, 0.4);
  sporeMat.alpha = 0.7;

  const spores = [];
  for (let i = 0; i < sporeCount; i++) {
    const spore = BABYLON.MeshBuilder.CreateSphere(`BioSpore_${i}`, { diameter: 0.12 + Math.random() * 0.16 }, scene);
    const ang = Math.random() * Math.PI * 2;
    const r = 4 + Math.random() * 26;
    spore.position = new BABYLON.Vector3(
      Math.cos(ang) * r,
      0.3 + Math.random() * 2.8,
      Math.sin(ang) * r
    );
    spore.material = sporeMat;
    spore.isPickable = false;
    spores.push({
      mesh: spore,
      driftX: (Math.random() - 0.5) * 0.004,
      driftZ: (Math.random() - 0.5) * 0.004,
      phase: Math.random() * Math.PI * 2
    });
  }

  scene.onBeforeRenderObservable.add(() => {
    const now = performance.now() * 0.002;
    for (let i = 0; i < spores.length; i++) {
      const sp = spores[i];
      sp.mesh.position.y += Math.sin(now + sp.phase) * 0.004;
      sp.mesh.position.x += sp.driftX;
      sp.mesh.position.z += sp.driftZ;
      if (sp.mesh.position.y > 3.4) sp.mesh.position.y = 0.3;
      if (sp.mesh.position.y < 0.15) sp.mesh.position.y = 3.2;
    }
  });
}

function createPerimeterBillboards(scene) {
  const steelMat = new BABYLON.StandardMaterial("BillboardSteelMat", scene);
  steelMat.diffuseColor = new BABYLON.Color3(0.14, 0.16, 0.20);
  steelMat.specularColor = new BABYLON.Color3(0.4, 0.45, 0.5);

  const neonRimMat = new BABYLON.StandardMaterial("BillboardNeonMat", scene);
  neonRimMat.emissiveColor = new BABYLON.Color3(0.06, 0.45, 0.58);
  neonRimMat.diffuseColor = new BABYLON.Color3(0, 0.3, 0.5);

  const count = BILLBOARD_TEXTURE_PATHS.length;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + 0.25;
    const radius = 34.5;
    const posX = Math.cos(angle) * radius;
    const posZ = Math.sin(angle) * radius;

    const boardWidth = 9.2;
    const boardHeight = 4.6;
    const boardElevation = 4.8;

    // Billboard Root
    const root = new BABYLON.TransformNode(`Billboard_${i}`, scene);
    root.position = new BABYLON.Vector3(posX, 0, posZ);
    root.lookAt(new BABYLON.Vector3(0, boardElevation, 0));

    // Support pillars
    const pillarL = BABYLON.MeshBuilder.CreateCylinder(`PillarL_${i}`, { diameter: 0.28, height: boardElevation + 2.5 }, scene);
    pillarL.parent = root;
    pillarL.position = new BABYLON.Vector3(-boardWidth * 0.38, (boardElevation + 2.5) / 2, 0);
    pillarL.material = steelMat;
    pillarL.isPickable = false;

    const pillarR = BABYLON.MeshBuilder.CreateCylinder(`PillarR_${i}`, { diameter: 0.28, height: boardElevation + 2.5 }, scene);
    pillarR.parent = root;
    pillarR.position = new BABYLON.Vector3(boardWidth * 0.38, (boardElevation + 2.5) / 2, 0);
    pillarR.material = steelMat;
    pillarR.isPickable = false;

    // Signboard back frame
    const frame = BABYLON.MeshBuilder.CreateBox(`SignFrame_${i}`, { width: boardWidth + 0.3, height: boardHeight + 0.3, depth: 0.22 }, scene);
    frame.parent = root;
    frame.position = new BABYLON.Vector3(0, boardElevation, 0);
    frame.material = steelMat;
    frame.isPickable = false;

    // Glowing Neon Border facing the arena
    const neonBorder = BABYLON.MeshBuilder.CreateBox(`NeonBorder_${i}`, { width: boardWidth + 0.45, height: boardHeight + 0.45, depth: 0.05 }, scene);
    neonBorder.parent = root;
    neonBorder.position = new BABYLON.Vector3(0, boardElevation, 0.10);
    neonBorder.material = neonRimMat;
    neonBorder.isPickable = false;

    // Billboard Textured Face (Facing directly inward toward the arena/player)
    const signMat = new BABYLON.StandardMaterial(`SignMat_${i}`, scene);
    const signTex = new BABYLON.Texture(BILLBOARD_TEXTURE_PATHS[i], scene);
    signMat.diffuseTexture = signTex;
    signMat.emissiveTexture = signTex;
    signMat.emissiveColor = new BABYLON.Color3(0.48, 0.48, 0.48);
    signMat.diffuseColor = new BABYLON.Color3(0.35, 0.35, 0.35);
    signMat.specularColor = BABYLON.Color3.Black();
    signMat.disableLighting = false;
    signMat.backFaceCulling = false;

    const signPlane = BABYLON.MeshBuilder.CreatePlane(`SignFace_${i}`, {
      width: boardWidth,
      height: boardHeight,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);
    signPlane.parent = root;
    signPlane.position = new BABYLON.Vector3(0, boardElevation, 0.14);
    signPlane.rotation.y = Math.PI; // Face front normal toward arena center so text is not mirrored
    signPlane.material = signMat;
    signPlane.isPickable = false;

    // Spotlight fixture on top
    const lamp = BABYLON.MeshBuilder.CreateBox(`LampFixture_${i}`, { width: boardWidth * 0.8, height: 0.15, depth: 0.5 }, scene);
    lamp.parent = root;
    lamp.position = new BABYLON.Vector3(0, boardElevation + boardHeight * 0.5 + 0.2, 0.32);
    lamp.material = neonRimMat;
    lamp.isPickable = false;
  }
}

function createSkyscrapers(scene) {
  const glassMat = new BABYLON.StandardMaterial("GlassTowerMat", scene);
  const glassTex = new BABYLON.Texture("/textures/buildings/facade_glass_tower.jpg", scene);
  glassTex.uScale = 2;
  glassTex.vScale = 4;
  glassMat.diffuseTexture = glassTex;
  glassMat.emissiveTexture = glassTex;
  glassMat.emissiveColor = new BABYLON.Color3(0.06, 0.08, 0.12);
  glassMat.diffuseColor = new BABYLON.Color3(0.03, 0.04, 0.06);
  glassMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.25);

  const brickMat = new BABYLON.StandardMaterial("LahoreBrickMat", scene);
  const brickTex = new BABYLON.Texture("/textures/buildings/facade_lahore_brick.jpg", scene);
  brickTex.uScale = 3;
  brickTex.vScale = 4;
  brickMat.diffuseTexture = brickTex;
  brickMat.emissiveTexture = brickTex;
  brickMat.emissiveColor = new BABYLON.Color3(0.04, 0.035, 0.03);
  brickMat.diffuseColor = new BABYLON.Color3(0.04, 0.035, 0.03);
  brickMat.specularColor = BABYLON.Color3.Black();

  const beaconMat = new BABYLON.StandardMaterial("RoofBeaconMat", scene);
  beaconMat.emissiveColor = new BABYLON.Color3(1, 0.12, 0.08);
  beaconMat.diffuseColor = new BABYLON.Color3(0.8, 0, 0);

  const buildingCount = 28;
  for (let i = 0; i < buildingCount; i++) {
    const angle = (i / buildingCount) * Math.PI * 2;
    const radius = 50 + (i % 4) * 6.5;
    const height = 18 + ((i * 7) % 11) * 2.4; // 18m to 42m tall towers
    const width = 6.5 + (i % 3) * 2.2;
    const depth = 5.5 + (i % 2) * 2.0;

    const building = BABYLON.MeshBuilder.CreateBox(`Skyscraper_${i}`, { width, height, depth }, scene);
    building.position = new BABYLON.Vector3(
      Math.cos(angle) * radius,
      height * 0.5 - 0.2,
      Math.sin(angle) * radius
    );
    building.lookAt(new BABYLON.Vector3(0, height * 0.5, 0));
    building.material = (i % 2 === 0) ? glassMat : brickMat;
    building.isPickable = false;

    // Aircraft warning beacon on roof
    const beaconLight = BABYLON.MeshBuilder.CreateSphere(`RoofBeacon_${i}`, { diameter: 0.65 }, scene);
    beaconLight.position = new BABYLON.Vector3(building.position.x, height + 0.35, building.position.z);
    beaconLight.material = beaconMat;
    beaconLight.isPickable = false;
  }
}

function createGun(scene, camera, materials) {
  const gunRoot = new BABYLON.TransformNode("GunRoot", scene);
  gunRoot.parent = camera;
  // Position prominently in bottom-right first person view
  gunRoot.position = new BABYLON.Vector3(0.32, -0.32, 0.72);
  gunRoot.rotation = new BABYLON.Vector3(0.04, -0.05, 0);

  const gunBody = BABYLON.MeshBuilder.CreateBox("GunBody", { width: 0.18, height: 0.16, depth: 0.9 }, scene);
  gunBody.parent = gunRoot;
  gunBody.material = materials.gun;
  gunBody.metadata = { fallbackGun: true };

  const gunBarrel = BABYLON.MeshBuilder.CreateCylinder("GunBarrel", { diameter: 0.08, height: 0.7 }, scene);
  gunBarrel.parent = gunRoot;
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.z = 0.45;
  gunBarrel.position.y = 0.04;
  gunBarrel.material = materials.gun;
  gunBarrel.metadata = { fallbackGun: true };

  const muzzle = BABYLON.MeshBuilder.CreateSphere("MuzzleFlash", { diameter: 0.22 }, scene);
  muzzle.parent = gunRoot;
  muzzle.position.z = 0.95;
  muzzle.position.y = 0.04;
  muzzle.material = materials.bullet;
  muzzle.isVisible = false;

  const muzzleLight = new BABYLON.PointLight("MuzzleLight", new BABYLON.Vector3(0, 0.04, 1.0), scene);
  muzzleLight.parent = gunRoot;
  muzzleLight.diffuse = new BABYLON.Color3(0.2, 0.9, 1);
  muzzleLight.intensity = 0;
  muzzleLight.range = 14;

  return { gunRoot, muzzle, muzzleLight };
}

function createTacticalFlashlight(scene, camera, gunRoot) {
  // 1. Tactical SpotLight casting a focused high-intensity beam forward
  const flashlight = new BABYLON.SpotLight(
    "TacticalFlashlight",
    new BABYLON.Vector3(0.25, -0.22, 0.65),
    new BABYLON.Vector3(0, 0, 1),
    Math.PI / 3.4,
    6,
    scene
  );
  flashlight.parent = camera;
  flashlight.diffuse = new BABYLON.Color3(0.92, 0.97, 1.0);
  flashlight.specular = new BABYLON.Color3(0.85, 0.92, 1.0);
  flashlight.intensity = 2.8;
  flashlight.range = 48;

  // 2. Tactical Flashlight Hardware Mount & Bezel on gunRoot
  const mountMat = new BABYLON.StandardMaterial("FlashlightMountMat", scene);
  mountMat.diffuseColor = new BABYLON.Color3(0.06, 0.07, 0.09);
  mountMat.specularColor = new BABYLON.Color3(0.4, 0.45, 0.5);

  const lensMat = new BABYLON.StandardMaterial("FlashlightLensMat", scene);
  lensMat.emissiveColor = new BABYLON.Color3(0.92, 0.98, 1.0);
  lensMat.diffuseColor = new BABYLON.Color3(0.8, 0.92, 1.0);
  lensMat.disableLighting = true;

  const flashlightHousing = BABYLON.MeshBuilder.CreateCylinder("FlashlightHousing", {
    diameter: 0.07,
    height: 0.22,
    tessellation: 16
  }, scene);
  flashlightHousing.parent = gunRoot;
  flashlightHousing.rotation.x = Math.PI / 2;
  flashlightHousing.position = new BABYLON.Vector3(-0.07, -0.04, 0.5);
  flashlightHousing.material = mountMat;
  flashlightHousing.isPickable = false;
  flashlightHousing.checkCollisions = false;

  const flashlightLens = BABYLON.MeshBuilder.CreateDisc("FlashlightLens", {
    radius: 0.034,
    tessellation: 16
  }, scene);
  flashlightLens.parent = flashlightHousing;
  flashlightLens.position.y = 0.111;
  flashlightLens.rotation.x = Math.PI / 2;
  flashlightLens.material = lensMat;
  flashlightLens.isPickable = false;
  flashlightLens.checkCollisions = false;

  // 3. Volumetric beam nodes (kept as TransformNodes for API compatibility without viewport glare)
  const beamCone = new BABYLON.TransformNode("FlashlightBeamCone", scene);
  beamCone.parent = camera;
  const innerCoreCone = new BABYLON.TransformNode("FlashlightCoreBeam", scene);
  innerCoreCone.parent = camera;

  // 4. Real-Time Dynamic Flashlight Shadows
  let shadowGenerator = null;
  try {
    const shadowMapSize = 512;
    shadowGenerator = new BABYLON.ShadowGenerator(shadowMapSize, flashlight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 8;
    shadowGenerator.depthScale = 45;
    shadowGenerator.bias = 0.001;
    shadowGenerator.normalBias = 0.01;
    shadowGenerator.setDarkness(0.55);
  } catch (e) {
    console.warn("Flashlight ShadowGenerator skipped:", e);
  }

  return {
    flashlight,
    flashlightBeam: beamCone,
    flashlightCoreBeam: innerCoreCone,
    flashlightLens,
    flashlightHousing,
    shadowGenerator
  };
}

export function toggleFlashlight(context) {
  const { game, ui, flashlight, flashlightBeam, flashlightCoreBeam, flashlightLens, shadowGenerator } = context;
  game.flashlightOn = !game.flashlightOn;
  const enabled = game.flashlightOn;

  if (flashlight) flashlight.setEnabled(enabled);
  if (flashlightBeam) flashlightBeam.setEnabled(enabled);
  if (flashlightCoreBeam) flashlightCoreBeam.setEnabled(enabled);
  if (flashlightLens) flashlightLens.setEnabled(enabled);

  if (shadowGenerator && shadowGenerator.getShadowMap()) {
    shadowGenerator.getShadowMap().refreshRate = enabled ? BABYLON.RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME : 0;
  }

  playSound("flashlight_click");

  if (ui.flashlightStatus) {
    ui.flashlightStatus.textContent = enabled ? "FLASHLIGHT: ON [T]" : "FLASHLIGHT: OFF [T]";
    ui.flashlightStatus.style.color = enabled ? "#00e676" : "#888888";
    ui.flashlightStatus.style.textShadow = enabled ? "0 0 8px rgba(0, 230, 118, 0.7)" : "none";
  }
  if (ui.mobileFlashlightButton) {
    ui.mobileFlashlightButton.style.background = enabled ? "rgba(0, 220, 255, 0.35)" : "rgba(40, 40, 40, 0.4)";
    ui.mobileFlashlightButton.style.borderColor = enabled ? "#00d6ff" : "#666666";
    ui.mobileFlashlightButton.style.color = enabled ? "#bff6ff" : "#888888";
    ui.mobileFlashlightButton.textContent = enabled ? "LIGHT ON" : "LIGHT OFF";
  }
}

export function attachWeaponModel(context, weaponId = (context.game?.activeWeapon || "shotgun")) {
  context.weaponModel?.dispose();
  context.weaponModel = null;
  context.rifleModel = null;

  let modelAsset = null;
  let targetScale = 0.52;
  let posOffset = new BABYLON.Vector3(0, -0.04, 0.12);
  let rotOffset = new BABYLON.Vector3(0.02, Math.PI, 0);

  if (weaponId === "shotgun") {
    modelAsset = context.loadedAssets.fpsHeavyShotgun || context.loadedAssets.plasmaCannon || context.loadedAssets.rifle;
    targetScale = 0.52;
    posOffset = new BABYLON.Vector3(0, -0.04, 0.12);
    rotOffset = new BABYLON.Vector3(0.02, Math.PI, 0);
  } else if (weaponId === "rifle") {
    modelAsset = context.loadedAssets.plasmaCannon || context.loadedAssets.rifle || context.loadedAssets.fpsHeavyShotgun;
    targetScale = 0.48;
    posOffset = new BABYLON.Vector3(0, -0.03, 0.14);
    rotOffset = new BABYLON.Vector3(0.02, Math.PI, 0);
  } else if (weaponId === "rocket") {
    modelAsset = context.loadedAssets.fpsRocketLauncher || context.loadedAssets.plasmaCannon || context.loadedAssets.rifle;
    targetScale = 0.56;
    posOffset = new BABYLON.Vector3(0.02, -0.02, 0.10);
    rotOffset = new BABYLON.Vector3(0.01, Math.PI, 0);
  } else if (weaponId === "sniper") {
    modelAsset = context.loadedAssets.rifle || context.loadedAssets.plasmaCannon || context.loadedAssets.fpsHeavyShotgun;
    targetScale = 0.54;
    posOffset = new BABYLON.Vector3(0, -0.03, 0.16);
    rotOffset = new BABYLON.Vector3(0.02, Math.PI, 0);
  } else if (weaponId === "flamethrower") {
    modelAsset = context.loadedAssets.plasmaCannon || context.loadedAssets.fpsHeavyShotgun || context.loadedAssets.rifle;
    targetScale = 0.50;
    posOffset = new BABYLON.Vector3(0.01, -0.04, 0.13);
    rotOffset = new BABYLON.Vector3(0.01, Math.PI, 0);
  }

  // Set distinct muzzle light emission color based on weapon
  if (context.muzzleLight) {
    if (weaponId === "flamethrower") {
      context.muzzleLight.diffuse = new BABYLON.Color3(1.0, 0.45, 0.05);
    } else if (weaponId === "sniper") {
      context.muzzleLight.diffuse = new BABYLON.Color3(0.1, 0.85, 1.0);
    } else if (weaponId === "rocket") {
      context.muzzleLight.diffuse = new BABYLON.Color3(1.0, 0.55, 0.1);
    } else if (weaponId === "shotgun") {
      context.muzzleLight.diffuse = new BABYLON.Color3(1.0, 0.85, 0.3);
    } else {
      context.muzzleLight.diffuse = new BABYLON.Color3(0.2, 0.9, 1.0);
    }
  }

  const weaponMesh = cloneLoadedAsset(modelAsset, `WeaponModel_${weaponId}`, {
    parent: context.gunRoot,
    position: posOffset,
    rotation: rotOffset,
    scaling: new BABYLON.Vector3(1, 1, 1),
    isPickable: false
  });

  if (!weaponMesh) {
    context.gunRoot.getChildMeshes(false).forEach(mesh => {
      if (mesh.metadata?.fallbackGun) mesh.setEnabled(true);
    });
    return;
  }

  context.weaponModel = weaponMesh;
  context.rifleModel = weaponMesh;
  fitModelToLargestAxis(weaponMesh, targetScale);
  weaponMesh.position = posOffset;
  weaponMesh.rotation = rotOffset;

  context.gunRoot.getChildMeshes(false).forEach(mesh => {
    if (mesh.metadata?.fallbackGun) mesh.setEnabled(false);
  });
}

export const attachRifleModel = (context) => attachWeaponModel(context, context.game?.activeWeapon || "shotgun");

export function createGameScene({ canvas, engine, ui }) {
  loadBestScore(game);
  loadSave(game);
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.006, 0.008, 0.016, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0042;
  scene.fogColor = new BABYLON.Color3(0.008, 0.012, 0.022);
  scene.gravity = new BABYLON.Vector3(0, -0.4, 0);
  scene.collisionsEnabled = true;

  const camera = createPlayerCamera(scene, canvas);
  const materials = createMaterials(scene, game);
  const { baseCore, beacon, baseTower } = createEnvironment(scene, game, materials);
  const { gunRoot, muzzle, muzzleLight } = createGun(scene, camera, materials);
  const { flashlight, flashlightBeam, flashlightCoreBeam, flashlightLens, flashlightHousing, shadowGenerator } = createTacticalFlashlight(scene, camera, gunRoot);

  const context = {
    canvas,
    engine,
    scene,
    camera,
    game,
    ui,
    materials,
    baseCore,
    baseTower,
    baseModel: null,
    beacon,
    gunRoot,
    weaponModel: null,
    rifleModel: null,
    attachWeaponModel: null,
    muzzle,
    muzzleLight,
    flashlight,
    flashlightBeam,
    flashlightCoreBeam,
    flashlightLens,
    flashlightHousing,
    shadowGenerator,
    loadedAssets: {},
    assetsReady: Promise.resolve(),
    stageAssetLoadingEnabled: true,
    stageThemeLoadToken: null,
    stageThemeMeshes: [],
    basePulseUntil: 0,
    startNextWave: null,
    resetGame: null,
    continueAfterReward: null
  };

  context.attachWeaponModel = (id) => attachWeaponModel(context, id);
  context.startNextWave = () => spawnWave(context);
  context.refreshStageTheme = () => refreshStageTheme(context);
  context.continueAfterReward = () => continueAfterReward(context);
  setupShop(context);
  setupStageSelect(context);
  setupGraphicsQuality(context);
  createStarterTowers(context);
  refreshStageTheme(context);

  if (ui.loadingOverlay) ui.loadingOverlay.style.display = "none";
  context.assetsReady = Promise.resolve(context.loadedAssets);

  // Preload assets immediately in background so models are ready on startup
  preloadRunAssets(false);

  async function preloadRunAssets(showLoadingUI = false) {
    const runAssetKeys = [...new Set([
      ...CORE_ASSET_KEYS,
      ...BACKGROUND_ASSET_KEYS,
      ...getStageAssetKeys(game.selectedStage)
    ])];
    const firstRunAssetKeys = FIRST_RUN_ASSET_KEYS.filter(key => runAssetKeys.includes(key));
    const backgroundAssetKeys = runAssetKeys.filter(key => !firstRunAssetKeys.includes(key));

    if (showLoadingUI) {
      if (ui.loadingOverlay) ui.loadingOverlay.style.display = "flex";
      if (ui.loadingText) ui.loadingText.textContent = "Loading essential game models...";
    }

    await loadModelAssets(scene, context.loadedAssets, firstRunAssetKeys, {
      onProgress: ({ completed, total }) => {
        if (showLoadingUI && ui.loadingText) {
          ui.loadingText.textContent = `Loading game models ${completed} / ${total}...`;
        }
      }
    });

    attachRifleModel(context);
    attachBaseCoreModel(context);
    refreshTowerModels(context);
    context.stageAssetLoadingEnabled = true;
    refreshStageTheme(context);

    if (showLoadingUI && ui.loadingOverlay) ui.loadingOverlay.style.display = "none";

    loadModelAssets(scene, context.loadedAssets, backgroundAssetKeys).then(() => {
      attachRifleModel(context);
      attachBaseCoreModel(context);
      refreshTowerModels(context);
      refreshStageTheme(context);
    });
  }

  context.resetGame = async () => {
    clearTimeout(game.waveTimer);
    stopBossMusic();
    resetGameState();
    clearAliens(game, context);
    clearPickups(game);
    resetPlayer(camera);
    document.body.classList.remove("is-defeat-active");
    document.body.classList.remove("is-game-over");
    ui.message.textContent = "Deploying defense force...";
    if (ui.message) {
      ui.message.style.background = "";
      ui.message.style.borderColor = "";
      ui.message.style.color = "";
      ui.message.style.boxShadow = "";
    }
    ui.startOverlay.style.display = "none";
    ui.pauseOverlay.style.display = "none";
    ui.controlsOverlay.style.display = "none";
    ui.rewardOverlay.style.display = "none";
    if (ui.stageClearOverlay) ui.stageClearOverlay.style.display = "none";
    if (ui.defeatOverlay) ui.defeatOverlay.style.display = "none";
    if (ui.continueButton) ui.continueButton.style.display = "none";
    createStarterTowers(context);
    refreshTowerModels(context);
    attachRifleModel(context);
    attachBaseCoreModel(context);
    refreshStageTheme(context);
    game.flashlightOn = true;
    if (context.flashlight) context.flashlight.setEnabled(true);
    if (context.flashlightBeam) context.flashlightBeam.setEnabled(true);
    if (context.flashlightCoreBeam) context.flashlightCoreBeam.setEnabled(true);
    if (context.flashlightLens) context.flashlightLens.setEnabled(true);
    if (ui.flashlightStatus) {
      ui.flashlightStatus.textContent = "FLASHLIGHT: ON [T]";
      ui.flashlightStatus.style.color = "#00e676";
      ui.flashlightStatus.style.textShadow = "0 0 8px rgba(0, 230, 118, 0.7)";
    }
    saveGame(game);
    refreshShop(context);
    requestPointerLockSafely(canvas);
    resetTacticalVoice();
    spawnWave(context);
    broadcastRadioComms("Defender online. AI tactical advisor active. Secure the perimeter core.", false, "AI HELPER");
    updateUI(ui, game);
  };

  scene.onBeforeRenderObservable.add(() => {
    drawAlienMap(ui, game, camera);
    if (game.paused) return;
    applyPlayerLocomotion(camera, game);
    keepPlayerInsideArena(camera, game, ui);
    baseCore.rotation.y += 0.03;
    baseCore.position.y = 3.55 + Math.sin(performance.now() / 300) * 0.08;
    beacon.rotation.y -= 0.018;
    beacon.rotation.x = Math.sin(performance.now() / 500) * 0.08;
    if (context.baseModel) {
      context.baseModel.rotation.y += 0.005;
    }
    if (context.flashlight && context.flashlight.isEnabled()) {
      const t = performance.now() * 0.002;
      context.flashlight.intensity = 2.6 + Math.sin(t * 5.8) * 0.08;
    }
    const delta = scene.getEngine().getDeltaTime();
    const dtSec = delta * 0.001;
    if (game.empCooldown > 0) {
      game.empCooldown = Math.max(0, game.empCooldown - dtSec);
    }
    updateAudioListener(camera);
    updateCameraShake(camera, dtSec);
    updateAlienGibs(delta);
    updateGroundDecals(delta);
    updateBaseShieldFeedback(context);
    updateAliens(context);
    updateTowers(context);
    updatePickups(context);
    updateRockets(context);
    updateTacticalVoice(context);
  });

  updateUI(ui, game);
  return context;
}

async function continueAfterReward(context) {
  const { canvas, camera, game, ui } = context;
  if (!game.gameOver || game.continueUsed || game.continueInProgress) return;

  game.continueInProgress = true;
  ui.continueButton.disabled = true;
  ui.continueButton.textContent = "LOADING AD...";
  ui.message.textContent = "Loading rewarded ad...";

  const earnedReward = await showRewardedContinueIfAvailable();
  if (!earnedReward) {
    game.continueInProgress = false;
    ui.continueButton.disabled = false;
    ui.continueButton.textContent = "WATCH AD TO CONTINUE";
    ui.message.textContent = "Reward ad is not ready yet. Try again in a moment or press RESTART.";
    return;
  }

  clearTimeout(game.waveTimer);
  stopBossMusic();
  clearAliens(game, context);
  clearPickups(game);
  resetPlayer(camera);
  resetTacticalVoice();

  game.continueUsed = true;
  game.continueInProgress = false;
  game.gameOver = false;
  game.paused = false;
  game.health = 70;
  game.baseHealth = Math.max(game.baseHealth, Math.ceil(game.maxBaseHealth * 0.6));
  game.ammo = game.maxAmmo;
  game.reloading = false;
  game.playerInvincibleUntil = performance.now() + 4200;
  game.mobileMove.x = 0;
  game.mobileMove.y = 0;

  ui.continueButton.style.display = "none";
  ui.continueButton.disabled = false;
  ui.continueButton.textContent = "WATCH AD TO CONTINUE";
  if (ui.defeatOverlay) ui.defeatOverlay.style.display = "none";
  document.body.classList.remove("is-defeat-active");
  document.body.classList.remove("is-game-over");
  ui.message.textContent = "Continue granted. Restarting this wave with a safety shield.";
  requestPointerLockSafely(canvas);
  updateUI(ui, game);
  spawnWave(context);
}
