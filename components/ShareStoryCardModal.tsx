import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoodEntry, MoodCategory } from '../types';
import { EMOTIONAL_PALETTE, triggerHaptic, haptic } from '../constants';
import { soundEffects } from '../services/soundEffects';
import { useToast } from './ToastProvider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Share2,
  Download,
  Copy,
  X,
  Sparkles,
  Loader2,
  Check,
} from 'lucide-react';

interface ShareStoryCardModalProps {
  entry: MoodEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_QUOTES: Record<MoodCategory, { title: string; text: string }> = {
  [MoodCategory.JOY]: {
    title: 'Energía Luminosa',
    text: 'Celebrar la luz interna multiplica la gratitud de cada instante vivido.',
  },
  [MoodCategory.CALM]: {
    title: 'Paz Interior',
    text: 'En la quietud habita la claridad para abrazar lo que viene con serenidad.',
  },
  [MoodCategory.ANGER]: {
    title: 'Fuerza Vital',
    text: 'Toda emoción intensa es energía en busca de un cauce consciente.',
  },
  [MoodCategory.SADNESS]: {
    title: 'Espacio Seguro',
    text: 'Honrar los momentos grises es el primer paso para reencontrar el equilibrio.',
  },
  [MoodCategory.ANXIETY]: {
    title: 'Respiro Consciente',
    text: 'Un respiro a la vez. El presente siempre es un lugar más seguro que el futuro.',
  },
  [MoodCategory.ENERGY]: {
    title: 'Impulso Creador',
    text: 'Claridad e impulso vital para transformar cada idea en acción.',
  },
  [MoodCategory.NEUTRAL]: {
    title: 'Equilibrio Neutro',
    text: 'En el punto medio se encuentra el espacio necesario para reencontrarte.',
  },
};

/**
 * Parsea el reporte de la entrada de forma infalible, extrayendo título y texto
 * sin mostrar jamás JSON en crudo ni llaves/comillas de código.
 */
function parseEntryInsight(raw?: string, category?: MoodCategory): { title: string; text: string } {
  const fallback = DEFAULT_QUOTES[category || MoodCategory.CALM] || {
    title: 'Reflexión Emocional',
    text: 'Cada emoción sentida es una oportunidad para conocerte mejor.',
  };

  if (!raw || typeof raw !== 'string') return fallback;

  let cleaned = raw.trim();

  // Deshacer comillas envolventes si viniera como string JSON serializado
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    try {
      cleaned = JSON.parse(cleaned);
    } catch {}
  }

