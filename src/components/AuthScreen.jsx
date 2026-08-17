import { useState } from 'react';
import { Phone, Lock, User, ChevronRight, Loader2, Factory, ArrowLeft } from 'lucide-react';
import { registerWithPhone, loginWithPhone, loginAsDemo } from '../services/authService.js';

/**
 * AuthScreen — Phone + PIN authentication modal.
 *
 * - No email input anywhere in this UI.
 * - Toggles between LOGIN and REGISTER modes via a pill switch.
 * - Phone numbers are converted to virtual emails by authService behind the scenes.
 */
export default function AuthScreen({ onLogin }) {
  // ── Mode: 'login' | 'register' ────────────────────────────────────────────
  const [mode, setMode] = useState('login');

  // ── Shared fields ──────────────────────────────────────────────────────────
  const [phone, setPhone] = useState('');
  const [pin, setPin]     = useState('');

  // ── Register-only fields ───────────────────────────────────────────────────
  const [fullName, setFullName]   = useState('');
  const [role, setRole]           = useState('petani');      // 'petani' | 'admin_pg'
  const [millName, setMillName]   = useState('');

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  // ── Helpers ────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setPhone(''); setPin(''); setFullName('');
    setRole('petani'); setMillName('');
    setError(''); setSuccess('');
  };

  const switchMode = (next) => { resetForm(); setMode(next); };

  const handlePinInput = (e) => {
    // Only allow digits, max 6 characters
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(val);
  };

  // ── Submit: Login ──────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!phone.trim()) { setError('Nomor WhatsApp/HP wajib diisi.'); return; }
    if (pin.length < 6) { setError('PIN harus 6 digit angka.'); return; }

    setLoading(true);
    try {
      const { user } = await loginWithPhone({ phone: phone.trim(), pin });
      // App.jsx listens to onAuthStateChange — it will auto-fetch the profile
      // and call onLogin. We pass the user here to trigger that flow immediately.
      onLogin(user);
    } catch (err) {
      console.error('[AuthScreen] Login error:', err);
      setError(err.message || 'Login gagal. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // ── Submit: Register ───────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!fullName.trim())   { setError('Nama lengkap wajib diisi.'); return; }
    if (!phone.trim())      { setError('Nomor WhatsApp/HP wajib diisi.'); return; }
    if (pin.length < 6)     { setError('PIN harus tepat 6 digit angka.'); return; }
    if (role === 'admin_pg' && !millName.trim()) {
      setError('Nama Pabrik Gula wajib diisi untuk Petugas PG.'); return;
    }

    setLoading(true);
    try {
      const { user } = await registerWithPhone({
        fullName: fullName.trim(),
        phone:    phone.trim(),
        pin,
        role,
        millName: millName.trim(),
      });
      setSuccess('Akun berhasil dibuat! Silakan login.');
      setTimeout(() => switchMode('login'), 1500);
    } catch (err) {
      console.error('[AuthScreen] Register error:', err);
      setError(err.message || 'Pendaftaran gagal. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(34,197,94,0.08) 0%, transparent 65%)',
        overflowY: 'auto',
      }}
    >
      {/* ── Brand ── */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 38,
            fontWeight: 900,
            color: 'var(--color-primary)',
            letterSpacing: '-1.5px',
            textShadow: '0 0 32px rgba(163,212,137,0.35)',
            lineHeight: 1,
          }}
        >
          Tebu.Co
        </h1>
        <p className="text-caps c-on-surface-var" style={{ marginTop: 8, letterSpacing: '0.18em' }}>
          SMART SUGARCANE LOGISTICS
        </p>
      </div>

      {/* ── Card ── */}
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          boxShadow: '0 32px 80px rgba(0,0,0,0.65)',
          border: '1px solid rgba(163,212,137,0.2)',
        }}
      >
        {/* ── Mode Pill ── */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            padding: 4,
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {['login', 'register'].map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 9,
                border: 'none',
                background: mode === m
                  ? 'rgba(163,212,137,0.15)'
                  : 'transparent',
                color: mode === m ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.04em',
              }}
            >
              {m === 'login' ? 'MASUK' : 'DAFTAR'}
            </button>
          ))}
        </div>

        {/* ── Heading ── */}
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.3px',
            }}
          >
            {mode === 'login' ? 'Selamat Datang Kembali' : 'Buat Akun Baru'}
          </h2>
          <p className="c-on-surface-var" style={{ fontSize: 13, marginTop: 4 }}>
            {mode === 'login'
              ? 'Masukkan nomor HP dan PIN 6 digit Anda.'
              : 'Daftarkan diri sebagai petani atau petugas PG.'}
          </p>
        </div>

        {/* ── Alert: Error ── */}
        {error && (
          <div
            role="alert"
            style={{
              background: 'rgba(255,100,80,0.1)',
              border: '1px solid rgba(255,100,80,0.3)',
              borderRadius: 10,
              padding: '10px 14px',
            }}
          >
            <p style={{ color: 'var(--color-error)', fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
              ⚠️ {error}
            </p>
          </div>
        )}

        {/* ── Alert: Success ── */}
        {success && (
          <div
            role="status"
            style={{
              background: 'rgba(163,212,137,0.1)',
              border: '1px solid rgba(163,212,137,0.3)',
              borderRadius: 10,
              padding: '10px 14px',
            }}
          >
            <p style={{ color: 'var(--color-primary)', fontSize: 13, fontWeight: 500 }}>
              ✓ {success}
            </p>
          </div>
        )}

        {/* ── Form ── */}
        <form
          onSubmit={mode === 'login' ? handleLogin : handleRegister}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          {/* Full Name — register only */}
          {mode === 'register' && (
            <AuthField
              id="auth-fullname"
              label="Nama Lengkap"
              icon={<User size={16} />}
            >
              <input
                id="auth-fullname"
                type="text"
                placeholder="Contoh: Budi Santoso"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                style={inputStyle}
              />
            </AuthField>
          )}

          {/* Phone */}
          <AuthField
            id="auth-phone"
            label="Nomor WhatsApp / HP"
            icon={<Phone size={16} />}
          >
            <input
              id="auth-phone"
              type="tel"
              placeholder="08123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              inputMode="tel"
              style={inputStyle}
            />
          </AuthField>

          {/* PIN */}
          <AuthField
            id="auth-pin"
            label="PIN 6 Digit"
            icon={<Lock size={16} />}
          >
            <input
              id="auth-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={pin}
              onChange={handlePinInput}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={{ ...inputStyle, letterSpacing: pin ? '0.4em' : 'normal' }}
            />
          </AuthField>

          {/* Role Selector — register only */}
          {mode === 'register' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Daftar Sebagai</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { value: 'petani',   label: 'Petani Tebu',         icon: '🌾' },
                  { value: 'admin_pg', label: 'Petugas Pabrik Gula', icon: '🏭' },
                ].map(({ value, label, icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    style={{
                      padding: '12px 8px',
                      borderRadius: 12,
                      border: `1px solid ${role === value ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'}`,
                      background: role === value ? 'rgba(163,212,137,0.12)' : 'rgba(255,255,255,0.04)',
                      color: role === value ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                      fontFamily: 'var(--font-display)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mill Name — admin_pg + register only */}
          {mode === 'register' && role === 'admin_pg' && (
            <AuthField
              id="auth-millname"
              label="Nama Pabrik Gula"
              icon={<Factory size={16} />}
            >
              <input
                id="auth-millname"
                type="text"
                placeholder="Contoh: PG Asembagus"
                value={millName}
                onChange={(e) => setMillName(e.target.value)}
                style={inputStyle}
              />
            </AuthField>
          )}

          {/* Submit */}
          <button
            id={mode === 'login' ? 'btn-login-submit' : 'btn-register-submit'}
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              background: loading
                ? 'rgba(163,212,137,0.4)'
                : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-tertiary) 100%)',
              color: 'var(--color-on-primary)',
              border: 'none',
              borderRadius: 14,
              fontFamily: 'var(--font-display)',
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: '0.04em',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 0 28px rgba(163,212,137,0.35)',
              transition: 'all 0.2s',
              marginTop: 4,
            }}
          >
            {loading ? (
              <Loader2 size={18} style={{ animation: 'spin 0.9s linear infinite' }} />
            ) : (
              <>
                {mode === 'login' ? 'Masuk ke Dashboard' : 'Buat Akun & Lanjutkan'}
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* ── Footer switch ── */}
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-on-surface-variant)' }}>
          {mode === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
          <button
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
              textDecorationColor: 'rgba(163,212,137,0.4)',
            }}
          >
            {mode === 'login' ? 'Daftar Sekarang' : 'Masuk'}
          </button>
        </p>

        {/* ── Demo Mode / Uji Coba Cepat ── */}
        <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-on-surface-variant)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 700 }}>
            Mode Demo / Uji Coba Cepat
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              onClick={() => onLogin(loginAsDemo('petani'))}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '10px', borderRadius: 10, color: 'var(--color-primary)',
                fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'background 0.2s',
              }}
            >
              <span style={{ fontSize: 14 }}>🌾</span> Petani
            </button>
            <button
              onClick={() => onLogin(loginAsDemo('admin_pg'))}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '10px', borderRadius: 10, color: 'var(--color-tertiary)',
                fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'background 0.2s',
              }}
            >
              <span style={{ fontSize: 14 }}>🏭</span> Admin PG
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

/* ─── Sub-components ───────────────────────────────────────────────────────── */

function AuthField({ id, label, icon, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span
          style={{
            position: 'absolute',
            left: 14,
            color: 'var(--color-on-surface-variant)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

/* ─── Shared style constants ─────────────────────────────────────────────── */

const labelStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--color-on-surface-variant)',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
};

const inputStyle = {
  width: '100%',
  height: 52,
  padding: '0 14px 0 42px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#fff',
  fontFamily: 'var(--font-body)',
  fontSize: 16,              /* 16px — iOS Safari minimum to suppress auto-zoom */
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};
