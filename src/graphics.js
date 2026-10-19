import { saveGame } from "./saveSystem.js";

export function isMobileDevice() {
  return Boolean(
    window.Capacitor?.isNativePlatform?.()
    || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
  );
}

const PRESETS = {
  low: {
    label: "Low",
    hardwareScaling: 1.15,
    effectsScale: 0.60,
    fogDensity: 0.0
  },
  medium: {
    label: "Medium",
    hardwareScaling: 1.0,
    effectsScale: 0.85,
    fogDensity: 0.0
  },
  high: {
    label: "High (Crisp)",
    hardwareScaling: 1.0,
    effectsScale: 1.10,
    fogDensity: 0.0
  },
  ultra: {
    label: "Ultra (Super-Res)",
    hardwareScaling: 0.75,
    effectsScale: 1.35,
    fogDensity: 0.0
  }
};

export function setupGraphicsQuality(context) {
  const { game, ui } = context;
  const initialQuality = game.graphicsQuality || "high";
  applyGraphicsQuality(context, initialQuality, false);

  ui.graphicsButtons?.forEach(button => {
    button.addEventListener("click", () => {
      applyGraphicsQuality(context, button.dataset.graphicsQuality, true);
      ui.message.textContent = `Graphics set to ${PRESETS[game.graphicsQuality].label}.`;
    });
  });
}

export function applyGraphicsQuality(context, quality, shouldSave = true) {
  const preset = PRESETS[quality] || PRESETS.high;
  const { engine, scene, game, ui } = context;
  const isMobile = isMobileDevice();

  game.graphicsQuality = quality in PRESETS ? quality : "high";
  game.effectsScale = preset.effectsScale;

  // Razor-sharp native resolution across both mobile and desktop (no forced downsampling blur)
  const effectiveScaling = preset.hardwareScaling;
  engine.setHardwareScalingLevel(effectiveScaling);
  scene.fogDensity = preset.fogDensity;

  if (scene.glowLayer) {
    // Disable expensive full-screen blur pass on mobile to prevent GPU fill-rate throttling
    scene.glowLayer.isEnabled = !isMobile && quality !== "low";
    scene.glowLayer.intensity = quality === "high" ? 0.95 : 0.7;
  }

  ui.graphicsButtons?.forEach(button => {
    button.classList.toggle("selected", button.dataset.graphicsQuality === game.graphicsQuality);
  });

  if (shouldSave) saveGame(game);
}
