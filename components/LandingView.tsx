import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Brain, Gamepad2, HeartPulse } from 'lucide-react';
import MoodCanvasGame from './MoodCanvasGame';
import { GameConfig } from '../services/geminiService';
import LegalView from './LegalView';

interface LandingViewProps {
  onStart: () => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onStart }) => {
  const [mounted, setMounted] = useState(false);
  const [legalPage, setLegalPage] = useState<'privacy' | 'terms' | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Configuramos el Canvas de STARDUST para que sirva de fondo majestuoso
  const bgConfig: GameConfig = {
    type: 'STARDUST',
    title: '',
    description: '',
    instruction: '',
    themeColor: '#a855f7', // Un morado suave para fondo
    intensity: 5
  };

  if (legalPage) {
    return <LegalView type={legalPage} onBack={() => setLegalPage(null)} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white relative overflow-x-hidden">
      {/* 1. Fondo Interactivo Canvas */}
      <div className="absolute inset-0 z-0 opacity-50">
        <MoodCanvasGame config={bgConfig} themeColor="#a855f7" isMuted={true} />
      </div>

      {/* Gradiente superior para que el logo se vea bien */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-slate-950 to-transparent z-10" />

      {/* Contenido principal Scrollable */}
      <div className="relative z-20 flex-1 flex flex-col items-center overflow-y-auto no-scrollbar scroll-smooth w-full px-6 py-12">
        <header className="w-full max-w-5xl flex justify-between items-center mb-16 animate-in fade-in slide-in-from-top-12 duration-1000">
          <img src="/logo.jpg" alt="Moodless" className="w-16 h-16 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.3)] object-cover" />
          <button 
            onClick={onStart}
            className="text-sm font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-colors"
          >
            Inicia Sesión
          </button>
        </header>

        <main className="w-full max-w-5xl flex flex-col items-center text-center mt-10">
          {/* Hero Section */}
          <div className="max-w-3xl flex flex-col items-center">
            <span className={`inline-block py-1 px-4 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-[10px] font-black uppercase tracking-[0.2em] mb-6 ${mounted ? 'animate-in fade-in zoom-in-95 duration-1000 delay-150' : 'opacity-0'}`}>
              Versión 2.0. Inteligencia Artificial & Emociones
            </span>
            <h1 className={`text-5xl sm:text-7xl font-black leading-[1.1] tracking-tight mb-8 ${mounted ? 'animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300' : 'opacity-0'}`}>
              Entiende tu mente.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 animate-pulse">
                Transforma tu energía.
              </span>
            </h1>
            <p className={`text-lg sm:text-xl text-slate-400 max-w-2xl font-medium mb-12 ${mounted ? 'animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500' : 'opacity-0'}`}>
              Moodless no es sólo un diario. Es tu espacio seguro donde tu estado de ánimo cobra vida a través de colores, música generativa, análisis psicológico de IA y terapias de juegos inmersivos.
            </p>
            
            <button 
              onClick={onStart}
              className={`group relative overflow-hidden rounded-[2rem] bg-white text-slate-950 px-12 py-5 font-black text-lg transition-transform active:scale-95 shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:shadow-[0_0_80px_rgba(255,255,255,0.4)] ${mounted ? 'animate-in fade-in zoom-in duration-1000 delay-700' : 'opacity-0'}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-blue-400/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <span className="relative flex items-center gap-3">
                Comienza Hoy <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <p className={`mt-4 text-xs text-slate-500 font-medium ${mounted ? 'animate-in fade-in duration-1000 delay-1000' : 'opacity-0'}`}>Es gratis. No requiere tarjeta.</p>
          </div>

          {/* Features Grid */}
          <div className={`mt-32 w-full grid grid-cols-1 md:grid-cols-3 gap-6 ${mounted ? 'animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-[1200ms]' : 'opacity-0'}`}>
            <FeatureCard 
              icon={<HeartPulse className="text-pink-400" size={32} />}
              title="Diario Visual Semántico"
              description="Registra cómo te sientes usando la escala SAM (Valencia, Activación y Dominancia). No hacen falta palabras, solo colores y formas."
            />
            <FeatureCard 
              icon={<Brain className="text-purple-400" size={32} />}
              title="Análisis Psicológico IA"
              description="Nuestra inteligencia procesa tus emociones a lo largo de los días para darte reflexiones profundas sobre tu estado psicológico."
            />
            <FeatureCard 
              icon={<Gamepad2 className="text-blue-400" size={32} />}
              title="Terapias Interactivas"
              description="La app genera a tiempo real juegos Canvas (como romper cristales con el dedo o capturar polvo cósmico) basados exactamente en tu aura actual para aliviar el estrés."
            />
          </div>
          
          {/* Footer */}
          <footer className={`mt-32 w-full pt-12 pb-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 ${mounted ? 'animate-in fade-in duration-1000 delay-[1500ms]' : 'opacity-0'}`}>
            <div className="flex items-center gap-2">
              <img src="/logo.jpg" alt="Moodless Logo Pequeño" className="w-8 h-8 rounded-lg" />
              <span className="text-white font-black tracking-widest text-sm">MOODLESS</span>
            </div>
            
            <div className="flex gap-6 text-sm font-medium text-slate-500">
              <button onClick={(e) => { e.preventDefault(); setLegalPage('privacy'); }} className="hover:text-purple-400 transition-colors cursor-pointer">Privacidad</button>
              <button onClick={(e) => { e.preventDefault(); setLegalPage('terms'); }} className="hover:text-purple-400 transition-colors cursor-pointer">Términos</button>
              <a href="mailto:moodless@gmail.com" className="hover:text-purple-400 transition-colors">Contacto</a>
            </div>

            <p className="text-xs text-slate-600">
              © {new Date().getFullYear()} Moodless Inc.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="flex flex-col items-center text-center p-8 rounded-3xl glass border border-white/5 hover:bg-white/[0.03] transition-colors relative overflow-hidden group">
    <div className="absolute -inset-10 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
    <div className="p-4 bg-slate-900 rounded-2xl mb-6 shadow-inner border border-white/5">
      {icon}
    </div>
    <h3 className="text-xl font-black text-white mb-3">{title}</h3>
    <p className="text-slate-400 text-sm font-medium leading-relaxed">{description}</p>
  </div>
);

export default LandingView;
