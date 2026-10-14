/**
 * SoundScape — Focus Companion Pomodoro Timer
 * Location: components/focus/FocusTimerModal.tsx
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Clock, Play, RotateCcw, X } from 'lucide-react';

interface FocusTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTimerComplete: () => void;
}

export const FocusTimerModal: React.FC<FocusTimerModalProps> = ({
  isOpen,
  onClose,
  onTimerComplete,
}) => {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [autoFadeOut, setAutoFadeOut] = useState<boolean>(true);

  // Interval ticker with proper unmount cleanup
  useEffect(() => {
    let interval: number | null = null;
    if (isRunning && secondsRemaining > 0) {
      interval = window.setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (autoFadeOut) {
              onTimerComplete();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, secondsRemaining, autoFadeOut, onTimerComplete]);

  if (!isOpen) return null;

  const handleSelectDuration = (mins: number) => {
    setSelectedMinutes(mins);
    setSecondsRemaining(mins * 60);
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsRemaining(selectedMinutes * 60);
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(
    seconds
  ).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-semibold text-slate-100">
              Focus Companion
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { label: 'Pomodoro', mins: 25 },
            { label: 'Deep Focus', mins: 45 },
            { label: 'Recharge', mins: 15 },
          ].map((preset) => (
            <button
              key={preset.mins}
              onClick={() => handleSelectDuration(preset.mins)}
              className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                selectedMinutes === preset.mins && !isRunning
                  ? 'bg-sky-500/15 text-sky-400 border-sky-500/40'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <div>{preset.label}</div>
              <div className="font-mono tabular-nums text-slate-500 mt-0.5">
                {preset.mins}m
              </div>
            </button>
          ))}
        </div>

        {/* Big Tabular Countdown Display */}
        <div className="p-6 rounded-xl bg-slate-950 border border-slate-800/80 text-center mb-6">
          <div className="text-5xl font-mono font-bold tracking-tight text-white tabular-nums mb-1">
            {formattedTime}
          </div>
          <span className="text-xs text-slate-500">
            {isRunning ? 'Session Active · Soundscape Playing' : 'Timer Ready'}
          </span>
        </div>

        {/* Auto fade out toggle */}
        <label className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 cursor-pointer mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Bell className="w-4 h-4 text-slate-400" />
            <span>Smooth audio fade-out when session ends</span>
          </div>
          <input
            type="checkbox"
            checked={autoFadeOut}
            onChange={(e) => setAutoFadeOut(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0"
          />
        </label>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isRunning ? 'Pause Timer' : 'Start Focus Session'}</span>
          </button>

          <button
            onClick={handleReset}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Reset Timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
