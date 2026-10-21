export type DigitalScheme = 'BASK' | 'BPSK' | 'BFSK' | 'CPFSK' | 'GFSK' | 'PAM4' | 'QPSK' | '8PSK' | 'MSK' | 'DPSK' | '16-QAM' | '64-QAM';
export type ModulationScheme = DigitalScheme;

// Utility: Box-Muller transform for AWGN
export function generateAWGN(stdDev: number): number {
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  return stdDev * Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

// Utility: Simple DFT for spectrum estimation (magnitude only)
export function calculateMagnitudeSpectrum(signal: Float64Array, fs: number, numBins: number = 200, maxFreq: number = fs / 2) {
  const N = signal.length;
  const spectrum = [];
  const freqStep = maxFreq / numBins;
  
  // Downsample time signal to speed up DFT if N is very large
  const step = Math.max(1, Math.floor(N / 1000));
  
  for (let k = 0; k < numBins; k++) {
    const f = k * freqStep;
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n += step) {
      const t = n / fs;
      const angle = 2 * Math.PI * f * t;
      re += signal[n] * Math.cos(angle);
      im -= signal[n] * Math.sin(angle);
    }
    const mag = Math.sqrt(re * re + im * im) / (N / step);
    spectrum.push({ f, magnitude: mag });
  }
  return spectrum;
}

export interface ModResult {
  chartData: any[];
  constellation: any[];
  spectrum: any[];
  metrics: Record<string, string | number>;
  observation: string;
}

