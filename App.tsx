
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ChatInterface from './components/ChatInterface';
import VoiceInterface from './components/VoiceInterface';
import ShieldInterface from './components/ShieldInterface';
import { LayoutPanelLeft, Maximize2, Minimize2, Smartphone, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'voice' | 'shield'>('shield');
  const [isCompact, setIsCompact] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const currentCompactState = isMobile ? false : isCompact;

  return (
    <div className={`flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden transition-all duration-500 mx-auto ${currentCompactState ? 'max-w-[450px] border-x border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.5)]' : 'w-full'}`}>
      
      {/* Platform Status Bar / Top Notch Simulation for PWA */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2 bg-slate-950 text-[10px] font-bold text-slate-500">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
             <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse"></div>
             {isMobile ? 'DEVICE MONITORING READY' : 'SYSTEM READY'}
          </div>
          {!isMobile && (
            <div className="text-slate-700">|</div>
          )}
          {!isMobile && (
             <span className="uppercase tracking-[0.2em] opacity-40">Snitch Engine v1.1</span>
          )}
        </div>
        
        {!isMobile && (
          <button 
            onClick={() => setIsCompact(!isCompact)}
            className="hover:text-white transition-colors flex items-center gap-1 text-[9px] uppercase tracking-wider"
          >
            {isCompact ? <Maximize2 size={10} /> : <Minimize2 size={10} />}
            {isCompact ? 'Focus' : 'Sidebar'}
          </button>
        )}
      </div>

      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isCompact={currentCompactState}
      />
      
      <main className="flex-1 overflow-hidden relative">
        <div className={`transition-all duration-500 h-full ${activeTab === 'chat' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12 pointer-events-none absolute inset-0'}`}>
          <ChatInterface />
        </div>
        
        <div className={`transition-all duration-500 h-full ${activeTab === 'voice' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12 pointer-events-none absolute inset-0'}`}>
          <VoiceInterface />
        </div>

        <div className={`transition-all duration-500 h-full ${activeTab === 'shield' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12 pointer-events-none absolute inset-0'}`}>
          <ShieldInterface isCompact={currentCompactState} />
        </div>
      </main>

      {/* Safe Area Footer */}
      <footer className="py-3 px-6 bg-slate-950 border-t border-slate-900/50 text-[9px] text-slate-600 flex justify-between items-center safe-area-bottom">
        <div className="flex items-center gap-2">
           <ShieldCheck size={12} className="text-indigo-500/50" />
           <span className="font-mono tracking-tighter">AUTHENTICITY_PROTOCOL_v3.4</span>
        </div>
        <div className="flex items-center gap-3 font-medium">
          <span className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
            ENCRYPTED
          </span>
          <span className="opacity-30">|</span>
          <span>© 2025 SNITCH AI</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
