"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  LFSR_PRESETS,
  simulatePnSequence,
  LfsrStep
} from "@/utils/simulations/pnSequence";
import {
  simulateDsss,
  DsssSimulationResult
} from "@/utils/simulations/dsss";
import {
  simulateFhss,
  FhssSimulationResult
} from "@/utils/simulations/fhss";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  AreaChart,
  Area,
  BarChart,
  Bar
} from "recharts";

type PnTab = "lfsr" | "dsss" | "fhss" | "compare";

export default function PnSequence() {
  const [activeTab, setActiveTab] = useState<PnTab>("lfsr");

  // ==========================================
  // 1. LFSR TAB STATE
  // ==========================================
  const [m, setM] = useState<number>(4);
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [customTaps, setCustomTaps] = useState<number[]>([4, 3]);
  const [seed, setSeed] = useState<string>("1000");
  const [numChips, setNumChips] = useState<number>(32);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const handleMChange = (newM: number) => {
    setM(newM);
    setSelectedPresetIdx(0);
    const preset = LFSR_PRESETS[newM][0];
    setCustomTaps(preset.taps);
    const newSeed = "1" + "0".repeat(newM - 1);
    setSeed(newSeed);
    setCurrentStepIdx(0);
    setIsPlaying(false);
  };

  const handlePresetChange = (idx: number) => {
    setSelectedPresetIdx(idx);
    if (idx >= 0 && LFSR_PRESETS[m][idx]) {
      setCustomTaps(LFSR_PRESETS[m][idx].taps);
      setCurrentStepIdx(0);
      setIsPlaying(false);
    }
  };

  const handleToggleTap = (tapStage: number) => {
    setSelectedPresetIdx(-1);
    setCustomTaps(prev => {
      if (prev.includes(tapStage)) {
        return prev.filter(t => t !== tapStage).sort((a, b) => b - a);
      } else {
        return [...prev, tapStage].sort((a, b) => b - a);
      }
    });
    setCurrentStepIdx(0);
    setIsPlaying(false);
  };

  const handleSeedPreset = (type: "single" | "allOnes" | "random") => {
    if (type === "single") {
      setSeed("1" + "0".repeat(m - 1));
    } else if (type === "allOnes") {
      setSeed("1".repeat(m));
    } else {
      let r = "";
      for (let i = 0; i < m; i++) r += Math.random() > 0.5 ? "1" : "0";
      if (!r.includes("1")) r = "1" + r.slice(1);
      setSeed(r);
    }
    setCurrentStepIdx(0);
    setIsPlaying(false);
  };

  const lfsrSim = useMemo(() => {
    return simulatePnSequence(m, customTaps, seed, numChips);
  }, [m, customTaps, seed, numChips]);

  const safeStepIdx = lfsrSim.steps.length > 0 ? Math.min(currentStepIdx, lfsrSim.steps.length - 1) : 0;

  useEffect(() => {
    if (!isPlaying || !lfsrSim.valid || lfsrSim.steps.length === 0) return;
    const interval = setInterval(() => {
      setCurrentStepIdx(prev => {
        if (prev >= lfsrSim.steps.length - 1) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 900);
    return () => clearInterval(interval);
  }, [isPlaying, lfsrSim.valid, lfsrSim.steps.length]);

  const currentStep: LfsrStep | undefined = lfsrSim.steps[safeStepIdx] || lfsrSim.steps[0];

  // ==========================================
  // 2. DSSS TAB STATE
  // ==========================================
  const [dsssBits, setDsssBits] = useState<string>("101100101011");
  const [dsssM, setDsssM] = useState<number>(4);
  const [dsssPresetIdx, setDsssPresetIdx] = useState<number>(0);
  const [dsssTaps, setDsssTaps] = useState<number[]>([4, 3]);
  const [dsssSeed, setDsssSeed] = useState<string>("1000");
  const [dsssSpreadingFactor, setDsssSpreadingFactor] = useState<number>(15);
  const [dsssEbNoDb, setDsssEbNoDb] = useState<number>(10);
  const [dsssEnableInterference, setDsssEnableInterference] = useState<boolean>(false);
  const [dsssJammerFreqRatio, setDsssJammerFreqRatio] = useState<number>(0.15);
  const [dsssJammerPowerDb, setDsssJammerPowerDb] = useState<number>(6);
  const [dsssRngSeed, setDsssRngSeed] = useState<number>(42);

  const handleDsssMChange = (newM: number) => {
    setDsssM(newM);
    setDsssPresetIdx(0);
    const preset = LFSR_PRESETS[newM][0];
    setDsssTaps(preset.taps);
    setDsssSeed("1" + "0".repeat(newM - 1));
  };

  const handleDsssPresetChange = (idx: number) => {
    setDsssPresetIdx(idx);
    if (idx >= 0 && LFSR_PRESETS[dsssM][idx]) {
      setDsssTaps(LFSR_PRESETS[dsssM][idx].taps);
    }
  };

  const generateRandomDsssBits = (len: number = 16) => {
    let s = "";
    for (let i = 0; i < len; i++) s += Math.random() > 0.5 ? "1" : "0";
    setDsssBits(s);
  };

  const dsssSim: DsssSimulationResult = useMemo(() => {
    return simulateDsss({
      dataBitsStr: dsssBits,
      m: dsssM,
      taps: dsssTaps,
      seed: dsssSeed,
      spreadingFactor: dsssSpreadingFactor,
      ebNoDb: dsssEbNoDb,
      bitRate: 1000,
      enableInterference: dsssEnableInterference,
      interferenceFreqRatio: dsssJammerFreqRatio,
      interferencePowerDb: dsssJammerPowerDb,
      rngSeed: dsssRngSeed,
    });
  }, [
    dsssBits,
    dsssM,
    dsssTaps,
    dsssSeed,
    dsssSpreadingFactor,
    dsssEbNoDb,
    dsssEnableInterference,
    dsssJammerFreqRatio,
    dsssJammerPowerDb,
    dsssRngSeed,
  ]);

  // ==========================================
  // 3. FHSS TAB STATE
  // ==========================================
  const [fhssBits, setFhssBits] = useState<string>("1100101101");
  const [fhssM, setFhssM] = useState<number>(4);
  const [fhssPresetIdx, setFhssPresetIdx] = useState<number>(0);
  const [fhssTaps, setFhssTaps] = useState<number[]>([4, 3]);
  const [fhssSeed, setFhssSeed] = useState<string>("1000");
  const [fhssNumChannels, setFhssNumChannels] = useState<number>(8);
  const [fhssChannelSpacing, setFhssChannelSpacing] = useState<number>(150);
  const [fhssBaseCarrierFreq, setFhssBaseCarrierFreq] = useState<number>(600);
  const [fhssBitsPerHop, setFhssBitsPerHop] = useState<number>(1);
  const [fhssSnrDb, setFhssSnrDb] = useState<number>(15);
  const [fhssEnableInterference, setFhssEnableInterference] = useState<boolean>(false);
  const [fhssInterferenceChannel, setFhssInterferenceChannel] = useState<number>(2);
  const [fhssInterferencePowerDb, setFhssInterferencePowerDb] = useState<number>(12);
  const [fhssRngSeed, setFhssRngSeed] = useState<number>(77);

  const handleFhssMChange = (newM: number) => {
    setFhssM(newM);
    setFhssPresetIdx(0);
    const preset = LFSR_PRESETS[newM][0];
    setFhssTaps(preset.taps);
    setFhssSeed("1" + "0".repeat(newM - 1));
  };

  const handleFhssPresetChange = (idx: number) => {
    setFhssPresetIdx(idx);
    if (idx >= 0 && LFSR_PRESETS[fhssM][idx]) {
      setFhssTaps(LFSR_PRESETS[fhssM][idx].taps);
    }
  };

  const generateRandomFhssBits = (len: number = 12) => {
    let s = "";
    for (let i = 0; i < len; i++) s += Math.random() > 0.5 ? "1" : "0";
    setFhssBits(s);
  };

  const fhssSim: FhssSimulationResult = useMemo(() => {
    return simulateFhss({
      dataBitsStr: fhssBits,
      m: fhssM,
      taps: fhssTaps,
      seed: fhssSeed,
      numChannels: fhssNumChannels,
      channelSpacing: fhssChannelSpacing,
      baseCarrierFreq: fhssBaseCarrierFreq,
      bitsPerHop: fhssBitsPerHop,
      bitRate: 100,
      snrDb: fhssSnrDb,
      enableInterference: fhssEnableInterference,
      interferenceChannelIdx: fhssInterferenceChannel,
      interferencePowerDb: fhssInterferencePowerDb,
      rngSeed: fhssRngSeed,
    });
  }, [
    fhssBits,
    fhssM,
    fhssTaps,
    fhssSeed,
    fhssNumChannels,
    fhssChannelSpacing,
    fhssBaseCarrierFreq,
    fhssBitsPerHop,
    fhssSnrDb,
    fhssEnableInterference,
    fhssInterferenceChannel,
    fhssInterferencePowerDb,
    fhssRngSeed,
  ]);

  // Synchronized Test for Comparison Tab
  const handleSyncComparativeTest = () => {
    const testBits = "1011001011010011";
    setDsssBits(testBits);
    setFhssBits(testBits);
    setDsssEbNoDb(8);
    setFhssSnrDb(8);
    setDsssEnableInterference(true);
    setFhssEnableInterference(true);
    setDsssJammerPowerDb(10);
    setFhssInterferencePowerDb(10);
    setDsssRngSeed(Date.now());
    setFhssRngSeed(Date.now() + 1);
  };

  // =========================================================================
  // RENDER TAB 1: LFSR & PN GENERATOR
  // =========================================================================
  const renderLfsrTab = () => {
    return (
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Controls Column */}
        <div className="w-full lg:w-[320px] flex-shrink-0 space-y-6">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)] space-y-5">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
              LFSR Configuration
            </h3>

            {/* Stages m */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[12px] font-medium text-[var(--text-secondary)]">Register Stages (m)</label>
                <span className="text-[12px] font-mono font-bold text-[var(--accent)]">{m} stages</span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {[3, 4, 5, 6, 7, 8].map(stages => (
                  <button
                    key={stages}
                    onClick={() => handleMChange(stages)}
                    className={`py-1 text-[12px] font-mono rounded-[var(--radius-sm)] border transition-colors ${
                      m === stages
                        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                        : "bg-transparent text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    {stages}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Theoretical max period: 2^{m} - 1 = {(1 << m) - 1} chips</p>
            </div>

            {/* Polynomial Presets */}
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
                Feedback Polynomial
              </label>
              <select
                value={selectedPresetIdx}
                onChange={e => handlePresetChange(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-[12px] font-mono bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                {LFSR_PRESETS[m]?.map((preset, idx) => (
                  <option key={idx} value={idx}>
                    {preset.name} : {preset.polynomial}
                  </option>
                ))}
                <option value={-1}>Custom Tap Selection...</option>
              </select>
            </div>

            {/* Feedback Taps Toggles */}
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                Active Feedback Taps (1..{m})
              </label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {Array.from({ length: m }, (_, i) => i + 1).map(stage => {
                  const isTapped = customTaps.includes(stage);
                  return (
                    <button
                      key={stage}
                      onClick={() => handleToggleTap(stage)}
                      className={`px-2.5 py-1 text-[11px] font-mono rounded-[var(--radius-sm)] border transition-colors ${
                        isTapped
                          ? "bg-[var(--accent)] text-white border-[var(--accent)] font-semibold"
                          : "bg-transparent text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                      }`}
                      title={stage === m ? "Stage m (monic degree tap)" : `Tap stage ${stage}`}
                    >
                      s{stage}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5 font-mono">
                Formula: {lfsrSim.feedbackEquation}
              </p>
            </div>

            {/* Initial Seed State */}
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">
                Initial Seed State ({m} bits)
              </label>
              <input
                type="text"
                value={seed}
                maxLength={m}
                onChange={e => {
                  const cleaned = e.target.value.replace(/[^01]/g, "");
                  setSeed(cleaned);
                  setCurrentStepIdx(0);
                  setIsPlaying(false);
                }}
                className="w-full px-3 py-1.5 text-[13px] font-mono tracking-widest bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                placeholder={`e.g. 1${"0".repeat(m - 1)}`}
              />
              <div className="flex gap-1.5 mt-2">
                <button
                  onClick={() => handleSeedPreset("single")}
                  className="px-2 py-1 text-[10px] font-mono rounded border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[var(--text-secondary)]"
                >
                  10...0
                </button>
                <button
                  onClick={() => handleSeedPreset("allOnes")}
                  className="px-2 py-1 text-[10px] font-mono rounded border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[var(--text-secondary)]"
                >
                  11...1
                </button>
                <button
                  onClick={() => handleSeedPreset("random")}
                  className="px-2 py-1 text-[10px] font-mono rounded border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[var(--text-secondary)]"
                >
                  Random
                </button>
              </div>
            </div>

            {/* Generated Chips Length */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[12px] font-medium text-[var(--text-secondary)]">Output Chips Length</label>
                <span className="text-[12px] font-mono">{numChips} chips</span>
              </div>
              <input
                type="range"
                min="16"
                max="128"
                step="8"
                value={numChips}
                onChange={e => setNumChips(Number(e.target.value))}
                className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right: Schematics & Telemetry Column */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {/* Error Banner */}
          {!lfsrSim.valid && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-[var(--radius-md)] p-4 text-[13px]">
              <strong className="font-semibold">Configuration Error:</strong> {lfsrSim.errorMessage}
            </div>
          )}

          {/* 1. Register Architecture Diagram */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <div>
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                  Shift Register Architecture (Fibonacci Right-Shift)
                </h3>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  Clock Cycle: <span className="font-mono font-bold text-[var(--text-primary)]">k = {safeStepIdx}</span> | 
                  Current State: <span className="font-mono font-bold text-[var(--accent)]">[{currentStep?.stateStr || seed}]</span>
                </p>
              </div>

              {/* Stepper Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentStepIdx(0)}
                  className="px-2.5 py-1 text-[11px] font-mono border border-[var(--border-subtle)] rounded-[var(--radius-sm)] hover:bg-[var(--bg-surface-alt)]"
                >
                  Rewind
                </button>
                <button
                  onClick={() => setCurrentStepIdx(prev => Math.max(0, prev - 1))}
                  disabled={safeStepIdx === 0}
                  className="px-2.5 py-1 text-[11px] font-mono border border-[var(--border-subtle)] rounded-[var(--radius-sm)] hover:bg-[var(--bg-surface-alt)] disabled:opacity-40"
                >
                  Step Prev
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-3 py-1 text-[11px] font-mono rounded-[var(--radius-sm)] text-white transition-colors ${
                    isPlaying ? "bg-amber-600 hover:bg-amber-700" : "bg-[var(--accent)] hover:opacity-90"
                  }`}
                >
                  {isPlaying ? "Pause" : "Play Clocks"}
                </button>
                <button
                  onClick={() => setCurrentStepIdx(prev => Math.min(lfsrSim.steps.length - 1, prev + 1))}
                  disabled={safeStepIdx >= lfsrSim.steps.length - 1}
                  className="px-2.5 py-1 text-[11px] font-mono border border-[var(--border-subtle)] rounded-[var(--radius-sm)] hover:bg-[var(--bg-surface-alt)] disabled:opacity-40"
                >
                  Step Next
                </button>
              </div>
            </div>

            {/* Visual Register Stages */}
            <div className="p-4 bg-[var(--bg-surface-alt)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] overflow-x-auto">
              <div className="flex items-center justify-between min-w-[550px] gap-2 py-2">
                {/* Feedback Input Node */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full border-2 border-[var(--accent)] bg-[var(--accent)]/10 flex items-center justify-center font-bold text-[13px] text-[var(--accent)] shadow-sm">
                    {currentStep?.feedbackBit ?? 0}
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)] mt-1">Feedback f</span>
                </div>

                <span className="text-[var(--accent)] text-lg font-bold">→</span>

                {/* Flip-Flop Register Blocks */}
                {Array.from({ length: m }, (_, i) => {
                  const stageNum = i + 1;
                  const isTapped = customTaps.includes(stageNum);
                  const stageVal = currentStep ? currentStep.state[i] : 0;
                  return (
                    <div key={stageNum} className="flex flex-col items-center flex-1 max-w-[80px]">
                      <div
                        className={`w-full py-2.5 px-1 rounded-[var(--radius-sm)] border text-center font-mono transition-all ${
                          isTapped
                            ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/30"
                            : "border-[var(--border-strong)] bg-[var(--bg-main)]"
                        }`}
                      >
                        <span className="block text-[9px] uppercase tracking-wider text-[var(--text-tertiary)]">
                          s{stageNum} {isTapped && "•"}
                        </span>
                        <span className="text-[16px] font-bold text-[var(--text-primary)]">
                          {stageVal}
                        </span>
                      </div>
                      <span className="text-[9px] text-[var(--text-tertiary)] mt-1">
                        {isTapped ? "Tapped" : "—"}
                      </span>
                    </div>
                  );
                })}

                <span className="text-[var(--text-tertiary)] text-lg font-bold">→</span>

                {/* Output Chip Block */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-md border-2 border-emerald-600 bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-[15px] font-mono shadow-sm">
                    {currentStep?.outputBit ?? 0}
                  </div>
                  <span className="text-[10px] font-mono text-emerald-700 font-semibold mt-1">Output Bit</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Observed Period (P)</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[20px] font-mono font-bold text-[var(--accent)]">{lfsrSim.period}</span>
                <span className="text-[11px] text-[var(--text-tertiary)]">chips</span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">Max theoretical: {(1 << m) - 1}</p>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Maximality</p>
              <span className={`inline-block px-2 py-0.5 text-[11px] font-mono font-semibold rounded mt-1 ${
                lfsrSim.isMaximal ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"
              }`}>
                {lfsrSim.isMaximal ? "Maximal (m-seq)" : "Non-Maximal"}
              </span>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                {lfsrSim.isMaximal ? "Primitive polynomial" : "Sub-cycle recursion"}
              </p>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Balance Property</p>
              <p className="text-[14px] font-mono font-semibold text-[var(--text-primary)]">
                1s: {lfsrSim.balance.ones} | 0s: {lfsrSim.balance.zeros}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                |N₁ - N₀| = {lfsrSim.balance.diff} {lfsrSim.balance.diff === 1 ? "(Golomb 1 Pass)" : ""}
              </p>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Run Property</p>
              <p className="text-[14px] font-mono font-semibold text-[var(--text-primary)]">
                {lfsrSim.runs.totalRuns} Runs
              </p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                1-runs: {lfsrSim.runs.onesRuns} | 0-runs: {lfsrSim.runs.zerosRuns}
              </p>
            </div>
          </div>

          {/* 3. Waveform Chart */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                  PN Digital Output Waveform
                </h3>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  Periodic chip pulses with period boundary marker at P = {lfsrSim.period} chips
                </p>
              </div>
              <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
                Total Shown: {numChips} chips
              </span>
            </div>

            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={lfsrSim.chartData} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} stroke="var(--text-tertiary)" domain={[0, numChips]} />
                  <YAxis ticks={[0, 1]} domain={[-0.2, 1.2]} tick={{ fontSize: 10 }} stroke="var(--text-tertiary)" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)", fontSize: "11px" }}
                    formatter={(v: any) => [v, "Chip Amplitude"]}
                    labelFormatter={(label) => `Time: ${Number(label).toFixed(2)} Tc`}
                  />
                  {lfsrSim.period > 0 && lfsrSim.period < numChips && (
                    <ReferenceArea x1={0} x2={lfsrSim.period} fill="var(--accent)" fillOpacity={0.06} />
                  )}
                  {lfsrSim.period > 0 && lfsrSim.period < numChips && (
                    <ReferenceLine x={lfsrSim.period} stroke="var(--accent)" strokeDasharray="4 4" label={{ value: `P = ${lfsrSim.period}`, position: "top", fontSize: 10, fill: "var(--accent)" }} />
                  )}
                  <Line type="linear" dataKey="Amplitude" stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Sequence Inspector & State Progression Table */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-2">
              Generated PN Binary Stream
            </h3>
            <p className="text-[11px] text-[var(--text-tertiary)] mb-3">
              First cycle highlighted in blue. Current clock output bit highlighted in bold.
            </p>
            <div className="p-3 bg-[var(--bg-main)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] font-mono text-[12px] leading-relaxed break-all">
              {lfsrSim.outputBits.map((bit, idx) => {
                const inFirstPeriod = idx < lfsrSim.period;
                const isCurrent = idx === safeStepIdx;
                return (
                  <span
                    key={idx}
                    className={`inline-block px-1 py-0.5 rounded transition-colors ${
                      isCurrent
                        ? "bg-[var(--accent)] text-white font-bold ring-2 ring-[var(--accent)]"
                        : inFirstPeriod
                        ? "bg-[var(--accent)]/15 text-[var(--accent)] font-semibold"
                        : "text-[var(--text-secondary)]"
                    } ${idx > 0 && idx % 8 === 0 ? "ml-2" : ""}`}
                  >
                    {bit}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // RENDER TAB 2: DIRECT SEQUENCE SPREAD SPECTRUM (DSSS)
  // =========================================================================
  const renderDsssTab = () => {
    return (
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Controls Column */}
        <div className="w-full lg:w-[320px] flex-shrink-0 space-y-6">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)] space-y-5">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
              DSSS Transmitter Controls
            </h3>

            {/* Input Data Bits */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[12px] font-medium text-[var(--text-secondary)]">Input Data Bits</label>
                <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{dsssBits.length} bits</span>
              </div>
              <input
                type="text"
                value={dsssBits}
                onChange={e => setDsssBits(e.target.value.replace(/[^01]/g, ""))}
                className="w-full px-3 py-1.5 text-[13px] font-mono tracking-widest bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                placeholder="e.g. 1011001"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => generateRandomDsssBits(16)}
                  className="px-2 py-1 text-[11px] font-mono rounded border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[var(--text-secondary)]"
                >
                  Random 16b
                </button>
                <button
                  onClick={() => generateRandomDsssBits(32)}
                  className="px-2 py-1 text-[11px] font-mono rounded border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[var(--text-secondary)]"
                >
                  Random 32b
                </button>
              </div>
            </div>

            {/* Spreading Factor N */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                  Spreading Factor (N = Chips/Bit)
                </label>
                <span className="text-[12px] font-mono font-bold text-[var(--accent)]">{dsssSpreadingFactor} chips</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[4, 7, 11, 15, 31].map(nVal => (
                  <button
                    key={nVal}
                    onClick={() => setDsssSpreadingFactor(nVal)}
                    className={`py-1 text-[11px] font-mono rounded border transition-colors ${
                      dsssSpreadingFactor === nVal
                        ? "bg-[var(--accent)] text-white border-[var(--accent)] font-semibold"
                        : "bg-transparent text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    N = {nVal}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1 font-mono">
                Processing Gain Gp: {dsssSpreadingFactor} ({dsssSim.processingGainDb.toFixed(1)} dB)
              </p>
            </div>

            {/* PN Generator Settings */}
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-3">
              <label className="block text-[12px] font-medium text-[var(--text-primary)]">
                PN Spreading Code (LFSR)
              </label>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-[var(--text-secondary)]">Register Stages (m)</span>
                  <span className="text-[11px] font-mono">{dsssM}</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[3, 4, 5, 6, 7].map(stg => (
                    <button
                      key={stg}
                      onClick={() => handleDsssMChange(stg)}
                      className={`py-0.5 text-[11px] font-mono rounded border ${
                        dsssM === stg
                          ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                          : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {stg}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-[11px] text-[var(--text-secondary)] mb-1">Polynomial Preset</span>
                <select
                  value={dsssPresetIdx}
                  onChange={e => handleDsssPresetChange(Number(e.target.value))}
                  className="w-full px-2 py-1 text-[11px] font-mono bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)]"
                >
                  {LFSR_PRESETS[dsssM]?.map((preset, idx) => (
                    <option key={idx} value={idx}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-[11px] text-[var(--text-secondary)] mb-1">LFSR Seed</span>
                <input
                  type="text"
                  value={dsssSeed}
                  maxLength={dsssM}
                  onChange={e => setDsssSeed(e.target.value.replace(/[^01]/g, ""))}
                  className="w-full px-2 py-1 text-[11px] font-mono tracking-wider bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded"
                />
              </div>
            </div>

            {/* Channel Settings */}
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-3">
              <h4 className="text-[12px] font-medium text-[var(--text-primary)]">Channel Impairments</h4>

              {/* SNR / Eb/N0 */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">AWGN Ratio (Eb/N0)</label>
                  <span className="text-[11px] font-mono font-bold text-[var(--accent)]">{dsssEbNoDb} dB</span>
                </div>
                <input
                  type="range"
                  min="-4"
                  max="16"
                  step="1"
                  value={dsssEbNoDb}
                  onChange={e => setDsssEbNoDb(Number(e.target.value))}
                  className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)] cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-[var(--text-tertiary)] uppercase mt-0.5">
                  <span>Noisy (-4dB)</span>
                  <span>Clean (+16dB)</span>
                </div>
              </div>

              {/* Narrowband Interference */}
              <div className="p-3 bg-[var(--bg-main)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-[var(--text-primary)] cursor-pointer flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={dsssEnableInterference}
                      onChange={e => setDsssEnableInterference(e.target.checked)}
                      className="accent-[var(--accent)] rounded"
                    />
                    Narrowband Jammer
                  </label>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                    dsssEnableInterference ? "bg-amber-100 text-amber-800" : "bg-neutral-200 text-neutral-600"
                  }`}>
                    {dsssEnableInterference ? "ACTIVE" : "OFF"}
                  </span>
                </div>

                {dsssEnableInterference && (
                  <>
                    <div>
                      <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-1">
                        <span>Jammer Power (J/S)</span>
                        <span className="font-mono">{dsssJammerPowerDb} dB</span>
                      </div>
                      <input
                        type="range"
                        min="-6"
                        max="18"
                        step="2"
                        value={dsssJammerPowerDb}
                        onChange={e => setDsssJammerPowerDb(Number(e.target.value))}
                        className="w-full h-1 bg-[var(--border-subtle)] rounded appearance-none accent-amber-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-1">
                        <span>Jammer Freq (fJ / Rc)</span>
                        <span className="font-mono">{dsssJammerFreqRatio.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.45"
                        step="0.05"
                        value={dsssJammerFreqRatio}
                        onChange={e => setDsssJammerFreqRatio(Number(e.target.value))}
                        className="w-full h-1 bg-[var(--border-subtle)] rounded appearance-none accent-amber-600 cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setDsssRngSeed(prev => prev + 17)}
                  className="flex-1 py-1.5 text-[11px] font-mono font-medium rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-alt)]"
                >
                  Reseed Noise
                </button>
                <button
                  onClick={() => {
                    setDsssEbNoDb(10);
                    setDsssSpreadingFactor(15);
                    setDsssEnableInterference(false);
                    setDsssRngSeed(42);
                  }}
                  className="px-3 py-1.5 text-[11px] font-mono text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Telemetry & Waveform Visualizations */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {!dsssSim.valid && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-[var(--radius-md)] p-4 text-[13px]">
              <strong className="font-semibold">DSSS Error:</strong> {dsssSim.errorMessage}
            </div>
          )}

          {/* DSSS Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Transmitted Bits</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[20px] font-mono font-bold text-[var(--text-primary)]">{dsssSim.totalBits}</span>
                <span className="text-[11px] text-[var(--text-tertiary)]">({dsssSim.totalChips} chips)</span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">Spreading N = {dsssSim.spreadingFactor}</p>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Measured BER</p>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-[20px] font-mono font-bold ${dsssSim.bitErrors > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {dsssSim.ber.toFixed(4)}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                Errors: {dsssSim.bitErrors} / {dsssSim.totalBits} bits
              </p>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Processing Gain (Gp)</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[20px] font-mono font-bold text-[var(--accent)]">{dsssSim.processingGainLinear}</span>
                <span className="text-[11px] font-mono text-[var(--text-secondary)]">({dsssSim.processingGainDb.toFixed(2)} dB)</span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">Gp = Rc / Rb = N</p>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Theoretical AWGN BER</p>
              <span className="text-[18px] font-mono font-semibold text-[var(--text-secondary)]">
                {dsssSim.theoreticalBer < 1e-6 ? "< 10⁻⁶" : dsssSim.theoreticalBer.toExponential(2)}
              </span>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Q(√(2·Eb/N0))</p>
            </div>
          </div>

          {/* DSSS Waveforms: Transmitted vs Received */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)] space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                  Transmitted Baseband Spread Waveform s(t) = b[k] · c[n]
                </h3>
                <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                  {Math.min(24, dsssSim.totalBits)} data bits shown (±1 Bipolar)
                </span>
              </div>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dsssSim.waveform} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="t" tick={{ fontSize: 9 }} stroke="var(--text-tertiary)" />
                    <YAxis domain={[-1.4, 1.4]} ticks={[-1, 0, 1]} tick={{ fontSize: 9 }} stroke="var(--text-tertiary)" />
                    <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", fontSize: "11px" }} />
                    <Line type="stepAfter" dataKey="tx" stroke="var(--accent)" strokeWidth={1.8} dot={false} isAnimationActive={false} name="Transmitted Chips" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                  Received Waveform r(t) = s(t) + w(t) {dsssSim.interferenceEnabled ? "+ j(t) Jammer" : ""}
                </h3>
                <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                  Eb/N0: {dsssSim.snrDb} dB {dsssSim.interferenceEnabled ? `| Jammer J/S: ${dsssJammerPowerDb} dB` : ""}
                </span>
              </div>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dsssSim.waveform} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="t" tick={{ fontSize: 9 }} stroke="var(--text-tertiary)" />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9 }} stroke="var(--text-tertiary)" />
                    <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", fontSize: "11px" }} />
                    <Line type="linear" dataKey="rx" stroke={dsssSim.interferenceEnabled ? "#d97706" : "#64748b"} strokeWidth={1.2} dot={false} isAnimationActive={false} name="Received Signal" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Despread Decision Integrator Values */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                  Despread Decision Metrics y[k] = (1/N) ∑ r[n] · c[n]
                </h3>
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  Decision Rule: y[k] ≥ 0 ⇒ Bit 1, y[k] &lt; 0 ⇒ Bit 0
                </span>
              </div>
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dsssSim.despreadValues.map((v, i) => ({
                      bit: `b${i}`,
                      metric: Number(v.toFixed(3)),
                      correct: dsssSim.recoveredBits[i] === dsssSim.dataBits[i],
                    }))}
                    margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="bit" tick={{ fontSize: 9 }} stroke="var(--text-tertiary)" />
                    <YAxis domain={[-2, 2]} tick={{ fontSize: 9 }} stroke="var(--text-tertiary)" />
                    <ReferenceLine y={0} stroke="#dc2626" strokeWidth={1.5} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", fontSize: "11px" }} />
                    <Bar dataKey="metric" fill="var(--accent)" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bit-by-Bit Comparison Inspector */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-2">
              End-to-End Bit Recovery Inspector
            </h3>
            <p className="text-[11px] text-[var(--text-tertiary)] mb-4">
              Comparison between transmitted input data bits and receiver despread decisions. Erroneous bits are highlighted in red.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-[var(--bg-surface-alt)] border-b border-[var(--border-strong)]">
                  <tr>
                    <th className="p-2 font-mono">Bit Index</th>
                    <th className="p-2 font-mono">Original Bit (d)</th>
                    <th className="p-2 font-mono">Despread Metric (y_k)</th>
                    <th className="p-2 font-mono">Decision</th>
                    <th className="p-2 font-mono">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dsssSim.dataBits.slice(0, 16).map((orig, i) => {
                    const rec = dsssSim.recoveredBits[i];
                    const yk = dsssSim.despreadValues[i];
                    const isErr = orig !== rec;
                    return (
                      <tr key={i} className={`border-b border-[var(--border-subtle)] ${isErr ? "bg-red-50 text-red-900" : ""}`}>
                        <td className="p-2 font-mono">Bit #{i}</td>
                        <td className="p-2 font-mono font-bold">{orig}</td>
                        <td className="p-2 font-mono">{yk !== undefined ? yk.toFixed(3) : "—"}</td>
                        <td className="p-2 font-mono font-bold">{rec}</td>
                        <td className="p-2">
                          {isErr ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-100 text-red-800 border border-red-300">
                              BIT ERROR
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300">
                              PASS
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // RENDER TAB 3: FREQUENCY HOPPING SPREAD SPECTRUM (FHSS)
  // =========================================================================
  const renderFhssTab = () => {
    return (
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Controls Column */}
        <div className="w-full lg:w-[320px] flex-shrink-0 space-y-6">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)] space-y-5">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
              FHSS Synthesizer Controls
            </h3>

            {/* Input Data Bits */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[12px] font-medium text-[var(--text-secondary)]">Input Data Bits</label>
                <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{fhssBits.length} bits</span>
              </div>
              <input
                type="text"
                value={fhssBits}
                onChange={e => setFhssBits(e.target.value.replace(/[^01]/g, ""))}
                className="w-full px-3 py-1.5 text-[13px] font-mono tracking-widest bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                placeholder="e.g. 1100101"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => generateRandomFhssBits(12)}
                  className="px-2 py-1 text-[11px] font-mono rounded border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[var(--text-secondary)]"
                >
                  Random 12b
                </button>
                <button
                  onClick={() => generateRandomFhssBits(20)}
                  className="px-2 py-1 text-[11px] font-mono rounded border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[var(--text-secondary)]"
                >
                  Random 20b
                </button>
              </div>
            </div>

            {/* Channels & Hopping Rate */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[12px] font-medium text-[var(--text-secondary)]">Number of Hop Channels</label>
                <span className="text-[12px] font-mono font-bold text-[var(--accent)]">{fhssNumChannels} channels</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[4, 8, 16].map(ch => (
                  <button
                    key={ch}
                    onClick={() => setFhssNumChannels(ch)}
                    className={`py-1 text-[11px] font-mono rounded border transition-colors ${
                      fhssNumChannels === ch
                        ? "bg-[var(--accent)] text-white border-[var(--accent)] font-semibold"
                        : "bg-transparent text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    {ch} Channels
                  </button>
                ))}
              </div>
            </div>

            {/* Channel Spacing & Base Carrier */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">Channel Spacing (Δf)</label>
                  <span className="text-[11px] font-mono">{fhssChannelSpacing} Hz</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="250"
                  step="25"
                  value={fhssChannelSpacing}
                  onChange={e => setFhssChannelSpacing(Number(e.target.value))}
                  className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">Base Carrier (f0)</label>
                  <span className="text-[11px] font-mono">{fhssBaseCarrierFreq} Hz</span>
                </div>
                <input
                  type="range"
                  min="400"
                  max="1000"
                  step="50"
                  value={fhssBaseCarrierFreq}
                  onChange={e => setFhssBaseCarrierFreq(Number(e.target.value))}
                  className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">Bits Per Hop (Slow FHSS)</label>
                  <span className="text-[11px] font-mono">{fhssBitsPerHop} bit/hop</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[1, 2, 4].map(bph => (
                    <button
                      key={bph}
                      onClick={() => setFhssBitsPerHop(bph)}
                      className={`py-0.5 text-[11px] font-mono rounded border ${
                        fhssBitsPerHop === bph
                          ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                          : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {bph} b/hop
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* PN Generator Settings */}
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-3">
              <label className="block text-[12px] font-medium text-[var(--text-primary)]">
                Hopping Pattern Generator (LFSR)
              </label>

              <div>
                <span className="block text-[11px] text-[var(--text-secondary)] mb-1">LFSR Stages (m)</span>
                <div className="grid grid-cols-5 gap-1">
                  {[3, 4, 5, 6, 7].map(stg => (
                    <button
                      key={stg}
                      onClick={() => handleFhssMChange(stg)}
                      className={`py-0.5 text-[11px] font-mono rounded border ${
                        fhssM === stg
                          ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                          : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {stg}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-[11px] text-[var(--text-secondary)] mb-1">Polynomial Preset</span>
                <select
                  value={fhssPresetIdx}
                  onChange={e => handleFhssPresetChange(Number(e.target.value))}
                  className="w-full px-2 py-1 text-[11px] font-mono bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)]"
                >
                  {LFSR_PRESETS[fhssM]?.map((preset, idx) => (
                    <option key={idx} value={idx}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Channel & Jammer Settings */}
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-3">
              <h4 className="text-[12px] font-medium text-[var(--text-primary)]">Channel Impairments</h4>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] text-[var(--text-secondary)]">AWGN Channel (SNR)</label>
                  <span className="text-[11px] font-mono font-bold text-[var(--accent)]">{fhssSnrDb} dB</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="1"
                  value={fhssSnrDb}
                  onChange={e => setFhssSnrDb(Number(e.target.value))}
                  className="w-full h-1.5 bg-[var(--border-subtle)] rounded-lg appearance-none accent-[var(--accent)] cursor-pointer"
                />
              </div>

              {/* Single Channel Jammer */}
              <div className="p-3 bg-[var(--bg-main)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-[var(--text-primary)] cursor-pointer flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={fhssEnableInterference}
                      onChange={e => setFhssEnableInterference(e.target.checked)}
                      className="accent-[var(--accent)] rounded"
                    />
                    Jam Specific Channel
                  </label>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                    fhssEnableInterference ? "bg-amber-100 text-amber-800" : "bg-neutral-200 text-neutral-600"
                  }`}>
                    {fhssEnableInterference ? "ACTIVE" : "OFF"}
                  </span>
                </div>

                {fhssEnableInterference && (
                  <>
                    <div>
                      <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-1">
                        <span>Jammed Channel Index</span>
                        <span className="font-mono">Ch #{fhssInterferenceChannel} ({fhssBaseCarrierFreq + fhssInterferenceChannel * fhssChannelSpacing} Hz)</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={fhssNumChannels - 1}
                        step="1"
                        value={fhssInterferenceChannel}
                        onChange={e => setFhssInterferenceChannel(Number(e.target.value))}
                        className="w-full h-1 bg-[var(--border-subtle)] rounded appearance-none accent-amber-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-1">
                        <span>Jammer Power (J/S)</span>
                        <span className="font-mono">{fhssInterferencePowerDb} dB</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="24"
                        step="2"
                        value={fhssInterferencePowerDb}
                        onChange={e => setFhssInterferencePowerDb(Number(e.target.value))}
                        className="w-full h-1 bg-[var(--border-subtle)] rounded appearance-none accent-amber-600 cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setFhssRngSeed(prev => prev + 23)}
                  className="flex-1 py-1.5 text-[11px] font-mono font-medium rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-alt)]"
                >
                  Reseed Noise
                </button>
                <button
                  onClick={() => {
                    setFhssSnrDb(15);
                    setFhssNumChannels(8);
                    setFhssEnableInterference(false);
                    setFhssRngSeed(77);
                  }}
                  className="px-3 py-1.5 text-[11px] font-mono text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Telemetry & FHSS Visualizations */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {!fhssSim.valid && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-[var(--radius-md)] p-4 text-[13px]">
              <strong className="font-semibold">FHSS Error:</strong> {fhssSim.errorMessage}
            </div>
          )}

          {/* FHSS Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Transmitted Bits</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[20px] font-mono font-bold text-[var(--text-primary)]">{fhssSim.totalBits}</span>
                <span className="text-[11px] text-[var(--text-tertiary)]">({fhssSim.totalHops} hops)</span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">Hop rate: {fhssSim.hoppingRate} hops/s</p>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Measured BER</p>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-[20px] font-mono font-bold ${fhssSim.bitErrors > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {fhssSim.ber.toFixed(4)}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                Errors: {fhssSim.bitErrors} / {fhssSim.totalBits} bits
              </p>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Channel Collisions</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[20px] font-mono font-bold text-[var(--accent)]">{fhssSim.collisionsCount}</span>
                <span className="text-[11px] text-[var(--text-tertiary)]">/ {fhssSim.totalHops} hops</span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                {fhssSim.interferenceEnabled ? `Jammer on Ch #${fhssSim.jammedChannel}` : "No jammer active"}
              </p>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Hopping Bandwidth</p>
              <span className="text-[18px] font-mono font-semibold text-[var(--text-primary)]">
                {fhssSim.numChannels * fhssSim.channelSpacing} Hz
              </span>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                {fhssSim.baseCarrierFreq} to {fhssSim.baseCarrierFreq + (fhssSim.numChannels - 1) * fhssSim.channelSpacing} Hz
              </p>
            </div>
          </div>

          {/* 1. Hopping Carrier Frequency vs Time Stair-Step Plot */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                  Carrier Hopping Schedule f_c(t)
                </h3>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  Pseudo-random carrier channel selected per hop by PN bits
                </p>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                {fhssSim.totalHops} hops over {fhssSim.totalDurationMs} ms
              </span>
            </div>

            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={fhssSim.carrierHopWaveform} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="t" tick={{ fontSize: 9 }} stroke="var(--text-tertiary)" unit="ms" />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9 }} stroke="var(--text-tertiary)" unit="Hz" />
                  <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", fontSize: "11px" }} />
                  {fhssSim.interferenceEnabled && (
                    <ReferenceLine
                      y={fhssSim.baseCarrierFreq + fhssSim.jammedChannel * fhssSim.channelSpacing}
                      stroke="#d97706"
                      strokeDasharray="4 4"
                      label={{ value: `Jammed Ch #${fhssSim.jammedChannel}`, position: "insideTopRight", fill: "#d97706", fontSize: 10 }}
                    />
                  )}
                  <Line type="stepAfter" dataKey="CarrierFreq" stroke="var(--accent)" strokeWidth={2.2} dot={false} isAnimationActive={false} name="Carrier Freq" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. RF Waveforms: Transmitted vs Received */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)] space-y-5">
            <div>
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                  Transmitted BFSK Modulated RF Signal (Continuous Phase)
                </h3>
                <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                  Tone Dev: ±{(fhssSim.channelSpacing * 0.35).toFixed(0)} Hz
                </span>
              </div>
              <div className="h-[130px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={fhssSim.waveform} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="t" tick={{ fontSize: 9 }} stroke="var(--text-tertiary)" />
                    <YAxis domain={[-1.3, 1.3]} tick={{ fontSize: 9 }} stroke="var(--text-tertiary)" />
                    <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", fontSize: "11px" }} />
                    <Line type="linear" dataKey="tx" stroke="var(--accent)" strokeWidth={1.5} dot={false} isAnimationActive={false} name="Tx RF Waveform" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                  Received RF Signal r(t) = s(t) + w(t) {fhssSim.interferenceEnabled ? "+ Jammer" : ""}
                </h3>
                <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                  SNR: {fhssSim.snrDb} dB
                </span>
              </div>
              <div className="h-[130px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={fhssSim.waveform} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="t" tick={{ fontSize: 9 }} stroke="var(--text-tertiary)" />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9 }} stroke="var(--text-tertiary)" />
                    <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", fontSize: "11px" }} />
                    <Line type="linear" dataKey="rx" stroke={fhssSim.interferenceEnabled ? "#d97706" : "#64748b"} strokeWidth={1.2} dot={false} isAnimationActive={false} name="Rx RF Waveform" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 3. Frequency Spectrum */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                  Received Frequency Spectrum (dB vs Hz)
                </h3>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  Power distribution across the hopping channels. Jammer produces a concentrated narrowband spike.
                </p>
              </div>
            </div>

            <div className="h-[170px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fhssSim.spectrum} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="freq" tick={{ fontSize: 9 }} stroke="var(--text-tertiary)" unit="Hz" />
                  <YAxis domain={[-40, 10]} tick={{ fontSize: 9 }} stroke="var(--text-tertiary)" unit="dB" />
                  <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", fontSize: "11px" }} />
                  <Area type="monotone" dataKey="powerDb" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.15} isAnimationActive={false} name="Power (dB)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Bit Decisions & Correlator Energy Table */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-2">
              Synchronized Dehopping & BFSK Demodulation Table
            </h3>
            <p className="text-[11px] text-[var(--text-tertiary)] mb-4">
              Receiver computes quadrature correlator energies (E₀, E₁) for each bit. Bits during jammed hops are highlighted.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-[var(--bg-surface-alt)] border-b border-[var(--border-strong)]">
                  <tr>
                    <th className="p-2 font-mono">Bit #</th>
                    <th className="p-2 font-mono">Original</th>
                    <th className="p-2 font-mono">Hop / Channel</th>
                    <th className="p-2 font-mono">Carrier Freq</th>
                    <th className="p-2 font-mono">Tone Energy E₀</th>
                    <th className="p-2 font-mono">Tone Energy E₁</th>
                    <th className="p-2 font-mono">Decision</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fhssSim.decisions.slice(0, 16).map((dec, i) => {
                    return (
                      <tr
                        key={i}
                        className={`border-b border-[var(--border-subtle)] ${
                          dec.isError
                            ? "bg-red-50 text-red-900"
                            : dec.isJammed
                            ? "bg-amber-50"
                            : ""
                        }`}
                      >
                        <td className="p-2 font-mono">Bit #{dec.bitIdx}</td>
                        <td className="p-2 font-mono font-bold">{dec.originalBit}</td>
                        <td className="p-2 font-mono">
                          Hop {dec.hopIdx} (Ch #{dec.channelIdx})
                        </td>
                        <td className="p-2 font-mono">{dec.carrierFreq} Hz</td>
                        <td className="p-2 font-mono">{dec.energy0.toFixed(3)}</td>
                        <td className="p-2 font-mono">{dec.energy1.toFixed(3)}</td>
                        <td className="p-2 font-mono font-bold">{dec.recoveredBit}</td>
                        <td className="p-2">
                          {dec.isError ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-100 text-red-800 border border-red-300">
                              BIT ERROR
                            </span>
                          ) : dec.isJammed ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                              JAMMED HOP
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300">
                              CLEAN PASS
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // RENDER TAB 4: PERFORMANCE COMPARISON (DSSS VS FHSS)
  // =========================================================================
  const renderCompareTab = () => {
    return (
      <div className="flex flex-col gap-8">
        {/* Synchronized Test Action Bar */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
              Real-Time Comparative Benchmark
            </h3>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Evaluate both DSSS and FHSS under identical input bit sequences and channel noise conditions.
            </p>
          </div>
          <button
            onClick={handleSyncComparativeTest}
            className="px-4 py-2 text-[12px] font-mono font-semibold bg-[var(--accent)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity"
          >
            Run Synchronized Comparative Test
          </button>
        </div>

        {/* Required Live Comparison Table */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)]">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-4">
            Spread Spectrum System Comparison Matrix
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[var(--bg-surface-alt)] border-b border-[var(--border-strong)]">
                <tr>
                  <th className="p-3 font-semibold text-[var(--text-primary)]">Metric / Dimension</th>
                  <th className="p-3 font-semibold text-[var(--accent)] font-mono">Direct Sequence (DSSS)</th>
                  <th className="p-3 font-semibold text-[var(--accent)] font-mono">Frequency Hopping (FHSS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                <tr>
                  <td className="p-3 font-medium text-[var(--text-primary)]">Spreading / Hopping Mechanism</td>
                  <td className="p-3 text-[var(--text-secondary)]">PN chips multiply data symbols directly (BPSK spreading)</td>
                  <td className="p-3 text-[var(--text-secondary)]">PN sequence pseudo-randomly selects carrier channels</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-[var(--text-primary)]">Primary Control</td>
                  <td className="p-3 font-mono text-[var(--text-secondary)]">Spreading factor N = {dsssSim.spreadingFactor} chips/bit</td>
                  <td className="p-3 font-mono text-[var(--text-secondary)]">{fhssSim.numChannels} channels, {fhssSim.hoppingRate} hops/s</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-[var(--text-primary)]">Noise Model</td>
                  <td className="p-3 font-mono text-[var(--text-secondary)]">AWGN (Eb/N0 = {dsssSim.snrDb} dB)</td>
                  <td className="p-3 font-mono text-[var(--text-secondary)]">AWGN (SNR = {fhssSim.snrDb} dB)</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-[var(--text-primary)]">Optional Interference Test</td>
                  <td className="p-3 text-[var(--text-secondary)]">
                    {dsssSim.interferenceEnabled ? (
                      <span className="font-mono text-amber-700 font-semibold">Active (J/S = {dsssJammerPowerDb} dB)</span>
                    ) : (
                      <span className="text-[var(--text-tertiary)]">Disabled</span>
                    )}
                  </td>
                  <td className="p-3 text-[var(--text-secondary)]">
                    {fhssSim.interferenceEnabled ? (
                      <span className="font-mono text-amber-700 font-semibold">Active on Ch #{fhssSim.jammedChannel} (J/S = {fhssInterferencePowerDb} dB)</span>
                    ) : (
                      <span className="text-[var(--text-tertiary)]">Disabled</span>
                    )}
                  </td>
                </tr>
                <tr className="bg-[var(--accent)]/5">
                  <td className="p-3 font-bold text-[var(--text-primary)]">
                    Live Measured BER (BER = N_err / N_bits)
                  </td>
                  <td className="p-3 font-mono font-bold text-[var(--accent)] text-[14px]">
                    {dsssSim.ber.toFixed(4)} ({dsssSim.bitErrors} / {dsssSim.totalBits} errors)
                  </td>
                  <td className="p-3 font-mono font-bold text-[var(--accent)] text-[14px]">
                    {fhssSim.ber.toFixed(4)} ({fhssSim.bitErrors} / {fhssSim.totalBits} errors)
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-[var(--text-primary)]">Processing / Anti-Jamming Gain</td>
                  <td className="p-3 font-mono text-[var(--text-secondary)]">
                    Gp = {dsssSim.processingGainLinear} ({dsssSim.processingGainDb.toFixed(2)} dB)
                  </td>
                  <td className="p-3 font-mono text-[var(--text-secondary)]">
                    Collision Probability ≈ 1 / {fhssSim.numChannels} ({((1 / fhssSim.numChannels) * 100).toFixed(1)}%)
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-[var(--text-primary)]">RF Bandwidth Requirement</td>
                  <td className="p-3 text-[var(--text-secondary)]">Continuous wideband: BW ≈ 2·Rc</td>
                  <td className="p-3 text-[var(--text-secondary)]">Aggregated band: M_ch · Δf = {fhssSim.numChannels * fhssSim.channelSpacing} Hz</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-[var(--text-tertiary)] mt-3">
            <strong>Note on Finite-Run BER:</strong> If zero bit errors occur in a run, BER is accurately displayed as 0 for that finite sample size. This empirical observation does not imply a theoretical error probability of zero under noisy or jammed channels.
          </p>
        </div>

        {/* Detailed Educational & Viva Preparation Cards */}
        <div className="bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 space-y-6">
          <h3 className="text-[11px] font-mono font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Theoretical Principles of Spread Spectrum Communications
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[13px] text-[var(--text-secondary)] leading-relaxed">
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] text-[14px] mb-1.5">
                1. DSSS Spreading & Despreading Mechanism
              </h4>
              <p>
                In Direct Sequence, each narrow-band data symbol <span className="font-mono">b_k ∈ &#123;-1, +1&#125;</span> is multiplied by a high-rate PN sequence of <span className="font-mono">N</span> chips <span className="font-mono">c_i ∈ &#123;-1, +1&#125;</span>. This expands signal bandwidth by a factor of <span className="font-mono">N</span>, reducing power spectral density below thermal noise. At the receiver, multiplying by the synchronized replica <span className="font-mono">c_i</span> collapses the signal back to narrowband (<span className="font-mono">c_i² = 1</span>), while simultaneously spreading any incoming narrowband jammer across the wide chip bandwidth.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-[var(--text-primary)] text-[14px] mb-1.5">
                2. Processing Gain & Jamming Margin
              </h4>
              <p>
                The <strong>Processing Gain (Gp)</strong> represents the Signal-to-Noise/Interference improvement achieved through spreading:
                <br />
                <span className="font-mono font-semibold text-[var(--text-primary)] block my-1">
                  Gp = Rc / Rb = N, &nbsp; Gp(dB) = 10 · log₁₀(N)
                </span>
                The <strong>Jamming Margin (Mj)</strong> defines how much jammer power can exceed signal power before communication fails:
                <br />
                <span className="font-mono font-semibold text-[var(--text-primary)] block my-1">
                  Mj = Gp - (Eb/N0)_req - L_sys
                </span>
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-[var(--text-primary)] text-[14px] mb-1.5">
                3. FHSS Channel Hopping & Anti-Jamming
              </h4>
              <p>
                Frequency Hopping pseudo-randomly switches the carrier frequency among <span className="font-mono">M_ch</span> discrete channels. If a hostile jammer concentrates power in a single frequency channel, transmissions in that channel may be corrupted, but all other hops remain entirely unaffected. For <span className="font-mono">M_ch</span> channels, the average collision probability is only <span className="font-mono">1 / M_ch</span>.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-[var(--text-primary)] text-[14px] mb-1.5">
                4. Synchronization Imperatives
              </h4>
              <p>
                Both DSSS and FHSS require strict time and frequency synchronization between transmitter and receiver. A timing offset exceeding a fraction of a chip duration <span className="font-mono">T_c</span> in DSSS collapses the despread correlation peak to zero. In FHSS, receiver local oscillator hopping must align within a fraction of the hop dwell time <span className="font-mono">T_h</span> to avoid severe tone distortion.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // MAIN COMPONENT RENDER
  // =========================================================================
  return (
    <section id="module-pn-sequence" className="py-12 border-b border-[var(--border-subtle)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] font-heading">
              PN Sequence
            </h2>
            <p className="text-[14px] text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
              Explore deterministic pseudo-random sequences, Linear Feedback Shift Register (LFSR) architectures, Direct Sequence Spread Spectrum (DSSS), and Frequency Hopping Spread Spectrum (FHSS).
            </p>
          </div>
        </div>

        {/* Experiment Navigation Tabs */}
        <div className="flex flex-wrap border-b border-[var(--border-subtle)] mb-8 gap-x-2">
          {[
            { id: "lfsr", label: "LFSR & PN Generator" },
            { id: "dsss", label: "Direct Sequence (DSSS)" },
            { id: "fhss", label: "Frequency Hopping (FHSS)" },
            { id: "compare", label: "Comparative Analysis" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PnTab)}
              className={`px-4 py-3 text-[13px] font-medium tracking-wide focus:outline-none transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Display */}
        <div className="w-full">
          {activeTab === "lfsr" && renderLfsrTab()}
          {activeTab === "dsss" && renderDsssTab()}
          {activeTab === "fhss" && renderFhssTab()}
          {activeTab === "compare" && renderCompareTab()}
        </div>

      </div>
    </section>
  );
}
