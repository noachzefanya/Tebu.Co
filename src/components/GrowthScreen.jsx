import { useMemo } from 'react';
import { TrendingDown, ShieldCheck, Droplets, Leaf } from 'lucide-react';
import {
  buildDecayCurve,
  calcRendemen,
  getElapsedHours,
  getDelayUrgency,
  formatElapsed,
  BASE_RENDEMEN,
} from '../utils/sugarcaneMath.js';

/**
 * GrowthScreen — Biochemical & Nira Quality Analytics
 *
 * Uses sugarcaneMath.buildDecayCurve() to drive the 5-bar chart.
 * The "NOW" indicator highlights whichever checkpoint the current
 * elapsed time is closest to.
 *
 * Static nira quality metrics (Brix, HK, Fiber) are field-measured
 * constants for Noach's Blok A VMC 76-16 variety.
 */

// Simulated harvest 14h 22m ago — same as HomeScreen
const HARVEST_TIMESTAMP = new Date(Date.now() - (14 * 60 + 22) * 60 * 1000);

// Chart checkpoints (hours)
const CHECKPOINTS = [0, 6, 12, 18, 24];

// Bar colour ramp: full green → faded
const BAR_COLORS = [
  'var(--color-tertiary)',         // 0h  — peak
  'rgba(166,214,79,0.75)',         // 6h
  'rgba(163,212,137,0.55)',        // 12h
  'rgba(163,212,137,0.35)',        // 18h
  'rgba(163,212,137,0.18)',        // 24h — depleted
];

const QUALITY_METRICS = [
  { label: 'KADAR BRIX',    value: '14.2', unit: '°Bx', Icon: Droplets },
  { label: 'KEMURNIAN HK',  value: '86.2', unit: '%',   Icon: Leaf     },
  { label: 'KADAR SABUT',   value: '12.4', unit: '%',   Icon: null     },
];

