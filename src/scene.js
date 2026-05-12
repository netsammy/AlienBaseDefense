import * as BABYLON from "@babylonjs/core";
import "@babylonjs/core/Culling/ray";
import { game, resetGameState } from "./gameState.js";
import { drawAlienMap, updateUI } from "./ui.js";
import { applyMobileMovement, createPlayerCamera, keepPlayerInsideArena, resetPlayer } from "./player.js";
import { clearAliens, spawnWave, updateAliens } from "./aliens.js";
import { clearPickups, updatePickups } from "./pickups.js";
import { loadBestScore } from "./highScore.js";
import { CORE_ASSET_KEYS, cloneLoadedAsset, fitModelToLargestAxis, loadModelAssets } from "./assets.js";
import { updateBaseShieldFeedback } from "./effects.js";
import { createStarterTowers, updateTowers } from "./towers.js";
import { loadSave, saveGame } from "./saveSystem.js";
import { setupShop, refreshShop } from "./shop.js";
import { setupStageSelect } from "./stages.js";
import { setupGraphicsQuality } from "./graphics.js";
import { stopBossMusic } from "./sound.js";

function createMaterials(scene) {
  const ground = new BABYLON.StandardMaterial("GroundMat", scene);
  ground.diffuseColor = new BABYLON.Color3(0.08, 0.08, 0.095);
  ground.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);

  const zone = new BABYLON.StandardMaterial("DefenseZoneMat", scene);
  zone.diffuseColor = new BABYLON.Color3(0, 0.7, 1);
  zone.emissiveColor = new BABYLON.Color3(0, 0.18, 0.35);
  zone.alpha = 0.42;

  const danger = new BABYLON.StandardMaterial("DangerZoneMat", scene);
  danger.diffuseColor = new BABYLON.Color3(1, 0.05, 0.05);
  danger.emissiveColor = new BABYLON.Color3(0.35, 0, 0);
  danger.alpha = 0.45;

  const bullet = new BABYLON.StandardMaterial("BulletMat", scene);
  bullet.diffuseColor = new BABYLON.Color3(0, 0.9, 1);
  bullet.emissiveColor = new BABYLON.Color3(0, 0.9, 1);

  const baseCore = new BABYLON.StandardMaterial("BaseCoreMat", scene);
  baseCore.diffuseColor = new BABYLON.Color3(0, 0.9, 1);
  baseCore.emissiveColor = new BABYLON.Color3(0, 0.9, 1);

  const alien = new BABYLON.StandardMaterial("AlienMat", scene);
  alien.diffuseColor = new BABYLON.Color3(0.18, 0.82, 0.22);
  alien.emissiveColor = new BABYLON.Color3(0.02, 0.12, 0.02);

  const alienEye = new BABYLON.StandardMaterial("AlienEyeMat", scene);
  alienEye.diffuseColor = new BABYLON.Color3(1, 0.05, 0.02);
  alienEye.emissiveColor = new BABYLON.Color3(1, 0.02, 0.01);

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
  scene.fogColor = new BABYLON.Color3(0.015, 0.025, 0.045);
  scene.fogDensity = 0.012;

  const light = new BABYLON.HemisphericLight("SkyLight", new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.48;

  const moonLight = new BABYLON.DirectionalLight("MoonLight", new BABYLON.Vector3(-0.4, -1, 0.4), scene);
  moonLight.position = new BABYLON.Vector3(20, 40, -20);
  moonLight.intensity = 0.95;

  const ground = BABYLON.MeshBuilder.CreateGround("Ground", { width: 90, height: 90 }, scene);
  ground.material = materials.ground;
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

  return { baseCore, beacon };
}

function clearStageTheme(context) {
  context.stageThemeMeshes.forEach(mesh => mesh.dispose());
  context.stageThemeMeshes = [];
}

