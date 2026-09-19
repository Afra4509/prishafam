-- ==============================================================================
-- FARMELLE SMART FARM - SUPABASE DATABASE SCHEMA v2.0
-- File: supabase-schema.sql
-- Description: Run this script directly in your Supabase Project -> SQL Editor.
--              Creates all tables, enables RLS, seeds demo data.
--              NEW in v2.0: 'users' table for RBAC authentication.
-- ==============================================================================

-- 1. DROP EXISTING TABLES (clean slate)
DROP TABLE IF EXISTS monitoring CASCADE;
DROP TABLE IF EXISTS pakan CASCADE;
DROP TABLE IF EXISTS keuangan CASCADE;
DROP TABLE IF EXISTS kandang CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. CREATE TABLE: KANDANG (Coops)
CREATE TABLE kandang (
    id TEXT PRIMARY KEY,
    nama_kandang TEXT NOT NULL,
    jenis_unggas TEXT NOT NULL,
    jumlah_awal INTEGER NOT NULL DEFAULT 0,
    jumlah_mati INTEGER NOT NULL DEFAULT 0,
    jumlah_hidup INTEGER GENERATED ALWAYS AS (GREATEST(0, jumlah_awal - jumlah_mati)) STORED,
    umur_hari INTEGER NOT NULL DEFAULT 1,
    target_panen_hari INTEGER NOT NULL DEFAULT 35,
    fcr NUMERIC(4, 2) NOT NULL DEFAULT 1.50,
    status TEXT NOT NULL DEFAULT 'AMAN', -- AMAN, WASPADA, KRITIS
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE TABLE: KEUANGAN (Financial Transactions)
CREATE TABLE keuangan (
    id TEXT PRIMARY KEY,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    tipe TEXT NOT NULL CHECK (tipe IN ('INCOME', 'EXPENSE')),
    kategori TEXT NOT NULL,
    deskripsi TEXT NOT NULL,
    nominal NUMERIC(15, 2) NOT NULL,
    kandang_id TEXT DEFAULT 'ALL',
    metode_pembayaran TEXT DEFAULT 'Transfer Bank',
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE TABLE: PAKAN (Feed Inventory & Logistics)
CREATE TABLE pakan (
    id TEXT PRIMARY KEY,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jenis_pakan TEXT NOT NULL,
    stok_masuk NUMERIC(10, 2) DEFAULT 0,
    stok_keluar NUMERIC(10, 2) DEFAULT 0,
    konsumsi_harian NUMERIC(10, 2) NOT NULL DEFAULT 100,
    stok_sisa NUMERIC(10, 2) NOT NULL DEFAULT 0,
    harga_per_kg NUMERIC(10, 2) DEFAULT 9000,
    supplier TEXT,
    kandang_id TEXT DEFAULT 'ALL',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CREATE TABLE: MONITORING (Daily Logs)
CREATE TABLE monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    kandang_id TEXT NOT NULL REFERENCES kandang(id) ON DELETE CASCADE,
    jumlah_hidup INTEGER NOT NULL,
    jumlah_mati INTEGER NOT NULL DEFAULT 0,
    mortality_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    feed_consumption NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    temperature NUMERIC(4, 1) DEFAULT 28.5,
    humidity NUMERIC(4, 1) DEFAULT 65.0,
    health_score INTEGER DEFAULT 92,
    status TEXT DEFAULT 'AMAN'
);

-- 6. CREATE TABLE: SETTINGS (Farm Configuration)
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Memberikan akses penuh untuk anon public key agar Web App dapat langsung berfungsi
-- ==============================================================================
ALTER TABLE kandang ENABLE ROW LEVEL SECURITY;
ALTER TABLE keuangan ENABLE ROW LEVEL SECURITY;
ALTER TABLE pakan ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write on kandang" ON kandang FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on keuangan" ON keuangan FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on pakan" ON pakan FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on monitoring" ON monitoring FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on settings" ON settings FOR ALL TO anon USING (true) WITH CHECK (true);

-- ==============================================================================
-- SEED DATA REALISTIS (5 Kandang, Finansial, Pakan, 14 Hari Monitoring, Settings)
-- ==============================================================================

-- Seed Kandang
INSERT INTO kandang (id, nama_kandang, jenis_unggas, jumlah_awal, jumlah_mati, umur_hari, target_panen_hari, fcr, status, catatan)
VALUES
('KND-A01', 'Pavilion Mawar (A01)', 'Ayam Broiler', 2000, 38, 28, 35, 1.48, 'AMAN', 'Pertumbuhan optimal, nafsu makan stabil ♡'),
('KND-A02', 'Pavilion Peony (A02)', 'Ayam Broiler', 2500, 135, 18, 35, 1.62, 'WASPADA', 'Fluktuasi suhu malam hari, mortality sedikit naik'),
('KND-A03', 'Pavilion Camellia (A03)', 'Ayam Petelur', 1500, 14, 120, 540, 1.85, 'AMAN', 'Produksi telur rata-rata 93.4% per hari, kondisi prima'),
('KND-B01', 'Laguna Dahlia (B01)', 'Bebek Pedaging', 1200, 22, 35, 45, 1.72, 'AMAN', 'Bebek hibrida sehat, konversi pakan sangat baik'),
('KND-B02', 'Laguna Iris (B02)', 'Bebek Petelur', 800, 72, 95, 365, 2.10, 'KRITIS', 'Mortality 9.0%, perlu evaluasi kelembaban dan sirkulasi!');

-- Seed Keuangan
INSERT INTO keuangan (id, tanggal, tipe, kategori, deskripsi, nominal, kandang_id, metode_pembayaran, catatan)
VALUES
('TRX-101', CURRENT_DATE - INTERVAL '16 days', 'EXPENSE', 'Pembelian Pakan', 'Konsentrat Broiler Starter 50 sak', 18500000, 'KND-A01', 'Transfer Bank', 'PT Pakan Sejahtera'),
('TRX-102', CURRENT_DATE - INTERVAL '13 days', 'EXPENSE', 'Pembelian Vaksin & Obat', 'Vaksin ND & Gumboro + Vitamin Enro', 2400000, 'KND-A02', 'Transfer Bank', 'Klinik Veteriner Rosa'),
('TRX-103', CURRENT_DATE - INTERVAL '10 days', 'INCOME', 'Penjualan Telur', 'Telur Ayam Omega & Reguler 480 kg', 12960000, 'KND-A03', 'Tunai / Cash', 'Langganan Toko Roti Belle'),
('TRX-104', CURRENT_DATE - INTERVAL '8 days', 'EXPENSE', 'Pembelian Pakan', 'Pakan Bebek Petelur Layer 30 sak', 11200000, 'KND-B02', 'Transfer Bank', 'Supplier Pakan Mulia'),
('TRX-105', CURRENT_DATE - INTERVAL '6 days', 'INCOME', 'Penjualan Bebek', 'Panen Bebek Pedaging Batch 3 - 600 ekor', 22800000, 'KND-B01', 'Transfer Bank', 'Restoran Bebek Panggang Aroma'),
('TRX-106', CURRENT_DATE - INTERVAL '4 days', 'EXPENSE', 'Listrik & Air', 'Tagihan listrik kandang otomatis & blower', 3150000, 'ALL', 'Transfer Bank', 'PLN Pascabayar'),
('TRX-107', CURRENT_DATE - INTERVAL '3 days', 'INCOME', 'Penjualan Ayam', 'Penjualan Afkir & Panen Parsial Broiler', 38700000, 'KND-A01', 'Transfer Bank', 'Mitra RPU'),
('TRX-108', CURRENT_DATE - INTERVAL '2 days', 'EXPENSE', 'Upah Kerja', 'Gaji mingguan 4 tim pemelihara kandang', 4500000, 'ALL', 'Tunai / Cash', 'Operator kandang'),
('TRX-109', CURRENT_DATE - INTERVAL '1 days', 'INCOME', 'Penjualan Telur', 'Telur Bebek Asin & Segar 250 butir', 6250000, 'KND-B02', 'Transfer Bank', 'Pasar Induk'),
('TRX-110', CURRENT_DATE, 'EXPENSE', 'Pemeliharaan Kandang', 'Perbaikan nozzle drinker blower kandang B02', 850000, 'KND-B02', 'Tunai / Cash', 'Teknisi');

-- Seed Pakan
INSERT INTO pakan (id, tanggal, jenis_pakan, stok_masuk, stok_keluar, konsumsi_harian, stok_sisa, harga_per_kg, supplier, kandang_id)
VALUES
('PKN-001', CURRENT_DATE - INTERVAL '8 days', 'Starter Broiler Crumble (BR-1)', 1500, 320, 240, 1180, 9200, 'PT Japfa Comfeed', 'KND-A01'),
('PKN-002', CURRENT_DATE - INTERVAL '6 days', 'Finisher Broiler Pellet (BR-2)', 2000, 410, 310, 1590, 8800, 'PT Japfa Comfeed', 'KND-A02'),
('PKN-003', CURRENT_DATE - INTERVAL '4 days', 'Layer Mash Concentrate (KL-36)', 1000, 180, 165, 820, 9500, 'PT Charoen Pokphand', 'KND-A03'),
('PKN-004', CURRENT_DATE - INTERVAL '3 days', 'Duck Grower Pellet (DK-2)', 800, 220, 190, 580, 8500, 'PT Malindo Feedmill', 'KND-B01'),
('PKN-005', CURRENT_DATE - INTERVAL '2 days', 'Duck Layer High Protein (DL-1)', 500, 410, 115, 90, 9100, 'PT Malindo Feedmill', 'KND-B02');

-- Seed Monitoring 14 Hari
INSERT INTO monitoring (timestamp, kandang_id, jumlah_hidup, jumlah_mati, mortality_rate, feed_consumption, temperature, humidity, health_score, status)
VALUES
(NOW() - INTERVAL '13 days', 'KND-A01', 1994, 2, 0.30, 200.0, 28.5, 65.0, 98, 'AMAN'),
(NOW() - INTERVAL '11 days', 'KND-A01', 1990, 4, 0.50, 207.0, 28.7, 66.0, 97, 'AMAN'),
(NOW() - INTERVAL '9 days', 'KND-A01', 1984, 6, 0.80, 214.0, 29.0, 64.0, 96, 'AMAN'),
(NOW() - INTERVAL '7 days', 'KND-A01', 1978, 6, 1.10, 221.0, 28.4, 67.0, 95, 'AMAN'),
(NOW() - INTERVAL '5 days', 'KND-A01', 1972, 6, 1.40, 228.0, 28.9, 65.0, 95, 'AMAN'),
(NOW() - INTERVAL '3 days', 'KND-A01', 1966, 6, 1.70, 235.0, 29.1, 63.0, 94, 'AMAN'),
(NOW() - INTERVAL '1 days', 'KND-A01', 1962, 4, 1.90, 240.0, 28.6, 65.0, 94, 'AMAN'),

(NOW() - INTERVAL '13 days', 'KND-B02', 788, 3, 1.50, 110.0, 31.0, 75.0, 88, 'AMAN'),
(NOW() - INTERVAL '11 days', 'KND-B02', 778, 10, 2.75, 112.0, 31.5, 78.0, 84, 'AMAN'),
(NOW() - INTERVAL '9 days', 'KND-B02', 764, 14, 4.50, 114.0, 32.0, 80.0, 78, 'WASPADA'),
(NOW() - INTERVAL '7 days', 'KND-B02', 752, 12, 6.00, 113.0, 32.2, 82.0, 72, 'WASPADA'),
(NOW() - INTERVAL '5 days', 'KND-B02', 742, 10, 7.25, 115.0, 32.5, 84.0, 68, 'KRITIS'),
(NOW() - INTERVAL '3 days', 'KND-B02', 734, 8, 8.25, 115.0, 32.8, 85.0, 65, 'KRITIS'),
(NOW() - INTERVAL '1 days', 'KND-B02', 728, 6, 9.00, 115.0, 33.0, 86.0, 62, 'KRITIS');

-- Seed Settings
INSERT INTO settings (key, value, description)
VALUES
('farm_name', 'Farmelle Smart Farm', 'Nama Farm Utama'),
('owner_name', 'Administrator', 'Nama Pemilik / Manajer Farm'),
('mortality_warning_threshold', '3.0', 'Batas persentase mortality waspada (%)'),
('mortality_critical_threshold', '7.0', 'Batas persentase mortality kritis (%)'),
('feed_warning_days', '7', 'Batas hari tersisa pakan waspada'),
('feed_critical_days', '3', 'Batas hari tersisa pakan kritis'),
('fcr_good_threshold', '1.6', 'Batas rasio FCR baik'),
('fcr_monitor_threshold', '1.9', 'Batas rasio FCR waspada'),
('auto_refresh_interval', '30', 'Interval auto refresh data frontend (detik)'),
('currency_symbol', 'Rp', 'Simbol mata uang')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ==============================================================================
-- USERS TABLE (v2.0 — RBAC Authentication)
-- Passwords are stored as SHA-256 hashes (computed by the browser client).
-- Never store plaintext passwords here.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS users (
    user_id       TEXT PRIMARY KEY DEFAULT ('USR-' || upper(substring(gen_random_uuid()::TEXT, 1, 8))),
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER')),
    status        TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    last_login    TIMESTAMPTZ
);

-- Index for fast username lookup
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: allow anon to SELECT for login (needed since frontend is stateless)
-- In production, use Supabase Auth or restrict this further
CREATE POLICY "Allow anon read users for login"
  ON users FOR SELECT
  USING (true);

-- Policy: allow authenticated admin to manage users (frontend enforces role)
CREATE POLICY "Allow all for service role"
  ON users FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- SEED: Default admin and staff users
-- Passwords below are SHA-256 hashes of the demo credentials:
--   admin -> password: Admin123!
--   staff -> password: Staff123!
-- IMPORTANT: Replace these hashes after setting up your real credentials.
-- ==============================================================================

INSERT INTO users (user_id, username, password_hash, name, role, status) VALUES
  ('USR-001', 'admin', '3eb3fe66b31e3b4d10fa70b5cad49c7112294af6ae4e476a1c405155d45aa121', 'Administrator', 'ADMIN', 'ACTIVE'),
  ('USR-002', 'staff', '05dd4a1376a72d9a5e0fad32000f7e61651a5cef5c9c9a0c3816c7443dafbf6f', 'Farm Staff',     'USER',  'ACTIVE')
ON CONFLICT (user_id) DO NOTHING;

-- ==============================================================================
-- DONE! Run this entire script in your Supabase SQL Editor.
-- Then connect via Settings → Supabase Connect in the Farmelle dashboard.
-- ==============================================================================
