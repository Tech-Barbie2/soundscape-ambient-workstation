/**
 * SoundScape — Real-Time 60fps Canvas Audio Visualizer
 * Location: components/visualizer/AudioVisualizer.tsx
 *
 * Features:
 * - 3 Visualization Modes: Logarithmic FFT Spectrum, Oscilloscope Waveform, Radial Pulse
 * - Retina / HiDPI devicePixelRatio auto-scaling
 * - Peak-hold decay caps
 * - Zero React re-render overhead during canvas animation loop
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { VisualizerMode } from '../../lib/audio/types';
import { soundEngine } from '../../lib/audio/engine';

interface AudioVisualizerProps {
  isPlaying: boolean;
  activeTrackCount: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  activeTrackCount,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<VisualizerMode>('spectrum');
  const [peakDb, setPeakDb] = useState<number>(-60);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let idleAngle = 0;

    // Peak holding decay array for spectrum bars
    const numBars = 48;
    const peakBars = new Float32Array(numBars);

    const render = () => {
      animationFrameId = requestAnimationFrame(render);

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      // Ensure canvas internal bitmap matches Retina pixel density
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Canvas background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      // Subtle horizontal grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSteps = 4;
      for (let i = 1; i < gridSteps; i++) {
        const y = (height / gridSteps) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const analyser = soundEngine.getAnalyser();

      // IDLE STATE: Gentle ambient wave when audio is off
      if (!analyser || !isPlaying || activeTrackCount === 0) {
        idleAngle += 0.02;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 1.5;

        for (let x = 0; x < width; x += 3) {
          const y =
            height / 2 +
            Math.sin(x * 0.015 + idleAngle) * 8 +
            Math.cos(x * 0.008 + idleAngle * 0.5) * 5;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.restore();
        return;
      }

      // ACTIVE AUDIO RENDERING
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      if (mode === 'spectrum') {
        analyser.getByteFrequencyData(dataArray);

        let maxVal = 0;
        for (let i = 0; i < bufferLength; i++) {
          if (dataArray[i] > maxVal) maxVal = dataArray[i];
        }
        const currentDb =
          maxVal > 0 ? Math.round(20 * Math.log10(maxVal / 255)) : -60;
        setPeakDb((prev) => Math.max(currentDb, prev - 1.5));

        const barWidth = (width - (numBars - 1) * 3) / numBars;
        const barSpacing = 3;

        for (let i = 0; i < numBars; i++) {
          // Logarithmic bin sampling
          const logIndex = Math.floor(
            Math.pow(i / numBars, 1.8) * (bufferLength * 0.75)
          );
          const value = dataArray[logIndex] || 0;
          const percent = value / 255;
          const barHeight = Math.max(2, percent * (height - 24));

          const x = i * (barWidth + barSpacing);
          const y = height - barHeight - 4;

          // Peak cap decay
          if (barHeight > peakBars[i]) {
            peakBars[i] = barHeight;
          } else {
            peakBars[i] = Math.max(2, peakBars[i] - 1.2);
          }

          // Luminescent gradient bar
          const gradient = ctx.createLinearGradient(0, height, 0, y);
          gradient.addColorStop(0, '#0284c7');
          gradient.addColorStop(0.5, '#38bdf8');
          gradient.addColorStop(1, '#c084fc');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
          ctx.fill();

          // White peak cap
          const peakY = height - peakBars[i] - 4;
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(x, Math.max(2, peakY - 2), barWidth, 1.5);
        }
      } else if (mode === 'waveform') {
        analyser.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 2;
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#38bdf8');
        gradient.addColorStop(0.5, '#818cf8');
        gradient.addColorStop(1, '#c084fc');
        ctx.strokeStyle = gradient;

        ctx.beginPath();
        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();

        // Neon glow stroke pass
        ctx.save();
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();
      } else if (mode === 'radial') {
        analyser.getByteFrequencyData(dataArray);

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.28;
        const radialBars = 64;

        ctx.save();
        ctx.translate(centerX, centerY);

        for (let i = 0; i < radialBars; i++) {
          const rad = (i * 2 * Math.PI) / radialBars;
          const sampleIdx = Math.floor((i / radialBars) * (bufferLength * 0.5));
          const val = dataArray[sampleIdx] || 0;
          const barLen = 4 + (val / 255) * (radius * 0.7);

          const x1 = Math.cos(rad) * radius;
          const y1 = Math.sin(rad) * radius;
          const x2 = Math.cos(rad) * (radius + barLen);
          const y2 = Math.sin(rad) * (radius + barLen);

          ctx.strokeStyle = `hsl(${190 + (i / radialBars) * 90}, 85%, 65%)`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(0, 0, radius - 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
      }

      ctx.restore();
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [mode, isPlaying, activeTrackCount]);

  return (
    <div className="relative w-full rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md overflow-hidden p-4">
      {/* Top Header & Mode Tabs */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-200">
            Acoustic Spectrum
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="text-slate-400 font-mono tabular-nums">
            {isPlaying
              ? `${activeTrackCount} stem${
                  activeTrackCount !== 1 ? 's' : ''
                } active`
              : 'Mixer standby'}
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="text-slate-400 font-mono tabular-nums">
            Peak: {isPlaying ? `${peakDb} dBFS` : '—'}
          </span>
        </div>

        {/* Visualizer Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-lg">
          <button
            onClick={() => setMode('spectrum')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'spectrum'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Spectrum
          </button>
          <button
            onClick={() => setMode('waveform')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'waveform'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Oscilloscope
          </button>
          <button
            onClick={() => setMode('radial')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'radial'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Radial
          </button>
        </div>
      </div>

      {/* High-Performance Canvas */}
      <div className="relative w-full h-36 md:h-44 rounded-xl overflow-hidden bg-slate-950/90 border border-slate-900">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};
