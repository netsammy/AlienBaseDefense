import * as BABYLON from "@babylonjs/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { Capacitor } from "@capacitor/core";

let audioContext = null;
let unlocked = false;
let masterGainNode = null;
let musicGainNode = null;
let sfxGainNode = null;
let noiseBuffer = null;

// Volume levels (0.0 to 1.0)
let audioVolumes = {
  master: 0.85,
  music: 0.50,
  sfx: 0.85
};

// ==========================================
// SOUND EFFECT DEFINITIONS
// ==========================================
const SOUND_SETTINGS = {
  gun_fire: { frequency: 220, endFrequency: 65, duration: 0.06, type: "sawtooth", gain: 0.055, noise: 0.04 },
  shotgun_fire: {
    noise: 0.12,
    noiseDuration: 0.18,
    noiseFilter: 1200,
    tones: [
      { frequency: 120, endFrequency: 35, duration: 0.18, type: "sawtooth", gain: 0.08, delay: 0 },
      { frequency: 75, endFrequency: 25, duration: 0.24, type: "sine", gain: 0.11, delay: 0.01 },
      { frequency: 650, endFrequency: 220, duration: 0.05, type: "triangle", gain: 0.04, delay: 0.08 }
    ]
  },
  plasma_fire: {
    tones: [
      { frequency: 950, endFrequency: 220, duration: 0.07, type: "sine", gain: 0.05, delay: 0 },
      { frequency: 1400, endFrequency: 450, duration: 0.05, type: "sawtooth", gain: 0.04, delay: 0.01 }
    ]
  },
  plasma_sniper_fire: {
    noise: 0.08,
    noiseDuration: 0.06,
    noiseFilter: 3800,
    tones: [
      { frequency: 1800, endFrequency: 180, duration: 0.12, type: "sawtooth", gain: 0.07, delay: 0 },
      { frequency: 90, endFrequency: 30, duration: 0.35, type: "sine", gain: 0.12, delay: 0.01 },
      { frequency: 2200, endFrequency: 600, duration: 0.22, type: "sine", gain: 0.05, delay: 0.03 }
    ]
  },
  flamethrower_burst: {
    noise: 0.14,
    noiseDuration: 0.18,
    noiseFilter: 750,
    tones: [
      { frequency: 95, endFrequency: 55, duration: 0.18, type: "sawtooth", gain: 0.045, delay: 0 }
    ]
  },
  rocket_launch: {
    noise: 0.09,
    noiseDuration: 0.28,
    noiseFilter: 900,
    tones: [
      { frequency: 120, endFrequency: 280, duration: 0.28, type: "sawtooth", gain: 0.065, delay: 0 },
      { frequency: 80, endFrequency: 160, duration: 0.32, type: "sine", gain: 0.08, delay: 0.02 }
    ]
  },
  rocket_explode: {
    noise: 0.16,
    noiseDuration: 0.55,
    noiseFilter: 550,
    tones: [
      { frequency: 80, endFrequency: 22, duration: 0.55, type: "sine", gain: 0.14, delay: 0 },
      { frequency: 140, endFrequency: 35, duration: 0.40, type: "sawtooth", gain: 0.09, delay: 0.01 },
      { frequency: 45, endFrequency: 18, duration: 0.65, type: "square", gain: 0.07, delay: 0.04 }
    ]
  },
  alien_hit: { frequency: 480, endFrequency: 260, duration: 0.07, type: "square", gain: 0.045 },
  alien_shoot: { frequency: 420, endFrequency: 110, duration: 0.09, type: "sawtooth", gain: 0.04 },
  alien_death: {
    noise: 0.07,
    noiseDuration: 0.2,
    noiseFilter: 900,
    tones: [
      { frequency: 190, endFrequency: 40, duration: 0.22, type: "sawtooth", gain: 0.06, delay: 0 },
      { frequency: 95, endFrequency: 30, duration: 0.25, type: "square", gain: 0.045, delay: 0.03 }
    ]
  },
  alien_splatter: {
    noise: 0.09,
    noiseDuration: 0.22,
    noiseFilter: 1100,
    tones: [
      { frequency: 240, endFrequency: 50, duration: 0.2, type: "sawtooth", gain: 0.07, delay: 0 },
      { frequency: 440, endFrequency: 85, duration: 0.14, type: "triangle", gain: 0.05, delay: 0.02 }
    ]
  },
  alien_skitter: {
    tones: [
      { frequency: 1400, endFrequency: 350, duration: 0.08, type: "sawtooth", gain: 0.035, delay: 0 },
      { frequency: 950, endFrequency: 220, duration: 0.07, type: "square", gain: 0.025, delay: 0.035 }
    ]
  },
  alien_roar: {
    noise: 0.1,
    noiseDuration: 0.45,
    noiseFilter: 600,
    tones: [
      { frequency: 70, endFrequency: 160, duration: 0.45, type: "sawtooth", gain: 0.085, delay: 0 },
      { frequency: 130, endFrequency: 50, duration: 0.55, type: "square", gain: 0.075, delay: 0.05 }
    ]
  },
  boss_warning: {
    tones: [
      { frequency: 85, endFrequency: 220, duration: 0.55, type: "sawtooth", gain: 0.08, delay: 0 },
      { frequency: 120, endFrequency: 320, duration: 0.55, type: "square", gain: 0.065, delay: 0.04 },
      { frequency: 55, endFrequency: 110, duration: 0.7, type: "sine", gain: 0.1, delay: 0.02 }
    ]
  },
  boss_stomp: {
    noise: 0.18,
    noiseDuration: 0.6,
    noiseFilter: 380,
    tones: [
      { frequency: 55, endFrequency: 18, duration: 0.65, type: "sine", gain: 0.16, delay: 0 },
      { frequency: 90, endFrequency: 25, duration: 0.45, type: "sawtooth", gain: 0.1, delay: 0.02 },
      { frequency: 260, endFrequency: 60, duration: 0.25, type: "square", gain: 0.06, delay: 0.04 }
    ]
  },
  boss_enrage: {
    noise: 0.14,
    noiseDuration: 0.8,
    noiseFilter: 850,
    tones: [
      { frequency: 50, endFrequency: 140, duration: 0.75, type: "sawtooth", gain: 0.12, delay: 0 },
      { frequency: 95, endFrequency: 210, duration: 0.85, type: "square", gain: 0.09, delay: 0.05 },
      { frequency: 35, endFrequency: 75, duration: 0.95, type: "sine", gain: 0.14, delay: 0.02 }
    ]
  },
  egg_pod_spawn: {
    noise: 0.06,
    noiseDuration: 0.22,
    noiseFilter: 650,
    tones: [
      { frequency: 320, endFrequency: 120, duration: 0.25, type: "triangle", gain: 0.06, delay: 0 },
      { frequency: 180, endFrequency: 75, duration: 0.3, type: "sine", gain: 0.07, delay: 0.05 }
    ]
  },
  egg_pod_hatch: {
    noise: 0.12,
    noiseDuration: 0.35,
    noiseFilter: 1400,
    tones: [
      { frequency: 450, endFrequency: 120, duration: 0.28, type: "sawtooth", gain: 0.07, delay: 0 },
      { frequency: 820, endFrequency: 240, duration: 0.22, type: "triangle", gain: 0.05, delay: 0.04 }
    ]
  },
  base_damage: { frequency: 85, endFrequency: 45, duration: 0.22, type: "square", gain: 0.07 },
  interception: {
    tones: [
      { frequency: 780, endFrequency: 1150, duration: 0.09, type: "triangle", gain: 0.05, delay: 0 },
      { frequency: 1250, endFrequency: 650, duration: 0.13, type: "sine", gain: 0.045, delay: 0.05 }
    ]
  },
  adrenaline_ready: {
    tones: [
      { frequency: 520, endFrequency: 880, duration: 0.12, type: "sine", gain: 0.05, delay: 0 },
      { frequency: 880, endFrequency: 1320, duration: 0.15, type: "sine", gain: 0.06, delay: 0.08 }
    ]
  },
  reload: { frequency: 260, endFrequency: 420, duration: 0.14, type: "triangle", gain: 0.04 },
  pickup: { frequency: 620, endFrequency: 960, duration: 0.12, type: "sine", gain: 0.045 },
  wave_clear: {
    tones: [
      { frequency: 420, endFrequency: 640, duration: 0.11, type: "sine", gain: 0.045, delay: 0 },
      { frequency: 560, endFrequency: 840, duration: 0.13, type: "triangle", gain: 0.04, delay: 0.08 },
      { frequency: 760, endFrequency: 980, duration: 0.16, type: "sine", gain: 0.036, delay: 0.17 }
    ]
  },
  reward_select: {
    tones: [
      { frequency: 330, endFrequency: 495, duration: 0.1, type: "triangle", gain: 0.035, delay: 0 },
      { frequency: 660, endFrequency: 880, duration: 0.11, type: "sine", gain: 0.03, delay: 0.07 }
    ]
  },
  game_over: {
    tones: [
      { frequency: 220, endFrequency: 120, duration: 0.28, type: "sawtooth", gain: 0.06, delay: 0 },
      { frequency: 165, endFrequency: 65, duration: 0.4, type: "square", gain: 0.045, delay: 0.12 }
    ]
  },
  flashlight_click: {
    tones: [
      { frequency: 1800, endFrequency: 900, duration: 0.03, type: "sine", gain: 0.04, delay: 0 },
      { frequency: 950, endFrequency: 450, duration: 0.04, type: "square", gain: 0.03, delay: 0.02 }
    ]
  },
  weapon_switch: {
    tones: [
      { frequency: 750, endFrequency: 1200, duration: 0.04, type: "triangle", gain: 0.04, delay: 0 },
      { frequency: 1400, endFrequency: 800, duration: 0.05, type: "square", gain: 0.035, delay: 0.03 }
    ]
  },
  acid_sizzle: {
    noise: 0.05,
    noiseDuration: 0.22,
    noiseFilter: 2200,
    tones: [
      { frequency: 820, endFrequency: 1450, duration: 0.22, type: "sawtooth", gain: 0.035, delay: 0 },
      { frequency: 1600, endFrequency: 600, duration: 0.28, type: "sine", gain: 0.025, delay: 0.05 }
    ]
  },
  turret_deploy: {
    tones: [
      { frequency: 320, endFrequency: 680, duration: 0.12, type: "sawtooth", gain: 0.06, delay: 0 },
      { frequency: 540, endFrequency: 920, duration: 0.15, type: "triangle", gain: 0.05, delay: 0.06 },
      { frequency: 880, endFrequency: 1400, duration: 0.18, type: "sine", gain: 0.06, delay: 0.12 }
    ]
  },
  turret_upgrade: {
    tones: [
      { frequency: 440, endFrequency: 880, duration: 0.1, type: "sine", gain: 0.05, delay: 0 },
      { frequency: 660, endFrequency: 1320, duration: 0.12, type: "sine", gain: 0.06, delay: 0.08 },
      { frequency: 990, endFrequency: 1760, duration: 0.18, type: "triangle", gain: 0.06, delay: 0.16 }
    ]
  },
  turret_overdrive: {
    tones: [
      { frequency: 220, endFrequency: 880, duration: 0.35, type: "sawtooth", gain: 0.08, delay: 0 },
      { frequency: 440, endFrequency: 1400, duration: 0.4, type: "square", gain: 0.06, delay: 0.05 },
      { frequency: 120, endFrequency: 300, duration: 0.45, type: "sine", gain: 0.09, delay: 0.02 }
    ]
  },
  slide_dash: {
    tones: [
      { frequency: 420, endFrequency: 90, duration: 0.28, type: "sawtooth", gain: 0.055, delay: 0 },
      { frequency: 280, endFrequency: 60, duration: 0.32, type: "sine", gain: 0.065, delay: 0.02 }
    ]
  },
  emp_blast: {
    noise: 0.15,
    noiseDuration: 0.6,
    noiseFilter: 1200,
    tones: [
      { frequency: 65, endFrequency: 25, duration: 0.65, type: "sine", gain: 0.14, delay: 0 },
      { frequency: 320, endFrequency: 90, duration: 0.5, type: "sawtooth", gain: 0.08, delay: 0.02 },
      { frequency: 1600, endFrequency: 180, duration: 0.45, type: "square", gain: 0.065, delay: 0.05 }
    ]
  },
  radio_chirp: {
    tones: [
      { frequency: 1200, endFrequency: 2400, duration: 0.035, type: "sine", gain: 0.045, delay: 0 },
      { frequency: 2400, endFrequency: 1800, duration: 0.045, type: "sawtooth", gain: 0.035, delay: 0.03 }
    ]
  },
  radio_roger: {
    tones: [
      { frequency: 880, endFrequency: 440, duration: 0.055, type: "sine", gain: 0.04, delay: 0 },
      { frequency: 440, endFrequency: 330, duration: 0.075, type: "sine", gain: 0.03, delay: 0.045 }
    ]
  },
  stage_victory: {
    tones: [
      { frequency: 523, endFrequency: 659, duration: 0.18, type: "sine", gain: 0.08, delay: 0 },
      { frequency: 659, endFrequency: 784, duration: 0.22, type: "triangle", gain: 0.08, delay: 0.14 },
      { frequency: 784, endFrequency: 1046, duration: 0.38, type: "sine", gain: 0.09, delay: 0.32 },
      { frequency: 1046, endFrequency: 1318, duration: 0.48, type: "triangle", gain: 0.09, delay: 0.52 }
    ]
  },
  achievement_unlock: {
    tones: [
      { frequency: 440, endFrequency: 554, duration: 0.12, type: "sine", gain: 0.07, delay: 0 },
      { frequency: 554, endFrequency: 659, duration: 0.14, type: "triangle", gain: 0.08, delay: 0.08 },
      { frequency: 659, endFrequency: 880, duration: 0.22, type: "sine", gain: 0.09, delay: 0.16 },
      { frequency: 880, endFrequency: 1108, duration: 0.35, type: "triangle", gain: 0.1, delay: 0.26 }
    ]
  }
};

