import { PLAYER_SPEED } from "./player.js";
import { fire, reload } from "./weapons.js";
import { returnToMainMenu, setPaused, togglePause } from "./pause.js";

export function setupInput(context) {
  const { canvas, camera, game, ui, resetGame } = context;

  window.addEventListener("mousedown", e => {
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
  ui.restartButton.addEventListener("click", () => canvas.requestPointerLock?.());
  ui.resumeButton.addEventListener("click", () => setPaused(context, false));
  ui.pauseRestartButton.addEventListener("click", resetGame);
  ui.mainMenuButton.addEventListener("click", () => returnToMainMenu(context));

  setupMobileInput(context);
}

function setupMobileInput(context) {
  const { game, ui } = context;
  let joystickPointerId = null;

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
