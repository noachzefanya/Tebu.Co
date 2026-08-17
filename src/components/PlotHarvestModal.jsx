import { useState, useEffect } from 'react';
import { X, Map, Calendar, Scale, Truck, Loader2, Save, Factory, Minus, Plus, QrCode } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export default function PlotHarvestModal({ isOpen, onClose, user, onHarvestLogged, onPlotCreated }) {
  const [activeTab, setActiveTab] = useState('plot');
  const isDemo = !user?.id || String(user?.id).startsWith('demo-');

  // Helper validasi UUID
  const isValidUUID = (id) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
  };

  const getFarmerName = () => {
    return user?.user_metadata?.full_name || user?.full_name || user?.name || (user?.email ? user.email.split('@')[0] : 'Suyou Mevlana');
  };

  // Tab A: Plot
  const [plotName, setPlotName] = useState('');
  const [area, setArea] = useState('');
  const [variety, setVariety] = useState('Bululawang (BL)');
  const [plantDate, setPlantDate] = useState('');
  const [estTonnage, setEstTonnage] = useState('');

  // Tab B: Harvest
  const [sugarMills, setSugarMills] = useState([]);
  const [selectedMill, setSelectedMill] = useState('');
  const [plots, setPlots] = useState([]);
  const [selectedPlot, setSelectedPlot] = useState('');
  const [harvestTime, setHarvestTime] = useState('');
  const [totalLoadTonnage, setTotalLoadTonnage] = useState('');
  const [truckCount, setTruckCount] = useState(1);
  const [trucks, setTrucks] = useState([{ plate: '', driver: '' }]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccess('');
      fetchMills();
      if (user && isSupabaseConfigured && !isDemo && isValidUUID(user?.id)) {
        fetchPlots();
      } else {
        const mockData = [{ id: 'mock-1', plot_name: 'Blok Asembagus (Mock)', plot_code: 'Blok Asembagus (Mock)' }];
        setPlots(mockData);
        setSelectedPlot('mock-1');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const fetchPlots = async () => {
    try {
      const { data, error: err } = await supabase
        .from('plots')
        .select('*')
        .eq('farmer_id', user.id);

      if (err) throw err;

      if (!data || data.length === 0) {
        const mockData = [{ id: 'mock-1', plot_name: 'Blok Asembagus (Mock)', plot_code: 'Blok Asembagus (Mock)' }];
        setPlots(mockData);
        setSelectedPlot('mock-1');
      } else {
        setPlots(data);
        setSelectedPlot(data[0].id);
      }
    } catch (err) {
      console.warn('[PlotHarvestModal] fetchPlots fallback ke mock:', err);
      const mockData = [{ id: 'mock-1', plot_name: 'Blok Asembagus (Mock)', plot_code: 'Blok Asembagus (Mock)' }];
      setPlots(mockData);
      setSelectedPlot('mock-1');
    }
  };

  const fetchMills = async () => {
    const defaultMills = [
      { id: 'mill-1', name: 'PG Asembagus', slot_interval_minutes: 15 },
      { id: 'mill-2', name: 'PG Prajekan', slot_interval_minutes: 20 },
    ];
    try {
      const { data, error: err } = await supabase.from('sugar_mills').select('*');
      if (err || !data || data.length === 0) {
        setSugarMills(defaultMills);
        setSelectedMill(defaultMills[0].id);
      } else {
        setSugarMills(data);
        setSelectedMill(data[0].id);
      }
    } catch {
      setSugarMills(defaultMills);
      setSelectedMill(defaultMills[0].id);
    }
  };

  const handleSavePlot = async (e) => {
    e.preventDefault();
    if (!plotName || !area || !estTonnage) {
      setError('Harap lengkapi Nama Petak, Luas Lahan, dan Estimasi Tonase.');
      return;
    }
    setLoading(true); setError(''); setSuccess('');

    try {
      const farmerName = getFarmerName();
      const validFarmerId = (user?.id && isValidUUID(user.id)) ? user.id : null;

      if (isDemo || !validFarmerId) {
        await new Promise(r => setTimeout(r, 400));
        const newPlot = {
          id: `mock-plot-${Date.now()}`,
          plot_name: plotName.trim(),
          plot_code: plotName.trim()
        };
        setPlots(prev => [newPlot, ...prev]);
        setSelectedPlot(newPlot.id);
        if (onPlotCreated) onPlotCreated();
        setSuccess('Lahan berhasil didaftarkan (Mode Demo).');
      } else {
        const plotPayload = {
          farmer_id: validFarmerId,
          farmer_name: farmerName,
          plot_code: plotName.trim(),
          plot_name: plotName.trim(),
          area_ha: parseFloat(area) || 0,
          estimated_yield_tons: parseFloat(estTonnage) || 0,
          est_tonnage: parseFloat(estTonnage) || 0,
          sugar_cane_variety: variety || 'Bululawang (BL)',
          variety: variety || 'Bululawang (BL)',
          sugar_mill_target: 'PG Asembagus',
          status: 'AKTIF'
        };

        const { data: insertedPlot, error: insertError } = await supabase
          .from('plots')
          .insert([plotPayload])
          .select()
          .single();

        if (insertError) {
          throw new Error(`Gagal menyimpan data lahan: ${insertError.message}`);
        }

        setSuccess('Lahan berhasil didaftarkan.');
        await fetchPlots();
        if (insertedPlot?.id) setSelectedPlot(insertedPlot.id);
        if (onPlotCreated) onPlotCreated();
      }

      setPlotName(''); setArea(''); setEstTonnage('');
      setTimeout(() => { setSuccess(''); setActiveTab('harvest'); }, 1200);
    } catch (err) {
      console.error('[PlotHarvestModal] handleSavePlot error:', err);
      setError(err.message || 'Terjadi kesalahan saat menyimpan petak lahan.');
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
    if (!totalLoadTonnage) {
      setError('Harap isi Total Estimasi Muatan (Tonase Bruto).'); return;
    }

    for (let i = 0; i < trucks.length; i++) {
      if (!trucks[i].plate || !trucks[i].driver) {
        setError(`Data Armada Truk ${i + 1} belum lengkap (Nomor Polisi & Sopir wajib diisi).`); return;
      }
    }

    setLoading(true); setError('');

    try {
      const farmerName = getFarmerName();
      const validFarmerId = (user?.id && isValidUUID(user.id)) ? user.id : null;
      const validPlotId = isValidUUID(selectedPlot) ? selectedPlot : null;

      const mill = sugarMills.find(m => m.id === selectedMill);
      const millName = mill ? mill.name : 'PG Asembagus';
      const interval = mill?.slot_interval_minutes || 15;
      const estWeightPerTruck = (Number(totalLoadTonnage) / Number(truckCount)).toFixed(1);

      let harvestId = `local-harvest-${Date.now()}`;

      if (!isDemo && validFarmerId) {
        const harvestPayload = {
          farmer_id: validFarmerId,
          farmer_name: farmerName,
          plot_id: validPlotId,
          sugar_mill: millName,
          mill_name: millName,
          total_weight_tons: parseFloat(totalLoadTonnage) || 0,
          total_tonnage: parseFloat(totalLoadTonnage) || 0,
          total_trucks: parseInt(truckCount, 10) || 1,
          truck_count: parseInt(truckCount, 10) || 1,
          status: 'TERJADWAL'
        };

        const { data: hrData, error: hrError } = await supabase
          .from('harvest_records')
          .insert([harvestPayload])
          .select()
          .single();

        if (hrError) throw new Error(`Gagal menyimpan data panen: ${hrError.message}`);
        harvestId = hrData?.id || harvestId;
      }

      const baseTime = harvestTime ? new Date(harvestTime).getTime() : Date.now();
      const ticketRows = trucks.map((t, idx) => {
        const sptaCode = `TEBUCO-${Date.now()}-${idx + 1}`;
        const weightTon = parseFloat(estWeightPerTruck) || 0;
        const slotIso = new Date(baseTime + (idx * interval * 60000)).toISOString();

        return {
          harvest_id: isValidUUID(harvestId) ? harvestId : null,
          ticket_code: sptaCode,
          spta_code: sptaCode,
          truck_number: t.plate.trim() || '-',
          plate_number: t.plate.trim() || '-',
          driver_name: t.driver.trim() || '-',
          net_weight_kg: weightTon * 1000,
          tonnage: weightTon,
          scheduled_slot: slotIso,
          status: 'TERJADWAL',
          batch_id: harvestId,
          spta_ticket: sptaCode,
        };
      });

      if (!isDemo && validFarmerId && isValidUUID(harvestId)) {
        const dbTickets = ticketRows.map(({ harvest_id, ticket_code, spta_code, truck_number, plate_number, driver_name, net_weight_kg, tonnage, scheduled_slot, status }) => ({
          harvest_id, ticket_code, spta_code, truck_number, plate_number, driver_name, net_weight_kg, tonnage, scheduled_slot, status
        }));
        const { error: stError } = await supabase.from('spta_tickets').insert(dbTickets);
        if (stError) console.warn('[PlotHarvestModal] Warning insert spta_tickets:', stError.message);
      }

      onHarvestLogged({
        ...ticketRows[0],
        plot_id: selectedPlot,
        batch_trucks: ticketRows,
      });
      onClose();

    } catch (err) {
      console.error('[PlotHarvestModal] handleSaveHarvest error:', err);
      setError(err.message || 'Terjadi kesalahan saat menerbitkan SPTA.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabSwitch = (tab) => {
    setError(''); setSuccess('');
    setActiveTab(tab);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="relative w-full max-w-sm max-h-[85%] flex flex-col bg-[#141c16] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: '#141c16', zIndex: 1000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Tabs (Fixed) */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: '#141c16', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#ffffff', margin: 0 }}>Registrasi Petak Lahan & Panen</h3>
            <button 
              type="button" 
              onClick={onClose} 
              style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>
          </div>
          
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', borderRadius: 12, padding: 4, gap: 4 }}>
            <button 
              type="button" 
              onClick={() => { setError(''); setSuccess(''); setActiveTab('plot'); }}
              style={{
                flex: 1, padding: '9px 6px', borderRadius: 9, border: 'none',
                background: activeTab === 'plot' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                color: activeTab === 'plot' ? '#ffffff' : '#888888', fontWeight: 700, fontSize: 12, cursor: 'pointer'
              }}
            >
              Daftar Sawah
            </button>
            <button 
              type="button" 
              onClick={() => { setError(''); setSuccess(''); setActiveTab('harvest'); }}
              style={{
                flex: 1, padding: '9px 6px', borderRadius: 9, border: 'none',
                background: activeTab === 'harvest' ? '#a6d64f' : 'transparent',
                color: activeTab === 'harvest' ? '#141c16' : '#888888', fontWeight: 800, fontSize: 12, cursor: 'pointer'
              }}
            >
              Input Panen & Armada
            </button>
          </div>

          {(error || success) && (
            <div style={{ marginTop: 10 }}>
              {error && <div style={{ background: 'rgba(255, 80, 80, 0.15)', border: '1px solid rgba(255, 80, 80, 0.3)', padding: '8px 12px', borderRadius: 8, color: '#ff8a7a', fontSize: 12 }}>{error}</div>}
              {success && <div style={{ background: 'rgba(166, 214, 79, 0.15)', border: '1px solid rgba(166, 214, 79, 0.3)', padding: '8px 12px', borderRadius: 8, color: '#a6d64f', fontSize: 12 }}>{success}</div>}
            </div>
          )}
        </div>

        {/* Scrollable Form Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', backgroundColor: '#141c16', display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                  <option value="Bululawang (BL)">Bululawang (BL)</option>
                  <option value="VMC 76-16">VMC 76-16</option>
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
                  {plots.map(p => <option key={p.id} value={p.id}>{p.plot_name || p.plot_code}</option>)}
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
                    <Truck size={14} color="var(--color-primary, #a6d64f)" />
                    <p style={{ color: 'var(--color-primary, #a6d64f)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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

        {/* Bottom Action Footer (Fixed) */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: '#141c16', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ flex: 1, height: 46, borderRadius: 12, background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ccc', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Batal
          </button>
          <button 
            type="button" 
            onClick={activeTab === 'plot' ? handleSavePlot : handleSaveHarvest}
            disabled={loading}
            style={{
              flex: 2, height: 46, borderRadius: 12, border: 'none',
              background: activeTab === 'plot' ? 'rgba(255, 255, 255, 0.15)' : '#a6d64f',
              color: activeTab === 'plot' ? '#ffffff' : '#141c16',
              fontWeight: 800, fontSize: 13, cursor: loading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : (activeTab === 'plot' ? <Save size={16} /> : <QrCode size={16} />)}
            {loading ? 'Menyimpan...' : (activeTab === 'plot' ? 'Simpan Petak Sawah' : `Terbitkan SPTA (${truckCount} Truk)`)}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="datetime-local"]::-webkit-calendar-picker-indicator {
          filter: invert(1); opacity: 0.5;
        }
      `}</style>
    </div>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-on-surface-variant, #888)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function InputWithIcon({ icon, children }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <span style={{ position: 'absolute', left: 12, color: 'var(--color-on-surface-variant, #888)', zIndex: 1, display: 'flex', alignItems: 'center' }}>{icon}</span>
      {children}
    </div>
  );
}

const tabStyle = (active, isPrimary) => ({
  flex: 1, padding: '10px 6px', borderRadius: 10, border: 'none',
  background: active
    ? (isPrimary ? 'var(--color-tertiary, #a6d64f)' : 'rgba(255,255,255,0.1)')
    : 'transparent',
  color: active
    ? (isPrimary ? 'var(--color-on-tertiary, #1b2f00)' : '#fff')
    : 'var(--color-on-surface-variant, #888)',
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
  background: '#161d18', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, color: '#fff', outline: 'none',
  fontFamily: 'var(--font-body)', fontSize: 14, appearance: 'none',
};