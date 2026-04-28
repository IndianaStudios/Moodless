
import React from 'react';
import { MoodEntry } from '../types';
import { EMOTIONAL_PALETTE, MOOD_ICONS } from '../constants';
import { getMoodPrediction, MoodPrediction } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
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

  const [zoomedMascot, setZoomedMascot] = React.useState<string | null>(null);
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
  const Icon = lastEntry ? MOOD_ICONS.find(i => i.name === lastEntry.iconName)?.Icon : null;

  const calculateStreak = () => {
    if (entries.length === 0) return 0;

    const loggedDates = new Set(entries.map(e => e.date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Formatear fecha como YYYY-MM-DD
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    let streak = 0;
    let checkDate = new Date(today);

    // Si hoy ya registraste, empieza a contar desde hoy
    // Si no, empieza desde ayer (como Duolingo: no pierdes la racha hasta que acabe el día)
    if (loggedDates.has(fmt(checkDate))) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Aún no has registrado hoy, comprobar si ayer registraste
      checkDate.setDate(checkDate.getDate() - 1);
      if (!loggedDates.has(fmt(checkDate))) {
        return 0; // Ni hoy ni ayer → racha rota
      }
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Contar hacia atrás mientras haya días consecutivos
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

    // Últimos 7 registros
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

  const getContextCorrelations = () => {
    if (contextLogs.length === 0) return [];
    
    const contextMap: Record<string, { totalEnergy: number, count: number, moods: string[] }> = {};
    
    contextLogs.forEach(log => {
      const energyValue = log.energia === 'alta' ? 10 : log.energia === 'media' ? 5 : 2;
      const ctxs = Array.isArray(log.contexto) ? log.contexto : [log.contexto];
      ctxs.forEach((ctx: string) => {
        if (!ctx) return;
        if (!contextMap[ctx]) {
          contextMap[ctx] = { totalEnergy: 0, count: 0, moods: [] };
        }
        contextMap[ctx].totalEnergy += energyValue;
        contextMap[ctx].count += 1;
        contextMap[ctx].moods.push(log.emocion);
      });
    });
    
    return Object.entries(contextMap).map(([name, data]) => ({
      name,
      avgEnergy: data.totalEnergy / data.count,
      count: data.count,
      topMood: data.moods.sort((a,b) => 
        data.moods.filter(v => v===a).length - data.moods.filter(v => v===b).length
      ).pop()
    })).sort((a,b) => b.count - a.count).slice(0, 5);
  };

  const trend = calculateTrend();
  const aura = calculateAura();
  const correlations = getContextCorrelations();

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
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    updateWidth();

    return () => observer.disconnect();
  }, []);

  return (
    <div className="px-6 pt-24 pb-40 w-full flex-1 flex flex-col">
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
              onClick={() => setZoomedMascot(EMOTIONAL_PALETTE.find(p => p.category === lastEntry.category)?.mascot || '/mascot_calm.png')}
              className="w-16 h-16 relative shrink-0 active:scale-95 transition-transform group"
            >
              <div
                className="absolute inset-0 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity"
                style={{ backgroundColor: lastEntry.color }}
              />
              <img
                src={EMOTIONAL_PALETTE.find(p => p.category === lastEntry.category)?.mascot || '/mascot_calm.png'}
                alt="Aura"
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
              Vibe Engine Sincronizado
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
        {/* Tendencia */}
        <div className="glass p-5 rounded-[2rem] flex flex-col items-center border-white/5">
          <TrendingUp className={`${trend.color} mb-1`} size={18} />
          <span className={`text-2xl font-black ${trend.color}`}>{trend.symbol}</span>
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{trend.label}</span>
        </div>
        {/* Aura */}
        <div className="glass p-5 rounded-[2rem] flex flex-col items-center border-white/5">
          <span className="text-lg mb-1">{aura.emoji}</span>
          <span className="text-lg font-black" style={{ color: aura.color }}>{aura.label}</span>
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Tu Aura</span>
        </div>
      </div>

      {/* Prediction Card */}
      <div className="glass rounded-[2.5rem] border-white/5 overflow-hidden mb-6 relative" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(45,212,191,0.08))' }}>
        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-[2.5rem] pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(45,212,191,0.15))', mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude', WebkitMaskComposite: 'xor', padding: '1px' }} />

        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Eye size={12} className="text-purple-400" /> Predicción Mañana
            </h3>
            {entries.length >= 5 && (
              <button
                onClick={() => fetchPrediction(true)}
                disabled={predictionLoading}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-90 disabled:opacity-30"
              >
                <RefreshCw size={12} className={`text-slate-400 ${predictionLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {entries.length < 5 ? (
            /* Locked state */
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Lock size={20} className="text-slate-600" />
              </div>
              <p className="text-sm font-bold text-slate-400 mb-1">Predicción bloqueada</p>
              <p className="text-xs text-slate-600 max-w-[240px]">Registra al menos <span className="text-purple-400 font-bold">5 días</span> para desbloquear predicciones con IA</p>
              <div className="flex gap-1 mt-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${i < entries.length ? 'bg-purple-400 scale-110' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>
          ) : predictionLoading && !prediction ? (
            /* Skeleton loading */
            <div className="space-y-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-white/5 rounded-xl w-3/4" />
                  <div className="h-3 bg-white/5 rounded-xl w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-white/5 rounded-xl w-full" />
              <div className="h-3 bg-white/5 rounded-xl w-5/6" />
              <div className="space-y-2 pt-2">
                {[1,2,3].map(i => <div key={i} className="h-2.5 bg-white/5 rounded-xl" />)}
              </div>
            </div>
          ) : predictionError ? (
            <div className="py-6 text-center">
              <p className="text-slate-500 text-sm">No se pudo generar la predicción</p>
              <button onClick={() => fetchPrediction(true)} className="text-purple-400 text-xs font-bold mt-2 hover:underline">Reintentar</button>
            </div>
          ) : prediction ? (
            /* Prediction content */
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
              {(() => {
                const predPalette = EMOTIONAL_PALETTE.find(p => p.category === prediction.predictedCategory);
                const predColor = predPalette?.hex || '#94A3B8';
                const predLabel = predPalette?.label || 'Neutral';
                const predMascot = predPalette?.mascot || '/mascot_calm.png';
                const circumference = 2 * Math.PI * 28;
                const strokeDash = (prediction.confidence / 100) * circumference;

                return (
                  <>
                    <div className="flex items-center gap-5 mb-5">
                      {/* Radial confidence ring + mascot */}
                      <div className="relative w-[72px] h-[72px] shrink-0">
                        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
                          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                          <circle cx="32" cy="32" r="28" fill="none" stroke={predColor} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${strokeDash} ${circumference}`} className="transition-all duration-1000" />
                        </svg>
                        <div className="absolute inset-[6px] rounded-full overflow-hidden bg-white/5">
                          <img src={predMascot} alt={predLabel} className="w-full h-full object-cover" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xl font-black" style={{ color: predColor }}>{predLabel}</span>
                          <span className="text-[11px] font-bold text-slate-500">{prediction.confidence}% confianza</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{prediction.pattern}</p>
                      </div>
                    </div>

                    {/* Probability bars */}
                    {prediction.probabilities && (
                      <div className="space-y-1.5 mb-5">
                        {EMOTIONAL_PALETTE.map(p => {
                          const prob = prediction.probabilities[p.category] || 0;
                          if (prob === 0) return null;
                          return (
                            <div key={p.category} className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-slate-500 w-16 text-right uppercase tracking-wider">{p.label}</span>
                              <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-1000"
                                  style={{ width: `${prob}%`, backgroundColor: p.hex, opacity: 0.8 }}
                                />
                              </div>
                              <span className="text-[9px] font-bold text-slate-600 w-8">{prob}%</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Tip */}
                    {prediction.tip && (
                      <div className="flex items-start gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                        <Sparkles size={12} className="text-purple-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-slate-400 leading-relaxed">{prediction.tip}</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : null}
        </div>
      </div>

      {/* Trends Chart */}
      <div className="glass p-6 rounded-[2.5rem] border-white/5 overflow-hidden mb-10">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
          <TrendingUp size={12} /> Frecuencia Emocional
        </h3>

        <div ref={containerRef} className="w-full h-[240px]">
          {entries.length > 0 ? (
            <BarChart
              width={containerWidth}
              height={240}
              data={stats}
              margin={{ top: 25, right: 30, left: 30, bottom: 5 }}
              barCategoryGap="15%"
            >
              <XAxis dataKey="name" axisLine={false} tick={false} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                  padding: '8px 12px'
                }}
                itemStyle={{ color: '#fff', fontWeight: 'bold', padding: 0 }}
                labelStyle={{ color: '#94a3b8', fontWeight: 'black', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}
              />
              <Bar
                dataKey="count"
                name="Registros"
                radius={[6, 6, 0, 0]}
                minPointSize={4}
              >
                {stats.map((entry, index) => (
                  <Cell key={`c-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <div className="flex items-center justify-center h-full w-full text-slate-700 text-[10px] uppercase font-black tracking-widest">Esperando datos...</div>
          )}
        </div>
      </div>

      {/* Context Correlations */}
      <div className="glass p-6 rounded-[2.5rem] border-white/5 overflow-hidden mb-10">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
          <Sparkles size={12} className="text-purple-400" /> Correlaciones de Contexto
        </h3>
        
        {correlations.length > 0 ? (
          <div className="space-y-4 animate-in fade-in duration-500">
            {correlations.map((cor, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex flex-col">
                  <span className="text-sm font-black capitalize">{cor.name}</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Frecuencia: {cor.count} veces</span>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs font-bold text-slate-300">{cor.topMood}</span>
                    <div className={`w-2 h-2 rounded-full ${cor.avgEnergy > 7 ? 'bg-yellow-400' : cor.avgEnergy > 4 ? 'bg-blue-400' : 'bg-purple-400'}`} />
                  </div>
                  <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                    Energía {cor.avgEnergy > 7 ? 'Alta' : cor.avgEnergy > 4 ? 'Media' : 'Baja'}
                  </span>
                </div>
              </div>
            ))}
            <p className="mt-6 text-[10px] text-slate-600 italic text-center">
              "Tu energía tiende a ser {correlations[0].avgEnergy > 7 ? 'alta' : 'más baja'} cuando el contexto es {correlations[0].name}."
            </p>
          </div>
        ) : (
          <div className="py-8 text-center animate-in fade-in duration-500">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="text-slate-700" size={20} />
            </div>
            <p className="text-sm font-bold text-slate-500 mb-1">Faltan datos de contexto</p>
            <p className="text-xs text-slate-600 max-w-[200px] mx-auto">
              Sigue contándome más sobre tu día en el chat para que pueda detectar patrones.
            </p>
          </div>
        )}

        {/* Lista de registros recientes de contexto */}
        {contextLogs.length > 0 && (
          <div className="mt-8 pt-6 border-t border-white/5">
            <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-4">Últimos registros analizados</h4>
            <div className="space-y-3">
              {contextLogs.slice(0, 3).map((log, i) => (
                <div key={i} className="flex flex-col gap-1 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                  <p className="text-[11px] text-slate-400 italic">"{log.userInput}"</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {log.contexto?.map((c: string) => (
                      <span key={c} className="text-[8px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full font-bold uppercase">{c}</span>
                    ))}
                    <span className="text-[8px] bg-white/5 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase">{log.emocion}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Zoom Modal */}
      {zoomedMascot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setZoomedMascot(null)}
        >
          <button className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors">
            <X size={32} />
          </button>
          <div className="relative max-w-sm w-full aspect-square animate-in zoom-in-95 duration-300">
            <div
              className="absolute inset-0 rounded-full blur-[100px] opacity-20"
              style={{ backgroundColor: EMOTIONAL_PALETTE.find(p => p.mascot === zoomedMascot)?.hex || '#fff' }}
            />
            <img
              src={zoomedMascot}
              alt="Zoomed Mascot"
              className="w-full h-full object-contain relative z-10 rounded-3xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsView;
