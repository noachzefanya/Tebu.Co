-- ==============================================================================
-- SCRIPT PERBAIKAN KONFIGURASI DATABASE (RLS & STRUKTUR TABEL)
-- Jalankan script ini di menu SQL Editor pada Dashboard Supabase kamu
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. MENGAMANKAN DATABASE DENGAN ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
-- Mengaktifkan RLS untuk semua tabel utama agar tidak bisa diakses tanpa login
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvest_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spta_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sugar_mills ENABLE ROW LEVEL SECURITY;

-- Menghapus policy lama (jika ada) agar tidak bentrok saat dijalankan ulang
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.plots;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.harvest_records;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.spta_tickets;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.truck_dispatches;
DROP POLICY IF EXISTS "Allow authenticated read only" ON public.sugar_mills;

-- Membuat policy baru: HANYA USER YANG SUDAH LOGIN (Authenticated) yang bisa akses
-- Untuk profiles, plots, dan harvest_records, idealnya dicek berdasarkan ID (farmer_id = auth.uid())
-- Namun untuk mencegah error logika di aplikasi yang sedang berjalan, kita kunci ke level 'authenticated' dulu.
CREATE POLICY "Allow authenticated full access" ON public.profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access" ON public.plots FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access" ON public.harvest_records FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access" ON public.spta_tickets FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access" ON public.truck_dispatches FOR ALL USING (auth.role() = 'authenticated');

-- Untuk sugar_mills (Pabrik Gula), biasanya hanya perlu bisa dibaca (Select) oleh user
CREATE POLICY "Allow authenticated read only" ON public.sugar_mills FOR SELECT USING (auth.role() = 'authenticated');


-- ------------------------------------------------------------------------------
-- 2. MENAMBAHKAN KOLOM YANG HILANG DI TABEL spta_tickets
-- ------------------------------------------------------------------------------
-- Menambahkan batch_id dan spta_ticket dengan tipe text agar kompatibel dengan UUID 
-- maupun ID lokal sementara seperti 'local-harvest-...'
ALTER TABLE public.spta_tickets 
  ADD COLUMN IF NOT EXISTS batch_id text,
  ADD COLUMN IF NOT EXISTS spta_ticket text;



-- ------------------------------------------------------------------------------
-- 3. MENGHAPUS KOLOM REDUNDAN DI TABEL plots DAN harvest_records
-- ------------------------------------------------------------------------------
-- Menghapus kolom ganda untuk menjaga kebersihan data.
-- Frontend (PlotHarvestModal.jsx) telah diperbarui sehingga tidak lagi mengirim
-- data ke kolom-kolom ini.

ALTER TABLE public.plots 
  DROP COLUMN IF EXISTS plot_code,
  DROP COLUMN IF EXISTS estimated_yield_tons,
  DROP COLUMN IF EXISTS sugar_cane_variety;

ALTER TABLE public.harvest_records
  DROP COLUMN IF EXISTS sugar_mill,
  DROP COLUMN IF EXISTS total_weight_tons,
  DROP COLUMN IF EXISTS total_trucks;