// ==========================================
// AUDIO CONTEXT & GAIN NODES
// ==========================================
function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();

    // Master Gain
    masterGainNode = audioContext.createGain();
    masterGainNode.gain.setValueAtTime(audioVolumes.master, audioContext.currentTime);
    masterGainNode.connect(audioContext.destination);

    // Music Gain
    musicGainNode = audioContext.createGain();
    musicGainNode.gain.setValueAtTime(audioVolumes.music, audioContext.currentTime);
    musicGainNode.connect(masterGainNode);

    // SFX Gain
    sfxGainNode = audioContext.createGain();
    sfxGainNode.gain.setValueAtTime(audioVolumes.sfx, audioContext.currentTime);
    sfxGainNode.connect(masterGainNode);

    // Generate White Noise Buffer (2 seconds mono)
    const bufferSize = audioContext.sampleRate * 2;
    noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return audioContext;
}

export function setAudioVolume({ master, music, sfx }) {
  const ctx = getAudioContext();
  if (master !== undefined) {
    audioVolumes.master = Math.max(0, Math.min(1, master));
    if (masterGainNode && ctx) masterGainNode.gain.setValueAtTime(audioVolumes.master, ctx.currentTime);
  }
  if (music !== undefined) {
    audioVolumes.music = Math.max(0, Math.min(1, music));
    if (musicGainNode && ctx) musicGainNode.gain.setValueAtTime(audioVolumes.music, ctx.currentTime);
  }
  if (sfx !== undefined) {
    audioVolumes.sfx = Math.max(0, Math.min(1, sfx));
    if (sfxGainNode && ctx) sfxGainNode.gain.setValueAtTime(audioVolumes.sfx, ctx.currentTime);
  }
}

