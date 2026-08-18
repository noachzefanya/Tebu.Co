import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Factory, CalendarClock, QrCode, ShieldCheck, Map, Loader2, Navigation, CheckCircle2, LogOut, History } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabaseClient';

export default function DriverView({ profile }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('tiket'); // 'tiket' | 'riwayat'

  const isDemo = profile?.isDemo;

  useEffect(() => {
    fetchActiveTicket();
  }, [profile]);

  const fetchActiveTicket = async () => {
    setLoading(true);
    try {
      if (isDemo) {
        // Fallback untuk Demo Mode
        setTicket(profile.demoMockTicket);
        setLoading(false);
        return;
      }

      // Fetch tiket riil dari Supabase berdasarkan driver_id
      const { data, error: err } = await supabase
        .from('spta_tickets')
        .select(`
          *,
          harvest_records(
            mill_name,
            plots(plot_name)
          )
        `)
        .eq('driver_id', profile.id)
        .in('status', ['scheduled', 'on_delivery', 'arrived']) // Hanya ambil yang aktif
        .order('scheduled_slot', { ascending: true })
        .limit(1)
        .single();

      if (err) {
        if (err.code === 'PGRST116') {
          // No rows found
          setTicket(null);
        } else {
          throw err;
        }
      } else {
        // Map relasi jika ada
        const mappedData = {
          ...data,
          mill_name: data.harvest_records?.mill_name || 'Tujuan Belum Diatur',
          plot_name: data.harvest_records?.plots?.plot_name || 'Kebun Belum Diatur',
        };
        setTicket(mappedData);
      }
    } catch (err) {
      console.error('[DriverView] error fetching ticket:', err);
      setError('Gagal memuat data tiket.');
      
      // Fallback pencegah blank screen (layar putih) jika ada error tapi mode demo
      if (isDemo && profile.demoMockTicket) {
        setTicket(profile.demoMockTicket);
        setError('');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ width: '100%', padding: '84px 16px 112px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 448, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#888', minHeight: '60vh' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#a6d64f' }} />
          <p style={{ marginTop: 16, fontFamily: 'var(--font-display)', fontWeight: 600 }}>Memuat Tiket...</p>
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div style={{ width: '100%', padding: '84px 16px 112px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 448, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '60vh' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,100,80,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <ShieldCheck size={32} color="var(--color-error)" />
          </div>
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>Terjadi Kesalahan</h2>
          <p style={{ color: '#aaa', marginTop: 8 }}>{error}</p>
          <button onClick={fetchActiveTicket} style={{ marginTop: 24, padding: '12px 24px', background: '#a6d64f', color: '#111', borderRadius: 12, border: 'none', fontWeight: 700, cursor: 'pointer' }}>
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ width: '100%', padding: '84px 16px 112px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 448, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '60vh' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(166, 214, 79, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <CheckCircle2 size={40} color="#a6d64f" />
          </div>
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>Tidak Ada Tugas</h2>
          <p style={{ color: '#9ca3af', marginTop: 8, maxWidth: 280, lineHeight: 1.5, fontSize: 14 }}>
            Saat ini belum ada jadwal pengiriman tebu yang ditugaskan kepada Anda.
          </p>
        </div>
      </div>
    );
  }

  // Formatting Time
  const formatTime = (isoString) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    } catch {
      return isoString; // fallback if already a string like "14:30 WIB"
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'scheduled': return { label: 'SIAP BERANGKAT', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.3)' };
      case 'on_delivery': return { label: 'MENUJU PABRIK', color: '#facc15', bg: 'rgba(250,204,21,0.1)', border: 'rgba(250,204,21,0.3)' };
      case 'arrived': return { label: 'TIBA DI PABRIK', color: '#a6d64f', bg: 'rgba(166,214,79,0.1)', border: 'rgba(166,214,79,0.3)' };
      default: return { label: (status || 'TERJADWAL').toUpperCase(), color: '#ccc', bg: 'rgba(255,255,255,0.1)', border: 'rgba(255,255,255,0.2)' };
    }
  };

  const statusConfig = getStatusConfig(ticket.status);

  return (
    <div style={{ width: '100%', padding: '84px 16px 112px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 448, display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* ── Driver Top Navigation Tabs ── */}
      <div style={{ display: 'flex', gap: 8, padding: 6, background: 'rgba(18, 24, 20, 0.8)', border: '1px solid rgba(6, 78, 59, 0.3)', borderRadius: 12, zIndex: 40, flexShrink: 0 }}>
        <button
          onClick={() => setActiveTab('tiket')}
          style={{
            flex: 1, padding: '10px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', border: 'none',
            ...(activeTab === 'tiket'
              ? { background: '#a6d64f', color: '#000', boxShadow: '0 2px 8px rgba(166,214,79,0.2)' }
              : { background: 'transparent', color: 'rgba(255,255,255,0.6)' })
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <QrCode size={16} /> Tiket Aktif
          </div>
        </button>
        <button
          onClick={() => setActiveTab('riwayat')}
          style={{
            flex: 1, padding: '10px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', border: 'none',
            ...(activeTab === 'riwayat'
              ? { background: '#a6d64f', color: '#000', boxShadow: '0 2px 8px rgba(166,214,79,0.2)' }
              : { background: 'transparent', color: 'rgba(255,255,255,0.6)' })
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <History size={16} /> Riwayat
          </div>
        </button>
      </div>

      {activeTab === 'riwayat' ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(26, 35, 29, 0.6)', borderRadius: 16, border: '1px solid rgba(6, 95, 70, 0.3)', width: '100%' }}>
          <History size={48} color="#4b5563" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>Belum Ada Riwayat</h3>
          <p style={{ color: '#9ca3af', marginTop: 8, fontSize: 13 }}>Tiket yang telah selesai ditimbang akan muncul di sini.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
          {/* Header Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}>
                SPTA Digital
              </h2>
              <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
                Tunjukkan tiket ini pada pos timbang.
              </p>
            </div>
          </div>

          {/* Main Ticket Card */}
          <div style={{
            background: '#1a231d',
            border: '1px solid rgba(6, 95, 70, 0.4)',
            borderRadius: 16,
            padding: 20,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)', // shadow-md/shadow-lg
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            width: '100%'
          }}>
            {/* Header / Driver Info with Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(6, 95, 70, 0.3)', paddingBottom: 16 }}>
              <div>
                <p style={{ color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: 2 }}>Halo, Pengemudi</p>
                <p style={{ color: '#f3f4f6', fontSize: 16, fontWeight: 700 }}>{ticket.driver_name || profile.full_name}</p>
                <p style={{ color: '#a6d64f', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', marginTop: 2 }}>{ticket.truck_number}</p>
              </div>
              <div style={{ 
                background: statusConfig.bg, 
                border: `1px solid ${statusConfig.border}`, 
                color: statusConfig.color, 
                padding: '4px 10px', 
                borderRadius: 9999, 
                fontSize: 11, 
                fontWeight: 600,
                textAlign: 'center'
              }}>
                {statusConfig.label}
              </div>
            </div>

            {/* QR Section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ 
                background: '#fff', 
                padding: 16, 
                borderRadius: 16, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                width: '100%',
                maxWidth: 260,
                aspectRatio: '1/1',
                margin: '8px auto'
              }}>
                <QRCodeSVG 
                  value={ticket.spta_code || ticket.ticket_code || ticket.id} 
                  size="100%"
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                  level="H"
                  fgColor="#000000"
                  bgColor="#ffffff"
                />
              </div>
              <p style={{ color: '#111827', fontFamily: 'monospace', fontWeight: 800, fontSize: 14, letterSpacing: '0.05em', marginTop: 12, background: '#a6d64f', padding: '4px 12px', borderRadius: 6 }}>
                {ticket.spta_code || ticket.ticket_code || 'TBC-0000'}
              </p>
            </div>

            {/* Grid / List Info Jadwal & Lokasi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoCard 
                icon={<MapPin size={18} color="#38bdf8" />} 
                label="Lokasi Penjemputan" 
                value={ticket.plot_name} 
              />
              <InfoCard 
                icon={<Factory size={18} color="#a6d64f" />} 
                label="Pabrik Tujuan" 
                value={ticket.mill_name} 
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <InfoCard 
                    icon={<Navigation size={18} color="#9ca3af" />} 
                    label="Berangkat" 
                    value={ticket.departure_time || '-'} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <InfoCard 
                    icon={<CalendarClock size={18} color="#fbbf24" />} 
                    label="Slot Pabrik" 
                    value={formatTime(ticket.scheduled_slot)} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div style={{ 
      background: 'rgba(18, 24, 20, 0.8)', 
      border: '1px solid rgba(6, 78, 59, 0.3)', 
      borderRadius: 12, 
      padding: '12px 16px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: 12 
    }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: 2 }}>
          {label}
        </p>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#f3f4f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value}
        </p>
      </div>
    </div>
  );
}