function refreshStageTheme(context) {
  clearStageTheme(context);
  const { scene, game } = context;
  const palette = getStagePalette(game.selectedStage);
  const selectedStage = game.selectedStage;

  const accentMat = new BABYLON.StandardMaterial(`StageAccent_${game.selectedStage}`, scene);
  accentMat.diffuseColor = palette.accent;
  accentMat.emissiveColor = palette.accent.scale(0.18);

  const secondaryMat = new BABYLON.StandardMaterial(`StageSecondary_${game.selectedStage}`, scene);
  secondaryMat.diffuseColor = palette.secondary;
  secondaryMat.emissiveColor = palette.secondary.scale(0.12);

  const signMat = new BABYLON.StandardMaterial(`StageSign_${game.selectedStage}`, scene);
  signMat.diffuseColor = palette.sign;
  signMat.emissiveColor = palette.sign.scale(0.16);

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
    panel.material = accentMat;
    context.stageThemeMeshes.push(panel);
  });

  palette.props.forEach(prop => {
    if (prop.assetKey && addStageAssetProp(context, prop)) return;

    const box = BABYLON.MeshBuilder.CreateBox(prop.name, prop.size, scene);
    box.position = prop.position;
    box.rotation.y = prop.rotation;
    box.material = prop.material === "secondary" ? secondaryMat : prop.material === "sign" ? signMat : accentMat;
    context.stageThemeMeshes.push(box);
  });

  const missingAssetKeys = palette.props
    .map(prop => prop.assetKey)
    .filter(Boolean)
    .filter(assetKey => !Object.prototype.hasOwnProperty.call(context.loadedAssets, assetKey));

  if (missingAssetKeys.length > 0) {
    const loadToken = Symbol(selectedStage);
    context.stageThemeLoadToken = loadToken;
    loadModelAssets(scene, context.loadedAssets, missingAssetKeys).then(() => {
      if (context.stageThemeLoadToken === loadToken && game.selectedStage === selectedStage) {
        refreshStageTheme(context);
      }
    });
  }
}

