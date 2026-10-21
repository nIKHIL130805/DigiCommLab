// sinc function
const sinc = (x: number) => x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);

export function simulateSampling(
  fm: number, // Signal frequency (Hz)
  fs: number, // Sampling frequency (Hz)
  levels: number, // Quantization levels
  duration: number = 0.05 // 50ms
) {
  // 1. Generate continuous timeline for smooth plotting (high resolution)
  const plotFs = Math.max(10000, fm * 50); 
  const numPoints = Math.floor(duration * plotFs);
  
  const amplitude = 1;
  const time = new Float64Array(numPoints);
  const original = new Float64Array(numPoints);
  
  for(let i = 0; i < numPoints; i++) {
    const t = i / plotFs;
    time[i] = t;
    original[i] = amplitude * Math.sin(2 * Math.PI * fm * t);
  }
  
  // 2. Sampling
  const sampleInterval = 1 / fs;
  const numSamples = Math.floor(duration * fs) + 1;
  const samplePoints: {t: number, v: number, q: number}[] = [];
  
  // 3. Quantization limits
  const vMin = -1;
  const vMax = 1;
  const stepSize = (vMax - vMin) / (levels - 1);
  
  const quantize = (val: number) => {
     if (levels <= 0) return val;
     const levelIdx = Math.round((val - vMin) / stepSize);
     const clampedIdx = Math.max(0, Math.min(levels - 1, levelIdx));
     return vMin + clampedIdx * stepSize;
  };
  
  for(let i = 0; i < numSamples; i++) {
    const t = i * sampleInterval;
    if (t <= duration) {
      const v = amplitude * Math.sin(2 * Math.PI * fm * t);
      samplePoints.push({
        t,
        v,
        q: quantize(v)
      });
    }
  }
  
  // 4. Reconstruction (Ideal Sinc interpolation over quantized samples)
  const reconstructed = new Float64Array(numPoints);
  
  for(let i = 0; i < numPoints; i++) {
    const t = time[i];
    let sum = 0;
    for(let n = 0; n < samplePoints.length; n++) {
      const qn = samplePoints[n].q;
      const tn = samplePoints[n].t;
      // sinc(fs * t - n) where tn = n/fs -> fs * (t - tn)
      sum += qn * sinc(fs * (t - tn));
    }
    reconstructed[i] = sum;
  }
  
  // 5. Calculate Metrics
  let sqError = 0;
  let maxError = 0;
  let signalPower = 0;
  
  for(let i = 0; i < numPoints; i++) {
     const err = Math.abs(original[i] - reconstructed[i]);
     sqError += err * err;
     if (err > maxError) maxError = err;
     signalPower += original[i] * original[i];
  }
  
  const mse = sqError / numPoints;
  const signalPwrAvg = signalPower / numPoints;
  const snr = mse > 1e-12 ? 10 * Math.log10(signalPwrAvg / mse) : Infinity;
  
  // 6. Format data for recharts (downsampled for performance)
  const displayPoints = 400; // Safe number of points for responsive recharts
  const step = Math.max(1, Math.floor(numPoints / displayPoints));
  
  const chartData: any[] = [];
  for(let i = 0; i < numPoints; i += step) {
    chartData.push({
      t: Number((time[i] * 1000).toFixed(3)), // ms
      Original: original[i],
      Reconstructed: reconstructed[i],
      Sampled: null,
      Quantized: null
    });
  }
  
  // Ensure sample points are explicitly included in chartData
  for(let n = 0; n < samplePoints.length; n++) {
    const sp = samplePoints[n];
    const tMs = Number((sp.t * 1000).toFixed(3));
    
    // Check if point already exists close by
    let exists = false;
    for(let i=0; i<chartData.length; i++) {
      if (Math.abs(chartData[i].t - tMs) < 0.001) {
        chartData[i].Sampled = sp.v;
        chartData[i].Quantized = sp.q;
        exists = true;
        break;
      }
    }
    
    if (!exists) {
      // Find interpolation for Original and Reconstructed
      let rApprox = 0;
      let sum = 0;
      for(let k = 0; k < samplePoints.length; k++) {
        sum += samplePoints[k].q * sinc(fs * (sp.t - samplePoints[k].t));
      }
      rApprox = sum;

      chartData.push({
        t: tMs,
        Original: sp.v,
        Reconstructed: rApprox,
        Sampled: sp.v,
        Quantized: sp.q
      });
    }
  }
  
  chartData.sort((a,b) => a.t - b.t);
  
  // Alias frequency calculation
  const nAlias = Math.round(fm / fs);
  let fAlias = Math.abs(fm - nAlias * fs);
  
  // If no aliasing, fAlias is effectively fm.
  const isAliased = fs < 2 * fm;

  return {
    chartData,
    metrics: {
      stepSize,
      maxError,
      mse,
      snr: snr === Infinity ? "Infinity" : snr.toFixed(2),
      isAliased,
      fAlias: fAlias,
      nyquist: 2 * fm,
      ratio: fs / fm
    }
  };
}
