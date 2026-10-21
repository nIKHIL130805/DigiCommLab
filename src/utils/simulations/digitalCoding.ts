export interface DigitalCodingResult {
  t: number;
  original: number;
  sampled: number | null;
  reconstructed: number | null;
  difference: number | null; // For DPCM/DM/ADM
  predicted: number | null; // For DPCM
  stepSize: number | null; // For ADM
}

export interface MetricResult {
  bitsPerSample: number;
  bitRate: number;
  mse: number;
  snr: string;
  quantizationStep?: number;
  slopeOverload?: boolean;
  granularNoise?: boolean;
  initialStepSize?: number;
  minStepSize?: number;
  maxStepSize?: number;
}

export function generateInputSignal(fm: number, amplitude: number, duration: number, plotFs: number) {
  const numPoints = Math.floor(duration * plotFs);
  const time = new Float64Array(numPoints);
  const original = new Float64Array(numPoints);
  
  for(let i = 0; i < numPoints; i++) {
    const t = i / plotFs;
    time[i] = t;
    original[i] = amplitude * Math.sin(2 * Math.PI * fm * t);
  }
  return { time, original, numPoints };
}

const sinc = (x: number) => x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);

function calculateSignalMetrics(original: Float64Array, reconstructed: Float64Array, numPoints: number) {
  let sqError = 0;
  let signalPower = 0;
  
  for(let i = 0; i < numPoints; i++) {
     const err = original[i] - reconstructed[i];
     sqError += err * err;
     signalPower += original[i] * original[i];
  }
  
  const mse = sqError / numPoints;
  const signalPwrAvg = signalPower / numPoints;
  const snr = mse > 1e-12 ? 10 * Math.log10(signalPwrAvg / mse) : Infinity;
  
  return { mse, snr: snr === Infinity ? "Infinity" : snr.toFixed(2) };
}

function quantizeUniform(val: number, vMin: number, vMax: number, levels: number) {
  if (levels <= 0) return val;
  const stepSize = (vMax - vMin) / (levels - 1);
  const levelIdx = Math.round((val - vMin) / stepSize);
  const clampedIdx = Math.max(0, Math.min(levels - 1, levelIdx));
  return vMin + clampedIdx * stepSize;
}

export function pcmEncode(fm: number, fs: number, levels: number, amplitude: number, duration: number) {
  const plotFs = Math.max(10000, fm * 50); 
  const { time, original, numPoints } = generateInputSignal(fm, amplitude, duration, plotFs);
  
  const sampleInterval = 1 / fs;
  const numSamples = Math.floor(duration * fs) + 1;
  const samplePoints: {t: number, v: number, q: number}[] = [];
  
  const vMin = -amplitude;
  const vMax = amplitude;
  const stepSize = levels > 1 ? (vMax - vMin) / (levels - 1) : 0;
  
  for(let i = 0; i < numSamples; i++) {
    const t = i * sampleInterval;
    if (t <= duration) {
      const v = amplitude * Math.sin(2 * Math.PI * fm * t);
      samplePoints.push({
        t,
        v,
        q: quantizeUniform(v, vMin, vMax, levels)
      });
    }
  }
  
  const reconstructed = new Float64Array(numPoints);
  for(let i = 0; i < numPoints; i++) {
    const t = time[i];
    let sum = 0;
    for(let n = 0; n < samplePoints.length; n++) {
      sum += samplePoints[n].q * sinc(fs * (t - samplePoints[n].t));
    }
    reconstructed[i] = sum;
  }
  
  const { mse, snr } = calculateSignalMetrics(original, reconstructed, numPoints);
  const bitsPerSample = Math.max(1, Math.ceil(Math.log2(levels)));
  const bitRate = fs * bitsPerSample;
  
  const chartData = prepareChartData(time, original, reconstructed, samplePoints, duration, plotFs);
  
  return {
    chartData,
    metrics: { bitsPerSample, bitRate, mse, snr, quantizationStep: stepSize }
  };
}

