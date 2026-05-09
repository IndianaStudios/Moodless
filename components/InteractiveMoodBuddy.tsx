import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { getMoodBuddyInteraction } from '../services/geminiService';
import { Sparkles, Target } from 'lucide-react';

interface InteractiveMoodBuddyProps {
  userId: string;
  currentMoodBuddy: string;
  currentLabel: string;
}

const InteractiveMoodBuddy: React.FC<InteractiveMoodBuddyProps> = ({ userId, currentMoodBuddy, currentLabel }) => {
  const [interaction, setInteraction] = useState<{ greeting: string; mission: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChanging, setIsChanging] = useState(false);
  const [reason, setReason] = useState('');

  const fetchInteraction = async (refusalReason?: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users', userId, 'emotional_context_logs'), orderBy('timestamp', 'desc'), limit(3));
      const snapshot = await getDocs(q);
      const memory = snapshot.docs.map(doc => doc.data().userInput).join(' | ');

      // Si hay un motivo de rechazo, lo incluimos en la petición
      const context = refusalReason ? `El usuario no puede hacer la misión anterior porque: "${refusalReason}". Propón otra distinta.` : memory;
      const res = await getMoodBuddyInteraction(currentLabel, context);
      setInteraction(res);
      setIsChanging(false);
      setReason('');
    } catch (error) {
      console.error("Error moodbuddy interaction:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInteraction();
  }, [userId, currentLabel]);

  const handleChangeMission = () => {
    if (reason.trim()) {
      fetchInteraction(reason);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 py-8 animate-in fade-in zoom-in duration-700">
      <div className="relative group">
        {/* Glow de fondo */}
        <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-150 group-hover:bg-white/30 transition-all duration-1000" />
        
        {/* MoodBuddy */}
        <img 
          src={currentMoodBuddy} 
          alt="MoodBuddy" 
          className="w-32 h-32 object-contain relative z-10 drop-shadow-2xl animate-bounce-slow"
        />

        {/* Globo de texto */}
        {interaction && !loading && !isChanging && (
          <div className="absolute -top-16 -right-24 z-20 w-48 bg-white text-slate-900 p-4 rounded-[2rem] rounded-bl-none shadow-2xl border-4 border-slate-900 animate-in slide-in-from-bottom-4 duration-500">
            <p className="text-[11px] font-black leading-tight italic">
              "{interaction.greeting}"
            </p>
          </div>
        )}
      </div>

      {/* Tarjeta de Misión */}
      {interaction && !loading && (
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-5 w-full max-w-xs backdrop-blur-md relative overflow-hidden group hover:border-white/20 transition-all">
          {!isChanging ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-xl">
                    <Target size={16} className="text-yellow-400" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Misión de Hoy</h4>
                </div>
                <button 
                  onClick={() => setIsChanging(true)}
                  className="text-[10px] font-black text-purple-400 hover:text-purple-300 transition-colors bg-white/5 px-3 py-1 rounded-full"
                >
                  CAMBIAR
                </button>
              </div>
              <p className="text-sm font-bold text-white pr-4">
                {interaction.mission}
              </p>
            </>
          ) : (
            <div className="animate-in fade-in zoom-in duration-300">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">¿Por qué no puedes hacerla?</p>
              <input 
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: no tengo tiempo, estoy en el trabajo..."
                className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 mb-3"
                onKeyDown={(e) => e.key === 'Enter' && handleChangeMission()}
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleChangeMission}
                  className="flex-1 bg-white text-slate-950 text-[10px] font-black py-2 rounded-xl active:scale-95 transition-all"
                >
                  PEDIR OTRA
                </button>
                <button 
                  onClick={() => setIsChanging(false)}
                  className="px-4 text-slate-500 text-[10px] font-black py-2 hover:text-white transition-colors"
                >
                  CANCELAR
                </button>
              </div>
            </div>
          )}
          <Sparkles className="absolute -bottom-2 -right-2 text-white/5 group-hover:text-white/10 transition-colors" size={60} />
        </div>
      )}
      
      {loading && (
        <div className="h-24 flex items-center justify-center">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" />
            <div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveMoodBuddy;
