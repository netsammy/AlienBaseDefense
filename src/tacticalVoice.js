// ================================================================
// TACTICAL AI VOICE HELPER
// Real-time spatial threat detection and military AI audio advisor
// ================================================================

import { broadcastRadioComms } from "./sound.js";

let lastCheckTime = 0;
let lastGlobalVoiceTime = 0;

let lastBehindTime = 0;
let lastFlankTime = 0;
let lastSurroundTime = 0;
let lastShieldWarningTime = 0;
let lastHealthWarningTime = 0;
let lastAmmoWarningTime = 0;
let ultimateAnnounced = false;

const BEHIND_PHRASES_CLOSE = [
  "Watch your back! Hostile directly behind you!",
  "Hostile on your six! Turn around!",
  "Behind you! Enemy closing in fast!",
  "Warning! Alien right behind you! Evade!"
];

const BEHIND_PHRASES_APPROACHING = [
  "Hostile approaching from behind!",
  "Check your six! Hostile detected in your rear!",
  "Alien closing in behind you!"
];

const FLANK_LEFT_PHRASES = [
  "Hostile flanking your left!",
  "Check your left flank!"
];

const FLANK_RIGHT_PHRASES = [
  "Hostile flanking your right!",
  "Check your right flank!"
];

const SURROUNDED_PHRASES = [
  "Multiple hostiles in close quarters! Keep moving!",
  "You're surrounded, Defender! Clear a path!",
  "Swarm closing in from all sides! Fall back!"
];

