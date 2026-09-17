import * as BABYLON from "@babylonjs/core";
import { PLAYER_SPEED, keyboardState, triggerTacticalSlide, triggerTacticalJump } from "./player.js";
import { fire, reload, checkAutoFire, triggerAdrenalineSurge, triggerKineticEmpBlast, switchWeapon, cycleWeapon, toggleSniperScope } from "./weapons.js";
import { returnToMainMenu, setPaused, togglePause } from "./pause.js";
import { requestPointerLockSafely } from "./pointerLock.js";
import { saveGame } from "./saveSystem.js";
import { toggleFlashlight } from "./scene.js";
import { handleTurretContextualAction, handleTurretUpgradeDirect } from "./towers.js";

let userSensitivityMultiplier = 1.0;

export function setSensitivityMultiplier(val) {
  userSensitivityMultiplier = Math.max(0.2, Math.min(3.0, val));
}

export function getSensitivityMultiplier() {
  return userSensitivityMultiplier;
}

export function setupInput(context) {
  const { canvas, camera, game, ui, resetGame, engine } = context;

  const canUseGameplayPointerLock = () => (
    game.started
    && !game.paused
    && !game.gameOver
    && ui.startOverlay.style.display !== "flex"
    && ui.pauseOverlay.style.display !== "flex"
    && ui.controlsOverlay.style.display !== "flex"
    && ui.rewardOverlay.style.display !== "flex"
    && (!ui.stageClearOverlay || ui.stageClearOverlay.style.display !== "flex")
    && (!ui.defeatOverlay || ui.defeatOverlay.style.display !== "flex")
    && (!document.getElementById("settingsOverlay") || document.getElementById("settingsOverlay").style.display !== "flex")
  );

  context.inputState = context.inputState || { isFiring: false, isMobileFiring: false };
  let isPointerLocked = false;
  let isMouseDown = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  const onPointerLockChange = () => {
    isPointerLocked = document.pointerLockElement === canvas;
    if (engine) {
      engine.isPointerLock = isPointerLocked;
    }
  };

  document.addEventListener("pointerlockchange", onPointerLockChange);

  window.addEventListener("blur", () => {
    isMouseDown = false;
    if (context.inputState) {
      context.inputState.isFiring = false;
      context.inputState.isMobileFiring = false;
    }
    keyboardState.forward = false;
    keyboardState.backward = false;
    keyboardState.left = false;
    keyboardState.right = false;
    keyboardState.sprint = false;
  });

  // Mouse look via Pointer Lock or smooth drag fallback
  window.addEventListener("mousemove", e => {
    if (!canUseGameplayPointerLock()) return;

    if (isPointerLocked || document.pointerLockElement === canvas) {
      const mouseSens = 0.0022 * userSensitivityMultiplier;
      camera.rotation.y += e.movementX * mouseSens;
      camera.rotation.x = clamp(camera.rotation.x + e.movementY * mouseSens, -1.25, 1.25);
    } else if (isMouseDown) {
      // Smooth drag-to-look fallback when pointer lock is not active
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      const dragSens = 0.0032 * userSensitivityMultiplier;
      camera.rotation.y += dx * dragSens;
      camera.rotation.x = clamp(camera.rotation.x + dy * dragSens, -1.25, 1.25);
    }
  });

  canvas.addEventListener("mousedown", e => {
    if (e.button === 0 && canUseGameplayPointerLock()) {
      isMouseDown = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      canvas.focus();
      if (!isPointerLocked && document.pointerLockElement !== canvas) {
        requestPointerLockSafely(canvas);
      }
    }
  });

  window.addEventListener("mouseup", e => {
    if (e.button === 0) {
      isMouseDown = false;
      if (context.inputState) context.inputState.isFiring = false;
    }
  });

  // Weapon Fire on Left Click, ADS Zoom on Right Click (ignoring UI buttons/overlays)
  window.addEventListener("mousedown", e => {
    if (!canUseGameplayPointerLock()) return;
    if (e.target.closest?.("#mobileControls")) return;
    if (e.target.closest?.(".panel") || e.target.closest?.(".shopBtn") || e.target.closest?.("button")) return;
    if (e.button === 0) {
      if (context.inputState) context.inputState.isFiring = true;
      fire(context);
    } else if (e.button === 2) {
      e.preventDefault();
      if (game.activeWeapon === "sniper") {
        toggleSniperScope(context);
      }
    }
  });

  window.addEventListener("contextmenu", e => {
    if (canUseGameplayPointerLock()) {
      e.preventDefault();
    }
  });

  window.addEventListener("keydown", e => {
    if (game.gameOver) {
      if (e.code === "KeyR" || e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        e.stopPropagation();
        if (ui.defeatOverlay) ui.defeatOverlay.style.display = "none";
        (context.resetGame || resetGame)?.();
        requestPointerLockSafely(canvas);
        return;
      }
    }

    if (ui.stageClearOverlay && ui.stageClearOverlay.style.display === "flex") {
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        ui.stageClearNextBtn?.click();
      }
      return;
    }

    if (e.code === "Escape") {
      if (ui.rewardOverlay.style.display === "flex") return;
      if (ui.stageClearOverlay && ui.stageClearOverlay.style.display === "flex") return;
      togglePause(context);
      return;
    }

    if (game.paused) return;

    // Movement keys (WASD + Arrows)
    if (e.code === "KeyW" || e.code === "ArrowUp") keyboardState.forward = true;
    if (e.code === "KeyS" || e.code === "ArrowDown") keyboardState.backward = true;
    if (e.code === "KeyA" || e.code === "ArrowLeft") keyboardState.left = true;
    if (e.code === "KeyD" || e.code === "ArrowRight") keyboardState.right = true;

    if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
      keyboardState.sprint = true;
      game.sprinting = true;
      camera.speed = PLAYER_SPEED.sprint;
    }

    if (e.code === "KeyR") reload(context);

    if (e.code === "Digit1" || e.code === "Numpad1" || e.key === "1") switchWeapon(context, "shotgun");
    if (e.code === "Digit2" || e.code === "Numpad2" || e.key === "2") switchWeapon(context, "rifle");
    if (e.code === "Digit3" || e.code === "Numpad3" || e.key === "3") switchWeapon(context, "rocket");
    if (e.code === "Digit4" || e.code === "Numpad4" || e.key === "4") switchWeapon(context, "sniper");
    if (e.code === "Digit5" || e.code === "Numpad5" || e.key === "5") switchWeapon(context, "flamethrower");

    if (e.code === "KeyZ") {
      if (game.activeWeapon === "sniper") toggleSniperScope(context);
    }

    if (e.code === "KeyT" || e.code === "KeyL") {
      toggleFlashlight(context);
    }

    if (e.code === "KeyE") {
      handleTurretContextualAction(context);
    }

    if (e.code === "KeyU") {
      handleTurretUpgradeDirect(context);
    }

    if (e.code === "KeyF") {
      triggerAdrenalineSurge(context);
    }

    if (e.code === "KeyQ" || e.code === "KeyX") {
      triggerKineticEmpBlast(context);
    }

    if (e.code === "KeyC") {
      triggerTacticalSlide(context);
    }

    if (e.code === "Space") {
      triggerTacticalJump(context);
    }
  });

  // Mouse wheel weapon cycle
  window.addEventListener("wheel", e => {
    if (!canUseGameplayPointerLock()) return;
    if (Math.abs(e.deltaY) > 4) {
      cycleWeapon(context, e.deltaY > 0 ? 1 : -1);
    }
  }, { passive: true });

  window.addEventListener("keyup", e => {
    if (e.code === "KeyW" || e.code === "ArrowUp") keyboardState.forward = false;
    if (e.code === "KeyS" || e.code === "ArrowDown") keyboardState.backward = false;
    if (e.code === "KeyA" || e.code === "ArrowLeft") keyboardState.left = false;
    if (e.code === "KeyD" || e.code === "ArrowRight") keyboardState.right = false;

    if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
      keyboardState.sprint = false;
      game.sprinting = false;
      camera.speed = PLAYER_SPEED.normal;
    }
  });

  ui.difficultyButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      game.difficulty = btn.dataset.difficulty;
      ui.difficultyButtons.forEach(b => b.classList.toggle("selected", b === btn));
      if (ui.difficultyLabel) {
        ui.difficultyLabel.textContent = btn.textContent.trim();
      }
    });
  });

  if (ui.startButton) {
    const requestStart = event => {
      event.preventDefault();
      event.stopPropagation();
      (context.resetGame || resetGame)?.();
      requestPointerLockSafely(canvas);
    };
    ui.startButton.addEventListener("pointerup", requestStart);
    ui.startButton.addEventListener("touchend", requestStart, { passive: false });
    ui.startButton.addEventListener("click", requestStart);
  }

  const requestRestart = event => {
    event.preventDefault();
    event.stopPropagation();
    (context.resetGame || resetGame)?.();
    requestPointerLockSafely(canvas);
  };
  ui.restartButton.addEventListener("pointerup", requestRestart);
  ui.restartButton.addEventListener("touchend", requestRestart, { passive: false });
  ui.restartButton.addEventListener("click", requestRestart);
  if (ui.continueButton) {
    const requestContinue = event => {
      event.preventDefault();
      event.stopPropagation();
      if (ui.continueButton.disabled) return;
      context.continueAfterReward?.();
    };
    ui.continueButton.addEventListener("pointerup", requestContinue);
    ui.continueButton.addEventListener("touchend", requestContinue, { passive: false });
    ui.continueButton.addEventListener("click", requestContinue);
  }
  ui.resumeButton.addEventListener("click", () => setPaused(context, false));
  ui.controlsButton.addEventListener("click", () => {
    ui.controlsOverlay.style.display = "flex";
  });
  ui.menuControlsButton.addEventListener("click", () => {
    ui.controlsOverlay.style.display = "flex";
  });
  ui.controlsCloseButton.addEventListener("click", () => {
    ui.controlsOverlay.style.display = "none";
  });
  ui.pauseRestartButton.addEventListener("click", (e) => {
    e?.preventDefault?.();
    (context.resetGame || resetGame)?.();
  });
  ui.mainMenuButton.addEventListener("click", () => returnToMainMenu(context));

  if (ui.defeatRestartBtn) {
    const handleDefeatRestart = (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      if (ui.defeatOverlay) ui.defeatOverlay.style.display = "none";
      (context.resetGame || resetGame)?.();
      requestPointerLockSafely(canvas);
    };
    ui.defeatRestartBtn.addEventListener("click", handleDefeatRestart);
    ui.defeatRestartBtn.addEventListener("pointerup", handleDefeatRestart);
    ui.defeatRestartBtn.addEventListener("touchend", handleDefeatRestart, { passive: false });
  }
  if (ui.defeatContinueBtn) {
    const handleDefeatContinue = (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      if (ui.defeatContinueBtn.disabled) return;
      if (ui.defeatOverlay) ui.defeatOverlay.style.display = "none";
      context.continueAfterReward?.();
    };
    ui.defeatContinueBtn.addEventListener("click", handleDefeatContinue);
    ui.defeatContinueBtn.addEventListener("pointerup", handleDefeatContinue);
    ui.defeatContinueBtn.addEventListener("touchend", handleDefeatContinue, { passive: false });
  }
  if (ui.defeatMenuBtn) {
    const handleDefeatMenu = (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      if (ui.defeatOverlay) ui.defeatOverlay.style.display = "none";
      returnToMainMenu(context);
    };
    ui.defeatMenuBtn.addEventListener("click", handleDefeatMenu);
    ui.defeatMenuBtn.addEventListener("pointerup", handleDefeatMenu);
    ui.defeatMenuBtn.addEventListener("touchend", handleDefeatMenu, { passive: false });
  }
  document.body.classList.toggle("show-touch-controls", Boolean(game.showTouchControls));
  if (ui.touchControlsToggle) ui.touchControlsToggle.checked = Boolean(game.showTouchControls);

  ui.touchControlsToggle?.addEventListener("change", () => {
    game.showTouchControls = ui.touchControlsToggle.checked;
    document.body.classList.toggle("show-touch-controls", game.showTouchControls);
    saveGame(game);
  });

  const autoFireCheckbox = document.getElementById("autoFireToggle");
  if (autoFireCheckbox) {
    autoFireCheckbox.checked = Boolean(game.autoFire);
    autoFireCheckbox.addEventListener("change", () => {
      game.autoFire = autoFireCheckbox.checked;
      saveGame(game);
    });
  }

  // Continuous fire & periodic auto-fire loop during active gameplay
  setInterval(() => {
    if (!canUseGameplayPointerLock()) {
      if (context.inputState) {
        context.inputState.isFiring = false;
        context.inputState.isMobileFiring = false;
      }
      return;
    }

    if (context.inputState?.isFiring || context.inputState?.isMobileFiring) {
      fire(context);
    } else if (game.autoFire) {
      checkAutoFire(context);
    }
  }, 30);

  setupMobileInput(context);
}

