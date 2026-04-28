import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Mic, Sparkles, Loader2, MessageCircle } from 'lucide-react';
import { analyzeEmotionalContext } from '../services/geminiService';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

interface ContextChatProps {
  userId: string;
  onClose: () => void;
}

const ContextChat: React.FC<ContextChatProps> = ({ userId, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Hola, ¿qué ha pasado hoy? Cuéntame un poco para entender mejor cómo te sientes.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const result = await analyzeEmotionalContext(userText);
      
      // Guardar en Firestore
      const today = new Date().toISOString().split('T')[0];
      await addDoc(collection(db, 'users', userId, 'emotional_context_logs'), {
        date: today,
        timestamp: serverTimestamp(),
        contexto: result.contexto,
        emocion: result.emocion,
        energia: result.energia,
        intensidad: result.intensidad,
        userInput: userText,
        aiResponse: result.respuesta
      });

      setMessages(prev => [...prev, { role: 'ai', text: result.respuesta }]);
    } catch (error) {
      console.error("Error in ContextChat:", error);
      setMessages(prev => [...prev, { role: 'ai', text: 'Lo siento, he tenido un pequeño lapsus. ¿Puedes repetirlo?' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-500 flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <MessageCircle size={20} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Contexto Emocional</h3>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">IA Assistant</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar"
        >
          {messages.map((msg, i) => (
            <div 
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-medium ${
                msg.role === 'user' 
                  ? 'bg-purple-600 text-white rounded-tr-none shadow-lg shadow-purple-900/20' 
                  : 'bg-white/5 border border-white/10 text-slate-300 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                <Loader2 size={16} className="text-purple-400 animate-spin" />
                <span className="text-xs text-slate-500 font-medium">Analizando contexto...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-slate-950/50 border-t border-white/5">
          <div className="relative flex items-center gap-2">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="¿Qué te ha afectado más hoy?"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pr-24 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button className="p-2 text-slate-500 hover:text-purple-400 transition-colors">
                <Mic size={20} />
              </button>
              <button 
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className={`p-2 rounded-xl transition-all ${
                  input.trim() && !loading ? 'bg-purple-600 text-white' : 'text-slate-600'
                }`}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {['¿Qué ha pasado hoy?', '¿Cómo te sientes?', 'Algo que me quieras contar'].map((s, i) => (
              <button 
                key={i}
                onClick={() => setInput(s)}
                className="shrink-0 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full text-[10px] text-slate-500 font-bold hover:bg-white/10 hover:text-slate-300 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContextChat;
