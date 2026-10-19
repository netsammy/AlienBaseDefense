import * as BABYLON from "@babylonjs/core";
import { getUI } from "./ui.js";
import { createGameScene } from "./scene.js";
import { setupInput } from "./input.js";
import { setupAudioUnlock } from "./sound.js";
import { setupAdsIfAvailable, showRewardedDoubleLootIfAvailable } from "./adBridge.js";
import { initRetention, claimDailyReward, claimMissionReward } from "./retention.js";
import { setupSettingsModal } from "./settings.js";
import { isMobileDevice } from "./graphics.js";

const canvas = document.getElementById("renderCanvas");
const ui = getUI();

if (!supportsWebGL()) {
  showCompatibilityError();
} else {
  if (ui.loadingOverlay) ui.loadingOverlay.style.display = "none";
  const isMobile = isMobileDevice();
  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: false,
    powerPreference: "high-performance",
    doNotHandleContextLost: false
  }, true);
  const context = createGameScene({ canvas, engine, ui });
  window.__alienBaseDefense = context;

  setupAudioUnlock();
  setupInput(context);
  setupSettingsModal(context);
  setupAdsIfAvailable();
  initRetention(context);

  const claimDailyBtn = document.getElementById("claimDailyBtn");
  if (claimDailyBtn) {
    claimDailyBtn.addEventListener("click", () => {
      claimDailyReward(context);
      claimDailyBtn.disabled = !context.game.canClaimDaily;
      claimDailyBtn.textContent = context.game.canClaimDaily ? "CLAIM DAILY REWARD" : "DAILY REWARD CLAIMED";
    });
  }

  const doubleLootBtn = document.getElementById("doubleLootBtn");
  if (doubleLootBtn) {
    doubleLootBtn.addEventListener("click", async () => {
      doubleLootBtn.disabled = true;
      doubleLootBtn.textContent = "CLAIMING...";
      const success = await showRewardedDoubleLootIfAvailable(context);
      doubleLootBtn.textContent = success ? "2X REWARD CLAIMED!" : "DOUBLE LOOT (2X)";
    });
  }

  engine.runRenderLoop(() => {
    try {
      context.scene.render();
    } catch (err) {
      console.error("Safely caught render loop error:", err);
    }
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
