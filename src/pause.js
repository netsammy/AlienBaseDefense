import { clearAliens } from "./aliens.js";
import { clearPickups } from "./pickups.js";
import { stopBossMusic } from "./sound.js";

export function setPaused(context, paused) {
  const { game, ui } = context;
  if (!game.started || game.gameOver) return;
  game.paused = paused;
  ui.pauseOverlay.style.display = paused ? "flex" : "none";
  if (paused) {
    document.exitPointerLock?.();
  } else {
    context.canvas.requestPointerLock?.();
  }
}

export function togglePause(context) {
  setPaused(context, !context.game.paused);
}

export function returnToMainMenu(context) {
  const { game, ui } = context;
  clearTimeout(game.waveTimer);
  stopBossMusic();
  clearAliens(game);
  clearPickups(game);
  game.started = false;
  game.paused = false;
  game.gameOver = false;
  game.waveCountdown = 0;
  game.mobileMove.x = 0;
  game.mobileMove.y = 0;
  ui.pauseOverlay.style.display = "none";
  ui.rewardOverlay.style.display = "none";
  ui.startOverlay.style.display = "flex";
  ui.message.textContent = "Choose difficulty to defend the base";
  document.exitPointerLock?.();
}
