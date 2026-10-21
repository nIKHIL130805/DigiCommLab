"use client";

import React, { useState, useEffect, useMemo } from "react";
import { simulateSampling } from "@/utils/simulations/sampling";
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

export default function SamplingLab() {
  const [fm, setFm] = useState<number>(100);
  const [fs, setFs] = useState<number>(500);
  const levels = 16;

  const [showOriginal, setShowOriginal] = useState(true);
  const [showSampled, setShowSampled] = useState(true);
  const [showQuantized, setShowQuantized] = useState(false);
  const [showReconstructed, setShowReconstructed] = useState(false);

  // Compute simulation data
  const simData = useMemo(() => {
    return simulateSampling(fm, fs, levels, 0.05); // 50ms duration
  }, [fm, fs]);

  const { chartData, metrics } = simData;

  const handleReset = () => {
    setFm(100);
    setFs(500);
    setShowOriginal(true);
    setShowSampled(true);
    setShowQuantized(false);
    setShowReconstructed(false);
  };

  // Dynamic educational observation
  const getObservation = () => {
    if (metrics.isAliased) {
      return `The sampling frequency (${fs} Hz) is below the Nyquist rate (${metrics.nyquist} Hz). The sampled signal exhibits aliasing, appearing as a lower frequency (${metrics.fAlias} Hz) wave. Reconstruction will fail to reproduce the original signal.`;
    }
    if (fs === metrics.nyquist) {
      return `The sampling frequency is exactly at the Nyquist rate. While theoretically sufficient, practical reconstruction filters cannot recover this perfectly.`;
    }
    
    return `The sampling frequency satisfies the Nyquist condition (fs > 2fm). The signal is reconstructed accurately with a uniform ${levels}-level quantization step size of ${metrics.stepSize.toFixed(3)}.`;
  };

  return (
    <section id="module-sampling" className="py-24 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-4">Sampling & Quantization</h2>
          <p className="text-[16px] text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            Explore how continuous-time signals are sampled, quantized, and reconstructed — and observe the mathematical effects of sampling frequency and quantization levels on signal integrity.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Controls Column */}
          <div className="w-full lg:w-[320px] flex-shrink-0 space-y-6">
            
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
              <h3 className="text-[11px] font-mono font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-6">Simulation Controls</h3>
              
              {/* Signal Frequency */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[13px] font-medium text-[var(--text-primary)]">Signal Frequency (fm)</label>
                  <span className="text-[13px] font-mono text-[var(--accent)]">{fm} Hz</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="500" 
                  step="10" 
                  value={fm} 
                  onChange={(e) => setFm(Number(e.target.value))}
                  className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                />
              </div>

              {/* Sampling Frequency */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[13px] font-medium text-[var(--text-primary)]">Sampling Frequency (fs)</label>
                  <span className="text-[13px] font-mono text-[var(--accent)]">{fs} Hz</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="2500" 
                  step="50" 
                  value={fs} 
                  onChange={(e) => setFs(Number(e.target.value))}
                  className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                />
                <div className="mt-2 flex justify-between">
                  <span className="text-[11px] text-[var(--text-tertiary)]">Nyquist: {metrics.nyquist} Hz</span>
                  <span className={`text-[11px] font-medium ${metrics.isAliased ? 'text-red-600' : 'text-green-600'}`}>
                    {metrics.isAliased ? 'Aliasing' : 'Valid'}
                  </span>
                </div>
              </div>

              {/* Visualization Toggles */}
              <div className="mb-6 space-y-3 pt-6 border-t border-[var(--border-subtle)]">
                <h4 className="text-[11px] font-mono font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Visualization Layers</h4>
                
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input type="checkbox" checked={showOriginal} onChange={(e) => setShowOriginal(e.target.checked)} className="w-4 h-4 text-[var(--accent)] border-[var(--border-strong)] rounded focus:ring-[var(--accent)]" />
                  <span className="text-[13px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Original Signal</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input type="checkbox" checked={showSampled} onChange={(e) => setShowSampled(e.target.checked)} className="w-4 h-4 text-[#ef4444] border-[var(--border-strong)] rounded focus:ring-[#ef4444]" />
                  <span className="text-[13px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Sampled Points</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input type="checkbox" checked={showQuantized} onChange={(e) => setShowQuantized(e.target.checked)} className="w-4 h-4 text-[#10b981] border-[var(--border-strong)] rounded focus:ring-[#10b981]" />
                  <span className="text-[13px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Quantized Values</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input type="checkbox" checked={showReconstructed} onChange={(e) => setShowReconstructed(e.target.checked)} className="w-4 h-4 text-[var(--accent)] border-[var(--border-strong)] rounded focus:ring-[var(--accent)]" />
                  <span className="text-[13px] font-medium text-[var(--text-primary)]">Reconstructed Signal</span>
                </label>
              </div>

              {/* Reset */}
              <button 
                onClick={handleReset}
                className="w-full py-2.5 text-[13px] font-medium text-[var(--text-secondary)] bg-[var(--bg-surface-alt)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] transition-colors"
              >
                Reset Default Parameters
              </button>
            </div>
          </div>

          {/* Main Visualization & Results */}
          <div className="flex-1 flex flex-col gap-6 w-full overflow-hidden">
            
            {/* Graph Panel */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 sm:p-6 shadow-[var(--shadow-sm)] min-h-[400px] flex flex-col">
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-6 flex items-center justify-between">
                <span>Signal Visualization (Time Domain)</span>
                {metrics.isAliased && (
                  <span className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider rounded-[var(--radius-sm)] border border-red-200">
                    Aliasing Detected
                  </span>
                )}
              </h3>
              
              <div className="flex-1 w-full h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis 
                      dataKey="t" 
                      type="number" 
                      domain={['dataMin', 'dataMax']} 
                      tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                      axisLine={{ stroke: 'var(--border-strong)' }}
                      tickFormatter={(val) => val.toFixed(1)}
                    />
                    <YAxis 
                      domain={[-1.2, 1.2]} 
                      tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                      axisLine={{ stroke: 'var(--border-strong)' }}
                      tickCount={7}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', fontSize: '12px', borderRadius: '8px', boxShadow: 'var(--shadow-md)' }}
                      labelFormatter={(label) => `Time: ${Number(label).toFixed(2)} ms`}
                    />
                    
                    {showOriginal && (
                      <Line 
                        type="monotone" 
                        dataKey="Original" 
                        stroke="var(--border-strong)" 
                        dot={false} 
                        strokeWidth={2} 
                        isAnimationActive={false} 
                      />
                    )}
                    
                    {showReconstructed && (
                      <Line 
                        type="monotone" 
                        dataKey="Reconstructed" 
                        stroke="var(--accent)" 
                        dot={false} 
                        strokeWidth={2} 
                        isAnimationActive={false} 
                      />
                    )}
                    
                    {showSampled && (
                      <Scatter 
                        dataKey="Sampled" 
                        fill="#ef4444" 
                        isAnimationActive={false} 
                        shape="circle"
                      />
                    )}

                    {showQuantized && (
                      <Scatter 
                        dataKey="Quantized" 
                        fill="#10b981" 
                        isAnimationActive={false} 
                        shape="circle"
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Metrics & Observation Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Measurements */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
                <h3 className="text-[11px] font-mono font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Performance Measurements</h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                  <div>
                    <p className="text-[11px] text-[var(--text-tertiary)]">Sampling Ratio (fs/fm)</p>
                    <p className={`text-[14px] font-mono font-medium ${metrics.ratio < 2 ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>
                      {metrics.ratio.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--text-tertiary)]">Alias Frequency</p>
                    <p className="text-[14px] font-mono font-medium text-[var(--text-primary)]">
                      {metrics.isAliased ? `${metrics.fAlias} Hz` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--text-tertiary)]">Quantization Step</p>
                    <p className="text-[14px] font-mono font-medium text-[var(--text-primary)]">
                      {metrics.stepSize.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--text-tertiary)]">Max Abs Error</p>
                    <p className="text-[14px] font-mono font-medium text-[var(--text-primary)]">
                      {metrics.maxError.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--text-tertiary)]">Mean Squared Error</p>
                    <p className="text-[14px] font-mono font-medium text-[var(--text-primary)]">
                      {metrics.mse.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--text-tertiary)]">SNR (dB)</p>
                    <p className="text-[14px] font-mono font-medium text-[var(--text-primary)]">
                      {metrics.snr}
                    </p>
                  </div>
                </div>
              </div>

              {/* Observation */}
              <div className="bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 flex flex-col">
                <h3 className="text-[11px] font-mono font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Concept Observation</h3>
                <div className="flex-1 flex items-center">
                  <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                    {getObservation()}
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
