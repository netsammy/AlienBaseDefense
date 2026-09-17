// ================================================================
// IN-GAME SETTINGS & AUDIO CONTROLS
// ================================================================

import { setMasterVolume, setMusicVolume, setSfxVolume, setVoiceVolume, setVoiceEnabled, getAudioSettings, playSound } from "./sound.js";
import { setSensitivityMultiplier, getSensitivityMultiplier } from "./input.js";
import { returnToMainMenu } from "./pause.js";
import { requestPointerLockSafely } from "./pointerLock.js";

const SETTINGS_STORAGE_KEY = "alien_defense_settings_v1";

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.master === "number") setMasterVolume(data.master);
    if (typeof data.music === "number") setMusicVolume(data.music);
    if (typeof data.sfx === "number") setSfxVolume(data.sfx);
    if (typeof data.voice === "number") setVoiceVolume(data.voice);
    if (typeof data.voiceEnabled === "boolean") setVoiceEnabled(data.voiceEnabled);
    if (typeof data.sensitivity === "number") setSensitivityMultiplier(data.sensitivity);
  } catch (err) {
    console.warn("Failed to load settings:", err);
  }
}

export function saveSettings() {
  try {
    const audio = getAudioSettings();
    const data = {
      master: audio.master,
      music: audio.music,
      sfx: audio.sfx,
      voice: audio.voice,
      voiceEnabled: audio.voiceEnabled,
      sensitivity: getSensitivityMultiplier()
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to save settings:", err);
  }
}

export function openSettings(context) {
  const overlay = document.getElementById("settingsOverlay");
  if (!overlay) return;
  overlay.style.display = "flex";
  if (context?.game && context.game.started && !context.game.gameOver) {
    context.game.paused = true;
  }
  if (document.exitPointerLock) {
    document.exitPointerLock();
  }
  syncSettingsUI();
}

export function closeSettings(context) {
  const overlay = document.getElementById("settingsOverlay");
  if (!overlay) return;
  overlay.style.display = "none";
  saveSettings();
  if (context?.game && context.game.started && !context.game.gameOver) {
    context.game.paused = false;
    if (context.canvas) {
      requestPointerLockSafely(context.canvas);
    }
  }
}

function syncSettingsUI() {
  const audio = getAudioSettings();
  const sens = getSensitivityMultiplier();

  const masterSlider = document.getElementById("masterVolSlider");
  const masterVal = document.getElementById("masterVolVal");
  if (masterSlider && masterVal) {
    masterSlider.value = Math.round(audio.master * 100);
    masterVal.textContent = `${masterSlider.value}%`;
  }

  const musicSlider = document.getElementById("musicVolSlider");
  const musicVal = document.getElementById("musicVolVal");
  if (musicSlider && musicVal) {
    musicSlider.value = Math.round(audio.music * 100);
    musicVal.textContent = `${musicSlider.value}%`;
  }

  const sfxSlider = document.getElementById("sfxVolSlider");
  const sfxVal = document.getElementById("sfxVolVal");
  if (sfxSlider && sfxVal) {
    sfxSlider.value = Math.round(audio.sfx * 100);
    sfxVal.textContent = `${sfxSlider.value}%`;
  }

  const voiceSlider = document.getElementById("voiceVolSlider");
  const voiceVal = document.getElementById("voiceVolVal");
  if (voiceSlider && voiceVal) {
    voiceSlider.value = Math.round(audio.voice * 100);
    voiceVal.textContent = `${voiceSlider.value}%`;
  }

  const voiceToggle = document.getElementById("voiceToggle");
  if (voiceToggle) {
    voiceToggle.checked = Boolean(audio.voiceEnabled);
  }

  const sensSlider = document.getElementById("sensSlider");
  const sensVal = document.getElementById("sensVal");
  if (sensSlider && sensVal) {
    sensSlider.value = Math.round(sens * 100);
    sensVal.textContent = `${sens.toFixed(1)}x`;
  }
}

export function setupSettingsModal(context) {
  loadSettings();

  const mobileBtn = document.getElementById("mobileSettingsBtn");
  if (mobileBtn) {
    mobileBtn.addEventListener("click", () => {
      playSound("click");
      const overlay = document.getElementById("settingsOverlay");
      if (overlay && overlay.style.display === "flex") {
        closeSettings(context);
      } else {
        openSettings(context);
      }
    });
  }

  // Keyboard shortcut: Escape toggles settings modal
  window.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      const overlay = document.getElementById("settingsOverlay");
      if (overlay && overlay.style.display === "flex") {
        closeSettings(context);
      } else if (context.game && context.game.started && !context.game.gameOver) {
        openSettings(context);
      }
    }
  });

  const masterSlider = document.getElementById("masterVolSlider");
  const masterVal = document.getElementById("masterVolVal");
  masterSlider?.addEventListener("input", e => {
    const val = Number(e.target.value) / 100;
    setMasterVolume(val);
    if (masterVal) masterVal.textContent = `${e.target.value}%`;
  });

  const musicSlider = document.getElementById("musicVolSlider");
  const musicVal = document.getElementById("musicVolVal");
  musicSlider?.addEventListener("input", e => {
    const val = Number(e.target.value) / 100;
    setMusicVolume(val);
    if (musicVal) musicVal.textContent = `${e.target.value}%`;
  });

  const sfxSlider = document.getElementById("sfxVolSlider");
  const sfxVal = document.getElementById("sfxVolVal");
  sfxSlider?.addEventListener("input", e => {
    const val = Number(e.target.value) / 100;
    setSfxVolume(val);
    if (sfxVal) sfxVal.textContent = `${e.target.value}%`;
  });

  const voiceSlider = document.getElementById("voiceVolSlider");
  const voiceVal = document.getElementById("voiceVolVal");
  voiceSlider?.addEventListener("input", e => {
    const val = Number(e.target.value) / 100;
    setVoiceVolume(val);
    if (voiceVal) voiceVal.textContent = `${e.target.value}%`;
  });

  const voiceToggle = document.getElementById("voiceToggle");
  voiceToggle?.addEventListener("change", e => {
    setVoiceEnabled(e.target.checked);
  });

  const sensSlider = document.getElementById("sensSlider");
  const sensVal = document.getElementById("sensVal");
  sensSlider?.addEventListener("input", e => {
    const val = Number(e.target.value) / 100;
    setSensitivityMultiplier(val);
    if (sensVal) sensVal.textContent = `${val.toFixed(1)}x`;
  });

  const resumeBtn = document.getElementById("resumeGameBtn");
  resumeBtn?.addEventListener("click", () => {
    playSound("click");
    closeSettings(context);
  });

  const restartBtn = document.getElementById("settingsRestartBtn");
  restartBtn?.addEventListener("click", () => {
    playSound("click");
    closeSettings(context);
    if (context.resetGame) {
      context.resetGame();
    }
  });

  const quitBtn = document.getElementById("settingsQuitBtn");
  quitBtn?.addEventListener("click", () => {
    playSound("click");
    closeSettings(context);
    returnToMainMenu(context);
  });
}
