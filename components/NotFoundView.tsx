import { motion } from 'framer-motion';
import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicPageLayout from './PublicPageLayout';

const NotFoundView = () => {
  return (
    <PublicPageLayout
      eyebrow="ERROR 404"
      title="Parece que este camino no está en tu mapa."
      description="La ruta que buscas se desvió. Vuelve al inicio y sigue explorando tu mundo interior."
      icon={<Compass size={22} />}
      pageTitle="Página no encontrada"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center py-6"
      >
        {/* Ilustración SVG inline estilo Apple: brújula con path perdido */}
        <div className="relative mb-7">
          <motion.div
            className="absolute inset-[-30px] rounded-full blur-3xl opacity-30"
            style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.55), rgba(45,212,191,0.18), transparent 70%)' }}
            animate={{ scale: [1, 1.06, 1], opacity: [0.22, 0.4, 0.22] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden="true"
          />
          <svg
            width="180"
            height="180"
            viewBox="0 0 180 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="relative drop-shadow-[0_18px_40px_rgba(0,0,0,0.5)]"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="nf-grad-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#5eead4" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="nf-grad-needle" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.65" />
              </linearGradient>
              <radialGradient id="nf-grad-glow" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#000" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Glow central */}
            <circle cx="90" cy="90" r="80" fill="url(#nf-grad-glow)" />

            {/* Aro exterior con leve sombra interior */}
            <circle cx="90" cy="90" r="76" stroke="url(#nf-grad-ring)" strokeWidth="2" fill="rgba(255,255,255,0.04)" />

            {/* Marcas cardinales */}
            {[0, 90, 180, 270].map((deg) => (
              <line
                key={deg}
                x1="90"
                y1="20"
                x2="90"
                y2="30"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.5"
                strokeLinecap="round"
                transform={`rotate(${deg} 90 90)`}
              />
            ))}

            {/* Aguja de la brújula (animada) */}
            <motion.g
              animate={{ rotate: [-3, 3, -3] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '90px 90px' }}
            >
              <path
                d="M90 30 L97 90 L90 95 L83 90 Z"
                fill="url(#nf-grad-needle)"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="0.8"
                strokeLinejoin="round"
              />
              <path
                d="M90 150 L97 90 L90 85 L83 90 Z"
                fill="rgba(167,139,250,0.25)"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="0.8"
                strokeLinejoin="round"
              />
            </motion.g>

            {/* Centro de la brújula */}
            <circle cx="90" cy="90" r="6" fill="rgba(167,139,250,0.9)" />
            <circle cx="90" cy="90" r="3" fill="#fff" />

            {/* Punto "404" sutil sobre el aro */}
            <text
              x="90"
              y="175"
              textAnchor="middle"
              fontSize="9"
              fontWeight="600"
              fill="rgba(255,255,255,0.35)"
              letterSpacing="2"
            >
              404
            </text>
          </svg>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40 mb-2">
            Coordenadas perdidas
          </p>
          <p className="text-sm text-white/55 max-w-sm leading-relaxed mb-7">
            Esta ruta no figura en tu diario. Vuelve al inicio para reencontrar tu vibe.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link
            to="/"
            className="app-button app-button-primary inline-flex items-center gap-2 px-6 py-3 text-sm"
          >
            <ArrowLeft size={15} strokeWidth={2} />
            Volver al inicio
          </Link>
        </motion.div>
      </motion.div>
    </PublicPageLayout>
  );
};

export default NotFoundView;