function addStageAssetProp(context, prop) {
  const { loadedAssets } = context;
  const asset = loadedAssets[prop.assetKey];
  if (!asset) return false;

  const model = cloneLoadedAsset(asset, prop.name, {
    isPickable: false
  });
  if (!model) return false;

  const fitted = fitModelToLargestAxis(model, prop.targetSize || 3);
  if (!fitted) {
    model.dispose();
    return false;
  }

  model.position = prop.position.clone();
  model.rotation = new BABYLON.Vector3(0, prop.rotation || 0, 0);
  model.getChildMeshes(false).forEach(mesh => {
    mesh.checkCollisions = Boolean(prop.checkCollisions);
  });
  context.stageThemeMeshes.push(model);
  return true;
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
        { name: "RoadBarricadeUrdu", assetKey: "roadBarricadeUrdu", position: new BABYLON.Vector3(-18, 0, 10), targetSize: 3.7, rotation: 0.6, size: { width: 2.6, height: 1.2, depth: 0.25 }, material: "sign", checkCollisions: true },
        { name: "SandbagWall", assetKey: "sandbagWall", position: new BABYLON.Vector3(8, 0, -16), targetSize: 4.5, rotation: -0.2, size: { width: 3.3, height: 1.1, depth: 0.8 }, material: "accent", checkCollisions: true },
        { name: "StreetPlanterBarrier", assetKey: "streetPlanterBarrier", position: new BABYLON.Vector3(11, 0, 5), targetSize: 3.4, rotation: 1.2, size: { width: 3.2, height: 1.0, depth: 1.0 }, material: "secondary", checkCollisions: true },
        { name: "MarketStallCrates", assetKey: "marketStallCrates", position: new BABYLON.Vector3(-10, 0, 15), targetSize: 3.6, rotation: -0.8, size: { width: 2.8, height: 1.2, depth: 1.2 }, material: "secondary", checkCollisions: true }
      ]
    }
  };

  if (stageId === "karachi-harbor") {
    return {
      prefix: "Karachi",
      accent: new BABYLON.Color3(0.05, 0.45, 0.85),
      secondary: new BABYLON.Color3(0.95, 0.38, 0.08),
      sign: new BABYLON.Color3(0.08, 0.22, 0.32),
      props: [
        { name: "KarachiContainerA", assetKey: "karachiShippingContainer", position: new BABYLON.Vector3(17, 0, 9), targetSize: 4.8, rotation: 0.1, size: { width: 3.6, height: 1.4, depth: 1.3 }, material: "secondary", checkCollisions: true },
        { name: "KarachiContainerB", assetKey: "karachiShippingContainer", position: new BABYLON.Vector3(-15, 0, -13), targetSize: 5.4, rotation: -0.4, size: { width: 4.2, height: 1.4, depth: 1.3 }, material: "accent", checkCollisions: true },
        { name: "CityWatchtower", assetKey: "cityWatchtower", position: new BABYLON.Vector3(-21, 0, 8), targetSize: 4.8, rotation: 0, size: { width: 0.7, height: 4.4, depth: 0.7 }, material: "sign", checkCollisions: true },
        { name: "KarachiContainerC", assetKey: "karachiShippingContainer", position: new BABYLON.Vector3(8, 0, -18), targetSize: 4.6, rotation: 1.1, size: { width: 3.8, height: 1.4, depth: 1.3 }, material: "accent", checkCollisions: true },
        { name: "RoadBarricadeUrdu", assetKey: "roadBarricadeUrdu", position: new BABYLON.Vector3(-6, 0, 16), targetSize: 3.2, rotation: 0.2, size: { width: 2.3, height: 1.1, depth: 0.25 }, material: "sign", checkCollisions: true }
      ]
    };
  }

  if (stageId === "islamabad-sector") {
    return {
      prefix: "Islamabad",
      accent: new BABYLON.Color3(0.75, 0.85, 0.9),
      secondary: new BABYLON.Color3(0.14, 0.55, 0.35),
      sign: new BABYLON.Color3(0.3, 0.42, 0.5),
      props: [
        { name: "SectorSignBoard", assetKey: "sectorSignBoard", position: new BABYLON.Vector3(15, 0, 12), targetSize: 4.2, rotation: 0.45, size: { width: 2.8, height: 1.6, depth: 1.5 }, material: "accent", checkCollisions: true },
        { name: "StreetPlanterBarrier", assetKey: "streetPlanterBarrier", position: new BABYLON.Vector3(-16, 0, -11), targetSize: 4.2, rotation: 0.1, size: { width: 3.5, height: 1.0, depth: 1.0 }, material: "secondary", checkCollisions: true },
        { name: "RoadBarricadeUrdu", assetKey: "roadBarricadeUrdu", position: new BABYLON.Vector3(-18, 0, 10), targetSize: 3.4, rotation: 0.6, size: { width: 2.3, height: 1.1, depth: 0.25 }, material: "sign", checkCollisions: true },
        { name: "SectorSignBoard", assetKey: "sectorSignBoard", position: new BABYLON.Vector3(4, 0, -17), targetSize: 3.8, rotation: -0.25, size: { width: 2.8, height: 1.6, depth: 1.5 }, material: "accent", checkCollisions: true },
        { name: "CityWatchtower", assetKey: "cityWatchtower", position: new BABYLON.Vector3(20, 0, -7), targetSize: 4.4, rotation: 0.4, size: { width: 0.7, height: 4.4, depth: 0.7 }, material: "sign", checkCollisions: true }
      ]
    };
  }

  if (stageId === "peshawar-gate") {
    return {
      prefix: "Peshawar",
      accent: new BABYLON.Color3(0.68, 0.38, 0.18),
      secondary: new BABYLON.Color3(0.88, 0.68, 0.38),
      sign: new BABYLON.Color3(0.25, 0.18, 0.12),
      props: [
        { name: "PeshawarGate", assetKey: "peshawarGate", position: new BABYLON.Vector3(15, 0, 11), targetSize: 5.2, rotation: 0, size: { width: 4.0, height: 2.8, depth: 1.2 }, material: "accent", checkCollisions: true },
        { name: "MarketStallCrates", assetKey: "marketStallCrates", position: new BABYLON.Vector3(-16, 0, -13), targetSize: 4.4, rotation: -0.35, size: { width: 3.2, height: 1.4, depth: 1.3 }, material: "secondary", checkCollisions: true },
        { name: "SandbagWall", assetKey: "sandbagWall", position: new BABYLON.Vector3(-5, 0, 18), targetSize: 4.2, rotation: 0.25, size: { width: 3.3, height: 1.1, depth: 0.8 }, material: "sign", checkCollisions: true },
        { name: "PeshawarGateSmall", assetKey: "peshawarGate", position: new BABYLON.Vector3(-20, 0, 7), targetSize: 4.2, rotation: 0.9, size: { width: 4.0, height: 2.8, depth: 1.2 }, material: "accent", checkCollisions: true },
        { name: "RoadBarricadeUrdu", assetKey: "roadBarricadeUrdu", position: new BABYLON.Vector3(8, 0, -17), targetSize: 3.4, rotation: -0.35, size: { width: 2.3, height: 1.1, depth: 0.25 }, material: "sign", checkCollisions: true }
      ]
    };
  }

  return common.lahore;
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

