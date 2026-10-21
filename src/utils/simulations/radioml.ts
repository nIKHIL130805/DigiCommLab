/**
 * RadioML 2016.10A Dataset Types and Utility Functions
 */

export interface RadioMlRepresentativeWaveform {
  i: number[];
  q: number[];
}

export interface RadioMlSummary {
  dataset: string;
  totalSamples: number;
  sampleShape: [number, number];
  modulationCounts: Record<string, number>;
  snrCounts: Record<string, number>;
  samplesPerModulationSNR: Record<string, number>;
  representativeSamples: Record<string, Record<string, RadioMlRepresentativeWaveform>>;
}

export interface ModulationMetadata {
  name: string;
  family: "Digital PSK" | "Digital QAM" | "Digital FSK" | "Digital PAM" | "Analog AM" | "Analog FM";
  carrierType: "Continuous Waveform" | "Discrete Symbols";
  envelopeType: "Constant Envelope" | "Varying Envelope";
  bitsPerSymbol?: number;
  description: string;
}

export const RADIOML_MODULATION_METADATA: Record<string, ModulationMetadata> = {
  "8PSK": {
    name: "8PSK",
    family: "Digital PSK",
    carrierType: "Discrete Symbols",
    envelopeType: "Constant Envelope",
    bitsPerSymbol: 3,
    description: "8-ary Phase Shift Keying. Transmits 3 bits per symbol using 8 discrete phase states separated by 45° on the unit circle.",
  },
  "AM-DSB": {
    name: "AM-DSB",
    family: "Analog AM",
    carrierType: "Continuous Waveform",
    envelopeType: "Varying Envelope",
    description: "Amplitude Modulation with Double Sideband (transmitted carrier). Modulates carrier amplitude with analog audio signals.",
  },
  "AM-SSB": {
    name: "AM-SSB",
    family: "Analog AM",
    carrierType: "Continuous Waveform",
    envelopeType: "Varying Envelope",
    description: "Single Sideband suppressed carrier AM. Highly spectrally efficient analog modulation occupying half the RF bandwidth of DSB.",
  },
  "BPSK": {
    name: "BPSK",
    family: "Digital PSK",
    carrierType: "Discrete Symbols",
    envelopeType: "Constant Envelope",
    bitsPerSymbol: 1,
    description: "Binary Phase Shift Keying. Antipodal phase states (0° and 180°), transmitting 1 bit per symbol with maximum Euclidean distance.",
  },
  "CPFSK": {
    name: "CPFSK",
    family: "Digital FSK",
    carrierType: "Continuous Waveform",
    envelopeType: "Constant Envelope",
    bitsPerSymbol: 1,
    description: "Continuous Phase Frequency Shift Keying. Eliminates phase discontinuities between bit transitions to suppress out-of-band spectral sidelobes.",
  },
  "GFSK": {
    name: "GFSK",
    family: "Digital FSK",
    carrierType: "Continuous Waveform",
    envelopeType: "Constant Envelope",
    bitsPerSymbol: 1,
    description: "Gaussian Frequency Shift Keying. Passes binary pulses through a Gaussian filter prior to frequency modulation (standard in Bluetooth and DECT).",
  },
  "PAM4": {
    name: "PAM4",
    family: "Digital PAM",
    carrierType: "Discrete Symbols",
    envelopeType: "Varying Envelope",
    bitsPerSymbol: 2,
    description: "4-level Pulse Amplitude Modulation. Transmits 2 bits per symbol across 4 distinct discrete amplitude levels along the In-Phase axis.",
  },
  "QAM16": {
    name: "QAM16",
    family: "Digital QAM",
    carrierType: "Discrete Symbols",
    envelopeType: "Varying Envelope",
    bitsPerSymbol: 4,
    description: "16-state Quadrature Amplitude Modulation. Combines 4 amplitude levels and 12 phase positions in a 4×4 grid transmitting 4 bits per symbol.",
  },
  "QAM64": {
    name: "QAM64",
    family: "Digital QAM",
    carrierType: "Discrete Symbols",
    envelopeType: "Varying Envelope",
    bitsPerSymbol: 6,
    description: "64-state Quadrature Amplitude Modulation. Dense 8×8 rectangular grid transmitting 6 bits per symbol with high spectral efficiency.",
  },
  "QPSK": {
    name: "QPSK",
    family: "Digital PSK",
    carrierType: "Discrete Symbols",
    envelopeType: "Constant Envelope",
    bitsPerSymbol: 2,
    description: "Quadrature Phase Shift Keying. 4 orthogonal phase states (45°, 135°, 225°, 315°), transmitting 2 bits per symbol.",
  },
  "WBFM": {
    name: "WBFM",
    family: "Analog FM",
    carrierType: "Continuous Waveform",
    envelopeType: "Constant Envelope",
    description: "Wideband Frequency Modulation. Modulates carrier frequency with high modulation index (Carson's bandwidth), resilient against amplitude noise.",
  },
};

