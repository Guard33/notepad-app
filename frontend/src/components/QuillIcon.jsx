// 8x8 pixel-art sprite of a quill stroke, drawn as SVG rects so it renders
// identically everywhere — no dependency on the system having an emoji font.
const PIXELS = [
  "......X.",
  ".....XX.",
  "...XXX..",
  "..XXX...",
  ".XXX....",
  "XXX.....",
  "XX......",
  ".X......",
];

export default function QuillIcon({ size = 24, className = "" }) {
  return (
    <svg
      viewBox="0 0 8 8"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      {PIXELS.flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === "X" ? (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
          ) : null
        )
      )}
    </svg>
  );
}
