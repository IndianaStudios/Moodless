import React, { useRef, useEffect } from 'react';
import { GameConfig } from '../services/geminiService';

interface MoodCanvasGameProps {
  config: GameConfig;
  themeColor: string;
  isMuted: boolean;
}

const MoodCanvasGame: React.FC<MoodCanvasGameProps> = ({ config, themeColor, isMuted }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Parse color
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  };

  const playSynthesizer = (freq: number, type: OscillatorType, duration: number, vol: number) => {
    if (isMuted) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = canvas.clientWidth * window.devicePixelRatio;
    let h = canvas.height = canvas.clientHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    w = canvas.clientWidth;
    h = canvas.clientHeight;

    const rgb = hexToRgb(themeColor);
    const colorStr = `${rgb.r}, ${rgb.g}, ${rgb.b}`;

    let animationId: number;
    let pointer = { x: -1000, y: -1000, active: false };

    // Common Handle for Interaction
    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      let clientX, clientY;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      } else {
        return;
      }
      pointer.x = clientX - rect.left;
      pointer.y = clientY - rect.top;
      pointer.active = true;
    };

    const handleEnd = () => { pointer.active = false; };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mousedown', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchstart', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleEnd);

    // GAME: STARDUST
    let stars: any[] = [];
    if (config.type === 'STARDUST') {
      for (let i = 0; i < 150; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1,
          baseA: Math.random() * 0.5 + 0.2
        });
      }
    }

    // GAME: SHATTER
    let shards: any[] = [];
    let crystals: any[] = [];
    if (config.type === 'SHATTER') {
      const spawnCrystal = () => {
        crystals.push({
          x: Math.random() * (w - 100) + 50,
          y: Math.random() * (h - 100) + 50,
          size: Math.random() * 40 + 30,
          vertices: 6,
          rot: Math.random() * Math.PI * 2
        });
      };
      for(let i=0; i<3; i++) spawnCrystal();

      canvas.addEventListener('mousedown', (e) => {
        if (config.type !== 'SHATTER') return;
        const index = crystals.findIndex(c => Math.hypot(c.x - pointer.x, c.y - pointer.y) < c.size);
        if (index !== -1) {
          score++;
          const c = crystals[index];
          crystals.splice(index, 1);
          // Shatter into shards
          for(let i=0; i<8; i++) {
            shards.push({
              x: c.x, y: c.y,
              vx: (Math.random() - 0.5) * 15,
              vy: (Math.random() - 0.5) * 15 - 5,
              rot: Math.random() * Math.PI,
              size: c.size / 2 * Math.random(),
              alpha: 1
            });
          }
          playSynthesizer(1000 + Math.random()*500, 'square', 0.1, 0.1);
          setTimeout(spawnCrystal, 1000); // respawn
        }
      });
      canvas.addEventListener('touchstart', (e) => {
       if (config.type !== 'SHATTER') return;
       // Simulate mousedown logic on touch
       const index = crystals.findIndex(c => Math.hypot(c.x - pointer.x, c.y - pointer.y) < c.size);
       if (index !== -1) {
           score++;
           const c = crystals[index];
           crystals.splice(index, 1);
           // Shatter into shards
           for(let i=0; i<8; i++) {
               shards.push({
                   x: c.x, y: c.y,
                   vx: (Math.random() - 0.5) * 15,
                   vy: (Math.random() - 0.5) * 15 - 5,
                   rot: Math.random() * Math.PI,
                   size: c.size / 2 * Math.random(),
                   alpha: 1
               });
           }
           playSynthesizer(1000 + Math.random()*500, 'square', 0.1, 0.1);
           setTimeout(spawnCrystal, 1000); // respawn
       }
      }, { passive: false });
    }

    // GAME: RIPPLES
    let ripples: any[] = [];
    if (config.type === 'RIPPLES') {
      const penta = [261.63, 293.66, 329.63, 392.00, 440.00]; // C D E G A
      const addRipple = () => {
        score++;
        ripples.push({ x: pointer.x, y: pointer.y, r: 0, alpha: 1 });
        const freq = penta[Math.floor(Math.random() * penta.length)];
        playSynthesizer(freq, 'sine', 2, 0.1);
      };
      canvas.addEventListener('mousedown', addRipple);
      canvas.addEventListener('touchstart', addRipple, { passive: false });
    }

    // Render Loop
    let lastTime = 0;
    let score = 0;
    let lastBreathCycle = -1;

    const render = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      ctx.clearRect(0, 0, w, h);

      if (config.type === 'STARDUST') {
        stars.forEach(s => {
          // pointer pull
          if (pointer.active) {
            const dx = pointer.x - s.x;
            const dy = pointer.y - s.y;
            const dist = Math.hypot(dx, dy);
            
            // Collect star logic (Score)
            if (dist < 30) {
              score += 1;
              s.x = Math.random() * w;
              s.y = Math.random() * h;
              playSynthesizer(1200 + Math.random()*800, 'sine', 0.1, 0.02);
            }
            // Pull behavior
            else if (dist < 200) {
              s.vx += (dx / dist) * 0.4;
              s.vy += (dy / dist) * 0.4;
            }
          }
          // friction
          s.vx *= 0.95;
          s.vy *= 0.95;
          s.x += s.vx;
          s.y += s.vy;

          // edges
          if (s.x < 0) s.x = w; if (s.x > w) s.x = 0;
          if (s.y < 0) s.y = h; if (s.y > h) s.y = 0;

          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${colorStr}, ${s.baseA + Math.hypot(s.vx, s.vy)*0.2})`;
          ctx.fill();
        });
      }
      
      else if (config.type === 'SHATTER') {
        crystals.forEach(c => {
          ctx.beginPath();
          for(let i=0; i<c.vertices; i++) {
            const ang = c.rot + (i * Math.PI * 2 / c.vertices);
            ctx[i===0?'moveTo':'lineTo'](c.x + Math.cos(ang)*c.size, c.y + Math.sin(ang)*c.size);
          }
          ctx.closePath();
          ctx.fillStyle = `rgba(${colorStr}, 0.2)`;
          ctx.fill();
          ctx.strokeStyle = `rgba(${colorStr}, 0.8)`;
          ctx.lineWidth = 2;
          ctx.stroke();
          c.rot += 0.01;
        });

        for(let i=shards.length-1; i>=0; i--) {
          const s = shards[i];
          s.vy += 0.5; // gravity
          s.x += s.vx;
          s.y += s.vy;
          s.rot += s.vx * 0.05;
          s.alpha -= 0.02;
          if (s.alpha <= 0) { shards.splice(i, 1); continue; }

          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x + Math.cos(s.rot)*s.size, s.y + Math.sin(s.rot)*s.size);
          ctx.lineTo(s.x + Math.cos(s.rot+Math.PI/2)*s.size*0.5, s.y + Math.sin(s.rot+Math.PI/2)*s.size*0.5);
          ctx.closePath();
          ctx.fillStyle = `rgba(${colorStr}, ${s.alpha*0.5})`;
          ctx.fill();
        }
      }

      else if (config.type === 'RIPPLES') {
        for(let i=ripples.length-1; i>=0; i--) {
          const r = ripples[i];
          r.r += 1.5;
          r.alpha -= 0.005;
          if (r.alpha <= 0) { ripples.splice(i, 1); continue; }

          ctx.beginPath();
          ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${colorStr}, ${r.alpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      else if (config.type === 'BREATH_JOURNEY') {
        const cycle = 19000; // 4s in, 7s hold, 8s out = 19s
        const rawCycleId = Math.floor(Date.now() / cycle);
        const tCycle = (Date.now() % cycle) / cycle;
        let scale = 0;
        let instruction = "Inhala";
        
        // Count breath cycles
        if (lastBreathCycle !== rawCycleId) {
          if (lastBreathCycle !== -1) score++; // Don't count the very first start as a complete cycle
          lastBreathCycle = rawCycleId;
        }

        if (tCycle < 4/19) {
          scale = tCycle / (4/19); // 0 to 1
        } else if (tCycle < 11/19) {
          scale = 1; // hold
          instruction = "Mantén";
        } else {
          scale = 1 - ((tCycle - 11/19) / (8/19)); // 1 to 0
          instruction = "Exhala";
        }

        ctx.translate(w/2, h/2);
        
        // Render breathing text
        ctx.fillStyle = `rgba(255,255,255,0.7)`;
        ctx.font = "bold 24px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(instruction, 0, 0);

        // Render mandala rings
        for (let j = 0; j < 6; j++) {
          ctx.beginPath();
          ctx.arc(0, 0, (40 + j * 20) * (0.5 + scale * 0.5), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${colorStr}, ${0.1 + scale*0.2})`;
          ctx.lineWidth = 2 + (5-j)*scale;
          ctx.stroke();
        }
        ctx.translate(-w/2, -h/2);

        if (!isMuted && tCycle < 0.01 && config.type === 'BREATH_JOURNEY') {
            playSynthesizer(200, 'sine', 3, 0.05);
        }
      }

      // Render Score Widget
      if (score > 0 || config.type === 'RIPPLES' || config.type === 'SHATTER') {
        // En RIPPLES y SHATTER el score es directo por array mutations hechas fuera del render loop,
        // así que hay que obtenerlo de una fuente externa al render loop para que esté al día.
      }

      // Hack for event listeners assigning score:
      // A better way is just tracking score visually here.
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "bold 16px system-ui";
      ctx.textAlign = "right";
      
      let displayScore = score;
      let label = "PUNTOS";
      if (config.type === 'SHATTER') {
         // Number of shattered original blocks is not tracked easily unless we track it
         // Wait, the mousedown event removes crystals. I need to update 'score' directly inside those listeners.
         // Since 'score' is in this closure, it can be updated by mousedown!
      }
      if (config.type === 'RIPPLES') { label = "ONDAS"; }
      if (config.type === 'STARDUST') { label = "ESTRELLAS"; }
      if (config.type === 'BREATH_JOURNEY') { label = "CICLOS"; }
      
      if (displayScore > 0 || score > 0) {
        ctx.fillText(`${score} ${label}`, w - 20, 30);
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mousedown', handleMove);
      canvas.removeEventListener('mouseup', handleEnd);
      canvas.removeEventListener('mouseleave', handleEnd);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('touchstart', handleMove);
      canvas.removeEventListener('touchend', handleEnd);
    };
  }, [config.type, themeColor, isMuted]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full block" 
      style={{ touchAction: 'none' }}
    />
  );
};

export default MoodCanvasGame;
