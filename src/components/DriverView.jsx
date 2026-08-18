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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#888', paddingTop: 64 }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#facc15' }} />
        <p style={{ marginTop: 16, fontFamily: 'var(--font-display)', fontWeight: 600 }}>Memuat Tiket...</p>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', padding: 20, paddingTop: 84, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,100,80,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <ShieldCheck size={32} color="var(--color-error)" />
        </div>
        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>Terjadi Kesalahan</h2>
        <p style={{ color: '#aaa', marginTop: 8 }}>{error}</p>
        <button onClick={fetchActiveTicket} style={{ marginTop: 24, padding: '12px 24px', background: '#facc15', color: '#111', borderRadius: 12, border: 'none', fontWeight: 700, cursor: 'pointer' }}>
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', padding: 20, paddingTop: 84, textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(250, 204, 21, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <CheckCircle2 size={40} color="#facc15" />
        </div>
        <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>Tidak Ada Tugas</h2>
        <p style={{ color: '#aaa', marginTop: 8, maxWidth: 280, lineHeight: 1.5 }}>
          Saat ini belum ada jadwal pengiriman tebu yang ditugaskan kepada Anda.
        </p>
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
      case 'scheduled': return { label: 'SIAP BERANGKAT', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' };
      case 'on_delivery': return { label: 'MENUJU PABRIK', color: '#facc15', bg: 'rgba(250,204,21,0.1)' };
      case 'arrived': return { label: 'TIBA DI PABRIK', color: '#a6d64f', bg: 'rgba(166,214,79,0.1)' };
      default: return { label: (status || 'TERJADWAL').toUpperCase(), color: '#ccc', bg: 'rgba(255,255,255,0.1)' };
    }
  };

  const statusConfig = getStatusConfig(ticket.status);

  return (
    <div style={{ width: '100%', padding: '84px 16px 80px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* ── Driver Top Navigation Tabs ── */}
      <div style={{ display: 'flex', gap: 8, padding: 6, background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, zIndex: 40, flexShrink: 0 }}>
        <button
          onClick={() => setActiveTab('tiket')}
          style={{
            flex: 1, padding: '12px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', border: 'none',
            ...(activeTab === 'tiket'
              ? { background: 'var(--color-primary)', color: '#000', boxShadow: '0 4px 12px rgba(162,255,0,0.2)' }
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
            flex: 1, padding: '12px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', border: 'none',
            ...(activeTab === 'riwayat'
              ? { background: 'var(--color-primary)', color: '#000', boxShadow: '0 4px 12px rgba(162,255,0,0.2)' }
              : { background: 'transparent', color: 'rgba(255,255,255,0.6)' })
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <History size={16} /> Riwayat
          </div>
        </button>
      </div>

      {activeTab === 'riwayat' ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(0,0,0,0.2)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
          <History size={48} color="#555" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Belum Ada Riwayat</h3>
          <p style={{ color: '#888', marginTop: 8, fontSize: 14 }}>Tiket yang telah selesai ditimbang akan muncul di sini.</p>
        </div>
      ) : (
        <>
          {/* Header Info */}
          <div>
            <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}>
              SPTA Digital
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 13, marginTop: 4 }}>
              Tunjukkan tiket ini pada pos timbang.
            </p>
          </div>

      {/* Main Ticket Card */}
      <div style={{
        background: 'linear-gradient(180deg, #161c14 0%, #11150f 100%)',
        border: '1px solid rgba(250,204,21,0.2)',
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Status Badge */}
        <div style={{ background: statusConfig.bg, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${statusConfig.bg}` }}>
          <span style={{ color: statusConfig.color, fontSize: 13, fontWeight: 800, letterSpacing: '0.1em' }}>
            {statusConfig.label}
          </span>
        </div>

        {/* QR Section */}
        <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 16, boxShadow: '0 10px 30px rgba(250,204,21,0.1)' }}>
            <QRCodeSVG 
              value={ticket.spta_code || ticket.ticket_code || ticket.id} 
              size={180} 
              level="H"
              fgColor="#000000"
              bgColor="#ffffff"
            />
          </div>
          <p style={{ marginTop: 20, fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: '#facc15', letterSpacing: '0.15em' }}>
            {ticket.spta_code || ticket.ticket_code || 'TBC-0000'}
          </p>
        </div>

        {/* Driver & Truck Info */}
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <p style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Armada Truk</p>
            <p style={{ color: '#fff', fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{ticket.truck_number}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Pengemudi</p>
            <p style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{ticket.driver_name || profile.full_name}</p>
          </div>
        </div>

        {/* Locations */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 2 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary)' }} />
              <div style={{ width: 2, height: 30, background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#facc15' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <p style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lokasi Penjemputan</p>
                <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginTop: 2 }}>{ticket.plot_name}</p>
              </div>
              <div>
                <p style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pabrik Tujuan</p>
                <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginTop: 2 }}>{ticket.mill_name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule & Payload details */}
        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <DetailItem label="Berangkat" value={ticket.departure_time || '-'} icon={<Navigation size={14} />} />
          <DetailItem label="Slot Pabrik" value={formatTime(ticket.scheduled_slot)} icon={<CalendarClock size={14} />} />
          <DetailItem label="Muat di Kebun" value={ticket.pickup_time || '-'} icon={<MapPin size={14} />} />
          <DetailItem label="Est. Tonase" value={`${ticket.tonnage || 0} Ton`} highlight icon={<Truck size={14} />} />
        </div>
        </div>
      </>
    )}
    </div>
  );
}

function DetailItem({ label, value, highlight, icon }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <p style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
        {icon} {label}
      </p>
      <p style={{ color: highlight ? '#facc15' : '#fff', fontSize: 14, fontWeight: highlight ? 800 : 600 }}>
        {value}
      </p>
    </div>
  );
}
