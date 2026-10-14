/**
 * SoundScape — Sticky Master Bus Console (Full Feature Strip)
 * Location: components/mixer/MasterBar.tsx
 */

'use client';

import React, { useState } from 'react';
import {
  Clock,
  Pause,
  Play,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { MasterAudioState } from '../../lib/audio/types';

interface MasterBarProps {
  master: MasterAudioState;
  activeTrackCount: number;
  onTogglePlay: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onReverbChange: (reverb: number) => void;
  onLowEqChange: (gainDb: number) => void;
  onHighEqChange: (gainDb: number) => void;
  onOpenTimer: () => void;
  onOpenSaveModal: () => void;
}

export const MasterBar: React.FC<MasterBarProps> = ({
  master,
  activeTrackCount,
  onTogglePlay,
  onVolumeChange,
  onToggleMute,
  onReverbChange,
  onLowEqChange,
  onHighEqChange,
  onOpenTimer,
  onOpenSaveModal,
}) => {
  const [showEqPanel, setShowEqPanel] = useState(false);

  return (
    <div className="sticky bottom-0 z-40 w-full bg-slate-950/90 border-t border-slate-800/80 backdrop-blur-xl px-4 py-3 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Master Play/Pause & Status */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <button
            onClick={onTogglePlay}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md ${
              master.isPlaying && activeTrackCount > 0
                ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/20'
                : 'bg-white hover:bg-slate-200 text-slate-950 shadow-white/10'
            }`}
          >
            {master.isPlaying && activeTrackCount > 0 ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span className="whitespace-nowrap">Pause Audio</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span className="whitespace-nowrap">Start Session</span>
              </>
            )}
          </button>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-200">
              Master Output
            </span>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {activeTrackCount} stem{activeTrackCount !== 1 ? 's' : ''} mixing
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden md:block" />

          {/* Master Volume Fader */}
          <div className="hidden sm:flex items-center gap-2.5 w-44">
            <button
              onClick={onToggleMute}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1"
              title={master.isMuted ? 'Unmute Master' : 'Mute Master'}
            >
              {master.isMuted ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={master.masterVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-400 tabular-nums w-8 text-right">
              {master.isMuted
                ? '0%'
                : `${Math.round(master.masterVolume * 100)}%`}
            </span>
          </div>
        </div>

        {/* Center: Controls Strip */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-center">
          <button
            onClick={() => setShowEqPanel(!showEqPanel)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
              showEqPanel
                ? 'bg-slate-800 text-sky-400 border-sky-500/40'
                : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Studio EQ & Reverb</span>
          </button>

          <button
            onClick={onOpenTimer}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900/60 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Focus Timer</span>
          </button>

          <button
            onClick={onOpenSaveModal}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900/60 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap"
          >
            Save Preset
          </button>
        </div>
      </div>

      {/* Expandable Studio EQ Tray */}
      {showEqPanel && (
        <div className="max-w-4xl mx-auto mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div>
            <div className="flex items-center justify-between text-slate-300 mb-1.5">
              <span>Ambient Hall Reverb</span>
              <span className="font-mono tabular-nums text-slate-400">
                {Math.round(master.reverbLevel * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={master.reverbLevel}
              onChange={(e) => onReverbChange(parseFloat(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-slate-300 mb-1.5">
              <span>Low Shelf (220 Hz)</span>
              <span className="font-mono tabular-nums text-slate-400">
                {master.lowEq > 0 ? `+${master.lowEq}` : master.lowEq} dB
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={master.lowEq}
              onChange={(e) => onLowEqChange(parseFloat(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-slate-300 mb-1.5">
              <span>High Shelf (4.5 kHz)</span>
              <span className="font-mono tabular-nums text-slate-400">
                {master.highEq > 0 ? `+${master.highEq}` : master.highEq} dB
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={master.highEq}
              onChange={(e) => onHighEqChange(parseFloat(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
