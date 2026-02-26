/**
 * Audio playback using Tone.js.
 * Takes a Song from the music engine and plays it.
 */
import * as Tone from 'tone';
import { type Song } from '../music-engine';

export interface AudioPlayer {
  start(): void;
  stop(): void;
  dispose(): void;
}

export function createAudioPlayer(song: Song, onBeat: () => void): AudioPlayer {
  const transport = Tone.getTransport();

  // Master gain
  const masterGain = new Tone.Gain(1).toDestination();

  // Pad
  const padChorus = new Tone.Chorus({ frequency: 0.4, delayTime: 3.5, depth: 0.5, wet: 0.3 }).start();
  const padFilter = new Tone.Filter({ frequency: 1200, type: 'lowpass', rolloff: -12 });
  const padReverb = new Tone.Reverb({ decay: 3, wet: 0.25 });
  const pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'fatsawtooth', count: 2, spread: 15 },
    envelope: { attack: 0.3, decay: 0.2, sustain: 0.4, release: 0.8 },
    volume: -10,
  });
  pad.chain(padChorus, padFilter, padReverb, masterGain);

  // Bass
  const bassFilter = new Tone.Filter({ frequency: 800, type: 'lowpass', rolloff: -12 });
  const bass = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.005, decay: 0.2, sustain: 0.5, release: 0.3 },
    filterEnvelope: { attack: 0.005, decay: 0.08, sustain: 0.4, release: 0.2, baseFrequency: 150, octaves: 2.5 },
    volume: -4,
  });
  bass.chain(bassFilter, masterGain);

  // Kick
  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.05, octaves: 6,
    envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.3 },
    volume: -2,
  });
  kick.connect(masterGain);

  // Snare
  const snareFilter = new Tone.Filter({ frequency: 1200, type: 'highpass' });
  const snare = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
    volume: -6,
  });
  snare.chain(snareFilter, masterGain);

  // Hat
  const hatFilter = new Tone.Filter({ frequency: 8000, type: 'highpass' });
  const hat = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
    volume: -10,
  });
  hat.chain(hatFilter, masterGain);

  // Arp
  const arpFilter = new Tone.Filter({ frequency: 3000, type: 'lowpass' });
  const arpReverb = new Tone.Reverb({ decay: 1, wet: 0.2 });
  const arp = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'square' },
    envelope: { attack: 0.003, decay: 0.1, sustain: 0.05, release: 0.15 },
    volume: -8,
  });
  arp.chain(arpFilter, arpReverb, masterGain);

  // Melody
  const melodyFilter = new Tone.Filter({ frequency: 2200, type: 'lowpass' });
  const melodyReverb = new Tone.Reverb({ decay: 1.5, wet: 0.3 });
  const melody = new Tone.Synth({
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0.25, release: 0.3 },
    volume: -6,
  });
  melody.chain(melodyFilter, melodyReverb, masterGain);

  // Schedule events
  const parts: Tone.Part[] = [];

  if (song.padEvents.length > 0) {
    const padPart = new Tone.Part((time, e) => {
      pad.triggerAttackRelease(e.notes, e.duration, time, e.vel);
    }, song.padEvents);
    padPart.start(0);
    parts.push(padPart);
  }

  if (song.bassEvents.length > 0) {
    const bassPart = new Tone.Part((time, e) => {
      bass.triggerAttackRelease(e.note, e.duration, time, e.vel);
    }, song.bassEvents);
    bassPart.start(0);
    parts.push(bassPart);
  }

  if (song.kickEvents.length > 0) {
    const kickPart = new Tone.Part((time, e) => {
      kick.triggerAttackRelease('C1', '8n', time, e.vel);
      Tone.getDraw().schedule(() => onBeat(), time);
    }, song.kickEvents);
    kickPart.start(0);
    parts.push(kickPart);
  }

  if (song.snareEvents.length > 0) {
    const snarePart = new Tone.Part((time, e) => {
      snare.triggerAttackRelease('16n', time, e.vel);
    }, song.snareEvents);
    snarePart.start(0);
    parts.push(snarePart);
  }

  if (song.hatEvents.length > 0) {
    const hatPart = new Tone.Part((time, e) => {
      hat.triggerAttackRelease('32n', time, e.vel);
    }, song.hatEvents);
    hatPart.start(0);
    parts.push(hatPart);
  }

  if (song.arpEvents.length > 0) {
    const arpPart = new Tone.Part((time, e) => {
      arp.triggerAttackRelease(e.note, e.duration, time, e.vel);
    }, song.arpEvents);
    arpPart.start(0);
    parts.push(arpPart);
  }

  if (song.melodyEvents.length > 0) {
    const melodyPart = new Tone.Part((time, e) => {
      melody.triggerAttackRelease(e.note, e.duration, time, e.vel);
    }, song.melodyEvents);
    melodyPart.start(0);
    parts.push(melodyPart);
  }

  // Master fade on last bar
  const lastBarDur = song.barDurations[song.totalBars - 1];
  transport.schedule((time) => {
    masterGain.gain.setValueAtTime(1, time);
    masterGain.gain.linearRampToValueAtTime(0, time + lastBarDur);
  }, song.totalTime - lastBarDur);

  const allNodes = [
    pad, padChorus, padFilter, padReverb,
    bass, bassFilter,
    kick,
    snare, snareFilter,
    hat, hatFilter,
    arp, arpFilter, arpReverb,
    melody, melodyFilter, melodyReverb,
    masterGain,
  ];

  function start(): void {
    Tone.start().catch(console.error);
    transport.start();
  }

  function stop(): void {
    transport.stop();
    transport.cancel();
  }

  function dispose(): void {
    stop();
    for (const p of parts) p.dispose();
    for (const n of allNodes) n.dispose();
  }

  return { start, stop, dispose };
}
