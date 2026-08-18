import { useState, useEffect, useRef } from 'react';
import { Factory, QrCode, CheckCircle, AlertTriangle, Clock, RefreshCw, Truck, Play, Search } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { calculateDepartureSchedule } from '../utils/sugarcaneMath.js';
import MillReportSummary from './MillReportSummary.jsx';

export default function MillAdminScreen({ profile }) {
  const [incomingTrucks, setIncomingTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scannedTruck, setScannedTruck] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [queueTab, setQueueTab] = useState('transit'); // 'transit' | 'buffer'
  const [activeTab, setActiveTab] = useState('timbangan'); // 'timbangan' | 'rekap'
  const videoRef = useRef(null);
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    let stream = null;

    if (!scannedTruck) {
      const startCamera = async () => {
        try {
          // iOS Safari requires:
          //  - facingMode as a plain string (not an object with {exact:})
          //    because {exact:'environment'} throws OverconstrainedError on front-camera-only devices.
          //  - No width/height ideals: they can trigger constraint errors on older iOS.
          //  - HTTPS is required for getUserMedia on iOS (Safari blocks it on HTTP).
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment', // plain string — safe on all iOS devices
            },
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // Some older iOS WebKit versions need an explicit play() call
            // after setting srcObject — the autoPlay attribute alone is not enough.
            videoRef.current.play().catch(() => {
              // Silently swallow the AbortError that fires when the component
              // unmounts before the play() promise resolves.
            });
          }
        } catch (err) {
          console.warn('[MillAdminScreen] Camera access error:', err.name, err.message);

          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            // iOS: user explicitly denied camera access — guide them to Settings.
            setCameraError(
              'Akses kamera ditolak. Buka Pengaturan › Safari › Kamera dan pilih "Izinkan", lalu muat ulang halaman ini.'
            );
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setCameraError('Kamera tidak ditemukan pada perangkat ini. Gunakan input kode tiket manual di bawah.');
          } else if (err.name === 'NotSupportedError' || err.name === 'SecurityError') {
            // Fired on iOS when the page is served over HTTP instead of HTTPS.
            setCameraError(
              'Kamera hanya dapat diakses melalui koneksi HTTPS. Pastikan aplikasi dibuka dengan https://'
            );
          } else {
            setCameraError('Gagal mengakses kamera. Gunakan input kode tiket manual di bawah.');
          }
        }
      };

      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [scannedTruck]);

  const fetchTrucks = async () => {
    setLoading(true);
    if (!isSupabaseConfigured) {
      // Mock data
      setIncomingTrucks([
        {
          id: 'mock-1', plate_number: 'B 9182 KQA', driver_name: 'Sutrisno P.', tonnage: 22.4, status: 'TERJADWAL',
          scheduled_slot: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'mock-2', plate_number: 'N 8102 UQ', driver_name: 'Ahmad Dahlan', tonnage: 24.5, status: 'TERJADWAL',
          scheduled_slot: new Date(Date.now() + 1800000).toISOString(),
        },
        {
          id: 'mock-3', plate_number: 'L 1234 XY', driver_name: 'Budi Santoso', tonnage: 21.0, status: 'BUFFER QUEUE',
          scheduled_slot: new Date(Date.now() - 7200000).toISOString(),
        }
      ]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('spta_tickets')
        .select('*')
        .in('status', ['TERJADWAL', 'BUFFER QUEUE', 'in_transit'])
        .order('scheduled_slot', { ascending: true });

      if (error) throw error;
      setIncomingTrucks(data || []);
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
      fetchTrucks();
    }, []);

    const handleSimulateScan = (truck) => {
      setScannedTruck(truck);
    };

    const handleVerify = async (truck, isLate) => {
      setActionLoading(true);
      // Follow the requested status: DITIMBANG
      const newStatus = isLate ? 'BUFFER QUEUE' : 'DITIMBANG';
      const newArrivalStatus = isLate ? 'LATE_BUFFER' : 'ON_TIME';

      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('spta_tickets')
            .update({ status: newStatus })
            .eq('id', truck.id);

          if (error) throw error;
        } catch (err) {
          console.warn('Fallback to optimistic update due to error:', err);
        }
      }

    // Optimistic UI update
    setIncomingTrucks(prev => prev.map(t => t.id === truck.id ? { ...t, status: newStatus, arrival_status: newArrivalStatus } : t));
        setScannedTruck(null);
        setActionLoading(false);
      };

      const filteredTrucks = incomingTrucks.filter(t =>
        queueTab === 'transit' ? (t.status === 'in_transit' || t.status === 'TERJADWAL') : t.status === 'BUFFER QUEUE'
      );

      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', flex: 1, padding: '80px 24px 24px 24px', boxSizing: 'border-box' }}>
          
          {/* Main Navigation Tabs */}
          <div style={{ display: 'flex', gap: 8, padding: 6, background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, marginBottom: 24, zIndex: 40, flexShrink: 0 }}>
            <button
              onClick={() => setActiveTab('timbangan')}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                ...(activeTab === 'timbangan'
                  ? { background: 'var(--color-primary)', color: '#000', boxShadow: '0 4px 12px rgba(162,255,0,0.2)' }
                  : { background: 'transparent', color: 'rgba(255,255,255,0.6)' })
              }}
            >
              Pos Timbang (Operasional)
            </button>
            <button
              onClick={() => setActiveTab('rekap')}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                ...(activeTab === 'rekap'
                  ? { background: 'var(--color-primary)', color: '#000', boxShadow: '0 4px 12px rgba(162,255,0,0.2)' }
                  : { background: 'transparent', color: 'rgba(255,255,255,0.6)' })
              }}
            >
              Rekapitulasi Laporan
            </button>
          </div>

          {activeTab === 'timbangan' ? (
            <div className="admin-dashboard-grid hide-scrollbar" style={{ padding: 0 }}>

          {/* ── COL 1: Gauges & Mill Stats ── */}
          <div className="admin-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Factory size={24} color="var(--color-primary)" />
              </div>
              <div>
                <h2 className="text-display c-white" style={{ fontSize: 24, lineHeight: 1.2 }}>Ruang Kendali Pabrik Gula</h2>
                <p className="text-caps c-on-surface-var" style={{ fontSize: 10 }}>Mode Petugas PG — Pos Timbang & Kontrol Antrean</p>
              </div>
            </div>

            <div className="glass-card" style={{ padding: 20 }}>
              <p className="text-caps c-on-surface-var" style={{ marginBottom: 4 }}>KAPASITAS GILING HARIAN</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <p className="text-display c-primary" style={{ fontSize: 36 }}>3.2k</p>
                <p className="text-body c-on-surface-var">/ 4k Ton</p>
              </div>
              {/* Progress bar */}
              <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', marginTop: 12 }}>
                <div style={{ width: '80%', height: '100%', background: 'var(--color-primary)' }} />
              </div>
            </div>

            <div className="glass-card" style={{ padding: 20 }}>
              <p className="text-caps c-on-surface-var" style={{ marginBottom: 4 }}>TEBU MASUK HARI INI</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <p className="text-display c-tertiary" style={{ fontSize: 32 }}>142</p>
                <p className="text-body c-on-surface-var">Truk</p>
              </div>
            </div>

            <div className="glass-card" style={{ padding: 20, background: 'rgba(166,214,79,0.1)' }}>
              <p className="text-caps c-tertiary" style={{ marginBottom: 4 }}>RATA-RATA RENDEMEN</p>
              <p className="text-display c-white" style={{ fontSize: 28 }}>268.4 Ton</p>
            </div>
          </div>

          {/* ── COL 2: QR Scanner & Verification Panel ── */}
          <div className="admin-col">
            <div className="glass-card" style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 className="text-h3 c-white">Meja Timbang Utama — Pindai QR Masuk</h3>
                <span className="chip chip-primary"><div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--color-primary)' }} /> ACTIVE</span>
              </div>

              {!scannedTruck ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                  {/* Simulated Webcam View */}
                  <div style={{
                    width: '100%', maxWidth: 320, aspectRatio: '1', border: '2px dashed rgba(255,255,255,0.2)',
                    borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden'
                  }}>
                    {!cameraError ? (
                      <>
                        {/* playsInline — required on iOS to prevent fullscreen takeover.
                        webkit-playsinline — for older iOS WebKit (<10).
                        muted — required for autoplay to work without user gesture on iOS.
                        autoPlay — starts playback automatically once srcObject is set. */}
                        <video
                          ref={videoRef}
                          playsInline
                          autoPlay
                          muted
                          {...{ 'webkit-playsinline': 'true' }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{ position: 'absolute', top: '10%', left: 0, right: 0, height: 2, background: 'rgba(163,212,137,0.8)', boxShadow: '0 0 10px var(--color-primary)', animation: 'scan 2s infinite linear' }} />
                      </>
                    ) : (
                      <div style={{ padding: 20, textAlign: 'center' }}>
                        <AlertTriangle size={32} color="var(--color-error)" style={{ margin: '0 auto 8px' }} />
                        <p className="text-body" style={{ fontSize: 13, color: 'var(--color-error)' }}>{cameraError}</p>
                      </div>
                    )}
                    <style>{`
                  @keyframes scan {
                    0% { top: 10%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                  }
                `}</style>
                  </div>

                  {/* Manual Input Fallback */}
                  <div style={{ width: '100%', maxWidth: 320, marginTop: 32 }}>
                    <p className="text-caps c-on-surface-var" style={{ marginBottom: 12, textAlign: 'center' }}>INPUT KODE TIKET MANUAL</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                        <Search size={16} color="var(--color-on-surface-variant)" />
                        <input
                          type="text"
                          placeholder="Nomor Polisi / Kode Tiket SPTA"
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                          style={{ background: 'none', border: 'none', color: '#fff', padding: '12px', width: '100%', outline: 'none', fontFamily: 'var(--font-mono)' }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (manualCode) {
                            let searchCode = manualCode.trim();
                            try {
                              const parsed = JSON.parse(searchCode);
                              if (parsed.spta_code) searchCode = parsed.spta_code;
                            } catch (e) { /* not JSON */ }

                            const found = incomingTrucks.find(t =>
                              (t.ticket_code && t.ticket_code.toLowerCase().includes(searchCode.toLowerCase())) ||
                              (t.spta_code && t.spta_code.toLowerCase().includes(searchCode.toLowerCase())) ||
                              (t.truck_number && t.truck_number.toLowerCase().includes(searchCode.toLowerCase())) ||
                              (t.plate_number && t.plate_number.toLowerCase().includes(searchCode.toLowerCase())) ||
                              (t.spta_ticket && t.spta_ticket.toLowerCase().includes(searchCode.toLowerCase()))
                            );
                            if (found) handleSimulateScan(found);
                            else alert('Tiket tidak ditemukan di antrean.');
                          }
                        }}
                        style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: 12, padding: '0 16px', fontWeight: 700 }}
                      >
                        CEK
                      </button>
                    </div>

                    {/* Mock test button */}
                    <button
                      onClick={() => { if (incomingTrucks.length > 0) handleSimulateScan(incomingTrucks[0]); else alert('Antrean kosong.'); }}
                      style={{ marginTop: 16, width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(166,214,79,0.3)', background: 'rgba(166,214,79,0.1)', color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
                    >
                      <Play size={16} /> Simulasi Scan Truk #1 (Demo)
                    </button>
                  </div>
                </div>
              ) : (
                // Verification UI
                <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 16, marginBottom: 20 }}>
                    <p className="text-caps c-on-surface-var" style={{ marginBottom: 4 }}>NOMOR POLISI</p>
                    <p className="text-display c-white" style={{ fontSize: 32, marginBottom: 16 }}>{scannedTruck.truck_number || scannedTruck.plate_number}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <p className="text-caps c-on-surface-var">SOPIR</p>
                        <p className="text-body-lg c-white">{scannedTruck.driver_name}</p>
                      </div>
                      <div>
                        <p className="text-caps c-on-surface-var">NETTO (EST)</p>
                        <p className="text-body-lg c-white">{scannedTruck.net_weight_kg ? (scannedTruck.net_weight_kg / 1000) : scannedTruck.tonnage} Ton</p>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    if (!scannedTruck.scheduled_slot) return <p className="text-body c-white">Tidak ada jadwal slot.</p>;
                    const slotDate = new Date(scannedTruck.scheduled_slot);
                    const now = new Date();
                    const diffMinutes = (now.getTime() - slotDate.getTime()) / 60000;
                    const isLate = diffMinutes > 30;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 'auto' }}>
                        <div style={{
                          padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16,
                          background: isLate ? 'rgba(255,180,171,0.1)' : 'rgba(163,212,137,0.1)',
                          border: `1px solid ${isLate ? 'rgba(255,180,171,0.3)' : 'rgba(163,212,137,0.3)'}`
                        }}>
                          {isLate ? <AlertTriangle size={32} color="var(--color-error)" /> : <CheckCircle size={32} color="var(--color-primary)" />}
                          <div>
                            <p className="text-caps" style={{ color: isLate ? 'var(--color-error)' : 'var(--color-primary)', fontWeight: 800, fontSize: 14 }}>
                              {isLate ? 'TERLAMBAT — ALIHKAN KE JALUR CADANGAN' : 'TEPAT WAKTU — TERIMA & TIMBANG'}
                            </p>
                            <p className="text-body c-white" style={{ marginTop: 4 }}>
                              Slot: {slotDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • Datang: {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                          <button
                            onClick={() => setScannedTruck(null)}
                            style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: 'var(--color-white)', border: 'none', fontWeight: 600, fontSize: 16 }}
                          >
                            Batal
                          </button>
                          <button
                            onClick={() => handleVerify(scannedTruck, isLate)}
                            disabled={actionLoading}
                            style={{
                              padding: 16, borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 16,
                              background: isLate ? 'var(--color-error)' : 'var(--color-primary)',
                              color: isLate ? '#410002' : '#0f3800'
                            }}
                          >
                            {actionLoading ? 'Menyimpan...' : (isLate ? 'ALIHKAN KE JALUR CADANGAN' : 'UBAH STATUS: DITIMBANG')}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* ── COL 3: Real-Time Fleet Queue ── */}
          <div className="admin-col">
            <div className="glass-card" style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="text-h3 c-white">Antrean Armada Truk</h3>
                <button onClick={fetchTrucks} style={{ background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}>
                  <RefreshCw size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 12 }}>
                <button
                  onClick={() => setQueueTab('transit')}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', fontWeight: 600, background: queueTab === 'transit' ? 'rgba(255,255,255,0.1)' : 'transparent', color: queueTab === 'transit' ? '#fff' : 'var(--color-on-surface-variant)' }}
                >
                  Dalam Perjalanan
                </button>
                <button
                  onClick={() => setQueueTab('buffer')}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', fontWeight: 600, background: queueTab === 'buffer' ? 'rgba(255,180,171,0.15)' : 'transparent', color: queueTab === 'buffer' ? 'var(--color-error)' : 'var(--color-on-surface-variant)' }}
                >
                  Jalur Cadangan (Buffer)
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }} className="hide-scrollbar">
                {loading ? (
                  <p className="text-body c-on-surface-var" style={{ textAlign: 'center', marginTop: 20 }}>Memuat antrean...</p>
                ) : filteredTrucks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Truck size={32} color="var(--color-on-surface-variant)" style={{ margin: '0 auto 10px' }} />
                    <p className="text-body c-on-surface-var">Antrean kosong.</p>
                  </div>
                ) : (
                  filteredTrucks.map(truck => {
                    const schedule = truck.scheduled_slot ? calculateDepartureSchedule({ targetSlotTime: truck.scheduled_slot }) : null;
                    const isLateStatus = truck.status === 'BUFFER QUEUE';

                    return (
                      <div key={truck.id} style={{
                        padding: 12, borderRadius: 12, border: isLateStatus ? '1px solid rgba(255,180,171,0.2)' : '1px solid rgba(255,255,255,0.1)',
                        background: isLateStatus ? 'rgba(255,180,171,0.05)' : 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div>
                          <p className="text-body-lg c-white" style={{ fontWeight: 700 }}>{truck.truck_number || truck.plate_number}</p>
                          <p className="text-caps c-on-surface-var" style={{ fontSize: 10 }}>{truck.driver_name} • {truck.net_weight_kg ? (truck.net_weight_kg / 1000) : truck.tonnage} Ton</p>
                          {schedule && (
                            <p className="text-caps" style={{ color: isLateStatus ? 'var(--color-error)' : (schedule.statusColor === 'red' ? 'var(--color-error)' : 'var(--color-primary)'), fontSize: 10, marginTop: 4 }}>
                              Slot: {schedule.targetSlotFormatted}
                            </p>
                          )}
                        </div>
                        {/* Only show SCAN button for transit trucks, buffer trucks are already processed or waiting differently, but we can allow scan for them too if needed. */}
                        {!isLateStatus && (
                          <button
                            onClick={() => handleSimulateScan(truck)}
                            style={{
                              background: 'rgba(163,212,137,0.15)', color: 'var(--color-primary)', border: '1px solid rgba(163,212,137,0.3)',
                              padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer'
                            }}
                          >
                            <QrCode size={16} />
                            SCAN
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          </div>
        ) : (
          <MillReportSummary isDemo={profile?.isDemo} />
        )}
      </div>
    );
  }
