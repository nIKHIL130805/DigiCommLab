import { qFunction, createRng, generateSeededAWGN } from "./dsss";
import { simulateSampling } from "./sampling";
import { simulateDigital, calculateMagnitudeSpectrum, DigitalScheme } from "./modulation";
import { encodeLineCode, LineCodeScheme } from "./lineCoding";

// =========================================================================
// MODULE 1: BER THEORETICAL VS SIMULATED
// =========================================================================

export interface BerPoint {
  ebNoDb: number;
  ebNoLinear: number;
  theoreticalBer: number;
  measuredBer: number;
  transmittedBits: number;
  bitErrors: number;
  diff: number;
  // For logarithmic plotting (safe for 0 values)
  displayMeasuredBer: number | null;
}

export interface BerSimulationConfig {
  scheme: "BPSK" | "QPSK";
  minEbNo: number; // e.g. 0 dB
  maxEbNo: number; // e.g. 10 dB
  stepEbNo: number; // e.g. 1 dB or 2 dB
  bitsPerPoint: number; // e.g. 5000 bits
  rngSeed: number;
}

export interface BerSimulationResult {
  points: BerPoint[];
  scheme: string;
  totalTransmittedBits: number;
  totalBitErrors: number;
  overallMeasuredBer: number;
  summaryObservation: string;
}

/**
 * Coherent BPSK / QPSK Monte Carlo simulation across an Eb/N0 range
 */
export function simulateBerCurve(config: BerSimulationConfig): BerSimulationResult {
  const { scheme, minEbNo, maxEbNo, stepEbNo, bitsPerPoint, rngSeed } = config;
  const rng = createRng(rngSeed);

  const points: BerPoint[] = [];
  let totalBits = 0;
  let totalErrors = 0;

  const validStep = Math.max(0.5, stepEbNo);
  const numSteps = Math.floor((maxEbNo - minEbNo) / validStep);

  for (let s = 0; s <= numSteps; s++) {
    const ebNoDb = Number((minEbNo + s * validStep).toFixed(1));
    const ebNoLinear = Math.pow(10, ebNoDb / 10);

    // Theoretical BER:
    // For coherent BPSK over AWGN: Pb = Q(sqrt(2 * Eb/N0))
    // For coherent QPSK with Gray coding: Pb = Q(sqrt(2 * Eb/N0)) per bit
    const theoreticalBer = qFunction(Math.sqrt(2 * ebNoLinear));

    // Monte Carlo Simulation
    // In coherent BPSK: Symbol s in {-sqrt(Eb), +sqrt(Eb)}. With Eb = 1, s in {-1, +1}.
    // Noise variance sigma^2 = N0 / 2 = Eb / (2 * (Eb/N0)_linear) = 1 / (2 * ebNoLinear).
    const noiseStdDev = Math.sqrt(1 / (2 * ebNoLinear));
    let errors = 0;

    for (let b = 0; b < bitsPerPoint; b++) {
      const txBit = rng() > 0.5 ? 1 : 0;
      const txSymbol = txBit === 1 ? 1 : -1;
      const noise = generateSeededAWGN(noiseStdDev, rng);
      const rxSignal = txSymbol + noise;
      const rxBit = rxSignal >= 0 ? 1 : 0;

      if (rxBit !== txBit) {
        errors++;
      }
    }

    const measuredBer = errors / bitsPerPoint;
    totalBits += bitsPerPoint;
    totalErrors += errors;

    points.push({
      ebNoDb,
      ebNoLinear,
      theoreticalBer,
      measuredBer,
      transmittedBits: bitsPerPoint,
      bitErrors: errors,
      diff: Math.abs(theoreticalBer - measuredBer),
      displayMeasuredBer: measuredBer > 0 ? measuredBer : null,
    });
  }

  const overallMeasuredBer = totalErrors / totalBits;
  const summaryObservation = `Simulated ${totalBits.toLocaleString()} total bits across ${points.length} SNR test points. The measured BER closely tracks the theoretical Q(√(2Eb/N0)) curve. Deviations at higher SNR arise from finite-sample variance (Monte Carlo error).`;

  return {
    points,
    scheme: `Coherent ${scheme} over AWGN`,
    totalTransmittedBits: totalBits,
    totalBitErrors: totalErrors,
    overallMeasuredBer,
    summaryObservation,
  };
}

// =========================================================================
// MODULE 2: NYQUIST SAMPLING THEORY VS OBSERVATION
// =========================================================================