export function getAudioVolume() {
  return { ...audioVolumes };
}

export function unlockAudio() {
  const ctx = getAudioContext();
  if (!ctx || unlocked) return;
  ctx.resume?.();
  unlocked = true;
  if (currentMusicState !== "off") {
    ensureMusicLoop();
  }
}

export function setupAudioUnlock() {
  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });
}

// ==========================================
// SOUND EFFECT PLAYBACK
// ==========================================
export function playSound(name) {
  const settings = SOUND_SETTINGS[name];
  const ctx = getAudioContext();
  if (!settings || !ctx || ctx.state === "suspended") return;

  const targetNode = sfxGainNode || ctx.destination;

  if (settings.noise) {
    playNoiseBurst(ctx, settings, targetNode);
  }

  if (settings.tones) {
    settings.tones.forEach(tone => playTone(ctx, tone, targetNode));
    return;
  }

  playTone(ctx, settings, targetNode);
}

function playTone(ctx, settings, targetNode) {
  const now = ctx.currentTime;
  const startAt = now + (settings.delay || 0);
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = settings.type;
  oscillator.frequency.setValueAtTime(settings.frequency, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, settings.endFrequency), startAt + settings.duration);

  gain.gain.setValueAtTime(settings.gain, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + settings.duration);

  oscillator.connect(gain);
  gain.connect(targetNode);
  oscillator.start(startAt);
  oscillator.stop(startAt + settings.duration);
}

