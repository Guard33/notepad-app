import { useEffect, useRef } from "react";

// Animated pixel-art moonlit sea: a deep-blue starry sky with a full moon
// and soft glow, a dark band of distant land on the horizon, a calm sea with
// slow ripples and a glittering moon path, and a beach in the lower right
// where gentle waves wash up in a lace of foam and slide back out.
//
// The static parts (sky, glow, moon, land, sea and sand colours) are drawn
// once per size into a base image with ordered dithering for that retro
// pixel-art gradient. Each frame copies the base and adds only what moves.
// It's drawn small (1 canvas px = PIXEL css px) and scaled up with
// `image-rendering: pixelated`, runs at a low frame rate, is still for
// anyone who prefers reduced motion, and pauses off screen.
const PIXEL = 4;
const FPS = 15;

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const C = {
  skyTop: hex("#050f26"),
  skyLow: hex("#1c3a6c"),
  glow: hex("#5a7db3"),
  land: hex("#0a1329"),
  seaFar: hex("#1a3666"),
  seaNear: hex("#07142d"),
  ripple: hex("#3d629b"),
  moon: hex("#f6f0da"),
  moonShade: hex("#cbc2a3"),
  moonRim: hex("#ddd5b6"),
  glitterWarm: hex("#f6eec8"),
  glitterCool: hex("#b9cdee"),
  sand: hex("#120f1e"),
  sandLight: hex("#1b1729"),
  wetSand: hex("#18203b"),
  shallow: hex("#203f6e"),
  foam: hex("#d8e5f6"),
  star: hex("#e9ecf7"),
};

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ss = (a) => (a <= 0 ? 0 : a >= 1 ? 1 : a * a * (3 - 2 * a));

// 4x4 ordered (Bayer) dithering: snaps a smooth colour to a few levels per
// channel in a fixed pattern, which is what gives pixel-art gradients their
// look instead of a flat blur.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function dither(c, x, y, step = 8) {
  const o = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * step;
  return c.map((v) => Math.max(0, Math.min(255, Math.round((v + o) / step) * step)));
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

