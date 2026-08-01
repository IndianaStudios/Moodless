import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoodEntry } from '../types';
import { EMOTIONAL_PALETTE, triggerHaptic } from '../constants';
import { getEmotionalInsights, getMoodPrediction, MoodPrediction } from '../services/geminiService';
import { db } from '../services/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import MoodCanvas from './MoodCanvas';
import {
  Calendar,
  Zap,
  FileText,
  TrendingUp,
  Sparkles,
  X,
  RefreshCw,
  Lock,
  Eye,
  Clock,
  Brain,
  Cloud,
  Loader2,
  Pencil,
  Check,
} from 'lucide-react';

interface StatsViewProps {
  entries: MoodEntry[];
  contextLogs?: any[];
  userId: string;
  loggedToday?: boolean;
  onNavigateToLog?: () => void;
  onUpdateMood?: (entryId: string, newMood: Omit<MoodEntry, 'id' | 'date' | 'report'>) => Promise<void> | void;
}

interface Insight {
  title: string;
  description: string;
  confidence: number;
}

interface InsightsData {
  insights: Insight[];
  summary: string;
  cloudContexts: string[];
}

const AURA_ICONS: Record<string, React.ReactNode> = {
  JOY: <Sparkles size={14} className="text-yellow-300" strokeWidth={1.8} />,
  CALM: <Eye size={14} className="text-teal-300" strokeWidth={1.8} />,
  ANGER: <Zap size={14} className="text-red-300" strokeWidth={1.8} />,
  SADNESS: <Calendar size={14} className="text-blue-300" strokeWidth={1.8} />,
  ANXIETY: <Eye size={14} className="text-violet-300" strokeWidth={1.8} />,
  ENERGY: <Zap size={14} className="text-orange-300" strokeWidth={1.8} />,
  NEUTRAL: <Clock size={14} className="text-slate-300" strokeWidth={1.8} />,
};

