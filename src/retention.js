import { saveGame } from "./saveSystem.js";
import { updateUI } from "./ui.js";

const LOGIN_REWARDS = [
  { day: 1, coins: 100, label: "Day 1: 100 Coins" },
  { day: 2, coins: 200, label: "Day 2: 200 Coins" },
  { day: 3, coins: 350, label: "Day 3: 350 Coins" },
  { day: 4, coins: 500, label: "Day 4: 500 Coins" },
  { day: 5, coins: 750, label: "Day 5: 750 Coins" },
  { day: 6, coins: 1000, label: "Day 6: 1,000 Coins" },
  { day: 7, coins: 1500, label: "Day 7: 1,500 Coins + Crest" }
];

export function initRetention(context) {
  const { game } = context;
  checkDailyLogin(game);
  checkDailyMissions(game);
}

export function checkDailyLogin(game) {
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const lastLogin = game.lastLoginDate || 0;
  const diff = now - lastLogin;

  if (!lastLogin) {
    game.loginStreak = 1;
    game.canClaimDaily = true;
  } else if (diff >= ONE_DAY && diff < ONE_DAY * 2) {
    // Consecutive day
    game.loginStreak = (game.loginStreak % 7) + 1;
    game.canClaimDaily = true;
  } else if (diff >= ONE_DAY * 2) {
    // Streak broken, reset to Day 1
    game.loginStreak = 1;
    game.canClaimDaily = true;
  }
}

export function claimDailyReward(context) {
  const { game, ui } = context;
  if (!game.canClaimDaily) return false;
  const rewardIndex = Math.min(6, Math.max(0, (game.loginStreak || 1) - 1));
  const reward = LOGIN_REWARDS[rewardIndex];

  game.coins += reward.coins;
  game.canClaimDaily = false;
  game.lastLoginDate = Date.now();
  saveGame(game);
  updateUI(ui, game);
  if (ui.message) ui.message.textContent = `Claimed ${reward.label}!`;
  return true;
}

export function checkDailyMissions(game) {
  const today = new Date().toISOString().slice(0, 10);
  if (game.missionsDate !== today || !game.dailyMissions || game.dailyMissions.length === 0) {
    game.missionsDate = today;
    game.dailyMissions = [
      { id: "kills", desc: "Eliminate 30 Aliens", target: 30, progress: 0, reward: 150, claimed: false },
      { id: "waves", desc: "Survive 4 Waves", target: 4, progress: 0, reward: 250, claimed: false },
      { id: "combo", desc: "Achieve a x4 Combo", target: 4, progress: 0, reward: 200, claimed: false }
    ];
    saveGame(game);
  }
}

export function updateMissionProgress(context, type, amount = 1) {
  const { game } = context;
  if (!game.dailyMissions) return;
  let changed = false;
  for (const m of game.dailyMissions) {
    if (m.id === type && !m.claimed) {
      if (type === "combo") {
        m.progress = Math.max(m.progress, amount);
      } else {
        m.progress = Math.min(m.target, m.progress + amount);
      }
      changed = true;
    }
  }
  if (changed) saveGame(game);
}

export function claimMissionReward(context, missionId) {
  const { game, ui } = context;
  if (!game.dailyMissions) return false;
  const mission = game.dailyMissions.find(m => m.id === missionId);
  if (mission && !mission.claimed && mission.progress >= mission.target) {
    mission.claimed = true;
    game.coins += mission.reward;
    saveGame(game);
    updateUI(ui, game);
    if (ui.message) ui.message.textContent = `Mission completed! +${mission.reward} coins`;
    return true;
  }
  return false;
}
