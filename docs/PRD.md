# YomouNovel - 読もう (Indonesian Light Novel Reader)
## Product Requirements Document (PRD) & Mission Breakdown (MVP Edition)

---

## 1. Overview & Problem Statement

### 1.1 Problem Statement
Situs agregator dan pembaca Light Novel (LN) berbahasa Indonesia seperti Meionovels umumnya dipenuhi iklan *pop-up* agresif, pengalihan (*redirects*) yang mengganggu, tata letak yang tidak teroptimasi untuk ponsel, serta tidak adanya kemampuan membaca *offline* saat pengguna berada di area bersinyal lemah atau sedang bepergian.

### 1.2 Core Value Proposition
**YomouNovel** adalah aplikasi pembaca Light Novel khusus Bahasa Indonesia yang bersih (*ad-free*), cepat, berfokus pada tipografi yang nyaman, dan memiliki kapabilitas *offline* yang tangguh. Aplikasi ini memungut (*scrape*) konten dari sumber publik melalui proxy backend dan menyajikannya secara terstruktur dan elegan di perangkat pengguna.

### 1.3 Target Platform & Release Boundary
* **Target Rilis MVP**: **Android Saja (Android 8.0+ / API Level 26+)**.
* **Distribusi**: Paket Android APK (berbasis Expo / React Native Managed Workflow).
* Platform iOS dan Web Reader dideferensikan ke rilis pasca-MVP.

---

## 2. Target User & Persona

* **Nama Persona**: Rian ("Otaku / Reader Komuter")
* **Karakteristik**:
  * Usia 15–30 tahun, pengguna smartphone Android.
  * Membaca light novel saat berada di transportasi umum (KRL, bus, angkot) atau waktu luang.
  * Memiliki kuota internet terbatas dan sering melewati rute dengan jaringan seluler lemah atau terputus (*blank spot*).
  * Menuntut aplikasi yang dapat langsung dibuka dari kondisi tertutup tanpa koneksi internet (*cold start offline*) untuk melanjutkan bab yang sudah disimpan.

---

## 3. Core Features (Scope for MVP)

### 3.1 Source Provider & Scraping Engine (Backend Proxy)
* **Deskripsi**: Layanan backend internal terpusat untuk mencari, mem-parsing HTML sumber, mengekstrak teks cerita ke dalam blok terstruktur, dan menyajikan data JSON yang bersih ke aplikasi client.
* **Provider MVP**: Mendukung 1 sumber utama yang terverifikasi: **Meionovels (`meionovels.com`)** via arsitektur modular `INovelProvider`.
* **Acceptance Criteria**:
  * Mampu mengekstrak feed *Pembaruan Terbaru* dan *Novel Populer* langsung dari sumber.
  * Mampu melakukan pencarian novel berdasarkan kata kunci judul/penulis.
  * Mampu mengekstrak metadata novel (judul, cover, sinopsis, genre, status) dan daftar bab lengkap.
  * Mengonversi konten HTML bab mentah menjadi format **Array Blok Terstruktur (`ContentBlock[]`)**, mencakup:
    * Paragraf teks dengan pemformatan inline (tebal, miring, garis bawah, coret).
    * Heading cerita dengan level 1 sampai 6 (`<h1>` hingga `<h6>` dipetakan ke level integer 1–6).
    * Gambar ilustrasi cerita (mendukung banyak gambar per bab yang dipetakan ke daftar gambar).
    * Pemisah adegan cerita (`<hr>` / separator).
  * Membersihkan seluruh skrip, iframe iklan, tautan donasi/iklan, elemen pelacak, dan komentar eksternal.
  * Menangani bab kosong: jika bab tidak mengandung teks/blok cerita (`total_blocks == 0`), backend mengembalikan kode error `CHAPTER_EMPTY_CONTENT` (HTTP 422), bukan menganggapnya berhasil.

### 3.2 Structured Content & Modern Reader Engine (Client UI)
* **Deskripsi**: Antarmuka pembaca teks yang bebas distraksi, fleksibel, dan memiliki performa rendering tinggi.
* **Mode Tampilan**:
  * Tema: **Light Mode**, **Dark Mode**, dan **Sepia Mode**.
  * Tipografi: Kustomisasi ukuran font (12px – 28px), tinggi baris (*line height* 1.4 – 2.2), dan pilihan font lokal ter-bundle: *Inter* (Sans-serif), *Merriweather* (Serif), dan *OpenDyslexic*.
  * Heading: Merender heading cerita level 1–6 dengan skala ukuran tipografi dan margin visual yang proporsional terhadap ukuran font dasar.
* **Mode Pembaca**: **Continuous Vertical Scroll** (hanya mode gulir vertikal untuk MVP; mode paged horizontal dialihkan ke pasca-MVP).
* **Hardware & Gestures**:
  * **Screen Keep-Awake**: Layar tetap menyala aktif selama pembaca berada di antarmuka pembaca bab (`expo-keep-awake`).
  * **Gestur Dasar**: Tap sisi kiri/kanan atau tombol navigasi untuk berpindah bab; tap area tengah (30% layar tengah) untuk memunculkan/menyembunyikan overlay menu navigasi dan progress reader.
  * **Kecerahan Layar**: Mengikuti preferensi kecerahan sistem Android perangkat (tidak ada slider kecerahan khusus di reader MVP).
