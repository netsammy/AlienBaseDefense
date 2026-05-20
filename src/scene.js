import * as BABYLON from "@babylonjs/core";
import "@babylonjs/core/Culling/ray";
import { game, resetGameState } from "./gameState.js";
import { drawAlienMap, updateUI } from "./ui.js";
import { applyMobileMovement, createPlayerCamera, keepPlayerInsideArena, resetPlayer } from "./player.js";
import { clearAliens, spawnWave, updateAliens } from "./aliens.js";
import { clearPickups, updatePickups } from "./pickups.js";
import { loadBestScore } from "./highScore.js";
import { BACKGROUND_ASSET_KEYS, CORE_ASSET_KEYS, cloneLoadedAsset, fitModelToLargestAxis, fitModelToLargestAxisOnGround, loadModelAssets } from "./assets.js";
import { updateBaseShieldFeedback } from "./effects.js";
import { createStarterTowers, updateTowers } from "./towers.js";
import { loadSave, saveGame } from "./saveSystem.js";
import { setupShop, refreshShop } from "./shop.js";
import { setupStageSelect } from "./stages.js";
import { setupGraphicsQuality } from "./graphics.js";
import { stopBossMusic } from "./sound.js";
import { requestPointerLockSafely } from "./pointerLock.js";
import { showRewardedContinueIfAvailable } from "./adBridge.js";

const FIRST_RUN_ASSET_KEYS = [
  "plasmaCannon",
  "alienGruntGreen"
];

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
  createDistantSkyline(scene);

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
    box.position = prop.position.clone();
    box.position.y += (prop.size?.height || 0) * 0.5;
    box.rotation.y = prop.rotation;
    box.material = prop.material === "secondary" ? secondaryMat : prop.material === "sign" ? signMat : accentMat;
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

