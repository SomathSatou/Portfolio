import type { AnnotationArrow, AnnotationCircle, AnnotationText, RuneAnnotations } from './types'

interface RuneAnnotationsOverlayProps {
  annotations: RuneAnnotations
  width: number
  height: number
}

export default function RuneAnnotationsOverlay({
  annotations,
  width,
  height,
}: RuneAnnotationsOverlayProps) {
  const circles = annotations.circles ?? []
  const texts = annotations.texts ?? []
  const arrows = annotations.arrows ?? []

  if (circles.length === 0 && texts.length === 0 && arrows.length === 0) return null

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      {arrows.map((a: AnnotationArrow, i) => (
        <g key={`arrow-${i}`}>
          <line
            x1={a.x1}
            y1={a.y1}
            x2={a.x2}
            y2={a.y2}
            stroke={a.color}
            strokeWidth={3}
            markerEnd="url(#arrowhead)"
          />
        </g>
      ))}
      {circles.map((c: AnnotationCircle, i) => (
        <g key={`circle-${i}`}>
          <circle
            cx={c.x}
            cy={c.y}
            r={c.r}
            fill="none"
            stroke={c.color}
            strokeWidth={3}
          />
          {c.text && (
            <text x={c.x} y={c.y - c.r - 6} fill={c.color} fontSize={14} textAnchor="middle">
              {c.text}
            </text>
          )}
        </g>
      ))}
      {texts.map((t: AnnotationText, i) => (
        <text key={`text-${i}`} x={t.x} y={t.y} fill={t.color} fontSize={16}>
          {t.text}
        </text>
      ))}
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
        </marker>
      </defs>
    </svg>
  )
}
