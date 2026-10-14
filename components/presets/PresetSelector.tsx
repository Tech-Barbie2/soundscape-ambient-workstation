/**
 * SoundScape — Presets & Stations Selector
 * Location: components/presets/PresetSelector.tsx
 */

'use client';

import React, { useState } from 'react';
import { Bookmark, Compass, Trash2 } from 'lucide-react';
import { SoundPreset } from '../../lib/audio/types';

interface PresetSelectorProps {
  curatedPresets: SoundPreset[];
  userPresets: SoundPreset[];
  activePresetId: string | null;
  onSelectPreset: (preset: SoundPreset) => void;
  onDeleteUserPreset: (id: string) => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  curatedPresets,
  userPresets,
  activePresetId,
  onSelectPreset,
  onDeleteUserPreset,
}) => {
  const [tab, setTab] = useState<'curated' | 'user'>('curated');
  const currentList = tab === 'curated' ? curatedPresets : userPresets;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-400" />
            <span>Acoustic Environments</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Curated multi-channel soundscapes designed for focus, relaxation,
            and cognitive flow
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg shrink-0">
          <button
            onClick={() => setTab('curated')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'curated'
                ? 'bg-slate-800 text-sky-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Curated Stations ({curatedPresets.length})
          </button>
          <button
            onClick={() => setTab('user')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'user'
                ? 'bg-slate-800 text-sky-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            My Presets ({userPresets.length})
          </button>
        </div>
      </div>

      {currentList.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center bg-slate-900/30">
          <Bookmark className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-slate-300">
            No saved presets yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Balance custom levels on the mixer below to preserve your acoustic
            mood.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {currentList.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className={`group relative p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                  isActive
                    ? 'bg-slate-900/90 border-sky-500/60 shadow-lg shadow-sky-950/40 ring-1 ring-sky-500/40'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isActive
                          ? 'bg-sky-400'
                          : 'bg-slate-600 group-hover:bg-slate-400'
                      }`}
                    />
                    <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                      {preset.title}
                    </h3>
                  </div>

                  {tab === 'user' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteUserPreset(preset.id);
                      }}
                      className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                      title="Delete Preset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                  {preset.description}
                </p>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span>{preset.mood}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {preset.trackStates.filter((t) => t.isPlaying).length}{' '}
                      stems
                    </span>
                  </div>

                  <span className="font-mono tabular-nums text-slate-400 text-xs">
                    {Math.round(preset.masterVolume * 100)}% vol
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
