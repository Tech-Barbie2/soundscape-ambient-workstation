/**
 * SoundScape — Core Audio & Preset Type Definitions
 * Location: lib/audio/types.ts
 */

export type SoundCategory =
  | 'weather'
  | 'nature'
  | 'urban'
  | 'noise'
  | 'binaural';

export type SynthesisType =
  | 'pink_noise_rain'
  | 'brown_noise_waves'
  | 'resonant_wind'
  | 'crackle_fire'
  | 'binaural_oscillator'
  | 'stream_water'
  | 'cafe_ambience'
  | 'brown_noise'
  | 'celestial_drone';

export interface SoundTrack {
  id: string;
  name: string;
  category: SoundCategory;
  description: string;
  iconName: string;
  synthesisType: SynthesisType;
  defaultVolume: number; // Normalized 0.0 to 1.0
  volume: number; // Normalized 0.0 to 1.0
  pan: number; // Stereo Panning: -1.0 (Hard Left) to +1.0 (Hard Right)
  isPlaying: boolean;
  isMuted: boolean;
  frequencyBand?: string;
}

export interface TrackConfiguration {
  trackId: string;
  volume: number;
  pan: number;
  isPlaying: boolean;
}

export interface SoundPreset {
  id: string;
  title: string;
  description: string;
  mood: string;
  category: string;
  masterVolume: number;
  trackStates: TrackConfiguration[];
  isCurated: boolean;
  createdAt: string;
}

export type VisualizerMode = 'spectrum' | 'waveform' | 'radial';

export interface MasterAudioState {
  isPlaying: boolean;
  masterVolume: number; // 0.0 to 1.0
  isMuted: boolean;
  reverbLevel: number; // 0.0 to 1.0
  lowEq: number; // dB gain (-12 to +12)
  highEq: number; // dB gain (-12 to +12)
}
