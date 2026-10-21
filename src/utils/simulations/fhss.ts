import { simulatePnSequence, validateSeed, validateTaps } from "./pnSequence";
import { createRng, generateSeededAWGN } from "./dsss";

export interface FhssSimulationConfig {
  dataBitsStr: string;
  m: number;
  taps: number[];
  seed: string;
  numChannels: number; // M_ch in {4, 8, 16}
  channelSpacing: number; // Delta f in Hz (e.g. 150 Hz)
  baseCarrierFreq: number; // f0 in Hz (e.g. 600 Hz)
  bitsPerHop: number; // e.g. 1, 2, or 4 bits per hop
  bitRate: number; // bits per second (e.g. 100 bps)
  snrDb: number; // AWGN SNR in dB
  enableInterference: boolean;
  interferenceChannelIdx: number; // Channel index being jammed (0 to M_ch - 1)
  interferencePowerDb: number; // Jammer-to-Signal ratio J/S in dB
  rngSeed: number;
}

export interface FhssHopInfo {
  hopIdx: number;
  channelIdx: number;
  carrierFreq: number;
  pnBits: string;
  startBitIdx: number;
  endBitIdx: number;
  startTime: number;
  endTime: number;
  isJammed: boolean;
}

export interface FhssWaveformPoint {
  t: number; // in ms
  tx: number;
  rx: number;
  carrierFreq: number;
  hopBoundary?: number;
  bitBoundary?: number;
}

export interface FhssSpectrumPoint {
  freq: number;
  powerDb: number;
  isChannelCenter?: boolean;
  channelIdx?: number;
}

export interface FhssBitDecision {
  bitIdx: number;
  originalBit: number;
  recoveredBit: number;
  hopIdx: number;
  channelIdx: number;
  carrierFreq: number;
  energy0: number;
  energy1: number;
  deltaEnergy: number; // E1 - E0
  isError: boolean;
  isJammed: boolean;
}

export interface FhssSimulationResult {
  valid: boolean;
  errorMessage?: string;
  dataBits: number[];
  pnBitsUsed: number[];
  hops: FhssHopInfo[];
  decisions: FhssBitDecision[];
  waveform: FhssWaveformPoint[];
  spectrum: FhssSpectrumPoint[];
  carrierHopWaveform: { t: number; CarrierFreq: number }[];
  bitErrors: number;
  ber: number;
  totalBits: number;
  totalHops: number;
  numChannels: number;
  channelSpacing: number;
  baseCarrierFreq: number;
  hopDurationMs: number;
  hoppingRate: number;
  bitRate: number;
  totalDurationMs: number;
  snrDb: number;
  interferenceEnabled: boolean;
  jammedChannel: number;
  collisionsCount: number;
}

/**
 * End-to-end Frequency Hopping Spread Spectrum (FHSS) Simulation:
 * 1. Data bits -> BFSK modulation with continuous phase
 * 2. Group PN sequence bits to select channel index c_h in {0, ..., M_ch - 1}
 * 3. Hopping carrier f_h = f_0 + c_h * Delta_f
 * 4. Pass through AWGN channel + optional narrowband sinusoidal interferer
 * 5. Synchronized dehopping and non-coherent BFSK quadrature correlators
 * 6. Bit decision, error verification, and empirical BER computation
 */
