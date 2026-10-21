export type LineCodeScheme = 'Unipolar NRZ' | 'Polar NRZ' | 'Polar RZ' | 'Manchester' | 'Bipolar AMI' | 'Differential';

export interface LineCodingResult {
  chartData: any[];
  metrics: {
    averageValue: number;
    bandwidthApprox: string;
    levels: number;
  };
}

export function validateBitSequence(seq: string): string {
  // Only keep 0s and 1s
  return seq.replace(/[^01]/g, '');
}

export function generateRandomBits(length: number): string {
  let seq = '';
  for(let i = 0; i < length; i++) {
    seq += Math.random() > 0.5 ? '1' : '0';
  }
  return seq;
}

export function encodeLineCode(
  sequence: string,
  scheme: LineCodeScheme,
  amplitude: number,
  bitDuration: number
): LineCodingResult {
  const chartData: any[] = [];
  const pointsPerBit = 100; // Resolution
  const dt = bitDuration / pointsPerBit;
  
  let sum = 0;
  let amiLastPolarity = -amplitude;
  let diffCurrentState = amplitude; // Assume initial state is +A
  let levels = 2;
  
  for(let i = 0; i < sequence.length; i++) {
    const bit = sequence[i];
    const tStart = i * bitDuration;
    
    // Determine the values for the two halves of the bit period
    let valFirstHalf = 0;
    let valSecondHalf = 0;
    
    switch(scheme) {
      case 'Unipolar NRZ':
        valFirstHalf = bit === '1' ? amplitude : 0;
        valSecondHalf = valFirstHalf;
        levels = 2;
        break;
      case 'Polar NRZ':
        valFirstHalf = bit === '1' ? amplitude : -amplitude;
        valSecondHalf = valFirstHalf;
        levels = 2;
        break;
      case 'Polar RZ':
        valFirstHalf = bit === '1' ? amplitude : -amplitude;
        valSecondHalf = 0;
        levels = 3;
        break;
      case 'Manchester':
        // Convention: 1 -> +A to -A, 0 -> -A to +A
        valFirstHalf = bit === '1' ? amplitude : -amplitude;
        valSecondHalf = bit === '1' ? -amplitude : amplitude;
        levels = 2;
        break;
      case 'Bipolar AMI':
        if (bit === '0') {
          valFirstHalf = 0;
        } else {
          amiLastPolarity = -amiLastPolarity;
          valFirstHalf = amiLastPolarity;
        }
        valSecondHalf = valFirstHalf;
        levels = 3;
        break;
      case 'Differential':
        // Differential NRZ-Mark: 1 causes transition, 0 causes no transition.
        if (bit === '1') {
          diffCurrentState = -diffCurrentState;
        }
        valFirstHalf = diffCurrentState;
        valSecondHalf = valFirstHalf;
        levels = 2;
        break;
    }
    
    // Generate high-resolution points for smooth charting with exact step transitions
    // We add a point exactly at the boundary to make step charts clean without diagonal lines if plotted with linear interpolation
    
    if (i > 0) {
      // Add strict boundary point to avoid interpolation slopes
      chartData.push({ t: tStart, Amplitude: valFirstHalf, BitBoundary: 0 });
    }
    
    // Midpoint boundary for RZ and Manchester
    if (scheme === 'Polar RZ' || scheme === 'Manchester') {
      const midPoint = tStart + bitDuration / 2;
      chartData.push({ t: tStart, Amplitude: valFirstHalf });
      chartData.push({ t: midPoint - dt*0.1, Amplitude: valFirstHalf });
      chartData.push({ t: midPoint, Amplitude: valSecondHalf, BitBoundary: 0 });
      chartData.push({ t: tStart + bitDuration - dt*0.1, Amplitude: valSecondHalf });
    } else {
      chartData.push({ t: tStart, Amplitude: valFirstHalf });
      chartData.push({ t: tStart + bitDuration - dt*0.1, Amplitude: valSecondHalf });
    }
    
    sum += (valFirstHalf + valSecondHalf) / 2;
  }
  
  // End boundary point
  const totalDuration = sequence.length * bitDuration;
  chartData.push({ t: totalDuration, Amplitude: chartData[chartData.length-1].Amplitude });
  
  const averageValue = sum / sequence.length;
  
  let bandwidthApprox = "";
  const Rb = 1 / bitDuration;
  switch(scheme) {
    case 'Unipolar NRZ':
    case 'Polar NRZ':
    case 'Bipolar AMI':
    case 'Differential':
      bandwidthApprox = `${Rb} Hz (approx. Rb)`;
      break;
    case 'Polar RZ':
    case 'Manchester':
      bandwidthApprox = `${2 * Rb} Hz (approx. 2Rb)`;
      break;
  }

  return {
    chartData,
    metrics: {
      averageValue,
      bandwidthApprox,
      levels
    }
  };
}

export function calculatePSD(sequence: string, scheme: LineCodeScheme, amplitude: number, bitDuration: number) {
  // A simple empirical PSD estimation based on theoretical formulas
  // to avoid complex FFT implementation in browser for now.
  const numPoints = 200;
  const psdData = [];
  const Rb = 1 / bitDuration;
  const Tb = bitDuration;
  
  for(let i = 1; i <= numPoints; i++) {
    const f = (i / numPoints) * (3 * Rb); // Plot up to 3Rb
    let power = 0;
    
    // Normalized frequency f * Tb
    const fT = f * Tb;
    const piFT = Math.PI * fT;
    
    switch(scheme) {
      case 'Unipolar NRZ':
        // V^2 Tb / 4 * sinc^2(f Tb) + impulse at f=0
        power = Math.pow(amplitude, 2) * Tb * 0.25 * Math.pow(sinc(fT), 2);
        break;
      case 'Polar NRZ':
      case 'Differential':
        // V^2 Tb * sinc^2(f Tb)
        power = Math.pow(amplitude, 2) * Tb * Math.pow(sinc(fT), 2);
        break;
      case 'Polar RZ':
        // V^2 Tb / 4 * sinc^2(f Tb / 2)
        power = Math.pow(amplitude, 2) * Tb * 0.25 * Math.pow(sinc(fT / 2), 2);
        break;
      case 'Manchester':
        // V^2 Tb * sinc^2(f Tb / 2) * sin^2(pi f Tb / 2)
        power = Math.pow(amplitude, 2) * Tb * Math.pow(sinc(fT / 2), 2) * Math.pow(Math.sin(piFT / 2), 2);
        break;
      case 'Bipolar AMI':
        // V^2 Tb * sinc^2(f Tb) * sin^2(pi f Tb)
        power = Math.pow(amplitude, 2) * Tb * Math.pow(sinc(fT), 2) * Math.pow(Math.sin(piFT), 2);
        break;
    }
    
    psdData.push({ f, Power: power });
  }
  
  return psdData;
}

const sinc = (x: number) => x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
