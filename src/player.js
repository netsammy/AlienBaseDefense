import * as BABYLON from "@babylonjs/core";

export const PLAYER_SPEED = {
  normal: 0.35,
  sprint: 0.62
};

export function createPlayerCamera(scene, canvas) {
  const camera = new BABYLON.UniversalCamera("PlayerCamera", new BABYLON.Vector3(0, 2, -12), scene);
  camera.attachControl(canvas, true);
  camera.applyGravity = true;
  camera.checkCollisions = true;
  camera.ellipsoid = new BABYLON.Vector3(0.8, 1, 0.8);
  camera.speed = PLAYER_SPEED.normal;
  camera.angularSensibility = 2200;
  camera.minZ = 0.1;
  camera.keysUp.push(87);
  camera.keysDown.push(83);
  camera.keysLeft.push(65);
  camera.keysRight.push(68);
  return camera;
}

export function resetPlayer(camera) {
  camera.position = new BABYLON.Vector3(0, 2, -12);
  camera.rotation = new BABYLON.Vector3(0, 0, 0);
  camera.cameraDirection = new BABYLON.Vector3(0, 0, 0);
  camera.speed = PLAYER_SPEED.normal;
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

export function applyMobileMovement(camera, game) {
  if (!game.started || game.paused || game.gameOver) return;
  const { x, y } = game.mobileMove;
  if (Math.abs(x) < 0.05 && Math.abs(y) < 0.05) return;

  const forward = camera.getDirection(BABYLON.Axis.Z);
  forward.y = 0;
  forward.normalize();

  const right = camera.getDirection(BABYLON.Axis.X);
  right.y = 0;
  right.normalize();

  const speed = (game.sprinting ? PLAYER_SPEED.sprint : PLAYER_SPEED.normal) * 0.22;
  const movement = right.scale(x).add(forward.scale(-y));
  if (movement.lengthSquared() === 0) return;
  movement.normalize().scaleInPlace(speed);
  camera.cameraDirection.addInPlace(movement);
}
