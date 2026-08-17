import { useState, useEffect, useCallback } from 'react';
import { Clock, QrCode, AlertTriangle, TrendingDown, Plus, BellRing, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getElapsedHours,
  calcRendemen,
  calcEstimatedIncome,
  formatCountdown,
  formatElapsed,
  formatIDR,
  getDelayUrgency,
  isCriticalDelay,
  BASE_RENDEMEN,
  calculateFinancials,
  calculateDepartureSchedule
} from '../utils/sugarcaneMath.js';
import PlotHarvestModal from './PlotHarvestModal.jsx';
import YieldDecayChart from './YieldDecayChart.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const URGENCY_COLORS = {
  safe: { bg: 'rgba(163,212,137,0.08)', border: 'rgba(163,212,137,0.25)', text: 'var(--color-primary)' },
  warning: { bg: 'rgba(166,214,79,0.08)', border: 'rgba(166,214,79,0.25)', text: 'var(--color-tertiary)' },
  critical: { bg: 'rgba(255,180,171,0.10)', border: 'rgba(255,180,171,0.3)', text: 'var(--color-error)' },
};

function useLiveSugarcaneData(harvestTs, tickMs = 30_000) {
  const compute = useCallback(() => {
    if (!harvestTs) return null;
    const ts = new Date(harvestTs);
    if (isNaN(ts.getTime())) return null;

    const elapsed = getElapsedHours(ts);
    const rendemen = calcRendemen(elapsed);
    const income = calcEstimatedIncome(rendemen);
    const urgency = getDelayUrgency(elapsed);
    const critical = isCriticalDelay(elapsed);
    const countdown = formatCountdown(elapsed);
    const elapsedStr = formatElapsed(elapsed);
    const loss = BASE_RENDEMEN - rendemen;
    return { elapsed, rendemen, income, urgency, critical, countdown, elapsedStr, loss };
  }, [harvestTs]);

  const [data, setData] = useState(compute);

  useEffect(() => {
    setData(compute());
    const id = setInterval(() => setData(compute()), tickMs);
    return () => clearInterval(id);
  }, [compute, tickMs]);

  return data;
}

