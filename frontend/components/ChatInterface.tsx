
import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Video, FileText, Loader2, Info, AlertCircle, ExternalLink, ShieldAlert, Link as LinkIcon } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { Message, AnalysisResult } from '../types';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'Hello! I am AI Snitch. Paste a link to a Reel (Instagram/YouTube/TikTok), upload a screenshot, or share news text. I will snitch on AI-generated content and potential SCAMS.',
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAnalyzing]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const isUrl = (text: string) => {
    const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    return !!pattern.test(text);
  };

  const handleSend = async () => {
    if (!inputText.trim() && !attachedFile) return;

    const currentInput = inputText.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput || 'Analyzed file content',
      timestamp: Date.now(),
      attachment: previewUrl || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setAttachedFile(null);
    setPreviewUrl(null);
    setIsAnalyzing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let contents: any;
      const providesLink = isUrl(currentInput);
      
      if (attachedFile) {
        const base64Data = await fileToBase64(attachedFile);
        contents = {
          parts: [
            { inlineData: { data: base64Data, mimeType: attachedFile.type } },
            { text: `Analyze this media for AUTHENTICITY and SCAM POTENTIAL. 
              Is it AI generated or real? Check for:
              - Phishing/Scam indicators: fake banking apps, crypto giveaway scams, urgency, suspicious URLs.
              - Visual AI artifacts: warped hands, inconsistent physics, too-smooth skin, repetitive background patterns.
              - Context: ${currentInput || 'General verification request'}.
              
              Provide a clear verdict in JSON.` }
          ]
        };
      } else if (providesLink) {
        contents = {
          parts: [
            { text: `The user provided this video/reel/content link: "${currentInput}". 
              USE GOOGLE SEARCH to:
              1. Verify if this specific video or the content of the link has been debunked as AI-generated, deepfake, or a scam.
              2. Check the reputation of the source platform/user.
              3. Search for community notes or news articles regarding this specific viral piece.
              4. Determine if the video claims are physically possible or known fake news.
              
              Identify the content type (Reel/Post/Video) and provide a JSON response with a verdict on whether it is AI-generated/Fake or Real.` }
          ]
        };
      } else {
        contents = `Analyze this text for SCAMS or AI-GEN MISINFORMATION: "${currentInput}". 
          Check for phishing language, fake news markers, and synthetic text structure. Provide a JSON response.`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isAI: { type: Type.BOOLEAN },
              confidence: { type: Type.NUMBER },
              explanation: { type: Type.STRING },
              artifacts: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              }
            },
            required: ["isAI", "confidence", "explanation", "artifacts"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources = grounding?.map((chunk: any) => ({
        title: chunk.web?.title || 'External Source',
        uri: chunk.web?.uri
      })).filter((s: any) => s.uri);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: data.explanation,
        timestamp: Date.now(),
        result: {
          ...data,
          sources
        }
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Analysis error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: "I encountered an error during analysis. This can happen with secure links or complex scam patterns. Try a screenshot if the link doesn't work.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-xl ${
              msg.role === 'user' 
              ? 'bg-indigo-600 text-white rounded-tr-none' 
              : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none'
            }`}>
              {msg.attachment && (
                <div className="mb-3 rounded-lg overflow-hidden border border-white/10">
                  <img src={msg.attachment} alt="Uploaded content" className="max-h-64 object-contain mx-auto" />
                </div>
              )}
              
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              
              {msg.result && (
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      msg.result.isAI 
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {msg.result.isAI ? <ShieldAlert size={14}/> : <ShieldIcon size={14}/>}
                      {msg.result.isAI ? 'DETECTION ALERT' : 'LIKELY AUTHENTIC'}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      Score: <span className="text-indigo-400 font-bold">{Math.round(msg.result.confidence * 100)}%</span>
                    </span>
                  </div>

                  {msg.result.artifacts && msg.result.artifacts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Analysis Indicators</h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {msg.result.artifacts.map((artifact, i) => (
                          <li key={i} className="text-xs bg-slate-950/50 p-2 rounded border border-slate-800 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            {artifact}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {msg.result.sources && msg.result.sources.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Verification Sources</h4>
                      <div className="flex flex-wrap gap-2">
                        {msg.result.sources.map((source, i) => (
                          <a 
                            key={i} 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-indigo-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-2"
                          >
                            <ExternalLink size={12}/>
                            {source.title.length > 25 ? source.title.substring(0, 25) + '...' : source.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-2 text-[10px] text-slate-500 font-mono">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isAnalyzing && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              <span className="text-sm text-slate-400 font-medium font-mono">Investigating link & cross-referencing sources...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto">
          {previewUrl && (
            <div className="mb-4 relative inline-block">
              <img src={previewUrl} alt="Preview" className="h-20 w-20 object-cover rounded-lg border-2 border-indigo-500" />
              <button 
                onClick={() => { setAttachedFile(null); setPreviewUrl(null); }}
                className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-lg hover:bg-rose-600"
              >
                <X size={12} />
              </button>
            </div>
          )}
          
          <div className="relative flex items-end gap-3">
            <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Paste Reel link, YouTube URL, or suspicious news..."
                className="w-full bg-transparent p-4 text-sm text-slate-200 resize-none outline-none min-h-[56px] max-h-[200px]"
                rows={1}
              />
              <div className="px-3 pb-3 flex items-center justify-between border-t border-slate-800/50 pt-2">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors group relative"
                  >
                    <ImageIcon size={20} />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">Upload Image</span>
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors group relative"
                  >
                    <Video size={20} />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">Upload Video</span>
                  </button>
                  <div className="p-2 text-indigo-400/40 cursor-default">
                    <LinkIcon size={18} />
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                  />
                </div>
                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                   {inputText.length > 0 && isUrl(inputText) && <span className="text-indigo-400 flex items-center gap-1"><LinkIcon size={10}/> Link Detected</span>}
                   <span>{inputText.length} characters</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleSend}
              disabled={(!inputText.trim() && !attachedFile) || isAnalyzing}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Send size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Icons not available in lucide-react? Re-implementing just in case
const ShieldIcon = ({size}: {size: number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const X = ({size}: {size: number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
);

export default ChatInterface;
