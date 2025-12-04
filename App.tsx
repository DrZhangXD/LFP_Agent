import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import RawTraceViewer from './components/RawTraceViewer';
import PSDViewer from './components/PSDViewer';
import SpectrogramViewer from './components/SpectrogramViewer';
import AgentSidebar from './components/AgentSidebar';
import { AnalysisStep, ReferenceMethod, SignalConfig, ChannelData } from './types';
import { generateLFPData } from './services/mockDataService';
import { parseEDF } from './services/edfService';
import { computeRealPSD } from './services/dspService';

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

  // Channel Management State
  const [excludedChannelIds, setExcludedChannelIds] = useState<Set<string>>(new Set());

  // Initialize simulated data once
  useEffect(() => {
    setSimulatedData(generateLFPData(5, 1000));
  }, []);

  // Determine active raw dataset
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
        setExcludedChannelIds(new Set()); // Reset exclusions on new file
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

  // Toggle Channel Visibility
  const toggleChannel = (id: string) => {
    const newSet = new Set(excludedChannelIds);
    if (newSet.has(id)) {
      newSet.delete(id); // Restore
    } else {
      newSet.add(id); // Delete/Exclude
    }
    setExcludedChannelIds(newSet);
  };

  // Processed Data (Apply Re-referencing)
  const processedData = useMemo(() => {
    if (!rawData.length) return [];
    
    let data = rawData;

    if (config.reference === ReferenceMethod.BIPOLAR) {
        // Simple Bipolar Montage: Ch[i] - Ch[i+1]
        data = rawData.map((ch, idx) => {
           if (idx < rawData.length - 1) {
              const nextCh = rawData[idx+1];
              // Note: If nextCh is excluded, Bipolar might need adjustment, 
              // but for simplicity we calculate bipolar first, then filter visibility.
              // Alternatively, standard practice is calculate montage on ALL, then view selected.
              const newData = ch.data.map((val, t) => val - nextCh.data[t]);
              return { ...ch, label: `${ch.label}-${nextCh.label}`, data: newData };
           }
           return ch;
        }).slice(0, rawData.length - 1);
    }

    return data;
  }, [rawData, config.reference]);

  // Active Data for Visualization/Analysis (Exclude deleted channels)
  const activeData = useMemo(() => {
    return processedData.filter(ch => !excludedChannelIds.has(ch.id));
  }, [processedData, excludedChannelIds]);

  // PSD Calculation (Based on active data)
  const psdData = useMemo(() => {
    if (activeData.length === 0) return [];
    
    // Pick the first non-bad active channel for the representative PSD
    const targetCh = activeData.find(c => !c.isBad) || activeData[0];
    
    return computeRealPSD(targetCh.data, dataMode === 'local' ? config.sampleRate : 1000);
  }, [activeData, dataMode, config.sampleRate]);

  // Context for Gemini
  const contextData = useMemo(() => {
    return {
      step: currentStep,
      mode: dataMode,
      activeConfig: config,
      channelCount: activeData.length,
      excludedCount: excludedChannelIds.size,
      channelStats: activeData.slice(0, 5).map(c => ({ 
        id: c.id, 
        label: c.label, 
        isBad: c.isBad, 
        rmsEstimate: c.data.length > 0 ? Math.sqrt(c.data.reduce((a,b)=>a+b*b,0)/c.data.length).toFixed(2) : '0' 
      })),
      notchStatus: config.notchFilter > 0 ? `Active at ${config.notchFilter}Hz` : 'Disabled'
    };
  }, [currentStep, config, activeData, dataMode, excludedChannelIds]);


  const renderContent = () => {
    switch (currentStep) {
      case AnalysisStep.PREPROCESSING:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* Controls Column */}
               <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-sm flex flex-col gap-5 h-fit max-h-[80vh] overflow-y-auto">
                  
                  {/* Section 1: Data Source */}
                  <div>
                    <h3 className="font-semibold text-gray-200 mb-2 flex items-center gap-2">
                       <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                       Data Source
                    </h3>
                    <div className="flex flex-col gap-2">
                       <div className="flex rounded-md bg-gray-900 p-1 border border-gray-700">
                          <button 
                            onClick={() => { setDataMode('simulated'); setExcludedChannelIds(new Set()); }}
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

                  <hr className="border-gray-700" />

                  {/* Section 2: Filters */}
                  <div>
                    <h3 className="font-semibold text-gray-200 mb-2 flex items-center gap-2">
                       <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                       Filters & Reference
                    </h3>

                    <div className="space-y-3">
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

                  <hr className="border-gray-700" />
                  
                  {/* Section 3: Channel Management */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-gray-200 flex items-center gap-2">
                         <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                         Channels
                      </h3>
                      {excludedChannelIds.size > 0 && (
                        <button 
                          onClick={() => setExcludedChannelIds(new Set())}
                          className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                        >
                          Restore All
                        </button>
                      )}
                    </div>

                    <div className="bg-gray-900 border border-gray-700 rounded-md max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
                      {processedData.length > 0 ? processedData.map((ch) => {
                        const isExcluded = excludedChannelIds.has(ch.id);
                        return (
                          <div 
                            key={ch.id} 
                            className={`flex items-center justify-between px-3 py-2 border-b border-gray-800 last:border-0 hover:bg-gray-800 transition-colors ${isExcluded ? 'opacity-50 grayscale' : ''}`}
                          >
                             <div className="flex items-center gap-2">
                               <div className={`w-2 h-2 rounded-full ${ch.isBad ? 'bg-red-500' : 'bg-green-500'}`} title={ch.isBad ? 'Bad Signal' : 'Good Signal'}></div>
                               <span className={`text-xs ${isExcluded ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{ch.label}</span>
                             </div>
                             <button 
                               onClick={() => toggleChannel(ch.id)}
                               className={`text-xs px-2 py-0.5 rounded border ${isExcluded ? 'border-gray-600 text-gray-500' : 'border-red-900/50 text-red-400 hover:bg-red-900/20'}`}
                             >
                               {isExcluded ? 'Restore' : 'Del'}
                             </button>
                          </div>
                        );
                      }) : (
                        <div className="p-3 text-xs text-gray-500 text-center">No channels loaded</div>
                      )}
                    </div>
                  </div>

               </div>
               
               {/* Signal View Column */}
               <div className="lg:col-span-2">
                 {activeData.length > 0 ? (
                    <RawTraceViewer data={activeData} height={500} />
                 ) : (
                    <div className="h-[500px] bg-gray-900 border border-gray-800 rounded-lg flex flex-col items-center justify-center text-gray-500 gap-4">
                      {excludedChannelIds.size === processedData.length && processedData.length > 0 ? (
                        <>
                          <p>All channels have been manually deleted.</p>
                          <button onClick={() => setExcludedChannelIds(new Set())} className="text-blue-500 underline">Restore All Channels</button>
                        </>
                      ) : (
                        <p>No data loaded. Select Simulated or Upload .edf file.</p>
                      )}
                    </div>
                 )}
               </div>
            </div>
            
            {/* Bad Channel Info */}
            {activeData.length > 0 && (
              <div className="bg-red-900/10 border border-red-900/30 rounded-lg p-4">
                <h4 className="text-red-400 font-medium mb-2 text-sm">Automated Quality Control</h4>
                <p className="text-gray-400 text-xs">
                  Analyzing {activeData.length} active channels. 
                  {activeData.some(c => c.isBad) 
                    ? <span className="text-red-400 ml-1"> Warning: High impedance or artifact detected in channel {activeData.find(c => c.isBad)?.label}.</span>
                    : <span className="text-green-400 ml-1"> All active channels look nominal.</span>
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
                 * Feature extraction metrics are estimated from the first active channel ({activeData[0]?.label}).
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
      <Sidebar 
        currentStep={currentStep} 
        setStep={setCurrentStep} 
        dataSource={dataMode}
        config={config}
        channelStats={{ total: processedData.length, active: activeData.length }}
      />
      
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
             {/* Redundant header info removed or simplified since Sidebar now has detailed stats, 
                 but keeping basic controls visibility here is often good UX. */}
             <div className="px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-400">
               Active Channels: {activeData.length}
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