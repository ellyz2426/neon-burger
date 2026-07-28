// Neon Burger VR — Audio system (procedural sound effects + ambient music)
import { createSystem, World } from '@iwsdk/core';
import { gameState } from './game-state.js';

export class AudioSystem extends createSystem({}) {

  private ctx: AudioContext | null = null;
  private musicOsc: OscillatorNode | null = null;
  private musicGain: GainNode | null = null;
  private musicStarted = false;

  init() {
    try { this.ctx = new AudioContext(); } catch { /* no audio */ }
  }

  update() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});

    // Handle SFX
    if (gameState.sfxAction && gameState.soundEnabled) {
      this.playSfx(gameState.sfxAction);
      gameState.sfxAction = '';
    } else if (gameState.sfxAction) {
      gameState.sfxAction = '';
    }

    // Ambient music
    if (gameState.musicEnabled && gameState.screen === 'playing') {
      if (!this.musicStarted) this.startMusic();
    } else {
      if (this.musicStarted) this.stopMusic();
    }
  }

  private playSfx(action: string) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    switch (action) {
      case 'step': this.playTone(220, 0.03, 'sine', 0.1); break;
      case 'walk_ingredient': this.playTone(330, 0.06, 'triangle', 0.15); break;
      case 'drop': this.playToneSweep(440, 220, 0.2, 'sawtooth', 0.2); break;
      case 'cascade': this.playToneSweep(550, 275, 0.25, 'sawtooth', 0.25); break;
      case 'crush': this.playNoise(0.15, 0.3); break;
      case 'pepper': this.playNoise(0.1, 0.15); this.playTone(880, 0.08, 'sine', 0.15); break;
      case 'death': this.playToneSweep(440, 110, 0.4, 'sawtooth', 0.3); break;
      case 'burger_complete': this.playTone(523, 0.1, 'sine', 0.2); this.playToneDelayed(659, 0.1, 'sine', 0.2, 0.1); break;
      case 'burger_stack': this.playMelody([523, 659, 784, 1047], 0.1, 0.25); break;
      case 'level_complete': this.playMelody([523, 659, 784, 1047, 1319], 0.15, 0.3); break;
      case 'gameover': this.playToneSweep(330, 110, 0.6, 'square', 0.2); break;
      case 'achievement': this.playMelody([659, 784, 1047], 0.08, 0.2); break;
    }
  }

  private playTone(freq: number, dur: number, type: OscillatorType, vol: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  private playToneDelayed(freq: number, dur: number, type: OscillatorType, vol: number, delay: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime + delay);
    osc.stop(this.ctx.currentTime + delay + dur);
  }

  private playToneSweep(startFreq: number, endFreq: number, dur: number, type: OscillatorType, vol: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  private playNoise(dur: number, vol: number) {
    if (!this.ctx) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * vol;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
  }

  private playMelody(freqs: number[], noteDur: number, vol: number) {
    for (let i = 0; i < freqs.length; i++) {
      this.playToneDelayed(freqs[i], noteDur, 'sine', vol, i * noteDur * 1.2);
    }
  }

  private startMusic() {
    if (!this.ctx || this.musicStarted) return;
    this.musicOsc = this.ctx.createOscillator();
    this.musicGain = this.ctx.createGain();
    this.musicOsc.type = 'sine';
    this.musicOsc.frequency.value = 55;
    this.musicGain.gain.value = 0.04;
    this.musicOsc.connect(this.musicGain);
    this.musicGain.connect(this.ctx.destination);
    this.musicOsc.start();
    this.musicStarted = true;
  }

  private stopMusic() {
    if (this.musicOsc) {
      try { this.musicOsc.stop(); } catch { /* already stopped */ }
      this.musicOsc = null;
    }
    this.musicGain = null;
    this.musicStarted = false;
  }
}