function getRandomPhrase(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function resetTacticalVoice() {
  lastCheckTime = 0;
  lastGlobalVoiceTime = 0;
  lastBehindTime = 0;
  lastFlankTime = 0;
  lastSurroundTime = 0;
  lastShieldWarningTime = 0;
  lastHealthWarningTime = 0;
  lastAmmoWarningTime = 0;
  ultimateAnnounced = false;
}

export function updateTacticalVoice(context) {
  const { camera, game } = context;
  if (!game || !game.started || game.paused || game.gameOver) return;

  const now = performance.now();
  // Throttle spatial geometry checks to every 220ms
  if (now - lastCheckTime < 220) return;
  lastCheckTime = now;

  // Ultimate readiness callout
  if (game.ultimateCharge >= 100) {
    if (!ultimateAnnounced && now - lastGlobalVoiceTime > 3500) {
      ultimateAnnounced = true;
      lastGlobalVoiceTime = now;
      broadcastRadioComms("Orbital Ion Strike online. Ready to fire.", true, "AI HELPER");
      return;
    }
  } else if (game.ultimateCharge < 40) {
    ultimateAnnounced = false;
  }

  // Base Shield Critical Alert
  if (game.baseShield > 0 && game.baseShield <= 35) {
    if (now - lastShieldWarningTime > 16000 && now - lastGlobalVoiceTime > 5000) {
      lastShieldWarningTime = now;
      lastGlobalVoiceTime = now;
      broadcastRadioComms("Warning! Base shield failing! Protect the core!", true, "AI HELPER");
      return;
    }
  }

  // Player Health Critical Alert
  if (game.health > 0 && game.health <= 30) {
    if (now - lastHealthWarningTime > 16000 && now - lastGlobalVoiceTime > 5000) {
      lastHealthWarningTime = now;
      lastGlobalVoiceTime = now;
      broadcastRadioComms("Critical damage detected! Locate medical supplies!", true, "AI HELPER");
      return;
    }
  }

  // Player Ammo Depleted Alert
  const currentGun = game.weapons?.[game.activeWeaponIndex];
  if (currentGun && currentGun.reserveAmmo === 0 && currentGun.ammo <= 2) {
    if (now - lastAmmoWarningTime > 20000 && now - lastGlobalVoiceTime > 5000) {
      lastAmmoWarningTime = now;
      lastGlobalVoiceTime = now;
      broadcastRadioComms("Weapon ammo dry! Locate supply drops!", false, "AI HELPER");
      return;
    }
  }

  // Check spatial relationship of all active aliens relative to player look direction
  if (!camera || !Array.isArray(game.aliens) || game.aliens.length === 0) return;

  const camPos = camera.position;
  const fwdRay = camera.getForwardRay ? camera.getForwardRay(1).direction : null;
  let fwdX = fwdRay ? fwdRay.x : 0;
  let fwdZ = fwdRay ? fwdRay.z : 1;
  const fwdLen = Math.hypot(fwdX, fwdZ) || 1;
  fwdX /= fwdLen;
  fwdZ /= fwdLen;

  let closestBehindDist = 999;
  let closestLeftDist = 999;
  let closestRightDist = 999;
  let closeEnemiesCount = 0;

  for (const alien of game.aliens) {
    if (!alien || alien.dead || !alien.position) continue;

    const dx = alien.position.x - camPos.x;
    const dz = alien.position.z - camPos.z;
    const dist = Math.hypot(dx, dz);

    if (dist <= 7.5) {
      closeEnemiesCount++;
    }

    if (dist > 13.0) continue; // Outside immediate tactical perimeter

    const dirX = dx / dist;
    const dirZ = dz / dist;

    // Dot product: 1 = directly in front, 0 = 90 deg sideways, -1 = directly behind
    const dot = fwdX * dirX + fwdZ * dirZ;

    // Cross product (2D): > 0 indicates to the player's LEFT, < 0 indicates to RIGHT
    const cross = fwdX * dirZ - fwdZ * dirX;

    if (dot < -0.32) {
      // Alien is in the rear hemisphere (> 108 deg off front center)
      if (dist < closestBehindDist) {
        closestBehindDist = dist;
      }
    } else if (dot >= -0.32 && dot <= 0.45) {
      // Flanking alien (roughly 63 deg to 108 deg to either side)
      if (cross > 0.45 && dist < closestLeftDist) {
        closestLeftDist = dist;
      } else if (cross < -0.45 && dist < closestRightDist) {
        closestRightDist = dist;
      }
    }
  }

  // Priority 1: Imminent danger directly behind player (within 6.5 meters)
  if (closestBehindDist <= 6.5) {
    if (now - lastBehindTime > 7500 && now - lastGlobalVoiceTime > 4000) {
      lastBehindTime = now;
      lastGlobalVoiceTime = now;
      broadcastRadioComms(getRandomPhrase(BEHIND_PHRASES_CLOSE), true, "AI HELPER");
      return;
    }
  }

  // Priority 2: Multiple hostiles in close quarters (surrounded)
  if (closeEnemiesCount >= 3) {
    if (now - lastSurroundTime > 12000 && now - lastGlobalVoiceTime > 4500) {
      lastSurroundTime = now;
      lastGlobalVoiceTime = now;
      broadcastRadioComms(getRandomPhrase(SURROUNDED_PHRASES), true, "AI HELPER");
      return;
    }
  }

  // Priority 3: Approaching danger behind player (6.5m to 10.5m)
  if (closestBehindDist > 6.5 && closestBehindDist <= 10.5) {
    if (now - lastBehindTime > 9000 && now - lastGlobalVoiceTime > 4500) {
      lastBehindTime = now;
      lastGlobalVoiceTime = now;
      broadcastRadioComms(getRandomPhrase(BEHIND_PHRASES_APPROACHING), false, "AI HELPER");
      return;
    }
  }

  // Priority 4: Flanking threats in close range (within 7.5m)
  if (closestLeftDist <= 7.5 && closestLeftDist <= closestRightDist) {
    if (now - lastFlankTime > 9500 && now - lastGlobalVoiceTime > 4500) {
      lastFlankTime = now;
      lastGlobalVoiceTime = now;
      broadcastRadioComms(getRandomPhrase(FLANK_LEFT_PHRASES), false, "AI HELPER");
      return;
    }
  } else if (closestRightDist <= 7.5) {
    if (now - lastFlankTime > 9500 && now - lastGlobalVoiceTime > 4500) {
      lastFlankTime = now;
      lastGlobalVoiceTime = now;
      broadcastRadioComms(getRandomPhrase(FLANK_RIGHT_PHRASES), false, "AI HELPER");
      return;
    }
  }
}
