import React, { useEffect } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { motion } from 'framer-motion';
import ModalShell from './ModalShell';

interface ChangelogData {
  id: string;
  version: string;
  title: string;
  content: string;
}

interface ChangelogModalProps {
  changelog: ChangelogData;
  onClose: () => void;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ changelog, onClose }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <ModalShell open ariaLabel="Novedades" zClass="z-[120]">
      <div className="app-sheet max-w-md relative overflow-hidden">
        {/* Gradient top line */}
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(167, 139, 250, 0.95) 30%, rgba(94, 234, 212, 0.95) 70%, transparent)',
          }}
          aria-hidden="true"
        />

        {/* Soft ambient glow */}
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[80px] opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(167, 139, 250, 0.6), rgba(94, 234, 212, 0.3), transparent 70%)' }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
        />

        <button
          type="button"
          onClick={onClose}
          className="app-icon-button absolute right-4 top-4 z-10 h-9 w-9"
          aria-label="Cerrar novedades"
        >
          <X size={18} />
        </button>

        <div className="relative pt-[max(2.75rem,env(safe-area-inset-top),3rem)] px-6 pb-4 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28, ease: [0.16, 1, 0.3, 1] }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-400/15 border border-white/10 mb-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] flex items-center justify-center"
          >
            <Sparkles className="text-white/85" size={28} strokeWidth={1.8} />
          </motion.div>

          <div className="app-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/55 mb-5">
            Versión {changelog.version}
          </div>

          <h2 id="changelog-title" className="text-2xl font-semibold text-white mb-2 leading-tight tracking-[-0.025em]">
            {changelog.title}
          </h2>
        </div>

        <div className="px-6 pb-7">
          <div className="app-surface rounded-2xl p-5 max-h-64 overflow-y-auto custom-scrollbar">
            <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">
              {changelog.content}
            </p>
          </div>
        </div>

        <div className="px-6 pb-7">
          <button
            onClick={onClose}
            className="app-button app-button-primary w-full py-4 text-sm"
          >
            ¡Genial, gracias!
            <ArrowRight size={17} strokeWidth={2} />
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

export default ChangelogModal;
