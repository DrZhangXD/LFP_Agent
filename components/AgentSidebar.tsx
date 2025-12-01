import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, AnalysisStep } from '../types';
import { sendMessageToGemini } from '../services/geminiService';

interface AgentSidebarProps {
  currentStep: AnalysisStep;
  contextData: any; // Data summary to send to agent
}

const AgentSidebar: React.FC<AgentSidebarProps> = ({ currentStep, contextData }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content: `Hello. I am your LFP Analysis Agent. I see you are currently in the **${currentStep}** phase. How can I assist with the signal processing or interpretation?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Construct context string based on available data
    const contextString = `
      Current Workflow Step: ${currentStep}
      Data Summary: ${JSON.stringify(contextData, null, 2)}
    `;

    const responseText = await sendMessageToGemini(input, contextString);

    const botMsg: ChatMessage = { role: 'model', content: responseText, timestamp: new Date() };
    setMessages(prev => [...prev, botMsg]);
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col h-full shadow-2xl z-10">
      <div className="p-4 border-b border-gray-800 bg-gray-900/90 backdrop-blur">
        <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          AI Analyst
        </h2>
        <p className="text-xs text-gray-500">Powered by Gemini 2.5 Flash</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-200 border border-gray-700'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
              <div className="mt-1 text-[10px] opacity-50 text-right">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {loading && (
           <div className="flex justify-start">
             <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
             </div>
           </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask about the signal (e.g., 'Is there any epilepsy?')"
            className="w-full bg-gray-800 text-gray-200 rounded-lg pl-3 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none border border-gray-700"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="absolute right-2 bottom-2 p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
           <button onClick={() => setInput("Interpret the PSD peaks.")} className="whitespace-nowrap px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full text-xs text-gray-300 transition-colors">
             Interpret PSD
           </button>
           <button onClick={() => setInput("Are there bad channels?")} className="whitespace-nowrap px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full text-xs text-gray-300 transition-colors">
             Check Bad Channels
           </button>
           <button onClick={() => setInput("Explain High Gamma significance.")} className="whitespace-nowrap px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full text-xs text-gray-300 transition-colors">
             Explain High Gamma
           </button>
        </div>
      </div>
    </div>
  );
};

export default AgentSidebar;
