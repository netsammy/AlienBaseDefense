import * as BABYLON from "@babylonjs/core";
import { getUI } from "./ui.js";
import { createGameScene } from "./scene.js";
import { setupInput } from "./input.js";
import { setupAudioUnlock } from "./sound.js";
import { setupAdsIfAvailable } from "./adBridge.js";

const canvas = document.getElementById("renderCanvas");
const ui = getUI();

if (!supportsWebGL()) {
  showCompatibilityError();
} else {
  if (ui.loadingOverlay) ui.loadingOverlay.style.display = "none";
  const engine = new BABYLON.Engine(canvas, true);
  const context = createGameScene({ canvas, engine, ui });
  window.__alienBaseDefense = context;

  setupAudioUnlock();
  setupInput(context);
  setupAdsIfAvailable();

  engine.runRenderLoop(() => {
    context.scene.render();
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });
}

function supportsWebGL() {
  try {
    const testCanvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext
      && (testCanvas.getContext("webgl2") || testCanvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

function showCompatibilityError() {
  document.getElementById("loadingOverlay").style.display = "none";
  document.getElementById("hud").style.display = "none";
  document.getElementById("startOverlay").style.display = "none";
  document.getElementById("compatOverlay").style.display = "flex";
}

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    if (location.protocol === "file:" || location.protocol === "capacitor:" || location.hostname === "localhost") return;
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
