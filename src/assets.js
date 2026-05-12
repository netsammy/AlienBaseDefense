import * as BABYLON from "@babylonjs/core";
import "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF";

export const ASSET_PATHS = {
  alien: "/assets/models/alien_enemy.glb",
  rifle: "/assets/models/plasma_rifle.glb",
  arena: "/assets/models/arena_map.glb",
  alienGruntGreen: "/assets/models/alien_grunt_green.glb",
  alienRunnerPurple: "/assets/models/alien_runner_purple.glb",
  alienBruteArmored: "/assets/models/alien_brute_armored.glb",
  alienBrutePurple: "/assets/models/alien_brute_purple.glb",
  alienBossHorned: "/assets/models/alien_boss_horned.glb",
  plasmaCannon: "/assets/models/weapon_plasma_cannon.glb",
  peshawarGate: "/assets/models/peshawar_gate.glb",
  cityWatchtower: "/assets/models/city_watchtower.glb",
  karachiShippingContainer: "/assets/models/karachi_shipping_container.glb",
  roadBarricadeUrdu: "/assets/models/road_barricade_urdu.glb",
  upgradeShopWorkbench: "/assets/models/upgrade_shop_workbench.glb",
  streetPlanterBarrier: "/assets/models/street_planter_barrier.glb",
  sectorSignBoard: "/assets/models/sector_sign_board.glb",
  sandbagWall: "/assets/models/sandbag_wall.glb",
  marketStallCrates: "/assets/models/market_stall_crates.glb"
};

export const CORE_ASSET_KEYS = [
  "alien",
  "rifle",
  "alienGruntGreen",
  "alienRunnerPurple",
  "alienBruteArmored",
  "alienBossHorned",
  "plasmaCannon"
];

export async function prepareAssetPlaceholders(scene, keys = Object.keys(ASSET_PATHS)) {
  const assets = {};
  for (const key of keys) {
    assets[key] = await loadModelAsset(scene, assets, key);
  }
  return assets;
}

export async function loadModelAsset(scene, assets, key) {
  if (Object.prototype.hasOwnProperty.call(assets, key)) return assets[key];
  const path = ASSET_PATHS[key];
  assets[key] = path ? await tryLoadModel(scene, path) : null;
  return assets[key];
}

export async function loadModelAssets(scene, assets, keys) {
  await Promise.all([...new Set(keys)].map(key => loadModelAsset(scene, assets, key)));
  return assets;
}

async function tryLoadModel(scene, path) {
  try {
    const cachePath = `${path}?v=${Date.now()}`;
    const response = await fetch(cachePath, { method: "HEAD", cache: "reload" });
    if (!response.ok) return null;

    const result = await BABYLON.SceneLoader.LoadAssetContainerAsync(path.substring(0, path.lastIndexOf("/") + 1), `${path.substring(path.lastIndexOf("/") + 1)}?v=${Date.now()}`, scene);
    const root = new BABYLON.TransformNode(path, scene);
    result.animationGroups.forEach(group => group.stop());
    return { root, animationGroups: result.animationGroups, container: result };
  } catch {
    return null;
  }
}

export function cloneLoadedAsset(asset, name, options = {}) {
  if (asset?.container) {
    const entries = asset.container.instantiateModelsToScene(sourceName => `${name}_${sourceName}`, false);
    const root = new BABYLON.TransformNode(name, asset.root.getScene());
    entries.rootNodes.forEach(node => {
      node.parent = root;
      setNodeTreeEnabled(node, true);
    });

    root.setEnabled(true);
    root.getChildMeshes(false).forEach(mesh => {
      mesh.setEnabled(true);
      mesh.isPickable = options.isPickable ?? true;
      if (options.metadata) mesh.metadata = { ...options.metadata };
    });

    applyCloneOptions(root, options);
    return root;
  }

  const assetRoot = getAssetRoot(asset);
  if (!assetRoot) return null;

  const clone = assetRoot.clone(name, null, false);
  if (!clone) return null;

  clone.setEnabled(true);
  clone.getChildMeshes(false).forEach(mesh => {
    mesh.setEnabled(true);
    mesh.isPickable = options.isPickable ?? true;
    if (options.metadata) mesh.metadata = { ...options.metadata };
  });

  applyCloneOptions(clone, options);

  return clone;
}

function applyCloneOptions(root, options) {
  if (options.parent) root.parent = options.parent;
  if (options.position) root.position = options.position.clone();
  if (options.rotation) root.rotation = options.rotation.clone();
  if (options.scaling) root.scaling = options.scaling.clone();
}

function setNodeTreeEnabled(node, enabled) {
  node.setEnabled?.(enabled);
  node.getChildren?.().forEach(child => setNodeTreeEnabled(child, enabled));
}

function getAssetRoot(asset) {
  return asset?.root || asset || null;
}

export function getModelBounds(root) {
  root = getAssetRoot(root);
  const meshes = root.getChildMeshes(false).filter(mesh => mesh.getTotalVertices && mesh.getTotalVertices() > 0);
  if (meshes.length === 0) return null;

  let min = new BABYLON.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  let max = new BABYLON.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

  root.computeWorldMatrix(true);
  meshes.forEach(mesh => {
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    min = BABYLON.Vector3.Minimize(min, box.minimumWorld);
    max = BABYLON.Vector3.Maximize(max, box.maximumWorld);
  });

  const size = max.subtract(min);
  const center = min.add(size.scale(0.5));
  return { min, max, size, center };
}

export function fitModelToHeight(root, targetHeight, groundY = 0) {
  const initialBounds = getModelBounds(root);
  if (!initialBounds || initialBounds.size.y <= 0) return false;
  const parentPosition = root.parent?.getAbsolutePosition?.() || BABYLON.Vector3.Zero();

  const scale = targetHeight / initialBounds.size.y;
  root.scaling.scaleInPlace(scale);

  const scaledBounds = getModelBounds(root);
  if (!scaledBounds) return false;

  root.position.x += parentPosition.x - scaledBounds.center.x;
  root.position.z += parentPosition.z - scaledBounds.center.z;
  root.position.y += parentPosition.y + groundY - scaledBounds.min.y;
  return true;
}

export function fitModelToLargestAxis(root, targetSize) {
  const initialBounds = getModelBounds(root);
  if (!initialBounds) return false;
  const parentPosition = root.parent?.getAbsolutePosition?.() || BABYLON.Vector3.Zero();

  const largestAxis = Math.max(initialBounds.size.x, initialBounds.size.y, initialBounds.size.z);
  if (largestAxis <= 0) return false;

  root.scaling.scaleInPlace(targetSize / largestAxis);
  const scaledBounds = getModelBounds(root);
  if (!scaledBounds) return false;

  root.position.x += parentPosition.x - scaledBounds.center.x;
  root.position.y += parentPosition.y - scaledBounds.center.y;
  root.position.z += parentPosition.z - scaledBounds.center.z;
  return true;
}
