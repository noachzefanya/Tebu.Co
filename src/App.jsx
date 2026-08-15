import { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import HomeScreen    from './components/HomeScreen.jsx';
import GrowthScreen  from './components/GrowthScreen.jsx';
import MappingScreen from './components/MappingScreen.jsx';
import TruckScreen   from './components/TruckScreen.jsx';
import TicketScreen  from './components/TicketScreen.jsx';
import BottomNav     from './components/BottomNav.jsx';
import AuthScreen    from './components/AuthScreen.jsx';
import MillAdminScreen from './components/MillAdminScreen.jsx';
import NotificationBanner from './components/NotificationBanner.jsx';
// Background imagery (from original design)
const BG_FIELD =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA99hR2uXthly6O-tAw-wRgxvZGLPMyQxqr1KSSzs2H2eS3J2Ze3dITK0fwzfnOP9setRpLD48NgqUmQAt2vp6vt1sUqJADkpNee7x3Sw588tprFdFScviS8tz_vRTR82mahTvuqwITZ0v6a3iYs9sziEqnbWg_DzCc1xaf4DBLJJhzewWJyczhrNcQ59Zm6v8wWYfakKGOCqWmd9RcDSu4H9ZXoAd32LIGvKZgY6UBRY0kb6nDdbL4hQ';

const AVATAR_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAfmqyEzn8hmUoxWZNE2j7fUTr9nPhlocAA-1PX231O4XoaIPBEBOMROsKfX2Im5LaZ_hp1EA2pclWYVkcF17Z73UPtZ3cnmn0R0A1tDUcjf_Yl9CWmozP3UgsYUDyRPb8p8TtlRmn6Z94jLRADxMlhDunGuvbom55cwemkEexserV-JBMp197OF3BqrFWZRE4qhzyYxHhoIlMJRkzqYlF-VGBbKOXtznHRBUW1qUg2UY1ybWZoGH1ByA';



export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState(null);
  const [appRole, setAppRole] = useState('farmer'); // 'farmer' | 'admin'
  const [activeSpta, setActiveSpta] = useState(null);
  const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('tebuco_farmer_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    const savedSpta = localStorage.getItem('tebuco_active_spta');
    if (savedSpta) setActiveSpta(JSON.parse(savedSpta));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('tebuco_farmer_user');
    localStorage.removeItem('tebuco_active_spta');
    setUser(null);
    setActiveSpta(null);
  };

  const handleSetSpta = (sptaData) => {
    setActiveSpta(sptaData);
    localStorage.setItem('tebuco_active_spta', JSON.stringify(sptaData));
  };

  if (!user) {
    return <AuthScreen onLogin={setUser} />;
  }

  return (
    <div
      className={appRole === 'admin' ? 'app-container admin-mode' : 'app-container farmer-mode'}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: '50%',
              overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)',
              background: 'var(--color-surface-container)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {user.isDemo ? (
              <img
                src={AVATAR_URL}
                alt="Avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ color: 'var(--color-tertiary)', fontWeight: 700, fontSize: 14 }}>
                {user.full_name.charAt(0).toUpperCase()}
              </span>
            )}
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
            <p className="text-caps c-on-surface-var" style={{ fontSize: 9 }}>
              {user.full_name}
            </p>
          </div>
        </div>

        <div
          className="text-caps c-on-surface-var"
          style={{ display: 'flex', alignItems: 'center', gap: 12 }}
        >
          {/* Role Switcher Toggle */}
          <button
            onClick={() => setAppRole(prev => prev === 'farmer' ? 'admin' : 'farmer')}
            style={{
              background: appRole === 'admin' ? 'rgba(163,212,137,0.1)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${appRole === 'admin' ? 'var(--color-primary)' : 'rgba(255,255,255,0.2)'}`,
              color: appRole === 'admin' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              padding: '6px 12px', borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              {appRole === 'admin' ? 'admin_panel_settings' : 'agriculture'}
            </span>
            {appRole === 'admin' ? 'MODE PETUGAS PG' : 'MODE PETANI'}
          </button>

          <div style={{ alignItems: 'center', gap: 4, display: 'none' }}>
            {/* Hiding weather to make space for the toggle */}
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>wb_sunny</span>
            28°C
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,180,171,0.1)', border: 'none', borderRadius: 8,
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-error)', cursor: 'pointer',
            }}
            title="Keluar"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Global Notification Banner */}
      {appRole === 'farmer' && <NotificationBanner activeSpta={activeSpta} />}

      {/* ── Content Canvas ── */}
      <main className="no-scrollbar" style={{ 
        position: 'relative', flex: 1, width: '100%', zIndex: 10, minHeight: 0, 
        display: 'flex', flexDirection: 'column', 
        overflowY: 'auto', paddingBottom: 144, overscrollBehavior: 'contain' 
      }}>
        {appRole === 'admin' ? (
          <MillAdminScreen />
        ) : (
          <>
            <HomeScreen
              active={activeTab === 'home'}
          user={user}
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

      {/* ── Bottom Navigation ── */}
      {appRole === 'farmer' && !isHarvestModalOpen && <BottomNav activeTab={activeTab} onChange={setActiveTab} />}
    </div>
  );
}
