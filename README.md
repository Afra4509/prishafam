# 🎀 Plumette Smart Farm ♡
> **Cute Coquette Smart Poultry Management Dashboard**  
> *Modern SaaS Farm Architecture with Supabase & Vercel*

---

## 🌸 1. Tentang Aplikasi
**Plumette** adalah dashboard manajemen peternakan unggas (ayam dan bebek) modern berbasis cloud. Didesain dengan estetika **Cute Coquette Modern SaaS** (palet *soft blush pink*, *ivory cream*, *velvet burgundy*, detail pita ribbon, dan sudut membulat elegan) dengan performa tinggi tanpa dependensi berat.

### ✨ Fitur Unggulan
1. **Realtime Smart Poultry Dashboard**: 6 kartu KPI (Total Populasi, Kandang Aktif, Rata-rata Mortalitas, Ketahanan Pakan, Omset, dan Running Profit).
2. **Kandang Monitoring & Panen Predictor**: Live status AMAN, WASPADA, KRITIS, kalkulasi FCR otomatis, dan countdown estimasi tanggal panen.
3. **Pakan & Ketahanan Logistik**: Prediksi hari pakan habis otomatis berdasarkan rata-rata konsumsi harian.
4. **Pencatatan Arus Kas**: Pemasukan panen telur/ayam/bebek dan pengeluaran pakan/operasional.
5. **Farm Health Score (0-100)**: Indeks komposit kesehatan peternakan berbasis 4 parameter terbobot.
6. **Smart Alert Center**: Peringatan stok menipis, lonjakan mortalitas, dan notifikasi panen.
7. **Filter & Live Search**: Pencarian instan nama kandang, ID, dan filter jenis unggas / status.
8. **Dark Mode Coquette Velvet**: Mode malam lembut dengan palet beludru rose yang memanjakan mata.

---

## 📁 2. Struktur File (Vercel-Ready)
Semua file dirancang dengan nama standar industri agar langsung siap dideploy ke **Vercel** maupun dites secara lokal:

```text
/
├── index.html            # File utama halaman web dashboard
├── style.css             # Desain sistem Coquette Modern SaaS & Dark Mode
├── app.js                # State engine, Vanilla Canvas charts, & Supabase client
├── supabase-schema.sql   # Skrip SQL lengkap untuk Supabase SQL Editor
├── vercel.json           # Konfigurasi deployment & security headers Vercel
└── README.md             # Panduan setup dan deployment
```

---

## ⚡ 3. Cara Menjalankan Secara Lokal
Cukup klik ganda file **`index.html`** di komputer Anda, atau buka via browser Chrome/Edge/Firefox.

> **Tips:** Dashboard secara otomatis berjalan dalam **Interactive Live Demo Mode** dengan data 5 kandang, riwayat 14 hari, mutasi keuangan, dan pakan yang dapat Anda uji coba secara langsung (Tambah, Edit, Hapus, Filter, Ubah Mode Gelap)!

---

## 🗄️ 4. Menghubungkan ke Supabase (5 Menit)

### Langkah A: Buat Project & Database di Supabase
1. Buka [https://supabase.com](https://supabase.com) dan buat akun/project baru (gratis).
2. Di dashboard Supabase, klik menu **SQL Editor** di sidebar kiri.
3. Buka file **`supabase-schema.sql`**, salin (*copy*) seluruh isinya, lalu tempel (*paste*) ke SQL Editor Supabase.
4. Klik tombol **Run** (Ctrl + Enter). Seluruh 5 tabel (`kandang`, `keuangan`, `pakan`, `monitoring`, `settings`), hak akses RLS, dan data dummy akan langsung terbuat!

### Langkah B: Sambungkan ke Web App
1. Di dashboard Supabase, buka menu **Project Settings > API**.
2. Salin **Project URL** dan **Project API Key (anon/public)**.
3. Buka dashboard Plumette di browser Anda, klik tombol **"Mode Demo (Klik Connect) ♡"** di pojok kanan atas (atau masuk menu **Pengaturan > Konfigurasi Supabase**).
4. Masukkan URL dan Anon Key tersebut, lalu klik **Simpan & Sambungkan ♡**.
5. Indikator akan berubah menjadi **"● Supabase Connected ♡"** dan data tersinkronisasi secara langsung ke cloud PostgreSQL!

---

## 🚀 5. Cara Deploy ke Vercel

### Opsi 1: Via GitHub (Paling Mudah)
1. Push folder proyek ini ke repository GitHub Anda.
2. Buka [https://vercel.com](https://vercel.com) dan login.
3. Klik **Add New > Project**, lalu pilih repository GitHub Anda.
4. Vercel akan otomatis mengenali proyek sebagai *Static Site* dengan file `index.html`.
5. Klik **Deploy**. Dalam waktu 10-20 detik, website Anda sudah live dengan URL publik (contoh: `https://plumette-farm.vercel.app`)!

### Opsi 2: Via Vercel CLI
```bash
npm i -g vercel
vercel --prod
```

---

## 🌸 6. Identitas Visual & Branding
* **Brand Name**: Plumette Smart Farm
* **Tagline**: *Smart Poultry Care with a Touch of Grace ♡*
* **Owner**: Admawati
* **Aesthetic**: Coquette Minimalist × Modern SaaS × Feminine Farm Tech