function createGun(scene, camera, materials) {
  const gunRoot = new BABYLON.TransformNode("GunRoot", scene);
  gunRoot.parent = camera;
  gunRoot.position = new BABYLON.Vector3(0.82, -0.72, 1.04);
  gunRoot.rotation = new BABYLON.Vector3(0.04, -0.12, 0);

  const gunBody = BABYLON.MeshBuilder.CreateBox("GunBody", { width: 0.34, height: 0.25, depth: 1.4 }, scene);
  gunBody.parent = gunRoot;
  gunBody.material = materials.gun;
  gunBody.metadata = { fallbackGun: true };

  const gunBarrel = BABYLON.MeshBuilder.CreateCylinder("GunBarrel", { diameter: 0.11, height: 1.0 }, scene);
  gunBarrel.parent = gunRoot;
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.z = 0.65;
  gunBarrel.position.y = 0.08;
  gunBarrel.material = materials.gun;
  gunBarrel.metadata = { fallbackGun: true };

  const muzzle = BABYLON.MeshBuilder.CreateSphere("MuzzleFlash", { diameter: 0.25 }, scene);
  muzzle.parent = gunRoot;
  muzzle.position.z = 1.25;
  muzzle.position.y = 0.08;
  muzzle.material = materials.bullet;
  muzzle.isVisible = false;

  return { gunRoot, muzzle };
}

function attachRifleModel(context) {
  const rifleAsset = context.loadedAssets.plasmaCannon || context.loadedAssets.rifle;
  const rifle = cloneLoadedAsset(rifleAsset, "PlasmaRifleModel", {
    parent: context.gunRoot,
    position: new BABYLON.Vector3(0, 0, 0.42),
    rotation: new BABYLON.Vector3(0, Math.PI, 0),
    scaling: new BABYLON.Vector3(1, 1, 1),
    isPickable: false
  });

  if (!rifle) return;
  fitModelToLargestAxis(rifle, 0.62);
  rifle.position.x += 0.2;
  rifle.position.y -= 0.12;
  rifle.position.z += 0.3;
  context.gunRoot.getChildMeshes(false).forEach(mesh => {
    if (mesh.metadata?.fallbackGun) mesh.setEnabled(false);
  });
}

export function createGameScene({ canvas, engine, ui }) {
  loadBestScore(game);
  loadSave(game);
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.01, 0.015, 0.035, 1);
  scene.gravity = new BABYLON.Vector3(0, -0.4, 0);
  scene.collisionsEnabled = true;

  const camera = createPlayerCamera(scene, canvas);
  const materials = createMaterials(scene);
  const { baseCore, beacon } = createEnvironment(scene, game, materials);
  const { gunRoot, muzzle } = createGun(scene, camera, materials);

  const context = {
    canvas,
    engine,
    scene,
    camera,
    game,
    ui,
    materials,
    baseCore,
    beacon,
    gunRoot,
    muzzle,
    loadedAssets: {},
    assetsReady: Promise.resolve(),
    stageThemeLoadToken: null,
    stageThemeMeshes: [],
    basePulseUntil: 0,
    startNextWave: null,
    resetGame: null
  };

  context.startNextWave = () => spawnWave(context);
  context.refreshStageTheme = () => refreshStageTheme(context);
  setupShop(context);
  setupStageSelect(context);
  setupGraphicsQuality(context);
  refreshStageTheme(context);

  context.assetsReady = loadModelAssets(scene, context.loadedAssets, CORE_ASSET_KEYS).then(assets => {
    attachRifleModel(context);
    refreshStageTheme(context);
    if (ui.loadingOverlay) ui.loadingOverlay.style.display = "none";
    return assets;
  });

  context.resetGame = async () => {
    clearTimeout(game.waveTimer);
    stopBossMusic();
    clearAliens(game);
    clearPickups(game);
    resetGameState();
    resetPlayer(camera);
    ui.message.textContent = "Loading alien models...";
    createStarterTowers(context);
    saveGame(game);
    refreshShop(context);
    ui.pauseOverlay.style.display = "none";
    ui.rewardOverlay.style.display = "none";
    ui.startOverlay.style.display = "none";
    canvas.requestPointerLock?.();
    await context.assetsReady;
    spawnWave(context);
    updateUI(ui, game);
  };

  scene.onBeforeRenderObservable.add(() => {
    if (game.paused) return;
    applyMobileMovement(camera, game);
    keepPlayerInsideArena(camera, game, ui);
    baseCore.rotation.y += 0.03;
    baseCore.position.y = 3.55 + Math.sin(performance.now() / 300) * 0.08;
    beacon.rotation.y -= 0.018;
    beacon.rotation.x = Math.sin(performance.now() / 500) * 0.08;
    updateBaseShieldFeedback(context);
    updateAliens(context);
    drawAlienMap(ui, game, camera);
    updateTowers(context);
    updatePickups(context);
  });

  updateUI(ui, game);
  return context;
}