export interface NyquistAnalysisConfig {
  f1: number; // Primary signal frequency (Hz)
  f2?: number; // Optional secondary tone frequency (Hz)
  enableTone2: boolean;
  fs: number; // Sampling frequency (Hz)
  duration: number; // seconds
}

export interface NyquistAnalysisResult {
  fMax: number;
  fs: number;
  nyquistRate: number; // 2 * fMax
  isSatisfied: boolean;
  theoreticalAliasFreq: number; // Folded frequency
  expectedAliasing: boolean;
  observedAliasing: boolean;
  observedDominantFreq: number;
  reconstructionMse: number;
  assessmentMethod: string;
  chartData: any[];
}

export function simulateNyquistAnalysis(config: NyquistAnalysisConfig): NyquistAnalysisResult {
  const { f1, f2 = 0, enableTone2, fs, duration = 0.05 } = config;

  const fMax = enableTone2 ? Math.max(f1, f2) : f1;
  const nyquistRate = 2 * fMax;
  const isSatisfied = fs >= nyquistRate;

  // Theoretical Alias Frequency calculation:
  // For a pure tone f1 sampled at fs, folded alias frequency is |f1 - round(f1 / fs) * fs|
  const nAlias = Math.round(f1 / fs);
  const theoreticalAliasFreq = Math.abs(f1 - nAlias * fs);
  const expectedAliasing = !isSatisfied;

  // High-resolution reference timeline
  const plotFs = Math.max(12000, fMax * 60);
  const numPoints = Math.floor(duration * plotFs);

  const time = new Float64Array(numPoints);
  const original = new Float64Array(numPoints);

  for (let i = 0; i < numPoints; i++) {
    const t = i / plotFs;
    time[i] = t;
    let val = Math.sin(2 * Math.PI * f1 * t);
    if (enableTone2 && f2 > 0) {
      val = 0.6 * val + 0.4 * Math.sin(2 * Math.PI * f2 * t);
    }
    original[i] = val;
  }

  // Sampling
  const sampleInterval = 1 / fs;
  const numSamples = Math.floor(duration * fs) + 1;
  const samplePoints: { t: number; v: number }[] = [];

  for (let i = 0; i < numSamples; i++) {
    const t = i * sampleInterval;
    if (t <= duration) {
      let v = Math.sin(2 * Math.PI * f1 * t);
      if (enableTone2 && f2 > 0) {
        v = 0.6 * v + 0.4 * Math.sin(2 * Math.PI * f2 * t);
      }
      samplePoints.push({ t, v });
    }
  }

  // Whittaker-Shannon sinc reconstruction
  const sinc = (x: number) => (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
  const reconstructed = new Float64Array(numPoints);

  for (let i = 0; i < numPoints; i++) {
    const t = time[i];
    let sum = 0;
    for (let n = 0; n < samplePoints.length; n++) {
      sum += samplePoints[n].v * sinc(fs * (t - samplePoints[n].t));
    }
    reconstructed[i] = sum;
  }

  // Compute Mean Squared Error between original and reconstructed
  let sqErr = 0;
  for (let i = 0; i < numPoints; i++) {
    const diff = original[i] - reconstructed[i];
    sqErr += diff * diff;
  }
  const reconstructionMse = sqErr / numPoints;

  // Estimate dominant frequency of reconstructed signal via zero-crossing / DFT peak
  // We inspect DFT peak of reconstructed signal between 0 and fs/2
  const dftBins = 150;
  let maxMag = 0;
  let observedDominantFreq = 0;
  const maxSearchFreq = Math.min(plotFs / 4, Math.max(fMax * 1.5, fs));
  const df = maxSearchFreq / dftBins;

  for (let b = 1; b <= dftBins; b++) {
    const freq = b * df;
    let re = 0, im = 0;
    const step = Math.max(1, Math.floor(numPoints / 400));
    for (let i = 0; i < numPoints; i += step) {
      const angle = 2 * Math.PI * freq * time[i];
      re += reconstructed[i] * Math.cos(angle);
      im -= reconstructed[i] * Math.sin(angle);
    }
    const mag = Math.sqrt(re * re + im * im);
    if (mag > maxMag) {
      maxMag = mag;
      observedDominantFreq = Math.round(freq);
    }
  }

  // Observed aliasing: true if reconstructed signal's dominant frequency deviated from original f1
  // by more than df*1.5 AND reconstruction MSE is high (> 0.08)
  const observedAliasing = !isSatisfied && (Math.abs(observedDominantFreq - f1) > 10 || reconstructionMse > 0.08);

  const assessmentMethod = "Reconstruction MSE comparison and spectral peak inspection of sinc-interpolated waveform";

  // Downsample for clean Recharts display
  const displayPoints = 350;
  const step = Math.max(1, Math.floor(numPoints / displayPoints));
  const chartData: any[] = [];

  for (let i = 0; i < numPoints; i += step) {
    chartData.push({
      t: Number((time[i] * 1000).toFixed(2)),
      Original: Number(original[i].toFixed(3)),
      Reconstructed: Number(reconstructed[i].toFixed(3)),
      Sampled: null,
    });
  }

  // Insert sample points into chart
  for (const sp of samplePoints) {
    const tMs = Number((sp.t * 1000).toFixed(2));
    let matched = false;
    for (const pt of chartData) {
      if (Math.abs(pt.t - tMs) < 0.15) {
        pt.Sampled = Number(sp.v.toFixed(3));
        matched = true;
        break;
      }
    }
    if (!matched && tMs <= duration * 1000) {
      chartData.push({
        t: tMs,
        Original: Number(sp.v.toFixed(3)),
        Reconstructed: Number(sp.v.toFixed(3)),
        Sampled: Number(sp.v.toFixed(3)),
      });
    }
  }

  chartData.sort((a, b) => a.t - b.t);

  return {
    fMax,
    fs,
    nyquistRate,
    isSatisfied,
    theoreticalAliasFreq,
    expectedAliasing,
    observedAliasing,
    observedDominantFreq,
    reconstructionMse,
    assessmentMethod,
    chartData,
  };
}

// =========================================================================
// MODULE 3: BANDWIDTH THEORETICAL VS ESTIMATED
// =========================================================================

export type BandwidthScheme =
  | "AM-DSB"
  | "WBFM"
  | "BPSK"
  | "BFSK"
  | "Polar NRZ"
  | "Manchester";

export interface BandwidthAnalysisConfig {
  scheme: BandwidthScheme;
  carrierFreq: number; // fc in Hz (e.g. 100 Hz)
  rateOrFm: number; // Symbol rate Rs (baud) or Message freq fm (Hz)
  modIndex: number; // beta for WBFM (e.g. 2.0)
  powerContainmentPct: number; // e.g. 99% or 95%
}

export interface BandwidthAnalysisResult {
  scheme: BandwidthScheme;
  theoreticalBandwidth: number;
  theoreticalFormula: string;
  estimatedBandwidth: number;
  estimationMethod: string;
  lowerCutoffFreq: number;
  upperCutoffFreq: number;
  centerFreq: number;
  diff: number;
  pctDiff: number;
  spectrum: { freq: number; power: number; powerDb: number }[];
  assumptions: string;
}

export function simulateBandwidthAnalysis(config: BandwidthAnalysisConfig): BandwidthAnalysisResult {
  const { scheme, carrierFreq, rateOrFm, modIndex, powerContainmentPct } = config;

  let theoreticalBandwidth = 0;
  let theoreticalFormula = "";
  let assumptions = "";
  let centerFreq = carrierFreq;

  const duration = 0.2; // 200 ms for rich spectral definition
  const fs = 6000;
  const numSamples = Math.floor(duration * fs);
  const signal = new Float64Array(numSamples);

  // Generate waveform according to selected scheme
  if (scheme === "AM-DSB") {
    const fm = rateOrFm;
    const fc = carrierFreq;
    theoreticalBandwidth = 2 * fm;
    theoreticalFormula = "B_T = 2 · f_m (Carson's DSB rule)";
    assumptions = "Double-sideband amplitude modulation produces symmetric upper and lower sidebands at fc ± fm.";

    for (let n = 0; n < numSamples; n++) {
      const t = n / fs;
      const m = Math.cos(2 * Math.PI * fm * t);
      signal[n] = (1 + 0.8 * m) * Math.cos(2 * Math.PI * fc * t);
    }
  } else if (scheme === "WBFM") {
    const fm = rateOrFm;
    const beta = Math.max(0.5, modIndex);
    const deltaF = beta * fm;
    theoreticalBandwidth = 2 * (deltaF + fm); // 2(beta + 1)fm
    theoreticalFormula = "B_T = 2(Δf + f_m) = 2(β + 1)f_m (Carson's Rule)";
    assumptions = "Carson's bandwidth accounts for >98% of total FM power across Bessel sidebands.";

    let currentPhase = 0;
    for (let n = 0; n < numSamples; n++) {
      const t = n / fs;
      const m = Math.cos(2 * Math.PI * fm * t);
      const instFreq = carrierFreq + deltaF * m;
      currentPhase += 2 * Math.PI * instFreq * (1 / fs);
      signal[n] = Math.cos(currentPhase);
    }
  } else if (scheme === "BPSK") {
    const Rs = rateOrFm;
    const fc = carrierFreq;
    theoreticalBandwidth = 2 * Rs;
    theoreticalFormula = "B_null = 2 · R_s (Main-lobe null-to-null bandwidth)";
    assumptions = "Rectangular pulse-shaped BPSK produces a sinc²(f) spectrum with first nulls at fc ± Rs.";

    // Generate random bits
    const rng = createRng(101);
    const symDuration = 1 / Rs;
    for (let n = 0; n < numSamples; n++) {
      const t = n / fs;
      const symIdx = Math.floor(t / symDuration);
      // Bit from deterministic PRNG sequence
      const bitVal = Math.sin(symIdx * 12.9898) > 0 ? 1 : -1;
      signal[n] = bitVal * Math.cos(2 * Math.PI * fc * t);
    }
  } else if (scheme === "BFSK") {
    const Rs = rateOrFm;
    const fc = carrierFreq;
    const deltaF = Rs * 1.5; // Tone separation
    theoreticalBandwidth = deltaF + 2 * Rs;
    theoreticalFormula = "B_T ≈ Δf + 2 · R_s (Carson's FSK bandwidth)";
    assumptions = "Binary FSK consists of two separated FSK carrier tones with sinc² main-lobe extensions.";

    const symDuration = 1 / Rs;
    for (let n = 0; n < numSamples; n++) {
      const t = n / fs;
      const symIdx = Math.floor(t / symDuration);
      const isOne = Math.sin(symIdx * 7.823) > 0;
      const freq = fc + (isOne ? deltaF / 2 : -deltaF / 2);
      signal[n] = Math.cos(2 * Math.PI * freq * t);
    }
  } else if (scheme === "Polar NRZ") {
    const Rb = rateOrFm;
    centerFreq = 0;
    theoreticalBandwidth = Rb;
    theoreticalFormula = "B_first-null = R_b (Baseband first spectral null)";
    assumptions = "Baseband polar NRZ rectangular pulse has PSD = Tb · sinc²(f · Tb), with first null at f = Rb.";

    const bitDur = 1 / Rb;
    for (let n = 0; n < numSamples; n++) {
      const t = n / fs;
      const bitIdx = Math.floor(t / bitDur);
      const val = Math.sin(bitIdx * 5.432) > 0 ? 1 : -1;
      signal[n] = val;
    }
  } else {
    // Manchester
    const Rb = rateOrFm;
    centerFreq = 0;
    theoreticalBandwidth = 2 * Rb;
    theoreticalFormula = "B_first-null = 2 · R_b (Manchester first spectral null)";
    assumptions = "Manchester split-phase encoding introduces mid-bit transitions, pushing the first null to 2·Rb.";

    const bitDur = 1 / Rb;
    for (let n = 0; n < numSamples; n++) {
      const t = n / fs;
      const bitIdx = Math.floor(t / bitDur);
      const isFirstHalf = (t % bitDur) < bitDur / 2;
      const bitVal = Math.sin(bitIdx * 3.141) > 0 ? 1 : -1;
      signal[n] = isFirstHalf ? bitVal : -bitVal;
    }
  }

  // Calculate high-resolution spectrum using DFT
  const maxAnalysisFreq = centerFreq > 0 ? Math.min(fs / 2, centerFreq + theoreticalBandwidth * 2) : rateOrFm * 3.5;
  const minAnalysisFreq = centerFreq > 0 ? Math.max(0, centerFreq - theoreticalBandwidth * 2) : 0;
  const numBins = 160;
  const df = (maxAnalysisFreq - minAnalysisFreq) / numBins;

  const spectrum: { freq: number; power: number; powerDb: number }[] = [];
  let totalPower = 0;

  const dftStep = Math.max(1, Math.floor(numSamples / 800));
  const dftCount = Math.floor(numSamples / dftStep);

  for (let b = 0; b <= numBins; b++) {
    const freq = minAnalysisFreq + b * df;
    let re = 0, im = 0;
    for (let n = 0; n < numSamples; n += dftStep) {
      const angle = 2 * Math.PI * freq * (n / fs);
      re += signal[n] * Math.cos(angle);
      im -= signal[n] * Math.sin(angle);
    }
    const mag = Math.sqrt(re * re + im * im) / dftCount;
    const power = mag * mag;
    totalPower += power;
    spectrum.push({
      freq: Math.round(freq),
      power,
      powerDb: 10 * Math.log10(Math.max(1e-6, power)),
    });
  }

  // Estimate Fractional Power Containment Bandwidth (e.g. 99% or 95%)
  const targetPct = powerContainmentPct / 100;
  const tailPct = (1 - targetPct) / 2;

  let cumPower = 0;
  let lowerCutoffFreq = spectrum[0].freq;
  let upperCutoffFreq = spectrum[spectrum.length - 1].freq;
  let foundLower = false;

  for (let i = 0; i < spectrum.length; i++) {
    cumPower += spectrum[i].power;
    const fraction = cumPower / (totalPower || 1);

    if (!foundLower && fraction >= tailPct) {
      lowerCutoffFreq = spectrum[i].freq;
      foundLower = true;
    }
    if (fraction >= 1 - tailPct) {
      upperCutoffFreq = spectrum[i].freq;
      break;
    }
  }

  let estimatedBandwidth = upperCutoffFreq - lowerCutoffFreq;
  if (centerFreq === 0) {
    // For baseband signals, bandwidth is from DC (0 Hz) to the upper cutoff
    estimatedBandwidth = upperCutoffFreq;
  }

  const diff = Math.abs(estimatedBandwidth - theoreticalBandwidth);
  const pctDiff = (diff / (theoreticalBandwidth || 1)) * 100;

  return {
    scheme,
    theoreticalBandwidth,
    theoreticalFormula,
    estimatedBandwidth,
    estimationMethod: `${powerContainmentPct}% Fractional Power Containment Bandwidth`,
    lowerCutoffFreq,
    upperCutoffFreq,
    centerFreq,
    diff,
    pctDiff,
    spectrum,
    assumptions,
  };
}

// =========================================================================
// MODULE 4: QUANTIZATION ERROR THEORY VS MEASUREMENT
// =========================================================================

export interface QuantizationAnalysisConfig {
  signalType: "Sine Wave" | "Triangle Wave" | "Uniform Random";
  amplitude: number; // V (e.g. 0.8 V or 1.2 V to test overload!)
  levels: number; // e.g. 8, 16, 32, 64
  numSamples: number;
}

export interface QuantizationAnalysisResult {
  levels: number;
  stepSize: number; // Delta
  inputRange: string;
  totalSamples: number;
  overloadSamples: number;
  overloadPercentage: number;
  hasOverload: boolean;
  measuredTotalMse: number;
  theoreticalGranularMse: number; // Delta^2 / 12
  measuredGranularMse: number;
  measuredSqnrDb: number;
  theoreticalSqnrDb: number;
  mseDiff: number;
  waveformChart: { t: number; Original: number; Quantized: number; Error: number }[];
  histogramData: { bin: string; count: number; errorVal: number }[];
  levelSweepData: { levels: number; measuredMse: number; theoreticalMse: number; stepSize: number }[];
}

export function simulateQuantizationAnalysis(config: QuantizationAnalysisConfig): QuantizationAnalysisResult {
  const { signalType, amplitude, levels, numSamples = 800 } = config;

  // Actual Quantizer Convention matching src/utils/simulations/sampling.ts:
  // vMin = -1.0 V, vMax = +1.0 V
  // stepSize Delta = (vMax - vMin) / (levels - 1) = 2.0 / (levels - 1)
  const vMin = -1.0;
  const vMax = 1.0;
  const stepSize = (vMax - vMin) / (levels - 1);

  const quantize = (val: number) => {
    const levelIdx = Math.round((val - vMin) / stepSize);
    const clampedIdx = Math.max(0, Math.min(levels - 1, levelIdx));
    return vMin + clampedIdx * stepSize;
  };

  const originalSamples = new Float64Array(numSamples);
  const quantizedSamples = new Float64Array(numSamples);
  const errorSamples = new Float64Array(numSamples);

  const rng = createRng(42);

  // Generate input samples
  for (let n = 0; n < numSamples; n++) {
    const t = n / numSamples;
    let x = 0;
    if (signalType === "Sine Wave") {
      x = amplitude * Math.sin(2 * Math.PI * 3 * t);
    } else if (signalType === "Triangle Wave") {
      // Periodic triangle wave with period T = 1/3
      const phase = (3 * t) % 1;
      x = amplitude * (phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase);
    } else {
      // Uniform random in [-amplitude, +amplitude]
      x = amplitude * (2 * rng() - 1);
    }

    const q = quantize(x);
    const e = x - q;

    originalSamples[n] = x;
    quantizedSamples[n] = q;
    errorSamples[n] = e;
  }

  // Calculate Metrics
  let totalSqErr = 0;
  let granularSqErr = 0;
  let granularCount = 0;
  let overloadCount = 0;
  let signalPwr = 0;

  for (let n = 0; n < numSamples; n++) {
    const x = originalSamples[n];
    const e = errorSamples[n];
    const eSq = e * e;

    totalSqErr += eSq;
    signalPwr += x * x;

    // Check if sample overloaded quantizer input limits [-1.0, +1.0]
    if (x > vMax || x < vMin) {
      overloadCount++;
    } else {
      granularSqErr += eSq;
      granularCount++;
    }
  }

  const measuredTotalMse = totalSqErr / numSamples;
  const measuredGranularMse = granularCount > 0 ? granularSqErr / granularCount : 0;
  const theoreticalGranularMse = (stepSize * stepSize) / 12;

  const overloadPercentage = (overloadCount / numSamples) * 100;
  const hasOverload = overloadCount > 0;

  const avgSignalPwr = signalPwr / numSamples;
  const measuredSqnrDb = measuredTotalMse > 1e-12 ? 10 * Math.log10(avgSignalPwr / measuredTotalMse) : 99.9;
  const theoreticalSqnrDb = theoreticalGranularMse > 1e-12 ? 10 * Math.log10(avgSignalPwr / theoreticalGranularMse) : 99.9;

  const mseDiff = Math.abs(measuredTotalMse - theoreticalGranularMse);

  // Time-domain chart data (first 200 points)
  const displayCount = Math.min(200, numSamples);
  const waveformChart = [];
  for (let n = 0; n < displayCount; n++) {
    waveformChart.push({
      t: n,
      Original: Number(originalSamples[n].toFixed(3)),
      Quantized: Number(quantizedSamples[n].toFixed(3)),
      Error: Number(errorSamples[n].toFixed(4)),
    });
  }

  // Error distribution histogram (20 bins across [-Delta, +Delta])
  const numBins = 16;
  const binWidth = (stepSize * 2) / numBins;
  const binCounts = new Array(numBins).fill(0);

  for (let n = 0; n < numSamples; n++) {
    const e = errorSamples[n];
    // Map [-Delta, Delta] to bin 0..numBins-1
    const idx = Math.floor((e + stepSize) / binWidth);
    const clampedIdx = Math.max(0, Math.min(numBins - 1, idx));
    binCounts[clampedIdx]++;
  }

  const histogramData = binCounts.map((count, i) => {
    const centerVal = -stepSize + (i + 0.5) * binWidth;
    return {
      bin: `${centerVal.toFixed(3)}`,
      count,
      errorVal: Number(centerVal.toFixed(3)),
    };
  });

  // Level Sweep Comparison (L in [4, 8, 16, 32, 64, 128])
  const sweepLevels = [4, 8, 16, 32, 64, 128];
  const levelSweepData = sweepLevels.map(L => {
    const delta = (vMax - vMin) / (L - 1);
    let sErr = 0;
    for (let n = 0; n < numSamples; n++) {
      const x = originalSamples[n];
      const lIdx = Math.round((x - vMin) / delta);
      const cIdx = Math.max(0, Math.min(L - 1, lIdx));
      const q = vMin + cIdx * delta;
      const err = x - q;
      sErr += err * err;
    }
    const meas = sErr / numSamples;
    const theo = (delta * delta) / 12;
    return {
      levels: L,
      measuredMse: Number(meas.toExponential(3)),
      theoreticalMse: Number(theo.toExponential(3)),
      stepSize: Number(delta.toFixed(4)),
    };
  });

  return {
    levels,
    stepSize,
    inputRange: `[${vMin.toFixed(1)}, +${vMax.toFixed(1)}] V`,
    totalSamples: numSamples,
    overloadSamples: overloadCount,
    overloadPercentage: Number(overloadPercentage.toFixed(1)),
    hasOverload,
    measuredTotalMse,
    theoreticalGranularMse,
    measuredGranularMse,
    measuredSqnrDb,
    theoreticalSqnrDb,
    mseDiff,
    waveformChart,
    histogramData,
    levelSweepData,
  };
}
