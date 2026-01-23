
import React from 'react';
import { ShieldCheck, MessageSquare, Mic, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  activeTab: 'chat' | 'voice' | 'shield';
  setActiveTab: (tab: 'chat' | 'voice' | 'shield') => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shadow-lg z-50 gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-500/20 shadow-lg">
          <ShieldCheck className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            AI Snitch <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">AI DETECTOR</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">Authenticity Verification Suite</p>
        </div>
      </div>

      <nav className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
            activeTab === 'chat' 
            ? 'bg-slate-800 text-white shadow-sm' 
            : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare size={18} />
          <span className="text-sm font-semibold">Chat</span>
        </button>
        <button
          onClick={() => setActiveTab('shield')}
          className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
            activeTab === 'shield' 
            ? 'bg-rose-500/20 text-rose-400 shadow-sm border border-rose-500/30' 
            : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert size={18} />
          <span className="text-sm font-semibold">Live Shield</span>
        </button>
        <button
          onClick={() => setActiveTab('voice')}
          className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
            activeTab === 'voice' 
            ? 'bg-slate-800 text-white shadow-sm' 
            : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mic size={18} />
          <span className="text-sm font-semibold">Consult</span>
        </button>
      </nav>

      <div className="hidden lg:flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
          Scanner Active
        </div>
      </div>
    </header>
  );
};

export default Header;
