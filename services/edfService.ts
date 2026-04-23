
import { ChannelData } from '../types';

export const parseEDF = async (file: File): Promise<ChannelData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) throw new Error("Empty buffer");
        const view = new DataView(buffer);
        
        // Helper to read ASCII strings from buffer
        const readString = (offset: number, len: number) => {
          return new TextDecoder().decode(new Uint8Array(buffer, offset, len)).trim();
        };

        // 1. Parse Fixed Header
        // 0-7: Version (should be '0')
        // 184-191: Bytes in header
        const headerBytes = parseInt(readString(184, 8), 10);
        // 236-243: Number of Data Records
        let numRecords = parseInt(readString(236, 8), 10);
        // 244-251: Duration of a Data Record (seconds)
        const recordDuration = parseFloat(readString(244, 8));
        // 252-255: Number of Signals (ns)
        const numSignals = parseInt(readString(252, 4), 10);

        if (!Number.isFinite(headerBytes) || !Number.isFinite(numSignals) || numSignals <= 0) {
          throw new Error("Invalid EDF header.");
        }

        if (numRecords === -1) {
             // If unknown, estimate from file size
             const dataBytes = buffer.byteLength - headerBytes;
             // We need to calculate bytes per record to do this accurately, which we can do later.
             // For now, let's assume valid EDF.
             console.warn("Number of records is -1, reading until EOF");
             numRecords = 0; // Placeholder
        }

        // 2. Parse Variable Header
        // The variable header contains `ns` blocks of parameters.
        // Labels are at 256
        const labels: string[] = [];
        for (let i = 0; i < numSignals; i++) {
          labels.push(readString(256 + i * 16, 16));
        }

        // Parsing Calibration Data
        // Physical Min/Max (offset 256 + ns*(16+80+8))
        // Digital Min/Max
        const physMinOffset = 256 + numSignals * (16 + 80 + 8);
        const physMaxOffset = physMinOffset + numSignals * 8;
        const digMinOffset = physMaxOffset + numSignals * 8;
        const digMaxOffset = digMinOffset + numSignals * 8;
        const prefilterOffset = digMaxOffset + numSignals * 8;
        const samplesOffset = prefilterOffset + numSignals * 80;

        const physMins: number[] = [];
        const physMaxs: number[] = [];
        const digMins: number[] = [];
        const digMaxs: number[] = [];
        const samplesPerRecord: number[] = [];

        for (let i = 0; i < numSignals; i++) {
          physMins.push(parseFloat(readString(physMinOffset + i * 8, 8)));
          physMaxs.push(parseFloat(readString(physMaxOffset + i * 8, 8)));
          digMins.push(parseFloat(readString(digMinOffset + i * 8, 8)));
          digMaxs.push(parseFloat(readString(digMaxOffset + i * 8, 8)));
          samplesPerRecord.push(parseInt(readString(samplesOffset + i * 8, 8), 10));
        }

        // Pre-calculate Gain and Offset for conversion
        const gains: number[] = [];
        const offsets: number[] = [];
        
        for (let i = 0; i < numSignals; i++) {
          const physRange = physMaxs[i] - physMins[i];
          const digRange = digMaxs[i] - digMins[i];
          const gain = Number.isFinite(digRange) && digRange !== 0 ? physRange / digRange : 1;
          gains.push(Number.isFinite(gain) ? gain : 1);
          offsets.push(
            Number.isFinite(physMins[i]) && Number.isFinite(digMins[i]) ? physMins[i] - gain * digMins[i] : 0
          );
        }

        // Initialize Channels
        const channels: ChannelData[] = labels.map((label, idx) => ({
          id: `ch_${idx}`,
          label: label || `Ch${idx + 1}`,
          data: [],
          isBad: false
        }));

        // 3. Read Data Records
        let currentOffset = headerBytes;
        
        // If numRecords was -1, define it by file size
        if (numRecords <= 0) {
            let bytesPerRecord = 0;
            for(let s=0; s<numSignals; s++) bytesPerRecord += samplesPerRecord[s] * 2;
            if (bytesPerRecord <= 0) {
              throw new Error("Invalid EDF sample information.");
            }
            numRecords = Math.floor((buffer.byteLength - headerBytes) / bytesPerRecord);
        }

        // Limit for browser performance (read max 30 seconds or 100 records if huge)
        const MAX_RECORDS = Math.min(numRecords, 200); 

        for (let r = 0; r < MAX_RECORDS; r++) {
          for (let s = 0; s < numSignals; s++) {
            const numSamples = samplesPerRecord[s];
            // Read 'numSamples' 16-bit integers
            for (let k = 0; k < numSamples; k++) {
               // Safety check
               if (currentOffset + 2 > buffer.byteLength) break;

               const intVal = view.getInt16(currentOffset, true); // Little Endian
               const physVal = intVal * gains[s] + offsets[s];
               channels[s].data.push(physVal);
               
               currentOffset += 2;
            }
          }
        }

        resolve(channels);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
};
