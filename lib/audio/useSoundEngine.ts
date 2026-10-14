/**
 * SoundScape — React Web Audio Bridge Hook
 * Location: lib/audio/useSoundEngine.ts (or audio_core/audio/useSoundEngine.ts)
 *
 * Clean Decoupling Architecture:
 * - Side effects (hardware play/stop/volume commands) are dispatched imperatively outside state updaters.
 * - Eradicates React 18/19 StrictMode double-invocation bugs.
 * - Guarantees immediate response for channel faders, pan sliders, and master pause.
 */
import { createClient } from '../supabase/client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CURATED_PRESETS, INITIAL_TRACKS } from './defaultTracks';
import { soundEngine } from './engine';
import { MasterAudioState, SoundPreset, SoundTrack } from './types';

const STORAGE_KEY_USER_PRESETS = 'soundscape_user_presets_v1';

export function useSoundEngine() {
  const [tracks, setTracks] = useState<SoundTrack[]>(INITIAL_TRACKS);
  const [master, setMaster] = useState<MasterAudioState>({
    isPlaying: false,
    masterVolume: 0.8,
    isMuted: false,
    reverbLevel: 0.2,
    lowEq: 0,
    highEq: 0,
  });

  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [userPresets, setUserPresets] = useState<SoundPreset[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER_PRESETS);
      if (saved) return JSON.parse(saved);
    } catch {
      // Safe fallback
    }
    return [];
  });

  // Ref prevents stale closures across async intervals and state transitions
  const tracksRef = useRef<SoundTrack[]>(tracks);
  tracksRef.current = tracks;

  // Persist user presets to browser storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        STORAGE_KEY_USER_PRESETS,
        JSON.stringify(userPresets)
      );
    } catch (e) {
      console.warn('LocalStorage unavailable for preset sync', e);
    }
  }, [userPresets]);

  // Master Volume sync
  useEffect(() => {
    const effectiveMasterVol = master.isMuted ? 0.0001 : master.masterVolume;
    soundEngine.setMasterVolume(effectiveMasterVol);
  }, [master.masterVolume, master.isMuted]);

  // Master Reverb sync
  useEffect(() => {
    soundEngine.setMasterReverb(master.reverbLevel);
  }, [master.reverbLevel]);

  // Master EQ sync
  useEffect(() => {
    soundEngine.setLowEq(master.lowEq);
    soundEngine.setHighEq(master.highEq);
  }, [master.lowEq, master.highEq]);

  /**
   * Toggles playback on a specific channel stem.
   * Dispatches hardware commands directly outside React state setters.
   */
  const toggleTrack = useCallback(async (trackId: string) => {
    await soundEngine.init();

    const targetTrack = tracksRef.current.find((t) => t.id === trackId);
    if (!targetTrack) return;

    const willPlay = !targetTrack.isPlaying;

    // 1. Direct hardware command
    if (willPlay) {
      soundEngine.playTrack({ ...targetTrack, isPlaying: true });
    } else {
      soundEngine.stopTrack(targetTrack.id);
    }

    // 2. Synchronize declarative UI state
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isPlaying: willPlay } : t))
    );

    setMaster((prev) => ({ ...prev, isPlaying: true }));
    setActivePresetId(null);
  }, []);

  /**
   * Adjusts volume for a specific track fader.
   */
  const setTrackVolume = useCallback((trackId: string, vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));

    // 1. Immediate hardware gain adjustment
    const currentTrack = tracksRef.current.find((t) => t.id === trackId);
    if (currentTrack) {
      soundEngine.setTrackVolume(trackId, clamped, currentTrack.isMuted);
    }

    // 2. State update for UI readout
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, volume: clamped } : t))
    );
  }, []);

  /**
   * Adjusts stereo pan for a specific track (-1.0 to +1.0).
   */
  const setTrackPan = useCallback((trackId: string, pan: number) => {
    const clamped = Math.max(-1, Math.min(1, pan));

    // 1. Immediate hardware pan adjustment
    soundEngine.setTrackPan(trackId, clamped);

    // 2. State update for UI readout
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, pan: clamped } : t))
    );
  }, []);

  /**
   * Mutes or unmutes a specific track.
   */
  const toggleTrackMute = useCallback((trackId: string) => {
    const currentTrack = tracksRef.current.find((t) => t.id === trackId);
    if (!currentTrack) return;

    const nextMuted = !currentTrack.isMuted;
    soundEngine.setTrackVolume(trackId, currentTrack.volume, nextMuted);

    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isMuted: nextMuted } : t))
    );
  }, []);

  /**
   * Solos a track (mutes all others, un-mutes target).
   */
  const soloTrack = useCallback((trackId: string) => {
    const prevTracks = tracksRef.current;
    const target = prevTracks.find((t) => t.id === trackId);
    if (!target) return;

    const otherActiveUnmuted = prevTracks.some(
      (t) => t.id !== trackId && t.isPlaying && !t.isMuted
    );

    if (!otherActiveUnmuted) {
      // Restore all playing tracks
      prevTracks.forEach((t) => {
        if (t.isPlaying) {
          soundEngine.setTrackVolume(t.id, t.volume, false);
        }
      });
      setTracks((prev) => prev.map((t) => ({ ...t, isMuted: false })));
      return;
    }

    // Mute all others, unmute target
    prevTracks.forEach((t) => {
      if (t.id === trackId) {
        soundEngine.setTrackVolume(t.id, t.volume, false);
        if (!t.isPlaying) {
          soundEngine.playTrack({ ...t, isPlaying: true, isMuted: false });
        }
      } else {
        soundEngine.setTrackVolume(t.id, t.volume, true);
      }
    });

    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          return { ...t, isPlaying: true, isMuted: false };
        }
        return { ...t, isMuted: true };
      })
    );
  }, []);

  /**
   * Loads a preset station configuration.
   */
  const loadPreset = useCallback(async (preset: SoundPreset) => {
    await soundEngine.init();

    // 1. Immediately stop all running channels
    soundEngine.stopAll();

    // 2. Prepare new track configurations
    const updatedTracks = tracksRef.current.map((track) => {
      const config = preset.trackStates.find((s) => s.trackId === track.id);
      if (config && config.isPlaying) {
        const activeTrack: SoundTrack = {
          ...track,
          volume: config.volume,
          pan: config.pan,
          isPlaying: true,
          isMuted: false,
        };
        soundEngine.playTrack(activeTrack);
        return activeTrack;
      }
      return {
        ...track,
        isPlaying: false,
        isMuted: false,
      };
    });

    // 3. Update React UI state
    setTracks(updatedTracks);
    setMaster((prev) => ({
      ...prev,
      isPlaying: true,
      masterVolume: preset.masterVolume,
      isMuted: false,
    }));
    setActivePresetId(preset.id);
  }, []);

  /**
   * Master Play/Pause toggle.
   * Completely silences audio when paused.
   */
  const toggleMasterPlay = useCallback(async () => {
    await soundEngine.init();

    if (master.isPlaying) {
      // 1. Immediate hardware kill
      soundEngine.stopAll();

      // 2. Update UI state
      setTracks((prev) => prev.map((t) => ({ ...t, isPlaying: false })));
      setMaster((prev) => ({ ...prev, isPlaying: false }));
    } else {
      const activeChannels = tracksRef.current.filter((t) => t.isPlaying);
      if (activeChannels.length === 0) {
        loadPreset(CURATED_PRESETS[0]);
      } else {
        activeChannels.forEach((t) => soundEngine.playTrack(t));
        setMaster((prev) => ({ ...prev, isPlaying: true }));
      }
    }
  }, [master.isPlaying, loadPreset]);

  const setMasterVolume = useCallback((vol: number) => {
    setMaster((prev) => ({ ...prev, masterVolume: vol }));
  }, []);

  const setMasterReverb = useCallback((level: number) => {
    setMaster((prev) => ({ ...prev, reverbLevel: level }));
  }, []);

  const setLowEq = useCallback((db: number) => {
    setMaster((prev) => ({ ...prev, lowEq: db }));
  }, []);

  const setHighEq = useCallback((db: number) => {
    setMaster((prev) => ({ ...prev, highEq: db }));
  }, []);

  const toggleMasterMute = useCallback(() => {
    setMaster((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const saveUserPreset = useCallback(
    async (title: string, mood: string, category: string) => {
      const currentActive = tracksRef.current
        .filter((t) => t.isPlaying)
        .map((t) => ({
          trackId: t.id,
          volume: t.volume,
          pan: t.pan,
          isPlaying: true,
        }));

      const newPreset: SoundPreset = {
        id: `user-preset-${Date.now()}`,
        title: title.trim() || 'My Custom Soundscape',
        description: `${currentActive.length} active channels with spatial balancing`,
        mood: mood.trim() || 'Custom',
        category: category.trim() || 'Personal',
        masterVolume: master.masterVolume,
        trackStates: currentActive,
        isCurated: false,
        createdAt: new Date().toISOString().split('T')[0],
      };

      // 1. Optimistic UI update for instant feedback
      setUserPresets((prev) => [newPreset, ...prev]);
      setActivePresetId(newPreset.id);

      // 2. Cloud persistence to PostgreSQL
      try {
        const supabase = createClient();
        await supabase.from('presets').insert([
          {
            title: newPreset.title,
            description: newPreset.description,
            mood: newPreset.mood,
            category: newPreset.category,
            master_volume: newPreset.masterVolume,
            track_states: newPreset.trackStates,
            is_curated: false,
          },
        ]);
      } catch (err) {
        console.info(
          'Supabase cloud sync deferred (running in local mode)',
          err
        );
      }

      return newPreset;
    },
    [master.masterVolume]
  );

  const deleteUserPreset = useCallback(
    (id: string) => {
      setUserPresets((prev) => prev.filter((p) => p.id !== id));
      if (activePresetId === id) {
        setActivePresetId(null);
      }
    },
    [activePresetId]
  );

  const activeTracksCount = tracks.filter(
    (t) => t.isPlaying && !t.isMuted
  ).length;

  return {
    tracks,
    master,
    curatedPresets: CURATED_PRESETS,
    userPresets,
    activePresetId,
    activeTracksCount,
    toggleTrack,
    setTrackVolume,
    setTrackPan,
    toggleTrackMute,
    soloTrack,
    toggleMasterPlay,
    setMasterVolume,
    setMasterReverb,
    setLowEq,
    setHighEq,
    toggleMasterMute,
    loadPreset,
    saveUserPreset,
    deleteUserPreset,
    getAnalyser: () => soundEngine.getAnalyser(),
  };
}
