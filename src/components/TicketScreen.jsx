import { useState, useEffect } from 'react';
import { ShieldCheck, QrCode, Clock, MapPin, Share2, PlusCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function TicketScreen({ active, activeSpta, onOpenHarvestModal }) {
  const [selectedTruckIndex, setSelectedTruckIndex] = useState(0);

  // Reset index when batch changes
  useEffect(() => {
    setSelectedTruckIndex(0);
  }, [activeSpta]);

  const trucks = activeSpta?.batch_trucks || (activeSpta ? [activeSpta] : []);
  const currentTicket = trucks[selectedTruckIndex] || null;

  const handleShareWA = () => {
    if (!currentTicket) return;
    const formatTime = (isoString) => {
      if (!isoString) return '-';
      return new Date(isoString).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    const text = `*TIKET SPTA TEBU.CO*\n\n` +
      `Sopir: ${currentTicket.driver_name || '-'}\n` +
      `Nomor Polisi: ${currentTicket.plate_number}\n` +
      `Estimasi Muatan: ${currentTicket.tonnage} Ton\n\n` +
      `Wajib Berangkat dari Kebun: ${formatTime(currentTicket.departure_time)}\n` +
      `Jadwal Slot Timbang di PG: ${formatTime(currentTicket.scheduled_slot)}\n\n` +
      `*KODE VERIFIKASI TIKET:*\n${currentTicket.spta_ticket}\n\n` +
      `Tunjukkan QR Code di aplikasi Tebu.Co saat tiba di Pos Timbang Pabrik Gula.`;
      
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const formatTime = (isoString) => {
    if (!isoString || isoString === '-') return '-';
    return new Date(isoString).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <div className={`view-layer${active ? ' active' : ''} hide-scrollbar`}>
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 16,
          }}
        >
          {/* ── Heading ── */}
          <div style={{ textAlign: 'center', width: '100%', flexShrink: 0 }}>
            <h2 className="text-h3 c-white">Surat Perintah Tebang Angkut (SPTA Digital)</h2>
            {currentTicket && (
              <p className="text-caps c-on-surface-var" style={{ marginTop: 4 }}>
                KLOTER PANEN: {trucks.length > 1 ? `${trucks.length} ARMADA TRUK` : '1 ARMADA TRUK'}
              </p>
            )}
          </div>

          {!currentTicket ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QrCode size={32} color="var(--color-on-surface-variant)" />
              </div>
              <div>
                <p className="text-body-lg c-white" style={{ fontWeight: 600 }}>Belum ada tiket panen aktif.</p>
                <p className="text-body c-on-surface-var" style={{ fontSize: 13, marginTop: 4 }}>Silakan daftarkan panen terlebih dahulu.</p>
              </div>
              <button 
                className="btn-primary" 
                onClick={onOpenHarvestModal}
                style={{ marginTop: 12, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <PlusCircle size={18} />
                Buat Tiket Panen Baru
              </button>
            </div>
          ) : (
            <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }} className="hide-scrollbar">
              
              {/* Pill Selector for Multi-Truck */}
              {trucks.length > 1 && (
                <div style={{ display: 'flex', overflowX: 'auto', gap: 8, paddingBottom: 4, width: '100%', flexShrink: 0 }} className="hide-scrollbar">
                  {trucks.map((t, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedTruckIndex(idx)}
                      style={{
                        whiteSpace: 'nowrap', padding: '8px 16px', borderRadius: 20,
                        border: '1px solid',
                        borderColor: selectedTruckIndex === idx ? 'var(--color-tertiary)' : 'rgba(255,255,255,0.1)',
                        background: selectedTruckIndex === idx ? 'rgba(166,214,79,0.1)' : 'rgba(255,255,255,0.03)',
                        color: selectedTruckIndex === idx ? 'var(--color-tertiary)' : 'var(--color-on-surface-variant)',
                        fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Armada Truk #{idx + 1} — {t.plate_number}
                    </button>
                  ))}
                </div>
              )}

              {/* Main Ticket UI */}
              <div
                className="glass-card"
                style={{
                  padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  position: 'relative', width: '100%', gap: 16,
                  boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                  flexShrink: 0
                }}
              >
                {/* Corner brackets */}
                {[
                  { style: { top: 12, left: 12 },    bt: true, bl: true  },
                  { style: { top: 12, right: 12 },   bt: true, br: true  },
                  { style: { bottom: 12, left: 12 }, bb: true, bl: true  },
                  { style: { bottom: 12, right: 12 }, bb: true, br: true },
                ].map(({ style: pos, bt, bl, br, bb }, i) => (
                  <div
                    key={i} aria-hidden="true"
                    style={{
                      position: 'absolute', width: 16, height: 16, ...pos,
                      borderTopWidth:    bt ? 2 : 0,
                      borderLeftWidth:   bl ? 2 : 0,
                      borderRightWidth:  br ? 2 : 0,
                      borderBottomWidth: bb ? 2 : 0,
                      borderStyle: 'solid', borderColor: 'rgba(166,214,79,0.5)',
                    }}
                  />
                ))}

                <div
                  style={{
                    background: '#ffffff', borderRadius: 12, padding: 10, lineHeight: 0,
                    boxShadow: '0 0 0 4px rgba(166,214,79,0.12), 0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <QRCodeSVG
                    value={currentTicket.spta_ticket}
                    size={140} fgColor="#0a0a0a" bgColor="#ffffff" level="H" includeMargin={false}
                  />
                </div>

                <p className="text-caps c-on-surface-var" style={{ fontSize: 11, letterSpacing: '0.05em', textAlign: 'center', wordBreak: 'break-all' }}>
                  {currentTicket.spta_ticket}
                </p>

                {/* Truck & Driver Details */}
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  <div className="glass-card-dark" style={{ flex: 1, textAlign: 'center', padding: '10px 6px', borderRadius: 10 }}>
                    <p className="text-caps c-on-surface-var" style={{ fontSize: 9, marginBottom: 4 }}>KENDARAAN / TRUK</p>
                    <p className="text-body c-white" style={{ fontWeight: 700, fontSize: 13 }}>
                      {currentTicket.plate_number}
                    </p>
                  </div>
                  <div className="glass-card-dark" style={{ flex: 1, textAlign: 'center', padding: '10px 6px', borderRadius: 10 }}>
                    <p className="text-caps c-on-surface-var" style={{ fontSize: 9, marginBottom: 4 }}>NAMA SOPIR</p>
                    <p className="text-body c-white" style={{ fontWeight: 700, fontSize: 13, textTransform: 'capitalize' }}>
                      {currentTicket.driver_name || '-'}
                    </p>
                  </div>
                  <div style={{
                      flex: 1, textAlign: 'center', padding: '10px 6px', borderRadius: 10,
                      background: 'rgba(163,212,137,0.1)', border: '1px solid rgba(163,212,137,0.25)',
                    }}
                  >
                    <p className="text-caps c-primary" style={{ fontSize: 9, marginBottom: 4 }}>EST. MUATAN</p>
                    <p className="text-body c-primary" style={{ fontWeight: 700, fontSize: 13 }}>
                      {currentTicket.tonnage} Ton
                    </p>
                  </div>
                </div>

                {/* Logistics Schedule Info */}
                <div style={{ width: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={14} color="var(--color-primary)" />
                      <p className="text-caps c-on-surface-var" style={{ fontSize: 10 }}>PABRIK GULA TUJUAN</p>
                    </div>
                    <p className="text-body c-white" style={{ fontWeight: 600, fontSize: 13 }}>
                      {currentTicket.mill_name || currentTicket.target_mill || activeSpta?.mill_name || 'PG Asembagus'}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} color="var(--color-tertiary)" />
                      <p className="text-caps c-on-surface-var" style={{ fontSize: 10 }}>WAKTU WAJIB BERANGKAT DARI KEBUN</p>
                    </div>
                    <p className="text-body c-white" style={{ fontWeight: 600, fontSize: 13 }}>
                      {formatTime(currentTicket.departure_time)}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShieldCheck size={14} color="var(--color-primary)" />
                      <p className="text-caps c-on-surface-var" style={{ fontSize: 10 }}>JADWAL SLOT TIMBANG DI PG</p>
                    </div>
                    <p className="text-body c-primary" style={{ fontWeight: 700, fontSize: 13 }}>
                      {formatTime(currentTicket.scheduled_slot)}
                    </p>
                  </div>

                </div>

                {/* Share Button */}
                <button
                  onClick={handleShareWA}
                  style={{
                    width: '100%', padding: '12px', background: 'rgba(37, 211, 102, 0.1)', color: '#25D366',
                    border: '1px solid rgba(37, 211, 102, 0.3)', borderRadius: 10,
                    fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, cursor: 'pointer'
                  }}
                >
                  <Share2 size={16} />
                  Bagikan Tiket via WhatsApp ke Sopir
                </button>
              </div>

            </div>
          )}

        </div>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
