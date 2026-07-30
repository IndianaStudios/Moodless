import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoodEntry } from '../types';
import { EMOTIONAL_PALETTE, triggerHaptic } from '../constants';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, X, Sparkles, Calendar, PencilSparkles } from 'lucide-react';
import Reveal from './Reveal';
import PullToRefresh from './PullToRefresh';
import { db } from '../services/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

interface HistoryViewProps {
  entries: MoodEntry[];
  onEntriesRefresh?: (entries: MoodEntry[]) => void;
  onNavigateToLog: () => void;
  onOpenContextChat: () => void;
  loggedToday?: boolean;
}

const HistoryView: React.FC<HistoryViewProps> = ({ entries, onEntriesRefresh, onNavigateToLog, onOpenContextChat, loggedToday = true }) => {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const [zoomedMoodBuddy, setZoomedMoodBuddy] = React.useState<string | null>(null);
  const [zoomedColor, setZoomedColor] = React.useState('#fff');

  const handleRefresh = async () => {
    try {
      const userId = (await import('../services/firebase')).auth.currentUser?.uid;
      if (!userId) return;
      const snapshot = await getDocs(query(collection(db, 'users', userId, 'entries'), orderBy('date', 'desc')));
      const fresh = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MoodEntry));
      onEntriesRefresh?.(fresh);
    } catch (err) {
      console.error('History refresh failed:', err);
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} className="flex flex-1 flex-col overflow-y-auto no-scrollbar px-6 pb-40 pt-[max(2.25rem,env(safe-area-inset-top),2.5rem)]">
      {!loggedToday && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28, ease: [0.16, 1, 0.3, 1] }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { triggerHaptic(); onNavigateToLog(); }}
          className="app-surface mb-6 flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-all hover:bg-white/[0.05]"
          aria-label="Registrar tu vibe de hoy"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="app-list-icon shrink-0 text-violet-200">
              <PencilSparkles size={16} strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">Aún no has registrado hoy</p>
              <p className="app-text-meta truncate">Toca para capturar tu vibe.</p>
            </div>
          </div>
          <span className="app-button app-button-primary shrink-0 px-4 py-2 text-sm pointer-events-none">
            Registrar
          </span>
        </motion.button>
      )}
      <Reveal>
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="app-eyebrow mb-2">Diario</p>
            <h2 className="app-title text-[clamp(1.5rem,4vw,1.875rem)] capitalize text-white">
              {format(today, 'MMMM yyyy', { locale: es })}
            </h2>
            <p className="mt-1 text-sm text-white/50">Tu mapa visual de emociones</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            type="button"
            onClick={() => { triggerHaptic(); onOpenContextChat(); }}
            className="app-icon-button rounded-2xl border-violet-400/20 bg-violet-500/10 text-violet-200 hover:bg-violet-500/15"
            aria-label="Abrir contexto emocional"
          >
            <Sparkles size={18} strokeWidth={1.8} />
          </motion.button>
        </header>
      </Reveal>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8 grid w-full max-w-2xl shrink-0 grid-cols-7 gap-2 sm:mx-auto sm:gap-2.5"
      >
        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d) => (
          <div key={d} className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {d}
          </div>
        ))}
        {Array.from({ length: monthStart.getDay() }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day, idx) => {
          const entry = entries.find(e => isSameDay(new Date(e.date + 'T12:00:00'), day));
          const paletteEntry = entry ? EMOTIONAL_PALETTE.find(p => p.category === entry.category) : null;
          const moodBuddy = paletteEntry?.moodBuddy || '/mascot_calm_nobg.png';

          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26, delay: idx * 0.008, ease: [0.16, 1, 0.3, 1] }}
              className="app-surface-raised aspect-square rounded-xl flex items-center justify-center relative overflow-hidden transition-all"
              style={entry ? { backgroundColor: entry.color, opacity: 0.25 + (entry.intensity * 0.5) } : {}}
            >
              {entry && (
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => {
                    triggerHaptic();
                    setZoomedMoodBuddy(moodBuddy);
                    setZoomedColor(entry.color);
                  }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <img src={moodBuddy} alt="MoodBuddy" className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                  <span className="absolute bottom-1 right-2 text-[10px] font-semibold text-white drop-shadow-lg">{format(day, 'd')}</span>
                </motion.button>
              )}
              {!entry && <span className="text-[10px] text-white/45 font-semibold">{format(day, 'd')}</span>}
            </motion.div>
          );
        })}
      </motion.div>

      <div className="space-y-4">
        <h3 className="app-eyebrow">Recientes</h3>

        {entries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28, ease: [0.16, 1, 0.3, 1] }}
            className="app-surface flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="app-surface mb-5 flex h-16 w-16 items-center justify-center rounded-full">
              <Calendar size={24} className="text-white/55" strokeWidth={1.7} />
            </div>
            <h3 className="app-title mb-2 text-xl text-white">Tu diario está vacío</h3>
            <p className="mb-6 app-text-meta">Registra tu primera emoción para empezar a ver tu mapa.</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              type="button"
              onClick={() => { triggerHaptic(); onNavigateToLog(); }}
              className="app-button app-button-primary px-6 py-3 text-sm"
            >
              <PlusCircle size={17} strokeWidth={1.8} />
              Registrar mi primera emoción
            </motion.button>
          </motion.div>
        ) : (
          [...entries]
            .reverse()
            .slice(0, 10)
            .map((entry, idx) => {
              const paletteEntry = EMOTIONAL_PALETTE.find((p) => p.category === entry.category);
              const moodLabel = paletteEntry?.label || 'Estado';
              const moodBuddy = paletteEntry?.moodBuddy || '/mascot_calm_nobg.png';

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 28, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  className="app-surface-raised group relative overflow-hidden rounded-[1.75rem]"
                >
                  <div className="flex items-center justify-between gap-4 p-5">
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      type="button"
                      className="relative flex h-16 w-16 cursor-zoom-in items-center justify-center overflow-hidden rounded-[1.4rem] shadow-inner"
                      style={{ backgroundColor: `${entry.color}22` }}
                      onClick={() => {
                        triggerHaptic();
                        setZoomedMoodBuddy(moodBuddy);
                        setZoomedColor(entry.color);
                      }}
                    >
                      <div className="absolute inset-0 opacity-25 blur-xl" style={{ backgroundColor: entry.color }} />
                      <img src={moodBuddy} alt="" className="relative h-full w-full object-cover opacity-90" />
                    </motion.button>
                    <div className="flex-1">
                      <div className="text-sm font-semibold capitalize tracking-[-0.015em] text-white">
                        {format(new Date(entry.date + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: es })}
                      </div>
                      <div className="mt-0.5 text-xs font-medium text-white/45">{moodLabel}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })
        )}
      </div>

      <AnimatePresence>
        {zoomedMoodBuddy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="app-overlay z-50"
            role="dialog"
            aria-modal="true"
            aria-label="Vista ampliada de MoodBuddy"
            onClick={() => setZoomedMoodBuddy(null)}
          >
            <button
              type="button"
              className="app-overlay-backdrop"
              onClick={() => setZoomedMoodBuddy(null)}
              aria-label="Cerrar vista ampliada"
            />
            <div className="app-sheet max-w-sm p-6">
              <div className="app-sheet-handle" />
              <button
                type="button"
                className="app-icon-button absolute right-4 top-4"
                onClick={() => setZoomedMoodBuddy(null)}
                aria-label="Cerrar vista ampliada"
              >
                <X size={20} />
              </button>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28, ease: [0.16, 1, 0.3, 1] }}
                className="relative aspect-square w-full pt-8"
              >
                <div
                  className="absolute inset-0 rounded-full blur-[100px] opacity-20"
                  style={{ backgroundColor: zoomedColor }}
                />
                <img
                  src={zoomedMoodBuddy}
                  alt="MoodBuddy"
                  className="relative z-10 h-full w-full rounded-3xl object-contain"
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PullToRefresh>
  );
};

export default HistoryView;
