'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';

interface Star {
  x: number;
  y: number;
  size: number;
  depth: number;
  phase: number;
  speed: number;
  gold: boolean;
}

interface Rider {
  u: number;
  spd: number;
  sprite: HTMLCanvasElement;
  bobPhase: number;
  scale: number;
}

interface PageCard {
  cx: number;
  cy: number;
  w: number;
  rot: number;
  phase: number;
  amp: number;
  spd: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Ripple {
  x: number;
  y: number;
  t: number;
}

interface Floater {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  sprite: HTMLCanvasElement;
  scale: number;
}

const GOLD = '#FFD166';
const GOLD_DEEP = '#FFC145';
const TEAL = '#4ECDC4';
const CREAM = '#FDFAF2';
const PENTATONIC = [0, 2, 4, 7, 9];

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function makeGlowDot(color: string, size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, color);
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

function makeGlyph(glyph: string, color: string, px: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = px * 3;
  const g = c.getContext('2d')!;
  g.font = `600 ${px}px Fredoka, Nunito, ui-rounded, system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = px * 0.5;
  g.fillStyle = color;
  g.fillText(glyph, c.width / 2, c.height / 2);
  g.shadowBlur = 0;
  g.fillText(glyph, c.width / 2, c.height / 2);
  return c;
}

function makeAurora(color: string, radius: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = radius * 2;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(radius, radius, 0, radius, radius, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, radius * 2, radius * 2);
  return c;
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function NightSkyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [soundOn, setSoundOn] = useState(true);
  const soundOnRef = useRef(true);
  const { t } = useLanguage();

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const section = canvas.closest('section');
    if (!section) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0;
    let H = 0;
    let rafId = 0;
    let stars: Star[] = [];
    let shooting: ShootingStar | null = null;
    let nextShoot = 4;
    const ripples: Ripple[] = [];
    const floaters: Floater[] = [];

    const starSprite = makeGlowDot('rgba(255,255,255,1)', 32);
    const goldSprite = makeGlowDot('rgba(255,209,102,1)', 32);
    const glyphSprites = [
      makeGlyph('♪', GOLD, 34),
      makeGlyph('♫', TEAL, 34),
      makeGlyph('♪', CREAM, 30),
      makeGlyph('♩', GOLD_DEEP, 30),
    ];
    const auroras = [
      { sprite: makeAurora('rgba(78,205,196,0.55)', 300), r: 300, cx: 0.16, cy: 0.28, ax: 0.06, ay: 0.05, sx: 0.11, sy: 0.09, alpha: 0.24 },
      { sprite: makeAurora('rgba(255,209,102,0.5)', 340), r: 340, cx: 0.78, cy: 0.72, ax: 0.05, ay: 0.06, sx: 0.07, sy: 0.1, alpha: 0.16 },
      { sprite: makeAurora('rgba(94,140,255,0.55)', 380), r: 380, cx: 0.55, cy: 0.15, ax: 0.07, ay: 0.04, sx: 0.05, sy: 0.07, alpha: 0.22 },
      { sprite: makeAurora('rgba(78,205,196,0.45)', 260), r: 260, cx: 0.42, cy: 0.85, ax: 0.05, ay: 0.05, sx: 0.09, sy: 0.06, alpha: 0.14 },
    ];
    const pages: PageCard[] = [
      { cx: 0.66, cy: 0.3, w: 48, rot: -0.14, phase: 0, amp: 10, spd: 0.45 },
      { cx: 0.88, cy: 0.52, w: 42, rot: 0.16, phase: 2.1, amp: 12, spd: 0.38 },
      { cx: 0.74, cy: 0.74, w: 38, rot: -0.08, phase: 4.2, amp: 9, spd: 0.52 },
    ];
    const riders: Rider[] = Array.from({ length: 6 }, (_, i) => ({
      u: i / 6 + rand(0, 0.08),
      spd: rand(0.012, 0.02),
      sprite: glyphSprites[i % glyphSprites.length],
      bobPhase: rand(0, Math.PI * 2),
      scale: rand(0.7, 1),
    }));

    let audioCtx: AudioContext | null = null;
    let master: GainNode | null = null;

    const ensureAudio = () => {
      if (audioCtx) {
        if (audioCtx.state === 'suspended') void audioCtx.resume();
        return;
      }
      if (typeof window.AudioContext === 'undefined') return;
      audioCtx = new AudioContext();
      master = audioCtx.createGain();
      master.gain.value = 0.5;
      const delay = audioCtx.createDelay(1);
      delay.delayTime.value = 0.29;
      const feedback = audioCtx.createGain();
      feedback.gain.value = 0.24;
      const wet = audioCtx.createGain();
      wet.gain.value = 0.22;
      master.connect(audioCtx.destination);
      master.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wet);
      wet.connect(audioCtx.destination);
    };

    const playNote = (yFrac: number) => {
      if (!soundOnRef.current) return;
      ensureAudio();
      if (!audioCtx || !master) return;
      const span = 14;
      const idx = Math.max(0, Math.min(span - 1, Math.round((1 - yFrac) * (span - 1))));
      const midi = 60 + 12 * Math.floor(idx / 5) + PENTATONIC[idx % 5];
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const now = audioCtx.currentTime;

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.6);

      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(freq * 6, now);
      lp.frequency.exponentialRampToValueAtTime(freq * 2, now + 0.9);

      const o1 = audioCtx.createOscillator();
      o1.type = 'sine';
      o1.frequency.value = freq;
      const o2 = audioCtx.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = freq;
      const o2g = audioCtx.createGain();
      o2g.gain.value = 0.22;
      const o3 = audioCtx.createOscillator();
      o3.type = 'sine';
      o3.frequency.value = freq * 4;
      const o3g = audioCtx.createGain();
      o3g.gain.setValueAtTime(0.12, now);
      o3g.gain.exponentialRampToValueAtTime(0.0005, now + 0.25);

      o1.connect(lp);
      o2.connect(o2g);
      o2g.connect(lp);
      o3.connect(o3g);
      o3g.connect(lp);
      lp.connect(gain);
      gain.connect(master);
      [o1, o2, o3].forEach((o) => {
        o.start(now);
        o.stop(now + 1.7);
      });
    };

    const buildStars = () => {
      const count = Math.round(Math.min(170, (W * H) / 9000));
      stars = Array.from({ length: count }, () => {
        const depth = Math.random();
        return {
          x: Math.random(),
          y: Math.random() * 0.92,
          size: 1 + depth * 2.4,
          depth: 0.25 + depth * 0.75,
          phase: rand(0, Math.PI * 2),
          speed: rand(0.4, 1.1),
          gold: Math.random() < 0.12,
        };
      });
    };

    let px = 0.5;
    let py = 0.5;
    let tx = 0.5;
    let ty = 0.5;

    const starShape = (cx: number, cy: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? r : r * 0.45;
        const sx = cx + Math.cos(ang) * rr;
        const sy = cy + Math.sin(ang) * rr;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
    };

    const drawPage = (p: PageCard, time: number) => {
      const w = p.w;
      const h = w * 1.28;
      const x = p.cx * W;
      const y = p.cy * H + Math.sin(time * p.spd + p.phase) * p.amp;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.rot + Math.sin(time * 0.3 + p.phase) * 0.04);
      ctx.fillStyle = 'rgba(253,250,242,0.92)';
      ctx.shadowColor = 'rgba(23,26,61,0.5)';
      ctx.shadowBlur = 18;
      roundedRectPath(ctx, -w / 2, -h / 2, w, h, 9);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(90,107,125,0.35)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const ly = -h * 0.05 + i * h * 0.16;
        ctx.beginPath();
        ctx.moveTo(-w * 0.3, ly);
        ctx.lineTo(w * 0.3 - (i === 2 ? w * 0.18 : 0), ly);
        ctx.stroke();
      }
      ctx.fillStyle = GOLD_DEEP;
      starShape(0, -h * 0.26, w * 0.13);
      ctx.restore();
    };

    const ribbonY = (x: number, time: number) => {
      const u = x / W;
      return H * 0.68 + Math.sin(u * 5.2 + time * 0.5) * H * 0.035 + Math.sin(u * 11 - time * 0.32) * H * 0.014;
    };

    const drawRibbon = (time: number) => {
      ctx.save();
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, 'rgba(78,205,196,0)');
      grad.addColorStop(0.25, 'rgba(78,205,196,0.35)');
      grad.addColorStop(0.6, 'rgba(255,209,102,0.35)');
      grad.addColorStop(1, 'rgba(255,209,102,0)');
      for (let line = 0; line < 2; line++) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 14) {
          const y = ribbonY(x, time) + line * 9;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = grad;
        ctx.globalAlpha = line === 0 ? 0.6 : 0.3;
        ctx.lineWidth = line === 0 ? 1.6 : 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      riders.forEach((rd) => {
        rd.u += rd.spd / 60;
        if (rd.u > 1.06) rd.u = -0.06;
        const x = rd.u * W;
        const y = ribbonY(x, time) - 16 + Math.sin(time * 1.4 + rd.bobPhase) * 5;
        const s = rd.sprite;
        const fade = Math.min(1, Math.min(rd.u + 0.06, 1.06 - rd.u) * 8);
        ctx.globalAlpha = Math.max(0, fade) * 0.9;
        ctx.drawImage(s, x - (s.width * rd.scale) / 2, y - (s.height * rd.scale) / 2, s.width * rd.scale, s.height * rd.scale);
      });
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    const drawBase = (time: number) => {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#171A3D');
      sky.addColorStop(0.6, '#1E3A8A');
      sky.addColorStop(1, '#2E5FBF');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      auroras.forEach((a) => {
        const x = (a.cx + Math.sin(time * a.sx) * a.ax) * W;
        const y = (a.cy + Math.cos(time * a.sy) * a.ay) * H;
        const r = a.r * (Math.max(W, H) / 700);
        ctx.globalAlpha = a.alpha * (0.85 + Math.sin(time * 0.2 + a.cx * 9) * 0.15);
        ctx.drawImage(a.sprite, x - r, y - r, r * 2, r * 2);
      });
      ctx.restore();

      const ox = px - 0.5;
      const oy = py - 0.5;
      stars.forEach((s) => {
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase));
        const sx = s.x * W + ox * -26 * s.depth;
        const sy = s.y * H + oy * -16 * s.depth;
        const sz = s.size * 3.4 * (0.8 + tw * 0.35);
        ctx.globalAlpha = tw * (s.gold ? 0.95 : 0.85);
        ctx.drawImage(s.gold ? goldSprite : starSprite, sx - sz / 2, sy - sz / 2, sz, sz);
      });
      ctx.globalAlpha = 1;

      drawRibbon(time);
      if (W >= 1024) pages.forEach((p) => drawPage(p, time));
    };

    const updateShooting = (time: number, dt: number) => {
      if (!shooting && time > nextShoot) {
        shooting = {
          x: rand(0.15, 0.65) * W,
          y: rand(0.05, 0.25) * H,
          vx: rand(380, 560),
          vy: rand(120, 210),
          life: 0,
        };
        nextShoot = time + rand(9, 17);
      }
      if (!shooting) return;
      shooting.life += dt;
      shooting.x += shooting.vx * dt;
      shooting.y += shooting.vy * dt;
      const a = Math.max(0, 1 - shooting.life / 1.1);
      if (a <= 0 || shooting.x > W + 100) {
        shooting = null;
        return;
      }
      const tail = 90;
      const len = Math.hypot(shooting.vx, shooting.vy);
      const nx = shooting.vx / len;
      const ny = shooting.vy / len;
      const grad = ctx.createLinearGradient(shooting.x, shooting.y, shooting.x - nx * tail, shooting.y - ny * tail);
      grad.addColorStop(0, `rgba(255,255,255,${0.9 * a})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shooting.x, shooting.y);
      ctx.lineTo(shooting.x - nx * tail, shooting.y - ny * tail);
      ctx.stroke();
    };

    const drawParticles = (dt: number) => {
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.t += dt;
        const a = 1 - rp.t / 0.9;
        if (a <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(255,209,102,${a * 0.7})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, 8 + rp.t * 90, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.t += dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        const fa = 1 - f.t / 1.8;
        if (fa <= 0) {
          floaters.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = fa;
        const s = f.sprite;
        ctx.drawImage(s, f.x - (s.width * f.scale) / 2, f.y - (s.height * f.scale) / 2, s.width * f.scale, s.height * f.scale);
        ctx.globalAlpha = 1;
      }
    };

    const drawStatic = () => {
      px = 0.5;
      py = 0.5;
      drawBase(1.8);
      drawParticles(0);
    };

    const resize = () => {
      const rect = section.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.round(rect.width);
      H = Math.round(rect.height);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
      if (reduceMotion) drawStatic();
    };

    let last = 0;
    const frame = (ms: number) => {
      const time = ms / 1000;
      const dt = Math.min(0.05, time - last);
      last = time;
      px += (tx - px) * 0.04;
      py += (ty - py) * 0.04;
      drawBase(time);
      updateShooting(time, dt);
      drawParticles(dt);
      rafId = requestAnimationFrame(frame);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = section.getBoundingClientRect();
      tx = (e.clientX - rect.left) / rect.width;
      ty = (e.clientY - rect.top) / rect.height;
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a, button')) return;
      const rect = section.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      playNote(y / rect.height);
      ripples.push({ x, y, t: 0 });
      floaters.push({
        x,
        y,
        vx: rand(-10, 10),
        vy: -rand(28, 44),
        t: 0,
        sprite: glyphSprites[Math.floor(Math.random() * glyphSprites.length)],
        scale: rand(0.9, 1.25),
      });
      if (reduceMotion) drawStatic();
    };

    section.addEventListener('pointermove', onPointerMove);
    section.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', resize);

    resize();
    if (reduceMotion) {
      drawStatic();
    } else {
      rafId = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(rafId);
      section.removeEventListener('pointermove', onPointerMove);
      section.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', resize);
      if (audioCtx) void audioCtx.close();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />
      <div className="absolute bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-10 pointer-events-none font-rounded text-sm text-white/75 bg-night-deep/45 border border-white/15 px-5 py-2 rounded-full backdrop-blur-sm whitespace-nowrap">
        {t.hero.skyHint}
      </div>
      <button
        type="button"
        onClick={() => setSoundOn((s) => !s)}
        aria-pressed={soundOn}
        className="absolute bottom-28 sm:bottom-32 right-4 sm:right-8 z-10 pointer-events-auto inline-flex items-center gap-2 font-rounded text-sm text-white/85 bg-night-deep/55 border border-white/20 px-4 py-2 rounded-full backdrop-blur-sm hover:bg-night-deep/80 transition"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5 6 9H2v6h4l5 4V5z" />
          {soundOn ? (
            <>
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </>
          ) : (
            <>
              <line x1="22" y1="9" x2="16" y2="15" />
              <line x1="16" y1="9" x2="22" y2="15" />
            </>
          )}
        </svg>
        {soundOn ? t.hero.soundOn : t.hero.soundOff}
      </button>
    </>
  );
}
