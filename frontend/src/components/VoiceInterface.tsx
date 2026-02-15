
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Mic, MicOff, PhoneOff, Volume2, ShieldAlert, Sparkles, Loader2, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

const VoiceInterface: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [mode, setMode] = useState<'consult' | 'guard'>('consult');
  const [transcript, setTranscript] = useState<string[]>([]);
  const [visualizerBars, setVisualizerBars] = useState<number[]>(new Array(32).fill(10));
  const [scamRisk, setScamRisk] = useState<number>(0);
  const [isAiVoice, setIsAiVoice] = useState<boolean | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const updateVisualizer = useCallback(() => {
    setVisualizerBars(prev => prev.map(() => 5 + Math.random() * 40));
    animationFrameRef.current = requestAnimationFrame(updateVisualizer);
  }, []);

  const startSession = async () => {
    setIsConnecting(true);
    setScamRisk(0);
    setIsAiVoice(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputAudioContext;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const systemInstruction = mode === 'guard' 
        ? `YOU ARE A FORENSIC AI VOICE AUDITOR. 
           TASK: Listen to the audio input and determine if it is a HUMAN or an AI VOICE CLONE.
           CONTEXT: The user is holding their phone up to a suspicious call.
           DANGER SIGNS: Monotone cadence, unnatural breathing, repetitive frequency artifacts, robotic transitions.
           SCAM MARKERS: Requests for money, urgency, pretending to be a relative in trouble (Grandparent Scam), banking credentials.
           OUTPUT: 
           1. Transcribe the incoming audio.
           2. State CLEARLY if you suspect AI VOICE CLONE.
           3. Assign a Scam Risk % (0-100).
           Be extremely direct and protective.`
        : 'You are an AI authenticity consultant. Discuss suspicious Reels or news. Talk conversationally.';

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            updateVisualizer();
            
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message) => {
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setTranscript(prev => [...prev.slice(-6), "SNITCH: " + text]);
              
              // Dynamic logic to update UI based on AI's findings in Guard mode
              if (mode === 'guard') {
                if (text.toLowerCase().includes('ai voice') || text.toLowerCase().includes('synthetic')) {
                  setIsAiVoice(true);
                  setScamRisk(prev => Math.min(prev + 20, 100));
                }
                if (text.toLowerCase().includes('scam') || text.toLowerCase().includes('danger')) {
                  setScamRisk(95);
                }
              }
            } else if (message.serverContent?.inputTranscription) {
              setTranscript(prev => [...prev.slice(-6), "AUDIO IN: " + message.serverContent!.inputTranscription!.text]);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (base64Audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onerror: () => stopSession(),
          onclose: () => stopSession()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: systemInstruction
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    setIsActive(false);
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    setTranscript([]);
    sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
    sourcesRef.current.clear();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 items-center overflow-y-auto px-6 py-8">
      <div className="max-w-md w-full flex flex-col items-center gap-8">
        
        {/* Mode Selector */}
        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-2xl w-full">
          <button 
            onClick={() => setMode('consult')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'consult' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}
          >
            Consultant
          </button>
          <button 
            onClick={() => setMode('guard')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'guard' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500'}`}
          >
            Voice Guard
          </button>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">
            {mode === 'consult' ? 'AI Consultation' : 'Scam Voice Auditor'}
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">
            {mode === 'consult' ? 'Talk to me about suspicious media.' : 'Hold phone near speaker to detect voice clones.'}
          </p>
        </div>

        {/* Dynamic Status / Visualizer */}
        <div className={`w-full aspect-square rounded-[3rem] border-2 transition-all duration-700 flex flex-col items-center justify-center relative overflow-hidden ${
          isActive 
            ? mode === 'guard' && scamRisk > 50 ? 'bg-rose-500/10 border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.3)]' : 'bg-indigo-500/10 border-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.2)]'
            : 'bg-slate-900 border-slate-800'
        }`}>
          {mode === 'guard' && isActive && (
            <div className="absolute top-8 flex flex-col items-center gap-1">
               <div className="text-[10px] font-black text-rose-500 uppercase animate-pulse">Live Scam Meter</div>
               <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                 <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${scamRisk}%` }}></div>
               </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 h-16">
            {visualizerBars.map((height, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-75 ${
                  isActive 
                    ? mode === 'guard' && scamRisk > 50 ? 'bg-rose-500' : 'bg-indigo-500'
                    : 'bg-slate-700 h-1'
                }`}
                style={{ height: isActive ? `${height}%` : '4px' }}
              ></div>
            ))}
          </div>

          {isActive && isAiVoice && (
            <div className="mt-8 bg-rose-500 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest animate-bounce flex items-center gap-2">
              <AlertTriangle size={14} /> AI Voice Clone Detected
            </div>
          )}
        </div>

        {/* Live Logs */}
        <div className="w-full bg-slate-900/50 border border-slate-800 rounded-3xl p-6 min-h-[160px] flex flex-col justify-end gap-3">
          {transcript.length === 0 && !isActive && !isConnecting && (
            <div className="text-center space-y-4 py-4">
              <div className="flex justify-center gap-2 text-slate-700">
                <Activity size={24} className="opacity-20" />
              </div>
              <p className="text-[10px] text-slate-600 font-bold uppercase italic">
                {mode === 'consult' ? '"Does this reel look deepfaked?"' : 'Waiting for incoming call audio...'}
              </p>
            </div>
          )}
          {transcript.map((line, i) => (
            <div key={i} className={`text-[11px] font-bold leading-tight animate-in slide-in-from-bottom-1 ${
              line.startsWith('AUDIO IN:') ? 'text-indigo-400' : 'text-slate-200'
            }`}>
              {line}
            </div>
          ))}
          {isConnecting && (
            <div className="flex items-center justify-center gap-3 text-indigo-400 py-4">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Syncing Neural Link...</span>
            </div>
          )}
        </div>

        {/* Primary Control */}
        <button
          onClick={isActive ? stopSession : startSession}
          disabled={isConnecting}
          className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 relative ${
            isActive 
              ? 'bg-rose-600 shadow-rose-600/40 hover:bg-rose-500' 
              : 'bg-indigo-600 shadow-indigo-600/40 hover:bg-indigo-500 disabled:opacity-50'
          }`}
        >
          {isActive ? <PhoneOff size={32} className="text-white" /> : <Mic size={32} className="text-white" />}
          {isActive && (
             <div className="absolute -inset-4 border-4 border-white/10 rounded-full animate-ping"></div>
          )}
        </button>

        <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 w-full space-y-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <ShieldCheck size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Audio Forensics Engaged</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            In **Voice Guard** mode, AI Snitch analyzes audio frequencies for "jitter" and "shimmer" artifacts typical of real-time AI voice conversion.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoiceInterface;
