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
  boss_warning: { frequency: 120, endFrequency: 280, duration: 0.42, type: "sawtooth", gain: 0.07 }
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

  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = settings.type;
  oscillator.frequency.setValueAtTime(settings.frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, settings.endFrequency), now + settings.duration);

  gain.gain.setValueAtTime(settings.gain, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + settings.duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + settings.duration);
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
