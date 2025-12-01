
import { PSDPoint } from '../types';

// Simple implementation of Radix-2 FFT
// Note: This is a basic implementation for visualization purposes. 
// For production, use a WebAssembly based library like fftw.js
const fft = (data: number[]): { real: number[], imag: number[] } => {
  const n = data.length;
  if (n <= 1) return { real: data, imag: new Array(n).fill(0) };

  const half = n / 2;
  const even = new Array(half);
  const odd = new Array(half);

  for (let i = 0; i < half; i++) {
    even[i] = data[2 * i];
    odd[i] = data[2 * i + 1];
  }

  const evenResult = fft(even);
  const oddResult = fft(odd);

  const real = new Array(n);
  const imag = new Array(n);

  for (let k = 0; k < half; k++) {
    const tReal = Math.cos(-2 * Math.PI * k / n);
    const tImag = Math.sin(-2 * Math.PI * k / n);

    // Multiply oddResult[k] by t (twiddle factor)
    const oddKReal = oddResult.real[k] * tReal - oddResult.imag[k] * tImag;
    const oddKImag = oddResult.real[k] * tImag + oddResult.imag[k] * tReal;

    real[k] = evenResult.real[k] + oddKReal;
    imag[k] = evenResult.imag[k] + oddKImag;

    real[k + half] = evenResult.real[k] - oddKReal;
    imag[k + half] = evenResult.imag[k] - oddKImag;
  }

  return { real, imag };
};

// Compute Power Spectral Density using Welch's Method approximation (single window for simplicity here)
export const computeRealPSD = (data: number[], sampleRate: number): PSDPoint[] => {
  // Use a power of 2 size for FFT
  const powerOf2 = Math.pow(2, Math.floor(Math.log2(data.length)));
  // Slice data to power of 2
  const slice = data.slice(0, Math.min(powerOf2, 2048)); // Limit to 2048 points for performance
  
  if (slice.length < 16) return [];

  const { real, imag } = fft(slice);
  
  const psd: PSDPoint[] = [];
  const n = slice.length;
  // Compute magnitude squared
  // Only take first half (Nyquist)
  for (let i = 1; i < n / 2; i++) {
    const power = (real[i] * real[i] + imag[i] * imag[i]) / n;
    const frequency = (i * sampleRate) / n;
    
    // Only return relevant bands (e.g., up to 150Hz or Nyquist)
    if (frequency <= 150) {
       psd.push({ frequency, power });
    }
  }
  
  return psd;
};

// Fallback for Simulated Data generation to match the previous aesthetic
export const generateSimulatedPSD = (sampleRate: number): PSDPoint[] => {
  const psd: PSDPoint[] = [];
  for (let f = 1; f <= 150; f += 1) {
    let power = 100 / f; // 1/f background
    power += 50 * Math.exp(-0.5 * Math.pow((f - 10) / 1, 2)); // Alpha
    power += 30 * Math.exp(-0.5 * Math.pow((f - 20) / 2, 2)); // Beta
    power += 200 * Math.exp(-0.5 * Math.pow((f - 60) / 0.5, 2)); // 60Hz noise
    power += (Math.random() - 0.5) * 5; // Jitter
    psd.push({ frequency: f, power: Math.max(0, power) });
  }
  return psd;
};
