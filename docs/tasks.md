# Daftar Tugas Implementasi YomouNovel (読もう)
**Dokumen**: `tasks.md`  
**Status Dokumen**: Kanonik / Rencana Kerja Terstruktur  
**Target Platform**: Android Mobile (Android 8.0+ / API Level 26+)  
**Arsitektur**: Monorepo (`server/` dan `client/`)  

---

## 1. Tujuan dan Sumber Acuan

Dokumen ini memetakan seluruh kebutuhan spesifikasi produk menjadi daftar unit kerja (tugas) yang terisolasi, terurut secara logis, dan siap dieksekusi per sesi implementasi. Setiap tugas dirancang agar memiliki satu hasil utama yang dapat diverifikasi secara mandiri tanpa menyisakan asumsi tersembunyi.

### Sumber Acuan Wajib:
1. **[PRD.md](file:///d:/project/yomou/docs/PRD.md)**: Acuan kanonik cakupan fitur MVP, batasan rilis Android-only, kontrak data komposit, siklus unduhan, dan matriks target performa (SLA).
2. **[anti-patterns-ui.md](file:///d:/project/yomou/docs/anti-patterns-ui.md)**: Acuan kanonik aturan visual wajib, larangan 16 anti-pattern AI-slop, token warna tri-tema, tipografi, dan checklist aksesibilitas (WCAG 2.1 Level AA & Material Design).

---

## 2. Ringkasan Kondisi Repository Aktual

Berdasarkan inspeksi sistem berkas pada repositori `d:\project\yomou`:
* **Struktur Saat Ini**:
  ```text
  d:\project\yomou\
  └── docs/
      ├── PRD.md              (Tersedia, spesifikasi final MVP 554 baris)
      ├── anti-patterns-ui.md (Tersedia, pedoman visual resmi 457 baris)
      └── tasks.md            (Dokumen ini)
  ```
* **Kondisi Kode & Dependensi**:
  * Direktori `server/` dan `client/` **belum dibuat**.
  * Berkas `package.json`, konfigurasi TypeScript, konfigurasi Expo, dan pustaka dependensi **belum ada**.
  * Belum ada kode implementasi fungsional apa pun yang berjalan.
  * Status seluruh tugas berstatus awal: **TODO** (belum ada yang berstatus DONE).

---

## 3. Definisi Kategori dan Status

### 3.1 Kategori Area
* **UI/UX**: Menghasilkan spesifikasi antarmuka terukur, alur layar, tata letak, penanganan state (loading/empty/error), dan pemenuhan checklist visual/aksesibilitas sebelum pengkodean layar.
* **Backend**: Menghasilkan service microservice Node.js/Hono.js, provider scraper Meionovels, pembersih HTML menjadi `ContentBlock[]`, in-memory cache LRU, validasi input, dan REST API.
* **Frontend**: Menghasilkan komponen layar React Native (Expo), hook logika, integrasi API, database SQLite lokal, manipulasi filesystem, dan integrasi hardware Android.
* **Verifikasi**: Menghasilkan skrip pengujian otomatis, benchmark latensi performa sesuai target SLA, verifikasi aksesibilitas, dan uji coba paket APK Android.

### 3.2 Status Tugas
* `TODO`: Tugas telah terdefinisi lengkap dengan dependensi dan kriteria penerimaan, siap dikerjakan saat gilirannya tiba (Default).
* `IN_PROGRESS`: Tugas sedang aktif dikerjakan dalam sesi implementasi saat ini.
* `BLOCKED`: Tugas terhenti karena dependensinya belum terpenuhi atau terdapat konflik eksternal yang belum diputuskan.
* `DONE`: Tugas telah selesai diimplementasikan DAN telah lolos seluruh kriteria penerimaan serta prosedur verifikasi dengan bukti nyata.

---

## 4. Tabel Urutan Milestone & Dependensi Utama

```text
[Milestone 1: Fondasi & Kontrak Data]
       │
       ├───► [Milestone 2: Backend Scraper & API Cache] ──┐
       │                                                 ▼
       └───► [Milestone 3: Discovery & Detail UI] ──► [Milestone 4: Reader Engine]
                                                               │
                                                               ▼
             [Milestone 6: Download & Offline] ◄─── [Milestone 5: Library & Riwayat]
                            │
                            ▼
             [Milestone 7: Verifikasi End-to-End, SLA & Build APK]
```

| Milestone | Fokus Utama | Target Luaran | Dependensi |
|---|---|---|---|
| **M1: Fondasi** | Monorepo shell, kontrak tipe bersama, SQLite schema, tri-tema | Kerangka client & server terinisialisasi, skema database lokal terpasang | Tidak ada |
| **M2: Backend** | Scraper Meionovels, sanitasi ContentBlock, in-memory cache | REST API scraper aktif & teruji (popular, latest, search, detail, chapter) | M1 |
| **M3: Discovery** | UI & integrasi layar Home, Search, dan Detail Novel | Pengguna dapat mencari, melihat daftar tren/update, dan daftar bab | M1, M2 |
| **M4: Reader** | Vertical scroll reader, tipografi, anchor restoration, keep-awake | Pengalaman membaca novel bebas iklan, heading 1–6, multi-gambar, restorasi posisi | M1, M3 |
| **M5: Library** | Pustaka saya, bookmark, riwayat baca, progres novel | Penyimpanan bookmark dan riwayat baca persisten di SQLite lokal | M1, M4 |
| **M6: Offline** | Download manager, antrean SQLite, multi-image integrity, offline fallback | Pengunduhan bab untuk dibaca penuh saat Airplane Mode | M1, M4, M5 |
| **M7: QA & Release** | Audit aksesibilitas, pengujian SLA performa, build Android APK | Verifikasi end-to-end menyeluruh dan berkas APK Android siap pasang | M1 s.d. M6 |

---

## 5. Rincian Tugas per Milestone

### Milestone 1: Fondasi Proyek, Kontrak Data, dan Setup Lingkungan

#### [FON-01] Inisialisasi Struktur Monorepo & Konfigurasi Dasar
* **Area**: Fondasi
* **Status**: `DONE`
* **Tujuan**: Menyiapkan struktur workspace monorepo dengan direktori `server/` dan `client/` serta konfigurasi TypeScript dan script eksekusi.
* **Ruang Lingkup**:
  * Membuat root `package.json` dengan workspace npm (`server` dan `client`).
  * Inisialisasi proyek Node.js + TypeScript pada direktori `server/`.
  * Inisialisasi proyek Expo Managed Workflow + TypeScript pada direktori `client/`.
  * Menyiapkan file `.gitignore` yang mengabaikan `node_modules/`, `.expo/`, `dist/`, dan file lokal Android.
* **Dependensi**: Tidak ada.
* **File/Area Terkait**:
  * `package.json` [Selesai]
  * `server/package.json` [Selesai]
  * `server/tsconfig.json` [Selesai]
  * `client/package.json` [Selesai]
  * `client/tsconfig.json` [Selesai]
  * `client/app.json` [Selesai]
  * `.gitignore` [Selesai]
* **Acceptance Criteria**:
  * [x] Menjalankan `npm install` di root menginstal seluruh dependensi client dan server secara terisolasi.
  * [x] Proyek `server/` dapat melakukan build TypeScript (`npm run build`) tanpa error sintaks.
  * [x] Proyek `client/` dapat memulai Expo bundler (`npx expo start`) tanpa error konfigurasi.
* **Cara Verifikasi**:
  * Jalankan `npm run -w server build` dan pastikan kode kompilasi keluar di `server/dist/`.
  * Jalankan `npx expo config -w client` untuk memvalidasi konfigurasi Expo Android.
* **Referensi Acuan**: [PRD.md: Seksi 1.3 & 5.1](file:///d:/project/yomou/docs/PRD.md).

---

#### [FON-02] Definisi Kontrak Tipe Data Bersama (Shared Types Contract)
* **Area**: Fondasi / Kontrak Data
* **Status**: `DONE`
* **Tujuan**: Menyediakan definisi tipe TypeScript yang diselaraskan antara `server/` dan `client/` sebagai acuan serialisasi backend dan deserialisasi frontend melalui pemeriksaan konsistensi otomatis.
* **Ruang Lingkup**:
  * Mendefinisikan tipe `ContentBlock` (`ParagraphBlock`, `HeadingBlock` level 1–6, `ImageBlock`, `SeparatorBlock`).
  * Mendefinisikan tipe `InlineSpan` dengan formatting flag (`bold`, `italic`, `underline`, `strikethrough`).
  * Mendefinisikan kontrak respons standar API envelope (`ApiResponse<T>`, `ApiError`, `ApiMeta`).
  * Mendefinisikan tipe entitas novel (`NovelSummary`, `NovelDetail`, `ChapterSummary`, `ChapterDetail`, `ChapterImage` tanpa `localFilePath`).
  * Menyiapkan skrip pemeriksaan konsistensi kesetaraan kontrak (`scripts/check-contracts.mjs`).
* **Dependensi**: `FON-01`.
* **File/Area Terkait**:
  * `server/src/types/blocks.ts` [Selesai]
  * `server/src/types/novel.ts` [Selesai]
  * `server/src/types/api.ts` [Selesai]
  * `client/src/types/blocks.ts` [Selesai]
  * `client/src/types/novel.ts` [Selesai]
  * `client/src/types/api.ts` [Selesai]
  * `scripts/check-contracts.mjs` [Selesai]
* **Acceptance Criteria**:
  * [x] Tipe `HeadingBlock.level` didefinisikan secara ketat sebagai union `1 | 2 | 3 | 4 | 5 | 6`.
  * [x] Tipe `ImageBlock` mereferensikan `id` unik gambar di dalam bab.
  * [x] Tipe error mencakup kode error resmi `CHAPTER_EMPTY_CONTENT`, `PROVIDER_TIMEOUT`, dan `SCRAPER_PARSE_ERROR`.
  * [x] Tipe `ChapterImage` hanya mencakup `imageId`, `remoteUrl`, `alt?`, `caption?` (tanpa `localFilePath` yang dialihkan ke `FON-03`).
  * [x] Terdapat skrip verifikasi kesetaraan kontrak server–client yang memvalidasi paritas tipe.
* **Cara Verifikasi**:
  * Jalankan `npm run check:contracts` (`node scripts/check-contracts.mjs`) untuk memvalidasi kesetaraan kontrak antara server dan client (perbedaan ekstensi `.js` pada server dinormalisasi).
  * Jalankan `npm run -w server build` dan `npm run typecheck:client` (`tsc --noEmit`) untuk memverifikasi validitas tipe data.
  * *Catatan Implementasi*: Definisi kontrak saat ini disalin/mirrored pada masing-masing workspace (`server/src/types/` dan `client/src/types/`) dengan pengujian konsistensi otomatis, bukan satu paket terpusat (*single shared package*).
* **Referensi Acuan**: [PRD.md: Seksi 7 & 8.1, 8.3](file:///d:/project/yomou/docs/PRD.md).

---

#### [FON-03] Implementasi Modul Database SQLite & Filesystem Client
* **Area**: Frontend
* **Status**: `TODO`
* **Tujuan**: Membangun modul persistensi lokal menggunakan `expo-sqlite` dan `expo-file-system` dengan skema komposit lengkap.
* **Ruang Lingkup**:
  * Inisialisasi koneksi database SQLite lokal (`yomou.db`).
  * Eksekusi migration skema DDL: tabel `novels`, `chapters`, `chapter_images`, `chapter_reading_progress`, `download_queue`, dan `reader_settings`.
  * Implementasi pembuatan indeks: `idx_chapter_images_chapter`, `idx_reading_progress_novel`, dan `idx_download_queue_status`.
  * Utilitas helper penyimpanan gambar cover dan ilustrasi bab ke direktori dokumen lokal via `expo-file-system`.
* **Dependensi**: `FON-01`, `FON-02`.
* **File/Area Terkait**:
  * `client/src/services/storage/sqlite.ts` [Usulan]
  * `client/src/services/storage/schema.ts` [Usulan]
  * `client/src/services/storage/filesystem.ts` [Usulan]
* **Acceptance Criteria**:
  * [ ] Tabel `chapters` memiliki Composite Primary Key `(novel_id, id)`.
  * [ ] Tabel `chapter_images` memiliki Composite Primary Key `(novel_id, chapter_id, image_id)`.
  * [ ] Tabel `chapter_reading_progress` memiliki Composite Primary Key `(novel_id, chapter_id)`.
  * [ ] Direktori penyimpanan gambar lokal (`${documentDirectory}/covers/` dan `${documentDirectory}/chapters/`) otomatis dibuat jika belum ada.
* **Cara Verifikasi**:
  * Buat skrip uji unit lokal yang membuka database in-memory/test SQLite, menjalankan migration, dan memastikan `PRAGMA table_info` mengembalikan kolom dan composite PK yang sesuai.
* **Referensi Acuan**: [PRD.md: Seksi 6](file:///d:/project/yomou/docs/PRD.md).

---

#### [FON-04] Setup Desain Sistem Tri-Tema & Komponen Primitif Sesuai Pedoman Anti-Pattern
* **Area**: UI/UX & Frontend
* **Status**: `TODO`
* **Tujuan**: Membangun fondasi tema dan komponen primitif yang mematuhi token semantik dan checklist visual [anti-patterns-ui.md](file:///d:/project/yomou/docs/anti-patterns-ui.md).
* **Ruang Lingkup**:
  * Definisi token warna untuk Light (`#FFFFFF`), Dark (`#121212`), dan Sepia (`#F4ECD8`) pada NativeWind/Tailwind config.
  * Implementasi `ThemeContext` dan hook `useTheme` untuk penggantian tema dinamis.
  * Membuat komponen primitif fungsional: `Button` (Filled, Outlined, Text), `Surface` (Card, Sheet), `Text` (Headline, Title, Body, Caption), dan `Icon` (Material Symbols Rounded 24dp).
  * Menjamin target sentuh minimal 48x48 dp pada seluruh komponen tombol primitif.
* **Dependensi**: `FON-01`.
* **File/Area Terkait**:
  * `client/tailwind.config.js` [Usulan]
  * `client/src/styles/theme.ts` [Usulan]
  * `client/src/context/ThemeContext.tsx` [Usulan]
  * `client/src/components/common/Button.tsx` [Usulan]
  * `client/src/components/common/Typography.tsx` [Usulan]
* **Acceptance Criteria**:
  * [ ] Tidak ada penggunaan gradien ungu/biru, efek glassmorphism, atau border neon pada seluruh token dan primitif.
  * [ ] Seluruh tombol interaktif memiliki minHeight/minWidth 48dp atau padding sentuh 48dp.
  * [ ] Komponen tombol tanpa label teks wajib mewajibkan prop `accessibilityLabel`.
* **Cara Verifikasi**:
  * Render komponen primitif pada Storybook/test screen di ketiga mode tema dan periksa keselarasan warna menggunakan color inspector.
* **Referensi Acuan**: [anti-patterns-ui.md: Seksi 4.1, 4.4, 4.5, 4.9](file:///d:/project/yomou/docs/anti-patterns-ui.md).

---

#### [FON-05] Setup Navigasi Utama Aplikasi Android
* **Area**: Frontend
* **Status**: `TODO`
* **Tujuan**: Menyiapkan kerangka navigasi utama Android menggunakan React Navigation (Native Stack + Bottom Tabs).
* **Ruang Lingkup**:
  * Inisialisasi Bottom Tab Navigator untuk 2 tab utama: **Discover** dan **Library**.
  * Inisialisasi Native Stack Navigator untuk transisi layar: `HomeScreen`, `NovelDetailScreen`, `ReaderScreen`, dan `DownloadManagerScreen`.
  * Konfigurasi Bottom Navigation Bar datar solid sesuai token tema aktif tanpa efek frosted glass atau bayangan bertumpuk.
* **Dependensi**: `FON-04`.
* **File/Area Terkait**:
  * `client/src/navigation/RootNavigator.tsx` [Usulan]
  * `client/src/navigation/BottomTabNavigator.tsx` [Usulan]
  * `client/src/navigation/types.ts` [Usulan]
* **Acceptance Criteria**:
  * [ ] Ikon navigasi menggunakan vektor resmi seragam (24dp) dengan label teks yang jelas (bebas dari emoji navigasi).
  * [ ] Berpindah antar tab terjadi secara instan tanpa animasi berulang atau efek parallax.
  * [ ] Layar Reader ditampilkan sebagai modal/stack penuh yang menyembunyikan bottom bar secara otomatis.
* **Cara Verifikasi**:
  * Jalankan navigasi di simulator/perangkat dan pastikan rute `Discover` $\rightarrow$ `NovelDetail` $\rightarrow$ `Reader` $\rightarrow$ kembali berfungsi tanpa glitch.
* **Referensi Acuan**: [PRD.md: Seksi 5.2](file:///d:/project/yomou/docs/PRD.md), [anti-patterns-ui.md: Seksi 3.9 & 3.16](file:///d:/project/yomou/docs/anti-patterns-ui.md).

---

### Milestone 2: Backend Scraper Engine & Caching Layer (Meionovels)

#### [BE-01] Implementasi HTTP Client Resilience & Interface Provider
* **Area**: Backend
* **Status**: `TODO`
* **Tujuan**: Membangun antarmuka provider `INovelProvider` dan HTTP client berbasis `axios` dengan User-Agent realistis, timeout 8 detik, dan retry schedule.
* **Ruang Lingkup**:
  * Membuat interface TypeScript `INovelProvider`.
  * Implementasi wrapper HTTP client Axios dengan timeout konfigurabel (default 8000 ms).
  * Mekanisme retry schedule: 1 kali percobaan awal + 3 kali retry (jeda 2s, 5s, 10s) khusus untuk error jaringan / timeout / 5xx.
* **Dependensi**: `FON-01`, `FON-02`.
* **File/Area Terkait**:
  * `server/src/interfaces/provider.interface.ts` [Usulan]
  * `server/src/services/httpClient.ts` [Usulan]
* **Acceptance Criteria**:
  * [ ] Request yang mengalami ECONNRESET atau timeout otomatis mencoba ulang hingga 3 kali sesuai jadwal jeda.
  * [ ] Request yang melampaui batas hard timeout 8000 ms mengembalikan error terstruktur `PROVIDER_TIMEOUT`.
* **Cara Verifikasi**:
  * Jalankan pengujian mock server lokal yang mensimulasikan kegagalan jaringan 2 kali lalu sukses pada percobaan ke-3.
* **Referensi Acuan**: [PRD.md: Seksi 3.1 & 8.2](file:///d:/project/yomou/docs/PRD.md).

---

#### [BE-02] Implementasi Meionovel Scraper: Feed Pembaruan Terbaru & Novel Populer
* **Area**: Backend
* **Status**: `TODO`
* **Tujuan**: Mengekstrak data daftar novel dari seksi *Pembaruan Terbaru* (paginated) dan *Novel Populer* (`?m_orderby=views`) pada situs `meionovels.com`.
* **Ruang Lingkup**:
  * Membuat class `MeionovelProvider implements INovelProvider`.
  * Metode `getLatest(page: number)`: scrape artikel `.page-item-detail` dari URL `https://meionovels.com/page/{page}/`.
  * Metode `getTrending()`: scrape widget sidebar "Novel Populer" / `https://meionovels.com/novel/?m_orderby=views`.
  * Ekstraksi slug novel stabil (`novelId`), judul, cover URL, bab terbaru, dan waktu pembaruan.
* **Dependensi**: `BE-01`.
* **File/Area Terkait**:
  * `server/src/providers/meionovel.provider.ts` [Usulan]
  * `server/src/utils/parser.ts` [Usulan]
* **Acceptance Criteria**:
  * [ ] `getLatest(1)` mengembalikan array objek `NovelSummary` lengkap dengan judul, cover URL, dan `latestChapter`.
  * [ ] `getTrending()` mengembalikan daftar novel populer terverifikasi (seperti *Battle Through the Heavens*, *Swallowed Star*).
  * [ ] Slug ID novel bersih dari domain dan awalan `/novel/` (contoh: `kimi-wa-boku-no-koukai-ln`).
* **Cara Verifikasi**:
  * Jalankan script runner `npm run -w server test:provider-feeds` dan periksa kebenaran JSON hasil ekstraksi.
* **Referensi Acuan**: [PRD.md: Seksi 3.5 & 10](file:///d:/project/yomou/docs/PRD.md).

---

#### [BE-03] Implementasi Meionovel Scraper: Pencarian Novel & Detail Novel Lengkap
* **Area**: Backend
* **Status**: `TODO`
* **Tujuan**: Mengekstrak hasil pencarian berdasarkan kata kunci serta detail metadata dan daftar seluruh bab dari novel target.
* **Ruang Lingkup**:
  * Metode `search(query: string, page: number)`: scrape hasil pencarian Meionovels (`?s={query}&post_type=wp-manga`).
  * Metode `getNovelDetails(novelId: string)`: scrape halaman `https://meionovels.com/novel/{novelId}/`.
  * Ekstraksi metadata: judul, penulis, sinopsis, genre array, status ("Ongoing" / "Completed"), cover URL, dan array seluruh bab (`id`, `title`, `chapterNumber`, `releaseDate`).
* **Dependensi**: `BE-02`.
* **File/Area Terkait**:
  * `server/src/providers/meionovel.provider.ts` [Usulan]
* **Acceptance Criteria**:
  * [ ] `search("kimi")` mengembalikan novel terkait dengan metadata cover dan judul yang valid.
  * [ ] `getNovelDetails("kimi-wa-boku-no-koukai-ln")` mengembalikan daftar bab terurut kronologis dengan slug bab stabil (contoh: `volume-4-chapter-14`).
  * [ ] Indeks urutan bab tidak dijadikan sebagai ID bab (ID bab murni slug URL).
* **Cara Verifikasi**:
  * Jalankan script uji `npm run -w server test:provider-details` dan pastikan minimal 10 bab pertama terekstrak dengan benar.
* **Referensi Acuan**: [PRD.md: Seksi 3.1 & 8.3](file:///d:/project/yomou/docs/PRD.md).

---

#### [BE-04] Implementasi Sanitasi Konten & Konversi ke `ContentBlock[]`
* **Area**: Backend
* **Status**: `TODO`
* **Tujuan**: Mengekstrak isi bab novel, membersihkan elemen iklan/skrip, dan mengonversinya menjadi array blok terstruktur (`ContentBlock[]`).
* **Ruang Lingkup**:
  * Metode `getChapterContent(novelId: string, chapterId: string)`.
  * Membersihkan tag `<script>`, `<iframe>`, komentar Disqus, tautan promosi/saweria, dan div iklan.
  * Mengonversi teks cerita menjadi `ParagraphBlock` dengan penekanan inline (`InlineSpan`: bold, italic).
  * Mengonversi heading `<h1>`–`<h6>` menjadi `HeadingBlock` dengan level integer 1–6.
  * Mengonversi ilustrasi cerita menjadi `ImageBlock` (dengan `id` unik per bab) dan mengisi array `images: Array<{ imageId, remoteUrl }>`.
  * Mengonversi `<hr>` menjadi `SeparatorBlock`.
  * Validasi bab kosong: jika total blok == 0, lemparkan galat terstruktur `CHAPTER_EMPTY_CONTENT`.
* **Dependensi**: `BE-03`.
* **File/Area Terkait**:
  * `server/src/providers/meionovel.provider.ts` [Usulan]
  * `server/src/utils/contentSanitizer.ts` [Usulan]
* **Acceptance Criteria**:
  * [ ] Hasil ekstraksi tidak memuat tag HTML mentah seperti `<script>`, `<div>`, atau class iklan.
  * [ ] Teks berformat miring atau tebal dipetakan secara benar ke dalam array `spans`.
  * [ ] Bab yang tidak memuat teks mengembalikan error `CHAPTER_EMPTY_CONTENT` (HTTP 422).
* **Cara Verifikasi**:
  * Uji scraping pada bab sampel riil `volume-4-chapter-14` dan verifikasi bahwa JSON `blocks` memuat array objek yang valid sesuai tipe `ContentBlock[]`.
* **Referensi Acuan**: [PRD.md: Seksi 3.1, 7, 8.3](file:///d:/project/yomou/docs/PRD.md).

---

#### [BE-05] Implementasi In-Memory LRU Cache Service & Policy TTL
* **Area**: Backend
* **Status**: `TODO`
* **Tujuan**: Mengimplementasikan lapisan caching in-memory berbasis LRU dengan batas kapasitas dan kebijakan masa berlaku (*TTL*) per kategori data.
* **Ruang Lingkup**:
  * Mengintegrasikan pustaka `lru-cache` pada Node.js dengan batas maksimum **500 item** atau **100 MB**.
  * Konfigurasi TTL kesegaran data:
    * Popular: 6 jam
    * Latest: 15 menit
    * Search: 30 menit
    * Detail Novel: 12 jam
    * Konten Bab: 7 hari
  * Middleware cache wrapper untuk handler endpoint Hono.js.
* **Dependensi**: `BE-01`.
* **File/Area Terkait**:
  * `server/src/services/cache.service.ts` [Usulan]
  * `server/src/middlewares/cacheMiddleware.ts` [Usulan]
* **Acceptance Criteria**:
  * [ ] Request kedua untuk endpoint yang sama dalam rentang TTL mengembalikan data dari cache (latensi < 150 ms) dengan header/meta `cachedAt`.
  * [ ] Melebihi 500 item atau 100 MB secara otomatis menghapus item paling jarang digunakan (*least recently used*).
* **Cara Verifikasi**:
  * Buat automated test yang memanggil fungsi cache 501 kali dan verifikasi bahwa jumlah item di memori tetap $\le 500$.
* **Referensi Acuan**: [PRD.md: Seksi 8.2](file:///d:/project/yomou/docs/PRD.md).

---

#### [BE-06] Implementasi Router REST API Hono.js & Middleware Error Handling
* **Area**: Backend
* **Status**: `TODO`
* **Tujuan**: Mengekspos seluruh fungsionalitas provider melalui endpoint REST API standar dengan envelope seragam dan penanganan error.
* **Ruang Lingkup**:
  * Setup Hono.js server di `server/src/index.ts`.
  * Mendaftarkan rute:
    * `GET /api/novels/popular`
    * `GET /api/novels/latest`
    * `GET /api/novels/search`
    * `GET /api/novels/:novelId`
    * `GET /api/novels/:novelId/chapters/:chapterId`
  * Global error handler: memformat respons error terstandar (`{ success: false, data: null, error: { code, message, details } }`).
  * Pemetaan kode status: 404 (`NOVEL_NOT_FOUND`, `CHAPTER_NOT_FOUND`), 422 (`CHAPTER_EMPTY_CONTENT`), 503 (`PROVIDER_UNAVAILABLE`), 504 (`PROVIDER_TIMEOUT`).
* **Dependensi**: `BE-02`, `BE-03`, `BE-04`, `BE-05`.
* **File/Area Terkait**:
  * `server/src/index.ts` [Usulan]
  * `server/src/routes/novel.routes.ts` [Usulan]
  * `server/src/middlewares/errorHandler.ts` [Usulan]
* **Acceptance Criteria**:
  * [ ] Seluruh respons sukses memiliki format envelope `{ success: true, data: ..., error: null, meta: ... }`.
  * [ ] Server merespons `CHAPTER_EMPTY_CONTENT` dengan status HTTP 422.
  * [ ] Jika target website down, server merespons HTTP 503 dengan format JSON rapi tanpa bocoran stack trace internal.
* **Cara Verifikasi**:
  * Jalankan server `npm run -w server dev` dan lakukan pengujian HTTP request via curl / fetch ke seluruh rute.
* **Referensi Acuan**: [PRD.md: Seksi 8.1 & 8.3](file:///d:/project/yomou/docs/PRD.md).

---

### Milestone 3: Discovery, Pencarian, dan Detail Novel

#### [DIS-01] UI/UX Spesifikasi Layar Discover, Search, dan Detail Novel
* **Area**: UI/UX
* **Status**: `TODO`
* **Tujuan**: Merinci struktur tata letak, hierarki tipografi, dan penanganan seluruh state tampilan untuk layar Discover, Pencarian, dan Detail Novel sesuai pedoman anti-pattern.
* **Ruang Lingkup**:
  * Menyusun spesifikasi layout Discover: Top bar ringkas (56dp), seksi horizontal "Novel Populer" dengan kartu rasio cover 2:3, dan seksi vertikal "Pembaruan Terbaru".
  * Menyusun spesifikasi Search: Bilah pencarian datar dengan tombol bersihkan "X", hasil pencarian grid/list bersih.
  * Menyusun spesifikasi Detail Novel: Header dua-sisi (cover 140dp di kiri, judul & genre di kanan), 3 tombol aksi (Mulai Baca, Bookmark, Unduh), dan daftar bab flat list dengan pembatas 1dp.
  * Menentukan state tampilan: Loading skeleton, Empty state, Error state dengan tombol "Coba Lagi", dan Offline banner.
* **Dependensi**: `FON-04`.
* **File/Area Terkait**:
  * `client/src/screens/discover/DiscoverSpec.md` [Usulan]
  * `client/src/screens/detail/DetailSpec.md` [Usulan]
* **Acceptance Criteria**:
  * [ ] Bebas dari hero banner raksasa (> 50% viewport) dan kartu bento grid acak.
  * [ ] Daftar bab direncanakan sebagai flat list datar berpemisah 1dp (bukan *card soup* dengan margin tebal per item).
  * [ ] Seluruh tombol aksi memenuhi target sentuh $48 \times 48\text{ dp}$.
* **Cara Verifikasi**:
  * Review dokumen spesifikasi terhadap checklist visual [anti-patterns-ui.md: Seksi 3.6, 3.7, 7.1](file:///d:/project/yomou/docs/anti-patterns-ui.md).
* **Referensi Acuan**: [anti-patterns-ui.md: Seksi 5.1 & 5.2](file:///d:/project/yomou/docs/anti-patterns-ui.md).

---

#### [DIS-02] Implementasi Layar Discover (Beranda Novel Populer & Pembaruan Terbaru)
* **Area**: Frontend
* **Status**: `TODO`
* **Tujuan**: Mengembangkan antarmuka layar Discover yang memuat feed Novel Populer dan Pembaruan Terbaru dari API backend.
* **Ruang Lingkup**:
  * Integrasi API `/api/novels/popular` dan `/api/novels/latest` menggunakan TanStack Query (`useQuery`).
  * Komponen `NovelCard`: menampilkan cover novel (rasio 2:3), judul novel (maks 2 baris terpotong elipsis), nomor bab rilis terbaru, dan waktu relatif.
  * Dukungan *pull-to-refresh* untuk memperbarui feed.
  * Paginasi feed pembaruan terbaru via infinite scroll / pagination footer.
* **Dependensi**: `FON-05`, `BE-06`, `DIS-01`.
* **File/Area Terkait**:
  * `client/src/pages/HomeScreen.tsx` [Usulan]
  * `client/src/components/novel/NovelCard.tsx` [Usulan]
  * `client/src/components/novel/PopularNovelCarousel.tsx` [Usulan]
  * `client/src/components/novel/LatestUpdatesList.tsx` [Usulan]
* **Acceptance Criteria**:
  * [ ] Layar memuat daftar novel populer dan rilis terbaru dengan tata letak stabil tanpa layout shift liar.
  * [ ] Menampilkan skeleton loading tenang saat memuat data awal.
  * [ ] Menekan kartu novel melakukan navigasi ke `NovelDetailScreen` membawa parameter `novelId`.
* **Cara Verifikasi**:
  * Jalankan aplikasi di emulator Android, periksa pemuatan feed, dan verifikasi transisi ke layar detail novel.
* **Referensi Acuan**: [PRD.md: Seksi 3.5](file:///d:/project/yomou/docs/PRD.md), [anti-patterns-ui.md: Seksi 5.1](file:///d:/project/yomou/docs/anti-patterns-ui.md).

---

#### [DIS-03] Implementasi Fitur Pencarian Novel
* **Area**: Frontend
* **Status**: `TODO`
* **Tujuan**: Membangun fungsionalitas pencarian novel secara interaktif dengan bilah input, *debouncing*, dan penanganan hasil pencarian.
* **Ruang Lingkup**:
  * Input pencarian dengan *debounce* 400 ms sebelum memicu request API.
  * Integrasi endpoint `/api/novels/search?q={query}`.
  * Tampilan hasil pencarian dalam bentuk daftar kartu novel datar.
  * Tampilan status kosong jika pencarian tidak menemukan hasil (ikon outline buku + teks penjelas).
* **Dependensi**: `DIS-02`.
* **File/Area Terkait**:
  * `client/src/components/search/SearchBar.tsx` [Usulan]
  * `client/src/pages/SearchScreen.tsx` [Usulan]
* **Acceptance Criteria**:
  * [ ] Mengetikkan kata kunci mencari novel dan menampilkan hasil yang relevan.
  * [ ] Menghapus input secara instan mereset hasil pencarian ke tampilan awal.
  * [ ] Tidak ada pencampuran emoji pada bilah pencarian (menggunakan ikon vektor search standar).
* **Cara Verifikasi**:
  * Ketikkan kata kunci "kimi" dan verifikasi hasil pencarian muncul dalam waktu < 800 ms (kondisi cache hit).
* **Referensi Acuan**: [PRD.md: Seksi 3.1 & 8.3](file:///d:/project/yomou/docs/PRD.md).

---

#### [DIS-04] Implementasi Layar Detail Novel & Drawer Daftar Bab
* **Area**: Frontend
* **Status**: `TODO`
* **Tujuan**: Mengembangkan layar Detail Novel untuk melihat metadata lengkap, sinopsis, status bookmark, dan seluruh daftar bab.
* **Ruang Lingkup**:
  * Integrasi API `/api/novels/:novelId`.
  * Render header: Cover novel (kiri), judul, penulis, status ("Ongoing"/"Completed"), chip genre monokromatik.
  * Render sinopsis teks yang dapat diperluas (*expandable synopsis*) dengan perataan rata kiri.
  * Render tombol tindakan utama: "Mulai Baca", "Bookmark", "Unduh".
  * Render daftar bab dalam bentuk flat list berpemisah 1dp tipis, lengkap dengan tombol toggle urutan (Ascending / Descending).
* **Dependensi**: `DIS-02`, `FON-03`.
* **File/Area Terkait**:
  * `client/src/pages/NovelDetailScreen.tsx` [Usulan]
  * `client/src/components/novel/ChapterListDrawer.tsx` [Usulan]
  * `client/src/components/novel/NovelMetadataHeader.tsx` [Usulan]
* **Acceptance Criteria**:
  * [ ] Tombol toggle urutan membalik daftar bab dari Bab 1 $\rightarrow$ Terakhir menjadi Terakhir $\rightarrow$ Bab 1 seketika.
  * [ ] Menekan salah satu bab membuka `ReaderScreen` membawa parameter `(novelId, chapterId)`.
  * [ ] Status bookmark novel tersimpan secara reaktif ke database SQLite lokal saat tombol bookmark ditekan.
* **Cara Verifikasi**:
  * Buka novel "kimi-wa-boku-no-koukai-ln", periksa daftar bab terurut lengkap, dan coba balikkan urutan bab.
* **Referensi Acuan**: [PRD.md: Seksi 3.1, 3.4, 8.3](file:///d:/project/yomou/docs/PRD.md), [anti-patterns-ui.md: Seksi 5.2](file:///d:/project/yomou/docs/anti-patterns-ui.md).

---

#### [DIS-05] Verifikasi Fungsionalitas Discovery & Detail Novel
* **Area**: Verifikasi
* **Status**: `TODO`
* **Tujuan**: Memverifikasi secara menyeluruh integrasi alur Discovery, Search, dan Detail Novel terhadap target performa dan kriteria visual.
* **Ruang Lingkup**:
  * Pengujian SLA-NAV-02: Membuka layar detail memuat metadata dan daftar bab dalam waktu **< 800 ms** (cache hit).
  * Pengujian checklist visual V-06 (bebas dari hero marketing), V-07 (bebas card soup), dan V-12 (sinopsis rata kiri).
  * Pengujian offline fallback: Membuka detail novel tanpa internet saat novel sudah pernah di-cache/bookmark.
* **Dependensi**: `DIS-02`, `DIS-03`, `DIS-04`.
* **File/Area Terkait**:
  * `client/e2e/discovery.spec.ts` [Usulan]
* **Acceptance Criteria**:
  * [ ] Alur dari beranda $\rightarrow$ pencarian $\rightarrow$ detail novel berjalan mulus tanpa error atau unhandled promise rejection.
  * [ ] Target SLA-NAV-02 terpenuhi pada koneksi normal.
* **Cara Verifikasi**:
  * Jalankan skenario uji interaktif di emulator Android dan catat waktu render menggunakan React DevTools / Perf profiler.
* **Referensi Acuan**: [PRD.md: Seksi 9.2 (SLA-NAV-02)](file:///d:/project/yomou/docs/PRD.md).

---

### Milestone 4: Reader Engine & Manajemen Tipografi

#### [RDR-01] UI/UX Spesifikasi Layar Reader & Kontrol Overlay
* **Area**: UI/UX
* **Status**: `TODO`
* **Tujuan**: Merancang spesifikasi interaksi pembaca novel: status membaca bersih 100%, gestur tap-to-toggle, overlay kontrol atas/bawah, dan modal pengaturan tipografi.
* **Ruang Lingkup**:
  * Membagi area sentuh layar pembaca: 20% kiri (bab sebelumnya), 20% kanan (bab selanjutnya), 60% tengah (toggle menu kontrol).
  * Desain Top Bar reader (tombol kembali, judul bab, tombol pengaturan).
  * Desain Bottom Bar reader (slider persentase baca, navigasi prev/next, tombol daftar bab).
  * Desain Bottom Sheet pengaturan reader: slider ukuran font (12–28sp), pemilih tema radio visual (Light, Dark, Sepia), selector font (Inter, Merriweather, OpenDyslexic), dan tinggi baris.
  * Aturan anti-pattern: Tidak ada kontrol mengambang permanen yang menutupi teks cerita saat aktif membaca.
* **Dependensi**: `FON-04`.
* **File/Area Terkait**:
  * `client/src/screens/reader/ReaderSpec.md` [Usulan]
* **Acceptance Criteria**:
  * [ ] Saat membaca aktif, layar 100% bersih dari bilah kontrol mengambang, jam, atau indikator status dekoratif.
  * [ ] Modal pengaturan dirancang sebagai bottom sheet solid (bukan floating card kapsul raksasa).
* **Cara Verifikasi**:
  * Periksa wireframe/spesifikasi terhadap checklist [anti-patterns-ui.md: Seksi 3.16 & 5.3](file:///d:/project/yomou/docs/anti-patterns-ui.md).
* **Referensi Acuan**: [PRD.md: Seksi 3.2](file:///d:/project/yomou/docs/PRD.md), [anti-patterns-ui.md: Seksi 3.16 & 5.3](file:///d:/project/yomou/docs/anti-patterns-ui.md).

---

#### [RDR-02] Implementasi Reader Block Renderer (Paragraph, Heading 1–6, Multi-Image, Separator)
* **Area**: Frontend
* **Status**: `TODO`
* **Tujuan**: Membangun komponen renderer blok cerita yang mengeksekusi struktur data `ContentBlock[]` secara performan di atas continuous vertical scroll.
* **Ruang Lingkup**:
  * Render `ParagraphBlock`: teks dengan inline formatting (`InlineSpan` bold, italic) rata kiri.
  * Render `HeadingBlock`: heading level 1 sampai 6 dengan skala tipografi proporsional terhadap ukuran font dasar.
  * Render `ImageBlock`: multi-gambar ilustrasi cerita yang me-resolve gambar lokal dari filesystem saat offline atau remote URL saat online.
  * Render `SeparatorBlock`: garis pemisah adegan cerita datar 1dp yang bersih.
  * Komponen sentinel footer di akhir bab untuk mendeteksi penyelesaian bacaan.
* **Dependensi**: `FON-02`, `FON-03`, `RDR-01`.
* **File/Area Terkait**:
  * `client/src/components/reader/ReaderBlockRenderer.tsx` [Usulan]
  * `client/src/components/reader/blocks/ParagraphView.tsx` [Usulan]
  * `client/src/components/reader/blocks/HeadingView.tsx` [Usulan]
  * `client/src/components/reader/blocks/ImageView.tsx` [Usulan]
  * `client/src/components/reader/blocks/SeparatorView.tsx` [Usulan]
* **Acceptance Criteria**:
  * [ ] Seluruh tag heading level 1–6 ter-render dengan skala ukuran yang benar tanpa teks bertumpuk.
  * [ ] Seluruh gambar ilustrasi bab tampil proporsional sesuai lebar layar dengan caption keterangan jika ada.
  * [ ] Bab dengan 0 blok menampilkan layar galat `CHAPTER_EMPTY_CONTENT`.
* **Cara Verifikasi**:
  * Muat bab yang memiliki teks dan minimal 1 gambar ilustrasi, verifikasi bahwa setiap blok ter-render sesuai jenisnya.
* **Referensi Acuan**: [PRD.md: Seksi 3.2, 7](file:///d:/project/yomou/docs/PRD.md), [anti-patterns-ui.md: Seksi 4.2 & 4.6](file:///d:/project/yomou/docs/anti-patterns-ui.md).

---

#### [RDR-03] Implementasi Navigasi Reader, Screen Keep-Awake & Gestur Tap
* **Area**: Frontend
* **Status**: `TODO`
* **Tujuan**: Mengembangkan interaksi navigasi pembaca novel, aktivasi keep-awake layar, dan pengendalian menu kontrol via gestur sentuh.
* **Ruang Lingkup**:
  * Integrasi pustaka `expo-keep-awake` agar layar ponsel tetap menyala selama berada di `ReaderScreen`.
  * Deteksi ketukan: tap area tengah memunculkan/menyembunyikan overlay bar atas dan bawah.
  * Navigasi tombol bab sebelumnya dan bab selanjutnya di footer konten serta pada bottom bar.
  * Modal drawer daftar bab untuk melompat langsung ke bab lain.
* **Dependensi**: `RDR-02`.
* **File/Area Terkait**:
  * `client/src/pages/ReaderScreen.tsx` [Usulan]
  * `client/src/components/reader/ReaderControlsOverlay.tsx` [Usulan]
* **Acceptance Criteria**:
  * [ ] Layar tidak mati/mengalami sleep timeout selama pengguna membaca teks novel.
  * [ ] Ketukan di area tengah memunculkan kontrol atas/bawah secara instan (< 100 ms) tanpa efek animasi pantul.
  * [ ] Berpindah bab me-reset scroll viewport ke bagian atas bab baru.
* **Cara Verifikasi**:
  * Buka reader di perangkat Android fisik, diamkan selama 2 menit, dan pastikan layar tidak meredup atau terkunci.
* **Referensi Acuan**: [PRD.md: Seksi 3.2](file:///d:/project/yomou/docs/PRD.md), [anti-patterns-ui.md: Seksi 3.15 & 3.16](file:///d:/project/yomou/docs/anti-patterns-ui.md).

---

#### [RDR-04] Implementasi Algoritma Block-Index Anchoring & Restorasi Posisi Baca
* **Area**: Frontend
* **Status**: `TODO`
* **Tujuan**: Menerapkan pelacakan posisi baca berbasis indeks blok aktif (`anchor_block_index`) agar viewport otomatis kembali ke blok yang sama saat tipografi atau orientasi layar berubah.
* **Ruang Lingkup**:
  * Mendeteksi blok teratas yang sedang aktif terlihat di viewport saat pengguna menggulir layar.
  * Menyimpan `current_block_index` ke state dan memperbarui `anchor_block_index` pada tabel `chapter_reading_progress`.
  * Mengembalikan posisi scroll secara instan ke elemen blok berindeks `anchor_block_index` setelah ukuran font, jenis font, atau tinggi baris diubah.
* **Dependensi**: `RDR-02`, `FON-03`.
* **File/Area Terkait**:
  * `client/src/hooks/useReaderAnchor.ts` [Usulan]
  * `client/src/pages/ReaderScreen.tsx` [Usulan]
* **Acceptance Criteria**:
  * [ ] Mengubah ukuran font dari 14sp ke 24sp mengembalikan viewport ke paragraf/blok aktif yang sama dalam waktu **< 200 ms** (Target SLA-TYPO-01) tanpa melompat ke awal atau akhir bab.
  * [ ] Memutar layar dari portrait ke landscape mempertahankan blok bacaan yang sedang dibaca.
* **Cara Verifikasi**:
  * Buka bab, gulir ke blok ke-40, ubah ukuran font ke maksimal, dan verifikasi bahwa blok ke-40 tetap berada di area pandang layar.
* **Referensi Acuan**: [PRD.md: Seksi 3.2 & 9.2 (SLA-TYPO-01)](file:///d:/project/yomou/docs/PRD.md).

---

#### [RDR-05] Implementasi Penyelarasan Progres 100% & Status Historis `is_completed`
* **Area**: Frontend
* **Status**: `TODO`
* **Tujuan**: Menghitung progres posisi baca dinamis (0–100%) dan mengelola status historis penyelesaian bab secara idempoten di SQLite.
* **Ruang Lingkup**:
  * Perhitungan visual posisi baca: $\min\left(99, \max\left(0, \operatorname{round}\left(\frac{\text{current\_block\_index} + 1}{\text{total\_blocks}} \times 100\right)\right)\right)\%$.
  * Ketika sentinel akhir bab masuk ke viewport: selaraskan indikator visual langsung menjadi **100%** dan update `chapter_reading_progress.is_completed = 1`.
  * Sifat idempoten/monotonik: jika pengguna menggulir kembali ke atas atau membuka ulang bab, kolom `is_completed` **tetap 1** dan tidak di-reset ke 0.
* **Dependensi**: `RDR-04`, `FON-03`.
* **File/Area Terkait**:
  * `client/src/hooks/useReadingProgress.ts` [Usulan]
* **Acceptance Criteria**:
  * [ ] Indikator visual tidak menampilkan 100% sebelum sentinel akhir bab benar-benar terlihat di viewport.
  * [ ] Saat sentinel akhir terlihat, database mencatat `is_completed = 1`.
  * [ ] Menggulir kembali ke blok pertama memperbarui posisi visual dan `anchor_block_index`, tetapi status `is_completed` di SQLite tetap bernilai 1.
* **Cara Verifikasi**:
  * Gulir bab hingga selesai, periksa database `SELECT is_completed FROM chapter_reading_progress`, gulir kembali ke atas, dan periksa kembali bahwa nilainya tetap 1.
* **Referensi Acuan**: [PRD.md: Seksi 3.4](file:///d:/project/yomou/docs/PRD.md).

---

#### [RDR-06] Implementasi Modal Pengaturan Tipografi & Persistensi SQLite
* **Area**: Frontend
* **Status**: `TODO`
* **Tujuan**: Membangun bottom sheet pengaturan pembaca (font size, font family, line height, tema) dan menyimpannya secara persisten ke tabel `reader_settings`.
* **Ruang Lingkup**:
  * Bottom sheet modal dengan kontrol terukur: tombol ukuran font (- / +), pilihan tema (Light, Dark, Sepia), pilihan font (Inter, Merriweather, OpenDyslexic), dan opsi tinggi baris (1.4 s.d. 2.2).
  * Hook `useReaderSettings` yang memuat pengaturan dari tabel `reader_settings` saat inisialisasi dan menulis perubahan secara reaktif.
  * Pengaturan otomatis diterapkan ke seluruh bab yang dibuka.
* **Dependensi**: `RDR-01`, `FON-03`, `FON-04`.
* **File/Area Terkait**:
  * `client/src/components/reader/ReaderSettingsModal.tsx` [Usulan]
  * `client/src/hooks/useReaderSettings.ts` [Usulan]
* **Acceptance Criteria**:
  * [ ] Perubahan pengaturan disimpan ke SQLite lokal (tanpa menggunakan `AsyncStorage`).
  * [ ] Menutup aplikasi secara paksa (*force kill*) dan membukanya kembali tetap mempertahankan preferensi font, tema, dan ukuran font yang terakhir dipilih.
* **Cara Verifikasi**:
  * Ubah tema ke Sepia dan font ke Merriweather 22sp, restart aplikasi, dan pastikan bab dibuka dengan pengaturan tersebut.
* **Referensi Acuan**: [PRD.md: Seksi 3.2 & 6](file:///d:/project/yomou/docs/PRD.md), [anti-patterns-ui.md: Seksi 4.2 & 5.6](file:///d:/project/yomou/docs/anti-patterns-ui.md).

---

### Milestone 5: Library, Riwayat, dan Progres Membaca

#### [LIB-01] UI/UX Spesifikasi Layar Library (Pustaka Saya)
* **Area**: UI/UX
* **Status**: `TODO`
* **Tujuan**: Menyusun spesifikasi antarmuka layar Library yang memuat daftar Bookmark dan Riwayat Bacaan beserta indikator progres novel.
* **Ruang Lingkup**:
  * Desain segmen tab sederhana: "Terakhir Dibaca" dan "Bookmark".
  * Desain item riwayat: Cover mini (tinggi 80dp), judul novel, nomor bab terakhir dibaca, tanggal baca relatif, dan progress bar tipis 4dp.
  * Desain teks progres novel: `"X dari Y bab selesai (Z%)"`.
  * Desain empty state: Ikon bookmark outline netral, pesan penjelas, dan tombol aksi "Jelajahi Novel" menuju tab Discover.
* **Dependensi**: `FON-04`.
* **File/Area Terkait**:
  * `client/src/screens/library/LibrarySpec.md` [Usulan]
* **Acceptance Criteria**:
  * [ ] Bebas dari efek kartu bertumpuk acak dan ikon bergoyang berulang (*looping animation*).
  * [ ] Target sentuh tombol hapus bookmark atau buka bab minimal $48 \times 48\text{ dp}$.
* **Cara Verifikasi**:
  * Review spesifikasi terhadap checklist [anti-patterns-ui.md: Seksi 3.10, 3.15, 5.4](file:///d:/project/yomou/docs/anti-patterns-ui.md).
* **Referensi Acuan**: [anti-patterns-ui.md: Seksi 5.4](file:///d:/project/yomou/docs/anti-patterns-ui.md).

---

#### [LIB-02] Implementasi Manajemen Bookmark Novel ke SQLite
* **Area**: Frontend
* **Status**: `TODO`
* **Tujuan**: Membangun fungsionalitas penambahan dan penghapusan bookmark novel favorit ke database SQLite lokal.
* **Ruang Lingkup**:
  * Query simpan bookmark: `UPDATE novels SET is_bookmarked = 1, updated_at = ? WHERE id = ?`.
  * Query hapus bookmark: `UPDATE novels SET is_bookmarked = 0 WHERE id = ?`.
  * Hook `useBookmarks` untuk memantau koleksi novel yang dibookmark secara reaktif.
  * Otomatis mengunduh berkas cover novel ke filesystem lokal saat novel dibookmark agar cover tetap tampil saat offline.
* **Dependensi**: `FON-03`, `LIB-01`.
* **File/Area Terkait**:
  * `client/src/services/storage/bookmarkService.ts` [Usulan]
  * `client/src/hooks/useBookmarks.ts` [Usulan]
  * `client/src/components/library/BookmarkList.tsx` [Usulan]
* **Acceptance Criteria**:
  * [ ] Menekan tombol bookmark pada detail novel langsung memperbarui daftar di Pustaka Saya.
  * [ ] Menghapus bookmark menghapus novel dari daftar bookmark tanpa menghapus riwayat membaca bab novel tersebut.
  * [ ] Cover novel yang dibookmark tersimpan di filesystem lokal.
* **Cara Verifikasi**:
  * Bookmark sebuah novel, matikan koneksi internet (Airplane Mode), buka tab Library, dan pastikan kartu novel beserta covernya tampil utuh.
* **Referensi Acuan**: [PRD.md: Seksi 3.4](file:///d:/project/yomou/docs/PRD.md).

---

#### [LIB-03] Implementasi Riwayat Membaca (*Continue Reading*) & Metrik Progres Novel
* **Area**: Frontend
* **Status**: `TODO`
* **Tujuan**: Mengembangkan seksi riwayat membaca yang menampilkan bab terakhir dibaca dan menghitung rasio penyelesaian novel secara granular.
* **Ruang Lingkup**:
  * Query bab terakhir dibaca: `SELECT * FROM chapter_reading_progress WHERE novel_id = ? ORDER BY updated_at DESC LIMIT 1`.
  * Query hitung progres novel: `SELECT COUNT(*) FROM chapter_reading_progress WHERE novel_id = ? AND is_completed = 1`.
  * Format penyajian progres: `"X dari Y bab selesai (Z%)"`.
  * Tombol aksi cepat "Lanjutkan Membaca" yang langsung membuka bab terakhir pada posisi `anchor_block_index` tersimpan.
* **Dependensi**: `RDR-05`, `FON-03`, `LIB-01`.
* **File/Area Terkait**:
  * `client/src/pages/LibraryScreen.tsx` [Usulan]
  * `client/src/components/library/HistorySection.tsx` [Usulan]
  * `client/src/services/storage/historyService.ts` [Usulan]
* **Acceptance Criteria**:
  * [ ] Novel yang sedang dibaca otomatis muncul di posisi teratas seksi "Terakhir Dibaca".
  * [ ] Angka persentase dan jumlah bab selesai dihitung murni dari bab unik berstatus `is_completed = 1`.
  * [ ] Menekan "Lanjutkan Membaca" membuka bab terakhir tanpa membuang posisi scroll terakhir pembaca.
* **Cara Verifikasi**:
  * Selesaikan 2 bab dari novel yang memiliki 10 bab, buka Library, dan pastikan teks menampilkan "2 dari 10 bab selesai (20%)".
* **Referensi Acuan**: [PRD.md: Seksi 3.4](file:///d:/project/yomou/docs/PRD.md).

---

#### [LIB-04] Implementasi & Pengujian Cold-Start Offline Layar Pustaka
* **Area**: Frontend & Verifikasi
* **Status**: `TODO`
* **Tujuan**: Memastikan aplikasi dapat dibuka dari kondisi tertutup penuh (*killed*) saat perangkat offline dan langsung menampilkan Pustaka Saya tanpa kendala.
* **Ruang Lingkup**:
  * Logika inisialisasi aplikasi pada `App.tsx`: jika perangkat dalam status offline saat peluncuran awal, arahkan rute default langsung ke tab Library.
  * Menjamin tidak ada panggilan network blocking ke backend proxy saat offline yang menyebabkan layar putih (*blank screen*).
  * Memenuhi target SLA-COLD-01 (< 500 ms).
* **Dependensi**: `LIB-02`, `LIB-03`.
* **File/Area Terkait**:
  * `client/App.tsx` [Usulan]
  * `client/src/navigation/RootNavigator.tsx` [Usulan]
* **Acceptance Criteria**:
  * [ ] Saat Airplane Mode aktif, aplikasi dibuka dari status *force-killed* berhasil menampilkan daftar Pustaka Saya dalam waktu **< 500 ms** tanpa dialog error yang memblokir.
  * [ ] Bab yang telah dibookmark/diunduh dapat dibuka langsung dari daftar Pustaka saat offline.
* **Cara Verifikasi**:
  * Aktifkan Airplane Mode, kill aplikasi dari menu recent apps Android, buka kembali aplikasi, dan ukur waktu hingga konten Pustaka tampil interaktif.
* **Referensi Acuan**: [PRD.md: Seksi 3.4 & 9.2 (SLA-COLD-01)](file:///d:/project/yomou/docs/PRD.md).

---

### Milestone 6: Download Manager & Offline Engine

#### [DL-01] UI/UX Spesifikasi Kontrol Unduhan & Dialog Memori Penuh
* **Area**: UI/UX
* **Status**: `TODO`
* **Tujuan**: Menyusun spesifikasi visual untuk kontrol unduhan batch, indikator status bab, layar antrean Download Manager, dan dialog peringatan kuota disk penuh.
* **Ruang Lingkup**:
  * Tombol "Unduh 10 Bab Berikutnya" dan checkbox multi-select pada daftar bab.
  * Indikator status bab: `NOT_DOWNLOADED` (ikon download outline), `DOWNLOADING` (circular spinner diskrit), `DOWNLOADED` (ikon centang hijau terkalibrasi).
  * Layar Download Manager: daftar antrean, progress teks & ilustrasi, tombol Jeda (*Pause*), Lanjutkan (*Resume*), dan Batalkan (*Cancel*).
  * Desain modal peringatan "Penyimpanan Penuh" yang ramah pengguna.
* **Dependensi**: `FON-04`.
* **File/Area Terkait**:
  * `client/src/screens/download/DownloadSpec.md` [Usulan]
* **Acceptance Criteria**:
  * [ ] Status tidak disampaikan hanya melalui warna saja (selalu berdampingan dengan ikon dan label teks pembantu).
  * [ ] Seluruh tombol aksi antrean memenuhi target sentuh $48 \times 48\text{ dp}$.
* **Cara Verifikasi**:
  * Periksa spesifikasi terhadap checklist [anti-patterns-ui.md: Seksi 4.8, 4.9, 5.5](file:///d:/project/yomou/docs/anti-patterns-ui.md).
* **Referensi Acuan**: [PRD.md: Seksi 3.3](file:///d:/project/yomou/docs/PRD.md), [anti-patterns-ui.md: Seksi 5.5](file:///d:/project/yomou/docs/anti-patterns-ui.md).

---

#### [DL-02] Implementasi Download Queue Worker & Jadwal Retry Terukur
* **Area**: Frontend
* **Status**: `TODO`
* **Tujuan**: Membangun worker pengunduhan di latar depan (*foreground*) yang mengeksekusi antrean bab secara berurutan dengan jadwal retry yang terstandar.
* **Ruang Lingkup**:
  * Mengelola status antrean pada tabel `download_queue`: `QUEUED`, `DOWNLOADING`, `PAUSED`, `COMPLETED`, `FAILED`, `CANCELLED`.
  * Penulisan state ke SQLite secara langsung pada saat *enqueue* dan pada **setiap kali terjadi transisi status**.
  * Jadwal retry: 1 percobaan awal + 3 kali retry dengan jeda waktu **2 detik, 5 detik, dan 10 detik** sebelum menandai pekerjaan `FAILED`.
  * Isolasi kegagalan batch: kegagalan pada satu bab tidak membatalkan bab lain dalam antrean.
* **Dependensi**: `FON-03`, `BE-06`, `DL-01`.
* **File/Area Terkait**:
  * `client/src/services/download/downloadManager.ts` [Usulan]
  * `client/src/services/download/queueWorker.ts` [Usulan]
* **Acceptance Criteria**:
  * [ ] Setiap bab dalam antrean dieksekusi satu per satu (*sequential worker*) untuk menjaga responsivitas UI thread.
  * [ ] Bab yang mengalami timeout jaringan otomatis di-retry 3 kali sesuai jeda 2s, 5s, dan 10s sebelum berubah menjadi `FAILED`.
* **Cara Verifikasi**:
  * Simulasikan request bab gagal 2 kali lalu berhasil pada retry ke-3, amati log dan database untuk memverifikasi interval jeda waktu 2s dan 5s.
* **Referensi Acuan**: [PRD.md: Seksi 3.3](file:///d:/project/yomou/docs/PRD.md).

---

#### [DL-03] Implementasi Integritas Multi-Gambar pada Unduhan Bab
* **Area**: Frontend
* **Status**: `TODO`
* **Tujuan**: Menjamin bahwa seluruh gambar ilustrasi bab tersimpan lengkap di filesystem lokal sebelum menandai bab sebagai terunduh.
* **Ruang Lingkup**:
  * Ekstraksi seluruh gambar dari payload bab ke baris tabel `chapter_images` dengan status `PENDING`.
  * Mengunduh file biner gambar satu per satu dan menyimpannya ke `${documentDirectory}/chapters/{novelId}/{chapterId}/{imageId}.jpg`.
  * Update status gambar menjadi `DOWNLOADED` dan mencatat `local_file_path`.
  * **Aturan Kelengkapan**: Update `chapters.download_status = 'DOWNLOADED'` HANYA JIKA konten teks dan **seluruh gambar** pada bab tersebut berhasil diunduh dan diverifikasi ada di disk.
  * Jika ada 1 gambar gagal setelah seluruh retry: status antrean menjadi `FAILED` dan status bab tetap `NOT_DOWNLOADED`.
* **Dependensi**: `DL-02`.
* **File/Area Terkait**:
  * `client/src/services/download/imageDownloader.ts` [Usulan]
  * `client/src/services/download/downloadManager.ts` [Usulan]
* **Acceptance Criteria**:
  * [ ] Bab dengan 3 gambar ilustrasi hanya berstatus `DOWNLOADED` jika ketiga file gambar telah terverifikasi tersimpan di filesystem lokal.
  * [ ] Menghapus unduhan bab membersihkan file gambar lokal dan mengembalikan `download_status` menjadi `NOT_DOWNLOADED`.
* **Cara Verifikasi**:
  * Unduh bab yang memuat gambar ilustrasi, putuskan koneksi saat gambar ke-2 diunduh, dan verifikasi bahwa status bab tetap `NOT_DOWNLOADED`.
* **Referensi Acuan**: [PRD.md: Seksi 3.3 & 6](file:///d:/project/yomou/docs/PRD.md).

---

#### [DL-04] Implementasi Aksi Kontrol Antrean (Pause, Resume, Cancel) & Startup Recovery
* **Area**: Frontend
* **Status**: `TODO`
* **Tujuan**: Mengembangkan kontrol antrean unduhan aktif serta pemulihan otomatis saat aplikasi dibuka kembali dari kondisi mati.
* **Ruang Lingkup**:
  * Aksi *Pause*: Menjeda worker; pekerjaan aktif beralih ke `PAUSED` tanpa membuang file gambar yang sudah berhasil disimpan.
  * Aksi *Resume*: Melanjutkan pekerjaan dari status `PAUSED` atau `FAILED` tanpa mengunduh ulang gambar yang sudah berstatus `DOWNLOADED`.
  * Aksi *Cancel*: Menghentikan request aktif, menghapus pekerjaan dari antrean `download_queue`, dan menghapus file gambar parsial yang belum lengkap.
  * **Startup Recovery**: Saat inisialisasi aplikasi (`App.tsx`), query pekerjaan yang tertinggal dalam status `DOWNLOADING` dan ubah otomatis menjadi `PAUSED`.
* **Dependensi**: `DL-02`, `DL-03`.
* **File/Area Terkait**:
  * `client/src/services/download/downloadManager.ts` [Usulan]
  * `client/src/pages/DownloadManagerScreen.tsx` [Usulan]
* **Acceptance Criteria**:
  * [ ] Mematikan aplikasi paksa (*force kill*) saat mengunduh dan membukanya kembali: pekerjaan otomatis berstatus `PAUSED`.
  * [ ] Menekan tombol "Resume" melanjutkan pengunduhan gambar yang tersisa tanpa menduplikasi data.
  * [ ] Menekan tombol "Cancel" membersihkan berkas parsial dari filesystem.
* **Cara Verifikasi**:
  * Mulai unduhan batch, lakukan *force kill* di Android emulator, buka kembali aplikasi, dan pastikan antrean berada pada status `PAUSED`.
* **Referensi Acuan**: [PRD.md: Seksi 3.3](file:///d:/project/yomou/docs/PRD.md).

---

#### [DL-05] Implementasi Batch Download & Penanganan Kuota Disk Penuh
* **Area**: Frontend
* **Status**: `TODO`
* **Tujuan**: Membangun fungsionalitas unduh 10 bab berikutnya serta deteksi dan penanganan aman saat penyimpanan perangkat penuh.
* **Ruang Lingkup**:
  * Tombol "Unduh 10 Bab Berikutnya": mengambil 10 bab berurutan setelah bab aktif yang belum berstatus `DOWNLOADED`.
  * Checkbox multi-select manual untuk memilih beberapa bab sekaligus dari daftar bab.
  * Menangkap galat `ENOSPC` / storage quota error dari filesystem Android:
    * Otomatis menjeda antrean unduhan (`PAUSED`).
    * Menampilkan modal dialog peringatan "Penyimpanan Penuh" kepada pengguna.
* **Dependensi**: `DL-02`, `DIS-04`.
* **File/Area Terkait**:
  * `client/src/components/novel/ChapterListDrawer.tsx` [Usulan]
  * `client/src/components/common/StorageFullModal.tsx` [Usulan]
  * `client/src/services/download/downloadManager.ts` [Usulan]
* **Acceptance Criteria**:
  * [ ] Menekan "Unduh 10 Bab Berikutnya" memasukkan tepat 10 bab ke antrean tanpa memasukkan bab yang sudah pernah terunduh.
  * [ ] Saat penyimpanan perangkat penuh, aplikasi tidak crash dan menampilkan modal penjelasan kuota penuh.
* **Cara Verifikasi**:
  * Pilih 10 bab dari daftar bab novel, periksa antrean di `download_queue`, dan verifikasi proses berjalan berurutan.
* **Referensi Acuan**: [PRD.md: Seksi 3.3 & 9.2 (SLA-DOWN-01)](file:///d:/project/yomou/docs/PRD.md).

---

#### [DL-06] Implementasi Penghapusan Unduhan & Fallback Bab Offline
* **Area**: Frontend
* **Status**: `TODO`
* **Tujuan**: Mengembangkan fitur penghapusan unduhan untuk membebaskan ruang penyimpanan serta layar fallback saat pengguna membuka bab yang belum diunduh ketika offline.
* **Ruang Lingkup**:
  * Aksi "Hapus Unduhan Bab" dan "Hapus Semua Unduhan Novel Ini":
    * Menghapus file gambar lokal dari `${documentDirectory}/chapters/{novelId}/`.
    * Mengosongkan kolom `content_blocks` dan mengubah `download_status = 'NOT_DOWNLOADED'` pada tabel `chapters`.
    * **Penting**: Tetap mempertahankan bookmark pada tabel `novels` dan riwayat baca pada `chapter_reading_progress`.
  * Layar *Empty State Offline*: Jika pengguna membuka bab `NOT_DOWNLOADED` saat offline, tampilkan pesan informatif "Bab ini belum diunduh untuk dibaca offline" dan tombol pintas kembali ke bab terdekat yang sudah terunduh.
* **Dependensi**: `DL-03`, `RDR-02`.
* **File/Area Terkait**:
  * `client/src/services/download/downloadManager.ts` [Usulan]
  * `client/src/components/novel/DownloadControls.tsx` [Usulan]
  * `client/src/pages/ReaderScreen.tsx` [Usulan]
* **Acceptance Criteria**:
  * [ ] Menghapus unduhan bab membebaskan ruang disk dan tidak menghapus bookmark novel atau posisi bacaan terakhir.
  * [ ] Membuka bab yang belum diunduh saat Airplane Mode menampilkan layar fallback informatif tanpa crash atau layar putih.
* **Cara Verifikasi**:
  * Unduh bab, hapus unduhannya, periksa bahwa bookmark dan riwayat tetap ada di database, lalu buka bab tersebut saat offline untuk melihat layar fallback.
* **Referensi Acuan**: [PRD.md: Seksi 3.3 & 3.4](file:///d:/project/yomou/docs/PRD.md).

---

#### [DL-07] Verifikasi Performa Batch Download & Stabilitas UI Thread
* **Area**: Verifikasi
* **Status**: `TODO`
* **Tujuan**: Memverifikasi pemenuhan target SLA-DOWN-01 saat mengunduh 10 bab berturut-turut di latar depan.
* **Ruang Lingkup**:
  * Memantau kelancaran frame rate UI thread ponsel saat proses unduhan 10 bab berlangsung.
  * Memastikan tidak terjadi freeze antarmuka atau dialog ANR (*Application Not Responding*).
  * Target SLA-DOWN-01: Frame rate $\ge 58\text{ fps}$ (frame drop $< 5\%$).
* **Dependensi**: `DL-05`, `DL-03`.
* **File/Area Terkait**:
  * `client/e2e/download-perf.spec.ts` [Usulan]
* **Acceptance Criteria**:
  * [ ] Proses unduhan 10 bab (total ~50.000 kata dan ~15 gambar) selesai tanpa memblokir interaksi gulir atau navigasi pengguna.
  * [ ] Tidak ada dialog ANR pada perangkat uji Android.
* **Cara Verifikasi**:
  * Jalankan profil performa via Android Studio Profiler / Flipper saat unduhan 10 bab berjalan sambil melakukan scroll pada antarmuka.
* **Referensi Acuan**: [PRD.md: Seksi 9.2 (SLA-DOWN-01)](file:///d:/project/yomou/docs/PRD.md).

---

### Milestone 7: Verifikasi Menyeluruh, Audit Aksesibilitas, Pengukuran SLA, dan Build APK

#### [QA-01] Audit Kepatuhan Visual & Larangan Anti-Pattern (Checklist V-01 s.d. V-13)
* **Area**: Verifikasi
* **Status**: `TODO`
* **Tujuan**: Melakukan audit menyeluruh terhadap seluruh layar aplikasi untuk memastikan kepatuhan 100% terhadap dokumen [anti-patterns-ui.md](file:///d:/project/yomou/docs/anti-patterns-ui.md).
* **Ruang Lingkup**:
  * Mengambil screenshot dari seluruh layar: Discover, Detail Novel, Reader, Library, Download Manager, dan Settings pada ketiga tema (Light, Dark, Sepia).
  * Menilai setiap butir checklist V-01 sampai V-13:
    * Bebas dari gradien ungu/biru, blobs, glassmorphism, neumorphism, glow, dan border neon.
    * Bebas dari teks gradien, hero raksasa, bento grid, dan card soup.
    * Bebas dari pill-shape seragam, emoji navigasi, ikon sparkle/AI, dan ilustrasi kartun generik.
    * Latar belakang reader datar bersih dan paragraf cerita rata kiri.
* **Dependensi**: `DIS-04`, `RDR-03`, `LIB-03`, `DL-04`.
* **File/Area Terkait**:
  * `docs/audit/visual-audit-report.md` [Usulan]
* **Acceptance Criteria**:
  * [ ] Seluruh butir checklist V-01 s.d. V-13 berstatus **LULUS**.
  * [ ] Jika ada butir yang gagal, implementasi UI wajib diperbaiki sebelum rilis dinyatakan siap.
* **Cara Verifikasi**:
  * Tinjau tangkapan layar setiap komponen terhadap panduan larangan visual dan buat laporan audit resmi.
* **Referensi Acuan**: [anti-patterns-ui.md: Seksi 7.1](file:///d:/project/yomou/docs/anti-patterns-ui.md).

---

#### [QA-02] Audit Aksesibilitas & Perilaku Android (Checklist A-01 s.d. A-09)
* **Area**: Verifikasi
* **Status**: `TODO`
* **Tujuan**: Memvalidasi kepatuhan aksesibilitas WCAG 2.1 Level AA dan konvensi platform Android menggunakan alat bantu uji.
* **Ruang Lingkup**:
  * Pengukuran rasio kontras teks normal ($\ge 4.5:1$) dan teks besar/komponen interaktif ($\ge 3.0:1$) via Color Contrast Analyzer pada ketiga tema (A-01, A-02).
  * Pengukuran ukuran target sentuh ($\ge 48 \times 48\text{ dp}$) pada seluruh tombol dan item daftar (A-03).
  * Pengujian penskalaan huruf sistem Android hingga 200% tanpa teks terpotong (A-04).
  * Verifikasi atribut `accessibilityLabel` untuk screen reader TalkBack (A-05).
  * Verifikasi informasi multi-saluran (bukan warna semata) (A-06).
  * Verifikasi reader bebas dari kontrol mengambang permanen (A-07).
  * Verifikasi kepatuhan terhadap `prefers-reduced-motion` (A-08, A-09).
* **Dependensi**: `QA-01`.
* **File/Area Terkait**:
  * `docs/audit/accessibility-audit-report.md` [Usulan]
* **Acceptance Criteria**:
  * [ ] Seluruh butir checklist A-01 s.d. A-09 berstatus **LULUS**.
  * [ ] Aplikasi dapat dinavigasikan dengan lancar menggunakan pembaca layar Google TalkBack.
* **Cara Verifikasi**:
  * Jalankan Accessibility Scanner di perangkat Android fisik dan uji navigasi menggunakan TalkBack.
* **Referensi Acuan**: [anti-patterns-ui.md: Seksi 4.9 & 7.2](file:///d:/project/yomou/docs/anti-patterns-ui.md).

---

#### [QA-03] Pengukuran Matriks Target Performa & SLA PRD
* **Area**: Verifikasi
* **Status**: `TODO`
* **Tujuan**: Mengukur dan mencatat latensi performa aplikasi terhadap seluruh target ambang batas (SLA) yang ditetapkan pada PRD.
* **Ruang Lingkup**:
  * Menguji performa menggunakan baseline perangkat Android Mid-range (RAM 4GB, Octa-Core setara Snapdragon 680) pada bab acuan 3.000–6.000 kata.
  * Mengukur SLA-NAV-01 (Navigasi bab lokal): Target **< 300 ms**.
  * Mengukur SLA-NAV-02 (Navigasi bab online cache hit): Target **< 800 ms**.
  * Mengukur SLA-NAV-03 (Navigasi bab cold fetch): Target **< 3.0 detik** (timeout 8.0s).
  * Mengukur SLA-TYPO-01 (Restorasi tipografi): Target **< 200 ms**.
  * Mengukur SLA-COLD-01 (Cold start offline): Target **< 500 ms**.
  * Mengukur SLA-THEME-01 (Theme switching): Target **< 100 ms**.
* **Dependensi**: `RDR-04`, `LIB-04`, `FON-04`.
* **File/Area Terkait**:
  * `docs/audit/performance-sla-report.md` [Usulan]
* **Acceptance Criteria**:
  * [ ] Seluruh target SLA (SLA-NAV-01 s.d. SLA-THEME-01) terpenuhi dan terdokumentasi dengan data latensi nyata.
  * [ ] Transisi tema terjadi mulus dalam waktu < 100 ms tanpa kedipan layar (*flicker*).
* **Cara Verifikasi**:
  * Lakukan benchmark menggunakan React Native Performance Monitor / Flipper traces pada perangkat uji Android fisik.
* **Referensi Acuan**: [PRD.md: Seksi 9.1 & 9.2](file:///d:/project/yomou/docs/PRD.md).

---

#### [QA-04] Pengujian Alur Utuh Pengguna (End-to-End User Flow)
* **Area**: Verifikasi
* **Status**: `TODO`
* **Tujuan**: Memvalidasi skenario penggunaan riil dari sudut pandang persona pengguna "Rian" dari awal hingga akhir.
* **Ruang Lingkup**:
  * Skenario E2E:
    1. Pengguna membuka aplikasi $\rightarrow$ mencari novel "Kimi wa Boku no Koukai LN" di Discover.
    2. Membuka detail novel $\rightarrow$ bookmark novel $\rightarrow$ unduh 10 bab pertama.
    3. Mengaktifkan Airplane Mode (simulasi naik KRL / sinyal hilang).
    4. Membuka bab 1 dari Pustaka Saya $\rightarrow$ membaca hingga selesai (progres 100% dan `is_completed = 1`).
    5. Mengubah ukuran font di tengah bab 2 $\rightarrow$ posisi tetap ter-anchor pada blok yang sedang dibaca.
    6. Menutup aplikasi paksa (*kill*) $\rightarrow$ membuka kembali saat offline $\rightarrow$ melanjutkan bab 2 dari posisi terakhir.
* **Dependensi**: `DIS-04`, `RDR-05`, `LIB-03`, `DL-05`.
* **File/Area Terkait**:
  * `client/e2e/user-journey.spec.ts` [Usulan]
* **Acceptance Criteria**:
  * [ ] Seluruh skenario alur pengguna berjalan mulus tanpa error atau crash dari awal hingga akhir.
  * [ ] Tidak ada ketergantungan internet saat membaca bab yang telah diunduh.
* **Cara Verifikasi**:
  * Jalankan uji coba manual berpandu (*guided manual testing*) pada perangkat Android fisik dengan koneksi terputus.
* **Referensi Acuan**: [PRD.md: Seksi 2 & 3](file:///d:/project/yomou/docs/PRD.md).

---

#### [QA-05] Pembuatan Paket Android APK & Smoke Test
* **Area**: Verifikasi / Distribusi
* **Status**: `TODO`
* **Tujuan**: Membangun paket rilis Android APK mandiri dan melakukan smoke test instalasi pada perangkat Android minimum (Android 8.0+ / API 26).
* **Ruang Lingkup**:
  * Konfigurasi build Expo Android (`app.json` permissions, package name `com.yomou.novel`, icon, splash screen).
  * Kompilasi release APK menggunakan `eas build --platform android --profile preview` atau kompilasi lokal `npx expo run:android --variant release`.
  * Smoke test instalasi berkas APK pada perangkat Android fisik (Android 8.0 dan Android 13+).
* **Dependensi**: `QA-01`, `QA-02`, `QA-03`, `QA-04`.
* **File/Area Terkait**:
  * `client/app.json` [Usulan]
  * `client/eas.json` [Usulan]
* **Acceptance Criteria**:
  * [ ] Paket APK berhasil ter-generate tanpa error build native.
  * [ ] Berkas APK dapat diinstal pada perangkat target Android 8.0+ tanpa crash saat peluncuran (*launch crash*).
  * [ ] Ikon aplikasi dan splash screen tampil proporsional tanpa distorsi.
* **Cara Verifikasi**:
  * Instal APK via `adb install yomou-release.apk` pada perangkat uji dan jalankan smoke test aplikasi selama 5 menit.
* **Referensi Acuan**: [PRD.md: Seksi 1.3](file:///d:/project/yomou/docs/PRD.md).

---

## 6. Matriks Cakupan Kebutuhan (Traceability Matrix)

Matriks ini memastikan setiap kebutuhan fungsional dan kriteria penerimaan pada [PRD.md](file:///d:/project/yomou/docs/PRD.md) memiliki penanggung jawab implementasi dan verifikasi yang eksplisit:

| Requirement PRD | Komponen & Fitur | ID Tugas Implementasi | ID Tugas Verifikasi |
|---|---|---|---|
| **Seksi 1.3** | Target Rilis Android Only (APK) | `FON-01` | `QA-05` |
| **Seksi 3.1** | Scraper Meionovels (Popular, Latest, Search, Detail) | `BE-01`, `BE-02`, `BE-03` | `BE-06`, `DIS-05` |
| **Seksi 3.1** | Sanitasi Konten & Ekstraksi `ContentBlock[]` | `BE-04` | `BE-06` |
| **Seksi 3.1** | Penanganan Bab Kosong (`CHAPTER_EMPTY_CONTENT`) | `BE-04`, `BE-06` | `RDR-02` |
| **Seksi 3.2** | Mode Tri-Tema (Light, Dark, Sepia) | `FON-04`, `RDR-06` | `QA-01`, `QA-03` |
| **Seksi 3.2** | Tipografi Reader (Inter, Merriweather, OpenDyslexic) | `FON-04`, `RDR-02`, `RDR-06` | `RDR-04`, `QA-01` |
| **Seksi 3.2** | Heading Level 1 sampai 6 | `BE-04`, `RDR-02` | `RDR-02`, `QA-01` |
| **Seksi 3.2** | Continuous Vertical Scroll & Gestur Navigasi | `RDR-02`, `RDR-03` | `RDR-03`, `QA-04` |
| **Seksi 3.2** | Screen Keep-Awake (`expo-keep-awake`) | `RDR-03` | `RDR-03` |
| **Seksi 3.2** | Block-Index Anchoring & Typography Restoration | `RDR-04` | `QA-03 (SLA-TYPO-01)` |
| **Seksi 3.3** | SQLite Composite Schema (`chapters`, `chapter_images`) | `FON-03` | `DL-03` |
| **Seksi 3.3** | Multi-Image Integrity per Bab | `DL-03` | `DL-03`, `QA-04` |
| **Seksi 3.3** | Download Queue Worker & Jadwal Retry 1+3 (2s, 5s, 10s) | `DL-02` | `DL-02`, `DL-07` |
| **Seksi 3.3** | Aksi Kontrol (Pause, Resume, Cancel) & Startup Recovery | `DL-04` | `DL-04` |
| **Seksi 3.3** | Batch Download 10 Bab & Deteksi Storage Penuh | `DL-05` | `DL-07 (SLA-DOWN-01)` |
| **Seksi 3.3** | Hapus Unduhan tanpa Kehilangan Bookmark/Riwayat | `DL-06` | `DL-06` |
| **Seksi 3.3** | Layar Fallback Bab Offline Belum Terunduh | `DL-06` | `DL-06`, `QA-04` |
| **Seksi 3.4** | Penyelarasan Progres 100% (Sentinel) vs `is_completed` | `RDR-05` | `RDR-05`, `LIB-03` |
| **Seksi 3.4** | Bookmark Novel & Cache Cover ke Filesystem | `LIB-02` | `LIB-02`, `LIB-04` |
| **Seksi 3.4** | Riwayat Baca & Metrik `"X dari Y bab selesai (Z%)"` | `LIB-03` | `LIB-03` |
| **Seksi 3.4** | Persistensi Pengaturan Reader ke SQLite | `RDR-06` | `RDR-06` |
| **Seksi 3.4** | Cold-Start Offline ke Layar Pustaka Saya | `LIB-04` | `LIB-04`, `QA-03 (SLA-COLD-01)` |
| **Seksi 3.5** | Feed Pembaruan Terbaru & Novel Populer di Home | `DIS-02` | `DIS-05` |
| **Seksi 3.5** | Pencarian Novel Interaktif dengan Debounce | `DIS-03` | `DIS-05` |
| **Seksi 3.5** | Detail Novel & Daftar Bab (Toggle Asc/Desc) | `DIS-04` | `DIS-05` |
| **Seksi 4** | Non-Goals (Tanpa Ads, Tanpa Monetisasi, Tanpa Akun) | Ditegakkan di seluruh tugas | `QA-01`, `QA-04` |
| **Seksi 8.2** | In-Memory LRU Cache (Maks 500 item / 100 MB) & TTL | `BE-05` | `BE-05` |
| **Seksi 8.3** | Standar Envelope Respons API & Error Handling | `BE-06` | `BE-06` |
| **Seksi 9.2** | Target SLA Kuantitatif (SLA-NAV-01 s.d. SLA-THEME-01) | `FON-04`, `RDR-04`, `LIB-04` | `QA-03` |
| **Pedoman UI** | Larangan 16 Anti-Pattern AI-Slop | `FON-04`, `DIS-01`, `RDR-01`, `LIB-01`, `DL-01` | `QA-01` |
| **Pedoman UI** | Aksesibilitas Target Sentuh 48dp & Kontras WCAG 4.5:1 | `FON-04` | `QA-02` |

---

## 7. Laporan Konflik & Keputusan Terbuka

> [!NOTE]
> **Status Konflik Spesifikasi: TIDAK DITEMUKAN KONFLIK.**
> * Seluruh requirement pada [PRD.md](file:///d:/project/yomou/docs/PRD.md) dan aturan visual pada [anti-patterns-ui.md](file:///d:/project/yomou/docs/anti-patterns-ui.md) saling melengkapi secara konsisten tanpa ada kontradiksi logis atau teknis.
> * Semua keputusan arsitektur, pemilihan platform (Android Expo), pemilihan backend (Hono.js), struktur monorepo, skema composite key, dan aturan unduhan telah terkunci dan dapat langsung ditransformasikan menjadi tugas eksekusi.

---

## 8. Tugas Pertama yang Siap Dieksekusi

### Tugas: `[FON-01] Inisialisasi Struktur Monorepo & Konfigurasi Dasar`
* **Alasan Kesiapan**:
  1. `FON-01` adalah akar dari seluruh pohon dependensi (*dependency root*). Tidak ada tugas lain yang dapat dimulai sebelum struktur direktori workspace monorepo `server/` dan `client/` beserta konfigurasi dasar TypeScript dan package manager disiapkan.
  2. Workspace `d:\project\yomou` saat ini masih bersih (hanya berisi folder `docs/`). Membangun fondasi monorepo adalah langkah pertama yang terisolasi, aman, dan dapat langsung diverifikasi melalui keberhasilan kompilasi dan bundler build.
* **Langkah Eksekusi Setelah Dokumen Ini Disetujui**:
  * Menyiapkan `package.json` root monorepo.
  * Menginisialisasi `server/` dengan Node.js, Hono.js, dan TypeScript.
  * Menginisialisasi `client/` dengan Expo Managed Workflow dan TypeScript.
  * Memverifikasi keberhasilan instalasi dan verifikasi build awal.
