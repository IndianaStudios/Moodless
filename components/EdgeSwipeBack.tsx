import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { triggerHaptic } from '../constants';
import { soundEffects } from '../services/soundEffects';

interface EdgeSwipeBackProps extends React.PropsWithChildren {
  onBack: () => void;
  edgeThreshold?: number; // Ancho de la zona activa en el borde izquierdo (px)
  className?: string;
}

const appleSpring = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 32,
  mass: 0.9,
};

export const EdgeSwipeBack: React.FC<EdgeSwipeBackProps> = ({
  onBack,
  edgeThreshold = 36,
  className = '',
  children,
}) => {
  const x = useMotionValue(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const isValidEdgeStart = useRef(false);

  // Efecto de atenuación e indicador de retroceso estilo iOS
  const chevronOpacity = useTransform(x, [10, 80], [0, 1]);
  const chevronScale = useTransform(x, [10, 80], [0.6, 1]);
  const backdropDim = useTransform(x, [0, 180], [0, 0.4]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touchX = e.touches[0].clientX;
      if (touchX <= edgeThreshold) {
        isValidEdgeStart.current = true;
      } else {
        isValidEdgeStart.current = false;
      }
    }
  };

  const handlePanStart = () => {
    if (isValidEdgeStart.current) {
      setIsSwiping(true);
    }
  };

  const handlePan = (_: any, info: PanInfo) => {
    if (!isValidEdgeStart.current) return;
    // Solo permitir arrastrar hacia la derecha
    if (info.offset.x > 0) {
      x.set(info.offset.x);
    } else {
      x.set(0);
    }
  };

  const handlePanEnd = (_: any, info: PanInfo) => {
    if (!isValidEdgeStart.current) {
      setIsSwiping(false);
      return;
    }

    const currentX = x.get();
    const shouldDismiss = currentX > 100 || info.velocity.x > 450;

    if (shouldDismiss) {
      soundEffects.play('whoosh');
      triggerHaptic();
      x.set(window.innerWidth || 400);
      setTimeout(() => {
        onBack();
      }, 140);
    } else {
      // Rebote de muelle elástico para cancelar el gesto
      x.set(0);
    }

    setIsSwiping(false);
    isValidEdgeStart.current = false;
  };

  return (
    <div
      className={`relative w-full min-h-full overflow-hidden ${className}`}
      onTouchStart={handleTouchStart}
    >
      {/* Sombra y atenuación ambiental de fondo durante el arrastre */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-30 bg-black"
        style={{ opacity: backdropDim }}
      />

      {/* Indicador flotante estilo iOS en el borde izquierdo */}
      <motion.div
        className="fixed left-3 top-1/2 -translate-y-1/2 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-2xl pointer-events-none"
        style={{
          opacity: chevronOpacity,
          scale: chevronScale,
        }}
        aria-hidden="true"
      >
        <ChevronLeft size={22} strokeWidth={2.4} />
      </motion.div>

      {/* Contenido interactivo desplazable */}
      <motion.div
        style={{ x }}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        transition={appleSpring}
        className="w-full min-h-full flex flex-col"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default EdgeSwipeBack;
