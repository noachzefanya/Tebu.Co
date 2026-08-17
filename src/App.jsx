import { useState, useEffect, useCallback } from 'react';
import { LogOut, ShieldCheck, Sprout } from 'lucide-react';
import { supabase } from './lib/supabaseClient.js';
import { fetchUserProfile, logoutUser } from './services/authService.js';

import HomeScreen     from './components/HomeScreen.jsx';
import GrowthScreen   from './components/GrowthScreen.jsx';
import MappingScreen  from './components/MappingScreen.jsx';
import TruckScreen    from './components/TruckScreen.jsx';
import TicketScreen   from './components/TicketScreen.jsx';
import BottomNav      from './components/BottomNav.jsx';
import AuthScreen     from './components/AuthScreen.jsx';
import MillAdminScreen from './components/MillAdminScreen.jsx';
import NotificationBanner from './components/NotificationBanner.jsx';

// Background imagery
const BG_FIELD =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA99hR2uXthly6O-tAw-wRgxvZGLPMyQxqr1KSSzs2H2eS3J2Ze3dITK0fwzfnOP9setRpLD48NgqUmQAt2vp6vt1sUqJADkpNee7x3Sw588tprFdFScviS8tz_vRTR82mahTvuqwITZ0v6a3iYs9sziEqnbWg_DzCc1xaf4DBLJJhzewWJyczhrNcQ59Zm6v8wWYfakKGOCqWmd9RcDSu4H9ZXoAd32LIGvKZgY6UBRY0kb6nDdbL4hQ';

