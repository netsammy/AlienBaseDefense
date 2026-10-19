// ================================================================
// IN-GAME SETTINGS & AUDIO CONTROLS
// ================================================================

import { setMasterVolume, setMusicVolume, setSfxVolume, setVoiceVolume, setVoiceEnabled, getAudioSettings, playSound } from "./sound.js";
import { setSensitivityMultiplier, getSensitivityMultiplier } from "./input.js";
import { returnToMainMenu } from "./pause.js";
import { requestPointerLockSafely } from "./pointerLock.js";
import { saveGame } from "./saveSystem.js";

const SETTINGS_STORAGE_KEY = "alien_defense_settings_v1";
let currentContext = null;

export function loadSettings(context = null) {
  if (context) currentContext = context;
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
    if (typeof data.autoFire === "boolean" && currentContext?.game) {
      currentContext.game.autoFire = data.autoFire;
    }
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
      sensitivity: getSensitivityMultiplier(),
      autoFire: Boolean(currentContext?.game?.autoFire)
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to save settings:", err);
  }
}

export function openSettings(context) {
  if (context) currentContext = context;
  const overlay = document.getElementById("settingsOverlay");
  if (!overlay) return;
  overlay.style.display = "flex";

  const isPlaying = Boolean(context?.game && context.game.started && !context.game.gameOver);
  if (isPlaying) {
    context.game.paused = true;
  }
  if (document.exitPointerLock) {
    document.exitPointerLock();
  }

  const resumeBtn = document.getElementById("resumeGameBtn");
  const restartBtn = document.getElementById("settingsRestartBtn");
  const quitBtn = document.getElementById("settingsQuitBtn");
  if (resumeBtn) {
    resumeBtn.textContent = isPlaying ? "RESUME MISSION" : "CLOSE SETTINGS";
  }
  if (restartBtn) {
    restartBtn.style.display = isPlaying ? "block" : "none";
  }
  if (quitBtn) {
    quitBtn.style.display = isPlaying ? "block" : "none";
  }

  syncSettingsUI();
}

export function closeSettings(context) {
  if (context) currentContext = context;
  const overlay = document.getElementById("settingsOverlay");
  if (!overlay) return;
  overlay.style.display = "none";
  saveSettings();

  const isPlaying = Boolean(context?.game && context.game.started && !context.game.gameOver);
  if (isPlaying) {
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

  const autoFire = Boolean(currentContext?.game?.autoFire);
  const settingsAutoFire = document.getElementById("settingsAutoFireToggle");
  if (settingsAutoFire) {
    settingsAutoFire.checked = autoFire;
  }
  const controlsAutoFire = document.getElementById("autoFireToggle");
  if (controlsAutoFire) {
    controlsAutoFire.checked = autoFire;
  }
}

export function setupSettingsModal(context) {
  currentContext = context;
  loadSettings(context);

  const settingsAutoFire = document.getElementById("settingsAutoFireToggle");
  if (settingsAutoFire) {
    settingsAutoFire.checked = Boolean(context.game?.autoFire);
    settingsAutoFire.addEventListener("change", (e) => {
      if (context.game) {
        context.game.autoFire = Boolean(e.target.checked);
        saveGame(context.game);
      }
      const controlsAutoFire = document.getElementById("autoFireToggle");
      if (controlsAutoFire) controlsAutoFire.checked = Boolean(e.target.checked);
      saveSettings();
    });
  }

  const controlsAutoFire = document.getElementById("autoFireToggle");
  if (controlsAutoFire) {
    controlsAutoFire.checked = Boolean(context.game?.autoFire);
    controlsAutoFire.addEventListener("change", (e) => {
      if (context.game) {
        context.game.autoFire = Boolean(e.target.checked);
        saveGame(context.game);
      }
      const settingsAutoFire = document.getElementById("settingsAutoFireToggle");
      if (settingsAutoFire) settingsAutoFire.checked = Boolean(e.target.checked);
      saveSettings();
    });
  }

  let lastOpenTime = 0;
  const attachOpenListener = (btn) => {
    if (!btn) return;
    const handleOpen = (e) => {
      const now = performance.now();
      if (now - lastOpenTime < 350) return;
      lastOpenTime = now;
      e?.preventDefault?.();
      e?.stopPropagation?.();
      playSound("click");
      const overlay = document.getElementById("settingsOverlay");
      if (overlay && overlay.style.display === "flex") {
        closeSettings(context);
      } else {
        openSettings(context);
      }
    };
    btn.onclick = handleOpen;
  };

  attachOpenListener(document.getElementById("mobileSettingsBtn"));
  attachOpenListener(document.getElementById("menuSettingsButton"));
  attachOpenListener(document.getElementById("pauseSettingsButton"));

  // Keyboard shortcut: Escape toggles settings modal
  window.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      const overlay = document.getElementById("settingsOverlay");
      if (overlay && overlay.style.display === "flex") {
        closeSettings(context);
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

  let lastCloseTime = 0;
  const attachCloseAction = (btn, action) => {
    if (!btn) return;
    const handleClose = (e) => {
      const now = performance.now();
      if (now - lastCloseTime < 350) return;
      lastCloseTime = now;
      e?.preventDefault?.();
      e?.stopPropagation?.();
      playSound("click");
      action();
    };
    btn.onclick = handleClose;
  };

  attachCloseAction(document.getElementById("settingsCloseBtn"), () => closeSettings(context));
  attachCloseAction(document.getElementById("resumeGameBtn"), () => closeSettings(context));
  attachCloseAction(document.getElementById("settingsRestartBtn"), () => {
    closeSettings(context);
    if (context.resetGame) {
      context.resetGame();
    }
  });
  attachCloseAction(document.getElementById("settingsQuitBtn"), () => {
    closeSettings(context);
    returnToMainMenu(context);
  });
}