export function dpcmEncode(fm: number, fs: number, levels: number, amplitude: number, duration: number) {
  const plotFs = Math.max(10000, fm * 50); 
  const { time, original, numPoints } = generateInputSignal(fm, amplitude, duration, plotFs);
  
  const sampleInterval = 1 / fs;
  const numSamples = Math.floor(duration * fs) + 1;
  const samplePoints: {t: number, v: number, pred: number, diff: number, qDiff: number, q: number}[] = [];
  
  // DPCM prediction loop
  let prevReconstructed = 0;
  
  // Max diff could be 2*amplitude in worst case.
  const diffMax = amplitude; 
  const diffMin = -amplitude;
  const stepSize = levels > 1 ? (diffMax - diffMin) / (levels - 1) : 0;
  
  for(let i = 0; i < numSamples; i++) {
    const t = i * sampleInterval;
    if (t <= duration) {
      const v = amplitude * Math.sin(2 * Math.PI * fm * t);
      const diff = v - prevReconstructed;
      const qDiff = quantizeUniform(diff, diffMin, diffMax, levels);
      const q = prevReconstructed + qDiff;
      
      samplePoints.push({ t, v, pred: prevReconstructed, diff, qDiff, q });
      prevReconstructed = q;
    }
  }
  
  const reconstructed = new Float64Array(numPoints);
  // Reconstruct using Zero-order hold or sinc. Sinc is more accurate for continuous representation.
  for(let i = 0; i < numPoints; i++) {
    const t = time[i];
    let sum = 0;
    for(let n = 0; n < samplePoints.length; n++) {
      sum += samplePoints[n].q * sinc(fs * (t - samplePoints[n].t));
    }
    reconstructed[i] = sum;
  }
  
  const { mse, snr } = calculateSignalMetrics(original, reconstructed, numPoints);
  const bitsPerSample = Math.max(1, Math.ceil(Math.log2(levels)));
  const bitRate = fs * bitsPerSample;
  
  const chartData = prepareChartData(time, original, reconstructed, samplePoints, duration, plotFs, true);
  
  return {
    chartData,
    metrics: { bitsPerSample, bitRate, mse, snr, quantizationStep: stepSize }
  };
}

export function dmEncode(fm: number, fs: number, delta: number, amplitude: number, duration: number) {
  const plotFs = Math.max(10000, fm * 50); 
  const { time, original, numPoints } = generateInputSignal(fm, amplitude, duration, plotFs);
  
  const sampleInterval = 1 / fs;
  const numSamples = Math.floor(duration * fs) + 1;
  const samplePoints: {t: number, v: number, diff: number, q: number}[] = [];
  
  let prevReconstructed = 0;
  
  for(let i = 0; i < numSamples; i++) {
    const t = i * sampleInterval;
    if (t <= duration) {
      const v = amplitude * Math.sin(2 * Math.PI * fm * t);
      const diff = v - prevReconstructed;
      const qDiff = diff >= 0 ? delta : -delta;
      const q = prevReconstructed + qDiff;
      
      samplePoints.push({ t, v, diff, q });
      prevReconstructed = q;
    }
  }
  
  const reconstructed = new Float64Array(numPoints);
  // DM is typically represented as a staircase (Zero-order hold)
  let spIdx = 0;
  for(let i = 0; i < numPoints; i++) {
    const t = time[i];
    while(spIdx < samplePoints.length - 1 && t >= samplePoints[spIdx+1].t) {
      spIdx++;
    }
    reconstructed[i] = samplePoints[spIdx].q;
  }
  
  const { mse, snr } = calculateSignalMetrics(original, reconstructed, numPoints);
  
  // Slope overload check: max signal slope = 2*pi*fm*A. DM slope tracking = delta * fs
  const maxSignalSlope = 2 * Math.PI * fm * amplitude;
  const dmMaxSlope = delta * fs;
  const slopeOverload = maxSignalSlope > dmMaxSlope;
  
  // Granular noise is dominant when step size is too large compared to signal variations
  const granularNoise = delta > (amplitude * 0.1); 
  
  const chartData = prepareChartData(time, original, reconstructed, samplePoints, duration, plotFs, false, true);
  
  return {
    chartData,
    metrics: { bitsPerSample: 1, bitRate: fs, mse, snr, quantizationStep: delta, slopeOverload, granularNoise }
  };
}

