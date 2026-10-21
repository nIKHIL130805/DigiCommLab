"use client";

import React, { useState, useMemo } from "react";
import { 
  DigitalScheme,
  simulateDigital
} from "@/utils/simulations/modulation";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine
} from "recharts";

type ViewTab = "Waveform" | "Spectrum" | "Constellation" | "Analysis" | "Compare";

const DIGITAL_SCHEMES: DigitalScheme[] = [
  'BASK', 'BPSK', 'BFSK', 'CPFSK', 'GFSK', 
  'PAM4', 'QPSK', '8PSK', 'MSK', 'DPSK', 
  '16-QAM', '64-QAM'
];

export default function Modulation() {
  const [activeScheme, setActiveScheme] = useState<DigitalScheme>('BPSK');
  const [activeTab, setActiveTab] = useState<ViewTab>('Waveform');

  // Modulation Parameters
  const [fc, setFc] = useState(100);
  const [amplitude, setAmplitude] = useState(1);
  const [snrDb, setSnrDb] = useState(30);
  const [bits, setBits] = useState("101101001011");
  const [symbolRate, setSymbolRate] = useState(10);

  const hasConstellation = !['BFSK', 'CPFSK', 'GFSK', 'MSK'].includes(activeScheme);

  const handleSchemeChange = (scheme: DigitalScheme) => {
    setActiveScheme(scheme);
    if (['BFSK', 'CPFSK', 'GFSK', 'MSK'].includes(scheme) && activeTab === 'Constellation') {
      setActiveTab('Waveform');
    }
  };

  const simData = useMemo(() => {
    if (activeTab === "Compare") return null;
    return simulateDigital(activeScheme, bits, fc, symbolRate, amplitude, snrDb, 5000);
  }, [activeScheme, activeTab, bits, fc, symbolRate, amplitude, snrDb]);

  const renderControls = () => {
    if (activeTab === "Compare") return null;

    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
        <h3 className="text-[11px] font-mono font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-6">
          Modulation Parameters
        </h3>
        
        <div className="mb-6 border-b border-[var(--border-subtle)] pb-6">
          <label className="text-[12px] font-medium mb-2 block">Binary Sequence</label>
          <input 
            type="text" 
            value={bits} 
            onChange={(e) => setBits(e.target.value.replace(/[^01]/g, ''))} 
            className="w-full px-3 py-2 text-[13px] font-mono border border-[var(--border-subtle)] rounded-[var(--radius-sm)] focus:outline-none focus:border-[var(--accent)] tracking-widest"
            placeholder="e.g. 1011001"
          />
        </div>

        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <label className="text-[12px] font-medium">Carrier Freq (fc)</label>
            <span className="text-[12px] font-mono">{fc} Hz</span>
          </div>
          <input 
            type="range" 
            min="20" 
            max="500" 
            step="10" 
            value={fc} 
            onChange={e => setFc(Number(e.target.value))} 
            className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)]" 
          />
        </div>

        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <label className="text-[12px] font-medium">Symbol Rate</label>
            <span className="text-[12px] font-mono">{symbolRate} baud</span>
          </div>
          <input 
            type="range" 
            min="5" 
            max="50" 
            step="1" 
            value={symbolRate} 
            onChange={e => setSymbolRate(Number(e.target.value))} 
            className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)]" 
          />
        </div>

        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <label className="text-[12px] font-medium">Amplitude</label>
            <span className="text-[12px] font-mono">{amplitude} V</span>
          </div>
          <input 
            type="range" 
            min="0.5" 
            max="5" 
            step="0.5" 
            value={amplitude} 
            onChange={e => setAmplitude(Number(e.target.value))} 
            className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)]" 
          />
        </div>

        <div className="mb-4 pt-4 border-t border-[var(--border-subtle)]">
          <div className="flex justify-between mb-1">
            <label className="text-[12px] font-medium">AWGN Channel (SNR)</label>
            <span className="text-[12px] font-mono">{snrDb} dB</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="40" 
            step="1" 
            value={snrDb} 
            onChange={e => setSnrDb(Number(e.target.value))} 
            className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)]" 
          />
          <div className="flex justify-between mt-1 px-1">
            <span className="text-[9px] text-[var(--text-tertiary)] uppercase">Noisy (0 dB)</span>
            <span className="text-[9px] text-[var(--text-tertiary)] uppercase">Clean (40 dB)</span>
          </div>
        </div>

      </div>
    );
  };

  const renderWaveform = () => {
    if (!simData) return null;
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)] min-h-[400px] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Time-Domain Signal</h3>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[var(--border-strong)] inline-block"></span>
              <span className="text-[var(--text-secondary)]">Baseband Bits</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[var(--accent)] inline-block"></span>
              <span className="text-[var(--accent)]">Modulated Carrier</span>
            </span>
          </div>
        </div>
        <div className="flex-1 w-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={simData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(0)} />
              <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip labelFormatter={l => `${Number(l).toFixed(1)} ms`} contentStyle={{ fontSize: '12px' }} />
              <Line type="stepAfter" dataKey="Data" stroke="var(--border-strong)" dot={false} strokeWidth={2} isAnimationActive={false} />
              <Line type="monotone" dataKey="Modulated" stroke="var(--accent)" dot={false} strokeWidth={1.5} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderSpectrum = () => {
    if (!simData) return null;
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)] min-h-[400px] flex flex-col">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-6">Frequency Spectrum (Magnitude)</h3>
        <div className="flex-1 w-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={simData.spectrum} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="f" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(0)} />
              <YAxis tick={false} axisLine={false} />
              <Tooltip labelFormatter={l => `${Number(l).toFixed(0)} Hz`} formatter={(v: any) => [Number(v).toFixed(3), 'Magnitude']} contentStyle={{ fontSize: '12px' }} />
              <Area type="monotone" dataKey="magnitude" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderConstellation = () => {
    if (!simData || !hasConstellation) return null;
    
    // Calculate max extent for square plot
    const maxVal = Math.max(...simData.constellation.map((c: any) => Math.max(Math.abs(c.I), Math.abs(c.Q)))) * 1.2 || 1;

    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)] min-h-[400px] flex flex-col items-center">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)] w-full mb-2">I/Q Constellation Diagram</h3>
        <p className="text-[11px] text-[var(--text-tertiary)] w-full mb-4">Received symbols with AWGN (SNR: {snrDb} dB)</p>
        
        <div className="w-[320px] h-[320px] sm:w-[360px] sm:h-[360px] relative border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] rounded-md">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" />
              <ReferenceLine x={0} stroke="var(--text-secondary)" />
              <ReferenceLine y={0} stroke="var(--text-secondary)" />
              <XAxis type="number" dataKey="I" name="In-Phase" domain={[-maxVal, maxVal]} tick={false} axisLine={false} />
              <YAxis type="number" dataKey="Q" name="Quadrature" domain={[-maxVal, maxVal]} tick={false} axisLine={false} />
              <ZAxis range={[15, 15]} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{ fontSize: '11px', padding: '4px 8px' }}
                formatter={(v: any, name: any) => [Number(v).toFixed(2), name === 'I' ? 'In-Phase' : 'Quadrature']}
              />
              {/* Ideal points */}
              <Scatter data={simData.constellation} dataKey="IdealQ" fill="none" stroke="var(--border-strong)" shape="cross" isAnimationActive={false} />
              {/* Received noisy points */}
              <Scatter data={simData.constellation} fill="var(--accent)" fillOpacity={0.6} isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderAnalysis = () => {
    if (!simData) return null;
    return (
      <div className="flex flex-col gap-6">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-6">Performance Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Object.entries(simData.metrics).map(([key, val], i) => (
              <div key={i} className="bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-4">
                <p className="text-[10px] uppercase text-[var(--text-tertiary)] mb-1">{key}</p>
                <p className="text-[15px] font-mono">{val}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--bg-surface-alt)] border-l-4 border-l-[var(--accent)] border-[var(--border-subtle)] rounded-r-[var(--radius-sm)] p-5">
          <h3 className="text-[11px] font-mono font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Observation</h3>
          <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
            {simData.observation}
          </p>
        </div>
      </div>
    );
  };

  const renderCompareTable = () => {
    const data = [
      { t: "BASK", family: "Amplitude Shift Keying", bps: 1, bw: "≈ 2Rs", se: "0.5 bps/Hz", c: "2 points (0, A)" },
      { t: "BPSK", family: "Phase Shift Keying", bps: 1, bw: "≈ 2Rs", se: "0.5 bps/Hz", c: "2 points (±A)" },
      { t: "BFSK", family: "Frequency Shift Keying", bps: 1, bw: "≈ 2(Δf + Rs)", se: "< 0.5 bps/Hz", c: "Orthogonal (N/A)" },
      { t: "PAM4", family: "Pulse Amplitude", bps: 2, bw: "≈ Rs", se: "1.0 bps/Hz", c: "4 1D points" },
      { t: "QPSK", family: "Phase Shift Keying", bps: 2, bw: "≈ Rs", se: "1.0 bps/Hz", c: "4 points (Quadrature)" },
      { t: "8PSK", family: "Phase Shift Keying", bps: 3, bw: "≈ 2/3 Rs", se: "1.5 bps/Hz", c: "8 circular points" },
      { t: "16-QAM", family: "Quadrature Amplitude", bps: 4, bw: "≈ 1/2 Rs", se: "2.0 bps/Hz", c: "16 rectangular grid" },
      { t: "64-QAM", family: "Quadrature Amplitude", bps: 6, bw: "≈ 1/3 Rs", se: "3.0 bps/Hz", c: "64 rectangular grid" },
      { t: "MSK", family: "Continuous Phase FSK", bps: 1, bw: "≈ 1.5 Rs (Compact)", se: "0.67 bps/Hz", c: "Phase Circle" },
      { t: "DPSK", family: "Differential Phase", bps: 1, bw: "≈ 2Rs", se: "0.5 bps/Hz", c: "Differential Phase" },
    ];

    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-8 shadow-[var(--shadow-sm)] w-full">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Digital Modulation Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[var(--bg-surface-alt)] border-b border-[var(--border-strong)]">
              <tr>
                <th className="p-3 font-semibold text-[var(--text-primary)]">Technique</th>
                <th className="p-3 font-semibold text-[var(--text-primary)]">Modulation Family</th>
                <th className="p-3 font-semibold text-[var(--text-primary)]">Bits/Symbol</th>
                <th className="p-3 font-semibold text-[var(--text-primary)]">Bandwidth Req.</th>
                <th className="p-3 font-semibold text-[var(--text-primary)]">Spectral Efficiency</th>
                <th className="p-3 font-semibold text-[var(--text-primary)]">Constellation</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-alt)]">
                  <td className="p-3 font-medium text-[var(--text-primary)]">{row.t}</td>
                  <td className="p-3 text-[var(--text-secondary)]">{row.family}</td>
                  <td className="p-3 font-mono">{row.bps}</td>
                  <td className="p-3 text-[var(--text-secondary)]">{row.bw}</td>
                  <td className="p-3 font-mono">{row.se}</td>
                  <td className="p-3 text-[var(--text-secondary)]">{row.c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <section id="module-modulation" className="py-24 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-4">Modulation</h2>
          <p className="text-[16px] text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            Translate baseband digital bitstreams into passband signals suitable for transmission over physical channels. Configure, simulate, and analyze digital modulation schemes including ASK, PSK, FSK, and dense QAM constellations.
          </p>
        </div>

        {/* Scheme Selector */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <span className="text-[11px] font-mono font-semibold text-[var(--text-tertiary)] uppercase tracking-wider shrink-0">
              Digital Scheme:
            </span>
            <div className="flex-1 flex flex-wrap gap-2">
              {DIGITAL_SCHEMES.map(scheme => (
                <button
                  key={scheme}
                  onClick={() => handleSchemeChange(scheme)}
                  className={`px-3 py-1.5 text-[12px] font-mono rounded-[var(--radius-sm)] transition-colors border ${
                    activeScheme === scheme 
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-[var(--shadow-sm)]' 
                      : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {scheme}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex flex-wrap border-b border-[var(--border-subtle)] mb-8 gap-x-2">
          {(["Waveform", "Spectrum", hasConstellation ? "Constellation" : null, "Analysis", "Compare"].filter(Boolean) as ViewTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-[13px] font-medium tracking-wide focus:outline-none transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab 
                  ? "border-[var(--accent)] text-[var(--accent)]" 
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {activeTab !== "Compare" && (
            <div className="w-full lg:w-[320px] flex-shrink-0">
              {renderControls()}
            </div>
          )}

          <div className="flex-1 flex flex-col w-full overflow-hidden">
            {activeTab === "Waveform" && renderWaveform()}
            {activeTab === "Spectrum" && renderSpectrum()}
            {activeTab === "Constellation" && renderConstellation()}
            {activeTab === "Analysis" && renderAnalysis()}
            {activeTab === "Compare" && renderCompareTable()}
          </div>
          
        </div>
      </div>
    </section>
  );
}
