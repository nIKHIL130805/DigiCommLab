"use client";

import React, { useState, useMemo } from "react";
import { 
  pcmEncode, 
  dpcmEncode, 
  dmEncode, 
  admEncode 
} from "@/utils/simulations/digitalCoding";
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

type Tab = "PCM" | "DPCM" | "DM" | "ADM" | "Compare";

export default function DigitalCoding() {
  const [activeTab, setActiveTab] = useState<Tab>("PCM");

  // Global Input Signal
  const [fm, setFm] = useState(10);
  const [amplitude, setAmplitude] = useState(1);
  const duration = 0.1; // 100ms

  // PCM / DPCM
  const [fs, setFs] = useState(200);
  const [levels, setLevels] = useState(16);

  // DM
  const [dmFs, setDmFs] = useState(1000);
  const [dmStep, setDmStep] = useState(0.2);

  // ADM
  const [admFs, setAdmFs] = useState(1000);
  const [admInitialStep, setAdmInitialStep] = useState(0.1);

  // Run all simulations so Compare tab has data immediately
  const pcmData = useMemo(() => pcmEncode(fm, fs, levels, amplitude, duration), [fm, fs, levels, amplitude]);
  const dpcmData = useMemo(() => dpcmEncode(fm, fs, levels, amplitude, duration), [fm, fs, levels, amplitude]);
  const dmData = useMemo(() => dmEncode(fm, dmFs, dmStep, amplitude, duration), [fm, dmFs, dmStep, amplitude]);
  const admData = useMemo(() => admEncode(fm, admFs, admInitialStep, amplitude, duration), [fm, admFs, admInitialStep, amplitude]);

  // View state for specific components
  const [showOriginal, setShowOriginal] = useState(true);
  const [showSampled, setShowSampled] = useState(false);
  const [showReconstructed, setShowReconstructed] = useState(true);
  const [showPredicted, setShowPredicted] = useState(false); // DPCM
  const [showStepSize, setShowStepSize] = useState(false); // ADM

  const renderTabs = () => (
    <div className="flex border-b border-[var(--border-subtle)] mb-8">
      {(["PCM", "DPCM", "DM", "ADM", "Compare"] as Tab[]).map(tab => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-6 py-3 text-[13px] font-medium tracking-wide focus:outline-none transition-colors border-b-2 ${
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

  const getObservation = () => {
    switch (activeTab) {
      case "PCM":
        return `PCM samples the absolute amplitude of the signal and rounds it to the nearest of ${levels} quantization levels, transmitting ${pcmData.metrics.bitsPerSample} bits per sample.`;
      case "DPCM":
        return `DPCM transmits the difference between the current sample and its predicted value rather than transmitting the complete sample value. This requires fewer bits for the same dynamic range if the signal is highly correlated.`;
      case "DM":
        if (dmData.metrics.slopeOverload) {
          return `SLOPE OVERLOAD: The step size (${dmStep}) is too small to follow the fast variations of the input signal. Increase step size or sampling frequency.`;
        }
        if (dmData.metrics.granularNoise) {
          return `GRANULAR NOISE: The step size is unnecessarily large relative to the signal variation, causing thick oscillations around the true value.`;
        }
        return `Delta Modulation uses a fixed step size of ${dmStep} to track the signal, transmitting 1 bit per sample (increase or decrease).`;
      case "ADM":
        return `Adaptive Delta Modulation dynamically changes its step size based on the signal slope. It grows to track steep slopes and shrinks to minimize granular noise.`;
      default:
        return "Select a technique to observe its encoding behavior.";
    }
  };

  const currentSim = 
    activeTab === "PCM" ? pcmData :
    activeTab === "DPCM" ? dpcmData :
    activeTab === "DM" ? dmData :
    activeTab === "ADM" ? admData : pcmData;

  const renderControls = () => {
    if (activeTab === "Compare") return null;

    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
        <h3 className="text-[11px] font-mono font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-6">Input & Parameters</h3>
        
        {/* Global Input */}
        <div className="mb-4">
          <div className="flex justify-between mb-1"><label className="text-[12px] font-medium">Input Frequency</label><span className="text-[12px] font-mono">{fm} Hz</span></div>
          <input type="range" min="1" max="50" step="1" value={fm} onChange={e => setFm(Number(e.target.value))} className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)]" />
        </div>
        <div className="mb-8 border-b border-[var(--border-subtle)] pb-6">
          <div className="flex justify-between mb-1"><label className="text-[12px] font-medium">Amplitude</label><span className="text-[12px] font-mono">{amplitude} V</span></div>
          <input type="range" min="0.1" max="5" step="0.1" value={amplitude} onChange={e => setAmplitude(Number(e.target.value))} className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)]" />
        </div>

        {/* PCM / DPCM specific */}
        {(activeTab === "PCM" || activeTab === "DPCM") && (
          <>
            <div className="mb-4">
              <div className="flex justify-between mb-1"><label className="text-[12px] font-medium">Sampling Frequency</label><span className="text-[12px] font-mono">{fs} Hz</span></div>
              <input type="range" min="50" max="1000" step="10" value={fs} onChange={e => setFs(Number(e.target.value))} className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)]" />
            </div>
            <div className="mb-6">
              <label className="text-[12px] font-medium mb-2 block">Quantization Levels</label>
              <div className="flex flex-wrap gap-2">
                {[4, 8, 16, 32, 64, 128, 256].map(lvl => (
                  <button key={lvl} onClick={() => setLevels(lvl)} className={`px-2 py-1 text-[11px] font-mono rounded-[var(--radius-sm)] border ${levels === lvl ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-subtle)]'}`}>{lvl}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* DM specific */}
        {activeTab === "DM" && (
          <>
            <div className="mb-4">
              <div className="flex justify-between mb-1"><label className="text-[12px] font-medium">Sampling Frequency</label><span className="text-[12px] font-mono">{dmFs} Hz</span></div>
              <input type="range" min="100" max="5000" step="100" value={dmFs} onChange={e => setDmFs(Number(e.target.value))} className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)]" />
            </div>
            <div className="mb-6">
              <div className="flex justify-between mb-1"><label className="text-[12px] font-medium">Step Size (Δ)</label><span className="text-[12px] font-mono">{dmStep}</span></div>
              <input type="range" min="0.01" max="1" step="0.01" value={dmStep} onChange={e => setDmStep(Number(e.target.value))} className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)]" />
            </div>
          </>
        )}

        {/* ADM specific */}
        {activeTab === "ADM" && (
          <>
            <div className="mb-4">
              <div className="flex justify-between mb-1"><label className="text-[12px] font-medium">Sampling Frequency</label><span className="text-[12px] font-mono">{admFs} Hz</span></div>
              <input type="range" min="100" max="5000" step="100" value={admFs} onChange={e => setAdmFs(Number(e.target.value))} className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)]" />
            </div>
            <div className="mb-6">
              <div className="flex justify-between mb-1"><label className="text-[12px] font-medium">Initial Step Size</label><span className="text-[12px] font-mono">{admInitialStep}</span></div>
              <input type="range" min="0.01" max="0.5" step="0.01" value={admInitialStep} onChange={e => setAdmInitialStep(Number(e.target.value))} className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)]" />
            </div>
          </>
        )}

        {/* Toggles */}
        <div className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
          <label className="flex items-center space-x-2 text-[12px]"><input type="checkbox" checked={showOriginal} onChange={e=>setShowOriginal(e.target.checked)} className="accent-[var(--accent)]" /><span>Original Signal</span></label>
          <label className="flex items-center space-x-2 text-[12px]"><input type="checkbox" checked={showReconstructed} onChange={e=>setShowReconstructed(e.target.checked)} className="accent-[#10b981]" /><span>Reconstructed Signal</span></label>
          {(activeTab === "PCM" || activeTab === "DPCM") && (
            <label className="flex items-center space-x-2 text-[12px]"><input type="checkbox" checked={showSampled} onChange={e=>setShowSampled(e.target.checked)} className="accent-[#ef4444]" /><span>Sampled/Quantized Points</span></label>
          )}
          {activeTab === "DPCM" && (
            <label className="flex items-center space-x-2 text-[12px]"><input type="checkbox" checked={showPredicted} onChange={e=>setShowPredicted(e.target.checked)} className="accent-[#8b5cf6]" /><span>Predicted Signal</span></label>
          )}
          {activeTab === "ADM" && (
            <label className="flex items-center space-x-2 text-[12px]"><input type="checkbox" checked={showStepSize} onChange={e=>setShowStepSize(e.target.checked)} className="accent-[#f59e0b]" /><span>Plot Step Size</span></label>
          )}
        </div>
      </div>
    );
  };

  const renderGraph = () => {
    if (activeTab === "Compare") return null;
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)] min-h-[400px] flex flex-col mb-6">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-4">{activeTab} Waveform Analysis</h3>
        <div className="flex-1 w-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={currentSim.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toFixed(0)} />
              <YAxis domain={[-amplitude*1.5, amplitude*1.5]} tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(l) => `Time: ${Number(l).toFixed(2)} ms`} contentStyle={{ fontSize: '12px' }} />
              
              {showOriginal && <Line type="monotone" dataKey="Original" stroke="var(--border-strong)" dot={false} strokeWidth={2} isAnimationActive={false} />}
              
              {activeTab === "DPCM" && showPredicted && <Line type="stepAfter" dataKey="Predicted" stroke="#8b5cf6" strokeDasharray="5 5" dot={false} strokeWidth={1.5} isAnimationActive={false} />}
              
              {/* DM/ADM reconstruction is staircase */}
              {showReconstructed && (activeTab === "DM" || activeTab === "ADM") ? (
                <Line type="stepAfter" dataKey="Reconstructed" stroke="#10b981" dot={false} strokeWidth={2} isAnimationActive={false} />
              ) : (
                showReconstructed && <Line type="monotone" dataKey="Reconstructed" stroke="#10b981" dot={false} strokeWidth={2} isAnimationActive={false} />
              )}
              
              {activeTab === "ADM" && showStepSize && <Line type="stepAfter" dataKey="StepSize" stroke="#f59e0b" dot={false} strokeWidth={1} isAnimationActive={false} />}
              
              {showSampled && (activeTab === "PCM" || activeTab === "DPCM") && <Scatter dataKey="Quantized" fill="#ef4444" isAnimationActive={false} shape="circle" />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderMetrics = () => {
    if (activeTab === "Compare") return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-4">
          <p className="text-[10px] uppercase text-[var(--text-tertiary)] mb-1">Bits / Sample</p>
          <p className="text-[16px] font-mono">{currentSim.metrics.bitsPerSample}</p>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-4">
          <p className="text-[10px] uppercase text-[var(--text-tertiary)] mb-1">Bit Rate</p>
          <p className="text-[16px] font-mono">{currentSim.metrics.bitRate} bps</p>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-4">
          <p className="text-[10px] uppercase text-[var(--text-tertiary)] mb-1">Mean Squared Error</p>
          <p className="text-[16px] font-mono">{currentSim.metrics.mse.toFixed(4)}</p>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-4">
          <p className="text-[10px] uppercase text-[var(--text-tertiary)] mb-1">SNR (dB)</p>
          <p className="text-[16px] font-mono">{currentSim.metrics.snr}</p>
        </div>
      </div>
    );
  };

  const renderCompare = () => {
    if (activeTab !== "Compare") return null;
    const tableData = [
      { name: "PCM", idea: "Absolute sample coding", bits: pcmData.metrics.bitsPerSample, mse: pcmData.metrics.mse.toFixed(4), snr: pcmData.metrics.snr, rb: pcmData.metrics.bitRate },
      { name: "DPCM", idea: "Difference coding", bits: dpcmData.metrics.bitsPerSample, mse: dpcmData.metrics.mse.toFixed(4), snr: dpcmData.metrics.snr, rb: dpcmData.metrics.bitRate },
      { name: "DM", idea: "1-bit fixed difference", bits: dmData.metrics.bitsPerSample, mse: dmData.metrics.mse.toFixed(4), snr: dmData.metrics.snr, rb: dmData.metrics.bitRate },
      { name: "ADM", idea: "1-bit adaptive diff.", bits: admData.metrics.bitsPerSample, mse: admData.metrics.mse.toFixed(4), snr: admData.metrics.snr, rb: admData.metrics.bitRate },
    ];

    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-8 shadow-[var(--shadow-sm)] w-full">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Technique Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[var(--bg-surface-alt)] border-b border-[var(--border-strong)]">
              <tr>
                <th className="p-3 font-semibold text-[var(--text-primary)]">Technique</th>
                <th className="p-3 font-semibold text-[var(--text-primary)]">Main Idea</th>
                <th className="p-3 font-semibold text-[var(--text-primary)]">Bits/Sample</th>
                <th className="p-3 font-semibold text-[var(--text-primary)]">MSE</th>
                <th className="p-3 font-semibold text-[var(--text-primary)]">SNR (dB)</th>
                <th className="p-3 font-semibold text-[var(--text-primary)]">Bit Rate (bps)</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-alt)]">
                  <td className="p-3 font-medium text-[var(--text-primary)]">{row.name}</td>
                  <td className="p-3 text-[var(--text-secondary)]">{row.idea}</td>
                  <td className="p-3 font-mono">{row.bits}</td>
                  <td className="p-3 font-mono">{row.mse}</td>
                  <td className="p-3 font-mono">{row.snr}</td>
                  <td className="p-3 font-mono">{row.rb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <section id="module-digital-coding" className="py-24 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-4">Digital Coding</h2>
          <p className="text-[16px] text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            Compare baseband digital coding algorithms. Convert analog waveforms into binary bitstreams using PCM, DPCM, DM, and ADM, and observe their specific quantization behaviors and efficiency.
          </p>
        </div>

        {renderTabs()}

        <div className="flex flex-col lg:flex-row gap-8">
          {activeTab !== "Compare" && (
            <div className="w-full lg:w-[300px] flex-shrink-0">
              {renderControls()}
            </div>
          )}

          <div className="flex-1 flex flex-col w-full overflow-hidden">
            {renderGraph()}
            {renderMetrics()}
            {activeTab !== "Compare" && (
              <div className="bg-[var(--bg-surface)] border-l-4 border-l-[var(--accent)] border-[var(--border-subtle)] rounded-r-[var(--radius-sm)] p-5">
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                  {getObservation()}
                </p>
              </div>
            )}
            {renderCompare()}
          </div>
        </div>

      </div>
    </section>
  );
}
