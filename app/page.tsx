/**
 * SoundScape — Next.js Application Home
 * Location: app/page.tsx
 */

'use client';

import React, { useRef, useState } from 'react';
import { Sliders } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { AudioVisualizer } from '../components/visualizer/AudioVisualizer';
import { ChannelCard } from '../components/mixer/ChannelCard';
import { MasterBar } from '../components/mixer/MasterBar';
import { PresetSelector } from '../components/presets/PresetSelector';
import { FocusTimerModal } from '../components/focus/FocusTimerModal';
import { SavePresetModal } from '../components/presets/SavePresetModal';
import { useSoundEngine } from '../lib/audio/useSoundEngine'; // (or ../audio_core/audio/useSoundEngine)

export default function HomePage() {
  const {
    tracks,
    master,
    curatedPresets,
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
  } = useSoundEngine();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const stationsRef = useRef<HTMLDivElement | null>(null);
  const mixerRef = useRef<HTMLDivElement | null>(null);

  const filteredTracks =
    categoryFilter === 'all'
      ? tracks
      : tracks.filter((t) => t.category === categoryFilter);

  const scrollToStations = () => {
    stationsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToMixer = () => {
    mixerRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-sky-500 selection:text-slate-950">
      {/* 1. Header */}
      <Header
        isPlaying={master.isPlaying && activeTracksCount > 0}
        onTogglePlay={toggleMasterPlay}
        onScrollToStations={scrollToStations}
        onScrollToMixer={scrollToMixer}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-10">
        {/* 2. Hero & Visualizer */}
        <section className="space-y-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
              <span>Web Audio Hardware Pipeline</span>
              <span aria-hidden="true">·</span>
              <span>Procedural Signal Synthesis</span>
              <span aria-hidden="true">·</span>
              <span className="text-sky-400">Next.js App Router</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
              Acoustic Workstation for Deep Cognitive Focus
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl">
              Balance procedural weather, natural acoustic textures, and 10Hz
              binaural oscillations. Engineered with browser-native Web Audio
              nodes and real-time 60fps spectral visualization.
            </p>
          </div>

          <AudioVisualizer
            isPlaying={master.isPlaying}
            activeTrackCount={activeTracksCount}
          />
        </section>

        {/* 3. Stations & Presets */}
        <section ref={stationsRef} className="pt-2">
          <PresetSelector
            curatedPresets={curatedPresets}
            userPresets={userPresets}
            activePresetId={activePresetId}
            onSelectPreset={loadPreset}
            onDeleteUserPreset={deleteUserPreset}
          />
        </section>

        {/* 4. Multi-Stem Mixer Console */}
        <section ref={mixerRef} className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>Multi-Stem Mixing Console</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Adjust individual stem amplitude, spatial stereo pan, and solo
                isolation
              </p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto text-xs shrink-0">
              {[
                { id: 'all', label: 'All Stems' },
                { id: 'weather', label: 'Weather' },
                { id: 'nature', label: 'Nature' },
                { id: 'binaural', label: 'Binaural' },
                { id: 'urban', label: 'Urban' },
                { id: 'noise', label: 'Noise' },
              ].map((category) => (
                <button
                  key={category.id}
                  onClick={() => setCategoryFilter(category.id)}
                  className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap ${
                    categoryFilter === category.id
                      ? 'bg-slate-800 text-sky-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTracks.map((track) => (
              <ChannelCard
                key={track.id}
                track={track}
                onToggle={toggleTrack}
                onVolumeChange={setTrackVolume}
                onPanChange={setTrackPan}
                onToggleMute={toggleTrackMute}
                onSolo={soloTrack}
              />
            ))}
          </div>
        </section>
      </main>

      {/* 5. Sticky Master Bar */}
      <MasterBar
        master={master}
        activeTrackCount={activeTracksCount}
        onTogglePlay={toggleMasterPlay}
        onVolumeChange={setMasterVolume}
        onToggleMute={toggleMasterMute}
        onReverbChange={setMasterReverb}
        onLowEqChange={setLowEq}
        onHighEqChange={setHighEq}
        onOpenTimer={() => setIsTimerOpen(true)}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
      />

      {/* Modals */}
      <FocusTimerModal
        isOpen={isTimerOpen}
        onClose={() => setIsTimerOpen(false)}
        onTimerComplete={toggleMasterPlay}
      />

      <SavePresetModal
        isOpen={isSaveModalOpen}
        activeTracks={tracks}
        masterVolume={master.masterVolume}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={saveUserPreset}
      />
    </div>
  );
}
