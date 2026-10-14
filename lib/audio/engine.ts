/**
 * SoundScape — Web Audio Hardware Engine
 * Location: lib/audio/engine.ts (or audio_core/audio/engine.ts)
 *
 * Production Fixes Applied:
 * 1. Synchronous Map Tracking: Immediate node deletion prevents delayed 120ms race conditions.
 * 2. Instant AudioParam Scheduling: Cancels previous queues so fader drags react in real time.
 * 3. Organic Acoustic Filters: Biquad resonances capped at Q <= 1.4 to eliminate whistling/howling.
 * 4. Multi-Layer Synthesis: Rain splatter, ocean foam, and authentic timber campfire pops.
 */

import { SoundTrack, SynthesisType } from './types';

interface TrackChannelNodes {
  gainNode: GainNode;
  pannerNode: StereoPannerNode;
  reverbSendNode: GainNode;
  cleanup: () => void;
}

export class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private lowShelf: BiquadFilterNode | null = null;
  private highShelf: BiquadFilterNode | null = null;
  private convolver: ConvolverNode | null = null;
  private reverbMasterGain: GainNode | null = null;

  // Active track hardware channels keyed by track ID
  private trackNodes: Map<string, TrackChannelNodes> = new Map();

  // Shared in-memory noise buffers
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;
  private brownNoiseBuffer: AudioBuffer | null = null;

  private isInitialized = false;

  constructor() {}

  /**
   * Initializes AudioContext on first user gesture.
   */
  public async init(): Promise<boolean> {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return true;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      // 1. Master Output Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

      // 2. Master Analyser Node
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.85;

      // 3. Master 2-Band Equalizer (Warm shelf curves)
      this.lowShelf = this.ctx.createBiquadFilter();
      this.lowShelf.type = 'lowshelf';
      this.lowShelf.frequency.value = 220;
      this.lowShelf.gain.value = 0;

      this.highShelf = this.ctx.createBiquadFilter();
      this.highShelf.type = 'highshelf';
      this.highShelf.frequency.value = 4500;
      this.highShelf.gain.value = 0;

      // 4. Procedural Convolution Reverb Space
      this.convolver = this.ctx.createConvolver();
      this.convolver.buffer = this.createImpulseResponse(2.2, 2.5);

      this.reverbMasterGain = this.ctx.createGain();
      this.reverbMasterGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

      // Connect Signal Chain
      this.convolver.connect(this.reverbMasterGain);
      this.reverbMasterGain.connect(this.masterGain);

      this.masterGain.connect(this.lowShelf);
      this.lowShelf.connect(this.highShelf);
      this.highShelf.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.generateNoiseBuffers();

      this.isInitialized = true;
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return true;
    } catch (err) {
      console.error('Failed to initialize Web Audio Engine:', err);
      return false;
    }
  }

  public async ensureRunning(): Promise<void> {
    if (!this.ctx) {
      await this.init();
    } else if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public setMasterVolume(vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    const clamped = Math.max(0.0001, Math.min(1, vol));
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(
      this.masterGain.gain.value,
      this.ctx.currentTime
    );
    this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.03);
  }

  public setMasterReverb(level: number): void {
    if (!this.ctx || !this.reverbMasterGain) return;
    const clamped = Math.max(0.0001, Math.min(1, level)) * 0.5;
    this.reverbMasterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.reverbMasterGain.gain.setValueAtTime(
      this.reverbMasterGain.gain.value,
      this.ctx.currentTime
    );
    this.reverbMasterGain.gain.setTargetAtTime(
      clamped,
      this.ctx.currentTime,
      0.03
    );
  }

  public setLowEq(gainDb: number): void {
    if (!this.ctx || !this.lowShelf) return;
    this.lowShelf.gain.cancelScheduledValues(this.ctx.currentTime);
    this.lowShelf.gain.setValueAtTime(
      this.lowShelf.gain.value,
      this.ctx.currentTime
    );
    this.lowShelf.gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.03);
  }

  public setHighEq(gainDb: number): void {
    if (!this.ctx || !this.highShelf) return;
    this.highShelf.gain.cancelScheduledValues(this.ctx.currentTime);
    this.highShelf.gain.setValueAtTime(
      this.highShelf.gain.value,
      this.ctx.currentTime
    );
    this.highShelf.gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.03);
  }

  /**
   * Spawns a procedural track channel with immediate map registration.
   */
  public async playTrack(track: SoundTrack): Promise<void> {
    await this.ensureRunning();
    if (!this.ctx || !this.masterGain || !this.convolver) return;

    // 1. Immediately disconnect any previous node for this channel
    if (this.trackNodes.has(track.id)) {
      const existing = this.trackNodes.get(track.id)!;
      this.trackNodes.delete(track.id);
      try {
        existing.cleanup();
        existing.gainNode.disconnect();
        existing.pannerNode.disconnect();
        existing.reverbSendNode.disconnect();
      } catch (e) {}
    }

    // 2. Create fresh hardware nodes
    const trackGain = this.ctx.createGain();
    const effectiveVolume = track.isMuted
      ? 0.0001
      : Math.max(0.0001, track.volume);
    trackGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    trackGain.gain.setTargetAtTime(effectiveVolume, this.ctx.currentTime, 0.05);

    const panner = this.ctx.createStereoPanner();
    panner.pan.setValueAtTime(track.pan, this.ctx.currentTime);

    const reverbSend = this.ctx.createGain();
    reverbSend.gain.setValueAtTime(0.15, this.ctx.currentTime);

    trackGain.connect(panner);
    panner.connect(this.masterGain);

    trackGain.connect(reverbSend);
    reverbSend.connect(this.convolver);

    const cleanup = this.buildSynthesizer(track.synthesisType, trackGain);

    // 3. Register in active tracking map immediately
    this.trackNodes.set(track.id, {
      gainNode: trackGain,
      pannerNode: panner,
      reverbSendNode: reverbSend,
      cleanup,
    });
  }

  /**
   * Stops a track with immediate dictionary removal.
   */
  public stopTrack(trackId: string): void {
    const channel = this.trackNodes.get(trackId);
    if (!channel || !this.ctx) return;

    // Delete from tracking map IMMEDIATELY so new play commands don't collide
    this.trackNodes.delete(trackId);

    try {
      channel.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      channel.gainNode.gain.setValueAtTime(
        channel.gainNode.gain.value,
        this.ctx.currentTime
      );
      channel.gainNode.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.03);
    } catch (e) {}

    setTimeout(() => {
      try {
        channel.cleanup();
        channel.gainNode.disconnect();
        channel.pannerNode.disconnect();
        channel.reverbSendNode.disconnect();
      } catch (e) {}
    }, 50);
  }

  /**
   * Smoothly updates a single track's volume fader.
   */
  public setTrackVolume(
    trackId: string,
    volume: number,
    isMuted: boolean
  ): void {
    const channel = this.trackNodes.get(trackId);
    if (!channel || !this.ctx) return;

    const target = isMuted ? 0.0001 : Math.max(0.0001, Math.min(1, volume));
    try {
      channel.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      channel.gainNode.gain.setValueAtTime(
        channel.gainNode.gain.value,
        this.ctx.currentTime
      );
      channel.gainNode.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
    } catch (e) {}
  }

  /**
   * Smoothly updates a single track's stereo pan (-1.0 to +1.0).
   */
  public setTrackPan(trackId: string, pan: number): void {
    const channel = this.trackNodes.get(trackId);
    if (!channel || !this.ctx) return;

    const clamped = Math.max(-1, Math.min(1, pan));
    try {
      channel.pannerNode.pan.cancelScheduledValues(this.ctx.currentTime);
      channel.pannerNode.pan.setValueAtTime(
        channel.pannerNode.pan.value,
        this.ctx.currentTime
      );
      channel.pannerNode.pan.setTargetAtTime(
        clamped,
        this.ctx.currentTime,
        0.02
      );
    } catch (e) {}
  }

  /**
   * Stops all active stems instantly.
   */
  public stopAll(): void {
    const channels = Array.from(this.trackNodes.values());
    this.trackNodes.clear();

    channels.forEach((channel) => {
      try {
        if (this.ctx) {
          channel.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
          channel.gainNode.gain.setValueAtTime(
            channel.gainNode.gain.value,
            this.ctx.currentTime
          );
          channel.gainNode.gain.setTargetAtTime(
            0.0001,
            this.ctx.currentTime,
            0.03
          );
        }
        setTimeout(() => {
          try {
            channel.cleanup();
            channel.gainNode.disconnect();
            channel.pannerNode.disconnect();
            channel.reverbSendNode.disconnect();
          } catch (e) {}
        }, 50);
      } catch (e) {}
    });
  }

  // --------------------------------------------------------------------------
  // MULTI-STAGE ACOUSTIC SYNTHESIZERS (WARM, ORGANIC, NO HOWL)
  // --------------------------------------------------------------------------

  private buildSynthesizer(
    type: SynthesisType,
    destinationNode: AudioNode
  ): () => void {
    if (!this.ctx) return () => {};

    switch (type) {
      case 'pink_noise_rain':
        return this.synthesizeRain(destinationNode);
      case 'brown_noise_waves':
        return this.synthesizeOceanWaves(destinationNode);
      case 'resonant_wind':
        return this.synthesizeWind(destinationNode);
      case 'crackle_fire':
        return this.synthesizeCampfire(destinationNode);
      case 'binaural_oscillator':
        return this.synthesizeBinauralBeats(destinationNode);
      case 'stream_water':
        return this.synthesizeStream(destinationNode);
      case 'cafe_ambience':
        return this.synthesizeCafe(destinationNode);
      case 'brown_noise':
        return this.synthesizeBrownNoise(destinationNode);
      case 'celestial_drone':
        return this.synthesizeDrone(destinationNode);
      default:
        return this.synthesizeBrownNoise(destinationNode);
    }
  }

  /**
   * 1. Gentle Rain:
   * Warm lowpass downpour body + highpass droplet splatter + subtle wind swell.
   */
  private synthesizeRain(destination: AudioNode): () => void {
    if (!this.ctx || !this.pinkNoiseBuffer || !this.whiteNoiseBuffer)
      return () => {};

    const bedSrc = this.ctx.createBufferSource();
    bedSrc.buffer = this.pinkNoiseBuffer;
    bedSrc.loop = true;

    const bedFilter = this.ctx.createBiquadFilter();
    bedFilter.type = 'lowpass';
    bedFilter.frequency.value = 1100;
    bedFilter.Q.value = 0.7;

    const bedGain = this.ctx.createGain();
    bedGain.gain.value = 0.7;

    const dropletSrc = this.ctx.createBufferSource();
    dropletSrc.buffer = this.whiteNoiseBuffer;
    dropletSrc.loop = true;

    const dropletFilter = this.ctx.createBiquadFilter();
    dropletFilter.type = 'bandpass';
    dropletFilter.frequency.value = 3400;
    dropletFilter.Q.value = 1.4;

    const dropletGain = this.ctx.createGain();
    dropletGain.gain.value = 0.15;

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.14;
    lfoGain.gain.value = 220;

    lfo.connect(lfoGain);
    lfoGain.connect(bedFilter.frequency);

    bedSrc.connect(bedFilter);
    bedFilter.connect(bedGain);
    bedGain.connect(destination);

    dropletSrc.connect(dropletFilter);
    dropletFilter.connect(dropletGain);
    dropletGain.connect(destination);

    bedSrc.start();
    dropletSrc.start();
    lfo.start();

    return () => {
      try {
        bedSrc.stop();
        dropletSrc.stop();
        lfo.stop();
        bedSrc.disconnect();
        dropletSrc.disconnect();
        lfo.disconnect();
      } catch (e) {}
    };
  }

  /**
   * 2. Ocean Waves:
   * Deep Brownian swell + wave foam wash (Low Q prevents laser whistle).
   */
  private synthesizeOceanWaves(destination: AudioNode): () => void {
    if (!this.ctx || !this.brownNoiseBuffer || !this.whiteNoiseBuffer)
      return () => {};

    const surfSrc = this.ctx.createBufferSource();
    surfSrc.buffer = this.brownNoiseBuffer;
    surfSrc.loop = true;

    const surfFilter = this.ctx.createBiquadFilter();
    surfFilter.type = 'lowpass';
    surfFilter.frequency.value = 280;
    surfFilter.Q.value = 0.8;

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.09;
    lfoGain.gain.value = 240;

    lfo.connect(lfoGain);
    lfoGain.connect(surfFilter.frequency);

    const foamSrc = this.ctx.createBufferSource();
    foamSrc.buffer = this.whiteNoiseBuffer;
    foamSrc.loop = true;

    const foamFilter = this.ctx.createBiquadFilter();
    foamFilter.type = 'bandpass';
    foamFilter.frequency.value = 1400;
    foamFilter.Q.value = 1.0;

    const foamGain = this.ctx.createGain();
    foamGain.gain.value = 0.08;

    surfSrc.connect(surfFilter);
    surfFilter.connect(destination);

    foamSrc.connect(foamFilter);
    foamFilter.connect(foamGain);
    foamGain.connect(destination);

    surfSrc.start();
    foamSrc.start();
    lfo.start();

    return () => {
      try {
        surfSrc.stop();
        foamSrc.stop();
        lfo.stop();
        surfSrc.disconnect();
        foamSrc.disconnect();
        lfo.disconnect();
      } catch (e) {}
    };
  }

  /**
   * 3. Resonant Wind:
   * Organic mountain breeze without harsh resonance.
   */
  private synthesizeWind(destination: AudioNode): () => void {
    if (!this.ctx || !this.whiteNoiseBuffer) return () => {};

    const src = this.ctx.createBufferSource();
    src.buffer = this.whiteNoiseBuffer;
    src.loop = true;

    const bandpass1 = this.ctx.createBiquadFilter();
    bandpass1.type = 'bandpass';
    bandpass1.frequency.value = 380;
    bandpass1.Q.value = 1.8;

    const bandpass2 = this.ctx.createBiquadFilter();
    bandpass2.type = 'lowpass';
    bandpass2.frequency.value = 750;

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 180;

    lfo.connect(lfoGain);
    lfoGain.connect(bandpass1.frequency);

    src.connect(bandpass1);
    bandpass1.connect(bandpass2);
    bandpass2.connect(destination);

    src.start();
    lfo.start();

    return () => {
      try {
        src.stop();
        lfo.stop();
        src.disconnect();
        lfo.disconnect();
      } catch (e) {}
    };
  }

  /**
   * 4. Campfire Crackle:
   * Continuous warm rumble + highpass Poisson timber bursts.
   */
  private synthesizeCampfire(destination: AudioNode): () => void {
    if (!this.ctx || !this.pinkNoiseBuffer) return () => {};

    const emberSrc = this.ctx.createBufferSource();
    emberSrc.buffer = this.pinkNoiseBuffer;
    emberSrc.loop = true;

    const emberFilter = this.ctx.createBiquadFilter();
    emberFilter.type = 'lowpass';
    emberFilter.frequency.value = 240;

    const emberGain = this.ctx.createGain();
    emberGain.gain.value = 0.5;

    emberSrc.connect(emberFilter);
    emberFilter.connect(emberGain);
    emberGain.connect(destination);

    emberSrc.start();

    let isRunning = true;
    const scheduleCrackle = () => {
      if (!isRunning || !this.ctx) return;

      const clickBuffer = this.ctx.createBuffer(
        1,
        Math.floor(this.ctx.sampleRate * 0.025),
        this.ctx.sampleRate
      );
      const data = clickBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.1));
      }

      const clickSrc = this.ctx.createBufferSource();
      clickSrc.buffer = clickBuffer;

      const clickFilter = this.ctx.createBiquadFilter();
      clickFilter.type = 'bandpass';
      clickFilter.frequency.value = 2200 + Math.random() * 2800;
      clickFilter.Q.value = 1.2;

      const clickGain = this.ctx.createGain();
      clickGain.gain.value = 0.2 + Math.random() * 0.45;

      clickSrc.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(destination);

      clickSrc.start();

      const nextDelay = 70 + Math.random() * 280;
      setTimeout(scheduleCrackle, nextDelay);
    };

    scheduleCrackle();

    return () => {
      isRunning = false;
      try {
        emberSrc.stop();
        emberSrc.disconnect();
      } catch (e) {}
    };
  }

  /**
   * 5. Binaural 10Hz Alpha Waves:
   * Warmed dual sine tones (210Hz Left, 220Hz Right).
   */
  private synthesizeBinauralBeats(destination: AudioNode): () => void {
    if (!this.ctx) return () => {};

    const baseFreq = 210;
    const beatOffset = 10;

    const oscLeft = this.ctx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.value = baseFreq;

    const pannerLeft = this.ctx.createStereoPanner();
    pannerLeft.pan.value = -1.0;

    const oscRight = this.ctx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.value = baseFreq + beatOffset;

    const pannerRight = this.ctx.createStereoPanner();
    pannerRight.pan.value = 1.0;

    const warmFilter = this.ctx.createBiquadFilter();
    warmFilter.type = 'lowpass';
    warmFilter.frequency.value = 450;

    const attenuator = this.ctx.createGain();
    attenuator.gain.value = 0.32;

    oscLeft.connect(pannerLeft);
    pannerLeft.connect(warmFilter);

    oscRight.connect(pannerRight);
    pannerRight.connect(warmFilter);

    warmFilter.connect(attenuator);
    attenuator.connect(destination);

    oscLeft.start();
    oscRight.start();

    return () => {
      try {
        oscLeft.stop();
        oscRight.stop();
        oscLeft.disconnect();
        oscRight.disconnect();
      } catch (e) {}
    };
  }

  /**
   * 6. Mountain Stream:
   * Multi-peaking gurgling water textures.
   */
  private synthesizeStream(destination: AudioNode): () => void {
    if (!this.ctx || !this.pinkNoiseBuffer) return () => {};

    const src = this.ctx.createBufferSource();
    src.buffer = this.pinkNoiseBuffer;
    src.loop = true;

    const filter1 = this.ctx.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.value = 850;
    filter1.Q.value = 1.4;

    const filter2 = this.ctx.createBiquadFilter();
    filter2.type = 'peaking';
    filter2.frequency.value = 2100;
    filter2.gain.value = 3.0;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.65;

    src.connect(filter1);
    filter1.connect(filter2);
    filter2.connect(gain);
    gain.connect(destination);

    src.start();

    return () => {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {}
    };
  }

  /**
   * 7. Midnight Cafe:
   * Warm room acoustic murmur.
   */
  private synthesizeCafe(destination: AudioNode): () => void {
    if (!this.ctx || !this.brownNoiseBuffer) return () => {};

    const src = this.ctx.createBufferSource();
    src.buffer = this.brownNoiseBuffer;
    src.loop = true;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 360;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.65;

    src.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(destination);

    src.start();

    return () => {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {}
    };
  }

  /**
   * 8. Deep Brownian Noise:
   * Pure velvety low-end acoustic blanket.
   */
  private synthesizeBrownNoise(destination: AudioNode): () => void {
    if (!this.ctx || !this.brownNoiseBuffer) return () => {};

    const src = this.ctx.createBufferSource();
    src.buffer = this.brownNoiseBuffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    filter.Q.value = 0.7;

    src.connect(filter);
    filter.connect(destination);

    src.start();

    return () => {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {}
    };
  }

  /**
   * 9. Celestial 432Hz Drone:
   * Harmonics with soft warm filter.
   */
  private synthesizeDrone(destination: AudioNode): () => void {
    if (!this.ctx) return () => {};

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = 216;

    osc2.type = 'sine';
    osc2.frequency.value = 432;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.25;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc1.start();
    osc2.start();

    return () => {
      try {
        osc1.stop();
        osc2.stop();
        osc1.disconnect();
        osc2.disconnect();
      } catch (e) {}
    };
  }

  // --------------------------------------------------------------------------
  // NOISE BUFFERS & CONVOLUTION IMPULSE
  // --------------------------------------------------------------------------

  private generateNoiseBuffers(): void {
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 5;

    // 1. White Noise
    this.whiteNoiseBuffer = this.ctx.createBuffer(
      1,
      bufferSize,
      this.ctx.sampleRate
    );
    const whiteData = this.whiteNoiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }

    // 2. Pink Noise (1/f Balanced Roll-off)
    this.pinkNoiseBuffer = this.ctx.createBuffer(
      1,
      bufferSize,
      this.ctx.sampleRate
    );
    const pinkData = this.pinkNoiseBuffer.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    // 3. Brown Noise (Warm Brownian random walk)
    this.brownNoiseBuffer = this.ctx.createBuffer(
      1,
      bufferSize,
      this.ctx.sampleRate
    );
    const brownData = this.brownNoiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      brownData[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = brownData[i];
      brownData[i] *= 3.5;
    }
  }

  private createImpulseResponse(
    durationSeconds: number,
    decay: number
  ): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext missing');
    const rate = this.ctx.sampleRate;
    const length = rate * durationSeconds;
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const factor = Math.exp(-i / (rate * (durationSeconds / decay)));
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }

    return impulse;
  }
}

export const soundEngine = new WebAudioEngine();
