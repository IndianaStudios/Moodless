import React from 'react';
import { MoodEntry } from '../types';
import { EMOTIONAL_PALETTE, MOOD_ICONS } from '../constants';
import { getMoodPrediction, MoodPrediction } from '../services/geminiService';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calendar, Zap, FileText, TrendingUp, Sparkles, X, RefreshCw, Lock, Eye } from 'lucide-react';

interface StatsViewProps {
  entries: MoodEntry[];
  contextLogs?: any[];
}

const StatsView: React.FC<StatsViewProps> = ({ entries, contextLogs = [] }) => {
  const stats = EMOTIONAL_PALETTE.map(p => ({
    name: p.label,
    count: entries.filter(e => e.category === p.category).length,
    color: p.hex
  }));

  const [zoomedMoodBuddy, setZoomedMoodBuddy] = React.useState<string | null>(null);
  const [prediction, setPrediction] = React.useState<MoodPrediction | null>(null);
  const [predictionLoading, setPredictionLoading] = React.useState(false);
  const [predictionError, setPredictionError] = React.useState(false);

  const fetchPrediction = React.useCallback(async (force = false) => {
    if (entries.length < 5) return;
    setPredictionLoading(true);
    setPredictionError(false);
    try {
      const result = await getMoodPrediction(entries, force);
      setPrediction(result);
      if (!result) setPredictionError(true);
    } catch {
      setPredictionError(true);
    } finally {
      setPredictionLoading(false);
    }
  }, [entries]);

  React.useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

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
    if (entries.length < 3) return { symbol: '—', label: 'Pocas vibes', color: 'text-slate-500' };
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const recent = sorted.slice(-7);
    const previous = sorted.slice(-14, -7);
    const avg = (arr: MoodEntry[]) => arr.reduce((s, e) => s + (e.valence || 3), 0) / (arr.length || 1);
    const recentAvg = avg(recent);
    const previousAvg = previous.length > 0 ? avg(previous) : recentAvg;
    const diff = recentAvg - previousAvg;
    if (diff > 0.3) return { symbol: '↑', label: 'Subiendo', color: 'text-green-400' };
    if (diff < -0.3) return { symbol: '↓', label: 'Bajando', color: 'text-red-400' };
    return { symbol: '→', label: 'Estable', color: 'text-blue-400' };
  };

  const calculateAura = (): { emoji: string; label: string; color: string } => {
    if (entries.length === 0) return { emoji: '🌫️', label: 'Sin datos', color: '#94A3B8' };
    const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
    const counts: Record<string, number> = {};
    recent.forEach(e => { counts[e.category] = (counts[e.category] || 0) + 1; });
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const palette = EMOTIONAL_PALETTE.find(p => p.category === dominant);
    const emojiMap: Record<string, string> = {
      JOY: '☀️', CALM: '🍃', ANGER: '🔥', SADNESS: '🌧️',
      ANXIETY: '👻', ENERGY: '⚡', NEUTRAL: '☁️'
    };
    return {
      emoji: emojiMap[dominant] || '🌫️',
      label: palette?.label || 'Neutral',
      color: palette?.hex || '#94A3B8'
    };
  };

  const trend = calculateTrend();
  const aura = calculateAura();

  const getReportData = (reportStr?: string) => {
    if (!reportStr) return null;
    try {
      return JSON.parse(reportStr);
    } catch {
      return { title: "Estado Actual", explanation: reportStr };
    }
  };

  const reportData = getReportData(lastEntry?.report);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(300);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
    };
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    updateWidth();
    return () => observer.disconnect();
  }, []);

  return (
    <div className="px-6 pt-24 pb-40 w-full flex-1 flex flex-col overflow-y-auto no-scrollbar">
      <header className="mb-6">
        <h2 className="text-3xl font-black">Estado</h2>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Balance emocional vivo</p>
      </header>

      {/* Main Status Report Card */}
      <div
        className="relative glass p-6 rounded-[2.5rem] border-white/10 shadow-2xl transition-all duration-700 mb-6"
        style={lastEntry ? { borderLeft: `8px solid ${lastEntry.color}` } : {}}
      >
        {lastEntry && (
          <div
            className="absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-10 pointer-events-none"
            style={{ backgroundColor: lastEntry.color }}
          />
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/5">
              <FileText size={18} className="text-slate-400" />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Aura Global</h3>
              <p className="text-xs font-bold text-slate-400">Dimensión SAM</p>
            </div>
          </div>
          {lastEntry && (
            <button
              onClick={() => {
                const bud = EMOTIONAL_PALETTE.find(p => p.category === lastEntry.category)?.moodBuddy || '/mascot_calm_nobg.png';
                setZoomedMoodBuddy(bud);
              }}
              className="w-16 h-16 relative shrink-0 active:scale-95 transition-transform group"
            >
              <div
                className="absolute inset-0 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity"
                style={{ backgroundColor: lastEntry.color }}
              />
              <img
                src={EMOTIONAL_PALETTE.find(p => p.category === lastEntry.category)?.moodBuddy || '/mascot_calm_nobg.png'}
                alt="MoodBuddy"
                className="w-full h-full object-contain relative z-10 rounded-full border-2 border-white/10"
              />
            </button>
          )}
        </div>

        {reportData ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="space-y-2">
              <h4 className="text-2xl font-black text-white leading-tight">
                {reportData.title}
              </h4>
              <div className="max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                <p className="text-sm leading-relaxed text-slate-400 font-medium">
                  {reportData.explanation}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-widest pt-4 border-t border-white/5">
              <Sparkles size={10} className="text-purple-500" />
              Mood Engine Sincronizado
            </div>
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-slate-500 text-sm italic">Pendiente de registro.</p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass p-5 rounded-[2rem] flex flex-col items-center border-white/5">
          <Zap className="text-yellow-400 mb-1" size={18} />
          <span className="text-2xl font-black">{calculateStreak()}</span>
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Racha Días</span>
        </div>
        <div className="glass p-5 rounded-[2rem] flex flex-col items-center border-white/5">
          <Calendar className="text-blue-400 mb-1" size={18} />
          <span className="text-2xl font-black">{entries.length}</span>
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Capturas</span>
        </div>
        <div className="glass p-5 rounded-[2rem] flex flex-col items-center border-white/5">
          <TrendingUp className={`${trend.color} mb-1`} size={18} />
          <span className={`text-2xl font-black ${trend.color}`}>{trend.symbol}</span>
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{trend.label}</span>
        </div>
        <div className="glass p-5 rounded-[2rem] flex flex-col items-center border-white/5">
          <span className="text-lg mb-1">{aura.emoji}</span>
          <span className="text-lg font-black" style={{ color: aura.color }}>{aura.label}</span>
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Tu Aura</span>
        </div>
      </div>

      {/* Prediction Card */}
      <div className="glass rounded-[2.5rem] border-white/5 overflow-hidden mb-6 relative" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(45,212,191,0.08))' }}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Eye size={12} className="text-purple-400" /> Predicción Mañana
            </h3>
            {entries.length >= 5 && (
              <button onClick={() => fetchPrediction(true)} disabled={predictionLoading} className="p-2 rounded-xl bg-white/5">
                <RefreshCw size={12} className={`text-slate-400 ${predictionLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {entries.length < 5 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Lock size={20} className="text-slate-600" />
              </div>
              <p className="text-sm font-bold text-slate-400">Predicción bloqueada</p>
              <p className="text-xs text-slate-600">Registra 5 días para desbloquear</p>
            </div>
          ) : predictionLoading && !prediction ? (
            <div className="space-y-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/5" />
                <div className="h-5 bg-white/5 rounded-xl w-3/4" />
              </div>
            </div>
          ) : prediction ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
              {(() => {
                const predPalette = EMOTIONAL_PALETTE.find(p => p.category === prediction.predictedCategory);
                const predColor = predPalette?.hex || '#94A3B8';
                const predLabel = predPalette?.label || 'Neutral';
                const predMoodBuddy = predPalette?.moodBuddy || '/mascot_calm_nobg.png';

                return (
                  <div className="flex items-center gap-5 mb-5">
                    <div className="relative w-[72px] h-[72px] shrink-0">
                      <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/10 animate-spin" style={{ animationDuration: '10s' }} />
                      <div className="absolute inset-[6px] rounded-full overflow-hidden bg-white/5">
                        <img src={predMoodBuddy} alt={predLabel} className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xl font-black" style={{ color: predColor }}>{predLabel}</span>
                        <span className="text-[11px] font-bold text-slate-500">{prediction.confidence}% confianza</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{prediction.pattern}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : null}
        </div>
      </div>

      {/* Charts */}
      <div ref={containerRef} className="glass p-6 rounded-[2.5rem] border-white/5 overflow-hidden mb-10">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
          <TrendingUp size={12} /> Frecuencia Emocional
        </h3>
        <div className="w-full h-[240px]">
          <BarChart width={containerWidth} height={240} data={stats} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
            <XAxis dataKey="name" axisLine={false} tick={false} />
            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {stats.map((entry, index) => <Cell key={index} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {zoomedMoodBuddy && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md" onClick={() => setZoomedMoodBuddy(null)}>
          <button className="absolute top-10 right-10 text-white/50 hover:text-white"><X size={32} /></button>
          <img src={zoomedMoodBuddy} alt="MoodBuddy" className="max-w-full max-h-full object-contain animate-in zoom-in-95" />
        </div>
      )}
    </div>
  );
};

export default StatsView;
