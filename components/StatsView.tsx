
import React from 'react';
import { MoodEntry } from '../types';
import { EMOTIONAL_PALETTE, MOOD_ICONS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { Calendar, Zap, FileText, TrendingUp, Sparkles, X } from 'lucide-react';

interface StatsViewProps {
  entries: MoodEntry[];
}

const StatsView: React.FC<StatsViewProps> = ({ entries }) => {
  const stats = EMOTIONAL_PALETTE.map(p => ({
    name: p.label,
    count: entries.filter(e => e.category === p.category).length,
    color: p.hex
  }));

  const [zoomedMascot, setZoomedMascot] = React.useState<string | null>(null);


  const lastEntry = [...entries].reverse().find(e => e);
  const Icon = lastEntry ? MOOD_ICONS.find(i => i.name === lastEntry.iconName)?.Icon : null;

  const calculateStreak = () => {
    if (entries.length === 0) return 0;
    const uniqueDays = new Set(entries.map(e => e.date)).size;
    return uniqueDays;
  };

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
        {/* Placeholder for future stats or just repeated for symmetry if needed, or leave at 2/4 */}
        <div className="glass p-5 rounded-[2rem] hidden md:flex flex-col items-center border-white/5 opacity-50">
          <TrendingUp className="text-purple-400 mb-1" size={18} />
          <span className="text-2xl font-black">---</span>
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Tendencia</span>
        </div>
        <div className="glass p-5 rounded-[2rem] hidden md:flex flex-col items-center border-white/5 opacity-50">
          <Sparkles className="text-pink-400 mb-1" size={18} />
          <span className="text-2xl font-black">---</span>
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Aura</span>
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
