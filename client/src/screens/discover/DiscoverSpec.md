# Spesifikasi UI/UX: Layar Discover & Pencarian (Search)
**Dokumen**: `DiscoverSpec.md`<br>
**Tugas Terkait**: `[DIS-01]` (Persiapan Desain) $\rightarrow$ diimplementasikan pada `[DIS-02]` (Discover) & `[DIS-03]` (Search)<br>
**Target Platform**: Android Mobile (Android 8.0+)<br>
**Acuan Desain**: [anti-patterns-ui.md](file:///d:/project/yomou/docs/anti-patterns-ui.md) (Seksi 3.6, 3.7, 4, 5.1), [PRD.md](file:///d:/project/yomou/docs/PRD.md) (Seksi 3.1 & 3.5)

---

## 1. Arsitektur Layar & Tata Letak Discover

### 1.1 Hierarki Komponen
```text
DiscoverScreen (SafeAreaView)
├── Top App Bar Ringkas (Tinggi 56dp)
│   └── Bilah Pencarian Terintegrasi (Integrated SearchBar)
│       ├── Ikon 'search' (24dp, textSecondary)
│       ├── Input Teks ("Cari judul novel...")
│       └── Tombol Bersihkan ("X", ikon 'close', muncul jika rawInput.length > 0)
└── Area Konten Dinamis
    ├── Mode Beranda (Saat rawInput.trim() === '')
    │   └── ScrollView / FlatList Terpadu
    │       ├── Seksi Horizontal: "Novel Populer"
    │       │   ├── Header Seksi (Title 16sp Semi-Bold)
    │       │   ├── State Terisolasi: Loading / Konten / Error Inline
    │       │   └── Horizontal FlatList (Cover rasio 2:3, 110×165dp, radius 8dp)
    │       └── Seksi Vertikal: "Pembaruan Terbaru"
    │           ├── Header Seksi (Title 16sp Semi-Bold)
    │           ├── State Terisolasi: Loading / Konten / Error Feed
    │           ├── Vertical FlatList (Cover 60×90dp, metadata, pemisah 1dp)
    │           └── Footer Paginasi (Loading / Error Retry / Akhir Feed)
    └── Mode Pencarian (Saat rawInput.trim() !== '')
        ├── Status Menunggu Debounce (Saat rawInput.trim() !== debouncedQuery.trim())
        └── Hasil Pencarian Aktif (Saat debouncedQuery aktif)
            ├── Indikator Status / Jumlah Hasil
            ├── Daftar Kartu Novel Hasil Pencarian (Datar berpemisah 1dp)
            └── Footer Paginasi Pencarian
```

### 1.2 Ketentuan Tata Letak & Anti-Pattern Compliance
1. **Top App Bar Ringkas (56dp)**:
   - Tinggi tepat **56dp**, permukaan datar solid menggunakan token `colors.surfaceRaised`.
   - Garis pemisah bawah 1dp solid `colors.borderSubtle`. Elevasi standar Level 2 (`ELEVATION.level2`) atau border datar tanpa bayangan tebal.
   - **Bebas Hero Marketing**: Dilarang menggunakan banner promosi raksasa (> 50% viewport) atau slogan iklan ([anti-patterns-ui.md: Seksi 3.6 & V-06](file:///d:/project/yomou/docs/anti-patterns-ui.md)).
2. **Seksi Novel Populer (Horizontal Carousel)**:
   - Kartu novel berpenampilan tenang, latar `colors.surfaceRaised`, radius `RADIUS.medium` (8dp), border 1dp `colors.borderSubtle`.
   - **Cover Rasio 2:3**: Lebar 110dp, tinggi 165dp. Gambar cover bersudut lengkung `RADIUS.medium` (8dp) dengan border pelindung 1dp.
   - Judul novel: `Typography variant="label"` (14sp, maksimal 2 baris terpotong elipsis `...`, rata kiri).
   - Jarak horizontal antar kartu: 12dp (`SPACING.space3`), padding kiri/kanan tepi layar: 16dp (`SPACING.space4`).
   - Transisi sentuhan: Menekan kartu novel langsung memicu navigasi `navigation.navigate('NovelDetail', { novelId: novel.id })`.
3. **Seksi Pembaruan Terbaru (Vertikal Feed)**:
   - Menggunakan baris kartu datar vertikal tanpa *card soup* bertumpuk ([anti-patterns-ui.md: Seksi 3.7 & V-07](file:///d:/project/yomou/docs/anti-patterns-ui.md)).
   - Setiap baris item:
     - Cover kecil 2:3 di sisi kiri: lebar 60dp, tinggi 90dp, radius `RADIUS.small` (4dp).
     - Kolom informasi di sisi kanan:
       - Judul novel (`Typography variant="title"`, 16sp, maks 2 baris).
       - Bab rilis terbaru (`Typography variant="body"`, 14sp, teks sekunder `colors.textSecondary`). Field opsional jika belum ada rilis bab.
       - Waktu rilis relatif (`Typography variant="caption"`, 12sp, teks sekunder `colors.textSecondary`). Field opsional yang disembunyikan bersih jika tidak disediakan upstream.
   - Pembatas antar baris: Garis pemisah 1dp solid `colors.borderSubtle`.
   - Tinggi interaktif baris minimal **72dp** (memenuhi target sentuh $\ge 48\times 48\text{dp}$).
   - Transisi sentuhan: Membuka layar Detail Novel dengan `{ novelId: novel.id }`.

### 1.3 Isolasi Status Independen Antar Seksi Discover
Seksi "Novel Populer" (`useQuery({ queryKey: ['novels', 'popular'] })`) dan seksi "Pembaruan Terbaru" (`useInfiniteQuery({ queryKey: ['novels', 'latest'] })`) dijalankan secara independen:
- **Kegagalan Popular Tidak Mempengaruhi Latest**: Jika request novel populer gagal (misal timeout atau jaringan lambat), seksi Populer menampilkan kartu error inline ringkas ("Gagal memuat novel populer" disertai tombol teks "Coba Lagi"), sementara seksi Pembaruan Terbaru tetap tampil normal jika datanya berhasil dimuat.
- **Kegagalan Latest Tidak Mempengaruhi Popular**: Jika pemuatan pembaruan terbaru gagal, seksi Populer tetap dapat digulir dan diklik, sementara seksi Terbaru menampilkan pesan error dengan tombol "Coba Lagi".

---

## 2. Fitur Pencarian Novel (Search)

### 2.1 Alur Masuk & Keluar Tunggal
Tidak ada percabangan antara "overlay atau layar terpisah". Antarmuka menggunakan **satu alur pencarian terintegrasi langsung pada layar Discover**:
1. **Alur Masuk (Aktif Mencari)**:
   - Bilah pencarian terletak permanen di Top App Bar.
   - Saat pengguna mengetikkan kata kunci (`rawInput.trim().length > 0`), tampilan Discover secara mulus beralih ke antarmuka pencarian, menggantikan seksi Populer & Terbaru.
2. **Alur Keluar Instan (Kembali ke Beranda)**:
   - Ketika `rawInput.trim() === ''` (karena pengguna menekan tombol bersihkan "X" atau menghapus seluruh teks hingga kosong/whitespace):
     - Antarmuka **seketika langsung kembali ke Mode Beranda (Novel Populer + Pembaruan Terbaru)**.
     - Pencarian **dinonaktifkan secara instan tanpa menunggu jeda debounce 400ms**.
     - Data Beranda yang sudah tersimpan di cache TanStack Query langsung ditampilkan kembali tanpa reload.

### 2.2 Struktur & Komponen Input Bar
- Tinggi kontainer input: minimal **48dp** (memenuhi target sentuh minimal $48\times 48\text{dp}$).
- Latar belakang datar solid: `colors.surfaceRaised`, border 1dp `colors.borderStrong`, radius `RADIUS.large` (12dp).
- **Ikon Pencarian di Kiri**: Ikon vektor `search` (24dp, `colors.textSecondary`). Bebas dari emoji navigasi.
- **Input Teks**: Teks warna `colors.textPrimary`, placeholder `"Cari judul novel..."` (`colors.textSecondary`). Dilarang menjanjikan pencarian berdasarkan penulis karena endpoint scraping upstream Meionovels hanya mendukung form pencarian judul.
- **Tombol Pembersih ("X")**:
  - Muncul **hanya jika** input teks memiliki karakter (`rawInput.length > 0`).
  - Menggunakan ikon vektor `close` (24dp, `colors.textSecondary`).
  - Target sentuh minimal **$48\times 48\text{dp}$**, `accessibilityLabel="Bersihkan teks pencarian"`.
  - Aksi: Menekan tombol "X" mengosongkan nilai input teks seketika (`setRawInput('')`) dan langsung mengembalikan antarmuka ke tampilan Beranda Discover tanpa debounce.

### 2.3 Pembedaan Input Terkini vs Debounced & Paginasi Pencarian (TanStack Query)
1. **Pembedaan `rawInput` vs `debouncedQuery`**:
   - `rawInput`: String mentah yang sedang diketik pengguna di text input secara real-time.
   - `debouncedQuery`: Nilai string yang diperbarui hanya setelah pengguna berhenti mengetik selama **400 ms**.
   - **Perilaku Saat Keduanya Berbeda**:
     - Ketika pengguna masih mengetik (`rawInput.trim() !== debouncedQuery.trim()` dan `rawInput.trim().length > 0`), antarmuka menampilkan status **Menunggu Pencarian...** (Pending Debounce).
     - **DILARANG menampilkan hasil, empty state, atau error dari query lama** seolah-olah itu adalah hasil dari kata kunci baru yang sedang diketik.
2. **Penerapan `useInfiniteQuery` dengan Kata Kunci Ternormalisasi**:
   - Kata kunci dinormalisasi sebelum dipasangkan ke query key:
     ```ts
     const normalizedQuery = debouncedQuery.trim().toLowerCase();

     const {
       data,
       isLoading,
       isFetching,
       isError,
       fetchNextPage,
       hasNextPage,
       isFetchingNextPage,
       refetch,
     } = useInfiniteQuery({
       queryKey: ['novels', 'search', normalizedQuery],
       queryFn: ({ pageParam = 1, signal }) =>
         fetchNovelSearch(normalizedQuery, pageParam, { signal }),
       initialPageParam: 1,
       getNextPageParam: (lastPage, allPages) => {
        // 1. Respons array kosong definitif menghentikan paginasi
        if (!lastPage || lastPage.length === 0) return undefined;

        // 2. Kumpulkan seluruh ID dari halaman-halaman sebelumnya
        const previousPages = allPages.slice(0, -1);
        const seenIds = new Set(previousPages.flatMap((page) => page.map((n) => n.id)));

        // 3. Halaman nonkosong tanpa ID novel baru dibanding halaman sebelumnya
        // juga menghentikan auto-fetch guna mencegah loop tak terbatas
        const hasNewIds = lastPage.some((n) => !seenIds.has(n.id));
        if (previousPages.length > 0 && !hasNewIds) {
          // Catatan: Kondisi duplikat ini adalah pengaman loop, BUKAN bukti definitif akhir katalog.
          return undefined;
        }

        return allPages.length + 1;
      },
      enabled: normalizedQuery.length > 0 && rawInput.trim().length > 0,
    });

    // Guard fetchNextPage: mencegah pemanggilan ketika fetch lain, termasuk refresh, masih berjalan
    const handleEndReached = () => {
      if (isFetching || isFetchingNextPage || !hasNextPage) return;
      fetchNextPage();
    };
    ```
3. **Mekanisme Pembatalan Request via `AbortSignal`**:
   - Meneruskan `signal` (`AbortSignal`) dari `QueryFunctionContext` ke klien HTTP (Axios) mendukung pembatalan request jaringan ketika TanStack Query membatalkan query (misalnya saat kata kunci berubah setelah debounce selesai atau saat komponen unmount).
   - **Bukan Jaminan Pembatalan Seketika pada Setiap Ketikan**: Meneruskan `AbortSignal` bukan berarti koneksi dibatalkan seketika pada tiap karakter yang diketik, karena pembaruan query key ditahan terlebih dahulu oleh debounce 400ms dan pembatalan socket TCP bergantung pada kesiapan transport layer jaringan.

### 2.4 Matriks Status Tampilan Pencarian (Search States)
| State | Pemicu | Elemen Visual & Konten | Aksi Pengguna |
| :--- | :--- | :--- | :--- |
| **1. Belum Mencari (Initial / Idle)** | `rawInput.trim() === ''` | Langsung menampilkan Mode Beranda Discover (Seksi Populer & Terbaru). Tidak menunggu debounce. | Ketikkan judul novel |
| **2. Menunggu Pencarian (Pending Debounce)** | `rawInput.trim() !== debouncedQuery.trim()` & `rawInput.trim().length > 0` | Indikator teks tenang: *"Menyiapkan pencarian untuk \"{rawInput.trim()}\"..."* dengan spinner mini. Hasil query lama disembunyikan. | Terus mengetik atau berhenti |
| **3. Memuat (Loading Awal)** | `isLoading` aktif pada page 1 pasca-debounce | Skeleton baris datar hasil pencarian di tengah layar (`colors.accentPrimary`). | Menunggu atau membatalkan input |
| **4. Hasil Ditemukan (Success)** | Respons sukses dengan `data.pages[0].length > 0` | Daftar datar kartu novel hasil pencarian: cover 2:3 (60×90dp), judul novel, genre, status, dan bab terbaru. Dilengkapi footer paginasi. | Gulir atau pilih novel menuju Detail |
| **5. Hasil Kosong (Empty State)** | Respons sukses di mana **seluruh pencarian tidak menghasilkan apapun** (`page 1` mengembalikan `[]`) | Ikon outline `menu_book` 48dp `colors.textSecondary`, judul "Tidak Ada Hasil Ditemukan", deskripsi "Tidak menemukan novel dengan judul \"{debouncedQuery}\". Periksa kembali ejaan kata kunci.", tombol "Kembali ke Beranda". | Ubah kata kunci atau tekan tombol kembali |
| **6. Gagal (Error)** | Jaringan putus / HTTP 5xx / timeout pada page 1 | Ikon `error` 48dp `colors.statusError`, judul "Gagal Memuat Hasil", deskripsi ramah Bahasa Indonesia, tombol "Coba Lagi" ($48\times 48\text{dp}$, `Button variant="filled"`). | Tekan "Coba Lagi" |

*Catatan Kritis Empty State*: Tampilan hasil kosong (*Empty State*) **HANYA** berlaku jika pencarian halaman pertama (`page 1`) tidak menghasilkan item sama sekali. Jika halaman lanjutan (`page > 1`) mengembalikan `[]`, hal ini **hanya menghentikan paginasi tanpa menghapus hasil pencarian sebelumnya**.

---

## 3. Paginasi & Kebijakan Metadata API Tanpa Asumsi Ukuran Halaman

### 3.1 Keterbatasan Faktual API Backend
- Endpoint API aktual `/api/novels/latest?page={n}` dan `/api/novels/search?q={query}&page={n}` merespons metadata `{ source, cachedAt, page }`.
- Field `totalPages` dan `hasNextPage` bernilai `undefined` dari upstream provider.
- Backend dapat menyaring item upstream yang tidak valid (misal entri rusak atau promo), sehingga ukuran batch yang diterima client bisa kurang dari 10 meskipun halaman berikutnya masih ada.

### 3.2 Kebijakan Paginasi Sementara (Client-side Heuristic)
1. **Dilarang Mengasumsikan Ukuran Halaman**:
   - Dilarang menggunakan aturan kaku seperti *"jumlah item < 10 berarti halaman terakhir"*. Halaman pendek belum membuktikan akhir katalog.
2. **Izin Permintaan Halaman Berikutnya**:
   - Setiap respons nonkosong (`data.length > 0`) **tetap memungkinkan permintaan halaman berikutnya** (`hasNextPage = true`).
3. **Kondisi Akhir Paginasi (*End of List*)**:
   - Respons berupa array kosong (`data.length === 0` atau `[]`) adalah satu-satunya kondisi yang secara definitif menandai akhir daftar (`hasNextPage = false`).
   - Menerima `[]` pada halaman lanjutan menghentikan paginasi tanpa merusak atau menghapus item yang sudah dimuat sebelumnya.
4. **Deduplikasi Ketat Berdasarkan `novel.id`**:
   - Data halaman baru digabungkan dengan data yang sudah ada menggunakan deduplikasi berbasis `novel.id` unik (misal via `Set` atau Map ID).
5. **Pencegahan Infinite Loop & Penghentian Auto-Fetch**:
   - Jika pengambilan halaman berikutnya mengembalikan item nonkosong tetapi **tidak ada satupun ID baru** yang bertambah ke daftar dibanding halaman-halaman sebelumnya (seluruh item duplikat), **hentikan pemuatan otomatis** (`hasNextPage = false` / `getNextPageParam` mengembalikan `undefined`) guna mencegah perulangan request tanpa henti ke backend.
   - **Kondisi duplikat BUKAN bukti akhir katalog**: Berhentinya auto-fetch karena duplikasi murni merupakan pengaman loop client-side. Client tidak boleh mengklaim akhir katalog telah terbukti secara mutlak. Cukup tampilkan keterangan netral pada footer: *"Tidak ada novel baru"*.
6. **Penguncian Paginasi Aktif (*Comprehensive Fetch Lock*)**:
   - Pemanggilan `fetchNextPage()` (misal via `onEndReached` pada FlatList) wajib dicegah apabila ada proses fetch lain yang masih berjalan—termasuk pemuatan awal (`isLoading`), pull-to-refresh / refetch latar belakang (`isFetching`), atau pemuatan halaman berikutnya (`isFetchingNextPage`)—serta jika `hasNextPage` bernilai `false`.
   - Hal ini mencegah race condition dan tabrakan offset halaman jika pengguna menggulir saat refresh atau query lain sedang berlangsung:
     ```ts
     const handleEndReached = () => {
       if (isFetching || isFetchingNextPage || !hasNextPage) return;
       fetchNextPage();
     };
     ```
7. **Penanganan Galat Paginasi**:
   - Jika pengambilan halaman ke-2 atau seterusnya gagal (network error / 5xx):
     - Seluruh item novel yang sudah berhasil dimuat sebelumnya **wajib dipertahankan** di layar (tidak di-reset).
     - Tampilkan footer error diskrit: teks *"Gagal memuat halaman berikutnya"* disertai tombol *"Coba Lagi"* ($48\times 48\text{dp}$) yang secara spesifik memicu retry pada nomor halaman yang gagal tersebut.
8. **Penyajian Nomor Halaman Jujur**:
   - Client hanya menampilkan nomor halaman yang sedang aktif atau indikator pemuatan footer diskrit tanpa mengarang total halaman.

---

## 4. Matriks Status Antarmuka (UI States) & Mode Offline Discover

### 4.1 Matriks State Layar Discover
- **Loading Awal**: Skeleton loading kartu horizontal dan baris vertikal dengan pulsa opasitas tenang.
- **Pull-to-Refresh**: Menggunakan `RefreshControl` standar Android dengan warna aksen `colors.accentPrimary`. Data lama tetap tampil selama pembaruan latar belakang berjalan.
- **Error Awal Total**: Jika koneksi gagal saat pertama kali membuka layar (kedua seksi gagal), tampilkan layar error terpusat dengan tombol "Coba Lagi" (`Button variant="filled"`).

### 4.2 Kebijakan Mode Offline Discover & Kejujuran Data
1. **Cache Feed dalam Sesi (In-Session Query Cache)**:
   - Jika perangkat terputus dari internet saat aplikasi masih berjalan dan feed pernah dimuat dalam sesi tersebut, data cache TanStack Query **boleh tetap ditampilkan**.
   - Berikan spanduk/indikator jelas di bawah top bar:
     *"Mode Offline - Menampilkan data sesi sebelumnya"*.
2. **Ketiadaan Cache Feed saat Offline (Misal Cold-Start Offline)**:
   - Jika cache feed tidak tersedia saat offline:
     - Tampilkan layar status offline yang jujur:
       *"Perangkat Sedang Offline - Tidak ada data feed beranda tersimpan dalam sesi ini."*
     - Sediakan tombol akses langsung menuju Pustaka:
       **"Buka Pustaka"** (`Button variant="filled"`, aksi `navigation.navigate('MainTabs', { screen: 'Library' })`).
3. **Larangan Menyamarkan Pustaka Lokal Sebagai Feed Upstream**:
   - **Tabel SQLite `novels` BUKAN snapshot urutan atau kategori Populer maupun Terbaru**. Tabel `novels` hanya menyimpan entitas individual novel yang pernah di-bookmark atau dibaca.
   - Dilarang men-query tabel `novels` lokal lalu menampilkannya seolah-olah itu feed Populer atau Terbaru dari upstream Meionovels.
   - Dilarang menambah skema persistensi feed lokal ke SQLite dalam lingkup tugas dokumentasi ini.

### 4.3 Aksesibilitas (WCAG 2.1 AA & Material Guidelines)
1. **Target Sentuh**: Seluruh elemen yang dapat diklik (kartu novel, tombol pembersih "X", tombol coba lagi, baris feed) memiliki ukuran fisik minimal **$48 \times 48\text{ dp}$**.
2. **Kontras Warna Tri-Tema**:
   - Teks judul utama (`colors.textPrimary`): rasio kontras $\ge 7.0:1$ (AAA) di Light (`#111827`), Dark (`#F3F4F6`), dan Sepia (`#2D241E`).
   - Teks sekunder (`colors.textSecondary`): rasio kontras $\ge 4.5:1$ (AA) di seluruh tema.
   - Garis pemisah (`colors.borderSubtle`): Berfungsi sebagai pembatas struktural sekunder non-esensial. Elemen interaktif yang membutuhkan batas kontur wajib menggunakan `borderStrong` atau kontur bidang yang tegas.
3. **Label Aksesibel TalkBack**:
   - Kartu Novel: `accessibilityRole="button"`, `accessibilityLabel="Novel: {title}, {latestChapter ? 'Bab terbaru: ' + latestChapter : ''}"`.
   - Tombol Bersihkan Pencarian: `accessibilityRole="button"`, `accessibilityLabel="Bersihkan teks pencarian"`.
4. **Urutan Fokus Logis**:
   - Top App Bar / Search Field $\rightarrow$ Seksi Novel Populer $\rightarrow$ Seksi Pembaruan Terbaru $\rightarrow$ Bottom Tab Bar.

---

## 5. Pemisahan Aksi Jaringan vs Aksi Lokal & Batasan Integrasi

### 5.1 Matriks Sifat Aksi Pengguna (Discover & Search)
| Elemen Interaktif | Jenis Aksi | Target / Sumber Data | Kebutuhan Internet | Feedback UI |
| :--- | :--- | :--- | :--- | :--- |
| **Ketik Kata Kunci (Debounce 400ms)** | **Jaringan** | REST API `/api/novels/search` | Wajib koneksi internet | Menampilkan status pending $\rightarrow$ skeleton loading |
| **Tekan Tombol Bersihkan ("X")** | **Lokal Murni** | State lokal input (`rawInput = ''`) | Tidak butuh | Input langsung kosong, reset seketika ke Mode Beranda |
| **Pull-to-Refresh Discover** | **Jaringan** | REST API `/popular` & `/latest` | Wajib koneksi internet | Spinner refresh bawaan Android di bagian atas |
| **Scroll Paginasi (onEndReached)** | **Jaringan** | REST API `/api/novels/latest?page={n}` | Wajib koneksi internet | Footer loader pemuatan halaman berikutnya (terkunci `isFetchingNextPage`) |
| **Klik Kartu Novel (Navigasi)** | **Lokal Navigasi** | React Navigation Native Stack | Tidak butuh | Pindah ke `NovelDetailScreen` dengan `{ novelId }` |
| **Buka Pustaka (Saat Offline)** | **Lokal Navigasi** | React Navigation Bottom Tabs | Tidak butuh | Pindah ke tab Library |

### 5.2 Penandaan Integrasi Milestone Mendatang
- **Implementasi Layar Discover**: Diimplementasikan pada `[DIS-02]` menggunakan TanStack Query (`useQuery` dan `useInfiniteQuery`).
- **Implementasi Fitur Pencarian**: Diimplementasikan pada `[DIS-03]` dengan debounce 400ms, useInfiniteQuery, dan cancellation via AbortSignal.
- **Implementasi Layar Detail & Bookmark**: Diimplementasikan pada `[DIS-04]` bersama modul persistensi SQLite `[FON-03]`.
- **Implementasi Layar Reader**: Spesifikasi UI pada `[RDR-01]`, implementasi engine pembaca pada `[RDR-02]` s.d. `[RDR-06]`.
- **Implementasi Layar Pustaka**: Spesifikasi UI pada `[LIB-01]`, implementasi sinkronisasi bookmark & riwayat pada `[LIB-02]` s.d. `[LIB-04]`.
- **Implementasi Download Manager**: Spesifikasi UI pada `[DL-01]`, implementasi antrean unduhan & filesystem pada `[DL-02]` s.d. `[DL-05]`.
- **Batas Paket & Dependensi**: Bebas dari penambahan dependensi npm baru, aset eksternal, atau perubahan kontrak API backend.