const StatsView: React.FC<StatsViewProps> = ({ entries, contextLogs = [], userId, loggedToday = true, onNavigateToLog, onUpdateMood }) => {
  const stats = EMOTIONAL_PALETTE.map(p => ({
    name: p.label,
    count: entries.filter(e => e.category === p.category).length,
    color: p.hex,
  }));

  const [zoomedMoodBuddy, setZoomedMoodBuddy] = React.useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<MoodEntry | null>(null);
  const [prediction, setPrediction] = React.useState<MoodPrediction | null>(null);
  const [predictionLoading, setPredictionLoading] = React.useState(false);
  const [insights, setInsights] = React.useState<InsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = React.useState(false);
  const [insightsError, setInsightsError] = React.useState(false);

  const lastEntry = [...entries].reverse().find(e => e);

  const calculateStreak = () => {
    if (entries.length === 0) return 0;
    const loggedDates = new Set(entries.map(e => e.date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    let streak = 0;
    let checkDate = new Date(today);

    if (loggedDates.has(fmt(checkDate))) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      checkDate.setDate(checkDate.getDate() - 1);
      if (!loggedDates.has(fmt(checkDate))) return 0;
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (loggedDates.has(fmt(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
  };

  const calculateTrend = (): { symbol: string; label: string; color: string } => {
    if (entries.length < 3) return { symbol: '—', label: 'Pocas vibes', color: 'text-white/40' };
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const recent = sorted.slice(-7);
    const previous = sorted.slice(-14, -7);
    const avg = (arr: MoodEntry[]) => arr.reduce((s, e) => s + (e.valence || 3), 0) / (arr.length || 1);
    const recentAvg = avg(recent);
    const previousAvg = previous.length > 0 ? avg(previous) : recentAvg;
    const diff = recentAvg - previousAvg;
    if (diff > 0.3) return { symbol: '↑', label: 'Subiendo', color: 'text-emerald-400' };
    if (diff < -0.3) return { symbol: '↓', label: 'Bajando', color: 'text-red-400' };
    return { symbol: '→', label: 'Estable', color: 'text-blue-400' };
  };

  const calculateAura = (): { label: string; color: string; category: string | null } => {
    if (entries.length === 0) return { label: 'Sin datos', color: '#94A3B8', category: null };
    const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
    const counts: Record<string, number> = {};
    recent.forEach(e => { counts[e.category] = (counts[e.category] || 0) + 1; });
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const palette = EMOTIONAL_PALETTE.find(p => p.category === dominant);
    return {
      label: palette?.label || 'Neutral',
      color: palette?.hex || '#94A3B8',
      category: dominant,
    };
  };

  const trend = calculateTrend();
  const aura = calculateAura();

  const getReportData = (reportStr?: string) => {
    if (!reportStr) return null;
    try {
      return JSON.parse(reportStr);
    } catch {
      return { title: 'Estado Actual', explanation: reportStr };
    }
  };

  const reportData = getReportData(lastEntry?.report);

  const maxCount = Math.max(...stats.map(s => s.count), 1);
  const streak = calculateStreak();

  // Patterns/insights — light fetch on view
  const fetchInsights = React.useCallback(async () => {
    if (!userId) return;
    setInsightsLoading(true);
    setInsightsError(false);
    try {
      const cacheKey = `insights_${userId}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.ts < 1000 * 60 * 30) {
            setInsights(parsed.data);
            setInsightsLoading(false);
            return;
          }
        } catch {}
      }

      const contextRef = collection(db, 'users', userId, 'emotional_context_logs');
      const q = query(contextRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setInsights(null);
        setInsightsLoading(false);
        return;
      }
      const logs = snapshot.docs.map(doc => {
        const d = doc.data();
        return `[${d.date}] ${d.contexto?.join(', ') || 'N/A'}: ${d.userInput}`;
      }).join('\n');
      const result = await getEmotionalInsights(logs);
      setInsights(result);
      sessionStorage.setItem(cacheKey, JSON.stringify({ data: result, ts: Date.now() }));
    } catch {
      setInsightsError(true);
    } finally {
      setInsightsLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const fetchPrediction = React.useCallback(async (force = false) => {
    if (entries.length < 5) return;
    setPredictionLoading(true);
    try {
      const result = await getMoodPrediction(entries, force);
      setPrediction(result);
    } finally {
      setPredictionLoading(false);
    }
  }, [entries]);

  React.useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

  // Build chip colors for cloud contexts (reused from InsightsView)
  const getContextColor = (ctx: string) => {
    const c = ctx.toLowerCase();
    if (c.includes('pareja') || c.includes('amor') || c.includes('relacion') || c.includes('sentimental') || c.includes('novi') || c.includes('cita')) return 'text-pink-400 border-pink-400/35 bg-pink-400/12';
    if (c.includes('trabajo') || c.includes('estudio') || c.includes('nota') || c.includes('académico') || c.includes('clase') || c.includes('examen') || c.includes('proyecto')) return 'text-cyan-400 border-cyan-400/35 bg-cyan-400/12';
    if (c.includes('salud') || c.includes('ejercicio') || c.includes('deporte') || c.includes('físico') || c.includes('gym') || c.includes('entrenamiento') || c.includes('dormir') || c.includes('descanso')) return 'text-emerald-400 border-emerald-400/35 bg-emerald-400/12';
    if (c.includes('amig') || c.includes('social') || c.includes('amistad') || c.includes('fiesta') || c.includes('salir') || c.includes('familia') || c.includes('ocio') || c.includes('diversión')) return 'text-yellow-400 border-yellow-400/35 bg-yellow-400/12';
    if (c.includes('estrés') || c.includes('ansiedad') || c.includes('frustración') || c.includes('incertidumbre') || c.includes('miedo') || c.includes('tristeza') || c.includes('preocupación') || c.includes('mal') || c.includes('cansancio')) return 'text-orange-400 border-orange-400/35 bg-orange-400/12';
    if (c.includes('felicidad') || c.includes('alegría') || c.includes('buen') || c.includes('bien') || c.includes('calma') || c.includes('paz') || c.includes('relax') || c.includes('tranquilidad') || c.includes('sabado') || c.includes('sábado') || c.includes('domingo') || c.includes('fin de semana')) return 'text-blue-400 border-blue-400/35 bg-blue-400/12';
    return 'text-violet-400 border-violet-400/35 bg-violet-400/12';
  };

  const stopWords = ['muy', 'mucho', 'poco', 'hace', 'bueno', 'malo', 'bien', 'mal', 'ayer', 'hoy', 'mañana', 'con', 'sin', 'por', 'para', 'una', 'uno', 'las', 'los', 'que', 'del', 'al', 'ser', 'estar', 'más'];
  const uniqueContexts = insights ? Array.from(new Set(
    (insights.cloudContexts || [])
      .map((ctx: string) => ctx.trim().toLowerCase())
      .filter((ctx: string) => ctx && ctx !== 'n/a' && ctx !== 'otros' && ctx.length > 2 && !stopWords.includes(ctx))
  )).slice(0, 6) : [];

  const topInsights = insights ? insights.insights.slice(0, 3) : [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-y-auto no-scrollbar px-6 pb-40 pt-16">
      <header className="mb-7">
        <p className="app-eyebrow mb-2">Balance</p>
        <h2 className="app-title text-[clamp(1.75rem,5vw,2.25rem)] text-white">Estado</h2>
        <p className="mt-1 app-text-meta">Tu balance emocional reciente</p>
      </header>

      {/* ── Aura registrada (editable) ─────────────────────────── */}
      {loggedToday && lastEntry && onUpdateMood && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="app-surface-raised relative p-5 rounded-3xl mb-5 overflow-hidden"
        >
          <div
            className="absolute inset-x-0 top-0 h-[2px]"
            style={{ backgroundColor: lastEntry.color }}
            aria-hidden="true"
          />
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${lastEntry.color}20`,
                  boxShadow: `0 0 14px ${lastEntry.color}40`,
                }}
                aria-hidden="true"
              >
                <Check size={18} style={{ color: lastEntry.color }} strokeWidth={2.4} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-semibold text-white leading-tight tracking-[-0.015em]">
                  Aura registrada
                </h3>
                <p className="app-text-meta mt-0.5 truncate">
                  {new Date(lastEntry.date + 'T12:00:00').toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                  {' · '}
                  <span style={{ color: lastEntry.color }} className="font-semibold">
                    {EMOTIONAL_PALETTE.find(p => p.category === lastEntry.category)?.label || 'Aura'}
                  </span>
                </p>
              </div>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => { triggerHaptic(); setEditingEntry(lastEntry); }}
              className="app-button app-button-secondary px-3.5 py-2 text-[12px] shrink-0"
              aria-label="Editar aura registrada"
            >
              <Pencil size={13} strokeWidth={1.8} />
              Editar
            </motion.button>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28, ease: [0.16, 1, 0.3, 1] }}
        className="app-group mb-6 flex items-stretch divide-x divide-white/[0.05] overflow-hidden"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-4 px-3">
          <Zap className="text-yellow-400" size={15} strokeWidth={1.8} />
          <span className="text-lg font-semibold text-white tracking-[-0.02em]">{streak}</span>
          <span className="app-text-eyebrow">Racha</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-4 px-3">
          <Calendar className="text-blue-400" size={15} strokeWidth={1.8} />
          <span className="text-lg font-semibold text-white tracking-[-0.02em]">{entries.length}</span>
          <span className="app-text-eyebrow">Capturas</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-4 px-3">
          <TrendingUp className={trend.color} size={15} strokeWidth={1.8} />
          <span className={`text-lg font-semibold tracking-[-0.02em] ${trend.color}`}>{trend.symbol}</span>
          <span className="app-text-eyebrow">{trend.label}</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-4 px-3">
          {aura.category && AURA_ICONS[aura.category] ? AURA_ICONS[aura.category] : <Sparkles size={14} className="text-white/40" strokeWidth={1.6} />}
          <span className="text-[13px] font-semibold tracking-[-0.01em]" style={{ color: aura.color }}>{aura.label}</span>
          <span className="app-text-eyebrow">Aura</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        className="app-surface-raised relative p-6 rounded-3xl transition-all duration-700 mb-5"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="app-list-icon">
              <FileText size={16} className="text-white/65" strokeWidth={1.7} />
            </div>
            <div>
              <h3 className="app-text-eyebrow">Último registro</h3>
              <p className="app-text-meta">Dimensión SAM</p>
            </div>
          </div>
          {lastEntry && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => {
                triggerHaptic();
                const bud = EMOTIONAL_PALETTE.find(p => p.category === lastEntry.category)?.moodBuddy || '/mascot_calm_nobg.png';
                setZoomedMoodBuddy(bud);
              }}
              className="w-14 h-14 relative shrink-0"
              aria-label="Ver MoodBuddy"
            >
              <img
                src={EMOTIONAL_PALETTE.find(p => p.category === lastEntry.category)?.moodBuddy || '/mascot_calm_nobg.png'}
                alt="MoodBuddy"
                className="w-full h-full object-contain relative z-10 rounded-full app-surface"
              />
            </motion.button>
          )}
        </div>

        {reportData ? (
          <div className="space-y-3">
            <h4 className="text-xl font-semibold text-white leading-tight tracking-[-0.02em]">
              {reportData.title}
            </h4>
            <div className="max-h-24 overflow-y-auto pr-2 custom-scrollbar">
              <p className="text-sm leading-relaxed app-text-meta">
                {reportData.explanation}
              </p>
            </div>
          </div>
        ) : (
          <p className="app-text-meta italic">Pendiente de registro.</p>
        )}

        {!loggedToday && (
          <div className="app-card-overlay" aria-hidden={false}>
            <Lock size={18} className="text-white/55" strokeWidth={1.7} />
            <p className="mt-3 text-sm font-medium text-white leading-tight px-2">Aún no has registrado tu vibe de hoy</p>
            <p className="mt-1 app-text-meta text-center leading-snug px-2">Registra tu vibe para ver el informe.</p>
            {onNavigateToLog && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => { triggerHaptic(); onNavigateToLog(); }}
                className="app-button app-button-primary mt-4 px-5 py-2 text-xs"
              >
                Registrar vibe
              </motion.button>
            )}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {editingEntry && onUpdateMood && (
          <motion.div
            key="edit-aura"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm"
            onClick={() => setEditingEntry(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Editar aura"
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full sm:max-w-md bg-[var(--app-bg)] rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[92dvh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="app-icon-button absolute right-3 top-3 z-30"
                aria-label="Cerrar editor de aura"
              >
                <X size={16} strokeWidth={1.8} />
              </button>
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <MoodCanvas
                  userId={userId}
                  alreadyLogged
                  lastEntry={editingEntry}
                  onSave={() => {}}
                  onUpdate={onUpdateMood}
                  onOpenContextChat={() => setEditingEntry(null)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Predicción emocional (mañana) ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="app-surface-raised p-5 rounded-3xl mb-5 relative"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="app-list-icon bg-purple-500/15 text-purple-300">
              <Eye size={14} strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="app-text-eyebrow">Predicción de mañana</h3>
              <p className="app-text-meta">Basado en tu racha reciente</p>
            </div>
          </div>
          {entries.length >= 5 && (
            <motion.button
              whileTap={{ scale: 0.92, rotate: 180 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => { triggerHaptic(); fetchPrediction(true); }}
              disabled={predictionLoading}
              className="app-icon-button h-8 w-8"
              aria-label="Actualizar predicción"
            >
              <RefreshCw size={13} className={`text-white/55 ${predictionLoading ? 'animate-spin' : ''}`} strokeWidth={1.8} />
            </motion.button>
          )}
        </div>

        {entries.length < 5 ? (
          <div className="flex items-center gap-3 py-2 text-white/55">
            <Lock size={14} strokeWidth={1.7} />
            <p className="text-[13px]">Registra 5 días para predecir tu vibe.</p>
          </div>
        ) : predictionLoading && !prediction ? (
          <div className="space-y-3" aria-busy="true" aria-label="Cargando predicción">
            <div className="flex items-center gap-3">
              <div className="app-skeleton w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="app-skeleton h-3 rounded w-1/2" />
                <div className="app-skeleton h-3 rounded w-3/4" />
              </div>
            </div>
          </div>
        ) : prediction ? (
          (() => {
            const predPalette = EMOTIONAL_PALETTE.find(p => p.category === prediction.predictedCategory);
            const predColor = predPalette?.hex || '#94A3B8';
            const predLabel = predPalette?.label || 'Neutral';
            const predMoodBuddy = predPalette?.moodBuddy || '/mascot_calm_nobg.png';
            return (
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 shrink-0 rounded-full overflow-hidden ring-1 ring-white/10"
                  style={{ boxShadow: `0 0 18px ${predColor}40` }}
                >
                  <img src={predMoodBuddy} alt={predLabel} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-semibold tracking-[-0.018em]" style={{ color: predColor }}>{predLabel}</span>
                    <span className="text-[10px] text-white/40 font-medium">{prediction.confidence}%</span>
                  </div>
                  <p className="text-[13px] text-white/65 leading-snug mt-0.5">{prediction.pattern}</p>
                </div>
              </div>
            );
          })()
        ) : null}

        {!loggedToday && entries.length >= 5 && (
          <div className="app-card-overlay" aria-hidden={false}>
            <Lock size={18} className="text-white/55" strokeWidth={1.7} />
            <p className="mt-3 text-sm font-medium text-white leading-tight px-2">Aún no has registrado tu vibe de hoy</p>
            <p className="mt-1 app-text-meta text-center leading-snug px-2">Registra tu vibe para predecir tu tendencia.</p>
            {onNavigateToLog && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => { triggerHaptic(); onNavigateToLog(); }}
                className="app-button app-button-primary mt-4 px-5 py-2 text-xs"
              >
                Registrar vibe
              </motion.button>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Patrones (resumido, integrado) ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="app-surface-raised p-5 rounded-3xl mb-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="app-list-icon bg-violet-500/15 text-violet-300">
              <Brain size={15} strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="app-text-eyebrow">Patrones</h3>
              <p className="app-text-meta">Lo que la IA ve en ti</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.92, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => {
              triggerHaptic();
              sessionStorage.removeItem(`insights_${userId}`);
              fetchInsights();
            }}
            disabled={insightsLoading}
            className="app-icon-button h-8 w-8"
            aria-label="Actualizar patrones"
          >
            <RefreshCw size={13} className={`text-white/55 ${insightsLoading ? 'animate-spin' : ''}`} strokeWidth={1.8} />
          </motion.button>
        </div>

        {insightsLoading && !insights ? (
          <div className="space-y-3" aria-busy="true" aria-label="Cargando patrones">
            <div className="flex items-center gap-3">
              <div className="app-skeleton w-9 h-9 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="app-skeleton h-3 rounded w-3/4" />
                <div className="app-skeleton h-3 rounded w-1/2" />
              </div>
            </div>
          </div>
        ) : insights && insights.summary ? (
          <div className="space-y-4">
            <p className="text-[15px] font-semibold leading-snug tracking-[-0.018em] text-white">
              {insights.summary}
            </p>

            {topInsights.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
                {topInsights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span
                      className="mt-1 inline-block h-1.5 w-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: ins.confidence > 70 ? '#34c759' : ins.confidence > 40 ? '#fb923c' : '#94A3B8',
                        boxShadow: `0 0 8px ${ins.confidence > 70 ? '#34c759' : ins.confidence > 40 ? '#fb923c' : '#94A3B8'}55`,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-white tracking-[-0.01em] leading-snug">
                        {ins.title}
                      </p>
                      <p className="text-[11px] text-white/55 leading-relaxed mt-0.5">
                        {ins.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {uniqueContexts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.06]">
                {uniqueContexts.map((ctx, i) => (
                  <span
                    key={i}
                    className={`px-2.5 py-1 border rounded-full text-[10px] font-semibold uppercase tracking-wider ${getContextColor(ctx)}`}
                  >
                    {ctx}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : insightsError ? (
          <p className="text-[12px] text-white/55 italic">No pudimos cargar tus patrones ahora.</p>
        ) : (
          <div className="flex items-center gap-3 py-1 text-white/55">
            <Cloud size={14} className="opacity-60" strokeWidth={1.7} />
            <p className="text-sm">Comparte contexto emocional en el chat para ver patrones aquí.</p>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="app-surface-raised p-6 rounded-3xl mb-10 w-full"
      >
        <h3 className="app-text-eyebrow mb-6 flex items-center gap-2">
          <TrendingUp size={12} strokeWidth={1.8} /> Frecuencia emocional
        </h3>
        <div className="w-full mt-4">
          <div className="flex items-end justify-between h-[180px] gap-2 sm:gap-3 w-full">
            {stats.map((stat, i) => {
              const heightPercent = stat.count > 0 ? Math.max((stat.count / maxCount) * 100, 6) : 0;
              return (
                <div key={i} className="flex flex-col items-center flex-1 h-full justify-end">
                  <div className="w-full flex flex-col justify-end items-center h-full relative">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.25 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                      className="w-full max-w-[36px] rounded-md"
                      style={{
                        backgroundColor: stat.color,
                        opacity: stat.count === 0 ? 0.15 : 1,
                        minHeight: stat.count > 0 ? '12px' : '4px',
                        boxShadow: stat.count > 0 ? `0 0 18px ${stat.color}55` : 'none',
                      }}
                    />
                  </div>
                  <div className="mt-3 h-5 flex items-center justify-center">
                    <span className="text-[10px] sm:text-[11px] font-medium text-white/55 uppercase tracking-wider text-center">
                      <span className="hidden sm:inline">{stat.name}</span>
                      <span className="sm:hidden">{stat.name.substring(0, 3)}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {zoomedMoodBuddy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="app-overlay z-[1000]"
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
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28, ease: [0.16, 1, 0.3, 1] }}
              className="app-sheet max-w-md p-8 flex items-center justify-center"
            >
              <div className="app-sheet-handle" />
              <button
                type="button"
                className="app-icon-button absolute right-4 top-4"
                onClick={() => setZoomedMoodBuddy(null)}
                aria-label="Cerrar vista ampliada"
              >
                <X size={20} />
              </button>
              <motion.img
                src={zoomedMoodBuddy}
                alt="MoodBuddy"
                className="max-h-[60dvh] w-full object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatsView;