"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  LineCodeScheme, 
  validateBitSequence, 
  generateRandomBits, 
  encodeLineCode,
  calculatePSD
} from "@/utils/simulations/lineCoding";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area
} from "recharts";

type Tab = LineCodeScheme | "Compare";
const SCHEMES: LineCodeScheme[] = ["Unipolar NRZ", "Polar NRZ", "Polar RZ", "Manchester", "Bipolar AMI", "Differential"];

export default function LineCoding() {
  const [activeTab, setActiveTab] = useState<Tab>("Unipolar NRZ");
  const [inputSequence, setInputSequence] = useState<string>("101100101");
  const [amplitude, setAmplitude] = useState<number>(1);
  const [bitRate, setBitRate] = useState<number>(1000); // bps
  const [showPSD, setShowPSD] = useState<boolean>(false);

  const bitDuration = 1 / bitRate; // Tb

  // Validate on change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = validateBitSequence(e.target.value);
    setInputSequence(val);
  };

  const handleRandom = () => {
    setInputSequence(generateRandomBits(10));
  };

  // Precompute for active tab
  const activeSim = useMemo(() => {
    if (activeTab === "Compare" || inputSequence.length === 0) return null;
    return encodeLineCode(inputSequence, activeTab as LineCodeScheme, amplitude, bitDuration);
  }, [inputSequence, activeTab, amplitude, bitDuration]);

  // Precompute for PSD
  const activePSD = useMemo(() => {
    if (activeTab === "Compare" || inputSequence.length === 0 || !showPSD) return null;
    return calculatePSD(inputSequence, activeTab as LineCodeScheme, amplitude, bitDuration);
  }, [inputSequence, activeTab, amplitude, bitDuration, showPSD]);

  // Precompute all for Compare mode
  const compareSims = useMemo(() => {
    if (inputSequence.length === 0) return [];
    return SCHEMES.map(scheme => ({
      scheme,
      data: encodeLineCode(inputSequence, scheme, amplitude, bitDuration)
    }));
  }, [inputSequence, amplitude, bitDuration]);

  const getObservation = () => {
    switch (activeTab) {
      case "Unipolar NRZ":
        return "Simple implementation but contains a strong DC component. It suffers from poor clock synchronization during long runs of consecutive 0s or 1s.";
      case "Polar NRZ":
        return "Uses symmetrical positive and negative voltage levels. It has better power efficiency than unipolar signaling but still struggles with clock recovery during long runs of identical bits.";
      case "Polar RZ":
        return "The signal returns to zero in the middle of every bit period. This guarantees clock synchronization even for long runs, but requires double the bandwidth of NRZ.";
      case "Manchester":
        return "Features a guaranteed mid-bit transition (1: High-to-Low, 0: Low-to-High). Provides excellent clock synchronization and eliminates the DC component, but requires higher bandwidth.";
      case "Bipolar AMI":
        return "Successive '1' bits alternate in polarity, while '0' remains at zero. This creates a pseudo-ternary signal with a reduced DC component and allows for simple error detection (violation of alternation).";
      case "Differential":
        return "Encoding is based on transitions rather than absolute levels (NRZ-Mark). A '1' forces a state transition, while a '0' holds the previous state. Highly robust against accidental polarity inversion during transmission.";
      default:
        return "";
    }
  };

  const renderTabs = () => (
    <div className="flex flex-wrap border-b border-[var(--border-subtle)] mb-8 gap-x-2">
      {[...SCHEMES, "Compare"].map(tab => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab as Tab)}
          className={`px-4 py-3 text-[12.5px] font-medium tracking-wide focus:outline-none transition-colors border-b-2 whitespace-nowrap ${
            activeTab === tab 
              ? "border-[var(--accent)] text-[var(--accent)]" 
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  const renderGraph = (data: any[], scheme: string, height: number = 300, showAxis: boolean = true) => {
    return (
      <div className="w-full relative" style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 25, right: 10, left: -20, bottom: 0 }}>
            {showAxis && <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />}
            <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} hide />
            <YAxis domain={[-amplitude * 1.5, amplitude * 1.5]} tick={{ fontSize: 11 }} hide={!showAxis} />
            <Tooltip 
              labelFormatter={(l) => `Time: ${(Number(l) * 1000).toFixed(2)} ms`} 
              formatter={(v: any) => [Number(v).toFixed(2) + ' V', 'Amplitude']}
              contentStyle={{ fontSize: '12px' }} 
            />
            
            {/* Draw bit boundaries and labels */}
            {inputSequence.split('').map((bit, i) => (
              <ReferenceLine 
                key={i} 
                x={i * bitDuration} 
                stroke="var(--border-subtle)" 
                strokeDasharray="4 4" 
              />
            ))}
            {inputSequence.split('').map((bit, i) => (
              <ReferenceLine 
                key={`label-${i}`} 
                x={i * bitDuration + bitDuration/2} 
                stroke="none" 
                label={{ position: 'top', value: bit, fill: 'var(--text-primary)', fontSize: 14, fontWeight: 'bold' }} 
              />
            ))}
            
            {/* Add end boundary */}
            <ReferenceLine x={inputSequence.length * bitDuration} stroke="var(--border-subtle)" strokeDasharray="4 4" />
            
            {/* The Waveform */}
            <Line type="linear" dataKey="Amplitude" stroke="var(--accent)" dot={false} strokeWidth={2} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderPSDGraph = () => {
    if (!activePSD || activePSD.length === 0) return null;
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)] min-h-[250px] flex flex-col mb-6 mt-6">
         <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-2">Theoretical Power Spectral Density (PSD)</h3>
         <p className="text-[11px] text-[var(--text-tertiary)] mb-4">Normalized Frequency Distribution</p>
         <div className="flex-1 w-full min-h-[200px]">
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={activePSD} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
               <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
               <XAxis dataKey="f" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toFixed(0)} />
               <YAxis tick={false} axisLine={false} />
               <Tooltip labelFormatter={(l) => `Frequency: ${Number(l).toFixed(0)} Hz`} formatter={(v: any) => ['Power', 'PSD']} />
               <Area type="monotone" dataKey="Power" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.1} isAnimationActive={false} />
             </AreaChart>
           </ResponsiveContainer>
         </div>
      </div>
    );
  };

  const renderCompareView = () => {
    return (
      <div className="flex flex-col gap-6">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-6">Waveform Comparison</h3>
          
          <div className="flex flex-col gap-4">
            {compareSims.map((sim, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-center border-b border-[var(--border-subtle)] pb-4 last:border-0 last:pb-0">
                <div className="w-full sm:w-[120px] text-[12px] font-semibold text-[var(--text-secondary)] mb-2 sm:mb-0">
                  {sim.scheme}
                </div>
                <div className="flex-1 w-full">
                  {renderGraph(sim.data.chartData, sim.scheme, 120, false)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-6">Line Code Properties</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[var(--bg-surface-alt)] border-b border-[var(--border-strong)]">
                <tr>
                  <th className="p-3 font-semibold text-[var(--text-primary)]">Scheme</th>
                  <th className="p-3 font-semibold text-[var(--text-primary)]">Levels</th>
                  <th className="p-3 font-semibold text-[var(--text-primary)]">DC Component</th>
                  <th className="p-3 font-semibold text-[var(--text-primary)]">Synchronization</th>
                  <th className="p-3 font-semibold text-[var(--text-primary)]">Bandwidth</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--border-subtle)]">
                  <td className="p-3 font-medium text-[var(--text-primary)]">Unipolar NRZ</td><td className="p-3 font-mono">2</td><td className="p-3 text-red-600">High (+V/2)</td><td className="p-3 text-red-600">Poor</td><td className="p-3 text-[var(--text-secondary)]">Low (≈ Rb)</td>
                </tr>
                <tr className="border-b border-[var(--border-subtle)]">
                  <td className="p-3 font-medium text-[var(--text-primary)]">Polar NRZ</td><td className="p-3 font-mono">2</td><td className="p-3 text-orange-500">Reduced</td><td className="p-3 text-orange-500">Moderate</td><td className="p-3 text-[var(--text-secondary)]">Low (≈ Rb)</td>
                </tr>
                <tr className="border-b border-[var(--border-subtle)]">
                  <td className="p-3 font-medium text-[var(--text-primary)]">Polar RZ</td><td className="p-3 font-mono">3</td><td className="p-3 text-orange-500">Reduced</td><td className="p-3 text-green-600">Good</td><td className="p-3 text-[var(--text-secondary)]">Higher (≈ 2Rb)</td>
                </tr>
                <tr className="border-b border-[var(--border-subtle)]">
                  <td className="p-3 font-medium text-[var(--text-primary)]">Manchester</td><td className="p-3 font-mono">2</td><td className="p-3 text-green-600">Zero</td><td className="p-3 text-green-600">Excellent</td><td className="p-3 text-[var(--text-secondary)]">Higher (≈ 2Rb)</td>
                </tr>
                <tr className="border-b border-[var(--border-subtle)]">
                  <td className="p-3 font-medium text-[var(--text-primary)]">Bipolar AMI</td><td className="p-3 font-mono">3</td><td className="p-3 text-green-600">Low/Zero</td><td className="p-3 text-green-600">Good</td><td className="p-3 text-[var(--text-secondary)]">Moderate (≈ Rb)</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-[var(--text-primary)]">Differential</td><td className="p-3 font-mono">2</td><td className="p-3 text-orange-500">Depends</td><td className="p-3 text-green-600">Good</td><td className="p-3 text-[var(--text-secondary)]">Moderate</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id="module-linecoding" className="py-24 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-4">Line Coding</h2>
          <p className="text-[16px] text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            Convert digital bitstreams into baseband waveforms suitable for transmission. Analyze power spectral density, synchronization capabilities, and DC components across different line codes.
          </p>
        </div>

        {renderTabs()}

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Controls Column */}
          <div className="w-full lg:w-[320px] flex-shrink-0 space-y-6">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
              <h3 className="text-[11px] font-mono font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-6">Input Signal & Parameters</h3>
              
              <div className="mb-6">
                <label className="text-[12px] font-medium mb-2 block">Binary Sequence</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={inputSequence} 
                    onChange={handleInputChange} 
                    className="w-full px-3 py-2 text-[13px] font-mono border border-[var(--border-subtle)] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--accent)] tracking-widest"
                    placeholder="e.g. 1011001"
                  />
                  <button 
                    onClick={handleRandom}
                    className="px-3 py-2 bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors"
                  >
                    Random
                  </button>
                </div>
                {inputSequence.length === 0 && <p className="text-[11px] text-red-500 mt-1">Please enter a binary sequence.</p>}
              </div>

              <div className="mb-6">
                <div className="flex justify-between mb-1"><label className="text-[12px] font-medium">Bit Rate (Rb)</label><span className="text-[12px] font-mono">{bitRate} bps</span></div>
                <input type="range" min="100" max="10000" step="100" value={bitRate} onChange={e => setBitRate(Number(e.target.value))} className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)]" />
              </div>

              <div className="mb-6">
                <div className="flex justify-between mb-1"><label className="text-[12px] font-medium">Amplitude Voltage (A)</label><span className="text-[12px] font-mono">{amplitude} V</span></div>
                <input type="range" min="1" max="5" step="0.5" value={amplitude} onChange={e => setAmplitude(Number(e.target.value))} className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)]" />
              </div>

              {activeTab !== "Compare" && (
                <div className="pt-4 border-t border-[var(--border-subtle)]">
                  <label className="flex items-center space-x-2 text-[12px] cursor-pointer">
                    <input type="checkbox" checked={showPSD} onChange={e=>setShowPSD(e.target.checked)} className="accent-[var(--accent)]" />
                    <span>Show Power Spectral Density (PSD)</span>
                  </label>
                </div>
              )}
            </div>

            {activeTab !== "Compare" && activeSim && (
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
                <h3 className="text-[11px] font-mono font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Signal Properties</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-[12px] text-[var(--text-secondary)]">Voltage Levels</span>
                    <span className="text-[13px] font-mono">{activeSim.metrics.levels}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-[12px] text-[var(--text-secondary)]">DC Component Avg</span>
                    <span className="text-[13px] font-mono">{activeSim.metrics.averageValue.toFixed(2)} V</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-[12px] text-[var(--text-secondary)]">Est. Bandwidth</span>
                    <span className="text-[13px] font-mono">{activeSim.metrics.bandwidthApprox}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-[12px] text-[var(--text-secondary)]">Sequence Length</span>
                    <span className="text-[13px] font-mono">{inputSequence.length} bits</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Column */}
          <div className="flex-1 flex flex-col w-full overflow-hidden">
            {activeTab === "Compare" ? (
              renderCompareView()
            ) : activeSim ? (
              <>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)] min-h-[400px] flex flex-col mb-6">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-8 flex justify-between">
                    <span>Waveform Analysis: {activeTab}</span>
                  </h3>
                  <div className="flex-1 w-full">
                    {renderGraph(activeSim.chartData, activeTab, 320, true)}
                  </div>
                </div>

                {showPSD && renderPSDGraph()}

                <div className="bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6">
                  <h3 className="text-[11px] font-mono font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Educational Observation</h3>
                  <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                    {getObservation()}
                  </p>
                </div>
              </>
            ) : null}
          </div>

        </div>
      </div>
    </section>
  );
}