export default function App() {
  const [activeTab, setActiveTab]           = useState('home');
  const [session, setSession]               = useState(undefined); // undefined = loading, null = not logged in
  const [profile, setProfile]               = useState(null);
  const [activeSpta, setActiveSpta]         = useState(null);
  const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // ── Load profile from Supabase ──────────────────────────────────────────────
  const loadProfile = useCallback(async (userId) => {
    setProfileLoading(true);
    try {
      const p = await fetchUserProfile(userId);
      setProfile(p);
    } catch (err) {
      console.error('[App] loadProfile error:', err);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // ── Auth state listener ────────────────────────────────────────────────────
  useEffect(() => {
    // Get the current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
    });

    // Listen for future auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          loadProfile(newSession.user.id);
        } else {
          setProfile(null);
          setActiveSpta(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  // ── Restore active SPTA from localStorage on mount ─────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('tebuco_active_spta');
    if (saved) {
      try { setActiveSpta(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  const handleLogout = async () => {
    if (session?.user?.isDemo) {
      setSession(null);
      setProfile(null);
      setActiveSpta(null);
    } else {
      await logoutUser();
      // onAuthStateChange will clear session + profile automatically for real users
    }
    localStorage.removeItem('tebuco_active_spta');
  };

  const handleSetSpta = (sptaData) => {
    setActiveSpta(sptaData);
    localStorage.setItem('tebuco_active_spta', JSON.stringify(sptaData));
  };

  // Called by AuthScreen after a successful loginWithPhone / signUp, or a Demo Login
  const handleAuthSuccess = (userData) => {
    if (userData?.isDemo) {
      setSession({ user: userData });
      setProfile(userData);
    }
    // For real Supabase auth, onAuthStateChange picks it up automatically.
  };

  // ── Render: loading splash ──────────────────────────────────────────────────
  if (session === undefined || (session && profileLoading && !profile)) {
    return (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#050505', gap: 16,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32, fontWeight: 900,
            color: 'var(--color-primary)',
            letterSpacing: '-1px',
            textShadow: '0 0 24px rgba(163,212,137,0.4)',
          }}
        >
          Tebu.Co
        </h1>
        <div
          style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '3px solid rgba(163,212,137,0.2)',
            borderTopColor: 'var(--color-primary)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Render: not logged in ──────────────────────────────────────────────────
  if (!session) {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', background: '#050505', overflow: 'hidden' }}>
        {/* Blurred field background on auth screen */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url('${BG_FIELD}')`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: 0.4,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        />
        <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', overflowY: 'auto' }}>
          <AuthScreen onLogin={handleAuthSuccess} />
        </div>
      </div>
    );
  }

  // ── Derive role from profile ────────────────────────────────────────────────
  // Fallback to 'petani' if profile not loaded yet to avoid blank screen
  const role = profile?.role || 'petani';
  const isAdmin = role === 'admin_pg';
  const displayName = profile?.full_name || session.user?.user_metadata?.full_name || 'Pengguna';

  // ── Role badge config ───────────────────────────────────────────────────────
  const roleBadge = isAdmin
    ? { label: 'PETUGAS PG', icon: <ShieldCheck size={12} />, color: 'var(--color-tertiary)', bg: 'rgba(166,214,79,0.12)', border: 'rgba(166,214,79,0.3)' }
    : { label: 'PETANI',     icon: <Sprout size={12} />,      color: 'var(--color-primary)',   bg: 'rgba(163,212,137,0.1)', border: 'rgba(163,212,137,0.25)' };

  // ── Render: app shell ──────────────────────────────────────────────────────
  return (
    <div
      className={isAdmin ? 'app-container admin-mode' : 'app-container farmer-mode'}
      style={{
        background: '#050505',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Background field photo ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: `url('${BG_FIELD}')`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.75,
        }}
      />
      {/* ── Dark blur overlay ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'rgba(0,0,0,0.58)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
      />
      {/* ── Ambient orbs ── */}
      <div
        aria-hidden="true"
        className="ambient-orb"
        style={{
          position: 'absolute', top: '-20%', left: '-20%',
          width: '80%', height: '50%',
          background: 'rgba(15,56,0,0.3)',
          borderRadius: '50%', filter: 'blur(100px)', zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        className="ambient-orb"
        style={{
          position: 'absolute', bottom: '10%', right: '-20%',
          width: '70%', height: '40%',
          background: 'rgba(35,53,0,0.35)',
          borderRadius: '50%', filter: 'blur(80px)', zIndex: 0,
          animationDelay: '-4s',
        }}
      />

      {/* ── Top App Bar ── */}
      <header
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 30,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 20px',
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          height: 64,
        }}
      >
        {/* ── Left: avatar + brand + name ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(163,212,137,0.25), rgba(166,214,79,0.15))',
              border: '1.5px solid rgba(163,212,137,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ color: 'var(--color-primary)', fontWeight: 800, fontSize: 14 }}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800,
                color: 'var(--color-primary)', letterSpacing: '-0.5px', lineHeight: 1.1,
              }}
            >
              Tebu.Co
            </h1>
            <p className="text-caps c-on-surface-var" style={{ fontSize: 9, lineHeight: 1.2 }}>
              {displayName}
            </p>
          </div>
        </div>

        {/* ── Right: role badge + logout ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Role badge — read-only, no click handler */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 20,
              background: roleBadge.bg,
              border: `1px solid ${roleBadge.border}`,
              color: roleBadge.color,
              fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700,
              letterSpacing: '0.05em',
              userSelect: 'none',
            }}
            aria-label={`Role: ${roleBadge.label}`}
          >
            {roleBadge.icon}
            {roleBadge.label}
          </div>

          {/* Logout */}
          <button
            id="btn-logout"
            onClick={handleLogout}
            title="Keluar dari akun"
            style={{
              background: 'rgba(255,180,171,0.1)',
              border: '1px solid rgba(255,180,171,0.2)',
              borderRadius: 8,
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-error)', cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,100,80,0.2)')}
            onMouseOut={(e)  => (e.currentTarget.style.background = 'rgba(255,180,171,0.1)')}
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ── Farmer: global SPTA notification banner ── */}
      {!isAdmin && <NotificationBanner activeSpta={activeSpta} />}

      {/* ── Content Canvas ── */}
      <main
        className="no-scrollbar touch-scroll"
        style={{
          position: 'relative', flex: 1, width: '100%', zIndex: 10,
          minHeight: 0,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto', overscrollBehavior: 'contain',
          touchAction: 'pan-y',
        }}
      >
        {isAdmin ? (
          /* ── Admin PG: Mill dashboard + live QR scanner ── */
          <MillAdminScreen profile={profile} />
        ) : (
          /* ── Petani: Farm management screens ── */
          <>
            <HomeScreen
              active={activeTab === 'home'}
              user={profile}
              activeSpta={activeSpta}
              onHarvestLogged={handleSetSpta}
              onGenerateSPTA={() => setActiveTab('ticket')}
              isModalOpen={isHarvestModalOpen}
              setIsModalOpen={setIsHarvestModalOpen}
            />
            <GrowthScreen  active={activeTab === 'growth'}  />
            <MappingScreen active={activeTab === 'mapping'} />
            <TruckScreen   active={activeTab === 'truck'}   />
            <TicketScreen
              active={activeTab === 'ticket'}
              activeSpta={activeSpta}
              onOpenHarvestModal={() => {
                setActiveTab('home');
                setIsHarvestModalOpen(true);
              }}
            />
          </>
        )}
      </main>

      {/* ── Bottom Navigation — petani only, hidden when modal is open ── */}
      {!isAdmin && !isHarvestModalOpen && (
        <BottomNav activeTab={activeTab} onChange={setActiveTab} />
      )}
    </div>
  );
}
