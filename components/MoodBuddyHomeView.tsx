import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { EMOTIONAL_PALETTE, triggerHaptic } from '../constants';
import { MoodEntry } from '../types';
import { Sparkles, MessageCircle, Heart, Lock } from 'lucide-react';
import { getMoodBuddyInteraction } from '../services/geminiService';
import Reveal from './Reveal';
import ModalShell from './ModalShell';

interface MoodBuddyHomeViewProps {
  userId: string;
  entries: MoodEntry[];
  loggedToday?: boolean;
  onNavigateToLog?: () => void;
}

const MoodBuddyHomeView: React.FC<MoodBuddyHomeViewProps> = ({ userId, entries, loggedToday = true, onNavigateToLog }) => {
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
    const hourBlock = Math.floor(new Date().getHours() / 4);
    const cacheKey = `moodbuddy_interaction_${userId}_${today}_${hourBlock}`;

    if (!refusalReason) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.greeting && parsed.mission) {
            setInteraction(parsed);
            setLoading(false);
            return;
          }
        } catch {}
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
      console.error('Error moodbuddy home:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loggedToday) {
      setLoading(false);
      setInteraction(null);
      return;
    }
    fetchInteraction();
  }, [userId, moodLabel, loggedToday]);

  const handleChangeMission = () => {
    if (reason.trim()) {
      fetchInteraction(reason);
    }
  };

  const moodColor = palette?.hex || '#a78bfa';

  return (
    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar pb-32 relative">
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
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/20 mood-buddy-float"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-6 pt-[max(1.25rem,env(safe-area-inset-top))] flex flex-col flex-1">
        <Reveal>
          <header className="mb-4 flex items-center justify-between">
            <div>
              <p className="app-eyebrow mb-1">Refugio emocional</p>
              <h1 className="app-title text-[clamp(1.75rem,5vw,2rem)] text-white">
                Mood<span style={{ color: moodColor }}>Buddy</span>
              </h1>
            </div>
            <div
              className="rounded-2xl border border-white/10 p-3 app-surface"
              style={{ backgroundColor: `${moodColor}15` }}
            >
              <Heart style={{ color: moodColor }} className="animate-pulse" size={18} strokeWidth={1.8} fill="currentColor" />
            </div>
          </header>
        </Reveal>

        <div className="flex-1 flex flex-col items-center justify-center py-6 relative my-auto">
          <div className="relative">
            <div
              className="absolute inset-[-16px] rounded-full opacity-25 blur-2xl"
              style={{ backgroundColor: moodColor }}
              aria-hidden="true"
            />
            <img
              src={moodBuddyImg}
              alt="MoodBuddy"
              className="w-44 h-44 object-contain relative z-10 drop-shadow-2xl mood-buddy-levitate"
              style={{
                filter: `drop-shadow(0 16px 28px ${moodColor}30)`,
              }}
            />
          </div>

          <div
            className="mt-5 px-5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border"
            style={{
              color: moodColor,
              borderColor: `${moodColor}40`,
              backgroundColor: `${moodColor}10`,
            }}
          >
            {moodLabel}
          </div>

          {interaction && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 w-full max-w-xs"
            >
              <div
                className="relative p-5 rounded-[1.8rem] backdrop-blur-md border shadow-xl"
                style={{
                  backgroundColor: `${moodColor}12`,
                  borderColor: `${moodColor}25`,
                }}
              >
                <div
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-l border-t backdrop-blur-md"
                  style={{
                    backgroundColor: `${moodColor}12`,
                    borderColor: `${moodColor}25`,
                  }}
                />
                <div className="flex items-center gap-3">
                  <MessageCircle size={14} className="shrink-0 opacity-50" style={{ color: moodColor }} strokeWidth={1.8} />
                  <p className="text-sm font-semibold text-white/90 leading-relaxed italic">
                    "{interaction.greeting}"
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Skeleton específico mientras se carga el greeting */}
          {!interaction && loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 w-full max-w-xs space-y-2.5"
              aria-busy="true"
              aria-label="Cargando saludo del Buddy"
            >
              <div
                className="app-surface rounded-[1.8rem] p-5"
                style={{
                  borderColor: `${moodColor}25`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="app-skeleton h-3.5 w-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: `${moodColor}30` }}
                  />
                  <div className="flex-1 space-y-2">
                    <div className="app-skeleton h-3 rounded w-11/12" />
                    <div className="app-skeleton h-3 rounded w-8/12" />
                    <div className="app-skeleton h-3 rounded w-9/12" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Skeleton de la mission card mientras carga */}
          {!interaction && loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="mt-8 p-6 sm:p-8 rounded-[2rem] relative overflow-hidden w-full app-surface-raised"
              aria-busy="true"
              aria-label="Cargando misión del día"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl app-skeleton"
                    style={{ backgroundColor: `${moodColor}30` }}
                  />
                  <div className="space-y-1.5">
                    <div className="app-skeleton h-3 rounded w-20" />
                    <div className="app-skeleton h-2 rounded w-14" />
                  </div>
                </div>
                <div className="app-skeleton h-7 w-16 rounded-full" />
              </div>
              <div className="space-y-2.5 mt-2">
                <div className="app-skeleton h-4 rounded w-full" />
                <div className="app-skeleton h-4 rounded w-11/12" />
                <div className="app-skeleton h-4 rounded w-9/12" />
              </div>
            </motion.div>
          )}

          {interaction && (
            <Reveal delay={0.1}>
              <motion.div
                className="mt-8 p-6 sm:p-8 rounded-[2rem] relative overflow-hidden w-full app-surface-raised"
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
                            <Sparkles style={{ color: moodColor }} size={14} strokeWidth={1.8} />
                          </div>
                          <div>
                            <h3 className="app-text-eyebrow">Misión del día</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: moodColor }} />
                              <span className="text-[11px] font-medium" style={{ color: `${moodColor}cc` }}>Activa</span>
                            </div>
                          </div>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => { triggerHaptic(); setIsChanging(true); }}
                          className="text-[11px] font-medium text-white/55 app-surface px-3 py-1.5 rounded-full hover:bg-white/10 hover:text-white transition-all"
                        >
                          Cambiar
                        </motion.button>
                      </div>
                      <p className="text-lg font-semibold text-white leading-snug tracking-[-0.018em]">
                        {interaction.mission}
                      </p>
                    </>
                  ) : (
                    <div>
                      <p className="app-text-eyebrow mb-3">¿Por qué no puedes hacerla hoy?</p>
                      <input
                        autoFocus
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Ej: no tengo tiempo, estoy cansado..."
                        className="text-[12px] font-medium text-white/85 app-input mb-3"
                        onKeyDown={(e) => e.key === 'Enter' && handleChangeMission()}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleChangeMission}
                          className="app-button app-button-primary flex-1 text-[12px] font-semibold py-2.5"
                        >
                          Pedir otra
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsChanging(false)}
                          className="app-button app-button-secondary text-[12px] py-2.5"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </Reveal>
          )}
        </div>
      </div>

      <ModalShell open={loading} ariaLabel="Cargando" zClass="z-50 !items-center">
        <div className="flex flex-col items-center gap-5">
          <div
            className="w-14 h-14 border-[3px] border-t-transparent rounded-full animate-spin"
            style={{ borderColor: moodColor, borderTopColor: 'transparent' }}
          />
          <p className="app-text-eyebrow text-white/60">Saludando...</p>
        </div>
      </ModalShell>

      {!loggedToday && (
        <ModalShell open ariaLabel="Buddy bloqueado" zClass="z-40 !items-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border border-white/10"
            style={{ backgroundColor: `${moodColor}15`, color: moodColor }}
          >
            <Lock size={18} strokeWidth={1.8} />
          </div>
          <p className="text-sm font-medium text-white leading-tight px-2">Aún no has registrado tu vibe de hoy</p>
          <p className="mt-2 app-text-meta leading-snug px-2">Registra tu vibe para conversar con tu Buddy.</p>
          {onNavigateToLog && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => { triggerHaptic(); onNavigateToLog(); }}
              className="app-button app-button-primary mt-5 px-5 py-2.5 text-xs"
            >
              Registrar vibe
            </motion.button>
          )}
        </ModalShell>
      )}
    </div>
  );
};

export default MoodBuddyHomeView;