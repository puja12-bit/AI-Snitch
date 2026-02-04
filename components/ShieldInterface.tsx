
import React, { useRef, useState, useEffect } from 'react';
import { 
  ShieldCheck, Loader2, StopCircle, Eye, Instagram, Youtube, 
  ChevronRight, ExternalLink, Layers, MousePointer2, XCircle
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface ShieldProps {
  isCompact?: boolean;
}

const ShieldInterface: React.FC<ShieldProps> = ({ isCompact }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [verdict, setVerdict] = useState<{isScam: boolean; confidence: number; explanation: string; title: string} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFloating, setIsFloating] = useState(false);

  const pipWindowRef = useRef<any>(null);

  const startScreenCapture = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: {
          displaySurface: "monitor",
          frameRate: 30
        },
        audio: false 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);
        stream.getVideoTracks()[0].onended = () => stopCapture();
      }
    } catch (err) {
      console.error("Screen capture error:", err);
      setError("Permission denied. Screen access is required to 'snitch' on other apps.");
    }
  };

  const stopCapture = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
    }
    setIsCapturing(false);
    setVerdict(null);
    setIsFloating(false);
  };

  const analyzeScreenFrame = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing || !isCapturing) return;

    setIsProcessing(true);
    updatePipStatus("SCANNING...", "indigo", true);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    const scale = 0.6;
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    const ctx = canvas.getContext('2d');
    
    try {
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Data = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
            { text: `TASK: Detect if the content on screen (video/image/reel) is AI-generated (Deepfake) or Real Human Made. 
              Look for: Liquid warping, AI artifacts in facial features, inconsistent hair/edges, and scam-like text overlays.
              Provide a clear title and explanation. Return JSON.` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isScam: { type: Type.BOOLEAN, description: "True if AI/Deepfake/Scam, False if Human/Real" },
              confidence: { type: Type.NUMBER },
              title: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["isScam", "confidence", "title", "explanation"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      setVerdict(data);
      
      if (data.isScam) {
        updatePipStatus("AI DETECTED", "rose", false);
      } else {
        updatePipStatus("HUMAN MADE", "emerald", false);
      }
    } catch (err) {
      console.error("Analysis failed:", err);
      updatePipStatus("ERROR", "rose", false);
    } finally {
      setIsProcessing(false);
    }
  };

  const updatePipStatus = (text: string, color: string, isScanning: boolean) => {
    if (pipWindowRef.current) {
      const doc = pipWindowRef.current.document;
      const orb = doc.getElementById('orb');
      const label = doc.getElementById('label');
      if (orb) orb.className = `orb bg-${color}-500 ${isScanning ? 'scanning' : 'pulse'}`;
      if (label) {
        label.innerText = text;
        label.className = `label text-${color}-400`;
      }
    }
  };

  const toggleFloatingMode = async () => {
    if (isFloating) {
      if (pipWindowRef.current) pipWindowRef.current.close();
      return;
    }

    if (!('documentPictureInPicture' in window)) {
      alert("Floating Bubble requires Chrome 116+. Try using Split-Screen on mobile.");
      return;
    }

    try {
      // @ts-ignore
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 150,
        height: 150,
      });

      pipWindowRef.current = pipWindow;

      const style = document.createElement('style');
      style.textContent = `
        body { margin: 0; background: #030712; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; height: 100vh; cursor: pointer; border-radius: 50%; border: 1.5px solid #1e293b; overflow: hidden; }
        .orb { width: 44px; height: 44px; border-radius: 50%; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative; }
        .pulse { animation: pulse 2s infinite; }
        .scanning { animation: scan 0.8s infinite alternate ease-in-out; }
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 0.7; } }
        @keyframes scan { 0% { transform: scale(1) rotate(0deg); border-radius: 50%; } 100% { transform: scale(1.2) rotate(180deg); border-radius: 30%; } }
        .bg-indigo-500 { background: #6366f1; box-shadow: 0 0 25px rgba(99, 102, 241, 0.6); }
        .bg-rose-500 { background: #f43f5e; box-shadow: 0 0 25px rgba(244, 63, 94, 0.7); }
        .bg-emerald-500 { background: #10b981; box-shadow: 0 0 25px rgba(16, 185, 129, 0.7); }
        .label { font-size: 9px; font-weight: 900; margin-top: 12px; text-align: center; letter-spacing: 1px; text-transform: uppercase; }
        .text-indigo-400 { color: #818cf8; }
        .text-rose-400 { color: #fb7185; }
        .text-emerald-400 { color: #34d399; }
        .btn { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
        .hint { font-size: 6px; color: #475569; margin-top: 5px; font-weight: bold; opacity: 0.6; }
        .glass { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent); pointer-events: none; border-radius: 50%; }
      `;
      pipWindow.document.head.appendChild(style);

      const container = pipWindow.document.createElement('div');
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.innerHTML = `
        <div class="glass"></div>
        <div id="orb" class="orb bg-indigo-500 pulse"></div>
        <div id="label" class="label text-indigo-400">READY</div>
        <div class="hint">TAP TO SNITCH</div>
        <button id="scan-btn" class="btn"></button>
      `;
      pipWindow.document.body.appendChild(container);

      pipWindow.document.getElementById('scan-btn')?.addEventListener('click', () => {
        analyzeScreenFrame();
      });

      pipWindow.addEventListener('pagehide', () => {
        setIsFloating(false);
        pipWindowRef.current = null;
      });

      setIsFloating(true);
    } catch (err) {
      console.error("Floating Mode Failed:", err);
    }
  };

  if (!isCapturing) {
    return (
      <div className="flex flex-col h-full bg-slate-950 p-6 md:p-12 animate-in fade-in zoom-in-95 duration-500">
        <div className="max-w-md mx-auto flex flex-col items-center text-center space-y-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full animate-pulse"></div>
            <div className="relative w-28 h-28 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-500/30 transform group-hover:rotate-12 transition-transform duration-500">
              <ShieldCheck size={56} className="text-white" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tight text-white leading-tight">SNITCH GUARD</h1>
            <p className="text-slate-400 text-sm leading-relaxed px-4 font-medium">
              Real-time AI detection for <span className="text-indigo-400 font-bold">Instagram, YouTube & TikTok</span>. 
              Launch the floating bubble and tap it while browsing.
            </p>
          </div>

          <div className="w-full space-y-4">
            <button 
              onClick={startScreenCapture}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-3xl font-bold shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3 active:scale-95 group"
            >
              Start Guard Engine
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            {error && <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest">{error}</p>}
          </div>
          
          <div className="flex items-center gap-8 pt-6 text-slate-700">
            <Instagram size={24} />
            <Youtube size={24} />
            <MousePointer2 size={24} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-y-auto">
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between bg-slate-900/40 p-4 rounded-3xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div>
            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
              Guard Engine Live
            </h2>
          </div>
          <button 
            onClick={stopCapture}
            className="px-4 py-2 bg-rose-500/10 text-rose-500 text-[9px] font-black rounded-full hover:bg-rose-500/20 transition-all flex items-center gap-1.5 border border-rose-500/20"
          >
            <XCircle size={12} /> REMOVE APP
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={toggleFloatingMode}
            className={`w-full flex flex-col items-center justify-center gap-3 p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${
              isFloating 
              ? 'bg-rose-500/5 border-rose-500/20 text-rose-400' 
              : 'bg-indigo-600/5 border-indigo-600/20 text-white shadow-2xl active:scale-95'
            }`}
          >
            <div className={`p-5 rounded-full ${isFloating ? 'bg-rose-500/20' : 'bg-indigo-600 shadow-lg shadow-indigo-600/30'}`}>
              {isFloating ? <StopCircle size={32} /> : <Layers size={32} />}
            </div>
            <div className="text-center">
              <span className="text-xs font-black uppercase tracking-widest block mb-1">
                {isFloating ? 'Close Snitch Bubble' : 'Launch Snitch Bubble'}
              </span>
              <span className="text-[10px] opacity-40 font-bold uppercase tracking-tighter">Float over other apps</span>
            </div>
          </button>
        </div>

        <div className="relative aspect-video glass rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 group">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover brightness-75 group-hover:brightness-90 transition-all duration-700" />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 self-start">
              <Eye size={12} className="text-indigo-400" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Feed</span>
            </div>
            {isProcessing && (
              <div className="flex flex-col items-center gap-3 bg-black/50 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 animate-in zoom-in-95">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse"></div>
                  <Loader2 className="w-10 h-10 text-indigo-400 animate-spin relative" />
                </div>
                <span className="text-[10px] text-white font-black uppercase tracking-[0.4em] ml-1">Decoding Pixels</span>
              </div>
            )}
          </div>
        </div>

        {verdict && (
          <div className={`p-6 rounded-[2.5rem] border-2 transition-all duration-700 animate-in slide-in-from-bottom-8 ${
            verdict.isScam 
              ? 'bg-rose-500/10 border-rose-500/20 shadow-[0_20px_60px_-15px_rgba(244,63,94,0.3)]' 
              : 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_20px_60px_-15px_rgba(16,185,129,0.3)]'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                verdict.isScam ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
              }`}>
                {verdict.isScam ? 'AI DETECTED' : 'HUMAN MADE'}
              </div>
              <div className="text-[10px] font-black text-indigo-400 font-mono tracking-tighter uppercase">Confidence: {Math.round(verdict.confidence * 100)}%</div>
            </div>
            <h3 className="text-lg font-black text-white mb-2 leading-tight">{verdict.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-bold">
              {verdict.explanation}
            </p>
          </div>
        )}

        <div className="bg-indigo-500/5 rounded-[2.5rem] p-8 border border-indigo-500/10 space-y-6 mb-8">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
               <Layers size={20} />
             </div>
             <h4 className="text-xs font-black text-white uppercase tracking-widest">Bubble Protocol</h4>
          </div>
          <ol className="space-y-4">
            {[
              "Click Launch Snitch Bubble to start.",
              "Minimize and open Instagram/YouTube.",
              "Drag the bubble over any Reel you suspect.",
              "Tap the Bubble once to perform a scan.",
              "Red glow means AI/Fake, Green means Human."
            ].map((step, i) => (
              <li key={i} className="flex gap-4 items-start">
                <span className="w-6 h-6 rounded-xl bg-indigo-500/20 text-indigo-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 border border-indigo-500/20">{i+1}</span>
                <p className="text-xs text-slate-400 font-bold leading-normal">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ShieldInterface;