* **Navigasi & Lompat Bab**:
  * Tombol "Bab Sebelumnya" dan "Bab Selanjutnya" di bagian akhir bab.
  * Modal drawer daftar bab untuk melompat langsung ke bab mana pun dalam novel.
* **Restorasi Posisi Baca Berbasis Indeks Blok (*Block-Index Anchoring*)**:
  * Reader melacak indeks blok teratas yang sedang terlihat di viewport (`anchor_block_index`).
  * Saat pengguna mengubah ukuran font, jenis font, tinggi baris, atau memutar orientasi layar, viewport secara presisi melakukan auto-scroll kembali ke `anchor_block_index` tersebut, sehingga posisi pandang pembaca tidak tergeser.

### 3.3 Offline Download Manager
* **Deskripsi**: Manajer pengunduhan bab novel ke SQLite dan filesystem lokal untuk akses membaca tanpa sambungan internet.
* **Format Penyimpanan**:
  * Metadata bab dan array blok teks disimpan di tabel SQLite lokal (`chapters`).
  * File gambar ilustrasi bab dan cover novel diunduh dan disimpan ke filesystem lokal (`expo-file-system`), dengan relasi data tersimpan di tabel `chapter_images`.
* **Dukungan Multi-Gambar per Bab**:
  * Satu bab dapat memiliki $0$, $1$, atau banyak ($N$) gambar ilustrasi (relasi 1:N).
  * Setiap gambar diidentifikasi secara unik per bab melalui komposit `(novel_id, chapter_id, image_id)`.
* **Siklus Status Antrean vs Status Ketersediaan Bab**:
  * **Status Antrean Pekerjaan (`download_queue.status`)**: `QUEUED`, `DOWNLOADING`, `PAUSED`, `COMPLETED`, `FAILED`, `CANCELLED`.
  * **Status Ketersediaan Bab (`chapters.download_status`)**: `NOT_DOWNLOADED` atau `DOWNLOADED`.
* **Aturan Persistensi & Lifecycle**:
  * Antrean disimpan ke SQLite saat pertama kali dimasukkan (*enqueue*) dan pada **setiap kali terjadi perubahan status**.
  * **Pemulihan Cold Start**: Jika aplikasi ditutup atau dimatikan OS saat proses unduhan berlangsung, pekerjaan yang tertinggal dalam status `DOWNLOADING` otomatis dipulihkan menjadi `PAUSED` saat aplikasi dibuka kembali.
  * **Aksi Antrean**:
    * *Pause*: Menjeda proses pekerja; progres berkas parsial yang sudah tersimpan dipertahankan.
    * *Resume*: Melanjutkan antrean dari item yang tertunda/gagal tanpa mengunduh ulang aset gambar yang sudah berstatus `DOWNLOADED`.
    * *Cancel*: Menghentikan proses unduhan aktif, menghapus pekerjaan dari antrean, dan membersihkan berkas gambar/blok sementara yang belum tuntas.
* **Aturan Kelengkapan Unduhan (*Integrity Rule*)**:
  * Status `chapters.download_status` HANYA diubah menjadi `DOWNLOADED` setelah **seluruh teks/blok DAN seluruh file gambar ilustrasi bab** pada `chapter_images` berhasil diunduh dan diverifikasi tersimpan di penyimpanan lokal.
  * Jika salah satu gambar ilustrasi gagal diunduh setelah jadwal retry selesai, pekerjaan antrean ditandai `FAILED` dan status bab tetap `NOT_DOWNLOADED`.
* **Jadwal Retry Unduhan (*Retry Schedule*)**:
  * Ditetapkan secara eksplisit: **1 kali percobaan awal + 3 kali retry** dengan jadwal jeda terukur: **2 detik, 5 detik, dan 10 detik**.
  * Kegagalan pada satu bab tidak membatalkan bab lain dalam antrean batch (*isolated failure*).
* **Batch Download**:
  * Pilihan "Unduh 10 Bab Berikutnya" dihitung mulai dari `bab_aktif + 1` hingga `bab_aktif + 10` dari daftar bab yang belum terunduh.
  * Mendukung multi-select checkbox manual dari daftar bab.
* **Penanganan Memori Penuh & Penghapusan**:
  * Menangkap error kuota penyimpanan perangkat: antrean otomatis di-pause dan menampilkan notifikasi pop-up kepada pengguna.
  * Aksi *"Hapus Unduhan Bab"* atau *"Hapus Semua Unduhan Novel Ini"* menghapus file gambar lokal dan konten blok dari SQLite, namun **tetap mempertahankan bookmark novel dan riwayat bacaan**.

