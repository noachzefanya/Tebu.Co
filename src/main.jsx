import React from 'react';
import ReactDOM from 'react-dom/client';
import { useRegisterSW } from 'virtual:pwa-register/react';
import App from './App.jsx';
import './index.css';

// ── iOS Safari 100vh fix ──────────────────────────────────────────────────────
// Safari < 15 does not support `dvh`. We compute the real visible-area height
// via window.innerHeight and expose it as --vh so CSS can use:
//   height: calc(var(--vh, 1vh) * 100)  ← falls back to 1vh if JS hasn't run yet
//
// We also listen to orientationchange because rotating the device changes
// window.innerHeight independently from the resize event on iOS.
function setVhProperty() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
setVhProperty();
window.addEventListener('resize',            setVhProperty, { passive: true });
window.addEventListener('orientationchange', setVhProperty, { passive: true });

/**
 * PWAUpdatePrompt
 * ───────────────
 * Shown at the bottom of the screen when a new service worker is available.
 * The user can tap "Perbarui" to reload and activate the new version,
 * or dismiss with "Nanti" — the banner reappears on the next session.
 */
function PWAUpdatePrompt() {
  const {
    needRefresh:   [needRefresh,  setNeedRefresh],
    offlineReady:  [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(sw) {
      console.log('[PWA] Service Worker registered:', sw);
    },
    onRegisterError(err) {
      console.warn('[PWA] Service Worker registration failed:', err);
    },
  });

  if (!offlineReady && !needRefresh) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 100,                  // above the bottom nav bar
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(360px, 90vw)',
        zIndex: 9999,
        background: 'rgba(16,20,21,0.96)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 18,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animation: 'slideUpPrompt 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
          color: '#fff', marginBottom: 2,
        }}>
          {offlineReady ? '✅ Siap digunakan offline' : '🔄 Pembaruan tersedia'}
        </p>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 11,
          color: 'var(--color-on-surface-variant)',
        }}>
          {offlineReady
            ? 'Tebu.Co kini bisa diakses tanpa internet.'
            : 'Versi terbaru aplikasi siap dipasang.'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {needRefresh && (
          <button
            onClick={() => updateServiceWorker(true)}
            style={{
              background: 'var(--color-tertiary)',
              color: 'var(--color-on-tertiary)',
              border: 'none',
              borderRadius: 10,
              padding: '7px 14px',
              fontFamily: 'var(--font-display)',
              fontSize: 12, fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(166,214,79,0.3)',
            }}
          >
            Perbarui
          </button>
        )}
        <button
          onClick={() => { setOfflineReady(false); setNeedRefresh(false); }}
          style={{
            background: 'rgba(255,255,255,0.08)',
            color: 'var(--color-on-surface-variant)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '7px 12px',
            fontFamily: 'var(--font-body)',
            fontSize: 12, cursor: 'pointer',
          }}
        >
          Nanti
        </button>
      </div>

      <style>{`
        @keyframes slideUpPrompt {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0);    }
        }
      `}</style>
    </div>
  );
}

// ── Root render ────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <PWAUpdatePrompt />
  </React.StrictMode>
);
