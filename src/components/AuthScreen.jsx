import { useState } from 'react';
import { User, Phone, ArrowRight, Loader2, Zap } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

/**
 * AuthScreen — Simplified Farmer Authentication
 * Dark glassmorphism card with neon green accents (#22C55E).
 */
export default function AuthScreen({ onLogin }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Nama dan Nomor WhatsApp wajib diisi.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase belum dikonfigurasi. Gunakan Mode Demo.');
      }

      // Check if farmer exists
      let { data: farmer, error: fetchError } = await supabase
        .from('farmers')
        .select('*')
        .eq('phone_number', phone.trim())
        .maybeSingle();

      if (fetchError) throw fetchError;

      // If not exists, insert new farmer
      if (!farmer) {
        const { data: newFarmer, error: insertError } = await supabase
          .from('farmers')
          .insert([{ full_name: name.trim(), phone_number: phone.trim() }])
          .select()
          .single();

        if (insertError) throw insertError;
        farmer = newFarmer;
      }

      // Ensure name is up to date if they typed a different name for the same phone
      if (farmer && farmer.full_name !== name.trim()) {
        const { data: updatedFarmer, error: updateError } = await supabase
          .from('farmers')
          .update({ full_name: name.trim() })
          .eq('id', farmer.id)
          .select()
          .single();

        if (!updateError && updatedFarmer) {
          farmer = updatedFarmer;
        }
      }

      // Save to localStorage
      localStorage.setItem('tebuco_farmer_user', JSON.stringify(farmer));
      onLogin(farmer);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    const demoUser = {
      id: 'demo-kptr-user',
      full_name: 'Mevlana Suyou',
      phone_number: '081234567890',
      isDemo: true,
    };
    localStorage.setItem('tebuco_farmer_user', JSON.stringify(demoUser));
    onLogin(demoUser);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.1) 0%, transparent 70%)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 36,
            fontWeight: 800,
            color: 'var(--color-primary)',
            letterSpacing: '-1px',
            textShadow: '0 0 24px rgba(166,214,79,0.3)',
          }}
        >
          Tebu.Co
        </h1>
        <p className="text-caps c-on-surface-var" style={{ marginTop: 8 }}>
          SMART SUGARCANE LOGISTICS
        </p>
      </div>

      <div
        className="glass-card"
        style={{
          width: '100%',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          border: '1px solid rgba(34,197,94,0.3)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 className="text-h3 c-white">Login Petani</h2>
          <p className="text-body c-on-surface-var" style={{ marginTop: 4, fontSize: 13 }}>
            Masukkan data diri untuk masuk ke dashboard kebun.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(255,180,171,0.1)',
              border: '1px solid rgba(255,180,171,0.25)',
              borderRadius: 12,
              padding: '10px 14px',
              textAlign: 'center',
            }}
          >
            <p style={{ color: 'var(--color-error)', fontSize: 12, fontWeight: 500 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-on-surface-variant)',
              }}
            >
              <User size={18} />
            </div>
            <input
              type="text"
              placeholder="Nama Lengkap (e.g. Mevlana Suyou)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 14px 14px 40px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14,
                color: '#fff',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-tertiary)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-on-surface-variant)',
              }}
            >
              <Phone size={18} />
            </div>
            <input
              type="tel"
              placeholder="Nomor WhatsApp (e.g. 081234567890)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 14px 14px 40px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14,
                color: '#fff',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-tertiary)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--color-tertiary)',
              color: 'var(--color-on-tertiary)',
              border: 'none',
              borderRadius: 14,
              fontFamily: 'var(--font-display)',
              fontSize: 15,
              fontWeight: 700,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              cursor: loading ? 'default' : 'pointer',
              boxShadow: '0 0 20px rgba(166,214,79,0.4)',
              transition: 'opacity 0.2s',
              opacity: loading ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {loading ? <Loader2 size={18} className="spin" /> : 'Masuk ke Dashboard Kebun'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={{ position: 'relative', textAlign: 'center', margin: '10px 0' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ position: 'relative', background: '#0a0b0a', padding: '0 12px', fontSize: 11 }} className="text-caps c-on-surface-var">
            ATAU
          </span>
        </div>

        <button
          onClick={handleDemoLogin}
          style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--color-on-surface-variant)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14,
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
        >
          <Zap size={16} />
          Masuk Cepat Mode Demo
        </button>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
