import { useState, useEffect, useRef } from 'react';
import { Truck, Factory, PauseCircle, RefreshCw, Wifi, WifiOff, Clock, AlertTriangle, MapPin } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { getElapsedHours, formatElapsed, calculateDepartureSchedule } from '../utils/sugarcaneMath.js';

// ── Mock data ──
const MOCK_FLEET = [
  {
    id: 'mock-1', plate_number: 'B 9182 KQA', driver_name: 'Sutrisno P.', tonnage: 22.4, status: 'in_transit',
    harvest_time: new Date(Date.now() - (3 * 3600000)).toISOString(),
    scheduled_slot: new Date(Date.now() + 600000).toISOString(),
    mill_name: 'PG Situbondo'
  },
  {
    id: 'mock-2', plate_number: 'N 8102 UQ', driver_name: 'Ahmad Dahlan', tonnage: 24.5, status: 'in_transit',
    harvest_time: new Date(Date.now() - (4 * 3600000)).toISOString(),
    scheduled_slot: new Date(Date.now() - 3600000).toISOString(),
    mill_name: 'PG Situbondo'
  },
  {
    id: 'mock-3', plate_number: 'W 8129 PQ', driver_name: 'Bambang U.', tonnage: 18.2, status: 'queued',
    harvest_time: new Date(Date.now() - (6 * 3600000)).toISOString(),
    scheduled_slot: null,
    mill_name: 'PG Situbondo'
  }
];

// ── Helpers ──
function getRendemenInfo(harvestTime) {
  if (!harvestTime) return null;
  try {
    const h = getElapsedHours(harvestTime);
    return { elapsed: formatElapsed(h) };
  } catch { return null; }
}

