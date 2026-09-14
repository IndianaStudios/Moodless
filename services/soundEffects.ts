/**
 * Motor de micro-sonidos de interfaz de alta fidelidad basado en Web Audio API.
 * Emula la respuesta sonora de la corona háptica del Apple Watch y la app Mindfulness de Apple.
 * Cero dependencias de red, latencia instantánea (<5ms) y volumen suave no invasivo.
 */

type SoundKind = 'pop' | 'tap' | 'success' | 'whoosh' | 'delete' | 'toggle';

class SoundEffectsService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('moodless_sound_effects');
      this.enabled = stored !== 'false';
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('moodless_sound_effects', enabled ? 'true' : 'false');
    }
  }

  public play(kind: SoundKind = 'tap'): void {
    if (!this.enabled) return;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      switch (kind) {
        case 'pop': {
          // Micro-pop suave y resonante (emula selección háptica de iOS)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(420, now);
          osc.frequency.exponentialRampToValueAtTime(160, now + 0.045);

          gain.gain.setValueAtTime(0.045, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }

        case 'tap': {
          // Clic percusivo ultracorto y sutil
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(580, now);
          osc.frequency.exponentialRampToValueAtTime(320, now + 0.025);

          gain.gain.setValueAtTime(0.035, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.03);
          break;
        }

        case 'toggle': {
          // Interruptor On/Off estilo iOS
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(360, now);
          osc.frequency.exponentialRampToValueAtTime(520, now + 0.035);

          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.04);
          break;
        }

        case 'success': {
          // Acorde armónico ascendente de dos tonos cálidos (E5 -> B5)
          const freqs = [659.25, 987.77];
          freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startOffset = now + i * 0.06;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startOffset);

            gain.gain.setValueAtTime(0.035, startOffset);
            gain.gain.exponentialRampToValueAtTime(0.0001, startOffset + 0.18);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startOffset);
            osc.stop(startOffset + 0.2);
          });
          break;
        }

        case 'whoosh': {
          // Barrido de frecuencia suave para swipes y transiciones
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(90, now + 0.09);

          gain.gain.setValueAtTime(0.03, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }

        case 'delete': {
          // Tono suave grave descendente
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(95, now + 0.06);

          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.07);
          break;
        }
      }
    } catch {
      // Si el navegador bloquea audio por política de autoplay, silenciar sin romper
    }
  }
}

export const soundEffects = new SoundEffectsService();
