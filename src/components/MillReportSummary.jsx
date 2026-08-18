import { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { Calendar, Truck, Scale, Activity, Search, RefreshCw, FileText } from 'lucide-react';

export default function MillReportSummary() {
  const [filterPeriod, setFilterPeriod] = useState('Semua'); // 'Hari Ini' | 'Minggu Ini' | 'Bulan Ini' | 'Semua'
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fallback demo data
  const getDemoRecords = () => {
    const now = new Date();
    const todayStr = now.toISOString();
    
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(now); lastWeek.setDate(lastWeek.getDate() - 5);
    const lastMonth = new Date(now); lastMonth.setDate(lastMonth.getDate() - 20);

    return [
      {
        id: '1', spta_code: 'SPTA-8921', truck_number: 'N 1234 AB', driver_name: 'Budi Santoso',
        net_weight_kg: 24500, weighed_at: todayStr, rendemen: 7.8, status: 'weighed',
        harvest_records: { plots: { plot_name: 'Petak A1', profiles: { full_name: 'Pak Ahmad' } } }
      },
      {
        id: '2', spta_code: 'SPTA-8922', truck_number: 'B 9182 KQA', driver_name: 'Sutrisno',
        net_weight_kg: 22100, weighed_at: todayStr, rendemen: 8.1, status: 'completed',
        harvest_records: { plots: { plot_name: 'Kebun Jati', profiles: { full_name: 'Supardi' } } }
      },
      {
        id: '3', spta_code: 'SPTA-8810', truck_number: 'W 8129 PQ', driver_name: 'Bambang U.',
        net_weight_kg: 18500, weighed_at: yesterday.toISOString(), rendemen: 7.4, status: 'completed',
        harvest_records: { plots: { plot_name: 'Blok Barat', profiles: { full_name: 'Pak Ahmad' } } }
      },
      {
        id: '4', spta_code: 'SPTA-8705', truck_number: 'L 9912 ZX', driver_name: 'Sugeng',
        net_weight_kg: 26000, weighed_at: lastWeek.toISOString(), rendemen: 8.5, status: 'completed',
        harvest_records: { plots: { plot_name: 'Petak B2', profiles: { full_name: 'Darman' } } }
      },
      {
        id: '5', spta_code: 'SPTA-8100', truck_number: 'AG 1122 YY', driver_name: 'Yanto',
        net_weight_kg: 21000, weighed_at: lastMonth.toISOString(), rendemen: 6.9, status: 'completed',
        harvest_records: { plots: { plot_name: 'Petak C3', profiles: { full_name: 'Slamet' } } }
      }
    ];
  };

  const fetchRecords = async () => {
    setLoading(true);
    if (!isSupabaseConfigured) {
      setRecords(getDemoRecords());
      setLoading(false);
      return;
    }

    try {
      // Ambil data yang sudah selesai timbang
      const { data, error } = await supabase
        .from('spta_tickets')
        .select(`
          *,
          profiles!driver_id (full_name),
          harvest_records (
            plots (
              plot_name,
              profiles (full_name)
            )
          )
        `)
        .in('status', ['weighed', 'completed'])
        .order('weighed_at', { ascending: false });

      if (error) throw error;
      
      // Mapping structure if needed, but we'll handle it in rendering
      setRecords(data || []);
    } catch (err) {
      console.error('Report fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Filter logic
  const filteredRecords = useMemo(() => {
    if (filterPeriod === 'Semua') return records;
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    return records.filter(r => {
      if (!r.weighed_at && !r.created_at) return false; // Fallback jika belum di-weighed, tapi status completed
      const recordTime = new Date(r.weighed_at || r.created_at).getTime();
      
      if (filterPeriod === 'Hari Ini') {
        return recordTime >= startOfToday;
      } else if (filterPeriod === 'Minggu Ini') {
        const startOfWeek = startOfToday - (6 * 24 * 60 * 60 * 1000); // 7 days ago
        return recordTime >= startOfWeek;
      } else if (filterPeriod === 'Bulan Ini') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        return recordTime >= startOfMonth;
      }
      return true;
    });
  }, [records, filterPeriod]);

  // Aggregate Metrics
  const { totalTrucks, totalTonnage, avgRendemen } = useMemo(() => {
    const trucks = filteredRecords.length;
    let tonnage = 0;
    let sumRendemen = 0;
    let rendemenCount = 0;

    filteredRecords.forEach(r => {
      tonnage += (r.net_weight_kg ? r.net_weight_kg / 1000 : (r.tonnage || 0));
      if (r.rendemen) {
        sumRendemen += parseFloat(r.rendemen);
        rendemenCount++;
      }
    });

    const avgRen = rendemenCount > 0 ? (sumRendemen / rendemenCount).toFixed(2) : '0.00';
    
    return { 
      totalTrucks: trucks, 
      totalTonnage: tonnage.toFixed(1), 
      avgRendemen: avgRen 
    };
  }, [filteredRecords]);

  return (
    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>
      
      {/* Header & Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 className="text-h3 c-white">Rekapitulasi Laporan Setor Tebu</h2>
          <p className="text-body c-on-surface-var" style={{ marginTop: 4 }}>Agregat data timbangan dan kualitas (rendemen)</p>
        </div>

        <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 12 }}>
          {['Hari Ini', 'Minggu Ini', 'Bulan Ini', 'Semua'].map(period => (
            <button
              key={period}
              onClick={() => setFilterPeriod(period)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                background: filterPeriod === period ? 'var(--color-primary)' : 'transparent',
                color: filterPeriod === period ? 'var(--color-on-primary)' : 'var(--color-on-surface-var)',
                transition: 'all 0.2s'
              }}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Truck size={18} color="var(--color-tertiary)" />
            <p className="text-caps c-on-surface-var">TOTAL ARMADA MASUK</p>
          </div>
          <p className="text-display c-white" style={{ fontSize: 32 }}>{totalTrucks} <span className="text-body" style={{ fontSize: 16, color: 'var(--color-on-surface-variant)' }}>Truk</span></p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Scale size={18} color="var(--color-primary)" />
            <p className="text-caps c-on-surface-var">TOTAL TONASE TEBU</p>
          </div>
          <p className="text-display c-white" style={{ fontSize: 32 }}>{totalTonnage} <span className="text-body" style={{ fontSize: 16, color: 'var(--color-on-surface-variant)' }}>Ton</span></p>
        </div>

        <div style={{ background: 'rgba(166,214,79,0.1)', border: '1px solid rgba(166,214,79,0.2)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Activity size={18} color="var(--color-primary)" />
            <p className="text-caps" style={{ color: 'var(--color-primary)' }}>RATA-RATA RENDEMEN</p>
          </div>
          <p className="text-display c-white" style={{ fontSize: 32 }}>{avgRendemen}<span className="text-body" style={{ fontSize: 16, color: 'var(--color-on-surface-variant)' }}>%</span></p>
        </div>
      </div>

      {/* History Table */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 16, padding: 16 }}>
        {loading ? (
          <p className="text-body c-on-surface-var" style={{ textAlign: 'center', padding: 40 }}>Memuat data laporan...</p>
        ) : filteredRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <FileText size={48} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 16px' }} />
            <p className="text-body-lg c-on-surface-var">Belum ada armada yang setor pada periode ini.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th className="text-caps c-on-surface-var" style={{ padding: '12px 8px' }}>Waktu Selesai</th>
                <th className="text-caps c-on-surface-var" style={{ padding: '12px 8px' }}>No. Tiket / Polisi</th>
                <th className="text-caps c-on-surface-var" style={{ padding: '12px 8px' }}>Petani & Kebun</th>
                <th className="text-caps c-on-surface-var" style={{ padding: '12px 8px' }}>Sopir</th>
                <th className="text-caps c-on-surface-var" style={{ padding: '12px 8px', textAlign: 'right' }}>Netto</th>
                <th className="text-caps c-on-surface-var" style={{ padding: '12px 8px', textAlign: 'right' }}>Rendemen</th>
                <th className="text-caps c-on-surface-var" style={{ padding: '12px 8px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(r => {
                const dateObj = new Date(r.weighed_at || r.created_at);
                const farmerName = r.harvest_records?.plots?.profiles?.full_name || 'Tidak Diketahui';
                const plotName = r.harvest_records?.plots?.plot_name || '-';
                const driverName = r.profiles?.full_name || r.driver_name || 'Tidak Diketahui';
                const netto = r.net_weight_kg ? (r.net_weight_kg / 1000).toFixed(1) : (r.tonnage || 0).toFixed(1);
                
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <p className="text-body c-white">{dateObj.toLocaleDateString('id-ID')}</p>
                      <p className="text-caps c-on-surface-var" style={{ fontSize: 10 }}>{dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <p className="text-body c-white" style={{ fontWeight: 600 }}>{r.truck_number || r.plate_number}</p>
                      <p className="text-caps c-on-surface-var" style={{ fontSize: 10 }}>{r.spta_ticket || r.spta_code || '-'}</p>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <p className="text-body c-white">{farmerName}</p>
                      <p className="text-caps c-on-surface-var" style={{ fontSize: 10 }}>{plotName}</p>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <p className="text-body c-white">{driverName}</p>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <p className="text-body-lg c-white" style={{ fontWeight: 600 }}>{netto} T</p>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <p className="text-body-lg c-primary" style={{ fontWeight: 700 }}>{r.rendemen ? `${r.rendemen}%` : '-'}</p>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <span className="chip chip-primary" style={{ fontSize: 10, padding: '4px 8px' }}>SELESAI</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