// ── FleetCard ──
function FleetCard({ row }) {
  let statusLabel = row.status.toUpperCase();
  if (row.status === 'in_transit') statusLabel = 'DI JALAN';
  
  let badgeProps = { label: statusLabel, color: 'var(--color-on-surface-variant)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' };
  let isLateBuffer = false;
  let scheduleInfo = null;
  let urgencyIcon = null;

  if (row.scheduled_slot) {
    const schedule = calculateDepartureSchedule({ targetSlotTime: row.scheduled_slot });
    scheduleInfo = schedule;
    if (schedule.status === 'LATE_BUFFER') {
      badgeProps = { label: 'Slot Hangus (Jalur Buffer)', color: 'var(--color-error)', bg: 'rgba(255,180,171,0.1)', border: 'rgba(255,180,171,0.3)' };
      isLateBuffer = true;
      urgencyIcon = <AlertTriangle size={12} color="var(--color-error)" />;
    } else if (schedule.status === 'GRACE_PERIOD') {
      badgeProps = { label: 'Mendekati Batas Toleransi Keterlambatan', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' };
      urgencyIcon = <Clock size={12} color="#f59e0b" />;
    } else if (schedule.status === 'ON_TRACK') {
      badgeProps = { label: `Tepat Waktu: ${schedule.departureTimeFormatted}`, color: 'var(--color-tertiary)', bg: 'rgba(166,214,79,0.1)', border: 'rgba(166,214,79,0.3)' };
      urgencyIcon = <Clock size={12} color="var(--color-tertiary)" />;
    } else if (schedule.status === 'EARLY') {
      badgeProps = { label: `Sesuai Jadwal — ETA ${schedule.departureTimeFormatted}`, color: 'var(--color-primary)', bg: 'rgba(163,212,137,0.1)', border: 'rgba(163,212,137,0.3)' };
    }
  } else if (row.status === 'queued') {
    badgeProps = { label: 'Antre di Meja Timbang', color: 'var(--color-on-surface-variant)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' };
  } else if (row.status === 'milling') {
    badgeProps = { label: 'Selesai Timbang (Giling)', color: 'var(--color-primary)', bg: 'rgba(163,212,137,0.1)', border: 'rgba(163,212,137,0.3)' };
  }

  const rInfo = getRendemenInfo(row.harvest_time);

  return (
    <div
      className="glass-card"
      style={{
        padding: '16px',
        display: 'flex', flexDirection: 'column', gap: 12,
        position: 'relative', overflow: 'hidden',
        background: isLateBuffer ? 'rgba(255,180,171,0.03)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isLateBuffer ? 'rgba(255,180,171,0.15)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Truck size={18} color="var(--color-white)" />
          </div>
          <div>
            <h4 className="text-body-lg c-white" style={{ fontWeight: 700 }}>
              {row.plate_number}
            </h4>
            <p className="text-caps c-on-surface-var" style={{ fontSize: 10, marginTop: 2 }}>
              {row.driver_name || 'Tanpa Nama'}
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="text-caps c-on-surface-var" style={{ marginBottom: 2 }}>TONASE BERSIH (NETTO)</p>
          <p className="text-body c-white" style={{ fontWeight: 700, fontSize: 15 }}>
            {row.tonnage} T
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={12} color="var(--color-on-surface-variant)" />
            <span className="text-caps c-on-surface-var" style={{ fontSize: 10 }}>TUJUAN</span>
          </div>
          <span className="text-caps c-white" style={{ fontSize: 10, fontWeight: 600 }}>{row.mill_name || 'PG Tujuan'}</span>
        </div>

        {row.scheduled_slot && scheduleInfo && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={12} color="var(--color-on-surface-variant)" />
              <span className="text-caps c-on-surface-var" style={{ fontSize: 10 }}>SLOT TIMBANG PG</span>
            </div>
            <span className="text-caps c-white" style={{ fontSize: 10, fontWeight: 600 }}>{scheduleInfo.targetSlotFormatted}</span>
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 20, width: 'fit-content',
          background: badgeProps.bg, border: `1px solid ${badgeProps.border}`,
        }}>
          {urgencyIcon}
          <span className="text-caps" style={{ color: badgeProps.color, fontSize: 10, fontWeight: 700 }}>
            {badgeProps.label}
          </span>
        </div>
        
        {rInfo && (
          <p className="text-caps c-on-surface-var" style={{ fontSize: 10, marginTop: 4 }}>
            Tunda Giling: {rInfo.elapsed}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Component ──
export default function TruckScreen({ active }) {
  const [fleet, setFleet] = useState([]);
  const [mills, setMills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMock, setIsMock] = useState(false);
  const [filter, setFilter] = useState('all'); // all, in_transit, queued, late_buffer
  const [lastSynced, setLastSynced] = useState(null);
  const channelRef = useRef(null);

  const fetchTrucksAndMills = async () => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      setFleet(MOCK_FLEET);
      setMills([{ name: 'PG Situbondo', capacity_tcd: 3500 }]);
      setIsMock(true);
      setLoading(false);
      setLastSynced(new Date());
      return;
    }

    try {
      // Fetch mills
      const { data: millsData } = await supabase.from('sugar_mills').select('*');
      setMills(millsData || []);

      // Fetch spta_tickets instead of obsolete truck_dispatches
      const { data: ticketData, error: fetchError } = await supabase
        .from('spta_tickets')
        .select(`
          *,
          harvest_records (
            mill_name
          )
        `)
        .neq('status', 'completed')
        .order('scheduled_slot', { ascending: true });

      if (fetchError) throw fetchError;

      // Try to map mill_name if possible (assuming batch_id could link to mill_id, but for now just use first mill or fallback)
      const mappedFleet = (ticketData || []).map(t => {
        let millName = t.harvest_records?.mill_name || 'PG Tujuan';
        if (millName === 'PG Tujuan' && millsData && millsData.length > 0) millName = millsData[0].name;
        
        return { 
          ...t, 
          mill_name: millName,
          harvest_time: t.created_at || new Date().toISOString() 
        };
      });

      setFleet(mappedFleet);
      setIsMock(false);
    } catch (err) {
      console.error('Fetch error:', err.message);
      setError(err.message);
      setFleet(MOCK_FLEET);
      setMills([{ name: 'PG Situbondo', capacity_tcd: 3500 }]);
      setIsMock(true);
    } finally {
      setLoading(false);
      setLastSynced(new Date());
    }
  };

  const subscribeRealtime = () => {
    if (!isSupabaseConfigured || !supabase) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    channelRef.current = supabase
      .channel('spta_tickets_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spta_tickets' }, () => {
        // Just re-fetch completely to keep it simple and ensure relations map correctly
        fetchTrucksAndMills();
      })
      .subscribe();
  };

  useEffect(() => {
    fetchTrucksAndMills();
    subscribeRealtime();
    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncTime = lastSynced
    ? lastSynced.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  // Evaluate late buffer for filtering
  const evaluatedFleet = fleet.map(row => {
    let isLate = false;
    if (row.scheduled_slot) {
      const schedule = calculateDepartureSchedule({ targetSlotTime: row.scheduled_slot });
      if (schedule.status === 'LATE_BUFFER') isLate = true;
    }
    return { ...row, isLate };
  });

  const filteredFleet = evaluatedFleet.filter(row => {
    if (filter === 'all') return true;
    if (filter === 'late_buffer') return row.isLate;
    if (filter === 'in_transit') return row.status === 'in_transit' && !row.isLate;
    if (filter === 'queued') return row.status === 'queued' || row.status === 'milling';
    return true;
  });

  return (
    <div className={`view-layer${active ? ' active' : ''} hide-scrollbar`} style={{ paddingBottom: 120 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <h2 className="text-h2 c-white">Monitoring Logistik & Antrean Pabrik Gula</h2>
            <p className="text-caps c-on-surface-var" style={{ fontSize: 10, marginTop: 3 }}>
              {isMock
                ? 'MODE DEMO — isi .env.local untuk koneksi live'
                : syncTime ? `Terakhir sinkron: ${syncTime}` : 'Memuat…'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: isMock ? 'rgba(255,180,171,0.1)' : 'rgba(163,212,137,0.1)',
              border: `1px solid ${isMock ? 'rgba(255,180,171,0.25)' : 'rgba(163,212,137,0.25)'}`,
              borderRadius: 99, padding: '4px 10px',
            }}>
              {isMock
                ? <WifiOff size={11} color="var(--color-error)" />
                : <Wifi    size={11} color="var(--color-primary)" />
              }
              <span className="text-caps" style={{ fontSize: 10, color: isMock ? 'var(--color-error)' : 'var(--color-primary)' }}>
                {isMock ? 'OFFLINE' : 'LIVE'}
              </span>
            </div>
            <button
              onClick={fetchTrucksAndMills}
              disabled={loading}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-on-surface-variant)', cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s',
              }}
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* ── Sugar Mill Traffic Header ── */}
        <div style={{ display: 'flex', overflowX: 'auto', gap: 8, paddingBottom: 4, width: '100%', flexShrink: 0 }} className="hide-scrollbar">
          {(mills.length > 0 ? mills : [{name: 'PG Situbondo', capacity_tcd: 4000}]).map((mill, idx) => (
            <div key={idx} style={{ 
              background: 'rgba(16,20,21,0.8)', border: '1px solid rgba(255,255,255,0.08)', 
              borderRadius: 12, padding: '10px 14px', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <Factory size={16} color="var(--color-on-surface-variant)" />
              <div>
                <p className="text-body c-white" style={{ fontWeight: 600, fontSize: 13 }}>{mill.name}</p>
                <p className="text-caps c-on-surface-var" style={{ fontSize: 10, marginTop: 2 }}>
                  {mill.name.toLowerCase().includes('panji') ? 'Padat Antrean' : 'Normal'} • {mill.capacity_tcd?.toLocaleString('id-ID') || '3.500'} Ton/Hari
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter Tabs ── */}
        <div style={{ display: 'flex', overflowX: 'auto', gap: 8, paddingBottom: 4, width: '100%', flexShrink: 0 }} className="hide-scrollbar">
          {[
          { id: 'all',         label: 'Semua Armada'          },
            { id: 'in_transit',  label: 'Dalam Perjalanan'           },
            { id: 'queued',      label: 'Antre di Pabrik'        },
            { id: 'late_buffer', label: 'Jalur Buffer (Cadangan)' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                whiteSpace: 'nowrap', padding: '8px 16px', borderRadius: 20,
                border: '1px solid',
                borderColor: filter === f.id ? 'var(--color-tertiary)' : 'rgba(255,255,255,0.1)',
                background: filter === f.id ? 'rgba(166,214,79,0.1)' : 'rgba(255,255,255,0.03)',
                color: filter === f.id ? 'var(--color-tertiary)' : 'var(--color-on-surface-variant)',
                fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Loading skeletons ── */}
        {loading && fleet.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 120, borderRadius: 16, background: 'rgba(255,255,255,0.04)', animation: 'pulse-glow 2s infinite' }} />
            ))}
          </div>
        )}

        {/* ── Fleet cards ── */}
        {!loading && filteredFleet.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }} className="hide-scrollbar">
            {filteredFleet.map((row) => (
              <FleetCard key={row.id} row={row} />
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && filteredFleet.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={28} color="var(--color-on-surface-variant)" />
            </div>
            <p className="text-body-lg c-white" style={{ fontWeight: 600 }}>Tidak ada armada</p>
            <p className="text-caps c-on-surface-var">Filter '{filter === 'all' ? 'Semua Armada' : filter === 'in_transit' ? 'Dalam Perjalanan' : filter === 'queued' ? 'Antre di Pabrik' : 'Jalur Buffer (Cadangan)'}' kosong</p>
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