export interface SampleSignalStats {
  sampleCount: number;
  rmsAmplitude: number;
  peakAmplitude: number;
  meanPower: number;
  paprDb: number;
  iVariance: number;
  qVariance: number;
}

/**
 * Computes authentic statistical metrics on a 128-sample I/Q vector
 */
export function computeSignalStats(iArr: number[], qArr: number[]): SampleSignalStats {
  const n = Math.min(iArr.length, qArr.length);
  if (n === 0) {
    return {
      sampleCount: 0,
      rmsAmplitude: 0,
      peakAmplitude: 0,
      meanPower: 0,
      paprDb: 0,
      iVariance: 0,
      qVariance: 0,
    };
  }

  let sumPower = 0;
  let maxMag = 0;
  let sumI = 0;
  let sumQ = 0;

  for (let k = 0; k < n; k++) {
    const iVal = iArr[k];
    const qVal = qArr[k];
    const magSq = iVal * iVal + qVal * qVal;
    const mag = Math.sqrt(magSq);

    sumPower += magSq;
    if (mag > maxMag) maxMag = mag;
    sumI += iVal;
    sumQ += qVal;
  }

  const meanPower = sumPower / n;
  const rmsAmplitude = Math.sqrt(meanPower);
  const meanI = sumI / n;
  const meanQ = sumQ / n;

  let varI = 0;
  let varQ = 0;
  for (let k = 0; k < n; k++) {
    const dI = iArr[k] - meanI;
    const dQ = qArr[k] - meanQ;
    varI += dI * dI;
    varQ += dQ * dQ;
  }
  varI /= n;
  varQ /= n;

  const paprLinear = meanPower > 1e-12 ? (maxMag * maxMag) / meanPower : 1;
  const paprDb = 10 * Math.log10(Math.max(1, paprLinear));

  return {
    sampleCount: n,
    rmsAmplitude: Number(rmsAmplitude.toFixed(5)),
    peakAmplitude: Number(maxMag.toFixed(5)),
    meanPower: Number(meanPower.toFixed(6)),
    paprDb: Number(paprDb.toFixed(2)),
    iVariance: Number(varI.toFixed(6)),
    qVariance: Number(varQ.toFixed(6)),
  };
}

export interface IqWaveformPoint {
  sample: number;
  I: number;
  Q: number;
  magnitude: number;
}

export function formatIqWaveform(iArr: number[], qArr: number[]): IqWaveformPoint[] {
  const n = Math.min(iArr.length, qArr.length);
  const points: IqWaveformPoint[] = [];

  for (let k = 0; k < n; k++) {
    const iVal = iArr[k];
    const qVal = qArr[k];
    points.push({
      sample: k,
      I: iVal,
      Q: qVal,
      magnitude: Number(Math.sqrt(iVal * iVal + qVal * qVal).toFixed(5)),
    });
  }

  return points;
}

export interface ConstellationScatterPoint {
  sample: number;
  I: number;
  Q: number;
}

export function formatConstellationScatter(iArr: number[], qArr: number[]): ConstellationScatterPoint[] {
  const n = Math.min(iArr.length, qArr.length);
  const points: ConstellationScatterPoint[] = [];

  for (let k = 0; k < n; k++) {
    points.push({
      sample: k,
      I: iArr[k],
      Q: qArr[k],
    });
  }

  return points;
}
