# Spesifikasi UI/UX: Layar Detail Novel & Daftar Bab
**Dokumen**: `DetailSpec.md`<br>
**Tugas Terkait**: `[DIS-01]` (Persiapan Desain) $\rightarrow$ diimplementasikan pada `[DIS-04]`<br>
**Target Platform**: Android Mobile (Android 8.0+)<br>
**Acuan Desain**: [anti-patterns-ui.md](file:///d:/project/yomou/docs/anti-patterns-ui.md) (Seksi 3.6, 3.7, 4, 5.2, 7.1, 7.2), [PRD.md](file:///d:/project/yomou/docs/PRD.md) (Seksi 3.1, 3.4, 6, 8.3)

---

## 1. Arsitektur Layar & Tata Letak Detail Novel

### 1.1 Hierarki Komponen
```text
NovelDetailScreen (SafeAreaView)
├── Top App Bar (Tinggi 56dp)
│   ├── Tombol Kembali ('arrow_back', 48×48dp touch target)
│   └── Judul Layar Ringkas (Typography variant="title", 1 baris terpotong elipsis)
└── Konten Scrollable (FlatList terintegrasi dengan ListHeaderComponent)
    ├── ListHeaderComponent:
    │   ├── Seksi Header Metadata Berdampingan (Two-Column Reflowable Header)
    │   │   ├── Sisi Kiri: Cover Novel (Rasio 2:3, lebar 93dp, tinggi 140dp)
    │   │   └── Sisi Kanan: Metadata (Judul, Penulis [opsional], Status Chip, Genre Chips [opsional])
    │   ├── Seksi Sinopsis Novel yang Dapat Diperluas (Expandable, Text-Align: Left)
    │   │   ├── Paragraf Sinopsis (Body 14sp, rata kiri mutlak)
    │   │   └── Tombol Toggle Ekspansi ("Selengkapnya" / "Ciutkan", target 48dp)
    │   ├── Barisan Tiga Tombol Aksi Utama (Reflowable: Row -> Column pada layar sempit/font besar)
    │   │   ├── Tombol "Mulai Baca" / "Lanjut Baca" (Button variant="filled")
    │   │   ├── Tombol "Bookmark" / "Tersimpan" (Button variant="outlined", terkunci saat saving)
    │   │   └── Tombol "Unduh" (Button variant="outlined")
    │   └── Header Seksi Bab
    │       ├── Jumlah Total Bab ("Daftar Bab (N bab)")
    │       └── Tombol Toggle Urutan Bab (Ikon 'sort', Ascending / Descending)
    ├── Baris Daftar Bab (Chapter Row Items - FlatList Datar)
    │   └── ChapterRow: Judul bab, tanggal rilis [opsional], indikator terunduh, garis pemisah 1dp
    └── ListEmptyComponent (Kondisi jika daftar bab kosong / 0 bab)
```

### 1.2 Header Dua-Sisi Responsif & Penanganan Reflow (WCAG 2.1 SC 1.4.4)
1. **Dimensi Standar Sesuai Acuan**:
   - Berdasarkan acuan resmi [anti-patterns-ui.md: Seksi 5.2](file:///d:/project/yomou/docs/anti-patterns-ui.md), tinggi cover ditetapkan tepat **140dp**.
   - Dengan rasio standar 2:3, dimensi cover novel adalah **lebar 93dp dan tinggi 140dp** ($140 \times \frac{2}{3} \approx 93.33\text{dp}$).
   - Sudut lengkung cover menggunakan `RADIUS.medium` (8dp) dengan border pelindung 1dp `colors.borderSubtle`.
2. **Kolom Metadata Sisi Kanan**:
   - Judul Novel: `Typography variant="headline"` (20sp, semi-bold `colors.textPrimary`).
   - Penulis: `Typography variant="body"` (14sp, `colors.textSecondary`). Field opsional yang disembunyikan bersih jika bernilai `undefined` dari upstream (jangan mengarang "Penulis: Tidak Diketahui").
   - Status Rilis: Chip status netral fungsional ("Ongoing" / "Completed"), latar `colors.surfaceRaised`, border 1dp `colors.borderStrong`, radius `RADIUS.small` (4dp).
   - Genre: Deretan chip genre monokromatik (`flexWrap: 'wrap'`, gap 6dp, radius `RADIUS.small` (4dp)). Field opsional yang disembunyikan bersih jika kosong.
3. **Mekanisme Reflow Layar Sempit & Font Besar (Hingga 200%)**:
   - *Mengapa `flexWrap` saja tidak cukup*: Jika kolom metadata dipaksakan berdampingan dengan cover pada layar sempit (< 360dp) atau saat font scaling sistem dinaikkan hingga 200%, teks akan terdesak dan terpotong (*clipped*).
   - *Arsitektur Reflow Terukur*:
     - Pada layar normal ($\ge 360\text{dp}$ dan font normal): Tata letak menggunakan `flexDirection: 'row'`, lebar cover 93dp, kolom metadata `flex: 1`, `minWidth: 180dp`, gap 16dp (`SPACING.space4`).
     - Pada layar sempit (< 360dp) atau saat font scaling $\ge 150\%$: Tata letak header beralih secara terstruktur menjadi **satu kolom vertikal penuh** (`flexDirection: 'column'`):
       - Cover 93×140dp diletakkan di baris atas rata kiri.
       - Kolom metadata berada di baris bawah dengan lebar 100% (`width: '100%'`).
       - Teks judul tidak dibatasi baris kaku (`numberOfLines={undefined}`) dengan `lineHeight` proporsional sehingga seluruh judul terbaca utuh tanpa clipping atau tabrakan teks.

### 1.3 Sinopsis Novel yang Dapat Diperluas (Expandable Synopsis)
1. **Perataan Rata Kiri Mutlak (*Text-Align: Left*)**:
   - Berdasarkan aturan ketat [anti-patterns-ui.md: Seksi 5.2 & V-12](file:///d:/project/yomou/docs/anti-patterns-ui.md), seluruh paragraf sinopsis **wajib di-render rata kiri** (`textAlign: 'left'`). Dilarang menggunakan perataan tengah (*center*) atau justify.
2. **Field Opsional**:
   - Jika `synopsis` kosong atau `undefined` dari upstream, tampilkan teks penjelas tenang: *"Sinopsis belum tersedia untuk novel ini."* (`colors.textSecondary`).
3. **Perilaku Ekspansi**:
   - Kondisi Ciut (*Collapsed*): Maksimal **3 baris** teks (`numberOfLines={3}`, `ellipsizeMode="tail"`).
   - Kondisi Terbuka (*Expanded*): Seluruh teks ditampilkan secara utuh (`numberOfLines={undefined}`).
4. **Kontrol Toggle ("Selengkapnya" / "Ciutkan")**:
   - Tombol teks interaktif dengan warna aksen `colors.accentPrimary`.
   - Target sentuh minimal **$48 \times 48\text{ dp}$** (`minHeight: 48`, `justifyContent: 'center'`).
   - Aksesibilitas: `accessibilityRole="button"`, `accessibilityLabel="Tampilkan seluruh sinopsis novel"` saat ciut, dan `"Sembunyikan sinopsis"` saat terbuka.
   - Transisi langsung tanpa animasi pegas (*spring bounce*) yang melanggar kenyamanan vestibular (A-08).

### 1.4 Barisan Tiga Tombol Aksi Utama & Reflow Tombol
1. **Spesifikasi Tiga Tombol Aksi**:

| Tombol | Varian Komponen | Ikon & Label | Perilaku & State | Klasifikasi Aksi |
| :--- | :--- | :--- | :--- | :--- |
| **1. Mulai Baca / Lanjut Baca** | `Button variant="filled"` | Ikon `auto_stories` (24dp) + Label dinamis | • Jika belum pernah membaca: Label **"Mulai Baca"**, membuka **bab pertama dalam urutan kronologis sumber** (`chapters[0]`).<br>• Jika ada progres membaca di SQLite (`chapter_reading_progress`): Label **"Lanjut Baca"**, membuka bab aktif terakhir.<br>• Jika daftar bab kosong: **Dinonaktifkan (`disabled={true}`)**, label "Belum Ada Bab". | **Kondisional**: Lokal jika bab berstatus `DOWNLOADED` di SQLite; Jaringan (fetch konten bab via API) jika belum. |
| **2. Bookmark** | `Button variant="outlined"` | Ikon `bookmark_border` (belum) / `bookmark` (sudah) | • Status Belum Tersimpan: Ikon `bookmark_border`, label "Bookmark".<br>• Status Tersimpan: Ikon `bookmark`, warna `colors.accentPrimary`, label "Tersimpan".<br>• Jika daftar bab kosong: **Tetap aktif** untuk menyimpan novel ke Pustaka (selama storage tersedia).<br>• Jika storage lokal tidak tersedia: **Dinonaktifkan (`disabled={true}`)**, alasan "Penyimpanan lokal tidak tersedia".<br>• Penguncian aksi: Dinonaktifkan sementara saat penulisan SQLite berlangsung (`isSaving = true`).<br>• Rollback dua arah: Mengembalikan state asli jika penulisan gagal (gagal simpan $\rightarrow$ belum tersimpan; gagal hapus $\rightarrow$ tersimpan). | **100% Aksi Lokal** (SQLite `novels.is_bookmarked`). Tidak butuh internet dan tidak memicu loading spinner jaringan. |
| **3. Unduh** | `Button variant="outlined"` | Ikon `download` (24dp) + Label dinamis | • Status Default: Ikon `download`, label "Unduh".<br>• Status Mengunduh: Indikator antrean unduhan.<br>• Status Selesai: Ikon centang `check` (`colors.statusSuccess`), label "Terunduh".<br>• Jika daftar bab kosong: **Dinonaktifkan (`disabled={true}`)**, label "Tidak Ada Bab". | **Aksi Jaringan**: Mengirim antrean unduhan ke Download Manager di background. |

2. **Reflow Tiga Tombol pada Layar Sempit & Font Besar**:
   - Pada layar normal ($\ge 360\text{dp}$): Berdampingan secara horizontal (`flexDirection: 'row'`, masing-masing `flex: 1`, gap 8dp / `SPACING.space2`).
   - Pada layar sempit (< 360dp) atau saat font sistem $\ge 150\%$: Barisan tombol bertransisi menjadi **susunan vertikal bertumpuk** (`flexDirection: 'column'`, masing-masing tombol berlebar penuh `width: '100%'`, tinggi minimal 48dp, gap 8dp). Hal ini mencegah pemotongan teks label tombol dan menjaga target sentuh $\ge 48\times 48\text{dp}$.

---

## 2. Daftar Bab (Chapter List)

### 2.1 Header Seksi Bab & Toggle Urutan
- **Jumlah Total Bab**: Menampilkan jumlah bab riil yang diterima, misal: `Typography variant="title"` *"Daftar Bab (63 bab)"*.
- **Tombol Toggle Urutan (Sort Toggle)**:
  - Menggunakan ikon resmi `sort` dari `MATERIAL_SYMBOLS_GLYPH_MAP`.
  - Ukuran target sentuh minimal **$48 \times 48\text{ dp}$**.
  - Label teks dinamis: "Terlama" (Ascending: Bab 1 $\rightarrow$ Bab N) atau "Terbaru" (Descending: Bab N $\rightarrow$ Bab 1).
  - Aksesibilitas: `accessibilityRole="button"`, `accessibilityLabel="Urutan bab: [Terlama/Terbaru]. Ketuk untuk membalik urutan"`.
  - **Aturan Isolasi State Tampilan**: Membalik urutan tampilan di UI bersifat murni visual dan **TIDAK MENGUBAH**:
    1. Target bab "Mulai Baca" (tetap bab pertama kronologis sumber).
    2. Target bab "Lanjut Baca" (tetap bab aktif dari riwayat baca).
    3. Urutan array bab asli pada cache TanStack Query maupun tabel SQLite `chapters`.

### 2.2 Komponen Baris Bab (*Chapter Row Item*)
1. **Bentuk Baris Datar Bersih (*Anti-Card Soup*)**:
   - Menggunakan baris datar (*flat row*) yang dipisahkan oleh garis pemisah tipis solid 1dp `colors.borderSubtle` di bagian bawah tiap baris ([anti-patterns-ui.md: Seksi 3.7 & 5.2](file:///d:/project/yomou/docs/anti-patterns-ui.md)).
2. **Dimensi & Target Sentuh**:
   - Tinggi interaktif baris minimal **52dp** (melebihi target sentuh minimum $48 \times 48\text{ dp}$).
   - Padding horizontal: 16dp (`SPACING.space4`), padding vertikal: 12dp (`SPACING.space3`).
3. **Konten Informasi**:
   - Judul Bab: `Typography variant="body"`, warna `colors.textPrimary`, maksimal 1 baris (`numberOfLines={1}`, `ellipsizeMode="tail"`).
   - Tanggal Rilis: `Typography variant="caption"`, warna `colors.textSecondary`. Field opsional yang disembunyikan bersih jika tidak disediakan upstream.
   - Status Terunduh (Bukan Berbasis Warna Semata - A-06):
     - Jika bab tersimpan di SQLite (`download_status === 'DOWNLOADED'`), tampilkan ikon `check` (18dp) warna hijau `colors.statusSuccess` disertai teks kecil atau label aksesibel `"Terunduh"`.
   - Indikator Riwayat Baca:
     - Jika bab merupakan bab terakhir yang dibaca pengguna, tampilkan penanda teks diskrit *"Terakhir dibaca"* (`colors.accentPrimary`).
4. **Interaksi & Navigasi**:
   - Feedback sentuhan: Highlight halus `colors.surfaceRaised` (`activeOpacity={0.7}`).
   - Menekan baris bab memicu navigasi ke `ReaderScreen`:
     ```ts
     navigation.navigate('Reader', {
       novelId: novel.id,
       chapterId: chapter.id, // Preservasi string kanonik
     });
     ```

### 2.3 Aturan Preservasi Identitas Bab (`chapterId`)
- **KRITIKAL**: Pengidentifikasi bab yang digunakan pada navigasi, key FlatList, dan database lokal **wajib menggunakan `chapterId` kanonik**, **BUKAN** angka `chapterNumber`.
- Subjalur seperti `mtl/chapter-1` atau `volume-1-chapter-1` **harus dipertahankan seutuhnya** tanpa membuang prefix `mtl/` atau karakter pemisah.
- "Mulai Baca" memilih **bab pertama dalam urutan kronologis sumber** (`chapters[0]` pada urutan asli provider), **BUKAN mencari `chapterNumber === 1`** (karena banyak novel web/LN dimulai dari Prologue, Bab 0, atau penomoran non-standar).

### 2.4 Penanganan Kondisi Daftar Bab Kosong (Empty Chapter List)
Jika novel baru ditambahkan atau upstream belum menyediakan bab (`chapters.length === 0`):
- Tombol "Mulai Baca" dinonaktifkan (`disabled={true}`) dengan label "Belum Ada Bab".
- Tombol "Unduh" dinonaktifkan (`disabled={true}`) dengan label "Tidak Ada Bab".
- Tombol "Bookmark" tetap aktif untuk menyimpan novel ke Pustaka (selama storage SQLite tersedia).
- Tampilkan kontainer status kosong fungsional di bawah sinopsis:
  - Ikon outline: `menu_book` 48dp warna `colors.textSecondary`.
  - Judul: `Typography variant="title"` *"Belum Ada Bab Tersedia"*.
  - Deskripsi: `Typography variant="body"` *"Penyedia Meionovels belum merilis bab untuk novel ini."*.
  - Tombol aksi: "Muat Ulang" ($48\times 48\text{dp}$, `Button variant="filled"`, ikon `refresh`) untuk memicu query refetch ke server.

---

## 3. Matriks Status Tampilan (UI States) & Mode Offline

### 3.1 Loading Awal (Initial Loading Skeleton)
- Tampilan skeleton berlatar `colors.surfaceRaised` dengan animasi pulsa opasitas tenang:
  - Blok cover 93×140dp di kiri.
  - 3 baris placeholder teks judul dan penulis di kanan.
  - 3 baris blok placeholder sinopsis.
  - 3 tombol placeholder aksi.
  - 6 baris placeholder bab dengan pemisah 1dp.
- Mencegah *layout shift* saat data riil tiba dari server.

### 3.2 Pull-to-Refresh
- Menggunakan `RefreshControl` bawaan Android dengan warna aksen `colors.accentPrimary`.
- Data lama tetap ditampilkan selama pembaruan berjalan di latar belakang.
- Pembaruan menyegarkan metadata novel dan menyinkronkan daftar bab terbaru dari backend.

### 3.3 Penanganan Galat Awal (Error State)
- Jika pengambilan metadata gagal pada kali pertama buka:
  - Tampilkan halaman error penuh yang berpusat:
    - Ikon `error` 48dp `colors.statusError`.
    - Judul: *"Gagal Memuat Detail Novel"*.
    - Deskripsi ramah pengguna dalam Bahasa Indonesia: *"Koneksi terputus atau server tidak merespons. Periksa koneksi internet Anda."*. Bebas dari bocoran URL upstream atau pesan sistem mentah.
    - Tombol solutif "Coba Lagi" ($48\times 48\text{dp}$, `Button variant="filled"`).

### 3.4 Pembedaan Tiga Tingkat Data Tersimpan & Integritas Offline
Keberadaan baris pada tabel `novels` saja **TIDAK MEMBUKTIKAN** daftar bab atau konten bab tersedia. Sistem membedakan tiga tingkatan data di SQLite secara bertahap:

1. **Tingkat 1: Metadata Novel Tersimpan**:
   - Baris ada di tabel `novels` (cover, judul, penulis, sinopsis).
   - Jika offline dan HANYA tingkat ini yang ada (daftar bab belum pernah tersinkronisasi): Tampilkan metadata, pasang spanduk *"Mode Offline - Menampilkan konten tersimpan lokal"*, tampilkan keterangan *"Daftar bab belum tersinkronisasi. Hubungkan ke internet untuk memuat bab."*, serta nonaktifkan Mulai Baca dan Unduh.
2. **Tingkat 2: Daftar Bab Tersimpan**:
   - Baris ada di tabel `chapters` (berisi ID bab, judul, tanggal rilis), tetapi `content_blocks` masih `NULL` dan `download_status = 'NOT_DOWNLOADED'`.
   - Jika offline dan tingkat 1 & 2 ada: Tampilkan metadata dan daftar bab lengkap. Bab yang belum terunduh diberi keterangan diskrit *"Perlu koneksi internet untuk membaca"*. Menekan bab yang belum terunduh saat offline memunculkan pesan ramah bahwa bab belum diunduh.
3. **Tingkat 3: Konten Bab Terunduh**:
   - Baris di tabel `chapters` memiliki `content_blocks IS NOT NULL` dan `download_status = 'DOWNLOADED'` beserta seluruh ilustrasi terkait di tabel `chapter_images` berstatus `DOWNLOADED`.
   - Pengguna dapat membuka dan membaca bab secara penuh saat offline via `ReaderScreen`.
4. **Kondisi Offline Tanpa Data di SQLite**:
   - Jika novel belum pernah disimpan di lokal dan tidak ada internet:
     - Tampilkan layar error yang jujur: *"Perangkat Sedang Offline - Novel ini belum tersimpan di pustaka lokal Anda. Hubungkan ke internet untuk memuat novel ini."*
     - Tombol "Coba Lagi" ($48\times 48\text{dp}$, `Button variant="filled"`).

### 3.5 Mekanisme Rollback Bookmark Dua Arah & Penguncian Transaksi
1. **Penyimpanan State Sebelum Perubahan (`previousState`)**:
   - Sebelum mutasi ke SQLite dijalankan, simpan nilai state aktif:
     ```ts
     const previousState = isBookmarked; // true (tersimpan) atau false (belum)
     ```
2. **Pembaruan Optimistik & Pencegahan Toggle Berulang (*Spam Lock*)**:
   - UI beralih seketika ke target state: `setIsBookmarked(!previousState)`.
   - Tombol langsung dikunci sementara (`isSaving: boolean = true`, tombol dalam status `disabled` dari sentuhan) selama transaksi penulisan SQLite berlangsung guna mencegah spam tap dan race condition.
3. **Rollback Dua Arah Berbasis Hasil Transaksi**:
   - **Kasus 1: Gagal Menambah Bookmark ($0 \rightarrow 1$ Gagal)**:
     - Jika query `UPDATE novels SET is_bookmarked = 1` gagal (misal disk I/O error atau constraint failure):
       - Munculkan toast error: *"Gagal menyimpan bookmark ke penyimpanan lokal"*.
       - Lakukan rollback seketika ke belum tersimpan: `setIsBookmarked(false)`.
   - **Kasus 2: Gagal Menghapus Bookmark ($1 \rightarrow 0$ Gagal)**:
     - Jika query `UPDATE novels SET is_bookmarked = 0` gagal:
       - Munculkan toast error: *"Gagal menghapus bookmark dari penyimpanan lokal"*.
       - Lakukan rollback seketika ke tersimpan: `setIsBookmarked(true)`.
   - Buka kembali kunci tombol (`isSaving = false`) setelah proses selesai. Dilarang mempertahankan klaim status tersimpan jika operasi database gagal.
4. **Penanganan Storage SQLite Tidak Tersedia**:
   - Jika inisialisasi database SQLite lokal gagal saat startup atau koneksi database terputus (`isStorageReady === false`):
     - Tombol Bookmark **dinonaktifkan penuh (`disabled={true}`)**.
     - Menampilkan alasan yang jelas pada accessibility/tooltip: *"Penyimpanan lokal tidak tersedia"*.

---

## 4. Aksesibilitas (WCAG 2.1 AA & Material Guidelines)

1. **Target Sentuh Minimum $\ge 48 \times 48\text{ dp}$**:
   - Tombol Kembali di Top Bar: $48 \times 48\text{dp}$.
   - Tombol Toggle Ekspansi Sinopsis: Area sentuh minimal $48\times 48\text{dp}$.
   - Tiga Tombol Aksi Utama: Tinggi minimal 48dp, lebar adaptif (100% pada mode vertikal bertumpuk).
   - Tombol Toggle Urutan Bab: Area sentuh minimal $48\times 48\text{dp}$.
   - Setiap Baris Bab: Tinggi baris minimal 52dp.
2. **Kontras Warna Tri-Tema**:
   - Judul Novel (`colors.textPrimary`): Rasio kontras $\ge 7.0:1$ (AAA) di Light (`#111827`), Dark (`#F3F4F6`), dan Sepia (`#2D241E`).
   - Metadata & Tanggal Bab (`colors.textSecondary`): Rasio kontras $\ge 4.5:1$ (AA) di seluruh tema.
   - Border pemisah (`colors.borderSubtle`): Berfungsi sebagai pembatas struktural sekunder non-esensial. Elemen interaktif yang membutuhkan batas kontur wajib menggunakan `borderStrong` atau kontur bidang yang tegas.
3. **Pembaca Layar (TalkBack Accessibility Labels)**:
   - Tombol Kembali: `accessibilityRole="button"`, `accessibilityLabel="Kembali ke halaman sebelumnya"`.
   - Tombol Bookmark: `accessibilityRole="button"`, `accessibilityLabel="Simpan novel ke bookmark"` (jika belum) / `"Hapus novel dari bookmark"` (jika sudah).
   - Tombol Unduh: `accessibilityRole="button"`, `accessibilityLabel="Unduh bab novel untuk dibaca offline"`.
   - Baris Bab: `accessibilityRole="button"`, `accessibilityLabel="Bab: {chapter.title}, {isDownloaded ? 'Sudah terunduh' : 'Belum diunduh'}"`.
4. **Urutan Fokus Logis**:
   - Top App Bar (Tombol Kembali) $\rightarrow$ Metadata Novel (Judul, Penulis, Status, Genre) $\rightarrow$ Paragraf Sinopsis & Tombol Selengkapnya $\rightarrow$ Tombol Aksi (Mulai Baca, Bookmark, Unduh) $\rightarrow$ Header Bab & Toggle Urutan $\rightarrow$ Daftar Bab Berurutan.

---

## 5. Pemisahan Aksi Jaringan vs Aksi Lokal & Batasan Integrasi

### 5.1 Matriks Sifat Aksi Pengguna
| Elemen Interaktif | Jenis Aksi | Target Penyimpanan | Kebutuhan Internet | Feedback UI |
| :--- | :--- | :--- | :--- | :--- |
| **Bookmark Toggle** | **Lokal Murni** | SQLite (`novels.is_bookmarked`) | Tidak butuh (100% offline) | Ikon berubah seketika, terkunci saat saving, rollback dua arah jika penulisan gagal |
| **Urutan Bab Toggle** | **Lokal Murni** | State memori (`isAscending`) | Tidak butuh | Daftar bab terbalik seketika tanpa mengubah target Mulai Baca |
| **Mulai / Lanjut Baca** | **Kondisional** | SQLite / API Reader | Jika bab terunduh: Offline. Jika belum: Butuh internet | Navigasi ke `ReaderScreen` |
| **Unduh Bab** | **Jaringan** | Filesystem & SQLite (`chapters`) | Wajib koneksi internet | Menampilkan antrean unduhan di Download Manager |
| **Pull-to-Refresh** | **Jaringan** | Query Cache & Backend API | Wajib koneksi internet | Spinner refresh di bagian atas |

### 5.2 Penandaan Integrasi Milestone Mendatang
- **Implementasi Layar Detail & Bookmark**: Diimplementasikan pada `[DIS-04]` bersama modul persistensi SQLite `[FON-03]`.
- **Implementasi Layar Reader**: Spesifikasi UI pada `[RDR-01]`, implementasi engine pembaca pada `[RDR-02]` s.d. `[RDR-06]`.
- **Implementasi Layar Pustaka**: Spesifikasi UI pada `[LIB-01]`, implementasi sinkronisasi bookmark & riwayat pada `[LIB-02]` s.d. `[LIB-04]`.
- **Implementasi Download Manager**: Spesifikasi UI pada `[DL-01]`, implementasi antrean unduhan & filesystem pada `[DL-02]` s.d. `[DL-05]`.
- **Batas Paket & Dependensi**: Murni menggunakan paket yang telah terpasang, tanpa menambah dependensi npm baru atau mengubah kontrak API backend.