function setupMobileInput(context) {
  const { camera, game, ui } = context;
  let joystickPointerId = null;
  let lookPointerId = null;
  let lookLastX = 0;
  let lookLastY = 0;
  let originX = 0;
  let originY = 0;

  const canUseMobileLook = () => (
    game.started
    && !game.paused
    && !game.gameOver
    && ui.startOverlay.style.display !== "flex"
    && ui.pauseOverlay.style.display !== "flex"
    && ui.controlsOverlay.style.display !== "flex"
    && ui.rewardOverlay.style.display !== "flex"
    && (!ui.stageClearOverlay || ui.stageClearOverlay.style.display !== "flex")
  );

  const resetJoystick = () => {
    joystickPointerId = null;
    game.mobileMove.x = 0;
    game.mobileMove.y = 0;
    if (ui.joystickKnob) ui.joystickKnob.style.transform = "translate(0px, 0px)";
  };

  const updateJoystick = event => {
    const maxDistance = 50;
    const dx = event.clientX - originX;
    const dy = event.clientY - originY;
    const distance = Math.min(maxDistance, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const knobX = Math.cos(angle) * distance;
    const knobY = Math.sin(angle) * distance;

    game.mobileMove.x = knobX / maxDistance;
    game.mobileMove.y = knobY / maxDistance;
    if (ui.joystickKnob) ui.joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
  };

  // Dynamic floating joystick on the left half of the screen
  const moveZone = document.getElementById("touchMoveZone") || ui.joystick;
  moveZone?.addEventListener("pointerdown", event => {
    if (joystickPointerId !== null) return;
    joystickPointerId = event.pointerId;
    originX = event.clientX;
    originY = event.clientY;

    if (ui.joystick) {
      ui.joystick.style.left = `${originX - 60}px`;
      ui.joystick.style.top = `${originY - 60}px`;
      ui.joystick.style.bottom = "auto";
    }
    moveZone.setPointerCapture?.(event.pointerId);
    updateJoystick(event);
  });

  moveZone?.addEventListener("pointermove", event => {
    if (event.pointerId === joystickPointerId) updateJoystick(event);
  });

  moveZone?.addEventListener("pointerup", resetJoystick);
  moveZone?.addEventListener("pointercancel", resetJoystick);

  // Right side 360 look pad
  ui.lookPad?.addEventListener("pointerdown", event => {
    if (!canUseMobileLook()) return;
    event.preventDefault();
    lookPointerId = event.pointerId;
    lookLastX = event.clientX;
    lookLastY = event.clientY;
    ui.lookPad.setPointerCapture?.(event.pointerId);
  });

  ui.lookPad?.addEventListener("pointermove", event => {
    if (event.pointerId !== lookPointerId) return;
    const lookSensitivity = 0.0042 * userSensitivityMultiplier;
    const dx = event.clientX - lookLastX;
    const dy = event.clientY - lookLastY;
    lookLastX = event.clientX;
    lookLastY = event.clientY;

    camera.rotation.y += dx * lookSensitivity;
    camera.rotation.x = clamp(camera.rotation.x + dy * lookSensitivity, -1.18, 1.18);

    // Subtle Mobile Touch Aim-Assist Magnetism
    applyTouchAimAssist(context);
  });

  const resetLook = event => {
    if (!event || event.pointerId === lookPointerId) lookPointerId = null;
  };

  ui.lookPad?.addEventListener("pointerup", resetLook);
  ui.lookPad?.addEventListener("pointercancel", resetLook);

  ui.mobileFireButton?.addEventListener("pointerdown", event => {
    event.preventDefault();
    if (context.inputState) context.inputState.isMobileFiring = true;
    fire(context);
  });

  const stopMobileFire = () => {
    if (context.inputState) context.inputState.isMobileFiring = false;
  };
  ui.mobileFireButton?.addEventListener("pointerup", stopMobileFire);
  ui.mobileFireButton?.addEventListener("pointercancel", stopMobileFire);
  ui.mobileFireButton?.addEventListener("pointerleave", stopMobileFire);

  ui.mobileReloadButton?.addEventListener("pointerdown", event => {
    event.preventDefault();
    reload(context);
  });

  ui.mobileSprintButton?.addEventListener("pointerdown", event => {
    event.preventDefault();
    game.sprinting = true;
    context.camera.speed = PLAYER_SPEED.sprint;
  });

  ui.mobileSprintButton?.addEventListener("pointerup", () => {
    game.sprinting = false;
    context.camera.speed = PLAYER_SPEED.normal;
  });

  const ultimateBtn = document.getElementById("mobileUltimateButton");
  if (ultimateBtn) {
    ultimateBtn.addEventListener("pointerdown", event => {
      event.preventDefault();
      triggerAdrenalineSurge(context);
    });
  }

  if (ui.flashlightStatus) {
    ui.flashlightStatus.addEventListener("click", () => {
      toggleFlashlight(context);
    });
  }

  const flashlightBtn = document.getElementById("mobileFlashlightButton");
  if (flashlightBtn) {
    flashlightBtn.addEventListener("pointerdown", event => {
      event.preventDefault();
      toggleFlashlight(context);
    });
  }

  if (ui.weaponSlotButtons) {
    ui.weaponSlotButtons.forEach(btn => {
      const handleSlotSelect = e => {
        e.stopPropagation();
        const targetBtn = e.target.closest?.(".weaponSlotBtn") || btn;
        if (targetBtn && targetBtn.dataset?.weapon) {
          switchWeapon(context, targetBtn.dataset.weapon);
        }
      };
      btn.addEventListener("click", handleSlotSelect);
      btn.addEventListener("pointerdown", handleSlotSelect);
    });
  }

  const mobileWeaponBtn = document.getElementById("mobileWeaponButton");
  if (mobileWeaponBtn) {
    mobileWeaponBtn.addEventListener("pointerdown", event => {
      event.preventDefault();
      cycleWeapon(context, 1);
    });
  }

  const mobileTurretBtn = document.getElementById("mobileTurretButton");
  if (mobileTurretBtn) {
    mobileTurretBtn.addEventListener("pointerdown", event => {
      event.preventDefault();
      handleTurretContextualAction(context);
    });
  }

  const mobileSlideBtn = document.getElementById("mobileSlideButton");
  if (mobileSlideBtn) {
    mobileSlideBtn.addEventListener("pointerdown", event => {
      event.preventDefault();
      triggerTacticalSlide(context);
    });
  }

  const mobileEmpBtn = document.getElementById("mobileEmpButton");
  if (mobileEmpBtn) {
    mobileEmpBtn.addEventListener("pointerdown", event => {
      event.preventDefault();
      triggerKineticEmpBlast(context);
    });
  }

  const empBlastBtn = document.getElementById("empBlastButton");
  if (empBlastBtn) {
    empBlastBtn.addEventListener("click", event => {
      event.stopPropagation();
      triggerKineticEmpBlast(context);
    });
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function applyTouchAimAssist(context) {
  const { camera, game } = context;
  if (!camera || !game.aliens || game.aliens.length === 0) return;

  const camPos = camera.position;
  const forward = camera.getDirection(BABYLON.Vector3.Forward());
  let bestAlien = null;
  let bestDot = 0.93; // Must be within ~21 degrees of center reticle

  for (const alien of game.aliens) {
    if (!alien || alien.dead) continue;
    const targetY = (alien.height || 2) * 0.5;
    const toAlien = alien.position.add(new BABYLON.Vector3(0, targetY, 0)).subtract(camPos);
    const dist = toAlien.length();
    if (dist < 2.5 || dist > 34) continue;

    toAlien.normalize();
    const dot = BABYLON.Vector3.Dot(forward, toAlien);
    if (dot > bestDot) {
      bestDot = dot;
      bestAlien = alien;
    }
  }

  if (bestAlien) {
    const toTarget = bestAlien.position.add(new BABYLON.Vector3(0, (bestAlien.height || 2) * 0.5, 0)).subtract(camPos).normalize();
    const targetRotY = Math.atan2(toTarget.x, toTarget.z);
    const diffY = targetRotY - camera.rotation.y;
    const normDiffY = Math.atan2(Math.sin(diffY), Math.cos(diffY));
    camera.rotation.y += normDiffY * 0.08; // Gentle 8% magnetic tracking
  }
}
