import { useMemo } from 'react';

// ─── Decay curve data model ─────────────────────────────────────────────────
// 0–6h  → Optimal flat: 8.5%
// 6–18h → Linear decay: 8.5% → 7.0%
// 18–24h → Steep decay: 7.0% → 5.5%

function getRendemenAt(h) {
  if (h <= 6)  return 8.5;
  if (h <= 18) return 8.5 - ((h - 6) / 12) * 1.5;
  return 7.0 - ((h - 18) / 6) * 1.5;
}

// Generate smooth curve points (every 0.25h)
function buildCurvePoints() {
  const pts = [];
  for (let h = 0; h <= 24; h += 0.25) {
    pts.push({ h, r: getRendemenAt(h) });
  }
  return pts;
}

// ─── SVG coordinate helpers ──────────────────────────────────────────────────
const W = 340, H = 140;
const PAD = { top: 12, right: 16, bottom: 28, left: 38 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;

const MIN_R = 5.0, MAX_R = 9.0;

function toX(h)  { return PAD.left + (h / 24) * CHART_W; }
function toY(r)  { return PAD.top  + CHART_H - ((r - MIN_R) / (MAX_R - MIN_R)) * CHART_H; }

// Y-axis ticks
const Y_TICKS = [5.5, 6.5, 7.5, 8.5];

// X-axis ticks (h)
const X_TICKS = [0, 6, 12, 18, 24];

export default function YieldDecayChart({ elapsedHours }) {
  const curvePoints = useMemo(() => buildCurvePoints(), []);

  // Build SVG path string for the decay curve
  const pathD = useMemo(() => {
    return curvePoints.reduce((acc, pt, i) => {
      const x = toX(pt.h);
      const y = toY(pt.r);
      return acc + (i === 0 ? `M ${x},${y}` : ` L ${x},${y}`);
    }, '');
  }, [curvePoints]);

  // Filled area under curve (for gradient fill)
  const areaD = useMemo(() => {
    const first = curvePoints[0];
    const last  = curvePoints[curvePoints.length - 1];
    return pathD + ` L ${toX(last.h)},${toY(MIN_R)} L ${toX(first.h)},${toY(MIN_R)} Z`;
  }, [pathD, curvePoints]);

  // Current marker position
  const currentH = Math.min(Math.max(elapsedHours ?? 0, 0), 24);
  const currentR = getRendemenAt(currentH);
  const mx = toX(currentH);
  const my = toY(currentR);

  // Zone colors
  const safeX1   = toX(0),  safeX2  = toX(6);
  const warnX1   = toX(6),  warnX2  = toX(18);
  const critX1   = toX(18), critX2  = toX(24);

  // Urgency state for current marker
  const isWarning  = currentH > 6  && currentH <= 18;
  const isCritical = currentH > 18;
  const markerColor = isCritical ? '#ffb4ab' : isWarning ? '#a6d64f' : '#a3d489';
  const markerGlow  = isCritical ? 'rgba(255,80,60,0.5)' : isWarning ? 'rgba(166,214,79,0.5)' : 'rgba(163,212,137,0.5)';

  const uniqueId = 'ydc'; // For gradient refs

  return (
    <div style={{ position: 'relative', padding: '16px 16px 8px', borderRadius: 16, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <p className="text-caps c-on-surface-var" style={{ fontSize: 10 }}>KURVA DEGRADASI RENDEMEN</p>
        <p className="text-caps" style={{ fontSize: 11, color: markerColor, fontWeight: 700 }}>
          {currentR.toFixed(2)}% @ {currentH.toFixed(1)}j
        </p>
      </div>

      {/* SVG Chart */}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          {/* Gradient fill under curve */}
          <linearGradient id={`${uniqueId}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgba(163,212,137,0.4)" />
            <stop offset="60%"  stopColor="rgba(163,212,137,0.05)" />
            <stop offset="100%" stopColor="rgba(163,212,137,0)" />
          </linearGradient>

          {/* Glow filter for marker */}
          <filter id={`${uniqueId}-glow`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Zone backgrounds ── */}
        {/* Safety (green) */}
        <rect x={safeX1} y={PAD.top} width={safeX2 - safeX1} height={CHART_H}
          fill="rgba(163,212,137,0.06)" rx="0" />
        {/* Warning (yellow) */}
        <rect x={warnX1} y={PAD.top} width={warnX2 - warnX1} height={CHART_H}
          fill="rgba(166,214,79,0.04)" rx="0" />
        {/* Critical (red) */}
        <rect x={critX1} y={PAD.top} width={critX2 - critX1} height={CHART_H}
          fill="rgba(255,80,60,0.06)" rx="0" />

        {/* Zone divider lines */}
        <line x1={toX(6)}  y1={PAD.top} x2={toX(6)}  y2={PAD.top + CHART_H} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 3" />
        <line x1={toX(18)} y1={PAD.top} x2={toX(18)} y2={PAD.top + CHART_H} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 3" />

        {/* Zone labels */}
        <text x={(safeX1 + safeX2) / 2} y={PAD.top - 2} textAnchor="middle"
          style={{ fontSize: 7, fill: 'rgba(163,212,137,0.7)', fontFamily: 'JetBrains Mono,monospace', letterSpacing: '0.04em' }}>AMAN</text>
        <text x={(warnX1 + warnX2) / 2} y={PAD.top - 2} textAnchor="middle"
          style={{ fontSize: 7, fill: 'rgba(166,214,79,0.7)', fontFamily: 'JetBrains Mono,monospace', letterSpacing: '0.04em' }}>PERINGATAN</text>
        <text x={(critX1 + critX2) / 2} y={PAD.top - 2} textAnchor="middle"
          style={{ fontSize: 7, fill: 'rgba(255,100,80,0.7)', fontFamily: 'JetBrains Mono,monospace', letterSpacing: '0.04em' }}>KRITIS</text>

        {/* Horizontal grid lines + Y-axis labels */}
        {Y_TICKS.map(r => {
          const y = toY(r);
          return (
            <g key={r}>
              <line x1={PAD.left} y1={y} x2={PAD.left + CHART_W} y2={y}
                stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x={PAD.left - 4} y={y + 4} textAnchor="end"
                style={{ fontSize: 8, fill: 'rgba(255,255,255,0.35)', fontFamily: 'JetBrains Mono,monospace' }}>{r}%</text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {X_TICKS.map(h => (
          <text key={h} x={toX(h)} y={H - 4} textAnchor="middle"
            style={{ fontSize: 8, fill: 'rgba(255,255,255,0.35)', fontFamily: 'JetBrains Mono,monospace' }}>{h}j</text>
        ))}

        {/* Filled area under curve */}
        <path d={areaD} fill={`url(#${uniqueId}-fill)`} />

        {/* Main decay curve */}
        <path d={pathD} fill="none" stroke="rgba(163,212,137,0.85)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* ── Current-time vertical guide line ── */}
        <line x1={mx} y1={PAD.top} x2={mx} y2={PAD.top + CHART_H}
          stroke={markerColor} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

        {/* Pulse rings (animated) */}
        <circle cx={mx} cy={my} r="10" fill="none" stroke={markerGlow} strokeWidth="1" opacity="0.5">
          <animate attributeName="r" from="6" to="14" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.5" to="0" dur="1.8s" repeatCount="indefinite" />
        </circle>

        {/* Marker dot (with glow) */}
        <circle cx={mx} cy={my} r="5.5" fill={markerColor} filter={`url(#${uniqueId}-glow)`}
          stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" />
        <circle cx={mx} cy={my} r="2.5" fill="#fff" opacity="0.9" />
      </svg>

      {/* Zone legend */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 4 }}>
        {[
          { color: 'rgba(163,212,137,0.8)', label: '0–6j Optimal' },
          { color: 'rgba(166,214,79,0.8)',  label: '6–18j Menurun' },
          { color: 'rgba(255,100,80,0.8)',  label: '>18j Kritis' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 20, height: 3, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', fontFamily: 'JetBrains Mono,monospace', letterSpacing: '0.04em' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
