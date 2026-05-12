import * as BABYLON from "@babylonjs/core";
import "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF";
import { fitModelToHeight, fitModelToLargestAxis } from "./assets.js";

const PREVIEW_ALIENS = {
  mutant: {
    label: "Animated Mutant",
    path: "/assets/models/alien_withanimations_webp.glb",
    height: 3.2,
    cameraRadius: 6.4,
    fallbackColor: new BABYLON.Color3(0.08, 0.11, 0.13)
  },
  grunt: {
    label: "Green Grunt",
    path: "/assets/models/alien_grunt_green.glb",
    height: 3.05,
    cameraRadius: 5.8,
    fallbackColor: new BABYLON.Color3(0.28, 0.72, 0.42)
  },
  runner: {
    label: "Purple Runner",
    path: "/assets/models/alien_runner_purple.glb",
    height: 2.65,
    cameraRadius: 5.4,
    fallbackColor: new BABYLON.Color3(0.34, 0.9, 0.92)
  },
  brute: {
    label: "Armored Brute",
    path: "/assets/models/alien_brute_armored.glb",
    height: 3.85,
    cameraRadius: 7,
    fallbackColor: new BABYLON.Color3(0.75, 0.28, 0.18)
  },
  boss: {
    label: "Horned Boss",
    path: "/assets/models/alien_boss_horned.glb",
    height: 5.1,
    cameraRadius: 9,
    fallbackColor: new BABYLON.Color3(0.58, 0.16, 0.78)
  },
  brutePurple: {
    label: "Purple Brute",
    path: "/assets/models/alien_brute_purple.glb",
    height: 3.85,
    cameraRadius: 7,
    fallbackColor: new BABYLON.Color3(0.42, 0.16, 0.72)
  },
  plasmaCannon: {
    label: "Plasma Cannon",
    path: "/assets/models/weapon_plasma_cannon.glb",
    fitMode: "largest",
    targetSize: 3.6,
    cameraRadius: 6.2,
    fallbackColor: new BABYLON.Color3(0.1, 0.45, 0.5)
  },
  marketStall: {
    label: "Market Stall",
    path: "/assets/models/market_stall_crates.glb",
    fitMode: "largest",
    targetSize: 3.8,
    cameraRadius: 6.6,
    fallbackColor: new BABYLON.Color3(0.62, 0.46, 0.28)
  },
  peshawarGate: {
    label: "Peshawar Gate",
    path: "/assets/models/peshawar_gate.glb",
    fitMode: "largest",
    targetSize: 4.4,
    cameraRadius: 7.2,
    fallbackColor: new BABYLON.Color3(0.55, 0.4, 0.26)
  },
  cityWatchtower: {
    label: "City Watchtower",
    path: "/assets/models/city_watchtower.glb",
    fitMode: "largest",
    targetSize: 4.2,
    cameraRadius: 7,
    fallbackColor: new BABYLON.Color3(0.72, 0.52, 0.28)
  },
  shippingContainer: {
    label: "Shipping Container",
    path: "/assets/models/karachi_shipping_container.glb",
    fitMode: "largest",
    targetSize: 4,
    cameraRadius: 6.4,
    fallbackColor: new BABYLON.Color3(0.1, 0.36, 0.38)
  },
  roadBarricade: {
    label: "Road Barricade",
    path: "/assets/models/road_barricade_urdu.glb",
    fitMode: "largest",
    targetSize: 3.6,
    cameraRadius: 6,
    fallbackColor: new BABYLON.Color3(0.42, 0.34, 0.24)
  },
  shopWorkbench: {
    label: "Shop Workbench",
    path: "/assets/models/upgrade_shop_workbench.glb",
    fitMode: "largest",
    targetSize: 3.8,
    cameraRadius: 6.6,
    fallbackColor: new BABYLON.Color3(0.4, 0.27, 0.17)
  },
  planterBarrier: {
    label: "Planter Barrier",
    path: "/assets/models/street_planter_barrier.glb",
    fitMode: "largest",
    targetSize: 3.6,
    cameraRadius: 6,
    fallbackColor: new BABYLON.Color3(0.28, 0.42, 0.22)
  },
  sectorSign: {
    label: "Sector Sign",
    path: "/assets/models/sector_sign_board.glb",
    fitMode: "largest",
    targetSize: 3.8,
    cameraRadius: 6.2,
    fallbackColor: new BABYLON.Color3(0.22, 0.32, 0.42)
  },
  sandbagWall: {
    label: "Sandbag Wall",
    path: "/assets/models/sandbag_wall.glb",
    fitMode: "largest",
    targetSize: 3.8,
    cameraRadius: 6.2,
    fallbackColor: new BABYLON.Color3(0.45, 0.34, 0.22)
  }
};

