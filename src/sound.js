let audioContext = null;
let unlocked = false;
let bossMusic = null;

const SOUND_SETTINGS = {
  gun_fire: { frequency: 180, endFrequency: 70, duration: 0.055, type: "sawtooth", gain: 0.055 },
  alien_hit: { frequency: 520, endFrequency: 300, duration: 0.08, type: "square", gain: 0.04 },
  alien_death: { frequency: 180, endFrequency: 45, duration: 0.22, type: "sawtooth", gain: 0.06 },
  reload: { frequency: 260, endFrequency: 420, duration: 0.14, type: "triangle", gain: 0.04 },
  pickup: { frequency: 620, endFrequency: 960, duration: 0.12, type: "sine", gain: 0.045 },
  base_damage: { frequency: 90, endFrequency: 55, duration: 0.18, type: "square", gain: 0.06 },
  boss_warning: { frequency: 120, endFrequency: 280, duration: 0.42, type: "sawtooth", gain: 0.07 },
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
      { frequency: 220, endFrequency: 120, duration: 0.24, type: "sawtooth", gain: 0.05, delay: 0 },
      { frequency: 165, endFrequency: 70, duration: 0.34, type: "square", gain: 0.035, delay: 0.12 }
    ]
  }
};

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

export function unlockAudio() {
  const ctx = getAudioContext();
  if (!ctx || unlocked) return;
  ctx.resume?.();
  unlocked = true;
}

export function setupAudioUnlock() {
  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });
}

export function playSound(name) {
  const settings = SOUND_SETTINGS[name];
  const ctx = getAudioContext();
  if (!settings || !ctx || ctx.state === "suspended") return;

  if (settings.tones) {
    settings.tones.forEach(tone => playTone(ctx, tone));
    return;
  }

  playTone(ctx, settings);
}

function playTone(ctx, settings) {
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
  gain.connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + settings.duration);
}

export function startBossMusic() {
  const ctx = getAudioContext();
  if (!ctx || ctx.state === "suspended" || bossMusic) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(55, ctx.currentTime);
  gain.gain.setValueAtTime(0.018, ctx.currentTime);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  bossMusic = { oscillator, gain };
}

export function stopBossMusic() {
  if (!bossMusic) return;
  const ctx = getAudioContext();
  const stopAt = ctx.currentTime + 0.18;
  bossMusic.gain.gain.exponentialRampToValueAtTime(0.001, stopAt);
  bossMusic.oscillator.stop(stopAt);
  bossMusic = null;
}
