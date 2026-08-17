# 🌾 Tebu.Co
> **Solusi Digital Terintegrasi Rantai Pasok Tebang-Angkut & Mitigasi Tunda Giling Tebu**  
> *(Smart Sugarcane Harvest & Mill Delivery System)*

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E)
![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**Tebu.Co** adalah platform *Smart Agriculture* yang menjembatani komunikasi data waktu-nyata (*real-time*) antara petani tebu mandiri dan Pabrik Gula (PG) guna mencegah kerugian akibat *cut-to-crush delay*.

---

## 📖 Latar Belakang & Pernyataan Masalah (*Problem Statement*)

Dalam industri pergulaan, durasi antara penebangan tebu hingga proses penggilingan (*cut-to-crush delay* atau **tunda giling**) adalah variabel yang sangat krusial. Tebu yang terlalu lama mengantre di emplasemen pabrik akibat *bottleneck* logistik akan mengalami inversi sukrosa. Hal ini menyebabkan penurunan nilai rendemen (Brix), yang berujung pada kerugian finansial berlapis, baik bagi petani maupun pihak Pabrik Gula.

**Tebu.Co hadir untuk:**
1. **Memitigasi Tunda Giling:** Menyinkronkan jadwal tebang dengan kapasitas harian giling (kapasitas terpasang) pabrik.
2. **Mempertahankan Kualitas Rendemen:** Memastikan tebu digiling dalam *golden time* (< 24 jam setelah ditebang).
3. **Mengurai Antrean Armada:** Mengelola jadwal ketibaan truk (*batch dispatching*) secara digital.

---

## ✨ Fitur Utama & Modul (*Key Features*)

Sistem dibagi menjadi dua *interface* utama untuk memenuhi kebutuhan masing-masing aktor:

### 🧑‍🌾 Tampilan Petani (*Farmer View*)
* **Smart Plot & Crop Registration:** Registrasi digital untuk petak kebun, luas lahan, titik koordinat, dan profil varietas tebu (masak awal/tengah/lambat).
* **Harvest Scheduling:** Modul penjadwalan masa tebang yang terintegrasi langsung dengan slot kuota kapasitas Pabrik Gula.
* **Offline-First Support:** Toleransi konektivitas rendah (*Low-Connectivity Tolerance*) menggunakan kapabilitas PWA, memungkinkan petani beroperasi di area *blank spot* perkebunan.

### 🏭 Tampilan Admin Pabrik Gula (*Mill Admin View*)
* **Multi-Truck SPTA Digital Generation:** Penerbitan Surat Perintah Tebang Angkut (SPTA) secara digital dan massal. Dilengkapi dengan **Dynamic QR Code** per armada untuk validasi instan di pos timbang.
* **Batch Dispatching & Queue Control:** Sistem pengalokasian armada secara *batch* untuk menghindari penumpukan truk di gerbang pabrik.
* **Live Mill Queue & Tonnage Tracking:** Dasbor pemantauan *real-time* yang menampilkan metrik antrean truk, kalkulasi muatan Bruto/Tara/Netto, serta estimasi nilai rendemen.

---

## 🛠 Arsitektur Sistem & *Tech Stack*

Proyek ini dibangun menggunakan arsitektur *modern web* untuk menjamin performa responsif, skalabilitas tinggi, dan kapabilitas *real-time*:

* **Frontend:** 
  * [React.js](https://reactjs.org/) melalui [Vite](https://vitejs.dev/) (Performa *bundling* super cepat).
  * [Tailwind CSS](https://tailwindcss.com/) untuk *utility-first styling* yang responsif.
  * [Lucide React](https://lucide.dev/) untuk kebutuhan ikonografi yang konsisten.
  * Dukungan arsitektur **Progressive Web App (PWA)** untuk akses mode lapangan (offline/cache).
* **Backend & Database:** 
  * [Supabase](https://supabase.com/) (*Open-source Firebase alternative*).
  * **PostgreSQL:** Sistem basis data relasional.
  * **Supabase Realtime:** Mendukung pembaruan *live dashboard* antrean pabrik via WebSockets.
  * **Supabase Auth:** Autentikasi aman terintegrasi.

---

## 🚀 Panduan Instalasi (*Quick Start*)

Ikuti langkah-langkah di bawah ini untuk menjalankan **Tebu.Co** di lingkungan lokal (*local development*):

### Prasyarat
- [Node.js](https://nodejs.org/en/) (Versi 18 LTS atau lebih baru disarankan)
- Akun / Proyek [Supabase](https://supabase.com) yang sudah aktif.

### Langkah-langkah
1. **Clone repositori ini:**
   ```bash
   git clone https://github.com/username/tebu-co.git
   cd tebu-co
   ```

2. **Instalasi dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Variabel Lingkungan (Environment Variables):**
   Ganti nama `.env.example` menjadi `.env` (atau buat file baru `.env`) dan tambahkan kredensial Supabase Anda:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Jalankan *Development Server*:**
   ```bash
   npm run dev
   ```
   > **Note:** Aplikasi akan dapat diakses secara lokal melalui URL yang tertera pada terminal Anda (umumnya `http://localhost:5173`).

---

## 🗄 Ikhtisar Skema Database (*Database Schema Overview*)

Struktur utama basis data **Tebu.Co** di PostgreSQL:

### `plots` (Data Kebun Petani)
| Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key |
| `farmer_id` | `uuid` | Relasi ke tabel `users` (Petani) |
| `location_name` | `text` | Nama daerah/blok kebun |
| `area_hectares` | `numeric` | Luas lahan (dalam hektar) |
| `variety` | `text` | Varietas Tebu (ex: BL, PS 862) |

### `harvest_records` (Catatan Jadwal Tebang)
| Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key |
| `plot_id` | `uuid` | Relasi ke tabel `plots` |
| `scheduled_date`| `date` | Tanggal tebang yang dijadwalkan |
| `status` | `enum` | `pending`, `approved`, `harvesting`, `completed` |
| `est_tonnage` | `numeric` | Estimasi berat tebu (Ton) |

### `spta_tickets` (Surat Perintah Tebang Angkut)
| Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key |
| `harvest_id` | `uuid` | Relasi ke tabel `harvest_records` |
| `truck_plate` | `varchar` | Nomor polisi armada truk |
| `qr_code_hash` | `text` | Hash unik untuk *Dynamic QR Code* armada |
| `status` | `enum` | `issued`, `in_transit`, `weighing`, `crushed` |
| `gross_weight` | `numeric` | Berat Kotor (Bruto) dari jembatan timbang |

---

## 🗺 Peta Jalan & Pengembangan Masa Depan (*Roadmap & Future Scope*)

Untuk pengembangan jangka panjang menuju skala *Enterprise*, fitur-fitur berikut direncanakan dalam fase lanjutan:

- [ ] **Automated Weighbridge IoT Integration:** Integrasi sensor IoT dari Jembatan Timbang pabrik langsung ke dalam basis data Supabase untuk meminimalkan *human-error*.
- [ ] **AI Predictive Brix Scoring:** Analitik prediktif berbasis *Machine Learning* untuk memprediksi tingkat kemasakan dan nilai rendemen puncak berdasarkan data cuaca dan umur tanaman.
- [ ] **Logistics Routing & Geofencing:** Optimasi rute armada menggunakan GPS untuk memperkirakan Waktu Ketibaan (ETA) secara presisi ke gerbang emplasemen Pabrik Gula.

---

## 🤝 Kontribusi (*Contributing*)
Kami menyambut baik berbagai kontribusi dari *developers* maupun ahli agronomi. Jika Anda menemukan *bug*, memiliki saran fitur, atau ingin berkontribusi pada penulisan kode, silakan merujuk pada `CONTRIBUTING.md` atau langsung buat *Pull Request*.

## 📄 Lisensi (*License*)
Didistribusikan di bawah Lisensi MIT. Lihat file `LICENSE` untuk informasi lebih lanjut.

---
<div align="center">
  <b>Tebu.Co</b> &copy; 2026<br>
  <i>Inovasi Digital Rantai Pasok Gula Nasional</i>
</div>
