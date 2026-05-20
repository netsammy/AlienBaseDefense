import { PLAYER_SPEED } from "./player.js";
import { fire, reload } from "./weapons.js";
import { returnToMainMenu, setPaused, togglePause } from "./pause.js";
import { requestPointerLockSafely } from "./pointerLock.js";
import { saveGame } from "./saveSystem.js";

export function setupInput(context) {
  const { canvas, camera, game, ui, resetGame } = context;

  const canUseGameplayPointerLock = () => (
    game.started
    && !game.paused
    && !game.gameOver
    && ui.startOverlay.style.display !== "flex"
    && ui.pauseOverlay.style.display !== "flex"
    && ui.controlsOverlay.style.display !== "flex"
    && ui.rewardOverlay.style.display !== "flex"
  );

  canvas.addEventListener("mousedown", e => {
    if (e.button === 0 && canUseGameplayPointerLock() && document.pointerLockElement !== canvas) {
      requestPointerLockSafely(canvas);
    }
  });

  window.addEventListener("mousedown", e => {
    if (!canUseGameplayPointerLock()) return;
    if (e.target.closest?.("#mobileControls")) return;
    if (e.button === 0) fire(context);
  });

  window.addEventListener("keydown", e => {
    if (e.code === "Escape") {
      if (ui.rewardOverlay.style.display === "flex") return;
      togglePause(context);
      return;
    }

    if (game.paused) return;

    if (e.code === "ShiftLeft") {
      game.sprinting = true;
      camera.speed = PLAYER_SPEED.sprint;
    }

    if (e.code === "KeyR") reload(context);

    if (e.code === "Space" && camera.position.y <= 2.05) {
      camera.cameraDirection.y += 0.22;
    }
  });

  window.addEventListener("keyup", e => {
    if (e.code === "ShiftLeft") {
      game.sprinting = false;
      camera.speed = PLAYER_SPEED.normal;
    }
  });

  ui.difficultyButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      game.difficulty = btn.dataset.difficulty;
      resetGame();
    });
  });

  ui.restartButton.addEventListener("click", resetGame);
  ui.restartButton.addEventListener("click", () => requestPointerLockSafely(canvas));
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
  ui.pauseRestartButton.addEventListener("click", resetGame);
  ui.mainMenuButton.addEventListener("click", () => returnToMainMenu(context));
  document.body.classList.toggle("show-touch-controls", Boolean(game.showTouchControls));
  if (ui.touchControlsToggle) ui.touchControlsToggle.checked = Boolean(game.showTouchControls);
  ui.touchControlsToggle?.addEventListener("change", () => {
    game.showTouchControls = ui.touchControlsToggle.checked;
    document.body.classList.toggle("show-touch-controls", game.showTouchControls);
    saveGame(game);
  });

  setupMobileInput(context);
}

function setupMobileInput(context) {
  const { camera, game, ui } = context;
  let joystickPointerId = null;
  let lookPointerId = null;
  let lookLastX = 0;
  let lookLastY = 0;

  const canUseMobileLook = () => (
    game.started
    && !game.paused
    && !game.gameOver
    && ui.startOverlay.style.display !== "flex"
    && ui.pauseOverlay.style.display !== "flex"
    && ui.controlsOverlay.style.display !== "flex"
    && ui.rewardOverlay.style.display !== "flex"
  );

  const resetJoystick = () => {
    joystickPointerId = null;
    game.mobileMove.x = 0;
    game.mobileMove.y = 0;
    ui.joystickKnob.style.transform = "translate(0px, 0px)";
  };

  const updateJoystick = event => {
    const rect = ui.joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxDistance = rect.width * 0.35;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const distance = Math.min(maxDistance, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const knobX = Math.cos(angle) * distance;
    const knobY = Math.sin(angle) * distance;

    game.mobileMove.x = knobX / maxDistance;
    game.mobileMove.y = knobY / maxDistance;
    ui.joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
  };

  ui.joystick.addEventListener("pointerdown", event => {
    joystickPointerId = event.pointerId;
    ui.joystick.setPointerCapture(event.pointerId);
    updateJoystick(event);
  });

  ui.joystick.addEventListener("pointermove", event => {
    if (event.pointerId === joystickPointerId) updateJoystick(event);
  });

  ui.joystick.addEventListener("pointerup", resetJoystick);
  ui.joystick.addEventListener("pointercancel", resetJoystick);

  ui.lookPad?.addEventListener("pointerdown", event => {
    if (!canUseMobileLook()) return;
    event.preventDefault();
    lookPointerId = event.pointerId;
    lookLastX = event.clientX;
    lookLastY = event.clientY;
    ui.lookPad.setPointerCapture(event.pointerId);
  });

  ui.lookPad?.addEventListener("pointermove", event => {
    if (event.pointerId !== lookPointerId || !canUseMobileLook()) return;
    event.preventDefault();
    const lookSensitivity = 0.0042;
    const dx = event.clientX - lookLastX;
    const dy = event.clientY - lookLastY;
    lookLastX = event.clientX;
    lookLastY = event.clientY;

    camera.rotation.y += dx * lookSensitivity;
    camera.rotation.x = clamp(camera.rotation.x + dy * lookSensitivity, -1.18, 1.18);
  });

  const resetLook = event => {
    if (!event || event.pointerId === lookPointerId) lookPointerId = null;
  };

  ui.lookPad?.addEventListener("pointerup", resetLook);
  ui.lookPad?.addEventListener("pointercancel", resetLook);

  ui.mobileFireButton.addEventListener("pointerdown", event => {
    event.preventDefault();
    fire(context);
  });

  ui.mobileReloadButton.addEventListener("pointerdown", event => {
    event.preventDefault();
    reload(context);
  });

  ui.mobileSprintButton.addEventListener("pointerdown", event => {
    event.preventDefault();
    game.sprinting = true;
    context.camera.speed = PLAYER_SPEED.sprint;
  });

  ui.mobileSprintButton.addEventListener("pointerup", () => {
    game.sprinting = false;
    context.camera.speed = PLAYER_SPEED.normal;
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
