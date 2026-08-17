import { useState, useEffect } from 'react';
import { X, Map, Calendar, Scale, Truck, UserCircle, QrCode, Loader2, Save, Factory, Minus, Plus } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

/**
 * PlotHarvestModal — Fixed bottom-sheet modal with scrollable body + sticky CTA footer.
 * Ensures submit buttons are always visible above the bottom nav.
 */
export default function PlotHarvestModal({ isOpen, onClose, user, onHarvestLogged }) {
  const [activeTab, setActiveTab] = useState('plot');

  // Tab A: Plot
  const [plotName, setPlotName]     = useState('');
  const [area, setArea]             = useState('');
  const [variety, setVariety]       = useState('VMC 76-16');
  const [plantDate, setPlantDate]   = useState('');
  const [estTonnage, setEstTonnage] = useState('');

  // Tab B: Harvest
  const [sugarMills, setSugarMills]     = useState([]);
  const [selectedMill, setSelectedMill] = useState('');
  const [plots, setPlots]               = useState([]);
  const [selectedPlot, setSelectedPlot] = useState('');
  const [harvestTime, setHarvestTime]   = useState('');
  const [totalLoadTonnage, setTotalLoadTonnage] = useState('');
  const [truckCount, setTruckCount]     = useState(1);
  const [trucks, setTrucks]             = useState([{ plate: '', driver: '' }]);

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => {
    if (isOpen && user && isSupabaseConfigured && !user.isDemo) {
      fetchPlots();
      fetchMills();
    } else if (isOpen && user?.isDemo) {
      setPlots([{ id: 'demo-1', plot_name: 'Blok Asembagus (Demo)' }]);
      setSelectedPlot('demo-1');
      setSugarMills([
        { id: 'mill-1', name: 'PG Asembagus', capacity_tcd: 4000, slot_interval_minutes: 15 },
        { id: 'mill-2', name: 'PG Prajekan',  capacity_tcd: 3000, slot_interval_minutes: 20 },
      ]);
      setSelectedMill('mill-1');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const fetchPlots = async () => {
    try {
      // Try canonical table name first, fall back to legacy name
      let { data, error } = await supabase
        .from('plots')
        .select('*')
        .eq('farmer_id', user.id);

      if (error?.code === '42P01') {
        // Table 'plots' does not exist — try legacy table
        console.warn('[PlotHarvestModal] Table "plots" not found, falling back to "sugarcane_plots"');
        ({ data, error } = await supabase
          .from('sugarcane_plots')
          .select('*')
          .eq('farmer_id', user.id));
      }

      if (error) throw error;
      setPlots(data || []);
      if (data?.length > 0) setSelectedPlot(data[0].id);
    } catch (err) {
      console.error('[PlotHarvestModal] Gagal memuat daftar petak sawah:', err);
      setError('Gagal memuat daftar petak sawah. Periksa koneksi internet Anda.');
    }
  };

  const fetchMills = async () => {
    try {
      const { data, error } = await supabase.from('sugar_mills').select('*');
      if (error) throw error;
      setSugarMills(data || []);
      if (data?.length > 0) setSelectedMill(data[0].id);
    } catch (err) {
      console.error('[PlotHarvestModal] Gagal memuat daftar pabrik gula:', err);
      // Non-fatal — user can still proceed if they previously had mills loaded
    }
  };

  const handleSavePlot = async (e) => {
    e.preventDefault();
    if (!plotName || !area || !plantDate || !estTonnage) {
      setError('Harap lengkapi semua data lahan: Nama Petak, Luas, Tanggal Tanam, dan Estimasi Tonase.');
      return;
    }
    setLoading(true); setError(''); setSuccess('');

    try {
      if (user.isDemo || !isSupabaseConfigured) {
        // ── Demo / offline mode ──────────────────────────────────────────────
        await new Promise(r => setTimeout(r, 600));
        setPlots(prev => [...prev, { id: Date.now(), plot_name: plotName }]);
        setSuccess('Lahan berhasil didaftarkan (Mode Demo).');
      } else {
        // ── Live Supabase mode ───────────────────────────────────────────────
        const plotPayload = {
          farmer_id:  user.id,
          plot_name:  plotName.trim(),
          area_ha:    parseFloat(area),
          variety,
          plant_date: plantDate,
          est_tonnage: parseFloat(estTonnage),
        };

        // Try canonical table 'plots' first
        let insertError;
        const { error: e1 } = await supabase.from('plots').insert([plotPayload]);
        insertError = e1;

        if (e1?.code === '42P01') {
          // Fallback to legacy table name
          console.warn('[PlotHarvestModal] Tabel "plots" tidak ditemukan, menggunakan "sugarcane_plots"');
          const { error: e2 } = await supabase.from('sugarcane_plots').insert([plotPayload]);
          insertError = e2;
        }

        if (insertError) {
          console.error('[PlotHarvestModal] Gagal menyimpan petak sawah:', insertError);
          throw new Error(`Gagal menyimpan data lahan: ${insertError.message}`);
        }

        console.log('[PlotHarvestModal] Petak sawah berhasil disimpan:', plotPayload);
        setSuccess('Lahan berhasil didaftarkan dan disimpan ke database.');
        fetchPlots();
      }

      setPlotName(''); setArea(''); setEstTonnage('');
      setTimeout(() => { setSuccess(''); setActiveTab('harvest'); }, 1500);
    } catch (err) {
      console.error('[PlotHarvestModal] handleSavePlot error:', err);
      setError(err.message || 'Terjadi kesalahan. Coba lagi beberapa saat.');
    } finally {
      setLoading(false);
    }
  };

  const handleTruckCountChange = (delta) => {
    const newCount = Math.min(5, Math.max(1, truckCount + delta));
    setTruckCount(newCount);
    setTrucks(prev => {
      const copy = [...prev];
      if (newCount > copy.length) for (let i = copy.length; i < newCount; i++) copy.push({ plate: '', driver: '' });
      else if (newCount < copy.length) copy.splice(newCount);
      return copy;
    });
  };

  const handleTruckChange = (index, field, value) => {
    const copy = [...trucks];
    copy[index][field] = field === 'plate' ? value.toUpperCase() : value;
    setTrucks(copy);
  };

  const handleSaveHarvest = async (e) => {
    e.preventDefault();
    if (!selectedPlot || !selectedMill || !harvestTime || !totalLoadTonnage) {
      setError('Harap lengkapi data utama: Petak Kebun, Pabrik Gula, Waktu Tebang, dan Total Tonase.'); return;
    }
    const estWeightPerTruck = (Number(totalLoadTonnage) / Number(truckCount)).toFixed(1);

    for (let i = 0; i < trucks.length; i++) {
      if (!trucks[i].plate || !trucks[i].driver) {
        setError(`Data Armada Truk ${i + 1} belum lengkap (Nomor Polisi dan Nama Sopir wajib diisi).`); return;
      }
    }

    setLoading(true); setError('');

    try {
      const mill = sugarMills.find(m => m.id === selectedMill);
      const interval = mill?.slot_interval_minutes || 15;

      // ── 1. Insert into harvest_records ──────────────────────────────────────
      const harvestPayload = {
        farmer_id:      user.id,
        plot_id:        selectedPlot,
        mill_id:        selectedMill,
        harvest_time:   new Date(harvestTime).toISOString(),
        total_tonnage:  parseFloat(totalLoadTonnage),
        truck_count:    truckCount,
        status:         'pending',
      };

      let harvestId = `demo-harvest-${Date.now()}`;

      if (!user.isDemo && isSupabaseConfigured) {
        // Try canonical table 'harvest_records'
        let hrError;
        let hrData;

        const { data: d1, error: e1 } = await supabase
          .from('harvest_records')
          .insert([harvestPayload])
          .select()
          .single();
        hrError = e1; hrData = d1;

        if (e1?.code === '42P01') {
          // Fallback to legacy table
          console.warn('[PlotHarvestModal] Tabel "harvest_records" tidak ditemukan, menggunakan "harvest_batches"');
          const { data: d2, error: e2 } = await supabase
            .from('harvest_batches')
            .insert([harvestPayload])
            .select()
            .single();
          hrError = e2; hrData = d2;
        }

        if (hrError) {
          console.error('[PlotHarvestModal] Gagal menyimpan data panen:', hrError);
          throw new Error(`Gagal menyimpan data panen: ${hrError.message}`);
        }

        harvestId = hrData?.id || harvestId;
        console.log('[PlotHarvestModal] Data panen berhasil disimpan. ID:', harvestId);
      } else {
        await new Promise(r => setTimeout(r, 600)); // Demo delay
      }

      // ── 2. Build SPTA tickets ───────────────────────────────────────────────
      const baseHarvestTimeMs     = new Date(harvestTime).getTime();
      const travelDurationMinutes = 45;

      const ticketRows = trucks.map((t, idx) => {
        const slotMs      = baseHarvestTimeMs + (idx * interval * 60000);
        const departureMs = slotMs - (travelDurationMinutes * 60000);
        const sptaCode    = `TEBUCO-SPTA-${Date.now().toString().slice(-6)}-${t.plate.replace(/\s+/g, '')}`;

        return {
          harvest_id:     harvestId,
          // keep backward compat keys for local state
          batch_id:       harvestId,
          plate_number:   t.plate,
          driver_name:    t.driver,
          tonnage:        parseFloat(estWeightPerTruck),
          status:         'queued',
          harvest_time:   new Date(harvestTime).toISOString(),
          scheduled_slot: new Date(slotMs).toISOString(),
          departure_time: new Date(departureMs).toISOString(),
          brix:           14.2,
          spta_code:      sptaCode,
          // legacy key used by TicketScreen for display
          spta_ticket:    sptaCode,
        };
      });

      // ── 3. Insert into spta_tickets ─────────────────────────────────────────
      if (!user.isDemo && isSupabaseConfigured) {
        // DB columns don't include the local-only alias keys — strip them
        const dbTickets = ticketRows.map(({ batch_id, spta_ticket, ...rest }) => rest);

        let stError;
        const { error: e1 } = await supabase.from('spta_tickets').insert(dbTickets);
        stError = e1;

        if (e1?.code === '42P01') {
          console.warn('[PlotHarvestModal] Tabel "spta_tickets" tidak ditemukan, menggunakan "truck_dispatches"');
          // Fallback: build legacy shape
          const legacyRows = ticketRows.map(({ harvest_id, spta_code, ...rest }) => ({
            ...rest,
            batch_id: harvestId,
          }));
          const { error: e2 } = await supabase.from('truck_dispatches').insert(legacyRows);
          stError = e2;
        }

        if (stError) {
          // Non-fatal: tiket tetap dibuat secara lokal
          console.warn('[PlotHarvestModal] Gagal menyimpan tiket SPTA ke database (lanjut mode lokal):', stError.message);
        } else {
          console.log(`[PlotHarvestModal] ${ticketRows.length} tiket SPTA berhasil disimpan.`);
        }
      }

      // ── 4. Update local app state ───────────────────────────────────────────
      onHarvestLogged({
        ...ticketRows[0],
        plot_id:      selectedPlot,
        batch_trucks: ticketRows,
      });
      onClose();

    } catch (err) {
      console.error('[PlotHarvestModal] handleSaveHarvest error:', err);
      setError(err.message || 'Terjadi kesalahan saat menyimpan data panen. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="hide-scrollbar"
      style={{
        position: 'fixed', inset: 0,
        zIndex: 200,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fadeInOverlay 0.2s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Bottom Sheet Container ── */}
      <div
        style={{
          width: '100%', maxWidth: 480,
          maxHeight: '88dvh',          /* dvh: excludes browser chrome so footer is never clipped */
          background: 'rgba(13,17,18,0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '28px 28px 0 0',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -16px 64px rgba(0,0,0,0.7)',
          animation: 'slideUpSheet 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          /* On desktop: center it like a regular modal */
        }}
      >
        {/* ── Drag Handle ── */}
        <div style={{ padding: '12px 0 4px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 48, height: 5, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 12px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
            Registrasi Petak Lahan & Panen
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)', border: 'none',
              color: 'var(--color-on-surface-variant)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, margin: '0 20px 12px', flexShrink: 0 }}>
          <button onClick={() => setActiveTab('plot')} style={tabStyle(activeTab === 'plot', false)}>
            Daftar Sawah
          </button>
          <button onClick={() => setActiveTab('harvest')} style={tabStyle(activeTab === 'harvest', true)}>
            Input Panen & Armada
          </button>
        </div>

        {/* ── Alerts ── */}
        {(error || success) && (
          <div style={{ padding: '0 20px 8px', flexShrink: 0 }}>
            {error  && <div style={{ background: 'rgba(255,180,171,0.12)', padding: '10px 14px', borderRadius: 10, color: 'var(--color-error)', fontSize: 13, border: '1px solid rgba(255,100,80,0.2)', lineHeight: 1.4 }}>{error}</div>}
            {success && <div style={{ background: 'rgba(166,214,79,0.12)',  padding: '10px 14px', borderRadius: 10, color: 'var(--color-tertiary)', fontSize: 13, border: '1px solid rgba(166,214,79,0.2)' }}>{success}</div>}
          </div>
        )}

        {/* ── Scrollable Form Body ── */}
        <div
          className="hide-scrollbar no-scrollbar touch-scroll"
          style={{
            flex: 1,
            minHeight: 0,            /* CRITICAL: without this, flex children won't shrink and footer hides */
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            padding: '16px',
            display: 'flex', flexDirection: 'column', gap: 16,
            touchAction: 'pan-y',
          }}
        >
          {/* ── Tab A: Plot ── */}
          {activeTab === 'plot' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 8 }}>
              <FieldGroup label="Nama Petak Sawah">
                <InputWithIcon icon={<Map size={16} />}>
                  <input type="text" placeholder="Contoh: Blok Asembagus Selatan" value={plotName} onChange={e => setPlotName(e.target.value)} style={inputStyle} />
                </InputWithIcon>
              </FieldGroup>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FieldGroup label="Luas Lahan (Ha)">
                  <InputWithIcon icon={<Map size={16} />}>
                    <input type="number" inputMode="decimal" step="0.1" placeholder="15.0" value={area} onChange={e => setArea(e.target.value)} style={inputStyle} />
                  </InputWithIcon>
                </FieldGroup>
                <FieldGroup label="Estimasi Tonase (Ton)">
                  <InputWithIcon icon={<Scale size={16} />}>
                    <input type="number" inputMode="decimal" placeholder="120" value={estTonnage} onChange={e => setEstTonnage(e.target.value)} style={inputStyle} />
                  </InputWithIcon>
                </FieldGroup>
              </div>

              <FieldGroup label="Varietas Tebu">
                <select value={variety} onChange={e => setVariety(e.target.value)} style={selectStyle}>
                  <option value="VMC 76-16">VMC 76-16</option>
                  <option value="Bululawang (BL)">Bululawang (BL)</option>
                  <option value="PS 881">PS 881</option>
                  <option value="Cenning">Cenning</option>
                </select>
              </FieldGroup>

              <FieldGroup label="Tanggal Tanam">
                <InputWithIcon icon={<Calendar size={16} />}>
                  <input type="date" value={plantDate} onChange={e => setPlantDate(e.target.value)} style={inputStyle} />
                </InputWithIcon>
              </FieldGroup>
            </div>
          )}

          {/* ── Tab B: Harvest (Multi-Truck Batch) ── */}
          {activeTab === 'harvest' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 8 }}>
              <FieldGroup label="Pilih Petak Kebun">
                <select value={selectedPlot} onChange={e => setSelectedPlot(e.target.value)} style={selectStyle}>
                  <option value="" disabled>-- Pilih Petak Kebun --</option>
                  {plots.map(p => <option key={p.id} value={p.id}>{p.plot_name}</option>)}
                </select>
              </FieldGroup>

              <FieldGroup label="Pabrik Gula Tujuan">
                <div style={{ position: 'relative' }}>
                  <Factory size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-on-surface-variant)', zIndex: 1 }} />
                  <select value={selectedMill} onChange={e => setSelectedMill(e.target.value)} style={{ ...selectStyle, paddingLeft: 38 }}>
                    <option value="" disabled>-- Pilih Pabrik Gula --</option>
                    {sugarMills.map(m => <option key={m.id} value={m.id}>{m.name} (Slot tiap {m.slot_interval_minutes}m)</option>)}
                  </select>
                </div>
              </FieldGroup>

              <FieldGroup label="Waktu Mulai Tebang">
                <InputWithIcon icon={<Calendar size={16} />}>
                  <input type="datetime-local" value={harvestTime} onChange={e => setHarvestTime(e.target.value)} style={inputStyle} />
                </InputWithIcon>
              </FieldGroup>

              <FieldGroup label="Total Estimasi Muatan (Tonase Bruto)">
                <InputWithIcon icon={<Scale size={16} />}>
                  <input type="number" inputMode="decimal" step="0.1" placeholder="Contoh: 50" value={totalLoadTonnage} onChange={e => setTotalLoadTonnage(e.target.value)} style={inputStyle} />
                </InputWithIcon>
              </FieldGroup>

              {/* Truck counter */}
              <FieldGroup label="Jumlah Armada Truk">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.05)', padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', height: 52 }}>
                  <button type="button" onClick={() => handleTruckCountChange(-1)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8 }}>
                    <Minus size={18} />
                  </button>
                  <span style={{ color: '#fff', fontWeight: 800, flex: 1, textAlign: 'center', fontSize: 17, fontFamily: 'var(--font-display)' }}>
                    {truckCount} Armada Truk
                  </span>
                  <button type="button" onClick={() => handleTruckCountChange(1)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8 }}>
                    <Plus size={18} />
                  </button>
                </div>
              </FieldGroup>

              {/* Truck cards */}
              {trucks.map((truck, idx) => (
                <div key={idx} style={{ background: 'rgba(0,0,0,0.35)', padding: 16, borderRadius: 14, border: '1px solid rgba(166,214,79,0.2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Truck size={14} color="var(--color-primary)" />
                    <p style={{ color: 'var(--color-primary)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Armada Truk Ke-{idx + 1}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <FieldGroup label="Nomor Polisi Truk">
                      <input type="text" placeholder="B 1234 UY" value={truck.plate}
                        onChange={e => handleTruckChange(idx, 'plate', e.target.value)}
                        style={{ ...simpleInputStyle, fontFamily: 'var(--font-mono)' }} />
                    </FieldGroup>
                    <FieldGroup label="Nama Sopir">
                      <input type="text" placeholder="Sutrisno P." value={truck.driver}
                        onChange={e => handleTruckChange(idx, 'driver', e.target.value)}
                        style={simpleInputStyle} />
                    </FieldGroup>
                  </div>
                </div>
              ))}

              {plots.length === 0 && (
                <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 12, textAlign: 'center', padding: '4px 0' }}>
                  * Daftarkan petak lahan terlebih dahulu di tab "Daftar Sawah".
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Sticky Footer — CTA Buttons ── */}
        <div style={{
          position: 'sticky', bottom: 0, zIndex: 20, flexShrink: 0,
          padding: '12px 16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(13,17,18,0.95)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', gap: 10,
        }}>
          {/* Cancel */}
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: '0 0 auto', padding: '0 20px', height: 52, borderRadius: 14,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--color-on-surface-variant)', fontFamily: 'var(--font-display)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Batal
          </button>

          {/* Primary CTA */}
          {activeTab === 'plot' ? (
            <button
              type="button"
              onClick={handleSavePlot}
              disabled={loading}
              style={{
                flex: 1, height: 52, borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.2)',
                background: loading ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
                color: '#fff', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
              Simpan Petak Sawah
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveHarvest}
              disabled={loading || plots.length === 0}
              style={{
                flex: 1, height: 52, borderRadius: 14, border: 'none',
                background: (loading || plots.length === 0) ? 'rgba(166,214,79,0.3)' : 'var(--color-tertiary)',
                color: (loading || plots.length === 0) ? 'rgba(35,54,0,0.5)' : 'var(--color-on-tertiary)',
                fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800,
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
                cursor: (loading || plots.length === 0) ? 'default' : 'pointer',
                boxShadow: plots.length > 0 && !loading ? '0 4px 24px rgba(166,214,79,0.35)' : 'none',
                transition: 'box-shadow 0.2s, background 0.2s',
              }}
            >
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <QrCode size={16} />}
              Terbitkan SPTA & Jadwalkan ({truckCount} Truk)
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUpSheet {
          from { transform: translateY(100%); opacity: 0.3; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="datetime-local"]::-webkit-calendar-picker-indicator {
          filter: invert(1); opacity: 0.5;
        }
      `}</style>
    </div>
  );
}

/* ── Small Reusable Components ── */

function FieldGroup({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function InputWithIcon({ icon, children }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span style={{ position: 'absolute', left: 12, color: 'var(--color-on-surface-variant)', zIndex: 1, display: 'flex', alignItems: 'center' }}>{icon}</span>
      {children}
    </div>
  );
}

/* ── Style constants ── */

const tabStyle = (active, isPrimary) => ({
  flex: 1, padding: '10px 6px', borderRadius: 10, border: 'none',
  background: active
    ? (isPrimary ? 'var(--color-tertiary)' : 'rgba(255,255,255,0.1)')
    : 'transparent',
  color: active
    ? (isPrimary ? 'var(--color-on-tertiary)' : '#fff')
    : 'var(--color-on-surface-variant)',
  fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
  cursor: 'pointer', transition: 'background 0.2s', whiteSpace: 'nowrap',
});

const inputStyle = {
  width: '100%', height: 52, padding: '0 12px 0 38px',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, color: '#fff', outline: 'none',
  fontFamily: 'var(--font-body)', fontSize: 14,
  transition: 'border-color 0.2s',
};

const simpleInputStyle = {
  width: '100%', height: 48, padding: '0 12px',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#fff', outline: 'none',
  fontFamily: 'var(--font-body)', fontSize: 13,
  transition: 'border-color 0.2s',
};

const selectStyle = {
  width: '100%', height: 52, padding: '0 12px',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, color: '#fff', outline: 'none',
  fontFamily: 'var(--font-body)', fontSize: 14, appearance: 'none',
};