const hash = (x, y, z = 0) => {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function buildScene(w, h) {
  const rand = rng(20261122);
  const horizon = Math.round(h * 0.6);
  const wide = w * PIXEL >= 768;
  const r = Math.max(5, Math.min(10, Math.round(Math.min(w, h) * 0.07)));
  // Desktop: in the gap between the headline and the posters.
  // Narrow screens: top-right corner, clear of the text.
  const moon = wide ? { x: Math.round(w * 0.5), y: Math.round(horizon * 0.34), r } : { x: w - r - 5, y: r + 5, r };

  // Distant land: a low, softly uneven dark band sitting on the horizon.
  const bandH = Math.max(3, Math.round(h * 0.045));
  const landTop = new Int16Array(w);
  for (let x = 0; x < w; x++) {
    landTop[x] = horizon - Math.round(bandH * (0.55 + 0.25 * Math.sin(x * 0.031 + 1) + 0.2 * Math.sin(x * 0.087 + 2)));
  }

  // Beach: the shoreline runs diagonally from the right edge near the
  // horizon down to the middle of the bottom edge.
  const shoreX = new Float32Array(h);
  for (let y = 0; y < h; y++) {
    const d = Math.max(0, (y - horizon) / (h - horizon));
    shoreX[y] = y <= horizon ? w + 10 : w * (1.04 - 0.5 * Math.pow(d, 1.05));
  }

  // Crater patches on the moon (relative to its centre).
  const craters = [];
  for (let i = 0; i < 6; i++) {
    const a = rand() * Math.PI * 2;
    const dist = rand() * r * 0.6;
    craters.push({ x: Math.cos(a) * dist, y: Math.sin(a) * dist, r: r * (0.1 + rand() * 0.13) });
  }

  // Static base image.
  const base = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let c;
      const dm = Math.hypot(x - moon.x, y - moon.y);
      if (y < landTop[x]) {
        c = mix(C.skyTop, C.skyLow, Math.pow(y / horizon, 1.3));
        c = mix(c, C.glow, 0.5 * Math.exp(-((dm / (r * 5)) ** 2)));
      } else if (y < horizon) {
        c = mix(C.land, C.skyLow, y === landTop[x] ? 0.25 : 0);
      } else if (x >= shoreX[y]) {
        c = mix(C.sand, C.sandLight, hash(x, y, 3) * 0.6);
      } else {
        const d = (y - horizon) / (h - horizon);
        c = mix(C.seaFar, C.seaNear, Math.pow(d, 0.8));
        // A broad, faint glow on the water under the moon.
        const spread = r * 1.5 + d * r * 3.5;
        c = mix(c, C.glow, 0.28 * (1 - d * 0.5) * Math.exp(-(((x - moon.x) / spread) ** 2)));
      }
      // The moon itself: a full disc, slightly darker at the rim, with
      // soft crater patches.
      if (dm <= r) {
        c = dm > r - 1 ? C.moonRim : C.moon;
        for (const k of craters) {
          if (Math.hypot(x - moon.x - k.x, y - moon.y - k.y) <= k.r) c = mix(c, C.moonShade, 0.45);
        }
      }
      const i = (y * w + x) * 4;
      const [cr, cg, cb] = dm <= r ? c.map(Math.round) : dither(c, x, y);
      base[i] = cr;
      base[i + 1] = cg;
      base[i + 2] = cb;
      base[i + 3] = 255;
    }
  }

  const stars = [];
  const starCount = Math.round((w * horizon) / 45);
  for (let i = 0; i < starCount; i++) {
    const x = Math.floor(rand() * w);
    const y = Math.floor(rand() * horizon);
    if (y >= landTop[x] - 1 || Math.hypot(x - moon.x, y - moon.y) < r * 2.2) continue;
    stars.push({ x, y, base: 0.25 + rand() * 0.75, speed: 0.15 + rand() * 0.4, phase: rand() * 6.28, big: rand() < 0.06 });
  }

  // Ripples: short horizontal glints, longer and more spread out up close.
  const ripples = [];
  const rippleCount = Math.round((w * (h - horizon)) / 20);
  for (let i = 0; i < rippleCount; i++) {
    const d = Math.pow(rand(), 0.85);
    ripples.push({
      x: rand() * w,
      y: horizon + 1 + Math.floor(d * (h - horizon - 2)),
      len: 1 + Math.floor(rand() * (1 + d * 6)),
      drift: 0.4 + d * 1.6,
      speed: 0.3 + rand() * 0.6,
      phase: rand() * 6.28,
    });
  }

  // Moon path: dashes clustered under the moon, widening toward the viewer,
  // each twinkling on its own slow cycle.
  const glitter = [];
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
  for (let y = horizon + 1; y < h; y++) {
    const d = (y - horizon) / (h - horizon);
    const spread = r * 0.5 + d * r * 2.6;
    const n = 1 + Math.floor(d * 3 + rand() * 2);
    for (let k = 0; k < n; k++) {
      const off = gauss() * spread;
      glitter.push({
        x: Math.round(moon.x + off),
        y,
        len: 1 + Math.floor(rand() * (1 + d * 4)),
        warmth: 1 - Math.min(1, Math.abs(off) / (spread + 1)),
        speed: 0.5 + rand() * 1.1,
        phase: rand() * 6.28,
      });
    }
  }

  return { horizon, moon, landTop, shoreX, base, stars, ripples, glitter };
}

