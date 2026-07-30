import React, { useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion';

interface ModalShellProps extends React.PropsWithChildren {
  open: boolean;
  onClose?: () => void;
  ariaLabel: string;
  zClass?: string;
  closeOnBackdrop?: boolean;
  variant?: 'sheet' | 'plain';
  swipeToClose?: boolean;
}

const sheetTransition = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 30,
  mass: 1,
};

const backdropTransition = {
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

const SWIPE_THRESHOLD = 120;

const ModalShell: React.FC<ModalShellProps> = ({
  open,
  onClose,
  ariaLabel,
  zClass = 'z-[100]',
  closeOnBackdrop = true,
  variant = 'sheet',
  swipeToClose = true,
  children,
}) => {
  const handleBackdrop = () => {
    if (closeOnBackdrop && onClose) onClose();
  };

  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 240], [1, 0]);
  const closeRef = useRef<(() => void) | null>(null);
  closeRef.current = handleBackdrop;

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!swipeToClose) return;
    if (variant !== 'plain') return;
    if (info.offset.y > SWIPE_THRESHOLD || info.velocity.y > 600) {
      closeRef.current?.();
    } else {
      dragY.set(0);
    }
  };

  const enableSwipe = swipeToClose && variant === 'plain';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-shell"
          className={`app-overlay ${zClass}`}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={backdropTransition}
        >
          <motion.button
            type="button"
            className="app-overlay-backdrop"
            onClick={handleBackdrop}
            aria-label={`Cerrar ${ariaLabel}`}
            style={{ opacity: enableSwipe ? backdropOpacity : 1 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
          />
          <motion.div
            className={
              variant === 'sheet'
                ? 'app-sheet relative max-w-md p-8 flex flex-col items-center justify-center text-center'
                : 'relative flex flex-col items-stretch justify-start text-left w-full h-full'
            }
            style={enableSwipe ? { y: dragY, touchAction: 'pan-y' } : undefined}
            drag={enableSwipe ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 320 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={enableSwipe ? handleDragEnd : undefined}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 200, scale: 0.98, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } }}
            transition={sheetTransition}
          >
            {variant === 'plain' && enableSwipe && (
              <div className="app-sheet-handle pointer-events-none" aria-hidden="true" />
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModalShell;
