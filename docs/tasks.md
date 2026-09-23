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
* **Status**: `IN_PROGRESS`
* **Tujuan**: Membangun modul persistensi lokal menggunakan `expo-sqlite` dan `expo-file-system` dengan skema komposit lengkap.
* **Ruang Lingkup**:
  * Inisialisasi koneksi database SQLite lokal (`yomou.db`) dengan pencegahan concurrent init race dan error cleanup.
  * Eksekusi migration skema DDL: tabel `novels`, `chapters`, `chapter_images`, `chapter_reading_progress`, `download_queue`, dan `reader_settings`.
  * Implementasi pembuatan indeks: `idx_chapter_images_chapter`, `idx_reading_progress_novel`, dan `idx_download_queue_status`.
  * Utilitas helper penyimpanan gambar cover dan ilustrasi bab ke direktori dokumen lokal via `expo-file-system` dengan skema encoding path bebas-tabrakan (`paths.ts`).
  * Integrasi proses startup penyimpanan minimal pada `client/App.tsx`.
* **Dependensi**: `FON-01`, `FON-02`.
* **File/Area Terkait**:
  * `client/src/services/storage/sqlite.ts` [Selesai]
  * `client/src/services/storage/schema.ts` [Selesai]
  * `client/src/services/storage/paths.ts` [Selesai]
  * `client/src/services/storage/filesystem.ts` [Selesai]
  * `client/src/services/storage/types.ts` [Selesai]
  * `client/src/services/storage/index.ts` [Selesai]
  * `client/App.tsx` [Selesai]
  * `scripts/verify-sqlite-schema.mjs` [Selesai]
  * `scripts/verify-filesystem-paths.mjs` [Selesai]
* **Acceptance Criteria**:
  * [x] Tabel `chapters` memiliki Composite Primary Key `(novel_id, id)`.
  * [x] Tabel `chapter_images` memiliki Composite Primary Key `(novel_id, chapter_id, image_id)`.
  * [x] Tabel `chapter_reading_progress` memiliki Composite Primary Key `(novel_id, chapter_id)`.
  * [ ] Direktori penyimpanan gambar lokal (`${documentDirectory}/covers/` dan `${documentDirectory}/chapters/`) otomatis dibuat jika belum ada. *(Logika pembuatan direktori dan error handling terimplementasi dan lolos typecheck; verifikasi runtime di perangkat fisik/emulator Android tetap terbuka sampai perangkat/emulator tersedia)*.
* **Cara Verifikasi**:
  * Jalankan `npm run test:sqlite` untuk memvalidasi:
    1. Eksekusi DDL awal dan validasi composite PK via `PRAGMA table_info` pada in-memory SQLite Node.js.
    2. Idempotensi DDL pada database in-memory yang telah terisi dataset relasional (memastikan data tidak hilang atau korup).
    3. Pengujian terisolasi integritas `FOREIGN KEY ON DELETE CASCADE` pada in-memory SQLite Node.js.
    4. Uji deterministik resolusi path string dan encoding URI transport (memvalidasi keunikan tuple, preservasi karakter underscore vs karakter pengganti, preservasi Unicode, titik, dan pencegahan directory traversal setelah 1x URI decoding).
  * Jalankan `npm run check:contracts` untuk memastikan kontrak server–client tetap sinkron.
  * Jalankan `npm run typecheck:client` (`tsc --noEmit`) dan `npm run -w server build` untuk memverifikasi validitas tipe data statis.
  * *Status Pengujian Otomatis yang Sudah Lulus*:
    - `npm run test:sqlite`: DDL migrasi awal & composite PKs (`node:sqlite`).
    - `npm run test:sqlite`: Idempotensi DDL pada database terisi data tanpa kehilangan baris/relasi.
    - `npm run test:sqlite`: Foreign key `ON DELETE CASCADE` terisolasi.
    - `npm run test:sqlite`: Resolusi path bebas-tabrakan, validasi segmen/ekstensi, dan preservasi nama file setelah 1x URI decoding Android.
    - `npm run check:contracts`: Paritas kontrak tipe server–client 100% sinkron.
    - `npm run typecheck:client`: Pemeriksaan tipe statis TypeScript client lolos tanpa galat.
    - `npm run -w server build`: Kompilasi build backend TypeScript lolos tanpa galat.
  * *Batas Verifikasi Runtime & Kendala Lingkungan*:
    - **Kendala Lingkungan**: `adb` dan Android SDK tidak tersedia/terdaftar pada lokasi yang diperiksa (`PATH` sistem dan direktori default `AppData\Local\Android\Sdk`). Emulator tidak dipasang dan konfigurasi sistem tidak diubah tanpa arahan.
    - **Smoke Test Android Belum Dijalankan**: Pengujian runtime native di Android (pembuatan direktori fisik `${documentDirectory}/covers/` dan `${documentDirectory}/chapters/`, persistensi data SQLite saat cold restart, isolasi file dua tuple ID bebas-tabrakan, dan penghapusan independen) belum dijalankan.
    - **Status Tugas**: Kriteria direktori otomatis dibuat di perangkat Android belum dicentang, dan status `FON-03` dipertahankan **`IN_PROGRESS`** sampai pengujian runtime di perangkat/emulator Android selesai.
