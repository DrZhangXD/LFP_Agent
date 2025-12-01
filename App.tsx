
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import RawTraceViewer from './components/RawTraceViewer';
import PSDViewer from './components/PSDViewer';
import SpectrogramViewer from './components/SpectrogramViewer';
import AgentSidebar from './components/AgentSidebar';
import { AnalysisStep, ReferenceMethod, SignalConfig, ChannelData } from './types';
import { generateLFPData } from './services/mockDataService';
import { parseEDF } from './services/edfService';
import { computeRealPSD, generateSimulatedPSD } from './services/dspService';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AnalysisStep>(AnalysisStep.PREPROCESSING);
  const [config, setConfig] = useState<SignalConfig>({
    sampleRate: 1000,
    notchFilter: 0, // Default off
    bandpass: [0.5, 300],
    reference: ReferenceMethod.MONOPOLAR
  });

  // Data Source State
  const [dataMode, setDataMode] = useState<'simulated' | 'local'>('simulated');
  const [localData, setLocalData] = useState<ChannelData[]>([]);
  const [simulatedData, setSimulatedData] = useState<ChannelData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize simulated data once
  useEffect(() => {
    setSimulatedData(generateLFPData(5, 1000));
  }, []);

  // Determine active dataset
  const rawData = useMemo(() => {
    return dataMode === 'simulated' ? simulatedData : localData;
  }, [dataMode, simulatedData, localData]);

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (file.name.toLowerCase().endsWith('.edf')) {
        const channels = await parseEDF(file);
        setLocalData(channels);
        setDataMode('local');
        // Reset config to native if possible, but keep defaults for now
      } else {
        throw new Error("Unsupported file format. Please use .edf");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load file");
      setDataMode('simulated');
    } finally {
      setIsLoading(false);
    }
  };

  // Processed Data (Ref and Filter simulation)
  const processedData = useMemo(() => {
    if (!rawData.length) return [];
    
    // In a real app, re-referencing (Bipolar/CAR) math happens here.
    // For visualization, we pass raw data but logic would go here.
    let data = rawData;

    if (config.reference === ReferenceMethod.BIPOLAR) {
        // Simple Bipolar Montage Simulation: Ch[i] - Ch[i+1]
        data = rawData.map((ch, idx) => {
           if (idx < rawData.length - 1) {
              const nextCh = rawData[idx+1];
              const newData = ch.data.map((val, t) => val - nextCh.data[t]);
              return { ...ch, label: `${ch.label}-${nextCh.label}`, data: newData };
           }
           return ch;
        }).slice(0, rawData.length - 1);
    }

    return data;
  }, [rawData, config.reference]);

  // PSD Calculation
  const psdData = useMemo(() => {
    if (processedData.length === 0) return [];
    
    // If we have real data (local or simulated arrays), we can compute FFT
    // Pick the first non-bad channel
    const targetCh = processedData.find(c => !c.isBad) || processedData[0];
    
    if (dataMode === 'simulated') {
       // Use the cleaner simulated PSD generator for better visual demo of the "concept"
       // unless we want to show the actual noisy FFT of the mock data.
       // Let's use the actual FFT of the mock data for consistency with 'local' mode!
       return computeRealPSD(targetCh.data, 1000); 
    } else {
       // Real Data
       return computeRealPSD(targetCh.data, config.sampleRate);
    }
  }, [processedData, dataMode, config.sampleRate]);

  // Context to send to Gemini
  const contextData = useMemo(() => {
    return {
      step: currentStep,
      mode: dataMode,
      activeConfig: config,
      channelCount: processedData.length,
      channelStats: processedData.slice(0, 5).map(c => ({ 
        id: c.id, 
        label: c.label, 
        isBad: c.isBad, 
        rmsEstimate: c.data.length > 0 ? Math.sqrt(c.data.reduce((a,b)=>a+b*b,0)/c.data.length).toFixed(2) : '0' 
      })),
      notchStatus: config.notchFilter > 0 ? `Active at ${config.notchFilter}Hz` : 'Disabled'
    };
  }, [currentStep, config, processedData, dataMode]);


  const renderContent = () => {
    switch (currentStep) {
      case AnalysisStep.PREPROCESSING:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* Controls */}
               <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-sm flex flex-col gap-5">
                  <div>
                    <h3 className="font-semibold text-gray-200 mb-2 flex items-center gap-2">
                       <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                       Data Source
                    </h3>
                    
                    {/* File Upload / Source Toggle */}
                    <div className="flex flex-col gap-2">
                       <div className="flex rounded-md bg-gray-900 p-1 border border-gray-700">
                          <button 
                            onClick={() => setDataMode('simulated')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${dataMode === 'simulated' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                          >
                            Simulated
                          </button>
                          <button 
                             onClick={() => setDataMode('local')}
                             className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${dataMode === 'local' ? 'bg-blue-900/50 text-blue-200 shadow border border-blue-500/30' : 'text-gray-400 hover:text-gray-200'}`}
                          >
                            Local File
                          </button>
                       </div>
                       
                       {dataMode === 'local' && (
                         <div className="relative">
                            <input 
                              type="file" 
                              accept=".edf"
                              onChange={handleFileUpload}
                              className="block w-full text-xs text-gray-400
                                file:mr-2 file:py-2 file:px-3
                                file:rounded file:border-0
                                file:text-xs file:font-semibold
                                file:bg-gray-700 file:text-gray-200
                                hover:file:bg-gray-600
                                cursor-pointer"
                            />
                            {isLoading && <span className="absolute right-0 top-2 text-xs text-yellow-500 animate-pulse">Loading...</span>}
                         </div>
                       )}
                       {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-4 space-y-4">
                    <h3 className="font-semibold text-gray-200 mb-2 flex items-center gap-2">
                       <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                       Filters & Referencing
                    </h3>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase mb-2">Notch Filter (Line Noise)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[0, 50, 60].map((freq) => (
                           <button 
                             key={freq}
                             onClick={() => setConfig({...config, notchFilter: freq as any})}
                             className={`py-1.5 px-2 rounded text-xs font-medium border transition-colors ${
                               config.notchFilter === freq
                               ? 'bg-blue-600 border-blue-500 text-white'
                               : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                             }`}
                           >
                             {freq === 0 ? 'Off' : `${freq}Hz`}
                           </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase mb-2">Re-referencing</label>
                      <div className="flex flex-col gap-2">
                         {Object.values(ReferenceMethod).map(method => (
                           <label key={method} className="flex items-center space-x-2 cursor-pointer group">
                             <input 
                               type="radio" 
                               name="reference" 
                               value={method}
                               checked={config.reference === method}
                               onChange={() => setConfig({...config, reference: method})}
                               className="text-blue-500 focus:ring-blue-500 bg-gray-900 border-gray-700"
                             />
                             <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{method}</span>
                           </label>
                         ))}
                      </div>
                    </div>
                  </div>
               </div>
               
               {/* Signal View */}
               <div className="lg:col-span-2">
                 {rawData.length > 0 ? (
                    <RawTraceViewer data={processedData} height={400} />
                 ) : (
                    <div className="h-[400px] bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-center text-gray-500">
                      No data loaded. Select Simulated or Upload .edf file.
                    </div>
                 )}
               </div>
            </div>
            
            {/* Bad Channel Info */}
            {processedData.length > 0 && (
              <div className="bg-red-900/10 border border-red-900/30 rounded-lg p-4">
                <h4 className="text-red-400 font-medium mb-2 text-sm">Automated Quality Control</h4>
                <p className="text-gray-400 text-xs">
                  Analyzing {processedData.length} channels. 
                  {processedData.some(c => c.isBad) 
                    ? <span className="text-red-400 ml-1"> Warning: High impedance or artifact detected in channel {processedData.find(c => c.isBad)?.label}.</span>
                    : <span className="text-green-400 ml-1"> All channels look nominal.</span>
                  }
                </p>
              </div>
            )}
          </div>
        );

      case AnalysisStep.FEATURE_EXTRACTION:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
             <div className="h-[400px]">
                <PSDViewer data={psdData} notchFreq={config.notchFilter} />
             </div>
             <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
               <h3 className="text-lg font-semibold text-gray-200 mb-4">Extracted Features</h3>
               <div className="space-y-4">
                 <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-sm font-medium text-yellow-500">Alpha Band (8-13Hz)</span>
                     <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">
                        {dataMode === 'simulated' ? 'Strong' : 'Analysis Ready'}
                     </span>
                   </div>
                   <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                     <div className="bg-yellow-500 h-full w-[60%]"></div>
                   </div>
                 </div>

                 <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-sm font-medium text-red-400">High Gamma (70-150Hz)</span>
                     <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">
                       {dataMode === 'simulated' ? 'Intermittent' : 'Calculating...'}
                     </span>
                   </div>
                   <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                     <div className="bg-red-500 h-full w-[30%]"></div>
                   </div>
                 </div>
               </div>
               <p className="mt-6 text-xs text-gray-500 italic">
                 * Feature extraction metrics are estimated from the first active channel.
               </p>
             </div>
          </div>
        );

      case AnalysisStep.VISUALIZATION:
        return (
          <div className="grid grid-cols-1 gap-6 pb-6">
            <div className="h-[350px]">
              <SpectrogramViewer />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 opacity-70 hover:opacity-100 transition-opacity">
                 <h3 className="text-gray-300 font-medium mb-2">PAC Comodulogram</h3>
                 <div className="h-40 bg-gray-900 rounded flex items-center justify-center border border-dashed border-gray-600">
                    <div className="text-center p-4">
                      <p className="text-gray-500 text-sm">Phase-Amplitude Coupling</p>
                      <p className="text-gray-600 text-xs mt-1">Theta Phase x Gamma Amp</p>
                    </div>
                 </div>
               </div>
               
               <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 opacity-70 hover:opacity-100 transition-opacity">
                 <h3 className="text-gray-300 font-medium mb-2">3D Topography</h3>
                 <div className="h-40 bg-gray-900 rounded flex items-center justify-center border border-dashed border-gray-600">
                    <div className="text-center p-4">
                      <p className="text-gray-500 text-sm">Electrode Localization</p>
                      <p className="text-gray-600 text-xs mt-1">MNI Coordinates Mapping</p>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        );
      default:
        return <div>Select a step</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-500/30">
      <Sidebar currentStep={currentStep} setStep={setCurrentStep} />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-gray-900/50 border-b border-gray-800 flex items-center justify-between px-8 backdrop-blur-sm z-10">
           <div>
             <h2 className="text-xl font-semibold text-gray-100">{currentStep}</h2>
             <p className="text-xs text-gray-500 flex items-center gap-2">
                Session ID: LFP-2023-X92 
                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                Source: {dataMode === 'simulated' ? 'Synthetic Model' : 'Local File'}
             </p>
           </div>
           <div className="flex items-center gap-4">
             <div className="px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-400">
               SR: {config.sampleRate}Hz
             </div>
             <div className={`px-3 py-1 rounded-full border text-xs ${config.notchFilter > 0 ? 'bg-green-900/20 border-green-900 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
               Notch: {config.notchFilter > 0 ? `${config.notchFilter}Hz` : 'OFF'}
             </div>
           </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
           <div className="max-w-6xl mx-auto">
             {renderContent()}
           </div>
        </div>
      </main>
      
      {/* AI Sidebar */}
      <AgentSidebar currentStep={currentStep} contextData={contextData} />
    </div>
  );
};

export default App;