function createDistantSkyline(scene) {
  const skylineMat = new BABYLON.StandardMaterial("DistantSkylineMat", scene);
  skylineMat.diffuseColor = new BABYLON.Color3(0.03, 0.08, 0.12);
  skylineMat.emissiveColor = new BABYLON.Color3(0.01, 0.035, 0.055);
  skylineMat.specularColor = BABYLON.Color3.Black();

  const lightMat = new BABYLON.StandardMaterial("SkylineWindowMat", scene);
  lightMat.diffuseColor = new BABYLON.Color3(0.9, 0.72, 0.28);
  lightMat.emissiveColor = new BABYLON.Color3(0.55, 0.34, 0.08);
  lightMat.specularColor = BABYLON.Color3.Black();

  const buildingCount = 30;
  for (let i = 0; i < buildingCount; i++) {
    const angle = (i / buildingCount) * Math.PI * 2;
    const radius = 46 + (i % 3) * 2.2;
    const height = 3.5 + ((i * 7) % 9) * 0.7;
    const width = 2.1 + (i % 4) * 0.55;
    const depth = 1.5 + (i % 3) * 0.45;
    const building = BABYLON.MeshBuilder.CreateBox("DistantBuilding", { width, height, depth }, scene);

    building.position = new BABYLON.Vector3(
      Math.cos(angle) * radius,
      height * 0.5 - 0.05,
      Math.sin(angle) * radius
    );
    building.rotation.y = -angle + Math.PI / 2;
    building.material = skylineMat;
    building.isPickable = false;

    if (i % 2 === 0) {
      const window = BABYLON.MeshBuilder.CreateBox("DistantWindow", {
        width: width * 0.52,
        height: 0.12,
        depth: 0.035
      }, scene);
      window.position = building.position.add(new BABYLON.Vector3(
        Math.cos(angle) * -0.78,
        height * 0.18,
        Math.sin(angle) * -0.78
      ));
      window.rotation.y = building.rotation.y;
      window.material = lightMat;
      window.isPickable = false;
    }
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
  context.rifleModel?.dispose();
  context.rifleModel = null;
  const rifleAsset = context.loadedAssets.plasmaCannon || context.loadedAssets.rifle;
  const rifle = cloneLoadedAsset(rifleAsset, "PlasmaRifleModel", {
    parent: context.gunRoot,
    position: new BABYLON.Vector3(0, 0, 0.42),
    rotation: new BABYLON.Vector3(0, Math.PI, 0),
    scaling: new BABYLON.Vector3(1, 1, 1),
    isPickable: false
  });

  if (!rifle) return;
  context.rifleModel = rifle;
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
    rifleModel: null,
    muzzle,
    loadedAssets: {},
    assetsReady: Promise.resolve(),
    stageAssetLoadingEnabled: false,
    stageThemeLoadToken: null,
    stageThemeMeshes: [],
    basePulseUntil: 0,
    startNextWave: null,
    resetGame: null,
    continueAfterReward: null
  };

  context.startNextWave = () => spawnWave(context);
  context.refreshStageTheme = () => refreshStageTheme(context);
  context.continueAfterReward = () => continueAfterReward(context);
  setupShop(context);
  setupStageSelect(context);
  setupGraphicsQuality(context);
  refreshStageTheme(context);

  if (ui.loadingOverlay) ui.loadingOverlay.style.display = "none";
  context.assetsReady = Promise.resolve(context.loadedAssets);

  async function preloadRunAssets() {
    const runAssetKeys = [...new Set([
      ...CORE_ASSET_KEYS,
      ...BACKGROUND_ASSET_KEYS,
      ...getStageAssetKeys(game.selectedStage)
    ])];
    const firstRunAssetKeys = FIRST_RUN_ASSET_KEYS.filter(key => runAssetKeys.includes(key));
    const backgroundAssetKeys = runAssetKeys.filter(key => !firstRunAssetKeys.includes(key));

    if (ui.loadingOverlay) ui.loadingOverlay.style.display = "flex";
    if (ui.loadingText) ui.loadingText.textContent = "Loading essential game models...";

    await loadModelAssets(scene, context.loadedAssets, firstRunAssetKeys, {
      onProgress: ({ completed, total }) => {
        if (ui.loadingText) ui.loadingText.textContent = `Loading game models ${completed} / ${total}...`;
      }
    });

    attachRifleModel(context);
    context.stageAssetLoadingEnabled = true;
    refreshStageTheme(context);

    if (ui.loadingOverlay) ui.loadingOverlay.style.display = "none";

    loadModelAssets(scene, context.loadedAssets, backgroundAssetKeys).then(() => {
      attachRifleModel(context);
      refreshStageTheme(context);
    });
  }

  context.resetGame = async () => {
    clearTimeout(game.waveTimer);
    stopBossMusic();
    clearAliens(game);
    clearPickups(game);
    resetPlayer(camera);
    document.body.classList.remove("is-defeat-active");
    document.body.classList.remove("is-game-over");
    ui.message.textContent = "Loading alien models...";
    ui.startOverlay.style.display = "none";
    ui.pauseOverlay.style.display = "none";
    ui.controlsOverlay.style.display = "none";
    ui.rewardOverlay.style.display = "none";
    if (ui.continueButton) ui.continueButton.style.display = "none";
    await preloadRunAssets();
    resetGameState();
    createStarterTowers(context);
    saveGame(game);
    refreshShop(context);
    requestPointerLockSafely(canvas);
    spawnWave(context);
    updateUI(ui, game);
  };

  scene.onBeforeRenderObservable.add(() => {
    drawAlienMap(ui, game, camera);
    if (game.paused) return;
    applyMobileMovement(camera, game);
    keepPlayerInsideArena(camera, game, ui);
    baseCore.rotation.y += 0.03;
    baseCore.position.y = 3.55 + Math.sin(performance.now() / 300) * 0.08;
    beacon.rotation.y -= 0.018;
    beacon.rotation.x = Math.sin(performance.now() / 500) * 0.08;
    updateBaseShieldFeedback(context);
    updateAliens(context);
    updateTowers(context);
    updatePickups(context);
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
  clearAliens(game);
  clearPickups(game);
  resetPlayer(camera);

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
  document.body.classList.remove("is-defeat-active");
  document.body.classList.remove("is-game-over");
  ui.message.textContent = "Continue granted. Restarting this wave with a safety shield.";
  requestPointerLockSafely(canvas);
  updateUI(ui, game);
  spawnWave(context);
}
