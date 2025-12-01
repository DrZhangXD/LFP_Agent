
import { ChannelData } from '../types';

// Generate synthetic LFP data: 1/f noise + Oscillations + Occasional Spikes
export const generateLFPData = (durationSec: number, sampleRate: number): ChannelData[] => {
  const points = durationSec * sampleRate;
  const channels: ChannelData[] = [];

  const labels = ['Amygdala_1', 'Amygdala_2', 'Hippocampus_1', 'Hippocampus_2', 'Motor_Ctx_1', 'Motor_Ctx_2'];

  labels.forEach((label, idx) => {
    const data: number[] = [];
    let val = 0;
    
    // Random phase offsets
    const thetaPhase = Math.random() * Math.PI * 2;
    const betaPhase = Math.random() * Math.PI * 2;
    
    for (let i = 0; i < points; i++) {
      const t = i / sampleRate;
      
      // 1. Brown Noise (random walk integration) - approximates 1/f
      const white = (Math.random() - 0.5) * 2;
      val = (val * 0.95) + (white * 0.05); 
      
      // 2. Oscillations
      // Theta (4-8Hz) - prominent in Hippocampus
      const thetaAmp = label.includes('Hippocampus') ? 0.8 : 0.2;
      const theta = Math.sin(t * 2 * Math.PI * 6 + thetaPhase) * thetaAmp;

      // Beta (13-30Hz) - prominent in Motor Cortex
      const betaAmp = label.includes('Motor') ? 0.6 : 0.1;
      const beta = Math.sin(t * 2 * Math.PI * 20 + betaPhase) * betaAmp;
      
      // High Gamma (70-150Hz) - bursts
      const gammaBurst = Math.random() > 0.98 ? Math.sin(t * 2 * Math.PI * 90) * 0.3 : 0;

      // 3. Artifacts / IEDs (Interictal Epileptiform Discharges) - Sharp spikes
      let spike = 0;
      // Simulate a spike every ~2 seconds in Amygdala
      if (label.includes('Amygdala') && Math.random() > 0.9992) {
         spike = 5.0 * (Math.random() > 0.5 ? 1 : -1);
      }

      // 4. Line Noise (60Hz) - Standard artifact to be removed
      const lineNoise = Math.sin(t * 2 * Math.PI * 60) * 2.0;

      // Combine
      data.push(val + theta + beta + gammaBurst + spike + lineNoise);
    }

    channels.push({
      id: `ch_${idx}`,
      label,
      data,
      isBad: label === 'Amygdala_2' && Math.random() > 0.8 // Randomly mark one as bad sometimes
    });
  });

  return channels;
};
