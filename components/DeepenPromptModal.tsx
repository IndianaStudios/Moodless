import React from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';

interface DeepenPromptModalProps {
  onConfirm: () => void;
  onSkip: () => void;
}

const DeepenPromptModal: React.FC<DeepenPromptModalProps> = ({ onConfirm, onSkip }) => {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-500" />
      
      {/* Content */}
      <div className="relative w-full max-w-sm glass p-8 rounded-[3rem] border-white/10 shadow-2xl text-center animate-in zoom-in-95 duration-300">
        <button 
          onClick={onSkip}
          className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles className="text-purple-400 w-10 h-10" />
        </div>

        <h3 className="text-2xl font-black text-white mb-3">¿Quieres profundizar?</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Si me cuentas un poco más sobre lo que te ha pasado hoy, podré darte análisis mucho más precisos y detectar patrones ocultos.
        </p>

        <div className="space-y-3">
          <button
            onClick={onConfirm}
            className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
          >
            SÍ, CONTAR MÁS
            <ArrowRight size={16} />
          </button>
          
          <button
            onClick={onSkip}
            className="w-full py-4 bg-white/5 text-slate-500 rounded-2xl font-bold text-sm hover:text-slate-300 transition-all"
          >
            Ahora no, gracias
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeepenPromptModal;