### 3.4 Personal Library & Granular Reading Progress
* **Deskripsi**: Pusat pengelolaan koleksi novel, riwayat baca, dan progres granular per bab.
* **Bookmark**: Menyimpan novel favorit ke SQLite lokal (tersedia dan dapat dibuka penuh saat offline).
* **Definisi & Rumus Progres Membaca**:
  * **Posisi Baca Saat Ini (*Real-time Viewport Progress*)**:
    * Menggambarkan posisi gulir pembaca saat ini di dalam bab secara dinamis (0% – 100%).
    * **Ketika sentinel akhir konten terlihat di viewport**: Posisi baca bab langsung diselaraskan menjadi **100%**.
    * **Ketika sentinel akhir belum terlihat**: Posisi baca dihitung proporsional berdasarkan blok teratas:
      $$\text{Posisi Baca (\%)} = \min\left(99, \max\left(0, \operatorname{round}\left(\frac{\text{current\_block\_index} + 1}{\text{total\_blocks}} \times 100\right)\right)\right)\%$$
      *(Batas atas 99% diterapkan agar indikator tidak secara prematur menampilkan 100% sebelum pembaca benar-benar mencapai akhir bab)*.
    * Nilai `current_block_index` disimpan ke kolom `anchor_block_index` untuk kebutuhan pemulihan posisi scroll saat bab dibuka kembali atau saat ukuran font berubah.
  * **Status Historis Penyelesaian Bab (`is_completed`)**:
    * Nilai biner (`0` atau `1`) pada tabel `chapter_reading_progress`.
    * Ditandai menjadi `1` pertama kali saat footer/sentinel akhir bab terlihat di viewport.
    * **Sifat Idempoten / Monotonik Naik (Permanen)**: Jika pengguna membuka kembali bab yang sudah berstatus `is_completed = 1` lalu menggulir ke atas (misal membaca ulang dari awal), `anchor_block_index` akan diperbarui ke posisi baru, namun kolom `is_completed` **tetap bernilai 1** (tidak di-reset menjadi 0).
  * **Bab Terakhir Dibaca**: Ditentukan dari record pada tabel `chapter_reading_progress` yang memiliki `updated_at` paling baru untuk novel tersebut.
  * **Progres Novel**: Dinyatakan secara terukur sebagai:
    $$\text{Novel Progress} = \text{“X dari Y bab selesai (Z\%)”}$$
    di mana $X$ adalah jumlah bab unik yang memiliki `is_completed = 1` untuk novel tersebut.
* **Persistensi Pengaturan Pembaca**: Seluruh pengaturan (ukuran font, tema, tinggi baris, dsb.) disimpan ke tabel `reader_settings` di SQLite lokal (tanpa menggunakan AsyncStorage).

### 3.5 Novel Discovery & Feed (Home Screen)
* **Deskripsi**: Halaman beranda untuk menemukan novel baru berdasarkan feed riil Meionovels:
  * **Pembaruan Terbaru (*Latest Updates*)**: Feed kronologis bab novel yang baru saja diperbarui oleh penerjemah, lengkap dengan nomor bab terbaru dan dukungan paginasi.
  * **Novel Populer (*Popular Novels*)**: Daftar novel terpopuler berdasarkan jumlah pembaca/views dari sumber (`?m_orderby=views`).
* **Offline Fallback**: Jika aplikasi dibuka tanpa internet, halaman Home menampilkan spanduk *"Mode Offline"* dengan akses cepat ke Pustaka Saya, atau menampilkan data cache terakhir yang tersimpan di SQLite jika pernah dibuka.

---

## 4. Non-Goals & Out of Scope (MVP Boundaries)

1. **Target Rilis iOS / Web**: MVP dikhususkan untuk Android. Tidak ada pengujian dan build iOS/Web di fase ini.
2. **In-App Slider Kecerahan**: Kecerahan reader diserahkan ke pengaturan kecerahan sistem Android.
3. **Mode Pembaca Horizontal / Paged E-book**: Hanya *continuous vertical scroll* yang diimplementasikan pada MVP.
4. **Multi-Source Provider Aggregation**: Hanya 1 sumber (`meionovels.com`) untuk MVP. Provider lain akan ditambahkan pasca-MVP.
5. **Background Download Service saat App Mati**: Pengunduhan hanya berjalan saat aplikasi berada di latar depan (*foreground*). Jika aplikasi ditutup, antrean tersimpan dan dapat dilanjutkan saat dibuka kembali.
6. **In-App Monetization**: Tidak ada iklan in-app, paywall, koin, atau langganan berbayar.
7. **User Publishing**: Pengguna tidak dapat mengunggah atau menulis novel sendiri.
8. **Sistem Akun & Cloud Sync**: Tidak ada registrasi/login; semua riwayat dan unduhan murni tersimpan di perangkat lokal.
9. **Fitur Komunitas & Komentar**: Tidak ada kolom komentar atau forum diskusi.

---

## 5. Architecture & Tech Stack Decisions

### 5.1 Justifikasi Teknis Arsitektur Monorepo
Repositori diatur sebagai monorepo dengan dua komponen utama: `server/` dan `client/`.

* **Mengapa Backend Scraper Proxy Diperlukan?**
  1. **Sentralisasi Parsing & Sanitasi**: Menghilangkan beban komputasi pembersihan HTML yang berat dari CPU ponsel pengguna.
  2. **Pembaruan Parser Instan (*Hot-fixable*)**: Jika situs target memperbarui markup HTML atau CSS-nya, tim pengembang dapat langsung memperbarui file provider di backend tanpa harus merilis pembaruan biner aplikasi (*APK release*) ke pengguna.
  3. **Manajemen Caching Terpusat**: Backend menyimpan cache in-memory untuk meminimalkan beban request berulang ke situs sumber.