function playNoiseBurst(ctx, settings, targetNode) {
  if (!noiseBuffer) return;
  const now = ctx.currentTime;
  const startAt = now + (settings.delay || 0);
  const duration = settings.noiseDuration || settings.duration || 0.15;

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(settings.noiseFilter || 1000, startAt);
  filter.frequency.exponentialRampToValueAtTime(100, startAt + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(settings.noise || 0.05, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

  noiseSource.connect(filter);
  filter.connect(gain);
  gain.connect(targetNode);

  noiseSource.start(startAt);
  noiseSource.stop(startAt + duration);
}

// ==========================================
// SPATIAL 3D AUDIO
// ==========================================
export function updateAudioListener(camera) {
  const ctx = getAudioContext();
  if (!ctx || !camera) return;

  const pos = camera.position;
  const forward = camera.getDirection(BABYLON.Axis.Z);
  const up = camera.getDirection(BABYLON.Axis.Y);

  try {
    if (ctx.listener.positionX) {
      const t = ctx.currentTime;
      ctx.listener.positionX.setValueAtTime(pos.x, t);
      ctx.listener.positionY.setValueAtTime(pos.y, t);
      ctx.listener.positionZ.setValueAtTime(pos.z, t);
      ctx.listener.forwardX.setValueAtTime(forward.x, t);
      ctx.listener.forwardY.setValueAtTime(forward.y, t);
      ctx.listener.forwardZ.setValueAtTime(forward.z, t);
      ctx.listener.upX.setValueAtTime(up.x, t);
      ctx.listener.upY.setValueAtTime(up.y, t);
      ctx.listener.upZ.setValueAtTime(up.z, t);
    } else if (ctx.listener.setPosition) {
      ctx.listener.setPosition(pos.x, pos.y, pos.z);
      ctx.listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  } catch {
    // Ignore audio listener parameter setting errors on older browsers
  }
}

export function playSpatialSound(name, position, camera = null, volumeMult = 1) {
  const settings = SOUND_SETTINGS[name];
  const ctx = getAudioContext();
  if (!settings || !ctx || ctx.state === "suspended" || !position) {
    if (settings && ctx && ctx.state !== "suspended") playSound(name);
    return;
  }

  if (camera) {
    updateAudioListener(camera);
  }

  let panner;
  try {
    panner = ctx.createPanner();
    panner.panningModel = "equalpower";
    panner.distanceModel = "inverse";
    panner.refDistance = 3.5;
    panner.maxDistance = 55;
    panner.rolloffFactor = 1.15;

    if (panner.positionX) {
      const now = ctx.currentTime;
      panner.positionX.setValueAtTime(position.x, now);
      panner.positionY.setValueAtTime(position.y, now);
      panner.positionZ.setValueAtTime(position.z, now);
    } else if (panner.setPosition) {
      panner.setPosition(position.x, position.y, position.z);
    }
  } catch {
    playSound(name);
    return;
  }

  panner.connect(sfxGainNode || ctx.destination);

  if (settings.noise) {
    playNoiseBurst(ctx, settings, panner);
  }

  if (settings.tones) {
    settings.tones.forEach(tone => playToneToNode(ctx, tone, panner, volumeMult));
  } else {
    playToneToNode(ctx, settings, panner, volumeMult);
  }
}

function playToneToNode(ctx, settings, destinationNode, volumeMult = 1) {
  const now = ctx.currentTime;
  const startAt = now + (settings.delay || 0);
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = settings.type;
  oscillator.frequency.setValueAtTime(settings.frequency, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, settings.endFrequency), startAt + settings.duration);

  const finalGain = settings.gain * volumeMult;
  gain.gain.setValueAtTime(finalGain, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + settings.duration);

  oscillator.connect(gain);
  gain.connect(destinationNode);
  oscillator.start(startAt);
  oscillator.stop(startAt + settings.duration);
}

// ==========================================
// PROCEDURAL DYNAMIC MUSIC SEQUENCER
// ==========================================
let currentMusicState = "off"; // "off", "ambient", "combat", "boss"
let musicInterval = null;
let musicStep = 0;
let nextStepTime = 0;

// Musical scale frequencies (D Minor / Sci-Fi Synthwave)
const NOTES = {
  D1: 36.71, F1: 43.65, G1: 49.00, A1: 55.00, C2: 65.41,
  D2: 73.42, F2: 87.31, G2: 98.00, A2: 110.00, C3: 130.81,
  D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, C4: 261.63,
  D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, C5: 523.25, D5: 587.33, F5: 698.46, E5: 659.25
};

// Combat Patterns (128 BPM, 16 steps per bar)
const COMBAT_BASS = [
  NOTES.D2, NOTES.D2, NOTES.F2, NOTES.D2,
  NOTES.G2, NOTES.D2, NOTES.F2, NOTES.A2,
  NOTES.D2, NOTES.D2, NOTES.C3, NOTES.A2,
  NOTES.G2, NOTES.F2, NOTES.E3, NOTES.D2
];

const COMBAT_ARP = [
  NOTES.D4, null, NOTES.F4, NOTES.A4,
  null, NOTES.D5, NOTES.A4, null,
  NOTES.C5, NOTES.A4, null, NOTES.F4,
  NOTES.G4, null, NOTES.A4, NOTES.C5
];

// Boss Patterns (140 BPM, urgent, heavy, dark)
const BOSS_BASS = [
  NOTES.D1, NOTES.D1, NOTES.D2, NOTES.D1,
  NOTES.C2, NOTES.D1, NOTES.F1, NOTES.D1,
  NOTES.D1, NOTES.D1, NOTES.G1, NOTES.F1,
  NOTES.E2, NOTES.D1, NOTES.C2, NOTES.D1
];

const BOSS_LEAD = [
  NOTES.A4, NOTES.D4, NOTES.A4, NOTES.D4,
  NOTES.C5, NOTES.F4, NOTES.C5, NOTES.F4,
  NOTES.D5, NOTES.A4, NOTES.D5, NOTES.A4,
  NOTES.F5, NOTES.E5, NOTES.D5, NOTES.C5
];

// Ambient Pads (88 BPM, slow minor chords)
const AMBIENT_PADS = [
  [NOTES.D3, NOTES.F3, NOTES.A3, NOTES.C4],
  [NOTES.C3, NOTES.E3, NOTES.G3, 246.94],
  [NOTES.G2, NOTES.D3, NOTES.F3, NOTES.A3],
  [NOTES.A2, NOTES.C3, NOTES.E3, NOTES.G3]
];

export function setMusicState(state) {
  if (state === currentMusicState) return;
  currentMusicState = state;

  const ctx = getAudioContext();
  if (!ctx || ctx.state === "suspended") return;

  if (state === "off") {
    stopMusicScheduler();
  } else {
    ensureMusicLoop();
  }
}

function ensureMusicLoop() {
  if (musicInterval) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  nextStepTime = ctx.currentTime + 0.05;
  musicStep = 0;

  musicInterval = setInterval(() => {
    scheduleMusic(ctx);
  }, 25);
}

function stopMusicScheduler() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

function scheduleMusic(ctx) {
  if (!unlocked || ctx.state === "suspended" || currentMusicState === "off") return;

  const lookAhead = 0.12; // schedule ahead in seconds
  const bpm = currentMusicState === "boss" ? 140 : currentMusicState === "combat" ? 128 : 86;
  const stepDuration = 60 / bpm / 4; // 16th note duration

  while (nextStepTime < ctx.currentTime + lookAhead) {
    playStep(ctx, nextStepTime, currentMusicState, musicStep, stepDuration);
    nextStepTime += stepDuration;
    musicStep = (musicStep + 1) % 16;
  }
}

function playStep(ctx, time, state, step, stepDuration) {
  const dest = musicGainNode || ctx.destination;

  if (state === "combat") {
    // Kick on four-on-the-floor
    if (step === 0 || step === 4 || step === 8 || step === 12) {
      triggerSynthKick(ctx, time, dest, 0.07);
    }
    // Hi-hat on offbeats
    if (step === 2 || step === 6 || step === 10 || step === 14) {
      triggerSynthHiHat(ctx, time, dest, 0.025);
    }
    // Bass note on each 16th
    const bassNote = COMBAT_BASS[step];
    if (bassNote) {
      triggerSynthBass(ctx, time, dest, bassNote, stepDuration * 0.85, 0.045);
    }
    // Arp note
    const arpNote = COMBAT_ARP[step];
    if (arpNote) {
      triggerSynthLead(ctx, time, dest, arpNote, stepDuration * 0.7, 0.025, "sawtooth");
    }
  } else if (state === "boss") {
    // Heavy war march double-kick
    if (step === 0 || step === 3 || step === 6 || step === 8 || step === 11 || step === 14) {
      triggerSynthKick(ctx, time, dest, 0.1);
    }
    // Rapid militaristic snare / hi-hat
    if (step % 2 === 1) {
      triggerSynthHiHat(ctx, time, dest, 0.038);
    }
    if (step === 4 || step === 12) {
      triggerSynthSnare(ctx, time, dest, 0.06);
    }
    // Heavy aggressive sub-bass
    const bossBass = BOSS_BASS[step];
    if (bossBass) {
      triggerSynthBass(ctx, time, dest, bossBass, stepDuration * 0.95, 0.065, "sawtooth");
    }
    // Urgent lead
    const bossLead = BOSS_LEAD[step];
    if (bossLead) {
      triggerSynthLead(ctx, time, dest, bossLead, stepDuration * 0.75, 0.035, "square");
    }
  } else if (state === "ambient") {
    // Slow atmospheric pulse: play a chord pad every 16 steps (1 bar)
    if (step === 0) {
      const padIndex = Math.floor((musicStep / 16) % AMBIENT_PADS.length);
      const chord = AMBIENT_PADS[padIndex] || AMBIENT_PADS[0];
      chord.forEach((freq, idx) => {
        triggerAmbientPad(ctx, time, dest, freq, stepDuration * 15, 0.018 - idx * 0.003);
      });
      triggerSubPulse(ctx, time, dest, 45, stepDuration * 8, 0.04);
    }
    // Subtle ambient arpeggio tick
    if (step === 4 || step === 10) {
      triggerSynthLead(ctx, time, dest, NOTES.A4, stepDuration * 1.5, 0.012, "sine");
    }
  }
}

// Synth voice generators
function triggerSynthKick(ctx, time, dest, volume) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(130, time);
  osc.frequency.exponentialRampToValueAtTime(32, time + 0.11);
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + 0.11);
}

