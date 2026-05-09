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
    if (c.includes('pareja') || c.includes('amor') || c.includes('relaciones') || c.includes('sentimental')) return 'text-pink-400 border-pink-400 bg-pink-400/20';
    if (c.includes('trabajo') || c.includes('estudio') || c.includes('notas') || c.includes('académico')) return 'text-cyan-400 border-cyan-400 bg-cyan-400/20';
    if (c.includes('salud') || c.includes('ejercicio') || c.includes('deporte') || c.includes('físico')) return 'text-green-400 border-green-400 bg-green-400/20';
    if (c.includes('amigos') || c.includes('social') || c.includes('amistad')) return 'text-yellow-400 border-yellow-400 bg-yellow-400/20';
    if (c.includes('estrés') || c.includes('ansiedad') || c.includes('frustración') || c.includes('incertidumbre')) return 'text-orange-400 border-orange-400 bg-orange-400/20';
    return 'text-purple-400 border-purple-400 bg-purple-400/20';
  };

  const highlightText = (text: string) => {
    const categories = [
      { words: ['pareja', 'amor', 'relaciones', 'sentimental'], color: 'text-pink-400' },
      { words: ['estudio', 'trabajo', 'notas', 'académico'], color: 'text-cyan-400' },
      { words: ['ejercicio', 'salud', 'deporte', 'físico'], color: 'text-green-400' },
      { words: ['amigos', 'social', 'amistad'], color: 'text-yellow-400' },
      { words: ['estrés', 'ansiedad', 'frustración', 'incertidumbre'], color: 'text-orange-400' }
    ];
    
    let highlighted = text;
    categories.forEach(cat => {
      cat.words.forEach(word => {
        const regex = new RegExp(`\\b(${word})\\b`, 'gi');
        highlighted = highlighted.replace(regex, `<span class="${cat.color} font-black drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">$1</span>`);
      });
    });
    return highlighted;
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto no-scrollbar pb-32">
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
          {data.cloudContexts
            .filter(ctx => ctx.toUpperCase() !== 'N/A' && ctx.toUpperCase() !== 'OTROS')
            .map((ctx, i) => {
              const colorClass = getContextColor(ctx);
              return (
                <span key={i} className={`px-4 py-2 border rounded-2xl text-[10px] font-black uppercase tracking-wider capitalize hover:scale-105 transition-all duration-300 ${colorClass}`}>
                  {ctx}
                </span>
              );
            })}
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