* **Mengapa React Native (Expo) untuk Client Android?**
  1. **Akses Native SQLite & Filesystem**: `expo-sqlite` menyediakan database relasional ACID berperforma tinggi tanpa batas kuota browser; `expo-file-system` menangani penyimpanan gambar offline secara persisten.
  2. **Integrasi Hardware Native**: Pengendalian *screen keep-awake*, gestur sentuh responsif, dan distribusi berkas APK Android.

### 5.2 Rincian Tech Stack
* **Client (Android Mobile)**:
  * **Framework**: React Native (Expo Managed Workflow) dengan TypeScript
  * **Styling**: NativeWind (Tailwind CSS untuk React Native)
  * **State & Data Fetching**: TanStack Query (React Query) v5 (manajer server state) + Zustand (manajer state memori ephemeral)
  * **Database & Persistence**: `expo-sqlite` (seluruh data tabular, relasional, riwayat, antrean, dan preferensi)
  * **File Storage**: `expo-file-system` (gambar cover dan ilustrasi bab)
  * **Hardware Integration**: `expo-keep-awake`
* **Server (Scraper Proxy Microservice)**:
  * **Runtime & Framework**: Node.js dengan Hono.js
  * **HTML Parser**: `cheerio`
  * **HTTP Client**: `axios` dengan custom user-agent dan timeout
  * **Cache Engine**: In-Memory LRU Cache (`lru-cache`) dengan batas elemen dan memori

### 5.3 Diagram Arsitektur
```text
┌────────────────────────────────────────────────────────┐
│                   Target Sumber Publik                 │
│                     (meionovels.com)                   │
└───────────────────────────┬────────────────────────────┘
                            │ HTML Mentah
                            ▼
┌────────────────────────────────────────────────────────┐
│         Backend Proxy & Sanitizer (Node.js/Hono)       │
│  ├── In-Memory LRU Cache (Maks 500 item / 100 MB)      │
│  ├── HTML Cleaner & ContentBlock Structured Parser     │
│  └── REST API Server                                   │
└───────────────────────────┬────────────────────────────┘
                            │ Clean JSON (ContentBlock[])
                            ▼
┌────────────────────────────────────────────────────────┐
│          Client App (Expo React Native Android)        │
│  ├── Online Mode  ──> TanStack Query + Zustand         │
│  ├── Reader Engine ──> Block-Index Anchor Scroll       │
│  ├── Storage ───────> SQLite (Semua data & pengaturan) │
│  └── Filesystem ────> Offline Images (Cover & Ilustrasi│
└────────────────────────────────────────────────────────┘
```

---

## 6. Data Models & Local SQLite Schema

Setiap referensi data bab pada tabel lokal menggunakan *Composite Key* `(novel_id, chapter_id)` untuk mencegah tabrakan identitas antar novel yang memiliki penamaan slug serupa (misal: `chapter-1`). Tabel `chapter_images` mendukung banyak gambar per bab dengan komposit key `(novel_id, chapter_id, image_id)`.

```sql
-- 1. Tabel Novel
CREATE TABLE IF NOT EXISTS novels (
  id TEXT PRIMARY KEY,                       -- Slug URL sumber, e.g. 'kimi-wa-boku-no-koukai-ln'
  title TEXT NOT NULL,
  author TEXT,
  cover_url TEXT NOT NULL,
  local_cover_path TEXT,                     -- Path berkas lokal jika di-cache
  synopsis TEXT,
  genres TEXT,                               -- JSON string array, e.g. '["Action","Romance"]'
  status TEXT,                               -- 'Ongoing' atau 'Completed'
  total_chapters INTEGER DEFAULT 0,
  is_bookmarked INTEGER DEFAULT 0,          -- 0: False, 1: True
  created_at INTEGER NOT NULL,               -- Unix epoch ms
  updated_at INTEGER NOT NULL
);

-- 2. Tabel Bab Novel (Composite PK)
CREATE TABLE IF NOT EXISTS chapters (
  novel_id TEXT NOT NULL,                    -- Foreign key merujuk ke novels.id
  id TEXT NOT NULL,                          -- Slug URL bab unik per novel, e.g. 'volume-4-chapter-14'
  title TEXT NOT NULL,
  chapter_number REAL,                       -- Nomor urut bab numerik untuk sorting
  release_date TEXT,
  content_blocks TEXT,                       -- JSON serialized ContentBlock[] (hanya terisi jika didownload)
  download_status TEXT DEFAULT 'NOT_DOWNLOADED', -- 'NOT_DOWNLOADED' atau 'DOWNLOADED'
  downloaded_at INTEGER,                     -- Unix epoch ms
  PRIMARY KEY (novel_id, id),
  FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
);

-- 3. Tabel Gambar Ilustrasi Bab (Mendukung Banyak Gambar per Bab via Composite PK)
CREATE TABLE IF NOT EXISTS chapter_images (
  novel_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  image_id TEXT NOT NULL,                    -- Unique ID gambar dalam bab, e.g. 'img_01', 'img_02'
  remote_url TEXT NOT NULL,
  local_file_path TEXT,                      -- Path lokal di filesystem
  download_status TEXT DEFAULT 'PENDING',    -- 'PENDING', 'DOWNLOADED', 'FAILED'
  PRIMARY KEY (novel_id, chapter_id, image_id),
  FOREIGN KEY (novel_id, chapter_id) REFERENCES chapters(novel_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chapter_images_chapter ON chapter_images (novel_id, chapter_id);

-- 4. Tabel Progres Membaca Granular per Bab (Composite PK)
CREATE TABLE IF NOT EXISTS chapter_reading_progress (
  novel_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  anchor_block_index INTEGER DEFAULT 0,      -- Posisi blok aktif terakhir dilihat untuk restorasi scroll
  is_completed INTEGER DEFAULT 0,            -- Status historis penyelesaian: 0 (belum), 1 (selesai)
  updated_at INTEGER NOT NULL,               -- Unix epoch ms (digunakan untuk mencari Bab Terakhir Dibaca)
  PRIMARY KEY (novel_id, chapter_id),
  FOREIGN KEY (novel_id, chapter_id) REFERENCES chapters(novel_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reading_progress_novel ON chapter_reading_progress (novel_id, updated_at DESC);

-- 5. Tabel Antrean Unduhan (Download Queue)
CREATE TABLE IF NOT EXISTS download_queue (
  id TEXT PRIMARY KEY,                       -- UUID pekerjaan unduhan
  novel_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  status TEXT NOT NULL,                      -- 'QUEUED','DOWNLOADING','PAUSED','COMPLETED','FAILED','CANCELLED'
  retry_count INTEGER DEFAULT 0,             -- Jumlah percobaan ulang yang telah dilakukan (0 - 3)
  next_retry_at INTEGER,                     -- Unix epoch ms untuk jadwal retry berikutnya
  error_message TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (novel_id, chapter_id) REFERENCES chapters(novel_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_download_queue_status ON download_queue (status);

-- 6. Tabel Preferensi Pengaturan Pembaca (Key-Value)
CREATE TABLE IF NOT EXISTS reader_settings (
  key TEXT PRIMARY KEY,                      -- e.g. 'fontSize', 'theme', 'fontFamily', 'lineHeight'
  value TEXT NOT NULL,                       -- Serialized value, e.g. '18', '"sepia"', '"Inter"'
  updated_at INTEGER NOT NULL
);
```

