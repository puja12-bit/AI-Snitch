
import React from 'react';
import { ShieldCheck, MessageSquare, Mic, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  activeTab: 'chat' | 'voice' | 'shield';
  setActiveTab: (tab: 'chat' | 'voice' | 'shield') => void;
  isCompact?: boolean;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, isCompact }) => {
  return (
    <header className={`flex flex-col items-stretch px-4 py-4 bg-slate-900 border-b border-slate-800 shadow-lg z-50 gap-4 ${isCompact ? '' : 'md:flex-row md:items-center md:justify-between'}`}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-500/20 shadow-lg shrink-0">
          <ShieldCheck className="text-white w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            AI Snitch <span className="text-[9px] font-mono bg-indigo-500/20 text-indigo-400 px-1 py-0.5 rounded border border-indigo-500/30">DETECTOR</span>
          </h1>
          {!isCompact && <p className="text-[10px] text-slate-400 font-medium">Authenticity Verification Suite</p>}
        </div>
      </div>

      <nav className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('shield')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
            activeTab === 'shield' 
            ? 'bg-rose-500/20 text-rose-400 shadow-sm border border-rose-500/30' 
            : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert size={16} />
          <span className="text-xs font-semibold">Shield</span>
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
            activeTab === 'chat' 
            ? 'bg-slate-800 text-white shadow-sm' 
            : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare size={16} />
          <span className="text-xs font-semibold">Snitch</span>
        </button>
        <button
          onClick={() => setActiveTab('voice')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
            activeTab === 'voice' 
            ? 'bg-slate-800 text-white shadow-sm' 
            : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mic size={16} />
          <span className="text-xs font-semibold">Voice</span>
        </button>
      </nav>
    </header>
  );
};

export default Header;