export function simulateDigital(
  scheme: DigitalScheme,
  bits: string,
  fc: number,
  symbolRate: number,
  amplitude: number,
  snrDb: number, // AWGN SNR
  fs: number = 10000
): ModResult {
  
  // Clean bits
  const cleanBits = bits.replace(/[^01]/g, '') || '1010';
  
  let bitsPerSymbol = 1;
  if (['QPSK', 'PAM4'].includes(scheme)) bitsPerSymbol = 2;
  if (scheme === '8PSK') bitsPerSymbol = 3;
  if (scheme === '16-QAM') bitsPerSymbol = 4;
  if (scheme === '64-QAM') bitsPerSymbol = 6;
  
  // Pad bits to form full symbols
  let paddedBits = cleanBits;
  while (paddedBits.length % bitsPerSymbol !== 0) {
    paddedBits += '0';
  }
  
  const numSymbols = paddedBits.length / bitsPerSymbol;
  const symbolDuration = 1 / symbolRate;
  const duration = numSymbols * symbolDuration;
  const numPoints = Math.floor(duration * fs);
  
  const time = new Float64Array(numPoints);
  const modulated = new Float64Array(numPoints);
  const messageData = new Float64Array(numPoints);
  
  const constellation: any[] = [];
  const metrics: Record<string, string | number> = {};
  let observation = '';

  // Noise power calculation based on SNR
  // SNR = Es / N0. 
  const noiseStdDev = Math.pow(10, -snrDb / 20) * (amplitude / Math.sqrt(2));
  
  // Helpers for IQ
  const iqSymbols: {i: number, q: number}[] = [];
  let prevPhase = 0; // For DPSK / CPFSK

  // 1. Generate I/Q symbols
  for (let s = 0; s < numSymbols; s++) {
    const chunk = paddedBits.substring(s * bitsPerSymbol, (s + 1) * bitsPerSymbol);
    let I = 0, Q = 0;
    
    switch(scheme) {
      case 'BASK':
        I = chunk === '1' ? amplitude : 0;
        Q = 0;
        break;
      case 'BPSK':
        I = chunk === '1' ? amplitude : -amplitude;
        Q = 0;
        break;
      case 'QPSK':
        // Gray coded: 00: -1,-1 | 01: -1,1 | 11: 1,1 | 10: 1,-1
        I = (chunk[0] === '1' ? 1 : -1) * (amplitude * 0.707);
        Q = (chunk[1] === '1' ? 1 : -1) * (amplitude * 0.707);
        // Map 00 -> -1,-1, 01 -> -1,1, 10 -> 1,-1, 11 -> 1,1
        if (chunk === '00') { I = -1; Q = -1; }
        else if (chunk === '01') { I = -1; Q = 1; }
        else if (chunk === '11') { I = 1; Q = 1; }
        else if (chunk === '10') { I = 1; Q = -1; }
        I *= amplitude * 0.707; Q *= amplitude * 0.707;
        break;
      case '8PSK': {
        const val = parseInt(chunk, 2);
        // Map 0-7 to phases
        const phase = (val * Math.PI) / 4;
        I = amplitude * Math.cos(phase);
        Q = amplitude * Math.sin(phase);
        break;
      }
      case '16-QAM': {
        // 4 bits -> 2 for I, 2 for Q
        const iVal = chunk.substring(0, 2);
        const qVal = chunk.substring(2, 4);
        const map = { '00': -3, '01': -1, '11': 1, '10': 3 };
        I = map[iVal as keyof typeof map] * (amplitude / 3);
        Q = map[qVal as keyof typeof map] * (amplitude / 3);
        break;
      }
      case '64-QAM': {
        // 6 bits -> 3 for I, 3 for Q
        const iVal = chunk.substring(0, 3);
        const qVal = chunk.substring(3, 6);
        const map = { '000': -7, '001': -5, '011': -3, '010': -1, '110': 1, '111': 3, '101': 5, '100': 7 };
        I = map[iVal as keyof typeof map] * (amplitude / 7);
        Q = map[qVal as keyof typeof map] * (amplitude / 7);
        break;
      }
      case 'PAM4': {
        const map = { '00': -3, '01': -1, '11': 1, '10': 3 };
        I = map[chunk as keyof typeof map] * (amplitude / 3);
        Q = 0;
        break;
      }
      case 'DPSK': {
        // Differential PSK
        const phaseShift = chunk === '1' ? Math.PI : 0;
        prevPhase = (prevPhase + phaseShift) % (2 * Math.PI);
        I = amplitude * Math.cos(prevPhase);
        Q = amplitude * Math.sin(prevPhase);
        break;
      }
      case 'BFSK':
      case 'CPFSK':
      case 'GFSK':
      case 'MSK':
        // Handle frequencies natively in the waveform loop instead of IQ
        break;
    }
    
    // Apply AWGN to IQ
    if (!['BFSK', 'CPFSK', 'GFSK', 'MSK'].includes(scheme)) {
      const noisyI = I + generateAWGN(noiseStdDev);
      const noisyQ = Q + generateAWGN(noiseStdDev);
      iqSymbols.push({ i: noisyI, q: noisyQ });
      
      constellation.push({
        I: noisyI,
        Q: noisyQ,
        IdealI: I,
        IdealQ: Q,
        symbol: chunk
      });
    }
  }

  // 2. Generate Waveform
  let currentPhase = 0;
  
  for (let i = 0; i < numPoints; i++) {
    const t = i / fs;
    time[i] = t;
    const symIdx = Math.min(numSymbols - 1, Math.floor(t / symbolDuration));
    const bitIdx = Math.min(paddedBits.length - 1, Math.floor(t / (symbolDuration / bitsPerSymbol)));
    const currentBit = paddedBits[bitIdx];
    
    // To show original digital data
    messageData[i] = currentBit === '1' ? 1 : 0;
    
    if (['BFSK', 'CPFSK', 'GFSK', 'MSK'].includes(scheme)) {
      // Frequency Modulations
      const f0 = fc - symbolRate; // Arbitrary separation for visualization
      const f1 = fc + symbolRate;
      
      if (scheme === 'BFSK') {
        const freq = currentBit === '1' ? f1 : f0;
        modulated[i] = amplitude * Math.cos(2 * Math.PI * freq * t);
      } 
      else if (scheme === 'CPFSK' || scheme === 'MSK') {
        // Continuous phase integration
        const h = scheme === 'MSK' ? 0.5 : 1.0; // Modulation index
        const deltaF = h * symbolRate / 2;
        const freq = fc + (currentBit === '1' ? deltaF : -deltaF);
        
        // integrate phase: phase += 2*pi*f * dt
        currentPhase += 2 * Math.PI * freq * (1/fs);
        modulated[i] = amplitude * Math.cos(currentPhase);
      }
      else if (scheme === 'GFSK') {
        // Extremely simplified GFSK for visualization: smooth the frequency transitions
        // In reality, bits are passed through Gaussian filter.
        // We'll use a very basic lowpass heuristic on the bit stream to simulate smoothing.
        const windowSize = Math.floor(fs / symbolRate);
        let smoothedBit = 0;
        let weightSum = 0;
        for (let w = -windowSize; w <= windowSize; w++) {
          const wIdx = Math.max(0, Math.min(paddedBits.length - 1, Math.floor((t + w/fs) / (symbolDuration / bitsPerSymbol))));
          const bVal = paddedBits[wIdx] === '1' ? 1 : -1;
          const weight = Math.exp(-(w*w)/(0.5 * windowSize * windowSize)); // Gaussian
          smoothedBit += bVal * weight;
          weightSum += weight;
        }
        smoothedBit /= weightSum;
        
        const h = 0.5;
        const deltaF = h * symbolRate / 2;
        const freq = fc + (smoothedBit * deltaF);
        currentPhase += 2 * Math.PI * freq * (1/fs);
        modulated[i] = amplitude * Math.cos(currentPhase);
      }
    } else {
      // IQ Modulations
      const sym = iqSymbols[symIdx];
      // Rectangular pulse shaping used for simplicity
      modulated[i] = sym.i * Math.cos(2 * Math.PI * fc * t) - sym.q * Math.sin(2 * Math.PI * fc * t);
    }
    
    // Add AWGN to time domain signal
    modulated[i] += generateAWGN(noiseStdDev);
  }

  // 3. Format outputs
  metrics['Bits/Symbol'] = bitsPerSymbol;
  metrics['Symbol Rate'] = `${symbolRate} baud`;
  metrics['Bit Rate'] = `${symbolRate * bitsPerSymbol} bps`;
  metrics['Constellation Points'] = Math.pow(2, bitsPerSymbol);
  
  if (scheme === 'MSK') {
    observation = 'Minimum Shift Keying is a continuous-phase FSK scheme with modulation index h=0.5. It avoids phase discontinuities, vastly reducing spectral leakage/sidelobes.';
  } else if (scheme === 'GFSK') {
    observation = 'Gaussian-filtered FSK smooths the baseband pulses before modulation. This eliminates sharp frequency transitions, making the spectrum incredibly compact (widely used in Bluetooth).';
  } else if (scheme === 'DPSK') {
    observation = 'Differential PSK encodes data in the phase difference between consecutive symbols. It eliminates the need for a coherent phase reference at the receiver.';
  } else if (scheme === '16-QAM' || scheme === '64-QAM') {
    observation = `${scheme} varies both amplitude and phase to transmit ${bitsPerSymbol} bits per symbol. High spectral efficiency, but closely packed constellation points make it highly susceptible to noise.`;
  } else {
    observation = `${scheme} modulation transmitting ${bitsPerSymbol} bits per symbol.`;
  }

  const chartData = [];
  const displayStep = Math.max(1, Math.floor(numPoints / 600));
  for (let i = 0; i < numPoints; i += displayStep) {
    chartData.push({
      t: Number((time[i] * 1000).toFixed(2)),
      Data: messageData[i] * amplitude, // Scaled for visibility
      Modulated: modulated[i]
    });
  }

  const spectrum = calculateMagnitudeSpectrum(modulated, fs, 200, fc * 3);

  return {
    chartData,
    constellation,
    spectrum,
    metrics,
    observation
  };
}