export function admEncode(fm: number, fs: number, initialDelta: number, amplitude: number, duration: number) {
  const plotFs = Math.max(10000, fm * 50); 
  const { time, original, numPoints } = generateInputSignal(fm, amplitude, duration, plotFs);
  
  const sampleInterval = 1 / fs;
  const numSamples = Math.floor(duration * fs) + 1;
  const samplePoints: {t: number, v: number, stepSize: number, q: number}[] = [];
  
  let prevReconstructed = 0;
  let currentDelta = initialDelta;
  let prevBit = 1;
  const K = 1.5; // step size multiplier
  const minDelta = 0.01;
  const maxDelta = amplitude * 1.5;
  
  for(let i = 0; i < numSamples; i++) {
    const t = i * sampleInterval;
    if (t <= duration) {
      const v = amplitude * Math.sin(2 * Math.PI * fm * t);
      const diff = v - prevReconstructed;
      const bit = diff >= 0 ? 1 : -1;
      
      if (i > 0) {
        if (bit === prevBit) {
          currentDelta = Math.min(currentDelta * K, maxDelta);
        } else {
          currentDelta = Math.max(currentDelta / K, minDelta);
        }
      }
      
      const qDiff = bit * currentDelta;
      const q = prevReconstructed + qDiff;
      
      samplePoints.push({ t, v, stepSize: currentDelta, q });
      prevReconstructed = q;
      prevBit = bit;
    }
  }
  
  const reconstructed = new Float64Array(numPoints);
  // Zero-order hold
  let spIdx = 0;
  for(let i = 0; i < numPoints; i++) {
    const t = time[i];
    while(spIdx < samplePoints.length - 1 && t >= samplePoints[spIdx+1].t) {
      spIdx++;
    }
    reconstructed[i] = samplePoints[spIdx].q;
  }
  
  const { mse, snr } = calculateSignalMetrics(original, reconstructed, numPoints);
  
  const chartData = prepareChartData(time, original, reconstructed, samplePoints, duration, plotFs, false, false, true);
  
  return {
    chartData,
    metrics: { bitsPerSample: 1, bitRate: fs, mse, snr, initialStepSize: initialDelta, minStepSize: minDelta, maxStepSize: maxDelta }
  };
}

// Helper to format chart data efficiently
function prepareChartData(
  time: Float64Array, original: Float64Array, reconstructed: Float64Array, 
  samplePoints: any[], duration: number, plotFs: number, 
  includeDiff: boolean = false, includeZOH: boolean = false, includeADM: boolean = false
) {
  const displayPoints = 400;
  const step = Math.max(1, Math.floor(time.length / displayPoints));
  
  const chartData: any[] = [];
  for(let i = 0; i < time.length; i += step) {
    chartData.push({
      t: Number((time[i] * 1000).toFixed(3)),
      Original: original[i],
      Reconstructed: reconstructed[i],
      Sampled: null,
      Quantized: null,
      Predicted: null,
      Difference: null,
      StepSize: null
    });
  }
  
  for(let n = 0; n < samplePoints.length; n++) {
    const sp = samplePoints[n];
    const tMs = Number((sp.t * 1000).toFixed(3));
    
    let exists = false;
    for(let i=0; i<chartData.length; i++) {
      if (Math.abs(chartData[i].t - tMs) < 0.001) {
        chartData[i].Sampled = sp.v;
        chartData[i].Quantized = sp.q;
        if(includeDiff) {
          chartData[i].Difference = sp.diff;
          chartData[i].Predicted = sp.pred;
        }
        if(includeADM) {
          chartData[i].StepSize = sp.stepSize;
        }
        exists = true;
        break;
      }
    }
    
    if (!exists) {
      chartData.push({
        t: tMs,
        Original: sp.v,
        Reconstructed: includeZOH ? sp.q : null, // Approx
        Sampled: sp.v,
        Quantized: sp.q,
        Predicted: includeDiff ? sp.pred : null,
        Difference: includeDiff ? sp.diff : null,
        StepSize: includeADM ? sp.stepSize : null
      });
    }
  }
  
  chartData.sort((a,b) => a.t - b.t);
  return chartData;
}
