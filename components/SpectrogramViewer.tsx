import React, { useEffect, useRef } from 'react';

interface SpectrogramViewerProps {
  width?: string;
  height?: number;
}

const SpectrogramViewer: React.FC<SpectrogramViewerProps> = ({ width = '100%', height = 300 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simulation params
    const w = canvas.width;
    const h = canvas.height;
    
    // Clear
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, w, h);

    // Generate mock spectrogram data
    // X axis: Time, Y axis: Frequency (low at bottom, high at top)
    // We will draw small rectangles
    
    const timeBins = 100;
    const freqBins = 50;
    const binW = w / timeBins;
    const binH = h / freqBins;

    for (let t = 0; t < timeBins; t++) {
      for (let f = 0; f < freqBins; f++) {
        // Create a heat map value (0 to 1)
        // More power in lower frequencies (1/f)
        let intensity = 1.0 - (f / freqBins); 
        
        // Add some random bursts in High Gamma (top 3rd)
        if (f > freqBins * 0.7 && Math.random() > 0.95) {
          intensity += 0.8; 
        }

        // Add oscillation band in Alpha/Beta range (bottom 3rd)
        if (f > freqBins * 0.1 && f < freqBins * 0.3) {
            intensity += 0.3 * Math.sin(t * 0.2);
        }

        // Color mapping (Blue -> Red -> Yellow)
        // Simple mapping: 
        // Low: Blue (0,0,255)
        // Mid: Red (255,0,0)
        // High: Yellow (255,255,0)
        
        const r = Math.min(255, intensity * 255 * 1.5);
        const g = Math.min(255, (intensity - 0.5) * 255 * 2);
        const b = Math.min(255, (1 - intensity) * 255);

        ctx.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
        // Invert Y axis for drawing so low freq is at bottom
        ctx.fillRect(t * binW, h - (f * binH) - binH, binW, binH);
      }
    }

  }, []);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 shadow-lg flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-200">Time-Frequency Spectrogram</h3>
        <span className="text-xs text-gray-500">0.5 - 150 Hz</span>
      </div>
      <div className="relative flex-1 w-full bg-black rounded overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={300} 
          className="w-full h-full object-fill"
        />
        {/* Overlay Labels */}
        <div className="absolute bottom-1 right-2 text-xs text-white bg-black/50 px-1 rounded">Time →</div>
        <div className="absolute top-1 left-1 text-xs text-white bg-black/50 px-1 rounded">Freq ↑</div>
      </div>
       <div className="mt-2 text-xs text-gray-400 flex justify-between">
          <span>0s</span>
          <span>High Gamma Bursts (Red/Yellow) visible in upper bands</span>
          <span>10s</span>
       </div>
    </div>
  );
};

export default SpectrogramViewer;
