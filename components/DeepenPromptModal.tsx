import React from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import ModalShell from './ModalShell';

interface DeepenPromptModalProps {
  onConfirm: () => void;
  onSkip: () => void;
}

const DeepenPromptModal: React.FC<DeepenPromptModalProps> = ({ onConfirm, onSkip }) => {
  return (
    <ModalShell open ariaLabel="¿Quieres profundizar?" zClass="z-[110]">
      <div className="app-sheet max-w-sm relative p-8 text-center">
        <button
          type="button"
          onClick={onSkip}
          className="app-icon-button absolute right-5 top-5"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
          <Sparkles className="text-violet-300" size={30} strokeWidth={1.8} />
        </div>

        <h3 id="deepen-prompt-title" className="text-2xl font-semibold text-white mb-3 tracking-[-0.025em]">¿Quieres profundizar?</h3>
        <p className="text-white/55 text-sm leading-relaxed mb-7">
          Si me cuentas un poco más sobre lo que te ha pasado hoy, podré darte análisis mucho más precisos y detectar patrones ocultos.
        </p>

        <div className="space-y-3">
          <button
            onClick={onConfirm}
            className="app-button app-button-primary w-full py-4 text-sm"
          >
            Sí, contar más
            <ArrowRight size={17} strokeWidth={2} />
          </button>

          <button
            onClick={onSkip}
            className="app-button app-button-secondary w-full py-4 text-sm"
          >
            Ahora no, gracias
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

export default DeepenPromptModal;