export function simulateFhss(config: FhssSimulationConfig): FhssSimulationResult {
  const {
    dataBitsStr,
    m,
    taps,
    seed,
    numChannels,
    channelSpacing,
    baseCarrierFreq,
    bitsPerHop,
    bitRate,
    snrDb,
    enableInterference,
    interferenceChannelIdx,
    interferencePowerDb,
    rngSeed,
  } = config;

  // Clean data bits
  const cleanBitsStr = dataBitsStr.replace(/[^01]/g, "");
  if (!cleanBitsStr || cleanBitsStr.length === 0) {
    return createEmptyFhssResult("Input data bits cannot be empty.");
  }

  // Validate LFSR
  const seedCheck = validateSeed(seed, m);
  if (!seedCheck.valid) {
    return createEmptyFhssResult(`Invalid LFSR Seed: ${seedCheck.error}`);
  }
  const tapCheck = validateTaps(taps, m);
  if (!tapCheck.valid) {
    return createEmptyFhssResult(`Invalid LFSR Taps: ${tapCheck.error}`);
  }

  const K = cleanBitsStr.length;
  const dataBits = cleanBitsStr.split("").map(Number);

  const M_ch = Math.min(16, Math.max(4, numChannels));
  const bitsPerChannelIndex = Math.ceil(Math.log2(M_ch)); // e.g. 2 for 4 ch, 3 for 8 ch, 4 for 16 ch

  const bph = Math.max(1, Math.round(bitsPerHop));
  const totalHops = Math.ceil(K / bph);
  const totalPnBitsNeeded = totalHops * bitsPerChannelIndex;

  // Generate PN Sequence using existing LFSR generator
  const pnResult = simulatePnSequence(m, taps, seed, totalPnBitsNeeded);
  if (!pnResult.valid) {
    return createEmptyFhssResult(`PN Generation Error: ${pnResult.errorMessage}`);
  }

  const pnBits = pnResult.outputBits.slice(0, totalPnBitsNeeded);
  while (pnBits.length < totalPnBitsNeeded) {
    pnBits.push(pnBits[pnBits.length % pnResult.outputBits.length]);
  }

  // Time & Frequency Setup
  const bitDuration = 1 / bitRate; // e.g., 100 bps -> 10 ms
  const hopDuration = bph * bitDuration;
  const hoppingRate = 1 / hopDuration;
  const totalDuration = K * bitDuration;

  // BFSK tone separation: Delta f_fsk = channelSpacing / 2
  const fskDev = channelSpacing * 0.35; // tone deviation from hopping carrier

  // Jammer setup
  const safeJamChannel = Math.max(0, Math.min(M_ch - 1, interferenceChannelIdx));
  const jammerFreq = baseCarrierFreq + safeJamChannel * channelSpacing;
  const jammerLinearRatio = Math.pow(10, interferencePowerDb / 10);
  const signalAmplitude = 1.0;
  const jammerAmplitude = enableInterference ? signalAmplitude * Math.sqrt(2 * jammerLinearRatio) : 0;

  // Parse Hops
  const hops: FhssHopInfo[] = [];
  let collisionsCount = 0;

  for (let h = 0; h < totalHops; h++) {
    const pnSlice = pnBits.slice(h * bitsPerChannelIndex, (h + 1) * bitsPerChannelIndex);
    const pnSubStr = pnSlice.join("");
    const channelIdx = parseInt(pnSubStr, 2) % M_ch;
    const carrierFreq = baseCarrierFreq + channelIdx * channelSpacing;
    const startBitIdx = h * bph;
    const endBitIdx = Math.min(K - 1, (h + 1) * bph - 1);
    const startTime = h * hopDuration;
    const endTime = Math.min(totalDuration, (h + 1) * hopDuration);
    const isJammed = enableInterference && channelIdx === safeJamChannel;

    if (isJammed) {
      collisionsCount++;
    }

    hops.push({
      hopIdx: h,
      channelIdx,
      carrierFreq,
      pnBits: pnSubStr,
      startBitIdx,
      endBitIdx,
      startTime,
      endTime,
      isJammed,
    });
  }

  // Sampling for continuous waveform & correlation integration
  // Maximum carrier frequency: baseCarrierFreq + (M_ch - 1) * channelSpacing + fskDev
  const maxFreq = baseCarrierFreq + (M_ch - 1) * channelSpacing + fskDev;
  const sampleRate = Math.max(8000, maxFreq * 5); // Well above Nyquist rate
  const totalSamples = Math.floor(totalDuration * sampleRate);
  const dt = 1 / sampleRate;

  // Modulate BFSK over time with continuous phase
  const txSignal = new Float64Array(totalSamples);
  const rxSignal = new Float64Array(totalSamples);
  const timeAxis = new Float64Array(totalSamples);
  const carrierFreqAtSample = new Float64Array(totalSamples);

  let currentPhase = 0;
  const rng = createRng(rngSeed);

  // Noise setup: SNR = P_s / (sigma^2). P_s for sine wave = A^2 / 2 = 0.5.
  const signalPower = 0.5 * signalAmplitude * signalAmplitude;
  const snrLinear = Math.pow(10, snrDb / 10);
  const noisePower = signalPower / snrLinear;
  const noiseStdDev = Math.sqrt(noisePower);

  for (let n = 0; n < totalSamples; n++) {
    const t = n * dt;
    timeAxis[n] = t;

    const bitIdx = Math.min(K - 1, Math.floor(t / bitDuration));
    const hopIdx = Math.min(totalHops - 1, Math.floor(t / hopDuration));
    const hop = hops[hopIdx];
    const bitVal = dataBits[bitIdx];

    // FSK tone frequency for current bit inside current hop:
    // bit 1: carrierFreq + fskDev
    // bit 0: carrierFreq - fskDev
    const toneFreq = hop.carrierFreq + (bitVal === 1 ? fskDev : -fskDev);
    carrierFreqAtSample[n] = hop.carrierFreq;

    // Continuous phase integration: dPhi/dt = 2*pi*f
    currentPhase += 2 * Math.PI * toneFreq * dt;

    const txSample = signalAmplitude * Math.cos(currentPhase);
    txSignal[n] = txSample;

    // Add AWGN
    const noise = generateSeededAWGN(noiseStdDev, rng);

    // Add Narrowband Jammer
    const jammer = enableInterference
      ? jammerAmplitude * Math.cos(2 * Math.PI * jammerFreq * t + 0.42)
      : 0;

    rxSignal[n] = txSample + noise + jammer;
  }

  // Synchronized Receiver Processing:
  // For each data bit, the receiver knows the exact hop carrier f_c and performs
  // non-coherent quadrature correlation for tone 0 (f_c - fskDev) and tone 1 (f_c + fskDev).
  const decisions: FhssBitDecision[] = [];
  let bitErrors = 0;

  for (let k = 0; k < K; k++) {
    const bitStartTime = k * bitDuration;
    const bitEndTime = (k + 1) * bitDuration;
    const startSample = Math.floor(bitStartTime * sampleRate);
    const endSample = Math.min(totalSamples, Math.floor(bitEndTime * sampleRate));

    const hopIdx = Math.min(totalHops - 1, Math.floor(bitStartTime / hopDuration));
    const hop = hops[hopIdx];

    const f0_tone = hop.carrierFreq - fskDev;
    const f1_tone = hop.carrierFreq + fskDev;

    let I0 = 0, Q0 = 0;
    let I1 = 0, Q1 = 0;
    const count = endSample - startSample;

    for (let n = startSample; n < endSample; n++) {
      const t = timeAxis[n];
      const r = rxSignal[n];

      I0 += r * Math.cos(2 * Math.PI * f0_tone * t);
      Q0 += r * Math.sin(2 * Math.PI * f0_tone * t);

      I1 += r * Math.cos(2 * Math.PI * f1_tone * t);
      Q1 += r * Math.sin(2 * Math.PI * f1_tone * t);
    }

    const norm = count > 0 ? count : 1;
    I0 /= norm;
    Q0 /= norm;
    I1 /= norm;
    Q1 /= norm;

    const energy0 = I0 * I0 + Q0 * Q0;
    const energy1 = I1 * I1 + Q1 * Q1;
    const deltaEnergy = energy1 - energy0;

    const recBit = energy1 > energy0 ? 1 : 0;
    const isError = recBit !== dataBits[k];
    if (isError) bitErrors++;

    decisions.push({
      bitIdx: k,
      originalBit: dataBits[k],
      recoveredBit: recBit,
      hopIdx,
      channelIdx: hop.channelIdx,
      carrierFreq: hop.carrierFreq,
      energy0,
      energy1,
      deltaEnergy,
      isError,
      isJammed: hop.isJammed,
    });
  }

  const ber = bitErrors / K;

  // Waveform Downsampling for Recharts (limit to first 12-16 bits for high visual fidelity)
  const maxBitsToDisplay = Math.min(K, 16);
  const displaySamplesCount = Math.floor(maxBitsToDisplay * bitDuration * sampleRate);
  const step = Math.max(1, Math.floor(displaySamplesCount / 350)); // ~350 chart points

  const waveform: FhssWaveformPoint[] = [];
  for (let n = 0; n < displaySamplesCount; n += step) {
    const tMs = Number((timeAxis[n] * 1000).toFixed(3));
    const isHopBoundary = n > 0 && Math.floor(timeAxis[n] / hopDuration) !== Math.floor(timeAxis[n - step] / hopDuration);
    const isBitBoundary = n > 0 && Math.floor(timeAxis[n] / bitDuration) !== Math.floor(timeAxis[n - step] / bitDuration);

    waveform.push({
      t: tMs,
      tx: Number(txSignal[n].toFixed(3)),
      rx: Number(rxSignal[n].toFixed(3)),
      carrierFreq: carrierFreqAtSample[n],
      hopBoundary: isHopBoundary ? 1 : undefined,
      bitBoundary: isBitBoundary ? 1 : undefined,
    });
  }

  // Carrier Frequency vs Time stair-step plot
  const carrierHopWaveform: { t: number; CarrierFreq: number }[] = [];
  for (let h = 0; h < hops.length; h++) {
    const hp = hops[h];
    carrierHopWaveform.push({ t: Number((hp.startTime * 1000).toFixed(2)), CarrierFreq: hp.carrierFreq });
    carrierHopWaveform.push({ t: Number((hp.endTime * 1000).toFixed(2)), CarrierFreq: hp.carrierFreq });
  }

  // Frequency Spectrum computation (FFT-like DFT estimation across the hopping band)
  const spectrum: FhssSpectrumPoint[] = [];
  const minAnalysisFreq = Math.max(0, baseCarrierFreq - channelSpacing);
  const maxAnalysisFreq = baseCarrierFreq + M_ch * channelSpacing;
  const numFreqBins = 100;
  const df = (maxAnalysisFreq - minAnalysisFreq) / numFreqBins;

  const dftStep = Math.max(1, Math.floor(totalSamples / 1200));
  const dftCount = Math.floor(totalSamples / dftStep);

  for (let b = 0; b <= numFreqBins; b++) {
    const f = minAnalysisFreq + b * df;
    let re = 0, im = 0;
    for (let n = 0; n < totalSamples; n += dftStep) {
      const angle = 2 * Math.PI * f * timeAxis[n];
      re += rxSignal[n] * Math.cos(angle);
      im -= rxSignal[n] * Math.sin(angle);
    }
    const mag = Math.sqrt(re * re + im * im) / dftCount;
    const powerDb = 20 * Math.log10(Math.max(1e-4, mag));

    // Check if this bin is near any channel center
    let isCenter = false;
    let chIndex: number | undefined = undefined;
    for (let c = 0; c < M_ch; c++) {
      const fc = baseCarrierFreq + c * channelSpacing;
      if (Math.abs(f - fc) < df * 0.6) {
        isCenter = true;
        chIndex = c;
        break;
      }
    }

    spectrum.push({
      freq: Math.round(f),
      powerDb: Number(powerDb.toFixed(2)),
      isChannelCenter: isCenter,
      channelIdx: chIndex,
    });
  }

  return {
    valid: true,
    dataBits,
    pnBitsUsed: pnBits,
    hops,
    decisions,
    waveform,
    spectrum,
    carrierHopWaveform,
    bitErrors,
    ber,
    totalBits: K,
    totalHops,
    numChannels: M_ch,
    channelSpacing,
    baseCarrierFreq,
    hopDurationMs: hopDuration * 1000,
    hoppingRate,
    bitRate,
    totalDurationMs: totalDuration * 1000,
    snrDb,
    interferenceEnabled: enableInterference,
    jammedChannel: safeJamChannel,
    collisionsCount,
  };
}

function createEmptyFhssResult(errorMessage: string): FhssSimulationResult {
  return {
    valid: false,
    errorMessage,
    dataBits: [],
    pnBitsUsed: [],
    hops: [],
    decisions: [],
    waveform: [],
    spectrum: [],
    carrierHopWaveform: [],
    bitErrors: 0,
    ber: 0,
    totalBits: 0,
    totalHops: 0,
    numChannels: 4,
    channelSpacing: 100,
    baseCarrierFreq: 500,
    hopDurationMs: 10,
    hoppingRate: 100,
    bitRate: 100,
    totalDurationMs: 0,
    snrDb: 10,
    interferenceEnabled: false,
    jammedChannel: 0,
    collisionsCount: 0,
  };
}
