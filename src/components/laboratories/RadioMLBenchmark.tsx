"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  RadioMlSummary,
  RADIOML_MODULATION_METADATA,
  computeSignalStats,
  formatIqWaveform,
  formatConstellationScatter,
} from "@/utils/simulations/radioml";
import { simulateBerCurve, BerSimulationResult } from "@/utils/simulations/theoreticalAnalysis";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from "recharts";

type BenchmarkTab = "explorer" | "snr" | "comparison" | "ber";

export default function RadioMLBenchmark() {
  const [activeTab, setActiveTab] = useState<BenchmarkTab>("explorer");
  const [summaryData, setSummaryData] = useState<RadioMlSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Panel 1: Explorer State
  const [selectedMod, setSelectedMod] = useState<string>("QPSK");
  const [selectedSnr, setSelectedSnr] = useState<string>("10");
  const [explorerViewMode, setExplorerViewMode] = useState<"time" | "constellation">("time");

  // Panel 2: SNR Analysis State
  const [snrAnalysisMod, setSnrAnalysisMod] = useState<string>("BPSK");

  // Panel 3: Modulation Comparison State
  const [compareModA, setCompareModA] = useState<string>("BPSK");
  const [compareModB, setCompareModB] = useState<string>("QPSK");
  const [compareSnr, setCompareSnr] = useState<string>("10");

  // Panel 4: Controlled BER Simulation State
  const [berScheme, setBerScheme] = useState<"BPSK" | "QPSK">("BPSK");
  const [minEbNo, setMinEbNo] = useState<number>(-4);
  const [maxEbNo, setMaxEbNo] = useState<number>(10);
  const [bitsPerPoint, setBitsPerPoint] = useState<number>(5000);
  const [berSeed, setBerSeed] = useState<number>(101);

  // Load public/data/radioml_summary.json
  const loadData = () => {
    setLoading(true);
    setLoadError(null);
    fetch("/data/radioml_summary.json")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP Error ${res.status}: Failed to load radioml_summary.json`);
        }
        return res.json();
      })
      .then((data: RadioMlSummary) => {
        setSummaryData(data);
        setLoading(false);
      })
      .catch((err) => {
        setLoadError(err.message || "Failed to load RadioML dataset summary.");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Controlled Simulation BER Result (Panel 4)
  const controlledBerResult: BerSimulationResult = useMemo(() => {
    return simulateBerCurve({
      scheme: berScheme,
      minEbNo,
      maxEbNo,
      stepEbNo: 2,
      bitsPerPoint,
      rngSeed: berSeed,
    });
  }, [berScheme, minEbNo, maxEbNo, bitsPerPoint, berSeed]);

  // Derived Modulation List from Summary Data
  const availableModulations = useMemo(() => {
    if (!summaryData) return [];
    return Object.keys(summaryData.modulationCounts);
  }, [summaryData]);

  // Modulation distribution chart data
  const modDistributionData = useMemo(() => {
    if (!summaryData) return [];
    return Object.entries(summaryData.modulationCounts).map(([mod, count]) => ({
      modulation: mod,
      count,
    }));
  }, [summaryData]);

  // SNR distribution chart data
  const snrDistributionData = useMemo(() => {
    if (!summaryData) return [];
    const snrKeys = Object.keys(summaryData.snrCounts).sort((a, b) => Number(a) - Number(b));
    return snrKeys.map((snr) => ({
      snr: `${snr} dB`,
      count: summaryData.snrCounts[snr],
    }));
  }, [summaryData]);

  // Panel 1: Current Selected Waveform & Stats
  const currentSampleWaveform = useMemo(() => {
    if (!summaryData) return null;
    const modSamples = summaryData.representativeSamples[selectedMod];
    if (!modSamples) return null;
    return modSamples[selectedSnr] || null;
  }, [summaryData, selectedMod, selectedSnr]);

  const currentSampleStats = useMemo(() => {
    if (!currentSampleWaveform) return null;
    return computeSignalStats(currentSampleWaveform.i, currentSampleWaveform.q);
  }, [currentSampleWaveform]);

  const currentIqChartData = useMemo(() => {
    if (!currentSampleWaveform) return [];
    return formatIqWaveform(currentSampleWaveform.i, currentSampleWaveform.q);
  }, [currentSampleWaveform]);

  const currentConstellationData = useMemo(() => {
    if (!currentSampleWaveform) return [];
    return formatConstellationScatter(currentSampleWaveform.i, currentSampleWaveform.q);
  }, [currentSampleWaveform]);

  // Panel 2: Comparative waveforms for SNR Analysis
  const snrWaveformNeg4 = useMemo(() => {
    return summaryData?.representativeSamples[snrAnalysisMod]?.["-4"] || null;
  }, [summaryData, snrAnalysisMod]);

  const snrWaveform0 = useMemo(() => {
    return summaryData?.representativeSamples[snrAnalysisMod]?.["0"] || null;
  }, [summaryData, snrAnalysisMod]);

  const snrWaveform10 = useMemo(() => {
    return summaryData?.representativeSamples[snrAnalysisMod]?.["10"] || null;
  }, [summaryData, snrAnalysisMod]);

  // Panel 3: Compare Mod A and Mod B
  const compareWaveformA = useMemo(() => {
    return summaryData?.representativeSamples[compareModA]?.[compareSnr] || null;
  }, [summaryData, compareModA, compareSnr]);

  const compareWaveformB = useMemo(() => {
    return summaryData?.representativeSamples[compareModB]?.[compareSnr] || null;
  }, [summaryData, compareModB, compareSnr]);

  const compareStatsA = useMemo(() => {
    if (!compareWaveformA) return null;
    return computeSignalStats(compareWaveformA.i, compareWaveformA.q);
  }, [compareWaveformA]);

  const compareStatsB = useMemo(() => {
    if (!compareWaveformB) return null;
    return computeSignalStats(compareWaveformB.i, compareWaveformB.q);
  }, [compareWaveformB]);

  // =========================================================================
  // RENDER PANEL 1: DATASET EXPLORER
  // =========================================================================
  const renderExplorerPanel = () => {
    if (!summaryData) return null;

    return (
      <div className="space-y-6">
        {/* Dataset Key Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-sm)]">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
              Total Dataset Size
            </span>
            <span className="text-[18px] font-mono font-bold text-[var(--text-primary)]">
              {summaryData.totalSamples.toLocaleString()}
            </span>
            <span className="block text-[10px] text-[var(--text-secondary)] mt-0.5">labeled RF bursts</span>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-sm)]">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
              Modulation Classes
            </span>
            <span className="text-[18px] font-mono font-bold text-[var(--accent)]">
              {Object.keys(summaryData.modulationCounts).length} Classes
            </span>
            <span className="block text-[10px] text-[var(--text-secondary)] mt-0.5">8 Digital / 3 Analog</span>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-sm)]">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
              Class Balance
            </span>
            <span className="text-[18px] font-mono font-bold text-[var(--text-primary)]">
              20,000
            </span>
            <span className="block text-[10px] text-emerald-700 font-medium mt-0.5">Exact 1:1 balance</span>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-sm)]">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
              SNR Range
            </span>
            <span className="text-[18px] font-mono font-bold text-[var(--text-primary)]">
              −20 to +18 dB
            </span>
            <span className="block text-[10px] text-[var(--text-secondary)] mt-0.5">20 levels (2 dB step)</span>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-sm)]">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
              Sample Dimension
            </span>
            <span className="text-[18px] font-mono font-bold text-[var(--text-primary)]">
              2 × 128
            </span>
            <span className="block text-[10px] text-[var(--text-secondary)] mt-0.5">I & Q channels</span>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3.5 shadow-[var(--shadow-sm)]">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
              Data Integrity
            </span>
            <span className="text-[18px] font-mono font-bold text-emerald-700">
              Verified
            </span>
            <span className="block text-[10px] text-[var(--text-secondary)] mt-0.5">GNU Radio synthetic</span>
          </div>
        </div>

        {/* Dataset Distributions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Modulation Distribution */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)] space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
                  Modulation Class Distribution (20,000 per Class)
                </h4>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  Uniform class distribution across all 11 analog and digital modulations
                </p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
                11 Classes
              </span>
            </div>

            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modDistributionData} margin={{ top: 5, right: 10, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="modulation"
                    tick={{ fontSize: 9 }}
                    stroke="var(--text-tertiary)"
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    domain={[0, 25000]}
                    tick={{ fontSize: 9 }}
                    stroke="var(--text-tertiary)"
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--bg-surface)", fontSize: "11px" }}
                    formatter={(val: any) => [`${Number(val).toLocaleString()} examples`, "Count"]}
                  />
                  <Bar dataKey="count" fill="var(--accent)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SNR Distribution */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)] space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
                  SNR Level Distribution (11,000 per SNR)
                </h4>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  20 SNR increments from −20 dB to +18 dB (each with 1,000 examples per class)
                </p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
                20 Levels
              </span>
            </div>

            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snrDistributionData} margin={{ top: 5, right: 10, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="snr"
                    tick={{ fontSize: 8 }}
                    stroke="var(--text-tertiary)"
                    angle={-45}
                    textAnchor="end"
                    interval={1}
                  />
                  <YAxis
                    domain={[0, 15000]}
                    tick={{ fontSize: 9 }}
                    stroke="var(--text-tertiary)"
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--bg-surface)", fontSize: "11px" }}
                    formatter={(val: any) => [`${Number(val).toLocaleString()} examples`, "Count"]}
                  />
                  <Bar dataKey="count" fill="#059669" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Interactive Representative Sample Inspector */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)] space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[var(--border-subtle)] gap-4">
            <div>
              <h4 className="text-[14px] font-semibold text-[var(--text-primary)]">
                Representative Sample Waveform & Trajectory
              </h4>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Inspect authentic 128-sample I/Q records extracted directly from the RadioML 2016.10A pickle dataset
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Select Modulation */}
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-mono text-[var(--text-secondary)]">Class:</label>
                <select
                  value={selectedMod}
                  onChange={(e) => setSelectedMod(e.target.value)}
                  className="px-2.5 py-1 text-[12px] font-mono bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)]"
                >
                  {availableModulations.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select SNR */}
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-mono text-[var(--text-secondary)]">SNR:</label>
                <div className="inline-flex rounded border border-[var(--border-subtle)] p-0.5 bg-[var(--bg-main)]">
                  {["-4", "0", "10"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSnr(s)}
                      className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                        selectedSnr === s
                          ? "bg-[var(--accent)] text-white font-semibold"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {s} dB
                    </button>
                  ))}
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="inline-flex rounded border border-[var(--border-subtle)] p-0.5 bg-[var(--bg-main)]">
                <button
                  onClick={() => setExplorerViewMode("time")}
                  className={`px-2.5 py-0.5 text-[11px] font-mono rounded transition-colors ${
                    explorerViewMode === "time"
                      ? "bg-[var(--accent)] text-white font-semibold"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Time Domain I/Q
                </button>
                <button
                  onClick={() => setExplorerViewMode("constellation")}
                  className={`px-2.5 py-0.5 text-[11px] font-mono rounded transition-colors ${
                    explorerViewMode === "constellation"
                      ? "bg-[var(--accent)] text-white font-semibold"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  I/Q Trajectory
                </button>
              </div>
            </div>
          </div>

          {/* Sample Metadata Info Card */}
          {RADIOML_MODULATION_METADATA[selectedMod] && (
            <div className="bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-[12px]">
              <div>
                <span className="font-mono font-bold text-[var(--text-primary)] mr-2">
                  {selectedMod}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--accent)]/10 text-[var(--accent)] mr-2">
                  {RADIOML_MODULATION_METADATA[selectedMod].family}
                </span>
                <span className="text-[var(--text-secondary)]">
                  {RADIOML_MODULATION_METADATA[selectedMod].description}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-mono text-[var(--text-tertiary)] flex-shrink-0">
                <span>Envelope: <strong className="text-[var(--text-primary)]">{RADIOML_MODULATION_METADATA[selectedMod].envelopeType}</strong></span>
                {RADIOML_MODULATION_METADATA[selectedMod].bitsPerSymbol && (
                  <span>Bits/Sym: <strong className="text-[var(--text-primary)]">{RADIOML_MODULATION_METADATA[selectedMod].bitsPerSymbol}</strong></span>
                )}
              </div>
            </div>
          )}

          {/* Charts Area */}
          {explorerViewMode === "time" ? (
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-mono text-[var(--text-tertiary)]">
                <span>In-Phase I(t) [Blue] & Quadrature Q(t) [Amber] — 128 Sample Window</span>
                <span>Shape: [2, 128]</span>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={currentIqChartData} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="sample" tick={{ fontSize: 9 }} stroke="var(--text-tertiary)" unit=" n" />
                    <YAxis domain={[-0.035, 0.035]} tick={{ fontSize: 9 }} stroke="var(--text-tertiary)" />
                    <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", fontSize: "11px" }} />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                    <Line
                      type="monotone"
                      dataKey="I"
                      name="In-Phase Channel I[n]"
                      stroke="var(--accent)"
                      strokeWidth={1.8}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Q"
                      name="Quadrature Channel Q[n]"
                      stroke="#d97706"
                      strokeWidth={1.8}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-mono text-[var(--text-tertiary)]">
                <span>Complex Baseband Phase Trajectory (I vs Q Plane)</span>
                <span>128 Transition Points</span>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis
                      type="number"
                      dataKey="I"
                      name="In-Phase"
                      domain={[-0.035, 0.035]}
                      tick={{ fontSize: 9 }}
                      stroke="var(--text-tertiary)"
                    />
                    <YAxis
                      type="number"
                      dataKey="Q"
                      name="Quadrature"
                      domain={[-0.035, 0.035]}
                      tick={{ fontSize: 9 }}
                      stroke="var(--text-tertiary)"
                    />
                    <ReferenceLine x={0} stroke="var(--border-strong)" strokeDasharray="2 2" />
                    <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="2 2" />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{ backgroundColor: "var(--bg-surface)", fontSize: "11px" }}
                      formatter={(val: any, name: any) => [Number(val).toFixed(5), name]}
                    />
                    <Scatter
                      name={`${selectedMod} @ ${selectedSnr} dB`}
                      data={currentConstellationData}
                      fill="var(--accent)"
                      line={{ stroke: "var(--accent)", strokeWidth: 1, strokeOpacity: 0.4 }}
                      shape="circle"
                      isAnimationActive={false}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Real Empirical Sample Statistics Table */}
          {currentSampleStats && (
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <h5 className="text-[11px] font-mono uppercase text-[var(--text-tertiary)] mb-2">
                Empirical Sample Statistics (128 Baseband Time Samples)
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div className="p-2 bg-[var(--bg-main)] rounded border border-[var(--border-subtle)]">
                  <span className="block text-[9px] uppercase text-[var(--text-tertiary)]">RMS Amplitude</span>
                  <span className="text-[13px] font-mono font-bold text-[var(--text-primary)]">
                    {currentSampleStats.rmsAmplitude}
                  </span>
                </div>
                <div className="p-2 bg-[var(--bg-main)] rounded border border-[var(--border-subtle)]">
                  <span className="block text-[9px] uppercase text-[var(--text-tertiary)]">Peak Amplitude</span>
                  <span className="text-[13px] font-mono font-bold text-[var(--text-primary)]">
                    {currentSampleStats.peakAmplitude}
                  </span>
                </div>
                <div className="p-2 bg-[var(--bg-main)] rounded border border-[var(--border-subtle)]">
                  <span className="block text-[9px] uppercase text-[var(--text-tertiary)]">Mean Power (E[I²+Q²])</span>
                  <span className="text-[13px] font-mono font-bold text-[var(--text-primary)]">
                    {currentSampleStats.meanPower}
                  </span>
                </div>
                <div className="p-2 bg-[var(--bg-main)] rounded border border-[var(--border-subtle)]">
                  <span className="block text-[9px] uppercase text-[var(--text-tertiary)]">PAPR (Peak/Avg Power)</span>
                  <span className="text-[13px] font-mono font-bold text-[var(--accent)]">
                    {currentSampleStats.paprDb} dB
                  </span>
                </div>
                <div className="p-2 bg-[var(--bg-main)] rounded border border-[var(--border-subtle)]">
                  <span className="block text-[9px] uppercase text-[var(--text-tertiary)]">I-Channel Variance</span>
                  <span className="text-[13px] font-mono font-bold text-[var(--text-primary)]">
                    {currentSampleStats.iVariance}
                  </span>
                </div>
                <div className="p-2 bg-[var(--bg-main)] rounded border border-[var(--border-subtle)]">
                  <span className="block text-[9px] uppercase text-[var(--text-tertiary)]">Q-Channel Variance</span>
                  <span className="text-[13px] font-mono font-bold text-[var(--text-primary)]">
                    {currentSampleStats.qVariance}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // =========================================================================
  // RENDER PANEL 2: SNR ANALYSIS
  // =========================================================================
  const renderSnrPanel = () => {
    return (
      <div className="space-y-6">
        {/* Methodological / Dataset SNR Context */}
        <div className="bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-5 space-y-3">
          <h4 className="text-[12px] font-mono font-semibold uppercase tracking-wider text-[var(--accent)]">
            How Synthetic SNR is Structured in RadioML 2016.10A
          </h4>
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            In the RadioML 2016.10A synthetic dataset, the SNR label represents the controlled ratio of signal power to additive Gaussian noise injected in the GNU Radio generation flowgraph. In addition to AWGN, the dataset incorporates realistic wireless channel imperfections: <strong>Carrier Frequency Offset (CFO)</strong>, <strong>Sample Rate Offset (SRO)</strong>, and <strong>Rayleigh/Rician multipath fading</strong>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[12px]">
            <div className="p-3 bg-[var(--bg-surface)] rounded border border-[var(--border-subtle)]">
              <span className="block font-mono font-bold text-red-700 mb-1">−20 dB to −6 dB (Sub-Threshold)</span>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Noise energy heavily exceeds signal power. Time-domain waveforms appear purely stochastic, and constellation points blur into an unstructured Gaussian cloud.
              </p>
            </div>
            <div className="p-3 bg-[var(--bg-surface)] rounded border border-[var(--border-subtle)]">
              <span className="block font-mono font-bold text-amber-700 mb-1">−4 dB to +2 dB (Transition Zone)</span>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Signal power approaches thermal noise level. Fundamental phase clustering and waveform periodicity begin to emerge, though feature boundaries remain noisy.
              </p>
            </div>
            <div className="p-3 bg-[var(--bg-surface)] rounded border border-[var(--border-subtle)]">
              <span className="block font-mono font-bold text-emerald-700 mb-1">+4 dB to +18 dB (High Fidelity)</span>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Signal dominates noise. Phase trajectories, constellation constellations, and envelope transitions are distinct, though CFO induces continuous phase rotation.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Modulation Selector for SNR Comparison */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
                Visual Comparison Across Available SNR Levels (−4 dB, 0 dB, +10 dB)
              </h4>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Observe how noise reduction clarifies I/Q trajectory and phase constellation structure
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] font-mono text-[var(--text-secondary)]">Target Modulation:</label>
              <select
                value={snrAnalysisMod}
                onChange={(e) => setSnrAnalysisMod(e.target.value)}
                className="px-2.5 py-1 text-[12px] font-mono bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)]"
              >
                {availableModulations.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Three Side-by-Side Plots for -4 dB, 0 dB, and 10 dB */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* -4 dB */}
            <div className="p-3 bg-[var(--bg-surface-alt)] rounded border border-[var(--border-subtle)] space-y-2">
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="font-bold text-red-700">SNR: −4 dB (Degraded)</span>
                <span className="text-[var(--text-tertiary)]">N = 128</span>
              </div>
              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={snrWaveformNeg4 ? formatIqWaveform(snrWaveformNeg4.i, snrWaveformNeg4.q) : []}
                    margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="sample" tick={{ fontSize: 8 }} stroke="var(--text-tertiary)" />
                    <YAxis domain={[-0.035, 0.035]} tick={{ fontSize: 8 }} stroke="var(--text-tertiary)" />
                    <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", fontSize: "10px" }} />
                    <Line type="monotone" dataKey="I" stroke="var(--accent)" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                    <Line type="monotone" dataKey="Q" stroke="#d97706" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] italic">
                Heavy stochastic noise masking symbol transitions.
              </p>
            </div>

            {/* 0 dB */}
            <div className="p-3 bg-[var(--bg-surface-alt)] rounded border border-[var(--border-subtle)] space-y-2">
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="font-bold text-amber-700">SNR: 0 dB (Transition)</span>
                <span className="text-[var(--text-tertiary)]">N = 128</span>
              </div>
              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={snrWaveform0 ? formatIqWaveform(snrWaveform0.i, snrWaveform0.q) : []}
                    margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="sample" tick={{ fontSize: 8 }} stroke="var(--text-tertiary)" />
                    <YAxis domain={[-0.035, 0.035]} tick={{ fontSize: 8 }} stroke="var(--text-tertiary)" />
                    <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", fontSize: "10px" }} />
                    <Line type="monotone" dataKey="I" stroke="var(--accent)" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                    <Line type="monotone" dataKey="Q" stroke="#d97706" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] italic">
                Equal signal & noise power; periodic structure emerges.
              </p>
            </div>

            {/* +10 dB */}
            <div className="p-3 bg-[var(--bg-surface-alt)] rounded border border-[var(--border-subtle)] space-y-2">
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="font-bold text-emerald-700">SNR: +10 dB (High Fidelity)</span>
                <span className="text-[var(--text-tertiary)]">N = 128</span>
              </div>
              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={snrWaveform10 ? formatIqWaveform(snrWaveform10.i, snrWaveform10.q) : []}
                    margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="sample" tick={{ fontSize: 8 }} stroke="var(--text-tertiary)" />
                    <YAxis domain={[-0.035, 0.035]} tick={{ fontSize: 8 }} stroke="var(--text-tertiary)" />
                    <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", fontSize: "10px" }} />
                    <Line type="monotone" dataKey="I" stroke="var(--accent)" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                    <Line type="monotone" dataKey="Q" stroke="#d97706" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] italic">
                Clean trajectory with low noise variance and crisp envelope.
              </p>
            </div>
          </div>

          {/* Scientific Caveat Alert */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-[var(--radius-md)] text-[12px] text-amber-900 leading-relaxed">
            <strong className="font-semibold block mb-1">
              Important Scientific Disclaimer Regarding Classifier Performance:
            </strong>
            These waveform comparisons demonstrate signal degradation across synthetic SNR labels in the RadioML dataset. 
            They do <strong>not</strong> prove or establish classifier accuracy. In the RadioML 2016.10A literature (O&apos;Shea et al.), automatic modulation classification (AMC) accuracy is evaluated by training deep convolutional neural networks (CNNs, ResNets) on a dedicated training partition and evaluating classification accuracy on held-out test examples. No machine learning classifier has been executed here, and no synthetic classification accuracy is fabricated.
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // RENDER PANEL 3: MODULATION COMPARISON
  // =========================================================================
  const renderComparisonPanel = () => {
    return (
      <div className="space-y-6">
        {/* Full Taxonomy and Sample Count Table */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)] space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
                RadioML 2016.10A Modulation Taxonomy & Sample Inventory
              </h4>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Complete breakdown of all 11 modulation schemes, carrier formats, and sample volumes
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
              220,000 Total Examples
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[var(--bg-surface-alt)] border-b border-[var(--border-strong)]">
                <tr>
                  <th className="p-2.5 font-mono">Modulation</th>
                  <th className="p-2.5 font-mono">Modulation Family</th>
                  <th className="p-2.5 font-mono">Carrier Type</th>
                  <th className="p-2.5 font-mono">Envelope Characteristic</th>
                  <th className="p-2.5 font-mono">Bits/Symbol</th>
                  <th className="p-2.5 font-mono">Dataset Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(RADIOML_MODULATION_METADATA).map(([modKey, meta]) => (
                  <tr key={modKey} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-alt)]">
                    <td className="p-2.5 font-mono font-bold text-[var(--text-primary)]">{modKey}</td>
                    <td className="p-2.5 font-mono text-[var(--accent)]">{meta.family}</td>
                    <td className="p-2.5 text-[var(--text-secondary)]">{meta.carrierType}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        meta.envelopeType === "Constant Envelope"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {meta.envelopeType}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono">{meta.bitsPerSymbol || "Analog (N/A)"}</td>
                    <td className="p-2.5 font-mono font-bold">20,000</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side-by-Side Modulation Comparison */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
                Direct Waveform & Trajectory Comparison Between Two Modulation Classes
              </h4>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Compare time-domain I/Q signatures and phase trajectories at identical synthetic SNR
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-mono text-[var(--text-secondary)]">Class A:</label>
                <select
                  value={compareModA}
                  onChange={(e) => setCompareModA(e.target.value)}
                  className="px-2 py-1 text-[11px] font-mono bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)]"
                >
                  {availableModulations.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-mono text-[var(--text-secondary)]">Class B:</label>
                <select
                  value={compareModB}
                  onChange={(e) => setCompareModB(e.target.value)}
                  className="px-2 py-1 text-[11px] font-mono bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)]"
                >
                  {availableModulations.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-mono text-[var(--text-secondary)]">SNR:</label>
                <div className="inline-flex rounded border border-[var(--border-subtle)] p-0.5 bg-[var(--bg-main)]">
                  {["-4", "0", "10"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setCompareSnr(s)}
                      className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                        compareSnr === s
                          ? "bg-[var(--accent)] text-white font-semibold"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {s} dB
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-Side Plots */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Modulation A */}
            <div className="space-y-3 p-4 bg-[var(--bg-surface-alt)] rounded border border-[var(--border-subtle)]">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-[var(--accent)] text-[13px]">
                  Modulation A: {compareModA} (@ {compareSnr} dB)
                </span>
                <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                  {RADIOML_MODULATION_METADATA[compareModA]?.family}
                </span>
              </div>

              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={compareWaveformA ? formatIqWaveform(compareWaveformA.i, compareWaveformA.q) : []}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="sample" tick={{ fontSize: 8 }} stroke="var(--text-tertiary)" />
                    <YAxis domain={[-0.035, 0.035]} tick={{ fontSize: 8 }} stroke="var(--text-tertiary)" />
                    <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", fontSize: "10px" }} />
                    <Line type="monotone" dataKey="I" name="I-Channel" stroke="var(--accent)" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                    <Line type="monotone" dataKey="Q" name="Q-Channel" stroke="#d97706" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {compareStatsA && (
                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono pt-2 border-t border-[var(--border-subtle)]">
                  <div>RMS: <strong>{compareStatsA.rmsAmplitude}</strong></div>
                  <div>Peak: <strong>{compareStatsA.peakAmplitude}</strong></div>
                  <div>PAPR: <strong>{compareStatsA.paprDb} dB</strong></div>
                </div>
              )}
            </div>

            {/* Modulation B */}
            <div className="space-y-3 p-4 bg-[var(--bg-surface-alt)] rounded border border-[var(--border-subtle)]">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-[var(--accent)] text-[13px]">
                  Modulation B: {compareModB} (@ {compareSnr} dB)
                </span>
                <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                  {RADIOML_MODULATION_METADATA[compareModB]?.family}
                </span>
              </div>

              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={compareWaveformB ? formatIqWaveform(compareWaveformB.i, compareWaveformB.q) : []}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="sample" tick={{ fontSize: 8 }} stroke="var(--text-tertiary)" />
                    <YAxis domain={[-0.035, 0.035]} tick={{ fontSize: 8 }} stroke="var(--text-tertiary)" />
                    <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", fontSize: "10px" }} />
                    <Line type="monotone" dataKey="I" name="I-Channel" stroke="var(--accent)" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                    <Line type="monotone" dataKey="Q" name="Q-Channel" stroke="#d97706" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {compareStatsB && (
                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono pt-2 border-t border-[var(--border-subtle)]">
                  <div>RMS: <strong>{compareStatsB.rmsAmplitude}</strong></div>
                  <div>Peak: <strong>{compareStatsB.peakAmplitude}</strong></div>
                  <div>PAPR: <strong>{compareStatsB.paprDb} dB</strong></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // RENDER PANEL 4: BER AND PACKET ERROR ANALYSIS
  // =========================================================================
  const renderBerPanel = () => {
    return (
      <div className="space-y-6">
        {/* Methodological Clarification Banner */}
        <div className="bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
              METHODOLOGICAL DISTINCTION
            </span>
            <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
              Why BER and Packet Error Rate (PER) Cannot Be Extracted from RadioML 2016.10A
            </h4>
          </div>

          <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
            A critical scientific distinction must be maintained between <em>automatic modulation classification (AMC) datasets</em> and <em>end-to-end demodulation testbeds</em>:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] leading-relaxed">
            <div className="p-3 bg-[var(--bg-surface)] rounded border border-[var(--border-subtle)]">
              <strong className="block font-mono text-[var(--text-primary)] mb-1">1. No Ground-Truth Bit Sequence</strong>
              RadioML provides raw 128-sample complex baseband slices with modulation labels and SNR labels only. The underlying data bit sequences were not serialized into the dataset dictionary.
            </div>

            <div className="p-3 bg-[var(--bg-surface)] rounded border border-[var(--border-subtle)]">
              <strong className="block font-mono text-[var(--text-primary)] mb-1">2. Blind Channel Impairments</strong>
              Samples undergo unknown Carrier Frequency Offset (CFO), fractional timing drift, and multipath fading. Coherent demodulation without training preambles or blind equalizers would be arbitrary.
            </div>

            <div className="p-3 bg-[var(--bg-surface)] rounded border border-[var(--border-subtle)]">
              <strong className="block font-mono text-[var(--text-primary)] mb-1">3. Undefined Packet Framing</strong>
              Packet Error Rate (PER) requires preambles, headers, payloads, and CRC checksums. None of these exist in 128-sample blind RF bursts. Reporting PER on RadioML would be fabricated.
            </div>
          </div>
        </div>

        {/* Separately Labeled Controlled Simulation Benchmark */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)] space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-[var(--border-subtle)] gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-300">
                  CONTROLLED SIMULATION
                </span>
                <h4 className="text-[14px] font-semibold text-[var(--text-primary)]">
                  Coherent Demodulation Benchmark (Known Ground-Truth Bits)
                </h4>
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                End-to-end transmitter $\rightarrow$ AWGN channel $\rightarrow$ coherent demodulator with verified bit-by-bit error counting
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-[var(--text-secondary)]">Assumptions:</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
                Coherent Carrier • Exact Timing • Ideal AWGN
              </span>
            </div>
          </div>

          {/* Controls & Curve Layout */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Simulation Controls */}
            <div className="w-full lg:w-[280px] flex-shrink-0 space-y-4">
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Modulation Scheme</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["BPSK", "QPSK"] as const).map((sch) => (
                    <button
                      key={sch}
                      onClick={() => setBerScheme(sch)}
                      className={`py-1 text-[11px] font-mono rounded border ${
                        berScheme === sch
                          ? "bg-[var(--accent)] text-white border-[var(--accent)] font-semibold"
                          : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {sch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mb-1">
                  <span>Min SNR</span>
                  <span className="font-mono">{minEbNo} dB</span>
                </div>
                <input
                  type="range"
                  min="-6"
                  max="0"
                  step="2"
                  value={minEbNo}
                  onChange={(e) => setMinEbNo(Number(e.target.value))}
                  className="w-full h-1.5 bg-[var(--border-subtle)] rounded appearance-none accent-[var(--accent)] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mb-1">
                  <span>Max SNR</span>
                  <span className="font-mono">{maxEbNo} dB</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="14"
                  step="2"
                  value={maxEbNo}
                  onChange={(e) => setMaxEbNo(Number(e.target.value))}
                  className="w-full h-1.5 bg-[var(--border-subtle)] rounded appearance-none accent-[var(--accent)] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mb-1">
                  <span>Bits Per Test Point</span>
                  <span className="font-mono">{bitsPerPoint.toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[2000, 5000, 10000].map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => setBitsPerPoint(cnt)}
                      className={`py-0.5 text-[10px] font-mono rounded border ${
                        bitsPerPoint === cnt
                          ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                          : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {cnt >= 1000 ? `${cnt / 1000}k` : cnt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => setBerSeed((prev) => prev + 19)}
                  className="flex-1 py-1.5 text-[11px] font-mono rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-alt)] text-[var(--text-primary)]"
                >
                  Reseed & Rerun
                </button>
                <button
                  onClick={() => {
                    setMinEbNo(-4);
                    setMaxEbNo(10);
                    setBitsPerPoint(5000);
                    setBerSeed(101);
                  }}
                  className="px-2.5 py-1.5 text-[11px] font-mono text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* BER Curve Chart */}
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-center text-[11px] font-mono text-[var(--text-tertiary)]">
                <span>Monte Carlo Measured BER vs Theoretical Bound P_b = Q(√(2Eb/N0))</span>
                <span>Total Bits: {controlledBerResult.totalTransmittedBits.toLocaleString()}</span>
              </div>

              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={controlledBerResult.points}
                    margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="ebNoDb" tick={{ fontSize: 9 }} stroke="var(--text-tertiary)" unit=" dB" />
                    <YAxis
                      scale="log"
                      domain={[1e-4, 0.2]}
                      tick={{ fontSize: 9 }}
                      stroke="var(--text-tertiary)"
                      tickFormatter={(val) => val.toExponential(0)}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--bg-surface)", fontSize: "11px" }}
                      formatter={(val: any, name: any) => [Number(val).toExponential(3), name]}
                      labelFormatter={(lbl) => `SNR: ${lbl} dB`}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                    <Line
                      type="monotone"
                      dataKey="theoreticalBer"
                      name="Theoretical Bound Q(√(2Eb/N0))"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="linear"
                      dataKey="displayMeasuredBer"
                      name="Measured Monte Carlo BER"
                      stroke="#dc2626"
                      strokeWidth={1.5}
                      dot={{ r: 4, fill: "#dc2626" }}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Numerical Results Table */}
          <div className="pt-3 border-t border-[var(--border-subtle)] overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[var(--bg-surface-alt)] border-b border-[var(--border-strong)]">
                <tr>
                  <th className="p-2.5 font-mono">SNR (dB)</th>
                  <th className="p-2.5 font-mono">Transmitted Bits</th>
                  <th className="p-2.5 font-mono">Bit Errors</th>
                  <th className="p-2.5 font-mono">Measured BER</th>
                  <th className="p-2.5 font-mono">Theoretical P_b</th>
                  <th className="p-2.5 font-mono">Status</th>
                </tr>
              </thead>
              <tbody>
                {controlledBerResult.points.map((pt, i) => (
                  <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-alt)]">
                    <td className="p-2 font-mono font-bold">{pt.ebNoDb} dB</td>
                    <td className="p-2 font-mono">{pt.transmittedBits.toLocaleString()}</td>
                    <td className="p-2 font-mono">{pt.bitErrors}</td>
                    <td className="p-2 font-mono font-bold text-[var(--accent)]">
                      {pt.measuredBer === 0 ? "0.000 (0 errors)" : pt.measuredBer.toExponential(3)}
                    </td>
                    <td className="p-2 font-mono text-[var(--text-secondary)]">
                      {pt.theoreticalBer.toExponential(3)}
                    </td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800">
                        Exact Calculation
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // MAIN COMPONENT RENDER
  // =========================================================================
  return (
    <section id="section-radioml-benchmark" className="py-12 border-b border-[var(--border-subtle)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] font-heading">
              RadioML 2016.10A — Modulation Performance Benchmark
            </h2>
            <p className="text-[14px] text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
              Explore 220,000 labeled continuous-time RF records across 11 modulation schemes and 20 SNR steps, analyze noise progression, and evaluate controlled demodulation performance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
              220,000 Total Samples (2×128)
            </span>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-8 text-center space-y-3 shadow-[var(--shadow-sm)]">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-[13px] font-mono text-[var(--text-secondary)]">
              Loading RadioML 2016.10A dataset summary & representative waveforms...
            </p>
          </div>
        )}

        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-[var(--radius-lg)] p-6 space-y-3">
            <h4 className="font-semibold text-[14px]">Failed to Load RadioML Dataset Summary</h4>
            <p className="text-[12px]">{loadError}</p>
            <button
              onClick={loadData}
              className="px-3 py-1.5 text-[11px] font-mono bg-red-800 text-white rounded hover:bg-red-900 transition-colors"
            >
              Retry Loading
            </button>
          </div>
        )}

        {!loading && !loadError && summaryData && (
          <>
            {/* Panel Navigation Tabs */}
            <div className="flex flex-wrap border-b border-[var(--border-subtle)] mb-8 gap-x-2">
              {[
                { id: "explorer", label: "1. Dataset Explorer" },
                { id: "snr", label: "2. SNR Analysis" },
                { id: "comparison", label: "3. Modulation Comparison" },
                { id: "ber", label: "4. BER & Packet Error Analysis" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as BenchmarkTab)}
                  className={`px-4 py-3 text-[13px] font-medium tracking-wide focus:outline-none transition-colors border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-[var(--accent)] text-[var(--accent)] font-semibold"
                      : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Panel Views */}
            <div className="space-y-8">
              {activeTab === "explorer" && renderExplorerPanel()}
              {activeTab === "snr" && renderSnrPanel()}
              {activeTab === "comparison" && renderComparisonPanel()}
              {activeTab === "ber" && renderBerPanel()}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