---

## 7. ContentBlock Contract & Type Specifications

Konten bab yang dikirim oleh backend dan disimpan oleh client wajib mengikuti format **Array Blok Terstruktur (`ContentBlock[]`)**. Tidak ada penyimpanan format HTML mentah di sisi client.

```typescript
// 1. Format Penekanan Inline di Dalam Blok Teks
export interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

// 2. Blok Paragraf
export interface ParagraphBlock {
  type: 'paragraph';
  id: string;                                // e.g. 'b_001', unik di dalam bab
  spans: InlineSpan[];
}

// 3. Blok Heading Cerita (Mendukung Level 1 sampai 6)
export interface HeadingBlock {
  type: 'heading';
  id: string;                                // e.g. 'h_001'
  level: 1 | 2 | 3 | 4 | 5 | 6;              // Sesuai tag heading <h1> s.d. <h6>
  text: string;
}

// 4. Blok Gambar Ilustrasi Cerita (Mendukung Banyak Gambar per Bab)
export interface ImageBlock {
  type: 'image';
  id: string;                                // Merujuk ke chapter_images.image_id (e.g. 'img_01')
  alt?: string;
  caption?: string;
}

// 5. Blok Pemisah Adegan (Separator / <hr>)
export interface SeparatorBlock {
  type: 'separator';
  id: string;                                // e.g. 's_001'
}

// Union Type Konten Bab
export type ContentBlock = ParagraphBlock | HeadingBlock | ImageBlock | SeparatorBlock;
```

---

## 8. Backend API Contracts & Cache Policies

### 8.1 Standar Envelope Respons API
Setiap endpoint backend merespons dengan format standar berikut:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "source": "meionovel",
    "cachedAt": 1774353600000,
    "page": 1,
    "totalPages": 10,
    "hasNextPage": true
  }
}
```

Format respon saat terjadi galat (*error*):
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "CHAPTER_EMPTY_CONTENT",
    "message": "Konten bab tidak ditemukan atau kosong dari sumber web.",
    "details": { "novelId": "kimi-wa-boku-no-koukai-ln", "chapterId": "volume-4-chapter-14" }
  },
  "meta": {
    "source": "meionovel",
    "cachedAt": 1774353600000
  }
}
```

### 8.2 Spesifikasi In-Memory LRU Cache Backend
* **Batasan Kapasitas**: Maksimal **500 item** atau batas memori **100 MB**.
* **Sifat Cache**: *Ephemeral* (boleh kosong kembali jika service backend di-restart).
* **Kebijakan Kesegaran Data (*Freshness Policy / TTL*)**:
  1. `GET /api/novels/popular` -> TTL: **6 jam** (21.600.000 ms).
  2. `GET /api/novels/latest?page={n}` -> TTL: **15 menit** (900.000 ms).
  3. `GET /api/novels/search?q={query}&page={n}` -> TTL: **30 menit** (1.800.000 ms).
  4. `GET /api/novels/:novelId` -> TTL: **12 jam** (43.200.000 ms).
  5. `GET /api/novels/:novelId/chapters/:chapterId` -> TTL: **7 hari** (604.800.000 ms).
     *(Catatan: TTL 7 hari adalah batas kesegaran cache server, bukan jaminan bahwa teks bab tidak pernah direvisi di situs sumber)*.

