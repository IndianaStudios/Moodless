import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface RevealProps extends React.PropsWithChildren {
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
  as?: keyof React.JSX.IntrinsicElements;
}

const Reveal: React.FC<RevealProps> = ({
  children,
  className = '',
  delay = 0,
  y = 28,
  duration = 0.7,
  as = 'div',
}) => {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;

  return (
    <MotionTag
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{
        duration: reduceMotion ? 0 : duration,
        delay: reduceMotion ? 0 : delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </MotionTag>
  );
};

export default Reveal;