export default function GrowthScreen({ active }) {
  // Derive the decay curve from the math model — stable unless HARVEST_TIMESTAMP changes
  const curve = useMemo(() => buildDecayCurve(CHECKPOINTS, BASE_RENDEMEN), []);

  // Current elapsed stats
  const elapsed    = useMemo(() => getElapsedHours(HARVEST_TIMESTAMP), []);
  const nowRendemen = useMemo(() => calcRendemen(elapsed),              [elapsed]);
  const urgency    = useMemo(() => getDelayUrgency(elapsed),            [elapsed]);
  const elapsedStr  = useMemo(() => formatElapsed(elapsed),             [elapsed]);

  // Find the closest checkpoint to "now" for the glowing bar
  const nowCheckpointIdx = useMemo(() => {
    let closestIdx = 0;
    let closestDist = Infinity;
    CHECKPOINTS.forEach((h, i) => {
      const dist = Math.abs(elapsed - h);
      if (dist < closestDist) { closestDist = dist; closestIdx = i; }
    });
    return closestIdx;
  }, [elapsed]);

  const urgencyAccent = urgency === 'critical'
    ? 'var(--color-error)'
    : urgency === 'warning'
      ? 'var(--color-tertiary)'
      : 'var(--color-primary)';

  return (
    <div className={`view-layer${active ? ' active' : ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-gap)', height: '100%' }}>

        {/* ── Heading ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h2 className="text-h2 c-white">Analisis Kualitas Nira</h2>
          <div style={{ textAlign: 'right' }}>
            <p className="text-caps c-on-surface-var" style={{ fontSize: 10 }}>WAKTU BERLALU</p>
            <p className="text-caps" style={{ color: urgencyAccent, fontSize: 11 }}>{elapsedStr}</p>
          </div>
        </div>

        {/* ── Decay chart card ── */}
        <div
          className="glass-card"
          style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          {/* Chart header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <p className="text-caps c-on-surface-var">DEGRADASI RENDEMEN (SUKROSA)</p>
              <p className="text-caps c-on-surface-var" style={{ fontSize: 10, marginTop: 2 }}>
                Nira menurun {(BASE_RENDEMEN - nowRendemen).toFixed(2)}% dari basis {BASE_RENDEMEN}%
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <TrendingDown size={18} color={urgencyAccent} />
              <p className="text-caps" style={{ color: urgencyAccent, fontSize: 10, marginTop: 2 }}>
                {nowRendemen.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* ── Bar chart driven by buildDecayCurve() ── */}
          <div
            style={{
              flex: 1, display: 'flex', alignItems: 'stretch',
              justifyContent: 'space-between', gap: 8, paddingBottom: 4,
            }}
          >
            {curve.map(({ hour, rendemen, heightPct }, idx) => {
              const isNow   = idx === nowCheckpointIdx;
              const isPast  = elapsed >= CHECKPOINTS[idx];
              const barColor = isNow
                ? (urgency === 'critical' ? 'var(--color-error)' : BAR_COLORS[idx])
                : BAR_COLORS[idx];

              return (
                <div
                  key={hour}
                  className="bar-wrap"
                  title={`${hour}j → Rendemen ${rendemen.toFixed(2)}%`}
                  style={{ height: '100%', justifyContent: 'flex-end' }}
                >
                  {/* Rendemen value above bar */}
                  <span
                    className="text-caps"
                    style={{
                      fontSize: 9,
                      color: isNow ? urgencyAccent : 'var(--color-on-surface-variant)',
                      opacity: isPast ? 1 : 0.45,
                      fontWeight: isNow ? 700 : 500,
                      marginBottom: 2,
                    }}
                  >
                    {rendemen.toFixed(1)}%
                  </span>

                  {/* Bar */}
                  <div
                    className="bar-bg"
                    style={{
                      height: `${Math.max(heightPct, 4)}%`,
                      background: barColor,
                      opacity: isPast ? 1 : 0.3,
                      boxShadow: isNow
                        ? `0 0 16px ${urgency === 'critical' ? 'rgba(255,180,171,0.5)' : 'rgba(166,214,79,0.45)'}`
                        : undefined,
                      transition: 'height 0.8s ease, box-shadow 0.4s',
                    }}
                  />

                  {/* Hour label */}
                  <span
                    className="text-caps"
                    style={{
                      fontSize: 10,
                      color: isNow ? urgencyAccent : 'var(--color-on-surface-variant)',
                      fontWeight: isNow ? 700 : 600,
                    }}
                  >
                    {isNow ? 'SEKARANG' : `${hour}j`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Legend ── */}
          <div
            style={{
              display: 'flex', justifyContent: 'space-between',
              marginTop: 10, paddingTop: 10,
              borderTop: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {[
              { label: 'BASIS',   value: `${BASE_RENDEMEN}%`,           color: 'var(--color-primary)'          },
              { label: 'SAAT INI', value: `${nowRendemen.toFixed(2)}%`, color: urgencyAccent                   },
              { label: 'BATAS 24J', value: `${calcRendemen(24).toFixed(2)}%`, color: 'var(--color-on-surface-variant)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <p className="text-caps c-on-surface-var" style={{ fontSize: 9 }}>{label}</p>
                <p className="text-caps" style={{ color, fontSize: 12, fontWeight: 700 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 2×2 metric grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flexShrink: 0 }}>
          {QUALITY_METRICS.map(({ label, value, unit, Icon }) => (
            <div key={label} className="glass-card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                {Icon && <Icon size={12} color="var(--color-on-surface-variant)" />}
                <p className="text-caps c-on-surface-var">{label}</p>
              </div>
              <p className="text-stat c-white">
                {value}
                <span className="text-body c-on-surface-var" style={{ fontSize: 14 }}>{unit}</span>
              </p>
            </div>
          ))}

          {/* Pest status cell */}
          <div
            className="glass-card"
            style={{
              padding: '14px 16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(163,212,137,0.08)',
              border: '1px solid rgba(163,212,137,0.2)',
              textAlign: 'center',
            }}
          >
            <ShieldCheck size={22} color="var(--color-primary)" style={{ marginBottom: 4 }} />
            <p className="text-caps c-primary">HAMA PENGGEREK</p>
            <p className="text-caps c-primary" style={{ fontSize: 10, marginTop: 2 }}>AMAN · &lt;2%</p>
          </div>
        </div>

      </div>
    </div>
  );
}
