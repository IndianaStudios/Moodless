import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, TrendingUp, Cloud, Loader2, Info } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { getEmotionalInsights } from '../services/geminiService';

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

const InsightsView: React.FC<{ userId: string }> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InsightsData | null>(null);

  useEffect(() => {
    const fetchAndAnalyze = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        // Pequeño retardo para asegurar que la conexión con Firebase esté estable
        await new Promise(r => setTimeout(r, 500));

        // 1. Obtener todos los logs de contexto
        const contextRef = collection(db, 'users', userId, 'emotional_context_logs');
        const q = query(contextRef, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        
        console.log(`[Insights] Logs encontrados: ${snapshot.size}`);

        if (snapshot.empty) {
          setLoading(false);
          return;
        }

        const logs = snapshot.docs.map(doc => {
          const d = doc.data();
          return `[${d.date}] Contexto: ${d.contexto?.join(', ') || 'N/A'} | Emoción: ${d.emocion} | User: ${d.userInput}`;
        }).join('\n');

        // 2. Analizar con IA
        const result = await getEmotionalInsights(logs);
        setData(result);
      } catch (error) {
        console.error("Error generating insights:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndAnalyze();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <div className="relative">
          <Brain className="text-purple-500 animate-pulse" size={48} />
          <Sparkles className="absolute -top-2 -right-2 text-yellow-400 animate-bounce" size={20} />
        </div>
        <div className="text-center">
          <h3 className="text-white font-black uppercase tracking-widest text-sm">Analizando tu mente...</h3>
          <p className="text-slate-500 text-[10px] mt-2 max-w-[200px]">Buscando patrones entre tus emociones y actividades de los últimos días.</p>
        </div>
      </div>
    );
  }

  if (!data || data.insights.length === 0) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center">
          <Cloud className="text-slate-600" size={32} />
        </div>
        <p className="text-slate-400 text-sm">Aún no hay suficientes datos para generar patrones. ¡Sigue usando el chat de contexto!</p>
      </div>
    );
  }

  const getContextColor = (ctx: string) => {
    const c = ctx.toLowerCase();
    if (c.includes('pareja') || c.includes('amor') || c.includes('relacion') || c.includes('sentimental') || c.includes('novi') || c.includes('cita')) return 'text-pink-400 border-pink-400 bg-pink-400/20';
    if (c.includes('trabajo') || c.includes('estudio') || c.includes('nota') || c.includes('académico') || c.includes('clase') || c.includes('examen') || c.includes('proyecto')) return 'text-cyan-400 border-cyan-400 bg-cyan-400/20';
    if (c.includes('salud') || c.includes('ejercicio') || c.includes('deporte') || c.includes('físico') || c.includes('gym') || c.includes('entrenamiento') || c.includes('dormir') || c.includes('descanso')) return 'text-green-400 border-green-400 bg-green-400/20';
    if (c.includes('amig') || c.includes('social') || c.includes('amistad') || c.includes('fiesta') || c.includes('salir') || c.includes('familia') || c.includes('ocio') || c.includes('diversión')) return 'text-yellow-400 border-yellow-400 bg-yellow-400/20';
    if (c.includes('estrés') || c.includes('ansiedad') || c.includes('frustración') || c.includes('incertidumbre') || c.includes('miedo') || c.includes('tristeza') || c.includes('preocupación') || c.includes('mal') || c.includes('cansancio')) return 'text-orange-400 border-orange-400 bg-orange-400/20';
    if (c.includes('felicidad') || c.includes('alegría') || c.includes('buen') || c.includes('bien') || c.includes('calma') || c.includes('paz') || c.includes('relax') || c.includes('tranquilidad') || c.includes('sabado') || c.includes('sábado') || c.includes('domingo') || c.includes('fin de semana')) return 'text-blue-400 border-blue-400 bg-blue-400/20';
    return null;
  };

  const stopWords = ['muy', 'mucho', 'poco', 'hace', 'bueno', 'malo', 'bien', 'mal', 'ayer', 'hoy', 'mañana', 'con', 'sin', 'por', 'para', 'una', 'uno', 'las', 'los', 'que', 'del', 'al', 'ser', 'estar', 'más'];
  const uniqueContexts = Array.from(new Set<string>(
    (data?.cloudContexts || [])
      .map((ctx: string) => ctx.trim().toLowerCase())
      .filter((ctx: string) => ctx && ctx !== 'n/a' && ctx !== 'otros' && ctx.length > 2 && !stopWords.includes(ctx))
  ));

  const usedColors = new Set<string>();
  const fallbackColors = [
    'text-purple-400 border-purple-400 bg-purple-400/20',
    'text-rose-400 border-rose-400 bg-rose-400/20',
    'text-teal-400 border-teal-400 bg-teal-400/20',
    'text-indigo-400 border-indigo-400 bg-indigo-400/20',
    'text-fuchsia-400 border-fuchsia-400 bg-fuchsia-400/20',
    'text-emerald-400 border-emerald-400 bg-emerald-400/20',
    'text-amber-400 border-amber-400 bg-amber-400/20',
    'text-lime-400 border-lime-400 bg-lime-400/20',
    'text-violet-400 border-violet-400 bg-violet-400/20'
  ];

  const getUniqueColor = (ctx: string) => {
    const pref = getContextColor(ctx);
    if (pref && !usedColors.has(pref)) {
      usedColors.add(pref);
      return pref;
    }
    const fallback = fallbackColors.find(c => !usedColors.has(c)) || fallbackColors[Math.floor(Math.random() * fallbackColors.length)];
    usedColors.add(fallback);
    return fallback;
  };

  const coloredContexts = uniqueContexts.map(ctx => ({
    word: ctx,
    colorClass: getUniqueColor(ctx)
  }));

  const highlightText = (text: string) => {
    let highlighted = text;
    // Solo colorea palabras que existan en los contextos únicos de esta sesión
    coloredContexts.forEach(cat => {
      // Expresión regular dinámica basada en las palabras extraídas por la IA
      const regex = new RegExp(`(?<=^|[^a-zA-ZáéíóúÁÉÍÓÚñÑ])(${cat.word}[a-zA-ZáéíóúÁÉÍÓÚñÑ]*)(?=[^a-zA-ZáéíóúÁÉÍÓÚñÑ]|$)`, 'gi');
      highlighted = highlighted.replace(regex, (match, p1, offset, string) => {
        const textBefore = string.substring(0, offset);
        if (textBefore.lastIndexOf('<span') > textBefore.lastIndexOf('</span>')) {
          return match;
        }
        const textColorClass = cat.colorClass.split(' ').find(c => c.startsWith('text-')) || cat.colorClass;
        return `<span class="${textColorClass} font-black drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">${match}</span>`;
      });
    });
    return highlighted;
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto no-scrollbar pb-32 max-w-3xl mx-auto w-full">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="text-purple-400" size={16} />
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Patrones Detectados</h2>
        </div>
        <h1 className="text-2xl font-black text-white leading-tight">
          Tus Patrones <br />
          <span className="text-purple-500">Emocionales</span>
        </h1>
      </header>

      {/* Resumen General */}
      <div className="mt-4 p-8 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-[2.5rem] border border-white/10 relative overflow-hidden group mb-10 shadow-2xl">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Resumen de Patrones</span>
          </div>
          <p 
            className="text-2xl font-black text-white leading-tight italic"
            dangerouslySetInnerHTML={{ __html: `"${highlightText(data.summary)}"` }}
          />
        </div>
        <Brain className="absolute -bottom-6 -right-6 text-white/5 group-hover:scale-110 transition-transform duration-700" size={140} />
      </div>

      {/* Insights Cards */}
      <div className="space-y-4 mb-8">
        {data.insights.map((insight, i) => (
          <div key={i} className="bg-slate-900 border border-white/10 rounded-3xl p-5 hover:border-purple-500/50 transition-all group">
            <div className="flex items-start justify-between mb-2">
              <div className="p-2 bg-purple-500/20 rounded-xl group-hover:bg-purple-500/30 transition-colors">
                <TrendingUp size={18} className="text-purple-400" />
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[8px] font-black text-slate-400 uppercase">{insight.confidence}% Confianza</span>
              </div>
            </div>
            <h3 className="text-white font-bold mb-1">{insight.title}</h3>
            <p className="text-slate-400 text-xs leading-relaxed">{insight.description}</p>
          </div>
        ))}
      </div>

      {/* Cloud Contexts */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="text-blue-400" size={16} />
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lo que más te influye</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {(() => {
            if (uniqueContexts.length === 0) {
              return <p className="text-slate-500 text-xs italic">Aún no hay temas definidos.</p>;
            }

            return coloredContexts.map((cat, i) => (
              <span key={i} className={`px-4 py-2 border rounded-2xl text-[10px] font-black uppercase tracking-wider hover:scale-105 transition-all duration-300 ${cat.colorClass}`}>
                {cat.word}
              </span>
            ));
          })()}
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-3 italic">
        <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-blue-300 leading-relaxed">
          Estos análisis son experimentales y generados por IA basándose en tus registros. Úsalos como guía para tu autoconocimiento.
        </p>
      </div>
    </div>
  );
};

export default InsightsView;
