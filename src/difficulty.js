export const DIFFICULTY_SETTINGS = {
  easy: {
    label: "Easy",
    countMultiplier: 0.78,
    speedMultiplier: 0.82,
    damageMultiplier: 0.75,
    alienHealthOffset: -1,
    safetyShieldMs: 3200,
    spawnDistanceBonus: 4
  },
  normal: {
    label: "Normal",
    countMultiplier: 1.12,
    speedMultiplier: 1.1,
    damageMultiplier: 1.1,
    alienHealthOffset: 0,
    safetyShieldMs: 2100,
    spawnDistanceBonus: -1
  },
  hard: {
    label: "Hard",
    countMultiplier: 1.45,
    speedMultiplier: 1.32,
    damageMultiplier: 1.42,
    alienHealthOffset: 1,
    safetyShieldMs: 1200,
    spawnDistanceBonus: -4
  }
};

export const STAGE_THREAT_PLANS = {
  1: {
    name: "Rookie",
    waves: "1-3",
    briefing: "Initial assault: Classic Grunts, Acid Spitters, and aerial Scout Wasps attacking the perimeter.",
    weights: { grunt: 30, spitter: 30, wasp: 25, runner: 15, brute: 0 }
  },
  2: {
    name: "Soldier",
    waves: "4-6",
    briefing: "Heavy attack: Armored and Purple Brutes entering the arena with swarms of Spitters and Wasps.",
    weights: { brute: 25, grunt: 25, spitter: 25, wasp: 15, runner: 10 }
  },
  3: {
    name: "Veteran",
    waves: "7-10",
    briefing: "Fierce invasion: Behemoth Brutes leading tactical squadrons of classic and new alien bio-forms.",
    weights: { brute: 35, spitter: 25, wasp: 20, grunt: 10, runner: 10 }
  },
  4: {
    name: "Nightmare",
    waves: "11+",
    briefing: "Apocalyptic swarm: Colossal Juggernauts, flying Wasps, and lethal mortar Spitters.",
    weights: { brute: 40, spitter: 25, wasp: 20, runner: 15 }
  }
};

export function getWaveDifficulty(game) {
  let base;
  if (game.wave <= 3) {
    base = { stage: 1, name: "Rookie", count: 4 + game.wave, healthBonus: 0, speed: 0.011, damage: 3, spawnMin: 28, spawnMax: 39 };
  } else if (game.wave <= 6) {
    base = { stage: 2, name: "Soldier", count: 7 + game.wave, healthBonus: 1, speed: 0.0155, damage: 5, spawnMin: 26, spawnMax: 39 };
  } else if (game.wave <= 10) {
    base = { stage: 3, name: "Veteran", count: 10 + game.wave, healthBonus: 2, speed: 0.0195, damage: 7, spawnMin: 24, spawnMax: 38 };
  } else {
    base = { stage: 4, name: "Nightmare", count: 14 + game.wave, healthBonus: 3, speed: 0.024, damage: 9, spawnMin: 22, spawnMax: 36 };
  }

  const mode = DIFFICULTY_SETTINGS[game.difficulty] || DIFFICULTY_SETTINGS.easy;
  return {
    stage: base.stage,
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
  return STAGE_THREAT_PLANS[stage] || STAGE_THREAT_PLANS[4];
}

export function getWaveBriefing(game, difficulty) {
  const plan = getStageThreatPlan(difficulty.stage);
  const bossText = game.wave % 5 === 0
    ? " Horned boss confirmed in this wave."
    : "";
  return `${difficulty.modeLabel} Stage ${difficulty.stage} ${difficulty.name}: ${plan.briefing}${bossText}`;
}
