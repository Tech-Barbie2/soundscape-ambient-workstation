/**
 * SoundScape — Channel Strip Card Component
 * Location: components/mixer/ChannelCard.tsx
 */

'use client';

import React from 'react';
import {
  Activity,
  CloudRain,
  Coffee,
  Droplets,
  Flame,
  Sparkles,
  Volume2,
  VolumeX,
  Waves,
  Wind,
} from 'lucide-react';
import { SoundTrack } from '../../lib/audio/types';

interface ChannelCardProps {
  track: SoundTrack;
  onToggle: (id: string) => void;
  onVolumeChange: (id: string, vol: number) => void;
  onPanChange: (id: string, pan: number) => void;
  onToggleMute: (id: string) => void;
  onSolo: (id: string) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  CloudRain,
  Waves,
  Wind,
  Flame,
  Activity,
  Droplets,
  Coffee,
  Volume2,
  Sparkles,
};

export const ChannelCard: React.FC<ChannelCardProps> = ({
  track,
  onToggle,
  onVolumeChange,
  onPanChange,
  onToggleMute,
  onSolo,
}) => {
  const IconComponent = ICON_MAP[track.iconName] || Volume2;

  const formatPan = (panVal: number) => {
    if (Math.abs(panVal) < 0.05) return 'Center';
    if (panVal < 0) return `L ${Math.round(Math.abs(panVal) * 100)}%`;
    return `R ${Math.round(panVal * 100)}%`;
  };

  return (
    <div
      className={`group relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 ${
        track.isPlaying
          ? 'bg-slate-900/80 border-sky-500/40 shadow-lg shadow-sky-950/40'
          : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700/80'
      }`}
    >
      {/* Top Header & Stem Power Toggle */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onToggle(track.id)}
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${
                track.isPlaying
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={track.isPlaying ? 'Deactivate Stem' : 'Activate Stem'}
            >
              <IconComponent className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 group-hover:text-sky-300 transition-colors">
                {track.name}
              </h3>
              {/* Unboxed Metadata (Zero-Pill Rule) */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <span className="capitalize">{track.category}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {track.frequencyBand || 'Procedural'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onToggle(track.id)}
            className={`text-xs px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap ${
              track.isPlaying
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            {track.isPlaying ? 'Active' : 'Muted'}
          </button>
        </div>

        <p className="text-xs text-slate-400 line-clamp-1 mb-4">
          {track.description}
        </p>
      </div>

      {/* Middle Controls: Faders */}
      <div className="space-y-3 pt-2 border-t border-slate-800/60">
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400">Level</span>
            <span className="text-slate-300 font-mono tabular-nums">
              {track.isMuted ? 'Muted' : `${Math.round(track.volume * 100)}%`}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={track.volume}
            onChange={(e) =>
              onVolumeChange(track.id, parseFloat(e.target.value))
            }
            className="w-full accent-sky-400 cursor-pointer"
            disabled={!track.isPlaying}
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-500">Stereo Pan</span>
            <span className="text-slate-400 font-mono tabular-nums text-xs">
              {formatPan(track.pan)}
            </span>
          </div>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.05"
            value={track.pan}
            onChange={(e) => onPanChange(track.id, parseFloat(e.target.value))}
            className="w-full accent-slate-400 cursor-pointer"
            disabled={!track.isPlaying}
          />
        </div>
      </div>

      {/* Bottom Action Strip: Solo & Mute */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-800/40">
        <button
          onClick={() => onSolo(track.id)}
          className="px-2.5 py-1 text-xs font-mono font-medium rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800/60 transition-colors whitespace-nowrap"
          title="Solo channel (mutes other tracks)"
        >
          SOLO
        </button>

        <button
          onClick={() => onToggleMute(track.id)}
          className={`p-1.5 rounded transition-colors ${
            track.isMuted
              ? 'text-red-400 bg-red-950/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title={track.isMuted ? 'Unmute Track' : 'Mute Track'}
        >
          {track.isMuted ? (
            <VolumeX className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};
