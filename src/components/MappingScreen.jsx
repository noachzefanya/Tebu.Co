import { Navigation } from 'lucide-react';

/**
 * MappingScreen — Supply Chain & Field GIS View
 * Shows satellite overlay map, truck dispatch pill, route info,
 * and harvest-ready block status.
 */

const MAP_BG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBvzgSb6HguPyKjyIUYA6b5wYeFAwrrpz_t8y3dDpYBzmaE4CL94M0LadG2JzP0a8a2zHwN8r31DfQjn83F-QoOQYdbUM8Mu9RbVphi4QtRjlrUSgj52mAbFp7c9Kun0xp-SeYafRY6Unq4ngxNkgoG2LOHzQ9-TZ-lcCQIpdyB3j2vi3tNXJIh4Q9LI8XKERNZA5qbZxAB1MbVCJDlQsjzsYePscJkMBlyA0xT62npBhKSUUU3YRdVRQ';

const BLOCKS = [
  { id: 'A', variety: 'VMC 76-16',   status: 'SIAP PANEN', ready: true },
  { id: 'B', variety: 'Bululawang',  status: 'MONITORING',  ready: false },
];

export default function MappingScreen({ active }) {
  return (
    <div className={`view-layer${active ? ' active' : ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-gap)', height: '100%' }}>

        {/* ── Heading ── */}
        <h2 className="text-h2 c-white">Field Mapping</h2>

        {/* ── Satellite map card ── */}
        <div
          style={{
            flex: 1, borderRadius: 'var(--radius-lg)',
            overflow: 'hidden', border: '1px solid rgba(255,255,255,0.18)',
            position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {/* Satellite background */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url('${MAP_BG}')`,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }}
          />

          {/* Gradient overlay */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 40%, rgba(0,0,0,0.75) 100%)',
            }}
          />

          {/* SVG route line */}
          <svg
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <path d="M20,80 Q40,40 80,20" fill="none" stroke="#a6d64f" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.85" />
            <circle cx="80" cy="20" r="3" fill="#a6d64f" />
            <circle cx="20" cy="80" r="2" fill="#fff" />
          </svg>

          {/* Top dispatch pill */}
          <div
            style={{
              position: 'absolute', top: 14, left: 14, right: 14,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <div
              style={{
                background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 'var(--radius-full)',
                padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--color-tertiary)',
                  animation: 'pulse-glow 2s infinite',
                  flexShrink: 0,
                }}
              />
              <span className="text-caps" style={{ color: '#fff' }}>
                3 TRUK IN-TRANSIT · 12.4 KM KE PG SITUBONDO
              </span>
            </div>

            <button
              aria-label="Center map on my location"
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              <Navigation size={18} />
            </button>
          </div>

          {/* Bottom route info */}
          <div
            style={{
              position: 'absolute', bottom: 14, left: 14, right: 14,
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-md)', padding: '12px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <div>
              <p className="text-caps c-on-surface-var">ROUTE TO MILL</p>
              <p className="text-h3 c-white">12.4 km</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="text-caps c-on-surface-var">SOIL MOISTURE</p>
              <p className="text-h3 c-primary">71%</p>
            </div>
          </div>
        </div>

        {/* ── Harvest-ready block status ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flexShrink: 0 }}>
          {BLOCKS.map(({ id, variety, status, ready }) => (
            <div
              key={id}
              className="glass-card"
              style={{
                padding: '12px 14px',
                background: ready ? 'rgba(166,214,79,0.08)' : 'rgba(255,255,255,0.05)',
                border: ready ? '1px solid rgba(166,214,79,0.25)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <p className="text-caps" style={{ color: ready ? 'var(--color-tertiary)' : 'var(--color-on-surface-variant)', marginBottom: 4 }}>
                BLOK {id} · {status}
              </p>
              <p className="text-body c-white" style={{ fontSize: 13, fontWeight: 600 }}>Var. {variety}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
