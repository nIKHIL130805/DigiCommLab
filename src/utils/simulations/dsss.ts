import { simulatePnSequence, validateSeed, validateTaps } from "./pnSequence";

/**
 * Seeded PRNG (Mulberry32) for deterministic, reproducible simulation runs
 */
export function createRng(seed: number = 1337) {
  let s = (seed >>> 0) || 1;
  return function next(): number {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates zero-mean Gaussian random variable with given stdDev using Box-Muller
 */
export function generateSeededAWGN(stdDev: number, rng: () => number): number {
  if (stdDev <= 0) return 0;
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = rng();
  while (u2 === 0) u2 = rng();
  return stdDev * Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Standard Gaussian Q-function: Q(x) = 0.5 * erfc(x / sqrt(2))
 */
export function qFunction(x: number): number {
  if (x <= 0) return 0.5;
  // Approximation of erfc(z)
  const z = x / Math.SQRT2;
  const t = 1.0 / (1.0 + 0.3275911 * z);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return 0.5 * poly * Math.exp(-z * z);
}

export interface DsssSimulationConfig {
  dataBitsStr: string;
  m: number;
  taps: number[];
  seed: string;
  spreadingFactor: number; // N = chips per bit
  ebNoDb: number; // Eb/N0 in dB
  bitRate: number; // bits per second (e.g. 1000 bps)
  enableInterference: boolean;
  interferenceFreqRatio: number; // fj / Rc, e.g. 0.15
  interferencePowerDb: number; // Jamming-to-Signal ratio J/S in dB
  rngSeed: number;
}

export interface DsssWaveformPoint {
  t: number;
  dataBit?: number;
  pnChip?: number;
  tx: number;
  rx: number;
  bitBoundary?: number;
  chipBoundary?: number;
}

export interface DsssSimulationResult {
  valid: boolean;
  errorMessage?: string;
  dataBits: number[];
  pnChips: number[];
  spreadChips: number[];
  waveform: DsssWaveformPoint[];
  despreadValues: number[]; // Decision metric y_k for each bit
  recoveredBits: number[];
  bitErrors: number;
  ber: number;
  theoreticalBer: number;
  processingGainLinear: number;
  processingGainDb: number;
  bitRate: number;
  chipRate: number;
  spreadingFactor: number;
  totalBits: number;
  totalChips: number;
  interferenceEnabled: boolean;
  snrDb: number;
  noiseStdDev: number;
  jammerAmplitude: number;
}

/**
 * Executes an end-to-end Direct Sequence Spread Spectrum (DSSS) simulation:
 * 1. Data bits -> bipolar symbols: 0 -> -1, 1 -> +1
 * 2. PN chips -> bipolar chips: 0 -> -1, 1 -> +1
 * 3. Spreading: s[k, i] = b[k] * c[i]
 * 4. AWGN channel + optional sinusoidal narrowband jammer
 * 5. Synchronized receiver despreading: d[n] = r[n] * c[n]
 * 6. Integrate & dump over N chips: y[k] = (1/N) * sum(d[k*N + i])
 * 7. Hard decision: y[k] >= 0 -> 1, y[k] < 0 -> 0
 * 8. Error counting and empirical BER
 */
export function simulateDsss(config: DsssSimulationConfig): DsssSimulationResult {
  const {
    dataBitsStr,
    m,
    taps,
    seed,
    spreadingFactor,
    ebNoDb,
    bitRate,
    enableInterference,
    interferenceFreqRatio,
    interferencePowerDb,
    rngSeed,
  } = config;

  // Validate data bits
  const cleanBitsStr = dataBitsStr.replace(/[^01]/g, "");
  if (!cleanBitsStr || cleanBitsStr.length === 0) {
    return createEmptyDsssResult("Input data bits cannot be empty. Please enter a valid binary string.");
  }

  // Validate LFSR parameters
  const seedCheck = validateSeed(seed, m);
  if (!seedCheck.valid) {
    return createEmptyDsssResult(`Invalid LFSR Seed: ${seedCheck.error}`);
  }

  const tapCheck = validateTaps(taps, m);
  if (!tapCheck.valid) {
    return createEmptyDsssResult(`Invalid LFSR Taps: ${tapCheck.error}`);
  }

  const N = Math.max(1, Math.round(spreadingFactor));
  const K = cleanBitsStr.length;
  const totalChipsNeeded = K * N;

  // Generate PN Sequence using the actual Stage 1 LFSR simulator
  const pnResult = simulatePnSequence(m, taps, seed, totalChipsNeeded);
  if (!pnResult.valid) {
    return createEmptyDsssResult(`PN Generation Error: ${pnResult.errorMessage}`);
  }

  const dataBits = cleanBitsStr.split("").map(Number);
  const pnChips = pnResult.outputBits.slice(0, totalChipsNeeded);

  // If for any reason fewer chips were generated, repeat cyclically
  while (pnChips.length < totalChipsNeeded) {
    pnChips.push(pnChips[pnChips.length % pnResult.outputBits.length]);
  }

  // Bipolar mapping: 0 -> -1, 1 -> +1
  const bipolarData = dataBits.map(b => (b === 1 ? 1 : -1));
  const bipolarPn = pnChips.map(c => (c === 1 ? 1 : -1));

  // Spreading: s[n] = b[k] * p[n]
  const spreadChips: number[] = new Array(totalChipsNeeded);
  for (let k = 0; k < K; k++) {
    const bitVal = bipolarData[k];
    const offset = k * N;
    for (let i = 0; i < N; i++) {
      spreadChips[offset + i] = bitVal * bipolarPn[offset + i];
    }
  }

  // Channel Parameters
  // Convention:
  // Chip duration Tc = 1 / Rc, Bit duration Tb = N * Tc.
  // Transmitted chip pulse amplitude A = 1 (Power P_s = 1).
  // Bit energy Eb = N * Ec = N.
  // Linear Eb/N0 = 10^(ebNoDb / 10).
  // N0 = Eb / (Eb/N0) = N / 10^(ebNoDb / 10).
  // Discrete noise variance per chip sample: sigma_chip^2 = N0 / 2 = N / (2 * 10^(ebNoDb / 10)).
  const ebNoLinear = Math.pow(10, ebNoDb / 10);
  const noiseVariance = N / (2 * ebNoLinear);
  const noiseStdDev = Math.sqrt(noiseVariance);

  // Narrowband Jammer:
  // Jammer power P_J = (A_J^2) / 2.
  // With signal power P_S = 1, J/S = 10^(interferencePowerDb / 10) => A_J = sqrt(2 * 10^(interferencePowerDb / 10)).
  const jammerLinearRatio = Math.pow(10, interferencePowerDb / 10);
  const jammerAmplitude = enableInterference ? Math.sqrt(2 * jammerLinearRatio) : 0;
  const jammerNormFreq = Math.max(0.01, Math.min(0.49, interferenceFreqRatio));

  const rng = createRng(rngSeed);

  // Pass through channel: r[n] = s[n] + w[n] + j[n]
  const rxChips: number[] = new Array(totalChipsNeeded);
  for (let n = 0; n < totalChipsNeeded; n++) {
    const noise = generateSeededAWGN(noiseStdDev, rng);
    const jammer = enableInterference
      ? jammerAmplitude * Math.cos(2 * Math.PI * jammerNormFreq * n + 0.35)
      : 0;
    rxChips[n] = spreadChips[n] + noise + jammer;
  }

  // Receiver Despreading:
  // d[n] = r[n] * p[n]
  const despreadChips: number[] = new Array(totalChipsNeeded);
  for (let n = 0; n < totalChipsNeeded; n++) {
    despreadChips[n] = rxChips[n] * bipolarPn[n];
  }

  // Integration & Dump (Sum over N chips for each bit):
  // y[k] = (1 / N) * sum_{i=0}^{N-1} d[k*N + i]
  const despreadValues: number[] = new Array(K);
  const recoveredBits: number[] = new Array(K);
  let bitErrors = 0;

  for (let k = 0; k < K; k++) {
    const offset = k * N;
    let sum = 0;
    for (let i = 0; i < N; i++) {
      sum += despreadChips[offset + i];
    }
    const yk = sum / N;
    despreadValues[k] = yk;
    const recBit = yk >= 0 ? 1 : 0;
    recoveredBits[k] = recBit;

    if (recBit !== dataBits[k]) {
      bitErrors++;
    }
  }

  const ber = bitErrors / K;

  // Theoretical BPSK BER over AWGN: Q(sqrt(2 * Eb/N0))
  const theoreticalBer = qFunction(Math.sqrt(2 * ebNoLinear));

  // Processing Gain
  const processingGainLinear = N;
  const processingGainDb = 10 * Math.log10(N);

  const chipRate = bitRate * N;

  // Generate crisp waveform visualization dataset (limit display to first 24 bits or 384 chips for clean rendering)
  const maxDisplayBits = Math.min(K, 24);
  const displayChipsCount = maxDisplayBits * N;
  const waveform: DsssWaveformPoint[] = [];

  const timePerChip = 1 / chipRate;
  const samplesPerChip = 4; // 4 samples per chip for crisp stepped edges and analog noise visibility
  const dt = timePerChip / samplesPerChip;

  let globalSampleIdx = 0;
  for (let c = 0; c < displayChipsCount; c++) {
    const bitIdx = Math.floor(c / N);
    const txVal = spreadChips[c];
    const rxVal = rxChips[c];
    const pnVal = bipolarPn[c];
    const dataVal = bipolarData[bitIdx];

    const isChipStart = c % N === 0;

    for (let s = 0; s < samplesPerChip; s++) {
      const t = globalSampleIdx * dt;
      waveform.push({
        t: Number((t * 1000).toFixed(4)), // in milliseconds
        dataBit: dataVal,
        pnChip: pnVal,
        tx: txVal,
        rx: Number(rxVal.toFixed(3)),
        bitBoundary: s === 0 && isChipStart ? 1 : undefined,
        chipBoundary: s === 0 ? 1 : undefined,
      });
      globalSampleIdx++;
    }
  }

  return {
    valid: true,
    dataBits,
    pnChips,
    spreadChips,
    waveform,
    despreadValues,
    recoveredBits,
    bitErrors,
    ber,
    theoreticalBer,
    processingGainLinear,
    processingGainDb,
    bitRate,
    chipRate,
    spreadingFactor: N,
    totalBits: K,
    totalChips: totalChipsNeeded,
    interferenceEnabled: enableInterference,
    snrDb: ebNoDb,
    noiseStdDev,
    jammerAmplitude,
  };
}

function createEmptyDsssResult(errorMessage: string): DsssSimulationResult {
  return {
    valid: false,
    errorMessage,
    dataBits: [],
    pnChips: [],
    spreadChips: [],
    waveform: [],
    despreadValues: [],
    recoveredBits: [],
    bitErrors: 0,
    ber: 0,
    theoreticalBer: 0,
    processingGainLinear: 1,
    processingGainDb: 0,
    bitRate: 1000,
    chipRate: 1000,
    spreadingFactor: 1,
    totalBits: 0,
    totalChips: 0,
    interferenceEnabled: false,
    snrDb: 0,
    noiseStdDev: 0,
    jammerAmplitude: 0,
  };
}
