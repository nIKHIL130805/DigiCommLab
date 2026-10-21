export interface TapPreset {
  name: string;
  taps: number[];
  polynomial: string;
  isPrimitive: boolean;
}

export const LFSR_PRESETS: Record<number, TapPreset[]> = {
  3: [
    { name: "[3, 2] (Standard)", taps: [3, 2], polynomial: "x³ + x² + 1", isPrimitive: true },
    { name: "[3, 1]", taps: [3, 1], polynomial: "x³ + x + 1", isPrimitive: true },
  ],
  4: [
    { name: "[4, 3] (Standard)", taps: [4, 3], polynomial: "x⁴ + x³ + 1", isPrimitive: true },
    { name: "[4, 1]", taps: [4, 1], polynomial: "x⁴ + x + 1", isPrimitive: true },
    { name: "[4, 2] (Non-primitive)", taps: [4, 2], polynomial: "x⁴ + x² + 1", isPrimitive: false },
  ],
  5: [
    { name: "[5, 3] (Standard)", taps: [5, 3], polynomial: "x⁵ + x³ + 1", isPrimitive: true },
    { name: "[5, 2]", taps: [5, 2], polynomial: "x⁵ + x² + 1", isPrimitive: true },
    { name: "[5, 4, 3, 2]", taps: [5, 4, 3, 2], polynomial: "x⁵ + x⁴ + x³ + x² + 1", isPrimitive: true },
  ],
  6: [
    { name: "[6, 5] (Standard)", taps: [6, 5], polynomial: "x⁶ + x⁵ + 1", isPrimitive: true },
    { name: "[6, 1]", taps: [6, 1], polynomial: "x⁶ + x + 1", isPrimitive: true },
    { name: "[6, 5, 2, 1]", taps: [6, 5, 2, 1], polynomial: "x⁶ + x⁵ + x² + x + 1", isPrimitive: true },
  ],
  7: [
    { name: "[7, 6] (Standard)", taps: [7, 6], polynomial: "x⁷ + x⁶ + 1", isPrimitive: true },
    { name: "[7, 3]", taps: [7, 3], polynomial: "x⁷ + x³ + 1", isPrimitive: true },
    { name: "[7, 1]", taps: [7, 1], polynomial: "x⁷ + x + 1", isPrimitive: true },
  ],
  8: [
    { name: "[8, 6, 5, 4] (Standard)", taps: [8, 6, 5, 4], polynomial: "x⁸ + x⁶ + x⁵ + x⁴ + 1", isPrimitive: true },
    { name: "[8, 6, 5, 3]", taps: [8, 6, 5, 3], polynomial: "x⁸ + x⁶ + x⁵ + x³ + 1", isPrimitive: true },
    { name: "[8, 4, 3, 2]", taps: [8, 4, 3, 2], polynomial: "x⁸ + x⁴ + x³ + x² + 1", isPrimitive: true },
  ],
};

export interface LfsrStep {
  step: number;
  state: number[];
  stateStr: string;
  stateHex: string;
  tappedBits: { stage: number; val: number }[];
  feedbackBit: number;
  outputBit: number;
  isPeriodStart?: boolean;
}

export interface PnSimulationResult {
  valid: boolean;
  errorMessage?: string;
  sequence: string;
  outputBits: number[];
  steps: LfsrStep[];
  period: number;
  maxPeriod: number;
  isMaximal: boolean;
  balance: {
    ones: number;
    zeros: number;
    diff: number;
  };
  runs: {
    totalRuns: number;
    onesRuns: number;
    zerosRuns: number;
  };
  chartData: { t: number; Amplitude: number; BitBoundary?: number }[];
  polynomialStr: string;
  feedbackEquation: string;
}

/**
 * Validates seed string
 */
export function validateSeed(seed: string, m: number): { valid: boolean; error?: string } {
  if (!seed || seed.length === 0) {
    return { valid: false, error: "Seed cannot be empty." };
  }
  if (!/^[01]+$/.test(seed)) {
    return { valid: false, error: "Seed must contain only binary digits (0 or 1)." };
  }
  if (seed.length !== m) {
    return { valid: false, error: `Seed length must be exactly ${m} bits (currently ${seed.length}).` };
  }
  if (!seed.includes("1")) {
    return { valid: false, error: "Initial seed cannot be all zeros (XOR-feedback with all zeros remains in an unrecoverable zero state)." };
  }
  return { valid: true };
}

