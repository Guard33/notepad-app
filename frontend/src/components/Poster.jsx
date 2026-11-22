import { memo, useId, useMemo } from "react";

// Generative posters. A product stores only { style, seed, palette }; this
// component turns that recipe into SVG. The same seed always draws the same
// poster, so the catalog needs no image files at all.
//
// Geometry: A-series paper (1 : √2). Artwork sits inside a white border
// with a small gallery-style caption underneath.
const W = 100;
const H = 141.4;
const ART = { x: 7, y: 7, w: 86, h: 112 };

function rng(seed) {
  // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => Math.round(n * 100) / 100;

function waves({ palette }, rand) {
  const [bg, ...inks] = palette;
  const layers = 8;
  const shapes = [<rect key="bg" x={ART.x} y={ART.y} width={ART.w} height={ART.h} fill={bg} />];
  for (let i = 0; i < layers; i++) {
    const base = ART.y + ART.h * (0.22 + (i / layers) * 0.78);
    const amp = 2 + rand() * 4;
    const freq = 0.05 + rand() * 0.09;
    const phase = rand() * Math.PI * 2;
    const amp2 = rand() * 1.6;
    const freq2 = 0.2 + rand() * 0.2;
    let d = `M${ART.x} ${ART.y + ART.h}`;
    for (let x = 0; x <= ART.w; x += 1.5) {
      const y = base + amp * Math.sin(freq * x + phase) + amp2 * Math.sin(freq2 * x + phase * 2);
      d += ` L${f(ART.x + x)} ${f(y)}`;
    }
    d += ` L${ART.x + ART.w} ${ART.y + ART.h} Z`;
    shapes.push(<path key={i} d={d} fill={inks[i % inks.length]} />);
  }
  return shapes;
}

function bauhaus({ palette }, rand) {
  const [bg, ...inks] = palette;
  const cols = 4;
  const size = ART.w / cols;
  const rows = Math.floor(ART.h / size);
  const offsetY = ART.y + (ART.h - rows * size) / 2;
  const pick = (not) => {
    const options = inks.filter((c) => c !== not);
    return options[Math.floor(rand() * options.length)];
  };
  const shapes = [<rect key="bg" x={ART.x} y={ART.y} width={ART.w} height={ART.h} fill={bg} />];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ART.x + c * size;
      const y = offsetY + r * size;
      const cellBg = rand() < 0.45 ? bg : pick();
      const ink = pick(cellBg);
      const k = `${r}-${c}`;
      shapes.push(<rect key={`b${k}`} x={f(x)} y={f(y)} width={f(size)} height={f(size)} fill={cellBg} />);
      const kind = Math.floor(rand() * 6);
      const s = size;
      if (kind === 0) {
        // quarter circle from a random corner
        const cx = rand() < 0.5 ? x : x + s;
        const cy = rand() < 0.5 ? y : y + s;
        shapes.push(
          <path key={k} d={`M${f(cx)} ${f(cy)} L${f(cx === x ? x + s : x)} ${f(cy)} A${f(s)} ${f(s)} 0 0 ${(cx === x) === (cy === y) ? 1 : 0} ${f(cx)} ${f(cy === y ? y + s : y)} Z`} fill={ink} />
        );
      } else if (kind === 1) {
        shapes.push(<circle key={k} cx={f(x + s / 2)} cy={f(y + s / 2)} r={f(s * 0.36)} fill={ink} />);
      } else if (kind === 2) {
        // half circle on a random side
        const top = rand() < 0.5;
        shapes.push(<path key={k} d={`M${f(x)} ${f(top ? y : y + s)} A${f(s / 2)} ${f(s / 2)} 0 0 ${top ? 0 : 1} ${f(x + s)} ${f(top ? y : y + s)} Z`} fill={ink} />);
      } else if (kind === 3) {
        shapes.push(<path key={k} d={`M${f(x)} ${f(y + s)} L${f(x + s)} ${f(y + s)} L${f(x + s)} ${f(y)} Z`} fill={ink} />);
      } else if (kind === 4) {
        for (let i = 0; i < 4; i++) {
          shapes.push(<rect key={`${k}-${i}`} x={f(x)} y={f(y + (i * s) / 4 + s / 16)} width={f(s)} height={f(s / 8)} fill={ink} />);
        }
      } else {
        shapes.push(<rect key={k} x={f(x + s * 0.25)} y={f(y + s * 0.25)} width={f(s / 2)} height={f(s / 2)} fill={ink} />);
      }
    }
  }
  return shapes;
}

