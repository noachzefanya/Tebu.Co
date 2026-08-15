-- ============================================================
-- Tebu.Co — Simulasi Data Awal (Seed Data)
-- Gunakan script ini di Supabase SQL Editor
-- ============================================================

-- 1. (Opsional) Hapus data lama jika ingin mengulang dari awal
-- DELETE FROM truck_dispatches;

-- 2. Masukkan 3 data simulasi armada truk
INSERT INTO truck_dispatches (plate_number, driver_name, tonnage, status, eta, harvest_time)
VALUES 
  (
    'B 9182 KQA', 
    'Sutrisno P.', 
    22.4, 
    'in_transit', 
    '14:30', 
    NOW() - INTERVAL '14 hours 22 minutes'
  ),
  (
    'W 8129 PQ', 
    'Ahmad Dahlan', 
    24.5, 
    'milling', 
    '-', 
    NOW() - INTERVAL '18 hours'
  ),
  (
    'N 4012 AB', 
    'Bambang U.', 
    18.2, 
    'queued', 
    '-', 
    NOW() - INTERVAL '6 hours'
  )
ON CONFLICT DO NOTHING;

-- Catatan:
-- Karena kamu menggunakan id BIGSERIAL, ID akan terisi otomatis.
-- Kolom created_at juga akan otomatis terisi dengan waktu saat ini berkat DEFAULT NOW().
