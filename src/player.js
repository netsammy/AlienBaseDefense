import * as BABYLON from "@babylonjs/core";
import { playSound } from "./sound.js";
import { triggerHaptic } from "./haptics.js";

export const PLAYER_SPEED = {
  normal: 0.38,
  sprint: 0.68
};

export const keyboardState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false
};

export const mobilityState = {
  isSliding: false,
  slideTime: 0,
  slideDuration: 0.55,
  slideCooldown: 0,
  slideDirection: new BABYLON.Vector3(0, 0, 0),
  defaultY: 2.0,
  crouchY: 1.15,
  defaultFov: 0.85
};

export function createPlayerCamera(scene, canvas) {
  const camera = new BABYLON.UniversalCamera("PlayerCamera", new BABYLON.Vector3(0, 2, -12), scene);
  camera.attachControl(canvas, false);
  // Remove default Babylon mouse and keyboard handlers to prevent input locking/conflicts
  camera.inputs.removeByType("FreeCameraKeyboardMoveInput");
  camera.inputs.removeByType("FreeCameraMouseInput");
  camera.applyGravity = true;
  camera.checkCollisions = true;
  camera.ellipsoid = new BABYLON.Vector3(0.8, 1, 0.8);
  camera.speed = PLAYER_SPEED.normal;
  camera.minZ = 0.1;
  camera.fov = mobilityState.defaultFov;
  return camera;
}

export function resetPlayer(camera) {
  camera.position = new BABYLON.Vector3(0, 2, -12);
  camera.rotation = new BABYLON.Vector3(0, 0, 0);
  camera.cameraDirection = new BABYLON.Vector3(0, 0, 0);
  camera.speed = PLAYER_SPEED.normal;
  camera.fov = mobilityState.defaultFov;
  mobilityState.isSliding = false;
  mobilityState.slideTime = 0;
  mobilityState.slideCooldown = 0;
}

export function keepPlayerInsideArena(camera, game, ui) {
  const flatDistance = Math.sqrt(camera.position.x * camera.position.x + camera.position.z * camera.position.z);
  if (flatDistance > game.arenaRadius) {
    const angle = Math.atan2(camera.position.z, camera.position.x);
    camera.position.x = Math.cos(angle) * game.arenaRadius;
    camera.position.z = Math.sin(angle) * game.arenaRadius;
    if (!game.gameOver) ui.message.textContent = "Defense zone boundary reached";
  }
}

export function triggerTacticalSlide(context) {
  const { camera, game, ui } = context;
  if (!game.started || game.paused || game.gameOver) return;
  if (mobilityState.slideCooldown > 0 || mobilityState.isSliding) return;

  const forward = camera.getDirection(BABYLON.Axis.Z);
  forward.y = 0;
  forward.normalize();

  const right = camera.getDirection(BABYLON.Axis.X);
  right.y = 0;
  right.normalize();

  const moveDir = BABYLON.Vector3.Zero();
  if (keyboardState.forward) moveDir.addInPlace(forward);
  if (keyboardState.backward) moveDir.subtractInPlace(forward);
  if (keyboardState.right) moveDir.addInPlace(right);
  if (keyboardState.left) moveDir.subtractInPlace(right);

  const { x, y } = game.mobileMove || { x: 0, y: 0 };
  if (Math.abs(x) >= 0.05 || Math.abs(y) >= 0.05) {
    moveDir.addInPlace(right.scale(x).add(forward.scale(-y)));
  }

  if (moveDir.lengthSquared() < 0.01) {
    moveDir.copyFrom(forward);
  } else {
    moveDir.normalize();
  }

  mobilityState.isSliding = true;
  mobilityState.slideTime = mobilityState.slideDuration;
  mobilityState.slideCooldown = 1.35;
  mobilityState.slideDirection.copyFrom(moveDir);

  playSound("slide_dash");
  triggerHaptic("medium");

  if (ui?.message && !game.gameOver) {
    ui.message.textContent = "TACTICAL SLIDE!";
  }
}

export function triggerTacticalJump(context) {
  const { camera, game } = context;
  if (!game.started || game.paused || game.gameOver) return;

  if (camera.position.y <= 2.15) {
    const isSprinting = game.sprinting || keyboardState.sprint;
    camera.cameraDirection.y += isSprinting ? 0.32 : 0.24;
    if (isSprinting) {
      const forward = camera.getDirection(BABYLON.Axis.Z);
      forward.y = 0;
      forward.normalize();
      camera.cameraDirection.addInPlace(forward.scale(0.18));
      playSound("slide_dash");
      triggerHaptic("light");
    }
  }
}

export function applyPlayerLocomotion(camera, game, delta = 0.016) {
  if (!game.started || game.paused || game.gameOver) return;

  // Update mobility cooldown
  if (mobilityState.slideCooldown > 0) {
    mobilityState.slideCooldown = Math.max(0, mobilityState.slideCooldown - delta);
    game.slideCooldown = mobilityState.slideCooldown;
  } else {
    game.slideCooldown = 0;
  }

  // Tactical Slide Execution
  if (mobilityState.isSliding) {
    mobilityState.slideTime -= delta;
    const progress = 1 - Math.max(0, mobilityState.slideTime / mobilityState.slideDuration);

    // Dynamic decaying speed impulse
    const slideSpeed = (1 - progress * 0.72) * 0.95;
    camera.cameraDirection.addInPlace(mobilityState.slideDirection.scale(slideSpeed));

    // Crouch camera height down to 1.15m then return
    const targetY = progress < 0.75 ? mobilityState.crouchY : mobilityState.defaultY;
    camera.position.y += (targetY - camera.position.y) * 0.22;

    // FOV speed-punch
    const targetFov = mobilityState.defaultFov + (1 - progress) * 0.12;
    camera.fov += (targetFov - camera.fov) * 0.25;

    if (mobilityState.slideTime <= 0) {
      mobilityState.isSliding = false;
      camera.fov = mobilityState.defaultFov;
    }
    return;
  }

  // Smooth return to normal camera eye-height and FOV
  if (camera.position.y <= 2.15 && Math.abs(camera.position.y - mobilityState.defaultY) > 0.02) {
    camera.position.y += (mobilityState.defaultY - camera.position.y) * 0.16;
  }
  if (Math.abs(camera.fov - mobilityState.defaultFov) > 0.01) {
    camera.fov += (mobilityState.defaultFov - camera.fov) * 0.16;
  }

  const forward = camera.getDirection(BABYLON.Axis.Z);
  forward.y = 0;
  forward.normalize();

  const right = camera.getDirection(BABYLON.Axis.X);
  right.y = 0;
  right.normalize();

  const moveDir = BABYLON.Vector3.Zero();

  // Keyboard WASD / Arrow keys
  if (keyboardState.forward) moveDir.addInPlace(forward);
  if (keyboardState.backward) moveDir.subtractInPlace(forward);
  if (keyboardState.right) moveDir.addInPlace(right);
  if (keyboardState.left) moveDir.subtractInPlace(right);

  // Mobile virtual joystick
  const { x, y } = game.mobileMove;
  if (Math.abs(x) >= 0.05 || Math.abs(y) >= 0.05) {
    moveDir.addInPlace(right.scale(x).add(forward.scale(-y)));
  }

  if (moveDir.lengthSquared() > 0.0001) {
    moveDir.normalize();
    const isSprinting = game.sprinting || keyboardState.sprint;
    const speed = (isSprinting ? PLAYER_SPEED.sprint : PLAYER_SPEED.normal) * 0.26;
    camera.cameraDirection.addInPlace(moveDir.scale(speed));
  }
}


