import React, { useRef, useState, useEffect } from 'react';
import { 
  ShieldCheck, Loader2, Eye, Instagram, Youtube, 
  ChevronRight, Layers, Smartphone, Lock, CheckCircle2, AlertTriangle, 
  XCircle, Settings, Monitor, HelpCircle
} from 'lucide-react';

import { analyzeFrame } from "../services/snitchApi";

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

  const frameIdRef = useRef<number | null>(null);

  useEffect(() => {
    setBrowserSupport({
      screenCapture: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
      pip: !!document.pictureInPictureEnabled || 'documentPictureInPicture' in window,
      secure: window.location.protocol === 'https:' || window.location.hostname === 'localhost'
    });
  }, []);

  const togglePermission = (platform: string) => {
    setPermissions(prev => 
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const startScreenCapture = async () => {
    if (permissions.length === 0) {
      setError({ title: "Permission Required", msg: "Select at least one app before starting." });
      return;
    }

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { frameRate: 5 },  // Reduced from 30
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
      setError({ title: "Capture Failed", msg: "Screen capture permission denied or unsupported." });
    }
  };

  const stopCapture = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
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
    if (!mirrorCanvasRef.current) return;
    const ctx = mirrorCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const w = 300;
    const h = 300;
    mirrorCanvasRef.current.width = w;
    mirrorCanvasRef.current.height = h;

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    let color = '#6366f1';
    let label = 'READY';

    if (isProcessing) {
      color = '#fbbf24';
      label = 'SCANNING';
    } else if (verdict) {
      color = verdict.isScam ? '#f43f5e' : '#10b981';
      label = verdict.isScam ? 'AI LIKELY' : 'LOW AI SIGNAL';
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(w/2, h/2, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, w/2, h/2 + 80);
  };

  const analyzeScreenFrame = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing || !isCapturing) return;

    setIsProcessing(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;

    const scale = 0.4;
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

      // CALL BACKEND HERE
      const data = await analyzeFrame(base64Data);
      setVerdict(data);

    } catch (err) {
      console.error("Analysis failed:", err);
      setError({ title: "Analysis Failed", msg: "Backend not reachable." });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleFloatingMode = async () => {
    if (!mirrorVideoRef.current || !mirrorCanvasRef.current) return;

    const stream = mirrorCanvasRef.current.captureStream(5);
    mirrorVideoRef.current.srcObject = stream;

    try {
      await mirrorVideoRef.current.play();
      await mirrorVideoRef.current.requestPictureInPicture();
      setIsFloating(true);
    } catch (err) {
      console.error("PiP failed:", err);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {!isCapturing && (
        <button onClick={startScreenCapture} className="bg-indigo-600 text-white px-4 py-2 rounded">
          Start Snitch Engine
        </button>
      )}

      {isCapturing && (
        <>
          <video ref={videoRef} autoPlay muted className="w-full rounded" />
          <canvas ref={canvasRef} className="hidden" />

          <button onClick={analyzeScreenFrame} className="bg-blue-600 text-white px-4 py-2 rounded">
            Analyze Frame
          </button>

          {isProcessing && <p>Scanning...</p>}

          {verdict && (
            <div className="p-4 border rounded bg-slate-900 text-white">
              <p><b>{verdict.title}</b></p>
              <p>{verdict.explanation}</p>
              <p>Confidence: {Math.round(verdict.confidence * 100)}%</p>
            </div>
          )}

          <button onClick={stopCapture} className="bg-red-600 text-white px-4 py-2 rounded">
            Stop
          </button>
        </>
      )}
    </div>
  );
};

export default ShieldInterface;