export default function HomeScreen({ active, user, activeSpta, onHarvestLogged, onGenerateSPTA, isModalOpen, setIsModalOpen }) {
  const liveData = useLiveSugarcaneData(activeSpta?.harvest_time);
  const [totalArea, setTotalArea] = useState(0);
  const [totalEst, setTotalEst] = useState(0);
  const [showFinanceDetails, setShowFinanceDetails] = useState(false);
  const [plotUpdateTick, setPlotUpdateTick] = useState(0);

  useEffect(() => {
    async function fetchStats() {
      if (user?.isDemo) {
        setTotalArea(15);
        setTotalEst(120);
        return;
      }
      if (!isSupabaseConfigured || !user) return;
      try {
        const { data } = await supabase.from('plots').select('area_ha, est_tonnage').eq('farmer_id', user.id);
        if (data) {
          setTotalArea(data.reduce((sum, p) => sum + (p.area_ha || 0), 0));
          setTotalEst(data.reduce((sum, p) => sum + (p.est_tonnage || 0), 0));
        }
      } catch (err) {
        console.error('Stats error:', err);
      }
    }
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isModalOpen, plotUpdateTick]);

  const batchTrucks = activeSpta?.batch_trucks || (activeSpta ? [activeSpta] : []);
  const totalGrossTonnage = batchTrucks.reduce((sum, t) => sum + (Number(t.tonnage) || 0), 0);

  const financials = liveData && totalGrossTonnage > 0
    ? calculateFinancials({
      grossTonnage: totalGrossTonnage,
      rendemenPct: liveData.rendemen
    })
    : null;

  const nextTruck = batchTrucks.find(t => {
    if (!t.scheduled_slot) return false;
    const schedule = calculateDepartureSchedule({ targetSlotTime: t.scheduled_slot });
    return schedule.status === 'EARLY' || schedule.status === 'ON_TRACK';
  });

  return (
    <div className={`view-layer${active ? ' active' : ''} hide-scrollbar`}
      style={{ paddingBottom: 100 }}   /* ensure content clears the fixed BottomNav */
    >
      {/* ── Welcome heading ── */}
      <div style={{ marginBottom: 12 }}>
        <p className="text-caps c-on-surface-var" style={{ marginBottom: 4 }}>
          SELAMAT DATANG
        </p>
        <h2 className="text-display c-on-surface" style={{ fontSize: 28 }}>
          {user?.full_name?.split(' ')[0] || 'Petani'}
        </h2>
      </div>

      {/* ── Dynamic Departure Alert Banner ── */}
      {nextTruck && (
        <div style={{
          padding: 14, borderRadius: 12, marginBottom: 16,
          background: 'rgba(166,214,79,0.1)', border: '1px solid var(--color-tertiary)',
          display: 'flex', alignItems: 'flex-start', gap: 12,
          boxShadow: '0 0 20px rgba(166,214,79,0.15)',
          animation: 'pulse-glow 2s infinite alternate'
        }}>
          <BellRing size={20} color="var(--color-tertiary)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <p className="text-caps c-tertiary" style={{ fontSize: 10, fontWeight: 700, marginBottom: 4 }}>REKOMENDASI WAKTU BERANGKAT</p>
            <p className="text-body c-white" style={{ fontSize: 13, lineHeight: 1.4 }}>
              Armada <b>{nextTruck.plate_number}</b> Wajib Berangkat Pukul <b>{calculateDepartureSchedule({ targetSlotTime: nextTruck.scheduled_slot }).departureTimeFormatted} WIB</b> (Sisa {calculateDepartureSchedule({ targetSlotTime: nextTruck.scheduled_slot }).minutesToDepart} Menit)
            </p>
          </div>
        </div>
      )}

      {/* ── Area metrics row ── */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8,
          marginBottom: 16,
        }}
      >
        {[
          { label: 'LAHAN', value: totalArea.toFixed(1), unit: 'Ha' },
          { label: 'ESTIMASI', value: totalEst.toFixed(0), unit: 'Ton' },
          { label: 'UMUR', value: '11', unit: 'Bulan' },
        ].map(({ label, value, unit }) => (
          <div key={label} className="stat-mini" style={{ textAlign: 'center', padding: '10px 4px', minWidth: 0, overflow: 'hidden' }}>
            <p className="text-caps c-on-surface-var" style={{ marginBottom: 2, fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
            <p className="text-stat c-primary" style={{ lineHeight: 1.1, fontSize: 'clamp(16px,4vw,28px)', wordBreak: 'break-all' }}>
              {value}
              <span className="text-body c-on-surface-var" style={{ fontSize: 'clamp(10px,2.5vw,12px)' }}> {unit}</span>
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        style={{
          width: '100%', padding: '12px', marginBottom: 16,
          background: 'var(--color-surface-container)', color: 'var(--color-primary)',
          border: '1px dashed rgba(166,214,79,0.3)', borderRadius: 14,
          fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
          cursor: 'pointer', transition: 'background 0.2s, border 0.2s',
        }}
        onMouseOver={e => e.currentTarget.style.background = 'rgba(166,214,79,0.1)'}
        onMouseOut={e => e.currentTarget.style.background = 'var(--color-surface-container)'}
      >
        <Plus size={16} />
        Input Sawah / Panen
      </button>

      {/* ── Priority Queue Card ── */}
      <div
        className="glass-card"
        style={{
          padding: 20, position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', gap: 14,
          flexShrink: 0,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        {!liveData ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 12, padding: '20px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} color="var(--color-on-surface-variant)" />
            </div>
            <div>
              <p className="text-body-lg c-white" style={{ fontWeight: 600 }}>Belum ada panen aktif</p>
              <p className="text-body c-on-surface-var" style={{ fontSize: 13, marginTop: 4 }}>Klik Input Sawah / Panen untuk memulai tunda giling.</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Card header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <div>
                <p className="text-caps c-tertiary" style={{ marginBottom: 4 }}>ANTREAN AKTIF · PRIORITAS</p>
                <h3 className="text-h3 c-white">
                  {batchTrucks.length > 1 ? `KLOTER (${batchTrucks.length} TRUK)` : `TRUK #${activeSpta.plate_number}`}
                </h3>
                <p className="text-caps c-on-surface-var" style={{ marginTop: 3, fontSize: 10 }}>
                  Panen: {liveData.elapsedStr} yang lalu
                </p>
              </div>

              {/* Live countdown chip */}
              <span className={`chip ${liveData.urgency === 'safe' ? 'chip-primary' : liveData.urgency === 'warning' ? 'chip-tertiary' : 'chip'}`} style={{ marginTop: 4, ...(liveData.urgency === 'critical' ? { background: 'rgba(255,180,171,0.15)', color: 'var(--color-error)', border: '1px solid rgba(255,180,171,0.3)' } : {}) }}>
                <Clock size={13} />
                {liveData.countdown}
              </span>
            </div>

            {/* ── Tunda Giling warning banner ── */}
            <div
              style={{
                background: URGENCY_COLORS[liveData.urgency].bg,
                border: `1px solid ${URGENCY_COLORS[liveData.urgency].border}`,
                borderRadius: 10, padding: '8px 12px',
                position: 'relative', zIndex: 1,
                transition: 'background 0.4s, border-color 0.4s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {liveData.critical
                ? <AlertTriangle size={13} color={URGENCY_COLORS[liveData.urgency].text} style={{ flexShrink: 0 }} />
                : <Clock size={13} color={URGENCY_COLORS[liveData.urgency].text} style={{ flexShrink: 0 }} />
              }
              <p className="text-caps" style={{ color: URGENCY_COLORS[liveData.urgency].text }}>
                {liveData.critical
                  ? `KRITIS! SUDAH ${liveData.elapsedStr} — KUALITAS TEBU SANGAT MENURUN`
                  : `WAKTU TUNDA GILING: ${liveData.elapsedStr} BERLALU (BATAS MAKS. 24 JAM)`
                }
              </p>
            </div>

            {/* ── Rendemen degradation progress bar ── */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <p className="text-caps c-on-surface-var">KUALITAS NIRA</p>
                <p className="text-caps" style={{ color: URGENCY_COLORS[liveData.urgency].text }}>
                  -{liveData.loss.toFixed(2)}% hilang
                </p>
              </div>
              <div
                style={{
                  width: '100%', height: 6, borderRadius: 3,
                  background: 'rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(liveData.rendemen / BASE_RENDEMEN) * 100}%`,
                    background: liveData.urgency === 'critical'
                      ? 'var(--color-error)'
                      : liveData.urgency === 'warning'
                        ? 'var(--color-tertiary)'
                        : 'var(--color-primary)',
                    borderRadius: 3,
                    transition: 'width 1s ease, background 0.4s',
                  }}
                />
              </div>
            </div>

            {/* ── Stats 2-col ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, position: 'relative', zIndex: 1 }}>
              {/* Rendemen — live */}
              <div className="stat-mini">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p className="text-caps c-on-surface-var">RENDEMEN</p>
                  {liveData.loss > 0 && (
                    <TrendingDown size={11} color={liveData.urgency === 'critical' ? 'var(--color-error)' : 'var(--color-tertiary)'} />
                  )}
                </div>
                <p className="text-stat" style={{ color: liveData.urgency === 'critical' ? 'var(--color-error)' : 'var(--color-primary)' }}>
                  {liveData.rendemen.toFixed(2)}
                  <span className="text-body c-on-surface-var" style={{ fontSize: 14 }}>%</span>
                </p>
                <p className="text-caps c-on-surface-var" style={{ fontSize: 10, marginTop: 2 }}>
                  basis {BASE_RENDEMEN}%
                </p>
              </div>

              {/* Est. Income — quick view */}
              <div className="stat-mini">
                <p className="text-caps c-on-surface-var" style={{ marginBottom: 4 }}>EST. MUATAN</p>
                <p className="text-stat c-white">
                  {totalGrossTonnage.toFixed(1)}
                  <span className="text-body c-on-surface-var" style={{ fontSize: 14 }}> Ton</span>
                </p>
              </div>
            </div>

            {/* ── Yield Decay Curve ── */}
            <YieldDecayChart elapsedHours={liveData.elapsed} />
          </>
        )}
      </div>

      {/* ── Transparent Financial Estimator Breakdown (Card) ── */}
      {financials && (
        <div className="glass-card" style={{ padding: 16, marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="text-caps c-tertiary" style={{ fontWeight: 700 }}>RINCIAN HASIL GULA & PENDAPATAN (BAGI HASIL KBR 66%)</p>
            <p className="text-body c-tertiary" style={{ fontWeight: 800, fontSize: 18 }}>
              {formatIDR(financials.farmerNetIncome)}
            </p>
          </div>

          <button
            onClick={() => setShowFinanceDetails(!showFinanceDetails)}
            style={{
              background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', padding: 0, width: 'fit-content'
            }}
          >
            {showFinanceDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            LIHAT FORMULA BAGI HASIL (TRANSPARANSI)
          </button>

          {showFinanceDetails && (
            <div style={{
              marginTop: 4, padding: 14, borderRadius: 10,
              background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
                <span className="text-caps c-on-surface-var" style={{ fontSize: 10, lineHeight: 1.4 }}>Tonase Kotor (Bruto)</span>
                <span className="text-body c-white" style={{ fontSize: 12, fontWeight: 600, textAlign: 'right' }}>{totalGrossTonnage.toFixed(1)} Ton</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
                <span className="text-caps c-on-surface-var" style={{ fontSize: 10, lineHeight: 1.4 }}>Tonase Bersih (Netto) — Potongan Kotoran/Daun (Trash) 4.5%</span>
                <span className="text-body c-white" style={{ fontSize: 12, fontWeight: 600, textAlign: 'right' }}>{financials.netCaneWeight.toFixed(1)} Ton</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
                <span className="text-caps c-on-surface-var" style={{ fontSize: 10, lineHeight: 1.4 }}>Rendemen Aktual (Waktu Tunda Giling)</span>
                <span className="text-body c-white" style={{ fontSize: 12, fontWeight: 600, textAlign: 'right' }}>{liveData.rendemen.toFixed(2)}%</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
                <span className="text-caps c-on-surface-var" style={{ fontSize: 10, lineHeight: 1.4 }}>Estimasi Gula Petani (Kg)</span>
                <span className="text-body c-white" style={{ fontSize: 12, fontWeight: 600, textAlign: 'right' }}>{financials.totalSugarYield.toFixed(0)} Kg</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
                <span className="text-caps c-on-surface-var" style={{ fontSize: 10, lineHeight: 1.4 }}>Nilai Gula — Harga Acuan Gula (HAP Rp 14.500/kg)</span>
                <span className="text-body c-white" style={{ fontSize: 12, fontWeight: 600, textAlign: 'right' }}>{formatIDR(financials.grossSugarValue)}</span>
              </div>
              <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
                <span className="text-caps c-tertiary" style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.4 }}>Bagi Hasil Petani (KBR 66%)</span>
                <span className="text-body c-tertiary" style={{ fontSize: 12, fontWeight: 700, textAlign: 'right' }}>{formatIDR(financials.farmerNetIncome)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CTA ── */}
      {liveData && (
        <button className="btn-cta" style={{ marginTop: 16 }} onClick={onGenerateSPTA}>
          <QrCode size={22} />
          Lihat Tiket SPTA Digital
        </button>
      )}

      {/* Modals */}
      {isModalOpen && (
        <PlotHarvestModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          user={user}
          onHarvestLogged={onHarvestLogged}
          onPlotCreated={() => setPlotUpdateTick(tick => tick + 1)}
        />
      )}

      <style>{`
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 10px rgba(166,214,79,0.1); border-color: rgba(166,214,79,0.3); }
          100% { box-shadow: 0 0 25px rgba(166,214,79,0.4); border-color: rgba(166,214,79,0.8); }
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