export function setupAlienGallery(context) {
  const { ui } = context;
  if (!ui.alienGalleryButton || !ui.alienGalleryOverlay || !ui.alienPreviewCanvas) return;

  const gallery = createGalleryPreview(ui.alienPreviewCanvas);

  ui.alienGalleryButton.addEventListener("click", () => {
    ui.alienGalleryOverlay.style.display = "flex";
    ui.startOverlay.style.display = "none";
    gallery.open(getSelectedType(ui) || "mutant");
  });

  ui.alienGalleryClose?.addEventListener("click", () => {
    ui.alienGalleryOverlay.style.display = "none";
    ui.startOverlay.style.display = context.game.started ? "none" : "flex";
    gallery.pause();
  });

  ui.alienPreviewButtons.forEach(button => {
    button.addEventListener("click", () => {
      const type = button.dataset.alienPreview;
      if (!PREVIEW_ALIENS[type]) return;
      ui.alienPreviewButtons.forEach(item => item.classList.toggle("selected", item === button));
      gallery.show(type);
    });
  });

  window.addEventListener("resize", () => gallery.resize());
}

function createGalleryPreview(canvas) {
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.01, 0.015, 0.025, 1);

  const camera = new BABYLON.ArcRotateCamera(
    "AlienPreviewCamera",
    Math.PI / 2,
    Math.PI / 2.35,
    6,
    new BABYLON.Vector3(0, 1.7, 0),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 4;
  camera.upperRadiusLimit = 11;
  camera.wheelPrecision = 45;
  camera.panningSensibility = 0;

  const hemi = new BABYLON.HemisphericLight("AlienPreviewHemi", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.95;
  hemi.groundColor = new BABYLON.Color3(0.08, 0.13, 0.16);

  const key = new BABYLON.DirectionalLight("AlienPreviewKey", new BABYLON.Vector3(-0.45, -0.75, 0.35), scene);
  key.position = new BABYLON.Vector3(4, 7, -4);
  key.intensity = 1.6;

  const rim = new BABYLON.PointLight("AlienPreviewRim", new BABYLON.Vector3(-2.6, 3.2, 2.4), scene);
  rim.diffuse = new BABYLON.Color3(0.22, 0.9, 1);
  rim.specular = new BABYLON.Color3(0.22, 0.9, 1);
  rim.intensity = 1.25;

  const platformMaterial = new BABYLON.StandardMaterial("AlienPreviewPlatformMat", scene);
  platformMaterial.diffuseColor = new BABYLON.Color3(0.05, 0.07, 0.08);
  platformMaterial.emissiveColor = new BABYLON.Color3(0.015, 0.08, 0.1);
  platformMaterial.specularColor = new BABYLON.Color3(0.16, 0.24, 0.25);

  const platform = BABYLON.MeshBuilder.CreateCylinder("AlienPreviewPlatform", {
    diameter: 3.6,
    height: 0.08,
    tessellation: 64
  }, scene);
  platform.position.y = -0.05;
  platform.material = platformMaterial;

  const assetCache = new Map();
  let activeRoot = null;
  let activeAnimations = [];
  let activeType = "mutant";
  let running = false;

  scene.onBeforeRenderObservable.add(() => {
    if (activeRoot) activeRoot.rotation.y += scene.getEngine().getDeltaTime() * 0.00045;
  });

  engine.runRenderLoop(() => {
    if (running) scene.render();
  });

  return {
    open(type) {
      running = true;
      this.resize();
      this.show(type);
    },
    pause() {
      running = false;
      activeAnimations.forEach(group => group.pause());
    },
    resize() {
      engine.resize();
    },
    async show(type) {
      activeType = type;
      activeAnimations.forEach(group => group.dispose());
      activeAnimations = [];
      if (activeRoot) {
        activeRoot.dispose();
        activeRoot = null;
      }

      const config = PREVIEW_ALIENS[type] || PREVIEW_ALIENS.mutant;
      const frameHeight = config.height || config.targetSize || 3;
      camera.radius = config.cameraRadius;
      camera.target = new BABYLON.Vector3(0, frameHeight * 0.42, 0);

      try {
        const container = await loadPreviewContainer(scene, assetCache, config.path);
        if (activeType !== type) return;
        const preview = instantiatePreviewModel(scene, container, type, config);
        activeRoot = preview.root;
        activeAnimations = preview.animationGroups;
      } catch {
        activeRoot = createFallbackAlien(scene, type, config);
      }

      window.__alienGalleryDebug = {
        currentType: type,
        meshCount: activeRoot?.getChildMeshes(false).length || 0,
        animations: activeAnimations.map(group => group.name)
      };
    }
  };
}

function getSelectedType(ui) {
  return Array.from(ui.alienPreviewButtons).find(button => button.classList.contains("selected"))?.dataset.alienPreview;
}

async function loadPreviewContainer(scene, cache, path) {
  if (cache.has(path)) return cache.get(path);

  const url = `${path}?v=${Date.now()}`;
  const response = await fetch(url, { method: "HEAD", cache: "reload" });
  if (!response.ok) throw new Error(`Missing preview model: ${path}`);

  const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
    path.substring(0, path.lastIndexOf("/") + 1),
    `${path.substring(path.lastIndexOf("/") + 1)}?v=${Date.now()}`,
    scene
  );
  container.animationGroups.forEach(group => group.stop());
  cache.set(path, container);
  return container;
}

