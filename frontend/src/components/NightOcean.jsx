import { useEffect, useRef } from "react";

// Animated pixel-art night ocean: stepped sky, twinkling stars, a pixel
// moon and slow rolling waves with a shimmering moon path.
//
// It's drawn into a small canvas (one canvas pixel = PIXEL css pixels) and
// scaled up with `image-rendering: pixelated`, so it stays crisp and costs
// very little. It runs at a low frame rate, is still for anyone who prefers
// reduced motion, and pauses when off screen or in a background tab.
const PIXEL = 5;
const FPS = 12;

const SKY = ["#070b1d", "#080e24", "#0a122b", "#0c1632", "#0f1a3a", "#121f42", "#15244a", "#182951"];
const WATER = ["#22406f", "#1c3762", "#172f56", "#12274a", "#0e1f3e", "#0a1832", "#071226"];
const CREST = "#3f6496";
const FOAM = "#8fb0d9";
const STAR = [233, 236, 247];
const MOON = "#f2eed8";
const MOON_SHADE = "#d9d3b4";
const SHIMMER = [214, 224, 240];

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cheap deterministic per-pixel noise for the shimmer.
const hash = (x, y, t) => {
  let h = (x * 374761393 + y * 668265263 + t * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function buildScene(w, h) {
  const horizon = Math.round(h * 0.66);
  const rand = rng(20260522);
  const stars = [];
  const count = Math.round((w * horizon) / 70);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.floor(rand() * w),
      y: Math.floor(rand() * (horizon - 4)),
      base: 0.35 + rand() * 0.65,
      speed: 0.15 + rand() * 0.35,
      phase: rand() * Math.PI * 2,
      big: rand() < 0.05,
    });
  }
  // Desktop: centred in the gap between the headline and the posters.
  // Narrow screens: tucked into the top-right corner, clear of the text.
  const wide = w * PIXEL >= 768;
  const r = Math.max(3, Math.min(6, Math.round(Math.min(w, h) * 0.04)));
  const moon = wide
    ? { x: Math.round(w * 0.5), y: Math.round(horizon * 0.17), r }
    : { x: w - r - 4, y: r + 4, r };
  const layers = WATER.map((color, i) => ({
    color: rgb(color),
    base: horizon + Math.round(((h - horizon) * Math.pow(i / WATER.length, 1.25)) + 1),
    amp: 0.6 + i * 0.55,
    freq: 0.09 - i * 0.008,
    speed: 0.45 + i * 0.12,
    phase: rand() * Math.PI * 2,
    dir: i % 2 ? -1 : 1,
  }));
  return { horizon, stars, moon, layers };
}

function draw(ctx, img, w, h, scene, t) {
  const buf = img.data;
  const put = (x, y, r, g, b, a = 1) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    buf[i] = buf[i] * (1 - a) + r * a;
    buf[i + 1] = buf[i + 1] * (1 - a) + g * a;
    buf[i + 2] = buf[i + 2] * (1 - a) + b * a;
    buf[i + 3] = 255;
  };

  // Sky: stepped bands, darkest at the top. Painted over the full height so
  // rows between the horizon and a wave trough never show through.
  const band = scene.horizon / SKY.length;
  for (let y = 0; y < h; y++) {
    const [r, g, b] = rgb(SKY[Math.min(SKY.length - 1, Math.floor(y / band))]);
    for (let x = 0; x < w; x++) put(x, y, r, g, b);
  }

  // Stars, twinkling slowly.
  for (const s of scene.stars) {
    const a = s.base * (0.55 + 0.45 * Math.sin(t * s.speed + s.phase));
    put(s.x, s.y, ...STAR, a);
    if (s.big && a > 0.6) {
      put(s.x - 1, s.y, ...STAR, a * 0.35);
      put(s.x + 1, s.y, ...STAR, a * 0.35);
      put(s.x, s.y - 1, ...STAR, a * 0.35);
      put(s.x, s.y + 1, ...STAR, a * 0.35);
    }
  }

  // Moon: soft halo, then a pixel disc with a couple of darker patches.
  const { moon } = scene;
  const [mr, mg, mb] = rgb(MOON);
  const [sr, sg, sb] = rgb(MOON_SHADE);
  for (let dy = -moon.r * 2; dy <= moon.r * 2; dy++) {
    for (let dx = -moon.r * 2; dx <= moon.r * 2; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= moon.r) {
        const shade = (dx > 0 && dy < 0 && dx * dx + dy * dy < moon.r * moon.r * 0.18) || (dx < -1 && dy > 1 && dx > -moon.r * 0.7);
        put(moon.x + dx, moon.y + dy, ...(shade ? [sr, sg, sb] : [mr, mg, mb]));
      } else if (d <= moon.r * 2) {
        put(moon.x + dx, moon.y + dy, mr, mg, mb, 0.07 * (1 - (d - moon.r) / moon.r));
      }
    }
  }

  // Waves, back to front. Each layer is a filled sine band; crests get a
  // lighter pixel, and the nearest layers get the odd fleck of foam.
  const crest = rgb(CREST);
  const foam = rgb(FOAM);
  const water = new Int16Array(w);
  scene.layers.forEach((L, i) => {
    for (let x = 0; x < w; x++) {
      const p = x * L.freq + t * L.speed * L.dir + L.phase;
      const y = Math.round(L.base + L.amp * Math.sin(p) + L.amp * 0.4 * Math.sin(p * 2.3 + t * 0.3));
      for (let yy = Math.max(y, scene.horizon); yy < h; yy++) put(x, yy, ...L.color);
      const peak = Math.cos(p) > 0.85 || Math.cos(p) < -0.97;
      if (y >= scene.horizon && peak) put(x, y, ...(i >= 4 && hash(x, i, Math.floor(t * 2)) > 0.8 ? foam : crest));
      if (i === 0) water[x] = y;
    }
  });

  // Moon path: a column of flickering pixels that widens toward the viewer.
  for (let y = scene.horizon + 1; y < h; y++) {
    const depth = (y - scene.horizon) / (h - scene.horizon);
    const spread = Math.round(moon.r * 0.6 + depth * moon.r * 2.2);
    for (let x = moon.x - spread; x <= moon.x + spread; x++) {
      if (y < water[x]) continue;
      const edge = 1 - Math.abs(x - moon.x) / (spread + 1);
      if (hash(x, y, Math.floor(t * 1.2)) < 0.14 * edge) put(x, y, ...SHIMMER, 0.35 * edge + 0.1);
    }
  }

  ctx.putImageData(img, 0, 0);
}

export default function NightOcean({ className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let img = null;
    let scene = null;
    let t = 0;
    let timer = null;
    let visible = true;

    const frame = () => {
      if (img) draw(ctx, img, w, h, scene, t);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.ceil(rect.width / PIXEL));
      h = Math.max(1, Math.ceil(rect.height / PIXEL));
      canvas.width = w;
      canvas.height = h;
      img = ctx.createImageData(w, h);
      scene = buildScene(w, h);
      frame();
    };

    const start = () => {
      if (still || timer || !visible || document.hidden) return;
      timer = setInterval(() => {
        t += 1 / FPS;
        frame();
      }, 1000 / FPS);
    };
    const stop = () => {
      clearInterval(timer);
      timer = null;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(canvas);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    resize();
    start();
    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} style={{ imageRendering: "pixelated" }} aria-hidden="true" />;
}
