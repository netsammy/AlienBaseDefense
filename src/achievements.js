import { playSound } from "./sound.js";
import { awardCoins } from "./shop.js";
import { saveGame } from "./saveSystem.js";
import { triggerHaptic } from "./haptics.js";

export const ACHIEVEMENTS = {
  first_blood: {
    id: "first_blood",
    title: "First Blood",
    desc: "Eliminate your first alien invader.",
    reward: 50,
    icon: "🎯"
  },
  swarm_slayer: {
    id: "swarm_slayer",
    title: "Swarm Slayer",
    desc: "Eliminate 50 alien hostiles.",
    reward: 100,
    icon: "💀"
  },
  titan_vanquished: {
    id: "titan_vanquished",
    title: "Titan Vanquished",
    desc: "Defeat the Goliath class Bio-Titan.",
    reward: 200,
    icon: "👾"
  },
  deadshot: {
    id: "deadshot",
    title: "Deadshot",
    desc: "Eliminate an alien with the Plasma Railgun.",
    reward: 75,
    icon: "⚡"
  },
  pyro_master: {
    id: "pyro_master",
    title: "Firestorm",
    desc: "Incinerate an alien swarm with the Flamethrower.",
    reward: 75,
    icon: "🔥"
  },
  iron_core: {
    id: "iron_core",
    title: "Untouchable Core",
    desc: "Clear any combat wave with 100% Fusion Core HP.",
    reward: 150,
    icon: "🛡️"
  },
  combo_king: {
    id: "combo_king",
    title: "Combo Master",
    desc: "Reach a x5 kill combo streak.",
    reward: 120,
    icon: "⭐"
  },
  sector_liberator: {
    id: "sector_liberator",
    title: "Sector Liberator",
    desc: "Secure 3 campaign sectors.",
    reward: 350,
    icon: "🏆"
  }
};

let toastTimeout = null;

export function triggerAchievement(context, achievementId) {
  const { game, ui } = context;
  if (!game) return;

  game.unlockedAchievements = game.unlockedAchievements || [];
  if (game.unlockedAchievements.includes(achievementId)) return;

  const ach = ACHIEVEMENTS[achievementId];
  if (!ach) return;

  game.unlockedAchievements.push(achievementId);
  awardCoins(context, ach.reward);
  saveGame(game);

  playSound("achievement_unlock");
  triggerHaptic("heavy");

  showAchievementToast(ach);
}

function showAchievementToast(ach) {
  let toast = document.getElementById("achievementToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "achievementToast";
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(-100px);
      background: linear-gradient(135deg, rgba(0, 30, 50, 0.95), rgba(0, 60, 90, 0.95));
      border: 2px solid #ffd700;
      border-radius: 12px;
      padding: 12px 24px;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 14px;
      z-index: 100;
      box-shadow: 0 0 30px rgba(255, 215, 0, 0.45);
      transition: transform 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.3s ease;
      pointer-events: none;
      font-family: inherit;
    `;
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <div style="font-size: 28px;">${ach.icon}</div>
    <div>
      <div style="font-size: 11px; font-weight: 800; color: #ffd700; letter-spacing: 1.5px; text-transform: uppercase;">Achievement Unlocked!</div>
      <div style="font-size: 15px; font-weight: 900; color: #ffffff;">${ach.title}</div>
      <div style="font-size: 12px; color: #bff6ff;">${ach.desc} <span style="color: #ffd700; font-weight: 800;">(+${ach.reward} Coins)</span></div>
    </div>
  `;

  // Animate in
  toast.style.opacity = "1";
  toast.style.transform = "translateX(-50%) translateY(0px)";

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.style.transform = "translateX(-50%) translateY(-100px)";
    toast.style.opacity = "0";
  }, 4500);
}
