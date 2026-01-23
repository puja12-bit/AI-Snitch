
import React, { useRef, useState, useEffect } from 'react';
import { Monitor, ShieldAlert, ShieldCheck, Loader2, AlertTriangle, Info, StopCircle, Zap } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

const ShieldInterface: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [verdict, setVerdict] = useState<{isScam: boolean; confidence: number; explanation: string; title: string} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startScreenCapture = async () => {
    try {
      setError(null);
      // Capture the screen, window, or tab
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { 
          displaySurface: "monitor",
        },
        audio: true 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);

        // Listen for when the user stops sharing via the browser UI
        stream.getVideoTracks()[0].onended = () => {
          stopCapture();
        };
      }
    } catch (err) {
      console.error("Screen capture error:", err);
      setError("Screen capture permission denied or failed. Please grant access to monitor your feed.");
    }
  };

  const stopCapture = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setVerdict(null);
  };

  const analyzeScreenFrame = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing || !isCapturing) return;

    setIsProcessing(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Set canvas size to video stream resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
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
            { text: `SCREEN AUTHENTICITY AUDIT:
              Analyze this screen capture for:
              1. AI-generated visual artifacts in reels or videos (warped features, unnatural motion).
              2. Fake news headlines or misinformation patterns.
              3. Scam indicators (phishing forms, fake urgency, suspicious crypto giveaways).
              4. Synthetic voice/audio indicators if any captions are present.

              Return a precise JSON verdict.` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isScam: { type: Type.BOOLEAN, description: "True if content is AI-generated fake, a scam, or fake news" },
              confidence: { type: Type.NUMBER, description: "Detection confidence 0-100" },
              title: { type: Type.STRING, description: "The nature of the detection (e.g., 'AI Reel Detected', 'Fake News Alert')" },
              explanation: { type: Type.STRING, description: "Detailed reasoning for the verdict" }
            },
            required: ["isScam", "confidence", "title", "explanation"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      setVerdict(data);
    } catch (err) {
      console.error("Frame analysis failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Automated scanning loop every 6 seconds to save tokens while remaining "live"
  useEffect(() => {
    let interval: any;
    if (isCapturing) {
      interval = setInterval(analyzeScreenFrame, 6000);
      analyzeScreenFrame(); // Run immediately on start
    }
    return () => clearInterval(interval);
  }, [isCapturing]);

  return (
    <div className="flex flex-col h-full bg-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="text-amber-400 fill-amber-400" /> Active Screen Shield
            </h2>
            <p className="text-slate-400 text-sm">
              Monitoring your screen for real-time AI generation, fake news, and scam patterns.
            </p>
          </div>
          <div className="flex gap-3">
            {!isCapturing ? (
              <button 
                onClick={startScreenCapture}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
              >
                <Monitor size={20} /> Start Shield
              </button>
            ) : (
              <button 
                onClick={stopCapture}
                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2"
              >
                <StopCircle size={20} /> Stop Shield
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300">
            <AlertTriangle size={20} />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 relative aspect-video bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl group">
            {isCapturing ? (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="w-full h-full object-contain bg-black"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* HUD Overlays */}
                <div className="absolute inset-0 border-[2px] border-indigo-500/20 pointer-events-none group-hover:border-indigo-500/40 transition-colors"></div>
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-full border border-white/10">
                  <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></div>
                  <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">
                    {isProcessing ? 'Deep Scanning...' : 'System Protected'}
                  </span>
                </div>

                {/* Processing Overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="bg-indigo-600/20 backdrop-blur-sm p-4 rounded-full border border-indigo-500/30">
                        <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                     </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-6 bg-slate-900/50">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center shadow-inner">
                  <Monitor size={40} className="text-slate-600" />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-bold text-slate-400">Shield Offline</p>
                  <p className="text-xs text-slate-600 max-w-xs">Grant screen permission to start real-time monitoring of Reels, News, and more.</p>
                </div>
              </div>
            )}
          </div>

          {/* Verdict Sidebar */}
          <div className="flex flex-col gap-4">
            <div className={`flex-1 rounded-3xl border p-6 transition-all duration-500 ${
              !verdict 
                ? 'bg-slate-900/50 border-slate-800' 
                : verdict.isScam 
                  ? 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_40px_-15px_rgba(244,63,94,0.3)]' 
                  : 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_40px_-15px_rgba(16,185,129,0.3)]'
            }`}>
              {!verdict ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                   <ShieldAlert className="w-10 h-10 text-slate-700" />
                   <p className="text-sm text-slate-500 font-medium">Waiting for data stream analysis...</p>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                      verdict.isScam ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                    }`}>
                      {verdict.isScam ? 'Detection Alert' : 'Verified'}
                    </span>
                    <span className="text-xs font-mono text-slate-500">Confidence {Math.round(verdict.confidence)}%</span>
                  </div>

                  <div className="space-y-2">
                    <h3 className={`text-xl font-bold ${verdict.isScam ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {verdict.title}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed italic">
                      "{verdict.explanation}"
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/5 space-y-3">
                     <h4 className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Analysis Score</h4>
                     <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${verdict.isScam ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${verdict.confidence}%` }}
                        ></div>
                     </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-4 flex gap-3">
              <Info className="text-indigo-400 shrink-0" size={18} />
              <p className="text-[11px] text-indigo-300 leading-tight">
                AI Snitch Shield processes your screen internally via AI Snitch Intelligence. No data is stored or shared outside of the verification process.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/30 transition-colors">
            <h4 className="text-xs font-bold text-white uppercase mb-2">Reel Analysis</h4>
            <p className="text-xs text-slate-500 leading-relaxed">Detects AI-interpolated frames, deepfake face swaps, and synthesized speech in video feeds.</p>
          </div>
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/30 transition-colors">
            <h4 className="text-xs font-bold text-white uppercase mb-2">News Fact-Check</h4>
            <p className="text-xs text-slate-500 leading-relaxed">Cross-references breaking news text on your screen against global authenticity datasets.</p>
          </div>
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/30 transition-colors">
            <h4 className="text-xs font-bold text-white uppercase mb-2">Scam Protection</h4>
            <p className="text-xs text-slate-500 leading-relaxed">Identifies phishing patterns and scam graphics in browser windows or social media DMs.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShieldInterface;
