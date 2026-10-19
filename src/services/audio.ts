/**
 * Dependency-free Web Audio synthesizer and optional haptics (Section 13).
 * Enabled by default (toggleable in Settings); never required for gameplay correctness.
 */

export type SoundEffect = 'select' | 'swap' | 'success' | 'celebration' | 'failure';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtxClass) {
    return null;
  }
  if (!audioCtx) {
    try {
      audioCtx = new AudioCtxClass();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {
      // Ignore autoplay restrictions
    });
  }
  return audioCtx;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  durationSec: number,
  startOffsetSec = 0,
  peakGain = 0.06,
  type: OscillatorType = 'sine',
): void {
  const now = ctx.currentTime + startOffsetSec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peakGain, now + 0.014);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationSec + 0.015);
}

/**
 * Plays a tone with a smooth pitch bend (used for the descending "bow-bow" wrong-pattern cue
 * and celebratory shimmer).
 */
function playSlideTone(
  ctx: AudioContext,
  startFreq: number,
  endFreq: number,
  durationSec: number,
  startOffsetSec = 0,
  peakGain = 0.065,
  type: OscillatorType = 'triangle',
): void {
  const now = ctx.currentTime + startOffsetSec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + durationSec);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peakGain, now + 0.02);
  gain.gain.setValueAtTime(peakGain * 0.85, now + durationSec * 0.55);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationSec + 0.02);
}

export function playFeedback(effect: SoundEffect, soundEnabled: boolean): void {
  // Subtle optional haptics on touch devices when sound/feedback is enabled
  if (
    soundEnabled &&
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  ) {
    try {
      if (effect === 'select') navigator.vibrate(6);
      else if (effect === 'swap') navigator.vibrate(12);
      else if (effect === 'success' || effect === 'celebration')
        navigator.vibrate([18, 35, 18, 45, 30]);
      else if (effect === 'failure') navigator.vibrate([35, 70, 50]);
    } catch {
      // Ignore vibration errors
    }
  }

  if (!soundEnabled) {
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  try {
    switch (effect) {
      case 'select':
        playTone(ctx, 440, 0.045, 0, 0.04, 'triangle');
        break;
      case 'swap':
        playTone(ctx, 370, 0.055, 0, 0.05, 'triangle');
        playTone(ctx, 523.25, 0.065, 0.035, 0.05, 'triangle');
        break;
      case 'success':
        // Bright celebratory arpeggio + warm harmonic chord for getting all tiles right
        playTone(ctx, 523.25, 0.16, 0, 0.06, 'sine'); // C5
        playTone(ctx, 659.25, 0.18, 0.065, 0.06, 'sine'); // E5
        playTone(ctx, 783.99, 0.2, 0.13, 0.065, 'sine'); // G5
        playTone(ctx, 1046.5, 0.42, 0.195, 0.075, 'triangle'); // C6 celebration peak
        playTone(ctx, 659.25, 0.38, 0.195, 0.035, 'sine'); // E5 harmony
        playTone(ctx, 783.99, 0.38, 0.195, 0.035, 'sine'); // G5 harmony
        break;
      case 'celebration':
        // Grand celebration fanfare when all daily tiles are solved
        playTone(ctx, 523.25, 0.14, 0, 0.06, 'sine'); // C5
        playTone(ctx, 659.25, 0.14, 0.06, 0.06, 'sine'); // E5
        playTone(ctx, 783.99, 0.16, 0.12, 0.065, 'sine'); // G5
        playTone(ctx, 987.77, 0.18, 0.18, 0.065, 'sine'); // B5
        playTone(ctx, 1046.5, 0.5, 0.25, 0.08, 'triangle'); // C6
        playTone(ctx, 1318.51, 0.48, 0.31, 0.06, 'sine'); // E6 sparkle
        break;
      case 'failure':
        // Expressive two-beat descending "bow-bow" sound when a pattern is wrong
        // Beat 1: "Bow..."
        playSlideTone(ctx, 311.13, 277.18, 0.22, 0, 0.07, 'triangle');
        playSlideTone(ctx, 155.56, 138.59, 0.22, 0, 0.045, 'sine');
        // Beat 2: "...bowww" (lower & longer descending pitch bend)
        playSlideTone(ctx, 254.0, 196.0, 0.42, 0.24, 0.075, 'triangle');
        playSlideTone(ctx, 127.0, 98.0, 0.42, 0.24, 0.05, 'sine');
        break;
    }
  } catch {
    // Never allow audio failure to affect gameplay
  }
}
