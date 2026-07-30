import React from 'react';

interface EmptyStateProps {
  mascot?: 'calm' | 'joy' | 'anxiety' | 'sadness' | 'anger';
  icon?: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
  size?: 'sm' | 'md';
}

const MASCOT_MAP: Record<NonNullable<EmptyStateProps['mascot']>, string> = {
  calm: '/mascot_calm_nobg.png',
  joy: '/mascot_joy_nobg.png',
  anxiety: '/mascot_anxiety_nobg.png',
  sadness: '/mascot_sadness_nobg.png',
  anger: '/mascot_anger_nobg.png',
};

const EmptyState: React.FC<EmptyStateProps> = ({
  mascot,
  icon,
  title,
  description,
  className = '',
  size = 'md',
}) => {
  const imgSize = size === 'sm' ? 'w-20 h-20' : 'w-28 h-28';
  const iconBox = size === 'sm' ? 'h-12 w-12' : 'w-16 h-16';
  const iconSize = size === 'sm' ? 18 : 22;

  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-10 ${className}`}>
      {mascot ? (
        <div className="relative mb-5">
          <div
            className="absolute inset-0 scale-125 rounded-full bg-violet-500/10 blur-2xl"
            aria-hidden="true"
          />
          <img
            src={MASCOT_MAP[mascot]}
            alt=""
            aria-hidden="true"
            draggable={false}
            className={`relative ${imgSize} object-contain opacity-95 drop-shadow-[0_12px_24px_rgba(0,0,0,0.4)]`}
          />
        </div>
      ) : icon ? (
        <div
          className={`${iconBox} mb-5 flex items-center justify-center rounded-2xl bg-white/[0.04] text-white/55 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]`}
        >
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: iconSize, strokeWidth: 1.6 })
            : icon}
        </div>
      ) : null}

      <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xs app-text-meta leading-relaxed">{description}</p>
      )}
    </div>
  );
};

export default EmptyState;
