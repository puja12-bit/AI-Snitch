
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Mic, MicOff, PhoneOff, Volume2, ShieldAlert, Sparkles, Loader2 } from 'lucide-react';

const VoiceInterface: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [visualizerBars, setVisualizerBars] = useState<number[]>(new Array(32).fill(10));
  
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
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputAudioContext;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

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
              setTranscript(prev => [...prev.slice(-4), "AI: " + message.serverContent!.outputTranscription!.text]);
            } else if (message.serverContent?.inputTranscription) {
              setTranscript(prev => [...prev.slice(-4), "You: " + message.serverContent!.inputTranscription!.text]);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (base64Audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.destination);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('Live error:', e);
            stopSession();
          },
          onclose: () => {
            stopSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: 'You are an AI authenticity consultant. You help users identify if content like Reels, TikToks, messages, or news is real or AI generated. Talk conversationally. Explain what to look for: inconsistencies, artifacts, unnatural speech patterns, or too-perfect visuals. You are helpful, skeptical of unverified claims, and educational.'
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start session:", err);
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.debug('Session already closed');
      }
      sessionRef.current = null;
    }
    setIsActive(false);
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setTranscript([]);
    sourcesRef.current.forEach(s => {
      try {
        s.stop();
      } catch (e) {}
    });
    sourcesRef.current.clear();
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-950 p-6 md:p-12 items-center justify-center overflow-y-auto">
      <div className="max-w-3xl w-full flex flex-col items-center gap-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em]">
            <Sparkles size={12} />
            Voice Intelligence
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Live Consult</h2>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            Discuss suspicious Reels or messages with AI Snitch in real-time.
          </p>
        </div>

        {/* Visualizer */}
        <div className="w-full flex items-center justify-center gap-1.5 h-24 px-4">
          {visualizerBars.map((height, i) => (
            <div
              key={i}
              className={`w-1.5 md:w-2 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-full transition-all duration-75 ${isActive ? 'opacity-100' : 'opacity-20 h-2'}`}
              style={{ height: isActive ? `${height}%` : '4px' }}
            ></div>
          ))}
        </div>

        {/* Transcription Area */}
        <div className="w-full bg-slate-900/40 border border-slate-800 rounded-3xl p-6 min-h-[140px] flex flex-col justify-end space-y-3 shadow-inner">
          {transcript.length === 0 && !isActive && !isConnecting && (
            <div className="text-slate-500 italic text-center text-xs py-4 opacity-50">
              "Is this video of the person eating lightbulbs real?"
            </div>
          )}
          {isConnecting && (
            <div className="flex items-center justify-center gap-3 text-indigo-400 py-8">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-xs font-bold tracking-wider uppercase">Connecting Audio...</span>
            </div>
          )}
          {transcript.map((line, i) => (
            <div 
              key={i} 
              className={`text-xs md:text-sm animate-in slide-in-from-bottom-2 fade-in duration-300 ${
                line.startsWith('You:') ? 'text-indigo-300 font-bold' : 'text-slate-100'
              }`}
            >
              {line}
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          {!isActive ? (
            <button
              onClick={startSession}
              disabled={isConnecting}
              className="group flex flex-col items-center gap-4"
            >
              <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-600/30 group-hover:bg-indigo-500 transition-all active:scale-90">
                {isConnecting ? <Loader2 size={32} className="text-white animate-spin" /> : <Mic size={32} className="text-white" />}
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">Start Voice</span>
            </button>
          ) : (
            <button
              onClick={stopSession}
              className="group flex flex-col items-center gap-4"
            >
              <div className="w-20 h-20 bg-rose-600 rounded-full flex items-center justify-center shadow-2xl shadow-rose-600/30 group-hover:bg-rose-500 transition-all active:scale-90">
                <PhoneOff size={32} className="text-white" />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-rose-400 transition-colors">End Session</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl">
          {[
            { icon: <ShieldAlert size={16} className="text-indigo-400" />, title: "Snitch Engine", desc: "Live AI analysis." },
            { icon: <Volume2 size={16} className="text-indigo-400" />, title: "Low Latency", desc: "Instant feedback." },
            { icon: <Sparkles size={16} className="text-indigo-400" />, title: "Contextual", desc: "Ask questions." }
          ].map((feature, i) => (
            <div key={i} className="bg-slate-900/30 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl shrink-0">
                {feature.icon}
              </div>
              <div className="min-w-0">
                <h4 className="text-[10px] font-black text-slate-200 uppercase tracking-wider truncate">{feature.title}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VoiceInterface;