function triggerSynthHiHat(ctx, time, dest, volume) {
  if (!noiseBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(6500, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start(time);
  src.stop(time + 0.04);
}

function triggerSynthSnare(ctx, time, dest, volume) {
  if (!noiseBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(2200, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start(time);
  src.stop(time + 0.12);
}

function triggerSynthBass(ctx, time, dest, freq, duration, volume, type = "triangle") {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + duration);
}

function triggerSynthLead(ctx, time, dest, freq, duration, volume, type = "sawtooth") {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + duration);
}

function triggerAmbientPad(ctx, time, dest, freq, duration, volume) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(volume, time + 0.5);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + duration);
}

function triggerSubPulse(ctx, time, dest, freq, duration, volume) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(volume, time + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + duration);
}

// Backwards compatibility functions
export function startBossMusic() {
  setMusicState("boss");
}

export function stopBossMusic() {
  setMusicState("combat");
}

// ==========================================
// RADIO COMMUNICATIONS & VOICE OVER
// ==========================================
let radioBannerTimer = null;
let lastAnnouncedMessage = "";
let lastAnnouncedTime = 0;
let isNativeTtsSpeaking = false;

export async function broadcastRadioComms(message, priority = false, senderTag = "HQ COMMS") {
  if (!message) return;
  const now = performance.now();
  if (!priority && message === lastAnnouncedMessage && now - lastAnnouncedTime < 4000) return;
  lastAnnouncedMessage = message;
  lastAnnouncedTime = now;

  playSound("radio_chirp");

  const banner = document.getElementById("radioCommsBanner");
  const textEl = document.getElementById("radioCommsText");
  const tagEl = document.getElementById("radioCommsTag");

  if (banner && textEl) {
    textEl.textContent = message.toUpperCase();
    if (tagEl) {
      if (senderTag === "AI HELPER") {
        tagEl.textContent = "🤖 [AI HELPER]";
        tagEl.style.color = "#00e5ff";
      } else {
        tagEl.textContent = "📻 [HQ COMMS]";
        tagEl.style.color = "#ffe66d";
      }
    }
    banner.style.display = "block";
    banner.style.opacity = "1";
    clearTimeout(radioBannerTimer);
    radioBannerTimer = setTimeout(() => {
      banner.style.opacity = "0";
      setTimeout(() => {
        if (banner.style.opacity === "0") banner.style.display = "none";
      }, 350);
    }, 4500);
  }

  if (senderTag === "AI HELPER" && !voiceAdvisorEnabled) return;

  // Voice synthesis: Native Capacitor TTS on Mobile, Web Speech API fallback on Desktop
  const isNative = typeof Capacitor !== "undefined" && Capacitor.isNativePlatform();

  if (isNative) {
    try {
      if (priority || !isNativeTtsSpeaking) {
        await TextToSpeech.stop().catch(() => {});
      } else {
        return;
      }
      isNativeTtsSpeaking = true;
      const pitchVal = senderTag === "AI HELPER" ? 1.02 : 0.94;
      await TextToSpeech.speak({
        text: message,
        lang: "en-US",
        rate: 1.06,
        pitch: pitchVal,
        volume: voiceVolumeLevel,
        category: "ambient",
      });
      isNativeTtsSpeaking = false;
      playSound("radio_roger");
    } catch (err) {
      console.warn("Native TTS speech error:", err);
      isNativeTtsSpeaking = false;
      setTimeout(() => playSound("radio_roger"), 1400);
    }
  } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.resume?.();
      if (priority || !window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      } else {
        return;
      }
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.pitch = senderTag === "AI HELPER" ? 1.02 : 0.90;
      utterance.rate = 1.08;
      utterance.volume = voiceVolumeLevel;
      utterance.onend = () => {
        playSound("radio_roger");
      };
      utterance.onerror = () => {
        setTimeout(() => playSound("radio_roger"), 1400);
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      setTimeout(() => playSound("radio_roger"), 1600);
    }
  } else {
    setTimeout(() => playSound("radio_roger"), 1600);
  }
}

