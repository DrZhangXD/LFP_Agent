import React from 'react';
import { AnalysisStep, SignalConfig } from '../types';

interface SidebarProps {
  currentStep: AnalysisStep;
  setStep: (step: AnalysisStep) => void;
  dataSource: 'simulated' | 'local';
  config: SignalConfig;
  channelStats: { total: number; active: number };
}

const Sidebar: React.FC<SidebarProps> = ({ currentStep, setStep, dataSource, config, channelStats }) => {
  const steps = Object.values(AnalysisStep);

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-blue-500 tracking-wider">NeuroLFP</h1>
        <p className="text-xs text-gray-500 mt-1">Signal Analysis Agent</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {steps.map((step) => {
          const isActive = currentStep === step;
          return (
            <button
              key={step}
              onClick={() => setStep(step)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {/* Icons based on step */}
              {step === AnalysisStep.PREPROCESSING && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              )}
              {step === AnalysisStep.FEATURE_EXTRACTION && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              )}
              {step === AnalysisStep.VISUALIZATION && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
              )}
              <span className="font-medium text-sm">{step}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 bg-gray-900/50 border-t border-gray-800">
        <div className="bg-gray-800 rounded p-3 text-xs text-gray-400 border border-gray-700 space-y-2">
          <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2">
             <span className="font-semibold text-gray-300">System Status</span>
             <span className="flex items-center gap-1 text-[10px]">
               <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
               Ready
             </span>
          </div>
          
          <div className="grid grid-cols-2 gap-y-1 gap-x-2">
             <span className="text-gray-500">Source:</span>
             <span className={`font-medium ${dataSource === 'local' ? 'text-blue-400' : 'text-purple-400'}`}>
               {dataSource === 'local' ? 'Local EDF' : 'Simulation'}
             </span>

             <span className="text-gray-500">Channels:</span>
             <span className="text-gray-200">{channelStats.active} / {channelStats.total}</span>

             <span className="text-gray-500">Rate:</span>
             <span className="text-gray-200">{config.sampleRate} Hz</span>

             <span className="text-gray-500">Ref:</span>
             <span className="text-gray-200 truncate" title={config.reference}>{config.reference}</span>

             <span className="text-gray-500">Notch:</span>
             <span className={`${config.notchFilter > 0 ? 'text-green-400' : 'text-gray-500'}`}>
               {config.notchFilter > 0 ? `${config.notchFilter}Hz` : 'OFF'}
             </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;