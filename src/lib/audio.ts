// Web Audio API Synthesizer for Neo-Brutalist Sound Effects

let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

function playTone(frequency: number, type: OscillatorType, duration: number, volume: number = 0.1) {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
}

export const playMessageSent = () => {
  playTone(300, 'square', 0.1, 0.05);
  setTimeout(() => playTone(400, 'square', 0.1, 0.05), 50);
};

export const playMessageReceived = () => {
  playTone(600, 'sine', 0.1, 0.05);
  setTimeout(() => playTone(800, 'sine', 0.15, 0.05), 100);
};

export const playTaskCompleted = () => {
  playTone(200, 'sawtooth', 0.1, 0.1);
  setTimeout(() => playTone(400, 'sawtooth', 0.1, 0.1), 100);
  setTimeout(() => playTone(800, 'square', 0.3, 0.1), 200);
};

export const playTaskAdded = () => {
  playTone(800, 'square', 0.05, 0.05);
  setTimeout(() => playTone(1200, 'square', 0.1, 0.05), 50);
};

export const playClick = () => {
  playTone(1000, 'square', 0.02, 0.02);
};
