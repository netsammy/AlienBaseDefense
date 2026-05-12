const BEST_SCORE_KEY = "alienBaseDefense.bestScore";

export function loadBestScore(game) {
  const storedScore = Number.parseInt(localStorage.getItem(BEST_SCORE_KEY) || "0", 10);
  game.bestScore = Number.isFinite(storedScore) ? storedScore : 0;
}

export function updateBestScore(game) {
  if (game.score <= game.bestScore) return false;
  game.bestScore = game.score;
  localStorage.setItem(BEST_SCORE_KEY, String(game.bestScore));
  return true;
}
