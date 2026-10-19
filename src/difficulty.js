export const DIFFICULTY_SETTINGS = {
  easy: {
    label: "Easy",
    countMultiplier: 1.0,
    speedMultiplier: 0.9,
    damageMultiplier: 0.75,
    alienHealthOffset: -1,
    safetyShieldMs: 3200,
    spawnDistanceBonus: 2
  },
  normal: {
    label: "Normal",
    countMultiplier: 1.25,
    speedMultiplier: 1.1,
    damageMultiplier: 1.1,
    alienHealthOffset: 0,
    safetyShieldMs: 2100,
    spawnDistanceBonus: -1
  },
  hard: {
    label: "Hard",
    countMultiplier: 1.55,
    speedMultiplier: 1.32,
    damageMultiplier: 1.42,
    alienHealthOffset: 1,
    safetyShieldMs: 1200,
    spawnDistanceBonus: -3
  }
};

import { getStageNumber } from "./stages.js";

export const STAGE_THREAT_PLANS = {
  1: {
    name: "Rookie",
    waves: "1-3",
    briefing: "Initial assault: Classic Grunts, Acid Spitters, and aerial Scout Wasps attacking the perimeter.",
    weights: { grunt: 30, spitter: 30, wasp: 25, runner: 15, brute: 0 }
  },
  2: {
    name: "Soldier",
    waves: "1-3",
    briefing: "Heavy attack: Armored and Purple Brutes entering the arena with swarms of Spitters and Wasps.",
    weights: { brute: 25, grunt: 25, spitter: 25, wasp: 15, runner: 10 }
  },
  3: {
    name: "Veteran",
    waves: "1-3",
    briefing: "Fierce invasion: Behemoth Brutes leading tactical squadrons of classic and new alien bio-forms.",
    weights: { brute: 35, spitter: 25, wasp: 20, grunt: 10, runner: 10 }
  },
  4: {
    name: "Elite",
    waves: "1-3",
    briefing: "Elite coastal assault: Heavy armored brutes and lethal mortar spitters targeting base perimeter.",
    weights: { brute: 40, spitter: 25, wasp: 20, runner: 15 }
  },
  5: {
    name: "Master",
    waves: "1-3",
    briefing: "Coordinated landing: Swift insectoid runners and high-altitude wasps covering juggernaut brutes.",
    weights: { brute: 35, spitter: 30, wasp: 25, runner: 10 }
  },
  6: {
    name: "Apocalypse",
    waves: "1-3",
    briefing: "Final grand siege: Colossal bio-titans and supreme alien swarm assaulting the final gate.",
    weights: { brute: 45, spitter: 25, wasp: 20, runner: 10 }
  }
};

export function getWaveDifficulty(game) {
  const stageNum = game.isEndless
    ? Math.max(1, Math.floor(((game.wave || 1) - 1) / 3) + 1)
    : (getStageNumber(game.selectedStage) || game.stage || 1);

  const waveInStage = game.isEndless
    ? (((game.wave || 1) - 1) % 3) + 1
    : Math.max(1, Math.min(3, (((game.wave || 1) - 1) % 3) + 1));

  const tier = Math.min(6, Math.floor((stageNum - 1) / 3.5) + 1);
  const tierNames = ["Rookie", "Soldier", "Veteran", "Elite", "Master", "Apocalypse"];
  const tierName = tierNames[tier - 1] || "Apocalypse";

  // Halved balanced count formula:
  // Starts at 4 + 1*2 = 6 for Stage 1 Wave 1
  // Smoothly increases across 20 stages, capped at 22 for comfortable performance
  const baseCount = Math.min(12, 4 + Math.floor((stageNum - 1) * 0.42));
  const waveStep = stageNum > 10 ? 3 : 2;
  const count = baseCount + waveInStage * waveStep;
  const healthBonus = Math.min(6, Math.floor((stageNum - 1) / 3.5));
  const speed = 0.022 + Math.min(0.016, (stageNum - 1) * 0.0007) + (waveInStage - 1) * 0.0015;
  const damage = 3 + Math.min(7, Math.floor((stageNum - 1) * 0.35));
  const spawnMin = Math.max(15, 18 - Math.floor((stageNum - 1) * 0.12));
  const spawnMax = Math.max(22, 26 - Math.floor((stageNum - 1) * 0.12));

  const base = {
    stage: stageNum,
    name: tierName,
    count,
    healthBonus,
    speed,
    damage,
    spawnMin,
    spawnMax
  };

  const mode = DIFFICULTY_SETTINGS[game.difficulty] || DIFFICULTY_SETTINGS.easy;
  return {
    stage: stageNum,
    name: base.name,
    count: Math.max(2, Math.round(base.count * mode.countMultiplier)),
    healthBonus: Math.max(0, base.healthBonus + mode.alienHealthOffset),
    speed: base.speed * mode.speedMultiplier,
    damage: Math.max(1, Math.round(base.damage * mode.damageMultiplier)),
    spawnMin: base.spawnMin + mode.spawnDistanceBonus,
    spawnMax: base.spawnMax + mode.spawnDistanceBonus,
    safetyShieldMs: mode.safetyShieldMs,
    modeLabel: mode.label
  };
}

export function getStageThreatPlan(stage) {
  const tier = Math.min(6, Math.max(1, Math.floor((stage - 1) / 3.5) + 1));
  return STAGE_THREAT_PLANS[tier] || STAGE_THREAT_PLANS[6] || STAGE_THREAT_PLANS[1];
}

export function getWaveBriefing(game, difficulty) {
  const plan = getStageThreatPlan(difficulty.stage);
  const waveInStage = (((game.wave || 1) - 1) % 3) + 1;
  const bossText = waveInStage === 3
    ? " Horned boss confirmed in this wave."
    : "";
  return `${difficulty.modeLabel} Stage ${difficulty.stage} ${difficulty.name}: ${plan.briefing}${bossText}`;
}