### 8.3 Rincian Endpoint REST API
* `GET /api/novels/popular`
  * Mengembalikan daftar novel populer berdasarkan views.
* `GET /api/novels/latest?page=1`
  * Mengembalikan daftar bab novel yang baru dirilis beserta nomor bab terbarunya.
* `GET /api/novels/search?q={query}&page=1`
  * Mencari novel berdasarkan judul atau penulis.
* `GET /api/novels/:novelId`
  * Mengembalikan detail novel (metadata) dan array seluruh daftar bab (`id`, `title`, `chapterNumber`, `releaseDate`).
* `GET /api/novels/:novelId/chapters/:chapterId`
  * Mengembalikan detail bab, array `blocks: ContentBlock[]`, dan daftar banyak gambar `images: Array<{ imageId: string, remoteUrl: string, alt?: string, caption?: string }>`.

---

## 9. Actionable Implementation Tasks & Measurable Verification Criteria

### 9.1 Baseline Kondisi Pengujian Performa (Test Environment Baseline)
Untuk memastikan verifikasi pengujian dapat diulang (*reproducible*) dan objektif, seluruh kriteria performa dievaluasi menggunakan baseline berikut:
* **Perangkat Acuan (Hardware Baseline)**: Smartphone Android kelas menengah (*Mid-range*): SoC Octa-Core setara Snapdragon 680 / Helio G88, RAM 4 GB, OS Android 11+.
* **Beban Uji Acuan (Workload Baseline)**: Bab standar Light Novel berisi 3.000 – 6.000 kata (50 – 100 blok teks terstruktur, 1 – 3 file gambar ilustrasi web-optimized 800x1200 @ ~300 KB).
* **Profil Jaringan**:
  * *Offline Profile*: Airplane Mode (radios OFF, latency $\infty$).
  * *Online Fast Profile*: WiFi / 4G stabil (RTT 30–50 ms, bandwidth download $\ge 10\text{ Mbps}$).
  * *Online Constrained Profile*: Koneksi seluler lemah / 3G throttled (RTT 400–600 ms, bandwidth $500\text{ kbps}$, packet loss 1%).
* **Status Cache**:
  * *Cache Hit*: Data respons telah tersedia di In-Memory LRU Cache backend.
  * *Cache Miss (Cold Fetch)*: Backend harus mengambil dan mem-parsing HTML mentah dari situs sumber Meionovels.

### 9.2 Matriks Target Ambang Batas Performa (SLA Thresholds vs Measurement)
*Penting: Nilai-nilai pada tabel berikut merupakan **Target Ambang Batas Kelulusan (Acceptance Threshold)** yang harus dipenuhi dalam proses pengujian, bukan klaim hasil pengukuran eksperimen yang telah dilakukan.*

| ID Pengujian | Skenario Fitur | Kondisi Jaringan & Status Cache | Metrik yang Diukur | Target Ambang Batas (SLA Threshold) |
|---|---|---|---|---|
| **SLA-NAV-01** | Navigasi Bab Lokal | Offline (Airplane Mode), data lokal di SQLite | *Time-to-First-Block (TTFB)* dari klik navigasi hingga blok pertama di-render | **$< 300\text{ ms}$** |
| **SLA-NAV-02** | Navigasi Bab Online | Online Fast, Backend Cache Hit | Latensi respons jaringan + render blok awal | **$< 800\text{ ms}$** |
| **SLA-NAV-03** | Navigasi Bab Cold Fetch | Online Fast, Backend Cache Miss | Waktu total scraping, sanitasi, JSON parsing, dan render client | **$< 3.0\text{ detik}$** (Hard timeout: **$8.0\text{ detik}$**) |
| **SLA-TYPO-01**| Restorasi Tipografi | Offline / Online (bab sudah termuat) | Durasi layout recalculation & auto-scroll ke `anchor_block_index` aktif saat font berubah | **$< 200\text{ ms}$** tanpa flicker visual ke blok lain |
| **SLA-DOWN-01**| Batch Download Foreground | Online Fast, antrean 10 bab (~50.000 kata, ~15 gambar) | Kelancaran UI thread selama proses unduhan berlangsung | Frame rate $\ge 58\text{ fps}$ (frame drop $< 5\%$), tidak ada dialog ANR |
| **SLA-COLD-01**| Cold Start Offline | Offline (Airplane Mode), aplikasi dibuka dari status *force killed* | *Time-to-Interactive (TTI)* layar Pustaka Saya | **$< 500\text{ ms}$** tanpa crash / blank screen |
| **SLA-THEME-01**| Theme Switching | Offline / Online | Durasi transisi tema (Light, Dark, Sepia) pada seluruh elemen UI aktif | **$< 100\text{ ms}$** tanpa kedipan UI |

---

### 9.3 Rincian Task Implementasi (Step-by-Step)

#### Phase 1: Environment, Proxy & Scraper Setup

##### Task 1: Initialize Monorepo & Backend Scraper Microservice
* **Objective**: Mengembangkan service backend Hono.js untuk melakukan web scraping dari Meionovels, membersihkan HTML menjadi `ContentBlock[]` (termasuk heading level 1–6 dan multi-gambar), serta mengelola in-memory LRU cache.
* **Key Files**:
  * `server/src/index.ts`
  * `server/src/interfaces/provider.interface.ts`
  * `server/src/providers/meionovel.provider.ts`
  * `server/src/services/cache.service.ts`
  * `server/src/types/blocks.ts`
