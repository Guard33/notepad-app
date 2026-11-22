import { useEffect, useRef } from "react";

// Animated pixel-art night ocean: stepped sky, twinkling stars, a crescent
// moon, and rows of breaking waves: each one slowly builds into a steep
// swell, crashes forward with a little spray, then washes out as a band of
// foam before the next one builds. Plus a gently shimmering moon path.
//
// It's drawn into a small canvas (one canvas pixel = PIXEL css pixels) and
// scaled up with `image-rendering: pixelated`, so it stays crisp and costs
// very little. It runs at a low frame rate, is still for anyone who prefers
// reduced motion, and pauses when off screen or in a background tab.
const PIXEL = 5;
const FPS = 15;

const SKY = ["#070b1d", "#080e24", "#0a122b", "#0c1632", "#0f1a3a", "#121f42", "#15244a", "#182951"];
const WATER = ["#2a4c80", "#22416f", "#1b3761", "#152d53", "#102445", "#0b1b37", "#07132a"];
const CREST = "#5a82bb";
const FOAM = "#d3e2f5";
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
  // Each water layer has a gentle background swell plus a few "breakers":
  // waves that ride along the layer, build up, crash and wash out on their
  // own cycle. Nearer layers get bigger, wider, faster breakers.
  const crest = rgb(CREST);
  const layers = WATER.map((color, i) => {
    const c = rgb(color);
    const depth = i / (WATER.length - 1); // 0 = far, 1 = near
    const spacing = 70 + depth * 70;
    const breakers = [];
    for (let x = -rand() * spacing; x < w + spacing; x += spacing * (0.8 + rand() * 0.5)) {
      breakers.push({
        x0: x,
        period: 7 + rand() * 5, // seconds per build-crash-wash cycle
        offset: rand() * 12,
        height: (2.5 + depth * 11) * (0.8 + rand() * 0.4),
        back: 12 + depth * 22, // long gentle back slope
        front: 5 + depth * 8, // short steep face
      });
    }
    return {
      color: c,
      // Each layer's top edge gets a lighter line so every wave reads clearly.
      edge: c.map((v, k) => Math.round(v + (crest[k] - v) * 0.5)),
      base: horizon + Math.round((h - horizon) * Math.pow(i / WATER.length, 1.1)) + 2,
      swellAmp: 0.4 + depth * 0.9,
      swellFreq: 0.045 - depth * 0.015,
      speed: 1.2 + depth * 3, // canvas px per second, all drifting the same way
      phase: rand() * Math.PI * 2,
      breakers,
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

  // Waves, back to front.
  const foam = rgb(FOAM);
  const bright = rgb(CREST);
  const water = new Int16Array(w);
  const ss = (a) => (a <= 0 ? 0 : a >= 1 ? 1 : a * a * (3 - 2 * a)); // smoothstep
  const BUILD = 0.6; // fraction of the cycle spent building up
  const CRASH = 0.72; // by here the crest has collapsed
  scene.layers.forEach((L, i) => {
    const span = w + 60;
    // Where each breaker is and what stage of its life it's in this frame.
    const live = L.breakers.map((B, id) => {
      const cycle = (t + B.offset) / B.period;
      const s = cycle - Math.floor(cycle);
      const xc = ((((B.x0 + t * L.speed) % span) + span) % span) - 30;
      let height;
      if (s < BUILD) height = B.height * ss(s / BUILD) ** 1.3;
      else if (s < CRASH) height = B.height * (1 - ss((s - BUILD) / (CRASH - BUILD))) * 0.85 + B.height * 0.15;
      else height = B.height * 0.15 * (1 - (s - CRASH) / (1 - CRASH));
      // The face gets steeper as the wave builds, right up to the crash.
      const front = B.front * (1 - 0.55 * ss(Math.min(s, BUILD) / BUILD));
      return { B, id, s, xc, height, front, seed: Math.floor(cycle) * 131 + id * 17 + i };
    });

    for (let x = 0; x < w; x++) {
      let lift = 0;
      let crestBoost = 0;
      let whitecap = 0;
      for (const b of live) {
        const dx = x - b.xc;
        const width = dx < 0 ? b.B.back : b.front;
        const prof = Math.exp(-((dx / width) ** 2));
        lift += b.height * prof;
        if (b.s > 0.3 && b.s < CRASH && prof > 0.55) crestBoost = Math.max(crestBoost, ss((b.s - 0.3) / 0.3));
        // As the crest tips over it turns white from the top down.
        if (b.s > BUILD - 0.07 && b.s < CRASH + 0.04 && prof > 0.4 && dx > -b.B.back * 0.35) {
          const k = (b.s - (BUILD - 0.07)) / (CRASH + 0.04 - (BUILD - 0.07));
          whitecap = Math.max(whitecap, Math.sin(Math.PI * k) * prof);
        }
      }
      const swell = L.swellAmp * Math.sin(x * L.swellFreq - t * 0.35 + L.phase);
      const y = Math.round(L.base + swell - lift);
      for (let yy = Math.max(y, scene.horizon); yy < h; yy++) put(x, yy, ...L.color);
      if (y >= scene.horizon) {
        put(x, y, ...L.edge);
        // The crest line brightens as a wave steepens toward breaking.
        if (crestBoost > 0) put(x, y, ...bright, 0.75 * crestBoost);
        if (whitecap > 0.15 && i >= 1) {
          const rows = 1 + Math.round(whitecap * (1 + i * 0.5));
          for (let r = 0; r < rows; r++) put(x, y + r, ...foam, Math.min(1, whitecap * 1.2) * (1 - r / (rows + 1)));
        }
      }
      if (i === 0) water[x] = y;
    }

    // Crash and wash: foam that tumbles off the crest and spreads forward,
    // then fades. The pattern is fixed per cycle, so it slides smoothly with
    // the water instead of flickering.
    for (const b of live) {
      if (b.s < BUILD - 0.04 || i < 1) continue;
      const k = (b.s - (BUILD - 0.04)) / (1 - BUILD + 0.04); // 0 → 1 over crash + wash
      const alpha = k < 0.25 ? ss(k / 0.25) : 1 - ss((k - 0.25) / 0.75);
      const reach = b.front * 0.5 + k * (b.front * 3 + 6);
      const tail = b.B.back * 0.25;
      for (let x = Math.floor(b.xc - tail); x <= Math.ceil(b.xc + reach); x++) {
        if (x < 0 || x >= w) continue;
        if (hash(x - Math.round(b.xc), b.seed, 7) > 0.72 - 0.2 * (1 - k)) continue;
        // Find this column's water surface again (cheap: re-run the sum).
        let lift = 0;
        for (const o of live) {
          const dx = x - o.xc;
          lift += o.height * Math.exp(-((dx / (dx < 0 ? o.B.back : o.front)) ** 2));
        }
        const y = Math.round(L.base + L.swellAmp * Math.sin(x * L.swellFreq - t * 0.35 + L.phase) - lift);
        if (y < scene.horizon) continue;
        put(x, y, ...foam, 0.95 * alpha);
        if (i >= 2) put(x, y + 1, ...foam, 0.6 * alpha);
        if (i >= 4) put(x, y + 2, ...foam, 0.3 * alpha);
      }
      // Spray: a few droplets arc up and fall back as the crest goes over.
      const sk = (b.s - (BUILD - 0.02)) / 0.16;
      if (i >= 3 && sk > 0 && sk < 1) {
        for (let j = 0; j < 4; j++) {
          const dx = Math.round(b.front * (0.2 + hash(j, b.seed, 3) * 1.2) + sk * 4);
          const up = (2 + hash(b.seed, j, 5) * 3) * Math.sin(Math.PI * sk);
          const crestY = Math.round(L.base - b.height * 0.9);
          put(Math.round(b.xc) + dx, crestY - Math.round(up), ...foam, 0.75 * (1 - sk * 0.6));
        }
      }
    }
  });

  // Moon path: a column of flickering pixels that widens toward the viewer.
  for (let y = scene.horizon + 1; y < h; y++) {
    const depth = (y - scene.horizon) / (h - scene.horizon);
    const spread = Math.round(moon.r * 0.6 + depth * moon.r * 2.2);
    for (let x = moon.x - spread; x <= moon.x + spread; x++) {
      if (y < water[x]) continue;
      const edge = 1 - Math.abs(x - moon.x) / (spread + 1);
      if (hash(x, y, Math.floor(t * 0.6)) < 0.12 * edge) put(x, y, ...SHIMMER, 0.3 * edge + 0.1);
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