function sun({ palette }, rand, uid) {
  const [skyTop, skyBottom, sunColor, sea, land] = palette;
  const horizon = ART.y + ART.h * (0.58 + rand() * 0.08);
  const r = 15 + rand() * 7;
  const cx = ART.x + ART.w * (0.35 + rand() * 0.3);
  const cy = horizon - r * (0.25 + rand() * 0.35);
  const stripes = [];
  for (let i = 0; i < 5; i++) {
    const y = cy + r * (0.15 + i * 0.18);
    stripes.push(<rect key={i} x={cx - r} y={f(y)} width={2 * r} height={f(0.6 + i * 0.45)} fill="black" />);
  }
  let hills = `M${ART.x} ${f(horizon)}`;
  for (let x = 0; x <= ART.w; x += 4) hills += ` L${f(ART.x + x)} ${f(horizon - rand() * 5 - (x > ART.w * 0.6 ? 3 : 0))}`;
  hills += ` L${ART.x + ART.w} ${f(horizon)} Z`;
  const reflections = [];
  for (let i = 0; i < 7; i++) {
    const w = r * 1.6 * (1 - i / 8) * (0.7 + rand() * 0.3);
    reflections.push(<rect key={i} x={f(cx - w / 2)} y={f(horizon + 3 + i * 4)} width={f(w)} height="1.1" rx="0.55" fill={sunColor} opacity={f(0.85 - i * 0.1)} />);
  }
  return [
    <defs key="defs">
      <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={skyTop} />
        <stop offset="1" stopColor={skyBottom} />
      </linearGradient>
      <mask id={`${uid}cuts`}>
        <rect x={ART.x} y={ART.y} width={ART.w} height={ART.h} fill="white" />
        {stripes}
      </mask>
    </defs>,
    <rect key="sky" x={ART.x} y={ART.y} width={ART.w} height={ART.h} fill={`url(#${uid}sky)`} />,
    <circle key="sun" cx={f(cx)} cy={f(cy)} r={f(r)} fill={sunColor} mask={`url(#${uid}cuts)`} />,
    <path key="hills" d={hills} fill={land} />,
    <rect key="sea" x={ART.x} y={f(horizon)} width={ART.w} height={f(ART.y + ART.h - horizon)} fill={sea} />,
    ...reflections,
  ];
}

function contours({ palette }, rand) {
  const [bg, ...inks] = palette;
  const accent = inks[inks.length - 1];
  const lines = inks.slice(0, -1);
  const shapes = [<rect key="bg" x={ART.x} y={ART.y} width={ART.w} height={ART.h} fill={bg} />];
  const peaks = 2 + Math.floor(rand() * 2);
  for (let p = 0; p < peaks; p++) {
    const cx = ART.x + ART.w * (0.15 + rand() * 0.7);
    const cy = ART.y + ART.h * (0.15 + rand() * 0.7);
    const ph1 = rand() * Math.PI * 2;
    const ph2 = rand() * Math.PI * 2;
    const rings = 9 + Math.floor(rand() * 5);
    const highlight = 2 + Math.floor(rand() * (rings - 3));
    for (let k = 1; k <= rings; k++) {
      const base = k * 3.4;
      let d = "";
      for (let a = 0; a <= 64; a++) {
        const t = (a / 64) * Math.PI * 2;
        const rad = base * (1 + 0.2 * Math.sin(3 * t + ph1) + 0.1 * Math.sin(5 * t + ph2 + k * 0.15));
        d += `${a ? "L" : "M"}${f(cx + rad * Math.cos(t))} ${f(cy + rad * Math.sin(t) * 1.15)}`;
      }
      shapes.push(
        <path
          key={`${p}-${k}`}
          d={d + "Z"}
          fill="none"
          stroke={k === highlight ? accent : lines[k % lines.length]}
          strokeWidth={k === highlight ? 0.9 : 0.5}
        />
      );
    }
  }
  return shapes;
}

const STYLES = { waves, bauhaus, sun, contours };

function Poster({ art, name, caption = true, className = "", title }) {
  const uid = useId().replace(/:/g, "");
  const shapes = useMemo(() => {
    const draw = STYLES[art.style] ?? waves;
    return draw(art, rng(art.seed), uid);
  }, [art, uid]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={title ?? `${name} poster`}>
      <rect width={W} height={H} fill="#fdfcf9" />
      <clipPath id={`${uid}clip`}>
        <rect x={ART.x} y={ART.y} width={ART.w} height={ART.h} />
      </clipPath>
      <g clipPath={`url(#${uid}clip)`}>{shapes}</g>
      {caption && (
        <g fontFamily="Inter, sans-serif" fill="#2a2724">
          <text x={ART.x} y={ART.y + ART.h + 9} fontSize="3.1" fontWeight="600" letterSpacing="0.6">
            {name.toUpperCase()}
          </text>
          <text x={ART.x + ART.w} y={ART.y + ART.h + 9} fontSize="2.6" textAnchor="end" fill="#8a8378">
            No. {String(art.seed).padStart(2, "0")}
          </text>
        </g>
      )}
    </svg>
  );
}

export default memo(Poster);
