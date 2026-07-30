import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Mic, Sparkles, Loader2, MessageCircle } from 'lucide-react';
import { analyzeEmotionalContext } from '../services/geminiService';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, getDocs } from 'firebase/firestore';
import ModalShell from './ModalShell';

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
    { role: 'ai', text: 'Hola, ¿qué ha pasado hoy? Cuéntame un poco para entender mejor cómo te sientes.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [pastMemory, setPastMemory] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const startListening = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta el reconocimiento de voz.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => (prev ? prev + ' ' + transcript : transcript));
    };

    recognition.start();
  };

  useEffect(() => {
    const fetchPastMemory = async () => {
      try {
        const q = query(
          collection(db, 'users', userId, 'emotional_context_logs'),
          orderBy('timestamp', 'desc'),
        );
        const snapshot = await getDocs(q);
        const logs = snapshot.docs.map(doc => {
          const data = doc.data();
          return `[${data.date}] ${data.contexto?.join(', ')}: ${data.userInput}`;
        }).reverse();
        setPastMemory(logs.join('\n'));
      } catch (err) {
        console.error('Error fetching past memory:', err);
      }
    };
    fetchPastMemory();
  }, [userId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const newMessages = [...messages, { role: 'user' as const, text: userText }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Construir historial EXCLUYENDO el mensaje que acabamos de añadir
      // (lo pasamos aparte como "última intervención" para que el modelo
      // entienda claramente qué es lo nuevo vs el contexto previo).
      const previousTurns = newMessages.slice(1, -1);
      const historyStr = previousTurns
        .map(m => `${m.role === 'user' ? 'Usuario' : 'IA'}: ${m.text}`)
        .join('\n');
      const result = await analyzeEmotionalContext(userText, historyStr, pastMemory);

      if (!result.necesita_aclaracion) {
        const today = new Date().toISOString().split('T')[0];
        const newLog = await addDoc(collection(db, 'users', userId, 'emotional_context_logs'), {
          date: today,
          timestamp: serverTimestamp(),
          contexto: result.contexto,
          emocion: result.emocion,
          energia: result.energia,
          intensidad: result.intensidad,
          userInput: userText,
          aiResponse: result.respuesta,
        });
        // Actualizar la memoria local con el nuevo log para que turnos
        // posteriores del mismo chat tengan contexto actualizado.
        setPastMemory(prev => {
          const entry = `[${today}] ${(result.contexto || []).join(', ') || 'N/A'}: ${userText}`;
          return prev ? `${prev}\n${entry}` : entry;
        });
        // (newLog se podría usar para deduplicación futura si se quiere)
        void newLog;
      }

      setMessages(prev => [...prev, { role: 'ai', text: result.respuesta }]);
    } catch (error) {
      console.error('Error in ContextChat:', error);
      setMessages(prev => [...prev, { role: 'ai', text: 'Lo siento, he tenido un pequeño lapsus. ¿Puedes repetirlo?' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell open ariaLabel="Contexto emocional" zClass="z-[110]" variant="plain">
      <div className="app-sheet flex max-w-lg flex-col h-[88dvh]">
        <div className="app-sheet-handle" />

        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between apple-vibrancy">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/[0.16] rounded-xl border border-purple-400/15">
              <MessageCircle size={17} className="text-purple-300" strokeWidth={1.8} />
            </div>
            <div>
              <h3 id="context-chat-title" className="text-sm font-semibold text-white tracking-[-0.005em]">Contexto emocional</h3>
              <p className="app-text-meta">Asistente IA</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="app-icon-button h-9 w-9"
            aria-label="Cerrar contexto emocional"
          >
            <X size={17} />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-medium tracking-[-0.005em] ${
                msg.role === 'user'
                  ? 'bg-purple-500/85 text-white rounded-tr-md shadow-[0_6px_18px_rgba(168,85,247,0.25)]'
                  : 'app-surface text-white/85 rounded-tl-md'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="app-surface px-4 py-3 rounded-2xl rounded-tl-md flex items-center gap-2.5">
                <Loader2 size={14} className="text-purple-300 animate-spin" />
                <span className="text-xs app-text-meta">Analizando contexto…</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 bg-[var(--app-bg)]/50 border-t border-white/[0.06] apple-vibrancy">
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="¿Qué te ha afectado más hoy?"
              className="app-input py-3.5 pl-5 pr-24 text-sm"
            />
            <div className="absolute right-1.5 flex items-center gap-1">
              <button
                type="button"
                onClick={startListening}
                className={`app-icon-button h-9 w-9 border-0 bg-transparent ${isListening ? 'text-red-400 animate-pulse' : 'text-white/45 hover:text-purple-300'}`}
                aria-label="Dictar por voz"
              >
                <Mic size={18} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className={`app-icon-button h-9 w-9 rounded-xl ${
                  input.trim() && !loading ? 'bg-purple-500/85 text-white border-purple-500/40' : 'border-transparent bg-transparent text-white/45'
                }`}
                aria-label="Enviar"
              >
                <Send size={17} strokeWidth={2} />
              </button>
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {['¿Qué ha pasado hoy?', '¿Cómo te sientes?', 'Algo que me quieras contar'].map((s, i) => (
              <button
                key={i}
                onClick={() => setInput(s)}
                className="shrink-0 px-3.5 py-1.5 app-surface rounded-full text-[11px] font-medium hover:bg-white/[0.08] hover:text-white/90 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

export default ContextChat;
