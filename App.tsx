
import React, { useState } from 'react';
import Header from './components/Header';
import ChatInterface from './components/ChatInterface';
import VoiceInterface from './components/VoiceInterface';
import ShieldInterface from './components/ShieldInterface';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'voice' | 'shield'>('chat');

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
      
      <main className="flex-1 overflow-hidden relative">
        <div className={`transition-all duration-300 h-full ${activeTab === 'chat' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none absolute inset-0'}`}>
          <ChatInterface />
        </div>
        
        <div className={`transition-all duration-300 h-full ${activeTab === 'voice' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none absolute inset-0'}`}>
          <VoiceInterface />
        </div>

        <div className={`transition-all duration-300 h-full ${activeTab === 'shield' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none absolute inset-0'}`}>
          <ShieldInterface />
        </div>
      </main>

      <footer className="py-2 px-4 bg-slate-900/50 border-t border-slate-800 text-center text-xs text-slate-500">
        AI Snitch v1.1.0 • Deep Multimodal AI Detection Engine
      </footer>
    </div>
  );
};

export default App;
