/**
 * fx.js, ohňostroje v pozadí (motiv rachejtlí).
 *
 * Jemné a levné na baterku: málo částic, pauza když je karta schovaná,
 * vypnuto při prefers-reduced-motion. burst(n) přidá salvu, třeba při "TEĎ!".
 */

const COLORS = ["#ffd166", "#ff8a3d", "#ff5d8f", "#f4f4ff", "#8aa0ff"];

let canvas = null;
let ctx = null;
let parts = [];
let raf = 0;
let lastAuto = 0;
let level = 0.35; // jak často samo bouchá, 0 až 1
const reduced =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function resize() {
  if (!canvas) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function spawn(x, y, count) {
  if (parts.length > 260) return;
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const sp = 0.8 + Math.random() * 1.8;
    parts.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 1,
      decay: 0.014 + Math.random() * 0.012,
      color: Math.random() < 0.2 ? "#f4f4ff" : color,
      r: 1.2 + Math.random() * 1.4,
    });
  }
}

function frame(ts) {
  raf = requestAnimationFrame(frame);
  if (document.hidden) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);

  if (level > 0 && ts - lastAuto > 2600 / level) {
    lastAuto = ts;
    spawn(w * (0.1 + Math.random() * 0.8), h * (0.08 + Math.random() * 0.35), 26 + Math.floor(Math.random() * 18));
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.vx *= 0.985;
    p.vy = p.vy * 0.985 + 0.025;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) {
      parts.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = Math.max(0, p.life) * 0.45;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function initFx(el) {
  if (reduced || !el || !el.getContext) return;
  canvas = el;
  ctx = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
  raf = requestAnimationFrame(frame);
}

export function setFxLevel(v) {
  level = Math.max(0, Math.min(1, v));
}

export function burst(n = 3) {
  if (!ctx) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (let i = 0; i < n; i++) {
    setTimeout(() => spawn(w * (0.15 + Math.random() * 0.7), h * (0.15 + Math.random() * 0.4), 30), i * 220);
  }
}