/**
 * Validates tap positions
 */
export function validateTaps(taps: number[], m: number): { valid: boolean; error?: string } {
  if (!taps || taps.length === 0) {
    return { valid: false, error: "At least one feedback tap must be specified." };
  }
  for (const t of taps) {
    if (!Number.isInteger(t) || t < 1 || t > m) {
      return { valid: false, error: `Tap position ${t} is invalid. Taps must be integers between 1 and ${m}.` };
    }
  }
  if (!taps.includes(m)) {
    return { valid: false, error: `The last stage (stage ${m}) must be tapped to maintain an m-stage register polynomial.` };
  }
  return { valid: true };
}

/**
 * Helper to build polynomial string from taps
 */
export function buildPolynomialStr(taps: number[]): string {
  const sortedTaps = [...taps].sort((a, b) => b - a);
  const terms: string[] = [];
  for (const t of sortedTaps) {
    if (t === 1) terms.push("x");
    else terms.push(`x^${t}`);
  }
  terms.push("1");
  return terms.join(" + ");
}

/**
 * Computes runs in a binary sequence
 */
function analyzeRuns(bits: number[]): { totalRuns: number; onesRuns: number; zerosRuns: number } {
  if (bits.length === 0) return { totalRuns: 0, onesRuns: 0, zerosRuns: 0 };
  let onesRuns = 0;
  let zerosRuns = 0;
  let currentVal = bits[0];
  if (currentVal === 1) onesRuns++;
  else zerosRuns++;

  for (let i = 1; i < bits.length; i++) {
    if (bits[i] !== currentVal) {
      currentVal = bits[i];
      if (currentVal === 1) onesRuns++;
      else zerosRuns++;
    }
  }

  return {
    totalRuns: onesRuns + zerosRuns,
    onesRuns,
    zerosRuns,
  };
}

/**
 * Detects the period of the LFSR configuration
 */
export function detectLfsrPeriod(m: number, taps: number[], seedStr: string): number {
  const reg = seedStr.split("").map(Number);
  const stateMap = new Map<string, number>();
  const initial = reg.join("");
  stateMap.set(initial, 0);

  const maxLimit = Math.min(2048, (1 << m) + 10);

  for (let cycle = 1; cycle <= maxLimit; cycle++) {
    let fb = 0;
    for (const t of taps) {
      fb ^= reg[t - 1];
    }
    // Shift right
    for (let i = m - 1; i > 0; i--) {
      reg[i] = reg[i - 1];
    }
    reg[0] = fb;
    const curr = reg.join("");

    if (stateMap.has(curr)) {
      const prevCycle = stateMap.get(curr)!;
      return cycle - prevCycle;
    }
    stateMap.set(curr, cycle);
  }

  return maxLimit;
}

/**
 * Full LFSR Simulation
 * 
 * Shift Convention:
 * - Fibonacci LFSR, Right Shift:
 *   [ Stage 1 ] -> [ Stage 2 ] -> ... -> [ Stage m ] -> Output Bit
 *   Feedback bit f = XOR(Stage_i for i in taps)
 *   Stage 1 receives f on clock pulse.
 */
