import { Home, TrendingUp, MapPin, Truck, QrCode } from 'lucide-react';

/**
 * BottomNav — Floating capsule navigation bar
 * 5 tabs: Home, Growth, Mapping, Truck, QR Ticket.
 * Active tab glows green (#22C55E → mapped to var(--color-tertiary)).
 */

const NAV_ITEMS = [
  { id: 'home',    label: 'Beranda',    Icon: Home },
  { id: 'growth',  label: 'Analisis',  Icon: TrendingUp },
  { id: 'mapping', label: 'Petak Sawah', Icon: MapPin },
  { id: 'truck',   label: 'Logistik',   Icon: Truck },
  { id: 'ticket',  label: 'Tiket SPTA',  Icon: QrCode },
];

export default function BottomNav({ activeTab, onChange }) {
  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '88%',
        maxWidth: 360,
        height: 64,
        borderRadius: 'var(--radius-full)',
        border: '1px solid rgba(255,255,255,0.18)',
        background: 'rgba(29,32,34,0.75)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0 12px',
        zIndex: 50,
      }}
    >
      {NAV_ITEMS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            id={`nav-${id}`}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(id)}
            style={{
              width: 48, height: 48,
              borderRadius: 'var(--radius-full)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isActive ? 'var(--color-tertiary)' : 'transparent',
              color:      isActive ? 'var(--color-on-tertiary)' : 'var(--color-on-surface-variant)',
              boxShadow:  isActive ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 0 16px rgba(166,214,79,0.35)' : 'none',
              transform:  isActive ? 'scale(0.94)' : 'scale(1)',
              transition: 'background 0.22s ease, color 0.22s ease, transform 0.18s ease, box-shadow 0.22s ease',
              cursor: 'pointer',
            }}
          >
            <Icon
              size={22}
              strokeWidth={isActive ? 2.5 : 1.8}
            />
          </button>
        );
      })}
    </nav>
  );
}