  // Intentar parsear como objeto JSON
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned);
      const title = parsed.title || parsed.emocion || parsed.label || '';
      const text = parsed.explanation || parsed.description || parsed.report || parsed.texto || parsed.text || parsed.mensaje || '';
      if (text) {
        return { title: title || fallback.title, text: text.trim() };
      }
    } catch {}
  }

  // Fallback por expresiones regulares si el JSON vino truncado
  const titleMatch = cleaned.match(/"title"\s*:\s*"([^"]+)"/);
  const expMatch = cleaned.match(/"explanation"\s*:\s*"([^"]+)"/);

  if (expMatch && expMatch[1]) {
    return {
      title: titleMatch ? titleMatch[1] : fallback.title,
      text: expMatch[1].trim(),
    };
  }

  // Si es un texto plano sin formato de código
  if (!cleaned.includes('{') && !cleaned.includes('"title"')) {
    return {
      title: fallback.title,
      text: cleaned.replace(/^["']|["']$/g, '').trim(),
    };
  }

  return fallback;
}

export const ShareStoryCardModal: React.FC<ShareStoryCardModalProps> = ({
  entry,
  isOpen,
  onClose,
}) => {
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardPreviewRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !entry) return null;

  const paletteEntry = EMOTIONAL_PALETTE.find((p) => p.category === entry.category);
  const moodLabel = paletteEntry?.label || 'Emoción';
  const moodBuddy = paletteEntry?.moodBuddy || '/mascot_calm_nobg.png';
  const moodColor = entry.color || paletteEntry?.hex || '#2DD4BF';

  let entryDate: Date;
  try {
    entryDate = new Date(entry.date.includes('T') ? entry.date : `${entry.date}T12:00:00`);
  } catch {
    entryDate = new Date();
  }

  // Fecha con formato Apple elegante en español (ej: "Lunes, 14 de septiembre")
  const dateFormatted = format(entryDate, "EEEE, d 'de' MMMM", { locale: es });
  const formattedDate = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

  const insight = parseEntryInsight(entry.report, entry.category);
  const intensityPercent = Math.round((entry.intensity || 0.5) * 100);

  /**
   * Generación de Canvas en 1080x1920 con acabado Apple Glassmorphism de alta gama
   */
  const generateStoryCanvas = async (): Promise<Blob | null> => {
    const width = 1080;
    const height = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 1. Fondo negro obsidiana profundo (True Apple Dark Mode)
    ctx.fillStyle = '#060709';
    ctx.fillRect(0, 0, width, height);

    // 2. Halo radial orgánico multicapa detrás del personaje
    const auraGlow = ctx.createRadialGradient(
      width / 2,
      height * 0.44,
      80,
      width / 2,
      height * 0.44,
      620
    );
    auraGlow.addColorStop(0, `${moodColor}55`);
    auraGlow.addColorStop(0.35, `${moodColor}25`);
    auraGlow.addColorStop(0.7, `${moodColor}08`);
    auraGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = auraGlow;
    ctx.fillRect(0, 0, width, height);

    // 3. Tarjeta central de cristal esmerilado (Frosted Glass Container)
    const cardX = 90;
    const cardY = 160;
    const cardW = width - 180;
    const cardH = height - 320;
    const cardRadius = 72;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);

    // Relleno de cristal oscuro translúcido
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.fill();

    // Borde biselado especular estilo Apple
    const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    borderGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.12)');
    borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.04)');
    ctx.lineWidth = 3;
    ctx.strokeStyle = borderGrad;
    ctx.stroke();
    ctx.restore();

    // 4. Header: Cápsula Apple con micro-ícono
    const pillW = 340;
    const pillH = 68;
    const pillX = (width - pillW) / 2;
    const pillY = cardY + 70;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦  M O O D L E S S', width / 2, pillY + pillH / 2);
    ctx.restore();

    // 5. Fecha formateada con precisión tipográfica Apple
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = '500 28px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(formattedDate, width / 2, cardY + 195);
    ctx.restore();

    // 6. Mascota MoodBuddy en pedestal de cristal suave
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = moodBuddy;
      await new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
      });

      const mascotSize = 510;
      const mascotX = (width - mascotSize) / 2;
      const mascotY = cardY + 270;

      // Resplandor cálido focalizado
      const mascotGlow = ctx.createRadialGradient(
        width / 2,
        mascotY + mascotSize / 2,
        50,
        width / 2,
        mascotY + mascotSize / 2,
        280
      );
      mascotGlow.addColorStop(0, `${moodColor}77`);
      mascotGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = mascotGlow;
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, mascotX, mascotY, mascotSize, mascotSize);
    } catch {}

    // 7. Tipografía de Emoción (SF Pro Display bold)
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 84px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '-0.02em';
    ctx.fillText(moodLabel.toUpperCase(), width / 2, cardY + 890);

    // Cápsula de Intensidad métrica (Estilo Apple Health)
    const meterW = 280;
    const meterH = 54;
    const meterX = (width - meterW) / 2;
    const meterY = cardY + 930;

    ctx.beginPath();
    ctx.roundRect(meterX, meterY, meterW, meterH, meterH / 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.stroke();

    // Punto luminoso de color
    ctx.beginPath();
    ctx.arc(meterX + 32, meterY + meterH / 2, 7, 0, Math.PI * 2);
    ctx.fillStyle = moodColor;
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Intensidad · ${intensityPercent}%`, meterX + 54, meterY + meterH / 2);
    ctx.restore();

    // 8. Widget de Insight Estilo Apple (Glass Tile)
    const widgetW = cardW - 120;
    const widgetH = 260;
    const widgetX = (width - widgetW) / 2;
    const widgetY = cardY + 1025;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(widgetX, widgetY, widgetW, widgetH, 44);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    // Eyebrow "✦ REFLEXIÓN"
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦  REFLEXIÓN DEL DÍA', width / 2, widgetY + 48);

    // Título limpio
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 32px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    ctx.fillText(insight.title, width / 2, widgetY + 95);

    // Cuerpo de la explicación en texto legible formateado
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.font = '400 28px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';

    const words = insight.text.split(' ');
    let lines: string[] = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const testLine = `${currentLine} ${words[i]}`;
      const metrics = ctx.measureText(testLine);
      if (metrics.width < widgetW - 80) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);

    const lineHeight = 38;
    const startY = widgetY + 145;
    lines.slice(0, 3).forEach((line, i) => {
      ctx.fillText(line, width / 2, startY + i * lineHeight);
    });
    ctx.restore();

    // 9. Footer: Marca sutil
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '500 22px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('moodless.vercel.app · Tu mapa emocional personal', width / 2, cardY + cardH - 45);
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  const handleNativeShare = async () => {
    setIsExporting(true);
    triggerHaptic();
    try {
      const blob = await generateStoryCanvas();
      if (!blob) throw new Error('No se pudo generar la tarjeta');

      const file = new File([blob], `moodless-${entry.date}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Mi emoción en Moodless: ${moodLabel}`,
          text: `Hoy registré "${moodLabel}" en Moodless.`,
          files: [file],
        });
        haptic('success');
        toast.success('¡Tarjeta compartida!');
      } else {
        handleDownload(blob);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Error al compartir tarjeta:', err);
        toast.error('No se pudo compartir la tarjeta');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = async (existingBlob?: Blob | null) => {
    setIsExporting(true);
    triggerHaptic();
    try {
      const blob = existingBlob || (await generateStoryCanvas());
      if (!blob) throw new Error('No se pudo generar');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `moodless-story-${entry.date}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      soundEffects.play('success');
      haptic('success');
      toast.success('Tarjeta guardada en fotos');
    } catch (err) {
      console.error('Error al descargar:', err);
      toast.error('Error al guardar la tarjeta');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    setIsExporting(true);
    triggerHaptic();
    try {
      const blob = await generateStoryCanvas();
      if (!blob) throw new Error('No se pudo generar');

      if (navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        soundEffects.play('success');
        haptic('success');
        toast.success('¡Imagen copiada al portapapeles!');
        setTimeout(() => setCopied(false), 2500);
      } else {
        toast.error('Tu navegador no soporta copiar imágenes');
      }
    } catch (err) {
      console.error('Error al copiar imagen:', err);
      toast.error('No se pudo copiar la imagen');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Apple Deep Glass Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
          onClick={() => {
            soundEffects.play('pop');
            onClose();
          }}
        />

        {/* Modal Contenedor */}
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 18 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className="relative z-10 flex flex-col items-center max-w-sm w-full"
        >
          {/* Botón cerrar flotante tipo Apple */}
          <button
            type="button"
            onClick={() => {
              soundEffects.play('pop');
              onClose();
            }}
            className="absolute -top-12 right-0 p-2 text-white/60 hover:text-white rounded-full bg-white/[0.08] hover:bg-white/[0.14] active:scale-90 transition-all backdrop-blur-xl border border-white/10"
            aria-label="Cerrar modal"
          >
            <X size={18} strokeWidth={2} />
          </button>

          {/* Tarjeta Visual Estilo Apple (Proporción 9:16) */}
          <div
            ref={cardPreviewRef}
            className="relative w-full aspect-[9/16] rounded-[2.5rem] overflow-hidden p-6 flex flex-col justify-between select-none shadow-[0_30px_70px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-white/20"
            style={{
              background: `radial-gradient(circle at 50% 42%, ${moodColor}35 0%, rgba(6,7,11,0.95) 75%), #06070B`,
            }}
          >
            {/* Cabecera: Marca y Fecha */}
            <div className="flex flex-col items-center gap-1.5 pt-1">
              <div className="px-3 py-1 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/15 flex items-center gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                <Sparkles size={10} className="text-white/80" />
                <span className="text-[9.5px] font-bold tracking-[0.22em] text-white/90 uppercase">
                  M O O D L E S S
                </span>
              </div>
              <span className="text-[11px] font-medium text-white/50 tracking-wide">
                {formattedDate}
              </span>
            </div>

            {/* Centro: Mascota y Emoción */}
            <div className="relative my-auto flex flex-col items-center">
              {/* Resplandor ambiental de la emoción */}
              <div
                className="absolute w-44 h-44 rounded-full blur-3xl opacity-50 pointer-events-none"
                style={{ backgroundColor: moodColor }}
              />
              <img
                src={moodBuddy}
                alt="MoodBuddy"
                className="relative z-10 w-36 h-36 object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] transition-transform hover:scale-105 duration-300"
              />

              <h3 className="relative z-10 mt-3 text-[1.85rem] font-black tracking-[-0.02em] text-white uppercase drop-shadow-sm">
                {moodLabel}
              </h3>

              {/* Cápsula métrica Apple Health */}
              <div className="relative z-10 mt-1 px-3 py-0.5 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: moodColor, boxShadow: `0 0 6px ${moodColor}` }}
                />
                <span className="text-[10.5px] font-semibold tracking-wide text-white/85">
                  Intensidad · {intensityPercent}%
                </span>
              </div>
            </div>

            {/* Bloque inferior: Widget de Insight Apple */}
            <div className="p-4 rounded-[1.75rem] bg-white/[0.07] backdrop-blur-2xl border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] text-left">
              <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.18em] text-white/45 uppercase mb-1">
                <Sparkles size={10} className="text-white/40" />
                <span>Reflexión del día</span>
              </div>
              <h4 className="text-xs font-bold text-white tracking-tight">
                {insight.title}
              </h4>
              <p className="text-[11.5px] text-white/75 leading-snug font-normal mt-0.5 line-clamp-3">
                {insight.text}
              </p>
              <div className="mt-2 pt-2 border-t border-white/[0.06] text-center">
                <span className="text-[8.5px] text-white/30 tracking-[0.2em] uppercase font-medium">
                  moodless.vercel.app
                </span>
              </div>
            </div>
          </div>

          {/* Barra de Acciones Estilo iOS */}
          <div className="mt-4 grid grid-cols-3 gap-2.5 w-full">
            <button
              type="button"
              onClick={handleNativeShare}
              disabled={isExporting}
              className="flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 transition-all text-white border border-white/10 backdrop-blur-xl shadow-sm"
            >
              {isExporting ? (
                <Loader2 size={17} className="animate-spin text-white/70" />
              ) : (
                <Share2 size={17} strokeWidth={1.8} className="text-white/80" />
              )}
              <span className="text-[11px] font-medium text-white/90">Compartir</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownload()}
              disabled={isExporting}
              className="flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 transition-all text-white border border-white/10 backdrop-blur-xl shadow-sm"
            >
              <Download size={17} strokeWidth={1.8} className="text-white/80" />
              <span className="text-[11px] font-medium text-white/90">Guardar</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              disabled={isExporting}
              className="flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 transition-all text-white border border-white/10 backdrop-blur-xl shadow-sm"
            >
              {copied ? (
                <Check size={17} className="text-emerald-400" strokeWidth={2.2} />
              ) : (
                <Copy size={17} strokeWidth={1.8} className="text-white/80" />
              )}
              <span className="text-[11px] font-medium text-white/90">Copiar</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShareStoryCardModal;