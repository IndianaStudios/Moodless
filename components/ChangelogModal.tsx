import React, { useEffect } from 'react';
import { PartyPopper, ArrowRight, X } from 'lucide-react';

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
  // Evitar scroll en el body mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop con blur */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">

        {/* Decoración Superior */}
        <div className="absolute top-0 left-0 right-0 h-[10rem] bg-gradient-to-br from-blue-600/20 to-purple-600/20" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="relative pt-12 px-6 pb-4 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 mb-3 shadow-lg shadow-blue-500/20 flex items-center justify-center">
            <PartyPopper className="text-blue-400" size={32} />
          </div>

          <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">
            VERSIÓN {changelog.version}
          </div>

          <h2 className="text-2xl font-black text-white mb-2 leading-tight">
            {changelog.title}
          </h2>
        </div>

        <div className="px-6 pb-8">
          <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-5 max-h-64 overflow-y-auto custom-scrollbar">
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {changelog.content}
            </p>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95 shadow-xl shadow-white/5"
          >
            ¡Genial, gracias!
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangelogModal;
