/**
 * SoundScape — Top Navigation Header
 * Location: components/layout/Header.tsx
 *
 * Complies strictly with the 3-Zone Top Bar Contract:
 * [Zone 1: Wordmark] — [Zone 2: Single-line Links] — [Zone 3: Primary Action]
 */

'use client';

import React from 'react';

interface HeaderProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onScrollToStations: () => void;
  onScrollToMixer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isPlaying,
  onTogglePlay,
  onScrollToStations,
  onScrollToMixer,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-8 py-3.5">
        {/* Zone 1: Single element brand wordmark */}
        <a
          href="/"
          className="text-base sm:text-lg font-bold tracking-tight text-white hover:text-sky-400 transition-colors whitespace-nowrap shrink-0"
        >
          SoundScape
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            onClick={onScrollToStations}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Stations
          </button>
          <button
            onClick={onScrollToMixer}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Mixer Console
          </button>
        </nav>

        {/* Zone 3: Exactly 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onTogglePlay}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 ${
              isPlaying
                ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-md shadow-sky-500/20'
                : 'bg-white hover:bg-slate-200 text-slate-950'
            }`}
          >
            {isPlaying ? 'Pause Session' : 'Start Session'}
          </button>
        </div>
      </div>
    </header>
  );
};