* **Kriteria Verifikasi Terukur**:
  * Endpoint `GET /api/novels/popular` merespons payload JSON dengan daftar novel terverifikasi; diuji dengan SLA-NAV-02 (cache hit) dan SLA-NAV-03 (cache miss).
  * Endpoint `GET /api/novels/latest?page=1` menghasilkan daftar bab terbaru beserta metadata paginasi (`hasNextPage`, `totalPages`).
  * Endpoint `GET /api/novels/:novelId/chapters/:chapterId` mengekstrak tag `<h1>`–`<h6>` menjadi `HeadingBlock` dengan `level` 1–6, mengekstrak seluruh tag `<img>` ke array `images`, serta mengembalikan HTTP 422 (`CHAPTER_EMPTY_CONTENT`) jika tidak ada blok konten.

---

#### Phase 2: Android Shell, Discovery & Detail UI

##### Task 2: Android Shell & Theme Provider Setup
* **Objective**: Membangun kerangka aplikasi Expo React Native khusus Android dengan theme switching dan layout reader shell.
* **Key Files**:
  * `client/App.tsx`
  * `client/src/context/ThemeContext.tsx`
  * `client/src/styles/theme.ts`
* **Kriteria Verifikasi Terukur**:
  * Aplikasi ter-build sukses pada emulator/perangkat Android (Android 8.0+).
  * Penggantian tema (Light, Dark, Sepia) memenuhi target **SLA-THEME-01 (< 100 ms)** tanpa glitch UI.

##### Task 3: Novel Discovery & Detail View UI
* **Objective**: Membangun halaman Home (feed Pembaruan Terbaru dan Novel Populer), pencarian novel, dan halaman Detail Novel.
* **Key Files**:
  * `client/src/pages/HomeScreen.tsx`
  * `client/src/pages/NovelDetailScreen.tsx`
  * `client/src/components/novel/NovelCard.tsx`
  * `client/src/components/novel/ChapterListDrawer.tsx`
* **Kriteria Verifikasi Terukur**:
  * Pencarian kata kunci menampilkan daftar kartu novel dengan judul dan cover yang proporsional.
  * Membuka halaman detail memuat metadata dan seluruh daftar bab memenuhi target **SLA-NAV-02 (< 800 ms)** saat backend cache hit.
  * Pengguna dapat membalik urutan daftar bab (Ascending / Descending) dengan toggle.

---

#### Phase 3: Reader Engine & Typography Customization

##### Task 4: Continuous Vertical Reader Engine with Block-Index Anchoring
* **Objective**: Membangun antarmuka pembaca teks vertikal berkelanjutan dengan auto-keep-awake layar, gestur tap navigasi, heading level 1–6, dan pemulihan posisi berbasis `anchor_block_index`.
* **Key Files**:
  * `client/src/pages/ReaderScreen.tsx`
  * `client/src/components/reader/ReaderBlockRenderer.tsx`
  * `client/src/components/reader/ReaderControlsOverlay.tsx`
  * `client/src/components/reader/ReaderSettingsModal.tsx`
  * `client/src/hooks/useReaderSettings.ts`
* **Kriteria Verifikasi Terukur**:
  * **Keep-Awake**: Layar perangkat Android tetap menyala tanpa tertidur saat berada di antarmuka pembaca bab.
  * **Navigasi Bab**:
    * Berpindah ke bab lokal memenuhi target **SLA-NAV-01 (< 300 ms)**.
    * Berpindah ke bab online memenuhi target **SLA-NAV-02 (< 800 ms)**.
    * Jika koneksi melewati batas 8.0 detik, aplikasi menampilkan pesan timeout dengan tombol *"Coba Lagi"*.
  * **Restorasi Tipografi**: Mengubah ukuran font atau jenis font memenuhi target **SLA-TYPO-01 (< 200 ms)**, dengan posisi scroll kembali ke `anchor_block_index` aktif.
  * **Penyelarasan Progres 100%**: Ketika sentinel akhir terlihat di viewport, posisi baca visual langsung menunjukkan **100%** dan kolom `is_completed` di-set menjadi `1`. Menggulir kembali ke atas mempertahankan status `is_completed = 1`.

---

#### Phase 4: Offline Engine, SQLite & Download Manager

##### Task 5: Robust Download Manager with Queue Lifecycle & Multi-Image Integrity
* **Objective**: Membangun manajer pengunduhan bab ke SQLite dan filesystem lokal yang mencakup pemulihan saat startup, jadwal retry terukur, dan integritas multi-gambar per bab via key `(novel_id, chapter_id, image_id)`.
* **Key Files**:
  * `client/src/services/storage/sqlite.ts`
  * `client/src/services/storage/filesystem.ts`
  * `client/src/services/download/downloadManager.ts`
  * `client/src/components/novel/DownloadControls.tsx`
