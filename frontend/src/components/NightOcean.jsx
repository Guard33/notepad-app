import { useEffect, useRef } from "react";

// Animated pixel-art night ocean: stepped sky, twinkling stars, a crescent
// moon, and rough, peaky waves with bright crest lines, whitecaps and spray,
// plus a shimmering moon path.
//
// It's drawn into a small canvas (one canvas pixel = PIXEL css pixels) and
// scaled up with `image-rendering: pixelated`, so it stays crisp and costs
// very little. It runs at a low frame rate, is still for anyone who prefers
// reduced motion, and pauses when off screen or in a background tab.
const PIXEL = 5;
const FPS = 12;

const SKY = ["#070b1d", "#080e24", "#0a122b", "#0c1632", "#0f1a3a", "#121f42", "#15244a", "#182951"];
const WATER = ["#2a4c80", "#22416f", "#1b3761", "#152d53", "#102445", "#0b1b37", "#07132a"];
const CREST = "#5a82bb";
const FOAM = "#b9d0ee";
const STAR = [233, 236, 247];
const MOON = "#f2eed8";
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
  const r = Math.max(4, Math.min(7, Math.round(Math.min(w, h) * 0.05)));
  const moon = wide
    ? { x: Math.round(w * 0.5), y: Math.round(horizon * 0.17), r }
    : { x: w - r - 4, y: r + 4, r };
  // Nearer layers are taller, longer and faster, like a real swell.
  const crest = rgb(CREST);
  const layers = WATER.map((color, i) => {
    const c = rgb(color);
    return {
      color: c,
      // Each layer's top edge gets a lighter line so every wave reads clearly.
      edge: c.map((v, k) => Math.round(v + (crest[k] - v) * 0.55)),
      base: horizon + Math.round((h - horizon) * Math.pow(i / WATER.length, 1.15)) + 2,
      amp: 1.4 + i * 1.15,
      freq: 0.12 - i * 0.01,
      speed: 0.9 + i * 0.22,
      phase: rand() * Math.PI * 2,
      dir: i % 2 ? -1 : 1,
    };
  });
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

  // Crescent moon: the moon's disc minus a second disc nudged up and to
  // the right, with a faint halo around the lit edge.
  const { moon } = scene;
  const [mr, mg, mb] = rgb(MOON);
  const cut = { x: moon.r * 0.5, y: -moon.r * 0.25, r: moon.r * 0.92 };
  for (let dy = -moon.r * 2; dy <= moon.r * 2; dy++) {
    for (let dx = -moon.r * 2; dx <= moon.r * 2; dx++) {
      const d = Math.hypot(dx, dy);
      const inCut = Math.hypot(dx - cut.x, dy - cut.y) <= cut.r;
      if (d <= moon.r && !inCut) {
        put(moon.x + dx, moon.y + dy, mr, mg, mb);
      } else if (d > moon.r && d <= moon.r * 2 && !inCut) {
        put(moon.x + dx, moon.y + dy, mr, mg, mb, 0.08 * (1 - (d - moon.r) / moon.r));
      }
    }
  }

  // Waves, back to front. The shape is a skewed, sharpened sine: narrow
  // pointed crests with a steep leading face and wide troughs, plus some
  // cross-chop. Every layer gets a bright top edge; high crests on the
  // nearer layers break into whitecaps and throw a little spray.
  const foam = rgb(FOAM);
  const water = new Int16Array(w);
  scene.layers.forEach((L, i) => {
    for (let x = 0; x < w; x++) {
      let p = x * L.freq + t * L.speed * L.dir + L.phase;
      p += 0.55 * Math.sin(p) * L.dir; // lean the crest forward
      const u = (Math.sin(p) + 1) / 2;
      const peak = Math.pow(u, 2.4);
      const chop = Math.sin(x * L.freq * 2.6 - t * L.speed * 0.8 * L.dir + i);
      const y = Math.round(L.base + L.amp * (0.45 - 1.25 * peak) + L.amp * 0.28 * chop);
      const top = Math.max(y, scene.horizon);
      for (let yy = top; yy < h; yy++) put(x, yy, ...L.color);
      if (y >= scene.horizon) {
        put(x, y, ...L.edge);
        if (i >= 2 && peak > 0.72) {
          put(x, y, ...foam, 0.85);
          if (i >= 3) put(x, y + 1, ...foam, 0.45);
        }
        if (i >= 3 && peak > 0.9 && hash(x, i, Math.floor(t * 4)) > 0.55) {
          put(x, y - 1 - Math.floor(hash(i, x, Math.floor(t * 4)) * 3), ...foam, 0.7);
        }
      }
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