* **Referensi Acuan**: [PRD.md: Seksi 6](file:///d:/project/yomou/docs/PRD.md).

---

#### [FON-04] Setup Desain Sistem Tri-Tema & Komponen Primitif Sesuai Pedoman Anti-Pattern
* **Area**: UI/UX & Frontend
* **Status**: `IN_PROGRESS`
* **Tujuan**: Membangun fondasi tema dan komponen primitif yang mematuhi token semantik dan checklist visual [anti-patterns-ui.md](file:///d:/project/yomou/docs/anti-patterns-ui.md).
* **Ruang Lingkup**:
  * Definisi token warna untuk Light (`#FFFFFF`), Dark (`#121212`), dan Sepia (`#F4ECD8`) pada NativeWind/Tailwind config dengan kalibrasi kontras WCAG AA/AAA.
  * Implementasi `ThemeContext` dan hook `useTheme` untuk penggantian tema dinamis.
  * Membuat komponen primitif fungsional: `Button` (Filled, Outlined, Text), `Surface` (Card, Sheet, Raised, Overlay), `Typography` (Headline, Title, Body, Label, Caption), dan `Icon` (Material Symbols Rounded 24dp).
  * Menjamin target sentuh minimal 48x48 dp pada seluruh komponen tombol primitif tanpa degradasi dari style eksternal.
  * Integrasi penuh NativeWind v4 (`metro.config.js`, `babel.config.js`, `global.css`, `tailwind.config.js`) dan pembuktian alur bundling utility class.
  * Menyiapkan layar uji interaktif dan verifikasi tema pada `client/App.tsx`.
* **Dependensi**: `FON-01`.
* **File/Area Terkait**:
  * `client/tailwind.config.js` [Selesai]
  * `client/global.css` [Selesai]
  * `client/metro.config.js` [Selesai]
  * `client/babel.config.js` [Selesai]
  * `client/nativewind-env.d.ts` [Selesai]
  * `client/src/styles/theme.ts` [Selesai]
  * `client/src/context/ThemeContext.tsx` [Selesai]
  * `client/src/components/common/button-layout.ts` [Selesai]
  * `client/src/components/common/Button.tsx` [Selesai]
  * `client/src/components/common/Typography.tsx` [Selesai]
  * `client/src/components/common/Surface.tsx` [Selesai]
  * `client/src/components/common/Icon.tsx` [Selesai]
  * `client/src/components/common/index.ts` [Selesai]
  * `client/App.tsx` [Selesai]
  * `scripts/verify-theme-primitives.mjs` [Selesai]
* **Acceptance Criteria**:
  * [x] Tidak ada penggunaan gradien ungu/biru, efek glassmorphism, atau border neon pada seluruh token dan primitif.
  * [x] Seluruh tombol interaktif memiliki minHeight/minWidth 48dp atau padding sentuh 48dp (terproteksi dari penurunan oleh style eksternal).
  * [x] Komponen tombol tanpa label teks wajib mewajibkan prop `accessibilityLabel` (compile-time enforced via TypeScript discriminated union).
  * [x] Integrasi NativeWind terbukti aktif memproses utility class pada alur bundling.
* **Cara Verifikasi**:
  * Jalankan `npm run test:theme` (`node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types scripts/verify-theme-primitives.mjs`) untuk memvalidasi:
    - Impor langsung token aplikasi `THEME_COLORS` dari `client/src/styles/theme.ts`.
    - Evaluasi kontras seluruh pasangan warna aktual (teks utama AAA $\ge 7.0:1$, teks sekunder AA $\ge 4.5:1$, status error $\ge 4.5:1$, status success $\ge 4.5:1$, label tombol filled normal $\ge 4.5:1$, dan label tombol filled saat state pressed $\ge 4.5:1$).
    - Penegakan target sentuh tombol: style eksternal dengan ukuran di bawah 48dp tidak dapat menurunkan `minHeight`/`minWidth` di bawah 48dp.
    - Penggabungan `accessibilityState`: properti kustom (seperti `selected: true`) tetap dipertahankan sementara status internal `disabled` dan `busy` (saat loading) tetap otoritatif.
    - Ekstraksi dan emisi utility class NativeWind (`.items-center`) dari komponen ke dalam CSS.
    - Penegakan compile-time TypeScript bahwa tombol icon-only tanpa `accessibilityLabel` ditolak kompilasi.
  * Jalankan `npm run typecheck:client` (`tsc --noEmit`) untuk validasi tipe data client.
  * Jalankan `npx expo export --platform android` di `client/` untuk membuktikan kelancaran alur bundling Metro/Hermes.
  * Jalankan `npm run check:contracts`, `npm run test:sqlite`, dan `npm run -w server build` untuk memastikan integritas dependensi.
  * *Status Pengujian Otomatis yang Sudah Lulus*:
    - `npm run test:theme`: Lolos 100% (57 pasangan kontras diuji tanpa kegagalan: 24 pasangan lulus AAA $\ge 7.0:1$, 33 pasangan lulus AA $\ge 4.5:1$; koreksi minimal token Dark `accentPrimary` `#60A5FA` dan `accentPressed` `#78B3FB` menjadikan kontras terhadap `surfaceOverlay` 6.11:1 [AA], label tombol filled normal 7.37:1 [AAA], dan pressed 8.60:1 [AAA]; aset font offline Material Symbols Rounded 1.1MB dan lisensi Apache 2.0 terverifikasi; pemetaan codepoint Google 33 glyph valid; validator runtime `isMaterialSymbolName` terverifikasi; compile-time TypeScript verifikasi nama glyph valid diterima dan nama tidak tersedia ditolak baik pada `<Icon />` maupun `<Button />`; proteksi target sentuh tombol $\ge 48\times 48\text{dp}$; merger accessibilityState; ekstraksi utility class NativeWind).
    - `npm run typecheck:client`: Lolos tanpa galat (`tsc --noEmit`).
    - `npx expo export --platform android`: Lolos bundling Android (1020 modul, asset `MaterialSymbolsRounded_400Regular.ttf` 1.1MB ter-bundle, bytecode Hermes `index-*.hbc` 2.8MB).
    - `npm run check:contracts`: Lolos tanpa galat (paritas kontrak 100%).
    - `npm run test:sqlite`: Lolos tanpa galat (DDL, idempotensi, cascade, filesystem paths).
    - `npm run -w server build`: Lolos tanpa galat.
  * *Batas Verifikasi Visual, TalkBack & Runtime Android*:
    - **Pemeriksaan Visual / Render Ikon Nyata & TalkBack Screen Reader Android Belum Diuji di Perangkat**: Seluruh kalkulasi kontras (termasuk `accentPrimary` vs `surfaceOverlay`), logika aksesibilitas, aset offline, dan penolakan compile-time telah diverifikasi otomatis. Namun, render visual glyph ikon yang sesungguhnya di layar canvas Android dan navigasi audio TalkBack belum diuji di emulator atau perangkat fisik Android nyata karena ketiadaan lingkungan Android SDK/adb lokal.
    - **Status Tugas**: Sesuai prinsip bahwa verifikasi statis/bundling tidak menggantikan pengujian runtime visual dan audio nyata di Android, status `FON-04` dipertahankan **`IN_PROGRESS`** hingga inspeksi visual langsung dan pengujian TalkBack di perangkat/emulator selesai.
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
* **Status**: `DONE`
* **Tujuan**: Membangun antarmuka provider `INovelProvider` dan HTTP client berbasis `axios` dengan User-Agent realistis, pemisahan timeout per-attempt vs deadline total 8 detik (SLA-NAV-03), penanganan Retry-After, dan retry schedule tanpa jitter.
* **Ruang Lingkup**:
  * Membuat interface TypeScript `INovelProvider`.
  * Implementasi wrapper HTTP client Axios dengan deadline total operasi (default 8000 ms per SLA-NAV-03 dan ketentuan navigasi reader) terpisah dari timeout per percobaan (default 8000 ms).
  * Mekanisme retry schedule: 1 kali percobaan awal + hingga 3 kali retry (jeda default 2s, 5s, 10s tanpa jitter) khusus untuk error jaringan / timeout / 5xx / 429.
  * Pembatalan aktif via root `AbortController` ketika total deadline tercapai, serta penghentian retry jika jeda melampaui sisa deadline.
  * Penanganan respons HTTP 429 yang mematuhi header `Retry-After` (format integer detik nonnegatif maupun RFC 7231 HTTP-date di masa depan); pembatalan terstruktur dengan kode `PROVIDER_BLOCKED` (503) jika `Retry-After` melebihi deadline, dan fallback ke jadwal standar jika nilai negatif (-1), pecahan (1.5), atau bukan HTTP-date.
* **Dependensi**: `FON-01`, `FON-02`.
* **File/Area Terkait**:
  * `server/src/interfaces/provider.interface.ts` [Selesai]
  * `server/src/interfaces/index.ts` [Selesai]
  * `server/src/services/httpClient.ts` [Selesai]
  * `server/src/errors/provider.error.ts` [Selesai]
  * `server/src/errors/index.ts` [Selesai]
  * `server/src/index.ts` [Selesai]
  * `scripts/verify-http-resilience.mjs` [Selesai]
  * `package.json` [Selesai]
* **Acceptance Criteria**:
  * [x] Request yang mengalami ECONNRESET atau timeout otomatis mencoba ulang hingga 3 kali sesuai jadwal jeda.
  * [x] Request yang melampaui batas hard timeout / deadline operasi mengembalikan error terstruktur `PROVIDER_TIMEOUT`.
  * [x] Deadline total operasi (8 detik per SLA-NAV-03 dan ketentuan navigasi reader) membatasi seluruh percobaan dan jeda retry; request aktif dibatalkan via AbortController dan retry tidak dimulai jika jeda melampaui deadline.
  * [x] Respons 429 mematuhi header `Retry-After` (detik nonnegatif atau HTTP-date masa depan) dan berhenti terstruktur jika melampaui sisa deadline.
  * [x] Format `Retry-After` yang tidak valid (negatif `-1`, pecahan `1.5`, string bukan HTTP-date) menghasilkan `null` dan terbukti memakai jadwal fallback (bukan retry langsung 0 ms).
  * [x] Jadwal default terkonfigurasi tepat `[2000, 5000, 10000]` ms tanpa jitter tambahan.
  * [x] Kesesuaian interface `INovelProvider` diverifikasi langsung via kompilator TypeScript (`implements INovelProvider`), termasuk pembuktian penolakan terhadap implementasi yang tidak sesuai tipe.
* **Cara Verifikasi**:
  * Jalankan `npm run test:http` (`npm run -w server build && node scripts/verify-http-resilience.mjs`) untuk memvalidasi:
    - Konfigurasi default: deadline total 8000ms (SLA-NAV-03), timeout per percobaan 8000ms, maxRetries 3, jadwal jeda tanpa jitter `[2000, 5000, 10000]` ms.
    - Fungsi `parseRetryAfter`: mem-parsing detik numerik nonnegatif (`120` -> 120000ms), RFC 7231 HTTP-date ke milidetik presisi, dan fallback `null` untuk header tidak valid (`-1`, `1.5`, `-1.5`, dsb).
    - Skenario retry 2x gagal (ECONNRESET lalu 500) pulih pada percobaan ke-3 dengan jeda terukur persis tanpa jitter.
    - Skenario deadline total vs per-attempt: pembatalan seketika saat delay retry melebihi sisa deadline (tanpa sleep sia-sia), serta pembatalan request aktif yang menggantung saat timer deadline total terpicu.
    - Skenario HTTP 429: mematuhi `Retry-After: 1` dan HTTP-date masa depan dengan verifikasi waktu kedatangan di server tidak sebelum waktu yang diminta, berhenti terstruktur saat `Retry-After` melampaui deadline, serta membuktikan header negatif (`-1`), pecahan (`1.5`), dan string invalid memakai jadwal fallback.
    - Skenario non-retriable: 404 (`PROVIDER_NOT_FOUND`) dan 403 (`PROVIDER_BLOCKED`) fail-fast seketika tanpa retry (1 server hit).
    - Header hygiene: `User-Agent` Chrome Windows realistis, `Sec-Ch-Ua`, `Sec-Fetch-Mode`, `Cache-Control: no-cache`.
    - Pemeriksaan TypeScript: `tsc --noEmit` memvalidasi `implements INovelProvider` lolos dengan 0 galat, dan implementasi yang salah tipe terbukti ditolak kompilator.
  * *Batas Verifikasi*: Pengujian ini menguji ketahanan koneksi HTTP, jadwal jeda retry, penanganan timeout, dan kontrak provider menggunakan mock server lokal. Pengambilan data HTML nyata dari domain Meionovels (`meionovels.com`) berada di luar lingkup tugas ini dan dialokasikan untuk `BE-02`, `BE-03`, dan `BE-04`.
* **Referensi Acuan**: [PRD.md: Seksi 3.1 & Seksi 9.2 (SLA-NAV-03)](file:///d:/project/yomou/docs/PRD.md).

---

#### [BE-02] Implementasi Meionovel Scraper: Feed Pembaruan Terbaru & Novel Populer
* **Area**: Backend
* **Status**: `DONE`
* **Tujuan**: Mengekstrak data daftar novel dari seksi *Pembaruan Terbaru* (paginated) dan *Novel Populer* (`?m_orderby=views`) pada situs `meionovels.com`.
* **Ruang Lingkup**:
  * Membuat class `MeionovelProvider implements INovelProvider`.
  * Metode `getLatest(page: number)`: scrape artikel `.page-item-detail` dari URL `https://meionovels.com/page/{page}/` (untuk page $\le 1$ menggunakan `https://meionovels.com/`). Ketat pada feed utama dan **tidak pernah memakai fallback sidebar populer**.
  * Metode `getTrending()`: scrape feed `https://meionovels.com/novel/?m_orderby=views` (dengan fallback widget sidebar `.popular-item-wrap`).
  * Normalisasi cover aman: `normalizeImageUrl(rawUrl, baseUrl)` menggunakan `new URL(rawUrl, baseUrl)` dan hanya menerima protokol `http:` atau `https:`. Menolak skema berbahaya (`javascript:`, `data:`, `file:`) dan URL tidak valid secara eksplisit dengan mengembalikan `null`. Item dengan cover tidak valid/berbahaya ditolak dari hasil parsing.
  * Penanganan batas ketahanan: deteksi bot challenge Cloudflare (`PROVIDER_BLOCKED` 503), perbedaan hasil kosong sah pada area feed utama (`Nothing Found` / `no-results` -> `[]`), dan galat perubahan tata letak / item rusak (`SCRAPER_PARSE_ERROR` 500 jika kontainer ditemukan tapi tidak ada item valid yang berhasil diekstrak).
  * Penegakan batas implementasi: `search()`, `getNovelDetails()`, dan `getChapterContent()` melempar galat 501 `NOT_IMPLEMENTED` secara eksplisit (tidak mengembalikan data kosong palsu).
* **Dependensi**: `BE-01`.
* **File/Area Terkait**:
  * `server/src/providers/meionovel.provider.ts` [Selesai]
  * `server/src/providers/index.ts` [Selesai]
  * `server/src/utils/parser.ts` [Selesai]
  * `server/src/index.ts` [Selesai]
  * `server/test/fixtures/` [Selesai - termasuk 4 edge-case fixtures]
  * `scripts/verify-meionovel-scraper.mjs` [Selesai]
  * `package.json` [Selesai - script `test:provider-feeds` dan `test:provider-feeds:live`]
  * `server/package.json` [Selesai - script `test:provider-feeds` dan `test:provider-feeds:live`]
* **Acceptance Criteria**:
  * [x] `getLatest(1)` mengembalikan array objek `NovelSummary` lengkap dengan judul, cover URL absolut HTTP(S), dan `latestChapter`.
  * [x] `getTrending()` mengembalikan daftar novel populer terverifikasi (seperti *Battle Through the Heavens*, *Swallowed Star*, *Mesin Nano*).
  * [x] Slug ID novel bersih dari domain dan awalan `/novel/` (contoh: `kimi-wa-boku-no-koukai-ln`, `btth`).
  * [x] Konteks feed terbaru dan populer terisolasi: sidebar populer hanya menjadi fallback `getTrending()` dan tidak pernah menggantikan feed `getLatest()`.
  * [x] Kontainer feed yang ditemukan namun seluruh itemnya rusak/gagal diekstrak melempar `SCRAPER_PARSE_ERROR` (500), bukan `[]`.
  * [x] Normalisasi cover menjamin URL absolut HTTP(S), mengubah URL relatif/protocol-relative, serta menolak skema terlarang (`javascript:`, `data:`, `file:`) dengan mengembalikan `null`.
  * [x] Pengujian diperkuat mencakup seluruh kasus tepi: feed terbaru kosong + sidebar populer (tetap `[]`), feed terbaru rusak + sidebar populer (`SCRAPER_PARSE_ERROR`), kontainer ada dengan link rusak (`SCRAPER_PARSE_ERROR`), dan cover berbahaya (`SCRAPER_PARSE_ERROR`).
  * [x] Suite pengujian terpisah rapi antara offline fixtures (`test:provider-feeds`) dan live smoke test (`test:provider-feeds:live`). Mode live keluar dengan exit code non-zero jika terjadi kegagalan, dan memvalidasi bahwa halaman 2 benar-benar menghasilkan item feed utama yang berbeda dari halaman 1 serta bukan daftar trending.
  * [x] Metode yang belum diimplementasikan (`search`, `getNovelDetails`, `getChapterContent`) melempar galat 501 eksplisit tanpa memalsukan keberhasilan.
* **Cara Verifikasi**:
  * Jalankan pengujian offline: `npm run test:provider-feeds` (`npm run -w server build && node scripts/verify-meionovel-scraper.mjs`) untuk memvalidasi:
    - Utilitas ekstraksi: `extractNovelSlug`, `extractChapterSlug`, `extractChapterNumber` terverifikasi akurat.
    - Normalisasi cover: URL relatif (`images/cover.jpg`), protocol-relative (`//...`), absolut HTTP/HTTPS, serta penolakan skema terlarang (`javascript:alert(1)`, `data:...`, `file:...`) terverifikasi 100% aman.
    - Uji fixture sampel HTML riil offline:
      - 10 novel terbaru terekstrak lengkap dengan slug, judul, cover absolut, dan bab terbaru dari `home-feed.html`.
      - 12 novel populer terekstrak lengkap (termasuk verifikasi judul *Battle Through the Heavens* `btth`, *Swallowed Star* `swallowed-star`) dari `popular-feed.html`.
      - Halaman batas paginasi kosong (`nothing-found.html`) terbukti mengembalikan `[]` secara sah.
      - Halaman anti-bot challenge (`cloudflare-challenge.html`) terbukti melempar `PROVIDER_BLOCKED` (503).
      - Markup rusak (`corrupted-empty.html`) terbukti melempar `SCRAPER_PARSE_ERROR` (500).
    - Uji 4 kasus tepi review:
      - Kasus 4A: `latest-empty-with-popular-sidebar.html` -> `parseLatestFeed` mengembalikan `[]`, tidak bocor ke sidebar populer.
      - Kasus 4B: `latest-corrupted-with-popular-sidebar.html` -> melempar `SCRAPER_PARSE_ERROR` (500), tidak bocor ke sidebar populer.
      - Kasus 4C: `container-with-broken-links.html` -> kontainer ada tetapi link rusak melempar `SCRAPER_PARSE_ERROR` (500).
      - Kasus 4D: `container-with-dangerous-cover.html` -> cover berbahaya ditolak dan melempar `SCRAPER_PARSE_ERROR` (500).
    - Kontrak provider & batas tugas: `search()`, `getNovelDetails()`, dan `getChapterContent()` terbukti melempar galat 501.
  * Jalankan live smoke test: `npm run test:provider-feeds:live`:
    - `getLatest(1)` live: Lolos (10 novel riil termuat, status 200 OK).
    - `getTrending()` live: Lolos (12 novel populer riil termuat, status 200 OK).
    - `getLatest(2)` paginasi live: Lolos (10 novel riil halaman 2 termuat, diverifikasi memiliki ID berbeda dari halaman 1 dan bukan daftar trending).
    - Mode live terkonfigurasi keluar dengan exit code 1 jika ada pemeriksaan wajib yang gagal.
  * *Batas Verifikasi*: Pengujian ini memvalidasi feed daftar novel (pembaruan terbaru & populer). Ekstraksi detail novel lengkap dan seluruh bab dialokasikan untuk `BE-03`, dan sanitasi konten pembaca ke `ContentBlock[]` dialokasikan untuk `BE-04`.
* **Referensi Acuan**: [PRD.md: Seksi 3.5 & 10](file:///d:/project/yomou/docs/PRD.md).

---

#### [BE-03] Implementasi Meionovel Scraper: Pencarian Novel & Detail Novel Lengkap
* **Area**: Backend
* **Status**: `DONE`
* **Tujuan**: Mengekstrak hasil pencarian berdasarkan kata kunci serta detail metadata dan daftar seluruh bab dari novel target.
* **Ruang Lingkup**:
  * Metode `search(query: string, page: number)`: scrape hasil pencarian Meionovels (`?s={query}&post_type=wp-manga`) dengan parsing metadata lengkap (judul, slug ID, cover HTTP(S), status, author, rating).
  * Metode `getNovelDetails(novelId: string, options?: { totalTimeoutMs?: number })`: scrape halaman metadata `https://meionovels.com/novel/{novelId}/` dan endpoint AJAX daftar bab `https://meionovels.com/novel/{novelId}/ajax/chapters/` dengan pembagian sisa waktu dari total deadline 8 detik (SLA-NAV-03).
  * Parsing metadata novel: judul, penulis, sinopsis bersih, genre array, status, cover URL absolut, bab terbaru, dan total bab.
  * Parsing bab novel: urutan kronologis terbalik dari upstream descending (newest-first) ke urutan kronologis sejati (prolog / vol 1 ch 0 -> tamat); preservasi subpath (seperti `mtl/chapter-1648-tamat`); validasi novel ID dan URL bab (tolak cross-origin, URL milik novel lain, dan path traversal); deteksi elemen bab rusak (melempar `SCRAPER_PARSE_ERROR` 500, tidak dilewati diam-diam).
  * Penyatuan eksekusi HTTP GET & POST pada `ResilientHttpClient`: POST retry hanya aktif jika `allowRetry: true` secara eksplisit disetel (endpoint idempotent baca bab).
  * Kontrak identitas dan encoding URL: dokumentasi format `:chapterId` untuk endpoint API di masa depan (wajib di-URI-encode jika mengandung subpath).
  * Penegakan batas tugas: `getChapterContent()` melempar galat 501 `NOT_IMPLEMENTED` (dijadwalkan pada BE-04).
* **Dependensi**: `BE-02`.
* **File/Area Terkait**:
  * `server/src/providers/meionovel.provider.ts` [Selesai]
  * `server/src/utils/parser.ts` [Selesai]
  * `server/src/services/httpClient.ts` [Selesai]
  * `server/src/types/novel.ts` [Selesai]
  * `client/src/types/novel.ts` [Selesai]
  * `server/test/fixtures/` [Selesai - 7 fixture baru: search-kimi, search-empty, search-corrupted, detail-kimi, detail-kimi-chapters, detail-btth, detail-btth-chapters-sample, detail-404, detail-multi-volume-chapters, detail-corrupted-chapter]
  * `scripts/verify-meionovel-details.mjs` [Selesai]
  * `package.json` & `server/package.json` [Selesai - script `test:provider-details` dan `test:provider-details:live`]
* **Acceptance Criteria**:
  * [x] GET dan POST memakai implementasi request/retry bersama dalam `ResilientHttpClient`, tipe payload `unknown`, dan retry POST hanya diizinkan via `allowRetry: true` pada endpoint pembacaan bab AJAX yang idempoten.
  * [x] Deadline 8 detik berlaku kumulatif untuk keseluruhan `getNovelDetails()`: pengambilan metadata + AJAX daftar bab berbagi batas waktu, dan request kedua memakai sisa waktu.
  * [x] Format subjalur (seperti `mtl/chapter-1648-tamat`) dipreservasi konsisten pada seluruh pemanggil parser dan didokumentasikan pada tipe kontrak (`ChapterSummary.id`, `ChapterDetail.id`).
  * [x] Validasi novelId dan URL bab: input kosong/spasi, path traversal literal maupun percent-encoded (`..`, `%2e%2e`, `%2E%2E`) ditolak sebelum normalisasi URL; tidak ada fallback basename untuk menyelamatkan input tidak valid; URL lintas origin dan bab milik novel lain ditolak secara ketat.
  * [x] Urutan array `chapters` dibalik secara konsisten dari upstream newest-first menjadi kronologis sejati tanpa heuristik nomor; regresi `[Epilog, Chapter 2, Chapter 1]` terbukti menghasilkan `[Chapter 1, Chapter 2, Epilog]`, serta pengujian prolog dan nomor bab berulang multi-volume tetap terjaga.
  * [x] Deteksi kosong/tidak ditemukan: kontainer bab tanpa item melempar `SCRAPER_PARSE_ERROR` (500) kecuali terdapat penanda kosong sah yang terverifikasi (`.no-chapter` / teks); penanda `.no-results` dibatasi pada area konten utama dan mengabaikan widget sidebar/footer baik pada pencarian maupun detail novel.
  * [x] Snapshot fixture Kimi memvalidasi tepat 63 bab; tes live memvalidasi kelengkapan data live ($\ge 63$ bab), keunikan ID, metadata, serta tidak melewatkan bab rusak secara diam-diam.
  * [x] Pengujian mengimpor provider langsung dari modul provider (`server/dist/providers/index.js`), bukan dari server HTTP.
  * [x] Batas tugas teruji: `getChapterContent()` melempar 501 `NOT_IMPLEMENTED`.
* **Cara Verifikasi**:
  * Jalankan `npm run test:provider-details` (`npm run -w server build && node scripts/verify-meionovel-details.mjs`) untuk memvalidasi:
    - Subtest 1: Validasi slug novel, deteksi traversal literal/encoded, dan pencegahan penyelamatan URL via basename fallback (lolos).
    - Subtest 2: Parser pencarian pada fixture HTML (12 novel Kimi terurai, empty -> `[]`, corrupted -> 500, challenge -> 503, isolasi widget sidebar `.no-results`) (lolos).
    - Subtest 3: Parser metadata novel (Kimi sinopsis bersih, status BTTH "Completed", 404 -> `PROVIDER_NOT_FOUND`, isolasi widget sidebar `.no-results` tidak memicu 404 palsu) (lolos).
    - Subtest 4: Parser bab & urutan kronologis (63 bab Kimi vol 1 ch 0 -> vol 4 ch 14, preservasi subjalur `mtl/`, multi-volume prolog aman, bab korup melempar 500, cross-origin/mismatch ditolak, regresi Epilog dibalik konsisten, traversal literal/encoded `%2e%2e` ditolak, kontainer bab rusak melempar 500 dan verified empty marker mengembalikan `[]`) (lolos).
    - Subtest 5: Mock server gabungan deadline total 8 detik (5A metadata+bab sukses dalam budget, 5B bab gantung teraborsi tepat pada sisa deadline, 5C metadata gantung teraborsi pada deadline total tanpa memulai request kedua) (lolos).
    - Subtest 6: Batas implementasi BE-04 diverifikasi (501 NOT_IMPLEMENTED) (lolos).
  * Jalankan `npm run test:provider-details:live` (`npm run -w server build && node scripts/verify-meionovel-details.mjs --live`) untuk memvalidasi:
    - Live search("kimi"): Berhasil mengambil 12 novel live (status 200 OK).
    - Live getNovelDetails("kimi-wa-boku-no-koukai-ln"): Berhasil mengambil 63 bab live dalam urutan kronologis (Vol 1 Ch 0 s.d. Vol 4 Ch 14, ID unik 100%).
    - Live getNovelDetails("btth"): Berhasil mengambil 1648 bab live (Ch 1 s.d. Ch 1648 Tamat) dengan subpath `mtl/` terpreservasi konsisten.
  * *Batas Verifikasi*: Pengujian ini memvalidasi fitur pencarian dan pengambilan rincian novel beserta daftar seluruh bab. Ekstraksi konten bab pembaca dan konversi ke `ContentBlock[]` dialokasikan untuk `BE-04`.
* **Referensi Acuan**: [PRD.md: Seksi 3.1 & 8.3](file:///d:/project/yomou/docs/PRD.md).

---

#### [BE-04] Implementasi Sanitasi Konten & Konversi ke `ContentBlock[]`
* **Area**: Backend
* **Status**: `DONE`
* **Tujuan**: Mengekstrak isi bab novel, membersihkan elemen iklan/skrip/promosi, dan mengonversinya menjadi array blok terstruktur (`ContentBlock[]`) dengan preservasi struktur DOM bersarang, konteks formatting, pemisahan navigasi sah vs rusak, dan penegakan batas performa 8 detik.
* **Ruang Lingkup**:
  * Metode `getChapterContent(novelId: string, chapterId: string)` pada `MeionovelProvider`.
  * Sanitasi DOM pembersih iklan: script, iframe, form, button, iklan Google/AdSense, komentar Disqus, kontainer donasi/promo khusus (`.donation-box`, `.promo-box`), dan unwrap tautan cerita aman.
  * Sanitasi promosi berbasis pencocokan hostname presisi (`parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)`), tidak menghapus parent hanya berdasarkan panjang teks, dan mempertahankan teks cerita serta gambar pada elemen campuran maupun tautan dengan nama promo pada query string.
  * Traversal DOM berurutan (`walk(node, ctx)`) yang mempertahankan konteks formatting inline (`InlineSpan`: bold, italic, underline, strikethrough) tanpa meratakan wrapper berdasarkan ada/tidaknya gambar.
  * Preservasi batas paragraf, heading 1–6 (`HeadingBlock`), separator (`SeparatorBlock`), dan gambar (`ImageBlock`) pada wrapper bersarang (`div`, `p`, `blockquote`, `section`, `article`, `figure`, `strong`, `span`).
  * Konversi ilustrasi cerita menjadi `ImageBlock` (dengan ID unik `img_XX` per bab), dukungan atribut lazy loading (`data-src`, `data-lazy-src`, `data-original`), normalisasi URL relatif terhadap `chapterPageUrl`, dan pemetaan konsisten 1:1 ke array `images: ChapterImage[]`.
  * Parser navigasi chapter: membedakan ketiadaan/disabled navigasi sah (`null`) dari URL navigasi rusak/berbahaya. Validasi origin, namespace novel, traversal literal/encoded (`..`, `%2e%2e`), dan ID kanonik. URL navigasi tidak valid melempar `SCRAPER_PARSE_ERROR` (500).
  * Validasi bab kosong per PRD Seksi 3.1 & 7: melempar galat terstruktur `CHAPTER_EMPTY_CONTENT` (422) jika hasil sanitasi tidak memuat blok apa pun. Bab teks pendek (< 100 karakter) dan bab gambar saja diakui sah.
  * Penegakan total deadline 8 detik (SLA-NAV-03), penolakan redirect lintas-origin via `beforeRedirect`, serta pemetaan soft-404 (redirect ke detail novel) menjadi `PROVIDER_NOT_FOUND` (404).
* **Dependensi**: `BE-03`.
* **File/Area Terkait**:
  * `server/src/interfaces/provider.interface.ts` [Selesai]
  * `server/src/providers/meionovel.provider.ts` [Selesai]
  * `server/src/utils/contentSanitizer.ts` [Selesai]
  * `server/src/utils/parser.ts` [Selesai]
  * `server/src/services/httpClient.ts` [Selesai]
  * `server/test/fixtures/` [Selesai - 10 fixture bab: chapter-kimi-vol1-ch1, chapter-btth-mtl-ch1, chapter-dom-order, chapter-lazy-images, chapter-short-text, chapter-image-only, chapter-empty, chapter-corrupted, chapter-404-novel-page, chapter-challenge]
  * `scripts/verify-chapter-content.mjs` [Selesai]
  * `package.json` & `server/package.json` [Selesai - script `test:chapter-content` dan `test:chapter-content:live`]
* **Acceptance Criteria**:
  * [x] Traversal DOM berurutan mempertahankan urutan sumber, pemisahan blok paragraf, heading, separator, dan gambar bersarang tanpa perataan prematur wrapper.
  * [x] Regresi DOM teruji: (a) `<div><p>A</p><h2>B</h2><hr><p>C</p></div>` menjaga batas paragraf, heading, dan separator; (b) `<p><strong>A<span><img src="..."></span>B</strong></p>` menghasilkan P(A, bold) -> Img -> P(B, bold); (c) `<figure><img src="..."></figure>` menghasilkan `ImageBlock`.
  * [x] Sanitasi promosi mencocokkan hostname URL secara tepat (`parsed.hostname`), mempertahankan konten cerita pada parent campuran, meng-unwrap tautan cerita yang memuat nama domain promosi pada query string, dan hanya menghapus kontainer terbukti khusus donasi/promo.
  * [x] Validasi navigasi membedakan navigasi sah yang kosong/disabled (`null`) dari URL rusak; URL relatif diresolusi terhadap `chapterPageUrl`; URL lintas origin, foreign novel, traversal literal/encoded `%2e%2e` melempar `SCRAPER_PARSE_ERROR` (500).
  * [x] Bab kosong tanpa blok melempar `CHAPTER_EMPTY_CONTENT` (422); bab pendek (< 100 karakter) dan bab gambar saja diakui sah sesuai PRD.
  * [x] Seluruh blok teks bebas dari tag HTML mentah (`<script>`, `<div>`, `<a>`, inline CSS) dan formatting inline terpetakan akurat ke `spans`.
  * [x] Ilustrasi bab terpetakan konsisten 1:1 antara `ImageBlock.id` dan `ChapterImage.imageId`, mendukung lazy loading attributes (`data-src`, `data-lazy-src`), serta resolusi URL relatif ke absolut.
  * [x] Total deadline 8 detik (SLA-NAV-03) dipaksakan pada operasi bab; redirect lintas origin ditolak seketika pada hook `beforeRedirect`; redirect soft-404 ke halaman detail novel menghasilkan `PROVIDER_NOT_FOUND` (404).
* **Cara Verifikasi**:
  * Jalankan `npm run test:chapter-content` (`npm run -w server build && node scripts/verify-chapter-content.mjs`) untuk memvalidasi:
    - Subtest 1: Validasi kanonik `chapterId` dan pencegahan traversal literal maupun percent-encoded (lolos).
    - Subtest 2: Ekstraksi bab riil Kimi Vol 1 Ch 1 (90 blok, 2 gambar, prev/next chapter ID valid) (lolos).
    - Subtest 3: Ekstraksi bab subjalur BTTH MTL Ch 1 (63 blok, prev=null, next=mtl/chapter-2) (lolos).
    - Subtest 4: Preservasi urutan DOM, formatting inline bersarang, line break `<br>`, unwrapping tautan cerita, pembersihan iklan (lolos).
    - Subtest 4B: Regresi DOM spesifik: (a) `<div><p>A</p><h2>B</h2><hr><p>C</p></div>` mempertahankan batas paragraf, heading, dan separator; (b) `<p><strong>A<span><img ...></span>B</strong></p>` mempertahankan urutan dan formatting bold; (c) `<figure><img ...></figure>` terekstraksi bersih sebagai `ImageBlock` (lolos).
    - Subtest 4C: Regresi sanitasi promosi: mencocokkan hostname presisi, teks cerita sebelum/sesudah link donasi tetap utuh, tautan cerita dengan query string domain promo di-unwrap tanpa dihapus, kontainer `.donation-box` khusus terhapus (lolos).
    - Subtest 5: Presidensi lazy loading (`data-src` mengesampingkan placeholder data SVG) dan resolusi URL gambar relatif terhadap `chapterPageUrl` (lolos).
    - Subtest 6: Validasi konten PRD: bab pendek (< 100 karakter) dan bab gambar saja (0 paragraf teks) tervalidasi sah tanpa galat (lolos).
    - Subtest 7: Klasifikasi error dan batas: bab kosong melempar 422 `CHAPTER_EMPTY_CONTENT`, kontainer pembaca hilang melempar 500 `SCRAPER_PARSE_ERROR`, soft-404 redirect ke novel detail melempar 404 `PROVIDER_NOT_FOUND`, bot challenge melempar 503 `PROVIDER_BLOCKED` (lolos).
    - Subtest 7E: Regresi validasi navigasi: URL relatif teresolusi benar, navigasi disabled/# sah menghasilkan `null`, navigasi foreign novel melempar 500, navigasi cross-origin melempar 500, navigasi traversal literal/encoded melempar 500 (lolos).
    - Subtest 8: Mock server deadline 8 detik & keamanan redirect: bab menggantung teraborsi 504 `PROVIDER_TIMEOUT`, redirect lintas-origin ditolak seketika sebelum diikuti, redirect ke halaman novel memicu 404 `PROVIDER_NOT_FOUND`, redirect ke bab lain ditolak (lolos).
  * Jalankan `npm run test:chapter-content:live` (`npm run -w server build && node scripts/verify-chapter-content.mjs --live`) untuk memvalidasi upstream nyata:
    - Live Kimi chapter ("kimi-wa-boku-no-koukai-ln", "volume-1-chapter-1"): Berhasil mengekstrak 90 blok dan 2 gambar live.
    - Live BTTH MTL chapter ("btth", "mtl/chapter-1"): Berhasil mengekstrak 63 blok dan navigasi next `mtl/chapter-2`.
    - Live non-existent chapter: Memvalidasi soft-404 upstream melempar 404 `PROVIDER_NOT_FOUND`.
  * *Batas Verifikasi*: Pengujian ini memvalidasi ekstraksi konten bab, sanitasi, dan konversi ke `ContentBlock[]`. Lapisan in-memory caching LRU dialokasikan untuk `BE-05` dan routing REST API Hono dialokasikan untuk `BE-06`.
* **Referensi Acuan**: [PRD.md: Seksi 3.1, 7, 8.3, 9.2](file:///d:/project/yomou/docs/PRD.md).

---

#### [BE-05] Implementasi In-Memory LRU Cache Service & Policy TTL
* **Area**: Backend
* **Status**: `DONE`
* **Tujuan**: Mengimplementasikan lapisan caching in-memory berbasis LRU dengan batas kapasitas dan kebijakan masa berlaku (*TTL*) per kategori data.
* **Ruang Lingkup**:
  * Mengintegrasikan dependensi langsung `lru-cache@11.5.3` pada server. Batas **500 item** dan **100.000.000 byte** berlaku bersamaan; mencapai salah satunya memicu eviction LRU.
  * Ukuran terhitung adalah `Buffer.byteLength(key, 'utf8') + Buffer.byteLength(body, 'utf8')`. Ini batas payload/key terserialisasi, bukan total heap/RSS proses Node.js. Entri terlalu besar tetap dikirim tanpa disimpan atau mengusir entri lain.
  * Konfigurasi TTL kesegaran data:
    * Popular: 6 jam
    * Latest: 15 menit
    * Search: 30 menit
    * Detail Novel: 12 jam
    * Konten Bab: 7 hari
  * Middleware cache wrapper untuk handler JSON GET publik Hono.js. Hanya HTTP 200 dengan envelope `success: true`, `error: null`, dan field `data` yang disimpan; array kosong sah tetap dapat di-cache.
  * Cache key memakai JSON tuple provider name/baseUrl, operasi, query, halaman, novelId, chapterId. Validasi dijalankan sebelum lookup; query di-trim tanpa lowercasing dan ID subjalur bab dipertahankan.
  * Body JSON disimpan sebagai string. `meta.cachedAt` adalah epoch milliseconds ketika respons berhasil disimpan; hit tidak memperbarui timestamp atau memperpanjang TTL. Metadata source/pagination dipertahankan.
  * Error, non-JSON, respons private/no-store, Set-Cookie, dan respons yang sudah dikompresi tidak disimpan. Expired entry dianggap miss; kegagalan upstream tidak digantikan data stale.
* **Dependensi**: `BE-01`.
* **File/Area Terkait**:
  * `server/src/services/cache.service.ts`
  * `server/src/middlewares/cacheMiddleware.ts`
  * `scripts/verify-cache.mjs`
  * `server/package.json`, `package.json`, `package-lock.json`
* **Acceptance Criteria**:
  * [x] Request kedua untuk endpoint mock yang sama dalam rentang TTL mengembalikan data dari cache (latensi < 150 ms) dengan `meta.cachedAt`; handler upstream hanya terpanggil satu kali.
  * [x] Melebihi batas 500 item atau ukuran byte terhitung secara otomatis menghapus item paling jarang digunakan (*least recently used*).
* **Cara Verifikasi**:
  * `npm run test:cache` membangun server terlebih dahulu lalu menjalankan asersi Node.js dengan aplikasi Hono mock tanpa koneksi upstream.
  * **Bukti Verifikasi (2026-09-23)**:
    - `npm run test:cache`: Lulus. Insert 501 key menyisakan 500 entri; akses key lama menaikkan recency dan melindunginya dari eviction berikutnya.
    - Batas ukuran diuji dengan cache 24 byte, termasuk teks Unicode; ukuran tetap dalam batas, item oversized dilewati, dan batas persis diuji. Default produksi 100.000.000 byte juga diasersi; tes tidak mengalokasikan payload 100 MB.
    - TTL kelima operasi sesuai PRD; get/has tidak memperpanjang TTL. Expiry diuji dengan TTL pendek, lalu request memuat ulang upstream dan memperbarui cachedAt.
    - Cache hit maksimum **0,06 ms** dari 30 request Hono in-process pada Windows x64, Node.js v24.21.0. Pengukuran mencakup konsumsi body; bukan benchmark HTTP jaringan atau Android.
    - Key isolation, validasi sebelum hit, hasil kosong sah, preservasi metadata, body immutable, bypass POST/non-JSON/error/private, recovery kegagalan upstream, larangan stale fallback, dan oversized response lulus.
    - Penambahan cachedAt menghapus Content-Length/ETag lama; header middleware luar tetap tersedia pada miss/hit.
    - `npm run check:contracts`, `npm run test:http`, `npm run test:provider-feeds`, `npm run test:provider-details`, dan `npm run test:chapter-content`: Lulus. Test HTTP dijalankan ulang di luar sandbox setelah child process TypeScript diblokir EPERM; seluruh pemeriksaannya kemudian lulus.
  * **Integrasi BE-06**: Import `cacheMiddleware` langsung dari modulnya. Pasang setelah validasi parameter dan sebelum handler provider. Resolver `(c) => CacheRequest` harus menggunakan parameter yang sama dengan handler, misalnya `{ operation: 'chapter', novelId, chapterId }`. Decode parameter rute hanya sekali, bukan di cache. Kelima route berbagi singleton `responseCache`; pengujian boleh menyuntikkan instance terisolasi.
  * Header lintas-request seperti CORS/security diterapkan lewat middleware luar yang berjalan pada hit maupun miss; cache menyimpan body JSON saja. Kompresi, bila kelak digunakan, ditempatkan di luar middleware cache.
  * **Batas Verifikasi**: Endpoint produksi tetap milik BE-06. Tidak menjalankan live Meionovels atau Android; provider/HTTP client tidak diubah. Cache ephemeral dan per-process, tanpa persistent storage, Redis, background refresh, atau penggabungan miss bersamaan. FON-03/FON-04 tetap `IN_PROGRESS`.
* **Referensi Acuan**: [PRD.md: Seksi 8.2](file:///d:/project/yomou/docs/PRD.md).

---

#### [BE-06] Implementasi Router REST API Hono.js & Middleware Error Handling
* **Area**: Backend
* **Status**: `DONE`
* **Tujuan**: Mengekspos seluruh fungsionalitas provider melalui endpoint REST API standar dengan envelope seragam, integrasi cache LRU, sanitasi kebocoran informasi, dan penanganan error.
* **Ruang Lingkup**:
  * Pembuatan aplikasi Hono via factory `createApp(options?: { provider?, cache? })` di `server/src/app.ts`, terpisah dari proses `listen` di `server/src/index.ts` agar modul dapat diuji secara in-process tanpa membuka koneksi port TCP.
  * Mendaftarkan rute dengan urutan deterministik (rute statis sebelum parameter):
    * `GET /api/novels/popular`
    * `GET /api/novels/latest`
    * `GET /api/novels/search`
    * `GET /api/novels/:novelId`
    * `GET /api/novels/:novelId/chapters/:chapterId{.+$}` (wildcard regex parameter)
  * Endpoint `GET /health` dipertahankan merespons format legacy `{ status: 'ok', service: 'yomou-server' }` sebagai pengecualian envelope API yang terdokumentasi.
  * Integrasi `cacheMiddleware`: validasi parameter dieksekusi di dalam `resolveRequest` sebelum lookup cache; parameter yang diteruskan ke provider dan cache dipastikan 100% identik; emisi `meta.cachedAt` otomatis saat respons disimpan/diambil dari cache.
  * Penanganan subjalur `chapterId` (`mtl/chapter-1`): Hono's `c.req.param()` melakukan URI decoding tepat satu kali tanpa pemanggilan `decodeURIComponent` kedua; slash literal dan encoded (%2F) terbukti menghasilkan `chapterId` dan cache key yang identik. Perilaku normalisasi literal `..` oleh standard URL/Request dicatat dan diuji terpisah.
  * Validasi ketat parameter:
    * `page`: wajib bilangan bulat desimal aman $\ge 1$; menolak string kosong, pecahan, eksponen, hex, dan overflow (> MAX_SAFE_INTEGER).
    * Penolakan parameter `page` atau `q` berulang (multiple queries) untuk mencegah ambiguitas interpretasi.
    * `q`: string tidak kosong setelah di-trim.
    * Path traversal (`..%2Fchapter-1`, `mtl%2F..%2Fchapter-1`, double-encoded `%252e%252e`), double slash, leading/trailing slash ditolak dengan status HTTP 400 `BAD_REQUEST`.
  * Penyelarasan kode error kanonik & normalisasi status publik: mematuhi 8 kode resmi `server/src/types/api.ts` dan `client/src/types/api.ts`: 400 (`BAD_REQUEST`), 404 (`PROVIDER_NOT_FOUND`), 422 (`CHAPTER_EMPTY_CONTENT`), 503 (`PROVIDER_BLOCKED` / `NETWORK_UNREACHABLE`), 504 (`PROVIDER_TIMEOUT`), 500 (`SCRAPER_PARSE_ERROR` / `INTERNAL_SERVER_ERROR`). Kode `NETWORK_UNREACHABLE` secara eksplisit dinormalisasi menjadi status 503 pada lapisan API publik, termasuk ketika `ProviderError` dari HTTP client membawa status internal 502.
  * Keamanan pesan error & sanitasi semantik details: menggunakan pesan publik tetap (`PUBLIC_ERROR_MESSAGES`) berdasarkan `ErrorCode`, masking total terhadap generic exception tanpa membocorkan pesan sistem, string koneksi, atau URL upstream. Field `details` divalidasi ketat secara semantik: `novelId` dan `chapterId` kanonik, `page` safe integer positif, dan `direction` `'prev'|'next'`; menolak Windows path, URI berkredensial, dan objek bersarang. Peniadaan field `stack` terverifikasi.
  * Penyelarasan metadata paginasi: endpoint `latest` dan `search` hanya menyertakan `page: pageNum` dan `source: provider.name`. Field `totalPages` dan `hasNextPage` dibiarkan `undefined` secara jujur dan terdokumentasi sebagai keterbatasan yang belum tersedia karena provider upstream belum melakukan scraping pagination bar (tidak menandai fitur paginasi penuh selesai).
* **Dependensi**: `BE-02`, `BE-03`, `BE-04`, `BE-05`.
* **File/Area Terkait**:
  * `server/src/app.ts` [Selesai]
  * `server/src/index.ts` [Selesai]
  * `server/src/routes/novel.routes.ts` [Selesai]
  * `server/src/middlewares/errorHandler.ts` [Selesai]
  * `server/src/middlewares/cacheMiddleware.ts` [Selesai]
  * `server/src/services/cache.service.ts` [Selesai]
  * `scripts/verify-api-routes.mjs` [Selesai]
  * `package.json` [Selesai - script `test:api` dan `test:api:live`]
* **Acceptance Criteria**:
  * [x] Seluruh lima rute novel (`/popular`, `/latest`, `/search`, `/:novelId`, `/:novelId/chapters/:chapterId{.+$}`) dan `/health` terdaftar dan merespons format envelope resmi `ApiResponse<T>` (kecuali `/health` sebagai pengecualian khusus).
  * [x] Format envelope sukses selalu memuat `{ success: true, data: T, error: null, meta: ApiMeta }`.
  * [x] Format envelope error selalu memuat `{ success: false, data: null, error: ApiError, meta: ApiMeta }`.
  * [x] `meta.source` mencerminkan nama provider (`'meionovel'`), dan `meta.cachedAt` terisi epoch timestamp milidetik ketika respons berhasil disimpan atau dilayani dari cache.
  * [x] Nilai `chapterId` bersubjalur (`mtl/chapter-1`) dapat diakses baik menggunakan slash literal maupun slash terenkode URI (`%2F`), di-decode tepat satu kali, dan tervalidasi kanonik menghasilkan cache key yang identik.
  * [x] Paginasi hanya menampilkan `page: number`; keterbatasan ketiadaan `totalPages` atau `hasNextPage` dari upstream diakui secara faktual tanpa mengarang nilainya.
  * [x] Input tidak valid (halaman $\le 0$, desimal, eksponen, hex, overflow, query `q` kosong, parameter berulang, traversal path) ditolak dengan status HTTP 400 `BAD_REQUEST` sebelum proses scraping atau lookup cache.
  * [x] Pemetaan kode galat mematuhi kontrak kanonik: 404 (`PROVIDER_NOT_FOUND`), 422 (`CHAPTER_EMPTY_CONTENT`), 503 (`PROVIDER_BLOCKED` / `NETWORK_UNREACHABLE`), 504 (`PROVIDER_TIMEOUT`), 500 (`SCRAPER_PARSE_ERROR` / `INTERNAL_SERVER_ERROR`). Termasuk normalisasi status 502 dari HTTP client menjadi 503 pada `NETWORK_UNREACHABLE`.
  * [x] Rute yang tidak terdaftar menghasilkan status HTTP 404 dengan envelope terstruktur `PROVIDER_NOT_FOUND`.
  * [x] Error handler global tidak membocorkan stack trace, path berkas internal, URL upstream rahasia, atau pesan galat sistem internal; details disanitasi semantik menolak Windows path, URI berkredensial, dan objek bersarang.
  * [x] `createApp` terpisah dari proses listen server sehingga modul aplikasi dapat diimpor dalam tes in-process tanpa membuka koneksi port TCP.
  * [x] Cache hit mengembalikan respons dalam $< 150\text{ ms}$ tanpa memanggil ulang upstream provider.
  * [x] Seluruh pengujian offline (`npm run test:api`), pengujian smoke live (`npm run test:api:live`), pemeriksaan kontrak (`npm run check:contracts`), dan pengujian regresi BE-01 s.d. BE-05 lolos 100%.
* **Cara Verifikasi**:
  * Jalankan `npm run test:api` (`npm run -w server build && node scripts/verify-api-routes.mjs`) untuk memvalidasi:
    - Subtest 1: Endpoint `/health` (legacy envelope) dan 4 rute novel mengembalikan envelope sukses dengan `meta.source` dan `meta.cachedAt`.
    - Subtest 2: Paginasi faktual (page disediakan, `totalPages` dan `hasNextPage` tidak dikarang).
    - Subtest 3: Rute statis `/popular`, `/latest`, `/search` terdaftar sebelum `/:novelId`.
    - Subtest 4: Subjalur `chapterId` (`mtl/chapter-1`) pada slash literal dan encoded slash `%2F` menghasilkan parameter dan cache key yang sama persis.
    - Subtest 5: Validasi ketat: page integer desimal aman (menolak 0, negatif, pecahan, eksponen, hex, overflow), penolakan parameter `page`/`q` berulang, penolakan query kosong/spasi, penolakan traversal pada novelId dan chapterId (`..%2Fchapter-1`, `mtl%2F..%2Fchapter-1`, `%252e%252e`), penolakan consecutive/leading/trailing slash.
    - Subtest 6: Masking informasi rahasia: URL upstream, token rahasia, path file internal `D:\...`, nama file `.ts`, dan stack trace terbukti tidak bocor ke client; pesan publik tetap berdasarkan ErrorCode; details disanitasi semantik menolak path Windows (`D:\...`), URI berkredensial (`postgresql://...`), float, dan nested object.
    - Subtest 7: Normalisasi status publik: `NETWORK_UNREACHABLE` yang membawa status internal 502 dari HTTP client dinormalisasi menjadi HTTP 503 pada lapisan API.
    - Subtest 8: Exception tak terduga (generic Error) di-masking penuh menjadi 500 `INTERNAL_SERVER_ERROR` tanpa membocorkan pesan internal.
    - Subtest 9: Rute 404 tak terdaftar mengembalikan envelope `PROVIDER_NOT_FOUND`.
    - Subtest 10: Pemetaan seluruh kode galat kanonik (422, 404, 503, 504, 500) ke status HTTP yang sesuai.
    - Subtest 11: Cache hit terverifikasi $< 150\text{ ms}$ (aktual ~0.08 ms) tanpa pemanggilan provider; error upstream tidak di-cache; validasi input berjalan sebelum lookup cache.
  * Jalankan `npm run test:api:live` (`npm run -w server build && node scripts/verify-api-routes.mjs --live`) untuk memvalidasi upstream nyata Meionovels:
    - Live `/health` $\rightarrow$ 200 OK.
    - Live `GET /api/novels/popular` $\rightarrow$ 200 OK (12 novel populer terverifikasi).
    - Live `GET /api/novels/latest?page=1` $\rightarrow$ 200 OK (10 novel terbaru terverifikasi).
    - Live `GET /api/novels/search?q=kimi` $\rightarrow$ 200 OK (12 hasil pencarian terverifikasi).
    - Live `GET /api/novels/kimi-wa-boku-no-koukai-ln` $\rightarrow$ 200 OK (63 bab novel terverifikasi).
    - Live `GET /api/novels/kimi-wa-boku-no-koukai-ln/chapters/volume-1-chapter-1` $\rightarrow$ 200 OK (90 blok terverifikasi).
    - Live `GET /api/novels/btth/chapters/mtl/chapter-1` $\rightarrow$ 200 OK (subjalur MTL, 63 blok terverifikasi).
    - Live `GET /api/novels/non-existent-novel-12345` $\rightarrow$ 404 `PROVIDER_NOT_FOUND`.
  * *Batas Verifikasi In-Process*: Pengujian otomatis dieksekusi secara in-process menggunakan Hono `app.request(...)` tanpa binding port TCP jaringan. Pengujian ini memvalidasi router, middleware, envelope data, masking keamanan, dan integrasi provider/cache secara end-to-end pada level aplikasi. Integrasi UI Android dan koneksi HTTP jaringan melalui emulator/perangkat dialokasikan untuk Milestone 3 s.d. 7.
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