// ==========================================
// AUDIO SETTINGS & VOLUME CONTROLS
// ==========================================
let voiceVolumeLevel = 1.0;
let voiceAdvisorEnabled = true;

export function setMasterVolume(val) {
  audioVolumes.master = Math.max(0, Math.min(1, val));
  if (masterGainNode && audioContext) {
    masterGainNode.gain.setValueAtTime(audioVolumes.master, audioContext.currentTime);
  }
}

export function setMusicVolume(val) {
  audioVolumes.music = Math.max(0, Math.min(1, val));
  if (musicGainNode && audioContext) {
    musicGainNode.gain.setValueAtTime(audioVolumes.music, audioContext.currentTime);
  }
}

export function setSfxVolume(val) {
  audioVolumes.sfx = Math.max(0, Math.min(1, val));
  if (sfxGainNode && audioContext) {
    sfxGainNode.gain.setValueAtTime(audioVolumes.sfx, audioContext.currentTime);
  }
}

export function setVoiceVolume(val) {
  voiceVolumeLevel = Math.max(0, Math.min(1, val));
}

export function setVoiceEnabled(enabled) {
  voiceAdvisorEnabled = Boolean(enabled);
}

export function getAudioSettings() {
  return {
    master: audioVolumes.master,
    music: audioVolumes.music,
    sfx: audioVolumes.sfx,
    voice: voiceVolumeLevel,
    voiceEnabled: voiceAdvisorEnabled
  };
}
