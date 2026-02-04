
import React, { useRef, useState, useEffect } from 'react';
import { 
  ShieldCheck, Loader2, StopCircle, Eye, Instagram, Youtube, 
  ChevronRight, Layers, Smartphone, Lock, CheckCircle2, AlertTriangle, 
  Share2, Info, XCircle, Settings, Monitor, HelpCircle
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface ShieldProps {
  isCompact?: boolean;
}

const ShieldInterface: React.FC<ShieldProps> = ({ isCompact }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mirrorCanvasRef = useRef<HTMLCanvasElement>(null);
  const mirrorVideoRef = useRef<HTMLVideoElement>(null);
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [verdict, setVerdict] = useState<{isScam: boolean; confidence: number; explanation: string; title: string} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<{title: string, msg: string, help?: string} | null>(null);
  const [isFloating, setIsFloating] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [browserSupport, setBrowserSupport] = useState({
    screenCapture: false,
    pip: false,
    secure: false
  });

  const pipWindowRef = useRef<any>(null);
  const frameIdRef = useRef<number | null>(null);

  useEffect(() => {
    setBrowserSupport({
      screenCapture: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
      pip: !!document.pictureInPictureEnabled || 'documentPictureInPicture' in window,
      secure: window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    });
  }, []);

  const togglePermission = (platform: string) => {
    setPermissions(prev => 
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const startScreenCapture = async () => {
    if (permissions.length === 0) {
      setError({ title: "Permission Required", msg: "Select at least one app (e.g., Instagram) before starting." });
      return;
    }

    if (!browserSupport.secure) {
      setError({ 
        title: "Security Block (No HTTPS)", 
        msg: "Screen capture is disabled on insecure connections to prevent hackers from seeing your screen.",
        help: "You must use an https:// URL or localhost to enable the engine."
      });
      return;
    }

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
        startMirrorLoop();
      }
    } catch (err: any) {
      console.error("Screen capture error:", err);
      if (err.name === 'NotAllowedError') {
        setError({ title: "Access Denied", msg: "You cancelled the screen share. Grant permission to enable the Snitch Eye." });
      } else {
        setError({ 
          title: "Engine Failure", 
          msg: "Your device or browser blocked screen capture.",
          help: "Note: iOS Safari does not allow screen capture in the browser. Use Chrome on Android or Desktop."
        });
      }
    }
  };

  const stopCapture = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (document.exitPictureInPicture && document.pictureInPictureElement) {
      document.exitPictureInPicture();
    }
    if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    
    setIsCapturing(false);
    setVerdict(null);
    setIsFloating(false);
  };

  const startMirrorLoop = () => {
    const render = () => {
      updateMirrorCanvas();
      frameIdRef.current = requestAnimationFrame(render);
    };
    render();
  };

  const updateMirrorCanvas = () => {
    if (!mirrorCanvasRef.current || !videoRef.current) return;
    const ctx = mirrorCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const w = 300;
    const h = 300;
    mirrorCanvasRef.current.width = w;
    mirrorCanvasRef.current.height = h;

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    let color = '#6366f1';
    let label = 'SNITCH READY';
    if (isProcessing) {
      color = '#fbbf24';
      label = 'SCANNING...';
    } else if (verdict) {
      color = verdict.isScam ? '#f43f5e' : '#10b981';
      label = verdict.isScam ? 'AI DETECTED' : 'HUMAN MADE';
    }

    ctx.beginPath();
    ctx.arc(w/2, h/2 - 20, 50, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowBlur = 40;
    ctx.shadowColor = color;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(w/2 - 15, h/2 - 35, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = '900 24px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, w/2, h/2 + 70);

    ctx.font = '700 12px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('TAP SCREEN TO SCAN', w/2, h/2 + 95);
  };

  const analyzeScreenFrame = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing || !isCapturing) return;

    setIsProcessing(true);
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
            { text: `Detect if the content on screen is AI-generated, a Deepfake, or a Scam. 
              Only scan for these apps: ${permissions.join(', ')}. Return JSON.` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isScam: { type: Type.BOOLEAN },
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
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleFloatingMode = async () => {
    if (isFloating) {
      if (document.exitPictureInPicture && document.pictureInPictureElement) {
        document.exitPictureInPicture();
      }
      setIsFloating(false);
      return;
    }

    if (mirrorVideoRef.current && mirrorCanvasRef.current) {
      // @ts-ignore
      const stream = mirrorCanvasRef.current.captureStream();
      mirrorVideoRef.current.srcObject = stream;
      try {
        await mirrorVideoRef.current.play();
        await mirrorVideoRef.current.requestPictureInPicture();
        setIsFloating(true);
      } catch (err) {
        console.error("PiP failed:", err);
        setError({ title: "Floating Eye Locked", msg: "Your browser blocked the floating window.", help: "Ensure you are using Chrome on Android or Desktop." });
      }
    }
  };

  if (!isCapturing) {
    return (
      <div className="flex flex-col h-full bg-slate-950 p-6 md:p-12 animate-in fade-in duration-500 overflow-y-auto">
        <div className="max-w-md mx-auto flex flex-col items-center text-center space-y-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full animate-pulse"></div>
            <div className="relative w-28 h-28 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-500/30">
              <ShieldCheck size={56} className="text-white" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-3xl font-black tracking-tight text-white uppercase">Permission Gate</h1>
            <p className="text-slate-400 text-sm leading-relaxed px-4">
              Authorize AI Snitch to monitor specific apps on your screen.
            </p>
          </div>

          <div className="w-full grid grid-cols-2 gap-3">
            {[
              { id: 'insta', icon: <Instagram size={18} />, label: 'Instagram' },
              { id: 'yt', icon: <Youtube size={18} />, label: 'YouTube' },
              { id: 'tiktok', icon: <Smartphone size={18} />, label: 'TikTok' },
              { id: 'web', icon: <Monitor size={18} />, label: 'Browser' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => togglePermission(p.label)}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  permissions.includes(p.label) 
                  ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                {p.icon}
                <span className="text-[10px] font-black uppercase">{p.label}</span>
                {permissions.includes(p.label) && <CheckCircle2 size={12} className="ml-auto text-indigo-400" />}
              </button>
            ))}
          </div>

          {error && (
            <div className="w-full bg-rose-500/10 border border-rose-500/20 p-5 rounded-3xl flex items-start gap-3 text-left animate-in slide-in-from-top-2">
              <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={20} />
              <div className="space-y-1">
                <h4 className="text-xs font-black text-rose-500 uppercase">{error.title}</h4>
                <p className="text-[10px] text-rose-400/80 font-bold leading-tight">{error.msg}</p>
                {error.help && <p className="text-[9px] text-slate-500 italic mt-1 font-bold">{error.help}</p>}
              </div>
            </div>
          )}

          <div className="w-full pt-4 border-t border-slate-900 flex flex-col gap-4">
            <button 
              onClick={startScreenCapture}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-3xl font-bold shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3 active:scale-95 group"
            >
              Start Snitch Engine
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button 
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center justify-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors py-2"
            >
              <HelpCircle size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Why do I see errors?</span>
            </button>
          </div>

          {showHelp && (
            <div className="bg-slate-900/60 p-6 rounded-3xl w-full text-left space-y-4 border border-indigo-500/20 animate-in fade-in slide-in-from-top-4">
               <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Troubleshooting Guide</h4>
               <div className="space-y-4">
                 <div>
                   <p className="text-[11px] font-black text-white uppercase mb-1">1. The HTTPS Requirement</p>
                   <p className="text-[10px] text-slate-400 leading-relaxed font-bold">Browsers block screen recording on insecure links. You MUST use an https:// URL or localhost to use this app.</p>
                 </div>
                 <div>
                   <p className="text-[11px] font-black text-white uppercase mb-1">2. Android vs iOS</p>
                   <p className="text-[10px] text-slate-400 leading-relaxed font-bold">Android Chrome supports screen capture. iOS Safari blocks all websites from recording the screen for security reasons.</p>
                 </div>
                 <div>
                   <p className="text-[11px] font-black text-white uppercase mb-1">3. Popup Blockers</p>
                   <p className="text-[10px] text-slate-400 leading-relaxed font-bold">Make sure you haven't blocked "System Overlays" or "Popups" for this site in your phone settings.</p>
                 </div>
               </div>
            </div>
          )}

          <div className="bg-slate-900/40 p-5 rounded-3xl w-full text-left space-y-4 border border-white/5">
             <div className="flex items-center gap-2 text-white">
               <Settings size={14} className="text-indigo-400" />
               <span className="text-[10px] font-black uppercase tracking-widest">System Integrity</span>
             </div>
             <div className="space-y-3">
                {[
                  { label: "Secure Link", ok: browserSupport.secure },
                  { label: "Capture Engine", ok: browserSupport.screenCapture },
                  { label: "Floating Support", ok: browserSupport.pip }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">{item.label}</span>
                    <span className={`text-[9px] font-black ${item.ok ? "text-emerald-500" : "text-rose-500"}`}>{item.ok ? "ONLINE" : "OFFLINE"}</span>
                  </div>
                ))}
             </div>
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
            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Guard Live: {permissions.join(', ')}</h2>
          </div>
          <button 
            onClick={stopCapture}
            className="px-4 py-2 bg-rose-500/10 text-rose-500 text-[9px] font-black rounded-full border border-rose-500/20 uppercase"
          >
            Kill Engine
          </button>
        </div>

        <button 
          onClick={toggleFloatingMode}
          className="w-full flex flex-col items-center justify-center gap-3 p-10 rounded-[2.5rem] border-2 border-indigo-600/20 bg-indigo-600/5 text-white active:scale-95 transition-all"
        >
          <div className="p-6 rounded-full bg-indigo-600 shadow-xl shadow-indigo-600/30">
            {isFloating ? <XCircle size={32} /> : <Layers size={32} />}
          </div>
          <div className="text-center">
            <span className="text-sm font-black uppercase tracking-widest block mb-1">
              {isFloating ? 'Close Floating Eye' : 'Launch Floating Eye'}
            </span>
            <span className="text-[10px] opacity-40 font-bold uppercase">Works on Android & Desktop</span>
          </div>
        </button>

        <canvas ref={mirrorCanvasRef} className="hidden" />
        <video ref={mirrorVideoRef} className="hidden" muted playsInline />

        <div className="relative aspect-video glass rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 cursor-pointer" onClick={analyzeScreenFrame}>
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover brightness-50" />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute inset-0 p-6 flex flex-col items-center justify-center gap-4 text-center">
             <div className="bg-indigo-600 p-4 rounded-full shadow-2xl animate-pulse">
                <Eye size={24} className="text-white" />
             </div>
             <div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest">Tap to Analysis Frame</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Instant Pixel Scanning</p>
             </div>
          </div>

          {isProcessing && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              <span className="text-[10px] text-white font-black uppercase tracking-[0.4em]">Decoding Visual Artifacts...</span>
            </div>
          )}
        </div>

        {verdict && (
          <div className={`p-8 rounded-[2.5rem] border-2 transition-all duration-700 animate-in slide-in-from-bottom-8 ${
            verdict.isScam ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                verdict.isScam ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
              }`}>
                {verdict.isScam ? 'AI DETECTED' : 'HUMAN MADE'}
              </div>
              <div className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">SCORE: {Math.round(verdict.confidence * 100)}%</div>
            </div>
            <h3 className="text-xl font-black text-white mb-2 leading-tight">{verdict.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-bold">{verdict.explanation}</p>
          </div>
        )}

        <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5 text-center space-y-4">
           <div className="inline-flex p-3 bg-indigo-500/10 rounded-full text-indigo-400">
              <Lock size={16} />
           </div>
           <h4 className="text-xs font-black text-white uppercase tracking-widest">Privacy Protocol</h4>
           <p className="text-[10px] text-slate-500 font-bold leading-relaxed px-4">
             Pixel data is processed in-memory and never stored. The Snitch Engine clears its cache automatically every 60 seconds.
           </p>
        </div>
      </div>
    </div>
  );
};

export default ShieldInterface;