function draw(ctx, img, w, h, scene, t) {
  const buf = img.data;
  buf.set(scene.base);
  const put = (x, y, c, a = 1) => {
    x |= 0;
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    buf[i] += (c[0] - buf[i]) * a;
    buf[i + 1] += (c[1] - buf[i + 1]) * a;
    buf[i + 2] += (c[2] - buf[i + 2]) * a;
  };
  const { horizon, shoreX } = scene;

  for (const s of scene.stars) {
    const a = s.base * (0.6 + 0.4 * Math.sin(t * s.speed + s.phase));
    put(s.x, s.y, C.star, a);
    if (s.big && a > 0.55) {
      put(s.x - 1, s.y, C.star, a * 0.3);
      put(s.x + 1, s.y, C.star, a * 0.3);
      put(s.x, s.y - 1, C.star, a * 0.3);
      put(s.x, s.y + 1, C.star, a * 0.3);
    }
  }

  // Where the water reaches on the beach this frame. Each wave runs up
  // quickly and drains back slowly; rows further down (closer) get bigger
  // waves, and the wave reaches the far end of the beach a little earlier,
  // so it sweeps along the shore.
  const PERIOD = 9;
  const edge = new Float32Array(h);
  const reach = new Float32Array(h);
  for (let y = horizon + 1; y < h; y++) {
    const d = (y - horizon) / (h - horizon);
    const u = (((t - (1 - d) * 1.4) / PERIOD) % 1 + 1) % 1;
    const f = u < 0.3 ? ss(u / 0.3) : 1 - ss((u - 0.3) / 0.7);
    reach[y] = f;
    edge[y] = shoreX[y] + (f - 0.4) * (2 + d * 13);
  }
  const onWater = (x, y) => y > horizon && x < Math.min(edge[y], shoreX[y] + 50);

  for (const rp of scene.ripples) {
    const x0 = (((rp.x + t * rp.drift) % w) + w) % w;
    const a = 0.25 + 0.25 * Math.sin(t * rp.speed + rp.phase);
    for (let k = 0; k < rp.len; k++) if (onWater(x0 + k, rp.y) && x0 + k < edge[rp.y] - 2) put(x0 + k, rp.y, C.ripple, a);
  }

  for (const g of scene.glitter) {
    const tw = 0.5 + 0.5 * Math.sin(t * g.speed + g.phase);
    const a = 0.12 + 0.8 * tw * tw;
    const c = mix(C.glitterCool, C.glitterWarm, g.warmth);
    for (let k = 0; k < g.len; k++) if (g.x + k < edge[g.y] - 1) put(g.x + k, g.y, c, a);
  }

  // Beach: shallow water over the sand while a wave is up, darker wet sand
  // as it drains, and a lace of foam along the moving edge.
  for (let y = horizon + 1; y < h; y++) {
    const s = shoreX[y];
    if (s >= w + 5) continue;
    const e = edge[y];
    const d = (y - horizon) / (h - horizon);
    for (let x = Math.floor(Math.min(s, e)) - 1; x <= Math.ceil(Math.max(s, e)) + 1; x++) {
      if (x < 0 || x >= w) continue;
      if (x >= s && x < e) put(x, y, C.shallow, 0.85);
      else if (x < s && x >= e) put(x, y, C.wetSand, 0.9);
    }
    // Foam lace: densest right at the edge, thinning out behind it.
    const width = 2 + d * 10 * (0.55 + 0.45 * reach[y]);
    for (let x = Math.floor(e - width); x <= Math.floor(e); x++) {
      const k = (e - x) / width; // 0 at the edge, 1 at the back
      if (hash(x - Math.round(e), y, 9) < 0.92 - k * 0.55) put(x, y, C.foam, (1 - k * 0.6) * (0.7 + 0.3 * reach[y]));
    }
    // A thin line of foam left behind on the sand as the water drains.
    if (reach[y] < 0.6) {
      const left = s + (0.6 - 0.4) * (2 + d * 13);
      if (hash(Math.round(left), y, 4) < 0.6) put(left, y, C.foam, 0.25 * (1 - reach[y] / 0.6));
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
