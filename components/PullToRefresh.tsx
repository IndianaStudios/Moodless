import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, useSpring, type PanInfo } from 'framer-motion';
import { ArrowDown, Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  disabled?: boolean;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  className = '',
  threshold = 80,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [armed, setArmed] = useState(false);
  const rawY = useMotionValue(0);
  const springY = useSpring(rawY, { stiffness: 260, damping: 26, mass: 0.6 });
  const opacity = useTransform(springY, [0, threshold], [0, 1]);
  const spinnerScale = useTransform(springY, [0, threshold], [0.6, 1]);
  const arrowRotate = useTransform(springY, [0, threshold], [0, 180]);

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop > 0) {
      startYRef.current = null;
      return;
    }
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    if (startYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - startYRef.current;
    if (delta > 0) {
      const damped = Math.min(delta * 0.55, threshold * 1.5);
      rawY.set(damped);
      if (damped > threshold && !armed) setArmed(true);
      if (damped <= threshold && armed) setArmed(false);
    }
  };

  const handleTouchEnd = async (_: TouchEvent) => {
    if (disabled || isRefreshing) return;
    if (startYRef.current === null) return;
    const current = rawY.get();
    startYRef.current = null;
    if (current > threshold) {
      setIsRefreshing(true);
      setArmed(false);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        rawY.set(0);
      }
    } else {
      rawY.set(0);
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [disabled, isRefreshing]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ touchAction: disabled ? undefined : 'pan-y' }}
    >
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-center"
        style={{ height: threshold, opacity }}
        aria-hidden={!armed && !isRefreshing}
      >
        <motion.div
          className="w-10 h-10 rounded-full bg-[var(--app-surface)] border border-white/10 flex items-center justify-center shadow-lg apple-vibrancy-soft"
          style={{ scale: spinnerScale }}
        >
          {isRefreshing ? (
            <Loader2 size={16} className="text-white/80 animate-spin" />
          ) : (
            <motion.span style={{ rotate: arrowRotate, display: 'inline-flex' }}>
              <ArrowDown size={16} className="text-white/80" />
            </motion.span>
          )}
        </motion.div>
      </motion.div>
      <motion.div style={{ y: springY }} className="relative">
        {children}
      </motion.div>
      {armed && !isRefreshing && (
        <span className="sr-only" role="status">Suelta para actualizar</span>
      )}
    </div>
  );
};

export default PullToRefresh;
