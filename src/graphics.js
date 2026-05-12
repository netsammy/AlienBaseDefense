import { saveGame } from "./saveSystem.js";

const PRESETS = {
  low: {
    label: "Low",
    hardwareScaling: 1.75,
    effectsScale: 0.55,
    fogDensity: 0.008
  },
  medium: {
    label: "Medium",
    hardwareScaling: 1.3,
    effectsScale: 0.85,
    fogDensity: 0.01
  },
  high: {
    label: "High",
    hardwareScaling: 1,
    effectsScale: 1.15,
    fogDensity: 0.012
  }
};

export function setupGraphicsQuality(context) {
  const { game, ui } = context;
  applyGraphicsQuality(context, game.graphicsQuality || "medium", false);

  ui.graphicsButtons?.forEach(button => {
    button.addEventListener("click", () => {
      applyGraphicsQuality(context, button.dataset.graphicsQuality, true);
      ui.message.textContent = `Graphics set to ${PRESETS[game.graphicsQuality].label}.`;
    });
  });
}

export function applyGraphicsQuality(context, quality, shouldSave = true) {
  const preset = PRESETS[quality] || PRESETS.medium;
  const { engine, scene, game, ui } = context;

  game.graphicsQuality = quality in PRESETS ? quality : "medium";
  game.effectsScale = preset.effectsScale;
  engine.setHardwareScalingLevel(preset.hardwareScaling);
  scene.fogDensity = preset.fogDensity;

  ui.graphicsButtons?.forEach(button => {
    button.classList.toggle("selected", button.dataset.graphicsQuality === game.graphicsQuality);
  });

  if (shouldSave) saveGame(game);
}