function instantiatePreviewModel(scene, container, type, config) {
  const entries = container.instantiateModelsToScene(sourceName => `Preview_${type}_${sourceName}`, false);
  const root = new BABYLON.TransformNode(`PreviewAlien_${type}`, scene);
  entries.rootNodes.forEach(node => {
    node.parent = root;
    setNodeTreeEnabled(node, true);
  });

  root.rotation.y = Math.PI;
  root.getChildMeshes(false).forEach(mesh => {
    mesh.isPickable = false;
    mesh.receiveShadows = true;
  });

  const fitted = config.fitMode === "largest"
    ? fitModelToLargestAxis(root, config.targetSize || 3)
    : fitModelToHeight(root, config.height, 0);
  if (!fitted || root.getChildMeshes(false).length === 0) {
    root.dispose();
    throw new Error(`Invalid preview model for ${type}`);
  }

  const targetMap = buildPreviewTargetMap(root, entries.skeletons || [], `Preview_${type}`);
  const animationGroups = container.animationGroups
    .map(group => group.clone(`Preview_${type}_${group.name}`, target => targetMap.get(target?.name) || null))
    .filter(Boolean);

  animationGroups.forEach(group => group.stop());
  playPreviewAnimation(animationGroups);

  return { root, animationGroups };
}

function createFallbackAlien(scene, type, config) {
  const height = config.height || config.targetSize || 3;
  const root = new BABYLON.TransformNode(`PreviewFallback_${type}`, scene);
  const material = new BABYLON.StandardMaterial(`PreviewFallbackMat_${type}`, scene);
  material.diffuseColor = config.fallbackColor;
  material.emissiveColor = config.fallbackColor.scale(type === "mutant" ? 0.12 : 0.08);
  material.specularColor = new BABYLON.Color3(0.25, 0.35, 0.36);

  const body = BABYLON.MeshBuilder.CreateCapsule(`PreviewFallbackBody_${type}`, {
    height: height * 0.72,
    radius: height * 0.16
  }, scene);
  body.position.y = height * 0.42;
  body.material = material;
  body.parent = root;

  const head = BABYLON.MeshBuilder.CreateSphere(`PreviewFallbackHead_${type}`, {
    diameter: height * 0.28,
    segments: 18
  }, scene);
  head.position.y = height * 0.84;
  head.material = material;
  head.parent = root;

  const armRadius = height * 0.04;
  [-1, 1].forEach(side => {
    const arm = BABYLON.MeshBuilder.CreateCapsule(`PreviewFallbackArm_${type}_${side}`, {
      height: height * 0.44,
      radius: armRadius
    }, scene);
    arm.position.set(side * height * 0.2, height * 0.48, 0);
    arm.rotation.z = side * 0.26;
    arm.material = material;
    arm.parent = root;
  });

  return root;
}

function playPreviewAnimation(animationGroups) {
  if (!animationGroups.length) return;
  const idle = animationGroups.find(group => /idle|breath/i.test(group.name));
  const run = animationGroups.find(group => /run|walk/i.test(group.name));
  const selected = idle || run || animationGroups[0];
  selected.start(true);
}

function buildPreviewTargetMap(root, skeletons, prefix) {
  const targetMap = new Map();
  const addTarget = target => {
    if (!target?.name) return;
    targetMap.set(target.name, target);
    if (target.name.startsWith(`${prefix}_`)) {
      targetMap.set(target.name.slice(prefix.length + 1), target);
    }
  };

  root.getDescendants(false).forEach(addTarget);
  skeletons.forEach(skeleton => skeleton.bones?.forEach(addTarget));
  return targetMap;
}

function setNodeTreeEnabled(node, enabled) {
  node.setEnabled?.(enabled);
  node.getChildren?.().forEach(child => setNodeTreeEnabled(child, enabled));
}
