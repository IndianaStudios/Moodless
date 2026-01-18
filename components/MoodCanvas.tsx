
import React, { useState, useEffect } from 'react';
import { EMOTIONAL_PALETTE } from '../constants';
import { MoodCategory, MoodEntry } from '../types';
import { Check, Edit2, Send, Smile, Zap, Maximize2 } from 'lucide-react';

interface MoodCanvasProps {
  onSave: (entry: Omit<MoodEntry, 'id' | 'date'>) => void;
  alreadyLogged: boolean;
}

const SAMManikin = ({ type, value, active }: { type: 'valence' | 'arousal' | 'dominance', value: number, active: boolean }) => {
  const size = 32;
  const opacity = active ? 1 : 0.3;
  const scale = active ? 1.2 : 0.8;

  if (type === 'valence') {
    // 1 (Triste) a 5 (Feliz)
    const mouthPath = value === 1 ? "M 8 22 Q 16 15 24 22" : 
                      value === 2 ? "M 10 20 L 22 20" :
                      value === 3 ? "M 10 20 Q 16 20 22 20" :
                      value === 4 ? "M 10 18 Q 16 22 22 18" :
                      "M 8 18 Q 16 26 24 18";
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" style={{ opacity, transform: `scale(${scale})`, transition: 'all 0.3s' }}>
        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="11" cy="12" r="1.5" fill="currentColor" />
        <circle cx="21" cy="12" r="1.5" fill="currentColor" />
        <path d={mouthPath} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'arousal') {
    // 1 (Calma) a 5 (Energía)
    const energySize = value * 3;
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" style={{ opacity, transform: `scale(${scale})`, transition: 'all 0.3s' }}>
        <path d="M 16 4 L 10 28 L 22 28 Z" fill="none" stroke="currentColor" strokeWidth="2" />
        {value > 1 && (
          <path 
            d={`M 16 ${16-energySize} L ${16-energySize} 16 L 16 ${16+energySize} L ${16+energySize} 16 Z`} 
            fill="currentColor" 
            className="animate-pulse"
          />
        )}
        <circle cx="16" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }

  if (type === 'dominance') {
    // 1 (Pequeño) a 5 (Grande)
    const bodyScale = 0.5 + (value * 0.12);
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" style={{ opacity, transform: `scale(${scale * bodyScale})`, transition: 'all 0.3s' }}>
        <rect x="10" y="10" width="12" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }

  return null;
};

const MoodCanvas: React.FC<MoodCanvasProps> = ({ onSave, alreadyLogged }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [valence, setValence] = useState(3);
  const [arousal, setArousal] = useState(3);
  const [dominance, setDominance] = useState(3);
  const [color, setColor] = useState('#94A3B8');

  // Lógica de mapeo SAM -> Color y Categoría
  useEffect(() => {
    let cat = MoodCategory.NEUTRAL;
    if (valence >= 4) {
      cat = arousal >= 4 ? MoodCategory.JOY : MoodCategory.CALM;
    } else if (valence <= 2) {
      cat = arousal >= 4 ? MoodCategory.ANGER : MoodCategory.SADNESS;
    } else {
      cat = arousal >= 4 ? MoodCategory.ENERGY : MoodCategory.NEUTRAL;
    }
    const def = EMOTIONAL_PALETTE.find(p => p.category === cat) || EMOTIONAL_PALETTE[6];
    setColor(def.hex);
  }, [valence, arousal]);

  const handleSave = () => {
    // Determinar categoría final para el guardado
    let category = MoodCategory.NEUTRAL;
    if (valence >= 4) category = arousal >= 4 ? MoodCategory.JOY : MoodCategory.CALM;
    else if (valence <= 2) category = arousal >= 4 ? MoodCategory.ANGER : MoodCategory.SADNESS;
    else category = arousal >= 4 ? MoodCategory.ENERGY : MoodCategory.NEUTRAL;

    onSave({
      color,
      intensity: (arousal - 1) / 4,
      iconName: 'Sparkles',
      category,
      valence,
      arousal,
      dominance
    });
    setIsEditing(false);
  };

  if (alreadyLogged && !isEditing) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-950">
        <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
          <Check className="text-green-500 w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Vibe capturada</h2>
        <p className="text-slate-400 mb-8">Tus dimensiones SAM han sido procesadas.</p>
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl glass text-sm font-bold text-white hover:bg-white/10 transition-all border border-white/10"
        >
          <Edit2 size={16} />
          Recalibrar SAM
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-slate-950 overflow-hidden">
      <div 
        className="absolute inset-0 opacity-20 blur-[120px] transition-all duration-1000 pointer-events-none"
        style={{ backgroundColor: color }}
      />

      <div className="relative z-10 flex flex-col h-full px-8 pt-20 pb-32">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">Modelo SAM</h1>
          <p className="text-slate-500 text-xs uppercase tracking-[0.2em] font-bold">Self-Assessment Manikin</p>
        </header>

        <div className="flex-1 flex flex-col justify-center gap-12">
          {/* VALENCIA */}
          <section className="space-y-4">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <Smile size={14} /> Valencia (Placer)
              </span>
              <span className="text-xs font-mono">{valence}/5</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-3xl border border-white/5">
              {[1, 2, 3, 4, 5].map(v => (
                <button 
                  key={v} 
                  onClick={() => setValence(v)}
                  className={`p-2 transition-all ${valence === v ? 'text-white' : 'text-slate-600'}`}
                >
                  <SAMManikin type="valence" value={v} active={valence === v} />
                </button>
              ))}
            </div>
          </section>

          {/* ACTIVACIÓN */}
          <section className="space-y-4">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <Zap size={14} /> Activación (Energía)
              </span>
              <span className="text-xs font-mono">{arousal}/5</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-3xl border border-white/5">
              {[1, 2, 3, 4, 5].map(v => (
                <button 
                  key={v} 
                  onClick={() => setArousal(v)}
                  className={`p-2 transition-all ${arousal === v ? 'text-white' : 'text-slate-600'}`}
                >
                  <SAMManikin type="arousal" value={v} active={arousal === v} />
                </button>
              ))}
            </div>
          </section>

          {/* DOMINANCIA */}
          <section className="space-y-4">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <Maximize2 size={14} /> Dominancia (Control)
              </span>
              <span className="text-xs font-mono">{dominance}/5</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-3xl border border-white/5">
              {[1, 2, 3, 4, 5].map(v => (
                <button 
                  key={v} 
                  onClick={() => setDominance(v)}
                  className={`p-2 transition-all ${dominance === v ? 'text-white' : 'text-slate-600'}`}
                >
                  <SAMManikin type="dominance" value={v} active={dominance === v} />
                </button>
              ))}
            </div>
          </section>
        </div>

        <button
          onClick={handleSave}
          className="mt-8 py-5 rounded-3xl font-black text-lg bg-white text-slate-950 shadow-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-3"
        >
          <Send size={20} />
          CALIBRAR VIBE
        </button>
      </div>
    </div>
  );
};

export default MoodCanvas;
