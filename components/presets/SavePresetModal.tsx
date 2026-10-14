/**
 * SoundScape — Save Custom Preset Modal
 * Location: components/presets/SavePresetModal.tsx
 */

'use client';

import React, { useState } from 'react';
import { Bookmark, Check, Copy, X } from 'lucide-react';
import { SoundTrack } from '../../lib/audio/types';

interface SavePresetModalProps {
  isOpen: boolean;
  activeTracks: SoundTrack[];
  masterVolume: number;
  onClose: () => void;
  onSave: (title: string, mood: string, category: string) => void;
}

export const SavePresetModal: React.FC<SavePresetModalProps> = ({
  isOpen,
  activeTracks,
  masterVolume,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState('Focus');
  const [category, setCategory] = useState('Productivity');
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const activePlayingTracks = activeTracks.filter(
    (t) => t.isPlaying && !t.isMuted
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title, mood, category);
    onClose();
  };

  const generateSqlPayload = () => {
    const trackPayload = JSON.stringify(
      activePlayingTracks.map((t) => ({
        trackId: t.id,
        volume: t.volume,
        pan: t.pan,
      }))
    );

    return `-- Supabase SQL Seed for Preset "${title || 'My Soundscape'}"
 INSERT INTO presets (title, mood, category, master_volume, track_states, is_curated)
 VALUES (
   '${title || 'Custom Preset'}',
   '${mood}',
   '${category}',
   ${masterVolume.toFixed(2)},
   '${trackPayload}'::jsonb,
   false
 );`;
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(generateSqlPayload());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-semibold text-slate-100">
              Save Custom Soundscape
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Preset Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midnight Pine Ridge & Rain"
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mood
              </label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="Focus">Deep Focus</option>
                <option value="Atmospheric">Atmospheric</option>
                <option value="Zen">Zen & Calm</option>
                <option value="Warmth">Cozy Warmth</option>
                <option value="Rest">Deep Rest</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="Productivity">Productivity</option>
                <option value="Meditation">Meditation</option>
                <option value="Creative">Creative Writing</option>
                <option value="Sleep">Sleep Aid</option>
              </select>
            </div>
          </div>

          {/* Active Stem Snapshot */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-xs font-medium text-slate-400 block mb-2">
              Snapshot ({activePlayingTracks.length} active stems)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activePlayingTracks.length === 0 ? (
                <span className="text-xs text-amber-400">
                  No active channels selected. Activate channels first to save
                  settings.
                </span>
              ) : (
                activePlayingTracks.map((t) => (
                  <span
                    key={t.id}
                    className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-300"
                  >
                    {t.name} ({Math.round(t.volume * 100)}%)
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleCopySql}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              {copiedSql ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedSql ? 'SQL Copied!' : 'Copy Supabase SQL'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="px-5 py-2 text-xs font-semibold bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 rounded-lg transition-colors"
              >
                Save Preset
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