* **Kriteria Verifikasi Terukur**:
  * **Penyimpanan State Antrean**: Memasukkan bab ke antrean langsung menulis record ke tabel `download_queue` di SQLite dengan status `QUEUED`.
  * **Batch Download**: Mengunduh antrean 10 bab memenuhi target **SLA-DOWN-01 ($\ge 58\text{ fps}$, frame drop $< 5\%$, tanpa ANR)**.
  * **Integritas Multi-Gambar**: Jika bab memiliki 3 gambar, status `chapters.download_status` HANYA menjadi `DOWNLOADED` setelah teks dan ketiga gambar di `chapter_images` berhasil disimpan. Jika 1 gambar gagal setelah retry, status antrean menjadi `FAILED` dan bab tetap `NOT_DOWNLOADED`.
  * **Jadwal Retry**: Jika koneksi gagal, sistem melakukan 1 percobaan awal + 3 kali retry dengan jeda waktu 2 detik, 5 detik, dan 10 detik sebelum menandai `FAILED`.
  * **Pemulihan Startup**: Mematikan aplikasi (*force kill*) saat unduhan berstatus `DOWNLOADING` dan membukanya kembali: pekerjaan otomatis dipulihkan menjadi `PAUSED`. Menekan tombol *"Resume"* melanjutkan unduhan tanpa mengunduh ulang gambar yang telah tersimpan.
  * **Penghapusan Unduhan**: Menghapus bab unduhan membersihkan berkas gambar lokal dan konten bab dari SQLite, tetapi riwayat membaca pada `chapter_reading_progress` dan bookmark pada `novels` tidak ikut terhapus.

##### Task 6: Personal Library, Offline Cold-Start & Bookmark Manager
* **Objective**: Mengembangkan layar Pustaka Saya untuk mengelola bookmark, riwayat baca, dan membuka aplikasi secara penuh dari kondisi offline.
* **Key Files**:
  * `client/src/pages/LibraryScreen.tsx`
  * `client/src/components/library/HistorySection.tsx`
  * `client/src/components/library/BookmarkSection.tsx`
* **Kriteria Verifikasi Terukur**:
  * **Cold Start Offline**: Membuka aplikasi dari status tertutup penuh saat Airplane Mode memenuhi target **SLA-COLD-01 (< 500 ms)** langsung ke layar Pustaka Saya.
  * **Akses Bab Terunduh**: Bab yang berstatus `DOWNLOADED` dapat dibuka dan dibaca lengkap dengan semua gambar ilustrasi lokal saat offline.
  * **Fallback Bab Belum Terunduh**: Membuka bab `NOT_DOWNLOADED` saat offline menampilkan layar *Empty State Offline* dengan tombol kembali ke bab yang sudah terunduh.
  * **Indikator Progres Novel**: Menampilkan `"X dari Y bab selesai (Z%)"` secara akurat berdasarkan hitungan bab yang memiliki `is_completed = 1`.

---

#### Phase 5: Resilience, Edge Cases & Polish

##### Task 7: Network Resilience, Storage Quota & Error Handling
* **Objective**: Menangani kondisi kegagalan jaringan, disk ponsel penuh, dan perubahan struktur situs target.
* **Key Files**:
  * `server/src/middlewares/errorHandler.ts`
  * `client/src/components/common/ErrorBoundary.tsx`
  * `client/src/components/common/StorageFullModal.tsx`
* **Kriteria Verifikasi Terukur**:
  * Jika penyimpanan perangkat penuh saat mengunduh gambar, proses otomatis dijeda dan memunculkan modal peringatan *"Penyimpanan Penuh"*.
  * Jika situs Meionovels down atau mengalami kegagalan parsing, backend mengembalikan HTTP 503 dengan payload JSON error terstandar, dan client menampilkan pesan kesalahan yang ramah pengguna.

---

## 10. Lampiran: Bukti Verifikasi Struktur Sumber (Meionovels)

Berdasarkan penelusuran langsung pada `meionovels.com`:

1. **Feed Pembaruan Terbaru (*Latest Updates*)**:
   * **URL**: `https://meionovels.com/` (Paginasi: `https://meionovels.com/page/{page}/`)
   * **Elemen HTML Sumber**: Artikel dengan class `.page-item-detail`
   * **Contoh Hasil Riil**:
     * Judul: `Kimi wa Boku no Koukai LN` (Bab: `Volume 4 Chapter 14`, `Volume 4 Chapter 13`)
     * Judul: `Dewa Bela Diri yang Menyesal Kembali ke Level 2` (Bab: `Chapter 721`, `Chapter 720`)

2. **Daftar Novel Populer (*Popular Novels*)**:
   * **URL Widget / Halaman**: `https://meionovels.com/novel/?m_orderby=views` (atau widget sidebar "Novel Populer" di homepage)
   * **Contoh Hasil Riil**:
     * `Battle Through the Heavens`
     * `Swallowed Star`
     * `Mesin Nano`
     * `Xian Ni`
     * `Dunia Sempurna`

3. **Struktur URL Novel & Bab**:
   * **Format URL Novel**: `https://meionovels.com/novel/{novel-slug}/`
     * *Contoh*: `https://meionovels.com/novel/kimi-wa-boku-no-koukai-ln/` -> `novelId` = `kimi-wa-boku-no-koukai-ln`
   * **Format URL Bab**: `https://meionovels.com/novel/{novel-slug}/{chapter-slug}/`
     * *Contoh*: `https://meionovels.com/novel/kimi-wa-boku-no-koukai-ln/volume-4-chapter-14/` -> `chapterId` = `volume-4-chapter-14`