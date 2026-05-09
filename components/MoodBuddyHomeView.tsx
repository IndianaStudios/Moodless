import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { EMOTIONAL_PALETTE } from '../constants';
import { MoodEntry } from '../types';
import { Sparkles, MessageCircle, Heart, Star } from 'lucide-react';
import { getMoodBuddyInteraction } from '../services/geminiService';

interface MoodBuddyHomeViewProps {
  userId: string;
  entries: MoodEntry[];
}

const MoodBuddyHomeView: React.FC<MoodBuddyHomeViewProps> = ({ userId, entries }) => {
  const [interaction, setInteraction] = useState<{ greeting: string; mission: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChanging, setIsChanging] = useState(false);
  const [reason, setReason] = useState('');

  const lastEntry = entries[entries.length - 1];
  const palette = lastEntry ? EMOTIONAL_PALETTE.find(p => p.category === lastEntry.category) : EMOTIONAL_PALETTE[6];
  const moodBuddyImg = palette?.moodBuddy || '/mascot_calm_nobg.png';
  const moodLabel = palette?.label || 'Neutral';

  const fetchInteraction = async (refusalReason?: string) => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const hourBlock = Math.floor(new Date().getHours() / 4); // Cambia cada 4 horas
    const cacheKey = `moodbuddy_interaction_${userId}_${today}_${hourBlock}`;

    // Si no es un cambio forzado y tenemos caché, lo usamos
    if (!refusalReason) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.greeting && parsed.mission) {
          setInteraction(parsed);
          setLoading(false);
          return;
        }
      }
    }

    try {
      const q = query(collection(db, 'users', userId, 'emotional_context_logs'), orderBy('timestamp', 'desc'), limit(5));
      const snapshot = await getDocs(q);
      const memory = snapshot.docs.map(doc => doc.data().userInput).join(' | ');

      const context = refusalReason ? `El usuario no puede hacer la misión anterior porque: "${refusalReason}". Propón otra distinta.` : memory;
      const res = await getMoodBuddyInteraction(moodLabel, context);

      setInteraction(res);
      localStorage.setItem(cacheKey, JSON.stringify(res));
      setIsChanging(false);
      setReason('');
    } catch (error) {
      console.error("Error moodbuddy home:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInteraction();
  }, [userId, moodLabel]);

  const handleChangeMission = () => {
    if (reason.trim()) {
      fetchInteraction(reason);
    }
  };

  const moodColor = palette?.hex || '#a78bfa';

  return (
    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar pb-32 relative">
      {/* Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-[120px] opacity-15 animate-pulse"
          style={{ backgroundColor: moodColor }}
        />
        <div
          className="absolute bottom-40 left-10 w-40 h-40 rounded-full blur-[80px] opacity-10"
          style={{ backgroundColor: moodColor, animationDelay: '1s', animationDuration: '4s' }}
        />
        <div
          className="absolute top-40 right-0 w-32 h-32 rounded-full blur-[60px] opacity-10"
          style={{ backgroundColor: moodColor, animationDelay: '2s', animationDuration: '5s' }}
        />
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/20"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-6 flex flex-col flex-1">
        {/* Header */}
        <header className="mb-4 flex justify-between items-center">
          <div>
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-1">Refugio Emocional</h2>
            <h1 className="text-2xl font-black text-white leading-tight">Mood<span style={{ color: moodColor }}>Buddy</span></h1>
          </div>
          <div
            className="p-3 rounded-2xl border border-white/10 backdrop-blur-sm"
            style={{ backgroundColor: `${moodColor}15` }}
          >
            <Heart style={{ color: moodColor }} className="animate-pulse" size={20} fill="currentColor" />
          </div>
        </header>

        {/* MoodBuddy Arena */}
        <div className="flex flex-col items-center justify-center py-6 relative">
          {/* Mood Ring behind buddy */}
          <div className="relative">
            <div
              className="absolute inset-[-16px] rounded-full opacity-30 animate-spin"
              style={{
                background: `conic-gradient(from 0deg, ${moodColor}, transparent, ${moodColor}, transparent, ${moodColor})`,
                animationDuration: '8s',
                filter: 'blur(8px)',
              }}
            />
            <div
              className="absolute inset-[-8px] rounded-full opacity-20"
              style={{
                border: `2px dashed ${moodColor}`,
                animation: 'spin 12s linear infinite reverse',
              }}
            />
            <img
              src={moodBuddyImg}
              alt="MoodBuddy"
              className="w-44 h-44 object-contain relative z-10 drop-shadow-2xl"
              style={{
                animation: 'levitate 3s ease-in-out infinite',
                filter: `drop-shadow(0 25px 40px ${moodColor}40)`,
              }}
            />
          </div>

          {/* Mood Label Pill */}
          <div
            className="mt-5 px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.3em] border backdrop-blur-sm"
            style={{
              color: moodColor,
              borderColor: `${moodColor}40`,
              backgroundColor: `${moodColor}10`,
            }}
          >
            {moodLabel}
          </div>

          {/* Speech Bubble */}
          {interaction && (
            <div className="mt-6 w-full max-w-xs animate-in slide-in-from-bottom-4 fade-in duration-700">
              <div
                className="relative p-5 rounded-[1.8rem] backdrop-blur-md border shadow-xl"
                style={{
                  backgroundColor: `${moodColor}12`,
                  borderColor: `${moodColor}25`,
                }}
              >
                {/* Tail */}
                <div
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-l border-t backdrop-blur-md"
                  style={{
                    backgroundColor: `${moodColor}12`,
                    borderColor: `${moodColor}25`,
                  }}
                />
                <div className="flex items-start gap-3">
                  <MessageCircle size={14} className="shrink-0 mt-0.5 opacity-40" style={{ color: moodColor }} />
                  <p className="text-sm font-bold text-white/90 leading-relaxed italic">
                    "{interaction.greeting}"
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Daily Mission Card */}
        {interaction && (
          <div
            className="mt-4 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden group border border-white/10 backdrop-blur-sm"
            style={{
              background: `linear-gradient(135deg, ${moodColor}25 0%, ${moodColor}08 100%)`,
            }}
          >
            <div className="relative z-10">
              {!isChanging ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${moodColor}20` }}
                      >
                        <Sparkles style={{ color: moodColor }} size={14} />
                      </div>
                      <div>
                        <h3 className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Misión del día</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: moodColor }} />
                          <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: `${moodColor}90` }}>Activa</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsChanging(true)}
                      className="text-[9px] font-black text-white/50 bg-white/5 px-4 py-1.5 rounded-full hover:bg-white/10 hover:text-white transition-all border border-white/5"
                    >
                      CAMBIAR
                    </button>
                  </div>
                  <p className="text-lg font-black text-white leading-snug">
                    {interaction.mission}
                  </p>
                </>
              ) : (
                <div className="animate-in fade-in zoom-in duration-300">
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-3">¿Por qué no puedes hacerla hoy?</p>
                  <input
                    autoFocus
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej: no tengo tiempo, estoy cansado..."
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/50 mb-3"
                    onKeyDown={(e) => e.key === 'Enter' && handleChangeMission()}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleChangeMission}
                      className="flex-1 bg-white text-slate-900 text-[10px] font-black py-2.5 rounded-xl active:scale-95 transition-all shadow-lg"
                    >
                      PEDIR OTRA
                    </button>
                    <button
                      onClick={() => setIsChanging(false)}
                      className="px-4 text-white/40 text-[10px] font-black py-2 hover:text-white transition-colors"
                    >
                      CANCELAR
                    </button>
                  </div>
                </div>
              )}
            </div>
            <Star
              className="absolute -bottom-6 -right-6 opacity-5 group-hover:rotate-12 group-hover:opacity-10 transition-all duration-700"
              style={{ color: moodColor }}
              size={140}
            />
          </div>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-5 animate-in zoom-in duration-500">
            <div
              className="w-14 h-14 border-[3px] border-t-transparent rounded-full animate-spin"
              style={{ borderColor: moodColor, borderTopColor: 'transparent' }}
            />
            <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Saludando...</p>
          </div>
        </div>
      )}

      {/* Inline animations */}
      <style>{`
        @keyframes levitate {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.2; }
          50% { transform: translateY(-20px) scale(1.5); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default MoodBuddyHomeView;