export function simulatePnSequence(
  m: number,
  taps: number[],
  seed: string,
  numChipsToGenerate: number = 64
): PnSimulationResult {
  const seedVal = validateSeed(seed, m);
  if (!seedVal.valid) {
    return {
      valid: false,
      errorMessage: seedVal.error,
      sequence: "",
      outputBits: [],
      steps: [],
      period: 0,
      maxPeriod: (1 << m) - 1,
      isMaximal: false,
      balance: { ones: 0, zeros: 0, diff: 0 },
      runs: { totalRuns: 0, onesRuns: 0, zerosRuns: 0 },
      chartData: [],
      polynomialStr: buildPolynomialStr(taps),
      feedbackEquation: `f = ${taps.map(t => `s${t}`).join(" ⊕ ")}`,
    };
  }

  const tapVal = validateTaps(taps, m);
  if (!tapVal.valid) {
    return {
      valid: false,
      errorMessage: tapVal.error,
      sequence: "",
      outputBits: [],
      steps: [],
      period: 0,
      maxPeriod: (1 << m) - 1,
      isMaximal: false,
      balance: { ones: 0, zeros: 0, diff: 0 },
      runs: { totalRuns: 0, onesRuns: 0, zerosRuns: 0 },
      chartData: [],
      polynomialStr: buildPolynomialStr(taps),
      feedbackEquation: `f = ${taps.map(t => `s${t}`).join(" ⊕ ")}`,
    };
  }

  const maxPeriod = (1 << m) - 1;
  const period = detectLfsrPeriod(m, taps, seed);
  const isMaximal = period === maxPeriod;

  // Simulate generation
  const reg = seed.split("").map(Number);
  const steps: LfsrStep[] = [];
  const outputBits: number[] = [];

  const initialSeed = seed;

  for (let k = 0; k < numChipsToGenerate; k++) {
    const currentState = [...reg];
    const stateStr = currentState.join("");
    const stateHex = "0x" + parseInt(stateStr, 2).toString(16).toUpperCase();

    // Output is stage m (reg[m-1])
    const outBit = currentState[m - 1];
    outputBits.push(outBit);

    // Feedback is XOR of tapped stages
    const tappedBits = taps.map(t => ({ stage: t, val: currentState[t - 1] }));
    let fb = 0;
    for (const item of tappedBits) {
      fb ^= item.val;
    }

    const isPeriodStart = k > 0 && stateStr === initialSeed;

    steps.push({
      step: k,
      state: currentState,
      stateStr,
      stateHex,
      tappedBits,
      feedbackBit: fb,
      outputBit: outBit,
      isPeriodStart,
    });

    // Shift register right
    for (let i = m - 1; i > 0; i--) {
      reg[i] = reg[i - 1];
    }
    reg[0] = fb;
  }

  const sequence = outputBits.join("");

  // Balance property of the generated period (or sequence)
  const periodBits = outputBits.slice(0, Math.min(outputBits.length, period));
  let onesCount = 0;
  for (const b of periodBits) {
    if (b === 1) onesCount++;
  }
  const zerosCount = periodBits.length - onesCount;
  const balance = {
    ones: onesCount,
    zeros: zerosCount,
    diff: Math.abs(onesCount - zerosCount),
  };

  const runs = analyzeRuns(periodBits);

  // Generate crisp digital waveform with vertical transitions
  const chartData: { t: number; Amplitude: number; BitBoundary?: number }[] = [];
  const chipDuration = 1; // Normalized chip interval 1 ms
  const dt = chipDuration / 50;

  for (let i = 0; i < outputBits.length; i++) {
    const bit = outputBits[i];
    const val = bit === 1 ? 1 : 0;
    const tStart = i * chipDuration;
    const tEnd = (i + 1) * chipDuration;

    if (i > 0) {
      chartData.push({ t: tStart - dt * 0.1, Amplitude: outputBits[i - 1] === 1 ? 1 : 0 });
      chartData.push({ t: tStart, Amplitude: val, BitBoundary: 1 });
    } else {
      chartData.push({ t: tStart, Amplitude: val, BitBoundary: 1 });
    }
    chartData.push({ t: tEnd - dt * 0.1, Amplitude: val });
  }

  // End point
  if (chartData.length > 0) {
    chartData.push({
      t: outputBits.length * chipDuration,
      Amplitude: chartData[chartData.length - 1].Amplitude,
    });
  }

  return {
    valid: true,
    sequence,
    outputBits,
    steps,
    period,
    maxPeriod,
    isMaximal,
    balance,
    runs,
    chartData,
    polynomialStr: buildPolynomialStr(taps),
    feedbackEquation: `f = ${taps.map(t => `s${t}`).join(" ⊕ ")}`,
  };
}
