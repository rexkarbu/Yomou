# Pedoman Anti-Pattern UI & Visual Tropes (Dilarang Digunakan)
**Status**: Kanonik / Wajib Dipatuhi  
**Proyek**: YomouNovel (読もう)  
**Dokumen Terkait**: [PRD.md](file:///d:/project/yomou/docs/PRD.md)  
**Target Platform**: Android Mobile (Android 8.0+)  

---

## 1. Identitas, Tujuan, Ruang Lingkup, dan Kedudukan Dokumen

### 1.1 Tujuan
Dokumen ini menetapkan larangan resmi terhadap gaya visual generik berbasis kecerdasan buatan (*AI-slop visual tropes*) serta ornamen visual berlebihan yang menurunkan keterbacaan, memperlambat performa, dan merusak fokus membaca. Dokumen ini mendefinisikan istilah industri yang tepat dan menetapkan standar visual pengganti yang bersih, tenang, konsisten, serta sesuai dengan kodrat aplikasi pembaca novel di platform Android.

### 1.2 Ruang Lingkup
Pedoman ini mengikat secara wajib untuk:
* Seluruh layar aplikasi (Discover, Detail Novel, Reader, Library, Download Manager, dan Settings).
* Seluruh komponen antarmuka (tombol, input, kartu, daftar, modal, bottom sheet, dan dialog).
* Seluruh aset visual internal, ikonografi, dan status antarmuka (loading, empty, error, offline).
* Seluruh variasi tema resmi: **Light Mode**, **Dark Mode**, dan **Sepia Mode**.

### 1.3 Kedudukan Dokumen
* **Hubungan dengan PRD**: Dokumen [PRD.md](file:///d:/project/yomou/docs/PRD.md) tetap menjadi acuan tunggal untuk cakupan fitur, arsitektur data, dan logika aplikasi. Pedoman ini secara khusus mengatur **penyajian visual dan interaksi antarmuka**.
* **Prinsip Fungsionalitas**: Larangan estetika dalam dokumen ini tidak boleh digunakan sebagai alasan untuk menghapus fitur wajib PRD, mengurangi aksesibilitas, atau menyembunyikan informasi penting.
* **Definisi AI-Slop**: Dalam dokumen ini, *AI-slop* didefinisikan secara objektif sebagai **pola visual dekoratif generik yang diterapkan tanpa alasan fungsional, tanpa konteks produk, dan mengorbankan kenyamanan pengguna**. Definisi ini tidak bergantung pada apakah aset dibuat oleh manusia atau perkakas kecerdasan buatan, melainkan pada ketiadaan rasional fungsionalnya.
* **Definisi Desain Fungsional & Tenang**: Pendekatan visual YomouNovel adalah *clean, content-focused functional design*, yang berarti hierarki visual jelas, tipografi berdisiplin tinggi, palet warna terkontrol, dan interaksi native Android yang lugas. Pendekatan ini **bukan** berarti mengubah aplikasi novel reader menjadi dasbor analitik perusahaan (*corporate dashboard*).

---

## 2. Prinsip Visual Pengganti (Core Replacement Principles)

Untuk menggantikan pola dekoratif yang dilarang, seluruh komponen antarmuka wajib dirancang berdasarkan 7 prinsip utama:

1. **Konten Bacaan adalah Subjek Utama (*Content-First*)**: Antarmuka pembaca bersifat transparan dan mengabdi pada teks novel. Elemen UI pembantu tidak boleh bersaing merebut perhatian visual pembaca.
2. **Permukaan yang Menenangkan (*Calm Surfaces*)**: Mengutamakan kenyamanan mata pada sesi membaca berdurasi panjang (30 menit hingga berjam-jam). Latar belakang harus solid dan tenang, bebas dari tekstur atau gradien yang melelahkan visual (*visual fatigue*).
3. **Hierarki Melalui Tipografi, Spasi, dan Penataan (*Structural Hierarchy*)**: Struktur visual dibangun melalui skala tipe (*type scale*), bobot huruf (*font weight*), perataan (*alignment*), dan jarak (*spacing*), bukan dengan membungkus setiap kelompok teks ke dalam kotak-kotak kartu berlapis (*card soup*).
4. **Warna Aksen Bertujuan (*Semantic Accent*)**: Warna aksen hanya digunakan untuk memandu tindakan primer, menandai status interaktif, atau memberikan umpan balik penting. Permukaan umum didominasi oleh warna netral.
5. **Konvensi Native Android yang Familier**: Mengikuti pola desain sistem Android (Material Design) yang natural bagi pengguna: *top app bar*, *bottom navigation*, *bottom sheet drawer*, dan target sentuh yang memadai.
6. **Konsistensi Tri-Tema Sesuai PRD**: Setiap komponen harus memiliki representasi kontras tinggi dan harmonis pada mode **Light**, **Dark**, dan **Sepia** tanpa pengecualian.
7. **Kepadatan Informasi Fungsional (*Functional Information Density*)**: Ruang kosong (*white space*) digunakan untuk keterbacaan, bukan ruang kosong hampa yang memaksa pengguna menggulir layar secara berlebihan. Halaman daftar bab memerlukan densitas padat-terbaca, sedangkan halaman membaca memerlukan margin bernapas.

---

## 3. Daftar Anti-Pattern & Standar Pengganti

Berikut adalah 16 anti-pattern visual yang dilarang secara kanonik beserta alternatif penggantinya:

### 3.1 Gradien Ungu-Biru Generik & Mesh Gradient Dekoratif
* **Nama Indonesia**: Gradien Ungu-Biru Generik dan Gumpalan Warna Dekoratif.
* **Istilah Industri**: *Generic Violet/Cyan Gradients, Mesh Gradients, Decorative Gradient Blobs*.
* **Ciri Visual**: Latar belakang ungu ke biru neon (`#8B5CF6` ke `#06B6D4`), gumpalan warna abstrak buram (*blurry blobs*) yang melayang di belakang kartu atau teks.
* **Penggunaan yang Dilarang**: Latar belakang aplikasi, header beranda, tombol utama, dan latar belakang panel pembaca.
* **Alasan Larangan**: Mengalihkan fokus mata, menciptakan kontras yang tidak merata di bawah teks, memperberat komputasi render GPU ponsel kelas menengah, dan menimbulkan kesan generik purwarupa AI.
* **Pengganti yang Diwajibkan**: Latar belakang datar solid (*solid neutral surfaces*) dengan kontras stabil sesuai tema aktif (Light, Dark, Sepia).
* **Contoh Larangan vs Pengganti**:
  * *Dilarang*: Header halaman beranda menggunakan `linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)`.
  * *Gunakan*: Header menggunakan warna latar permukaan tema solid (misal: `#121212` pada Dark Mode) dengan teks judul putih dan divider border bawah 1dp tipis `#27272A`.
* **Batas Penerapan**: Gradien linear satu arah hitam-ke-transparan (*scrim gradient*) dengan tinggi maksimal 40% tetap diperbolehkan khusus di atas gambar cover novel untuk menjamin keterbacaan teks overlay putih.

### 3.2 Glassmorphism & Panel Efek Kaca Buram pada UI Utama
* **Nama Indonesia**: Panel Kaca Buram / Efek Kaca Transparan.
* **Istilah Industri**: *Glassmorphism, Frosted Glass, Backdrop Blur Surfaces*.
* **Ciri Visual**: Panel semi-transparan dengan efek blur latar (`backdrop-filter: blur()`), border putih semi-transparan 1dp, dan bayangan halus bertumpuk.
* **Penggunaan yang Dilarang**: Bilah navigasi, kartu daftar bab, modal pengaturan reader, dan wadah teks cerita.
* **Alasan Larangan**: Kontras teks di atas panel buram berubah-ubah tergantung konten di belakangnya (pelanggaran WCAG 1.4.3), serta komputasi `backdrop-filter` menyebabkan *frame drop* dan baterai boros pada perangkat Android kelas menengah.
* **Pengganti yang Diwajibkan**: Permukaan opaque/solid dengan token warna permukaan (*surface tokens*) yang memiliki batas kontras jelas terhadap latar belakang.
* **Contoh Larangan vs Pengganti**:
  * *Dilarang*: Drawer daftar bab menggunakan latar belakang `rgba(30, 30, 30, 0.7)` dengan `blur(20px)`.
  * *Gunakan*: Drawer menggunakan latar belakang solid `#1E1E1E` (Dark Mode) dengan elevasi bayangan standar Material level 3 atau border pemisah 1dp solid.
* **Batas Penerapan**: Efek peredupan latar (*modal backdrop dimming*) berupa lapisan hitam datar semi-transparan (`rgba(0, 0, 0, 0.6)`) tanpa blur diperbolehkan untuk memfokuskan dialog/drawer.

### 3.3 Neumorphism / Soft UI
* **Nama Indonesia**: Permukaan Timbul-Tenggelam Halus.
* **Istilah Industri**: *Neumorphism, Soft UI, Embossed Surfaces*.
* **Ciri Visual**: Permukaan tombol dan kartu yang tampak menyatu dengan latar belakang, dibentuk oleh dua bayangan berlawanan arah (satu terang, satu gelap) tanpa garis batas tepi yang tegas.
* **Penggunaan yang Dilarang**: Tombol aksi, slider ukuran font, kotak pencarian, dan item daftar bab.
* **Alasan Larangan**: Menghancurkan batas fisik kontrol (*affordance* rendah), memiliki rasio kontras sangat buruk (< 2:1), dan membingungkan pengguna dengan penglihatan terbatas atau di bawah sinar matahari langsung.
* **Pengganti yang Diwajibkan**: Komponen dengan garis tepi tegas (*outlined*) atau warna bidang jelas (*filled*) dengan elevasi bayangan satu arah standar Android.
* **Contoh Larangan vs Pengganti**:
  * *Dilarang*: Tombol unduh bab berupa kotak timbul tanpa border dengan bayangan ganda `-4px -4px 8px #ffffff` dan `4px 4px 8px #d1d5db`.
  * *Gunakan*: Tombol unduh menggunakan ikon Material standar di dalam kontainer datar dengan border solid 1dp atau tombol aksi isi (*filled button*) berlatar solid.
* **Batas Penerapan**: Tidak ada pengecualian. Neumorphism dilarang sepenuhnya di seluruh UI.

### 3.4 Glow, Border Neon, dan Bayangan Bertumpuk Tanpa Fungsi
* **Nama Indonesia**: Efek Pendar Neon dan Bayangan Dekoratif Tebal.
* **Istilah Industri**: *Neon Glows, Glowing Borders, Multi-layered Heavy Drop Shadows*.
* **Ciri Visual**: Border kartu yang memancarkan cahaya berwarna (`box-shadow: 0 0 15px #3B82F6`), bayangan berwarna-warni (*colored shadows*), atau bayangan gelap beradius > 24px.
* **Penggunaan yang Dilarang**: Kartu novel, tombol aktif, badge status bab, dan penanda bookmark.
* **Alasan Larangan**: Menyilaukan mata pada kondisi gelap, memberi bobot visual palsu pada elemen sepele, dan membebani proses komposisi grafis perangkat.
* **Pengganti yang Diwajibkan**: Garis tepi tipis 1dp solid untuk membedakan kontur, atau elevasi bayangan netral hitam/abu-abu natural dengan sebaran pendek (1dp hingga 4dp) sesuai standar Material Design elevation.
* **Contoh Larangan vs Pengganti**:
  * *Dilarang*: Kartu novel yang sedang dibaca diberi pendaran biru neon `box-shadow: 0 0 12px rgba(59, 130, 246, 0.8)`.
  * *Gunakan*: Kartu novel aktif menggunakan penanda teks/badge netral "Sedang Dibaca" dengan border netral 1dp yang kontras.
* **Batas Penerapan**: Indikator fokus aksesibilitas sistem (*accessibility focus ring*) bawaan OS Android berwarna biru/oranye tetap aktif saat navigasi keyboard/talkback digunakan.

### 3.5 Teks Bergradien, Teks Bergaris Tepi, dan Tipografi Trik Dekoratif
* **Nama Indonesia**: Teks Gradien dan Teks Bergaris Tepi Dekoratif.
* **Istilah Industri**: *Gradient Text Fills, Text Stroke Effects, Novelty Typography FX*.
* **Ciri Visual**: Judul atau angka yang diisi dengan gradien warna-warni (`background-clip: text`), teks dengan garis luar tebal bergaya stiker komik, atau teks bertumpuk bayangan 3D.
* **Penggunaan yang Dilarang**: Judul novel, nomor bab, heading cerita level 1–6, label tombol, dan angka persentase membaca.
* **Alasan Larangan**: Keterbacaan teks merosot drastis pada ukuran kecil atau latar belakang dinamis; mengacaukan rendering sub-piksel tipografi pada layar ponsel Android berkerapatan piksel bervariasi.
* **Pengganti yang Diwajibkan**: Teks dengan warna solid bertoken semantik (`text-primary`, `text-secondary`) dan hierarki bobot huruf (*font-weight: 500/600/700*).
* **Contoh Larangan vs Pengganti**:
  * *Dilarang*: Judul bab "Chapter 14" diisi gradien emas ke oranye `linear-gradient(to right, #F59E0B, #EF4444)`.
  * *Gunakan*: Judul bab menggunakan font solid bertoken `text-primary` (`#FFFFFF` di Dark Mode, `#111827` di Light Mode, `#2D241E` di Sepia Mode) dengan bobot Semi-Bold (600).
* **Batas Penerapan**: Tipografi artistik yang sudah merupakan bagian grafis dari *cover raster* asli novel (berkas gambar luar) tidak termasuk larangan ini.

### 3.6 Bagian Hero Raksasa & Tipografi Bergaya Landing Page Pemasaran
* **Nama Indonesia**: Banner Hero Berlebihan dan Judul Raksasa Promosi.
* **Istilah Industri**: *Oversized Marketing Hero Sections, Landing Page Display Typography on App Screens*.
* **Ciri Visual**: Spanduk di atas layar setinggi > 50% tinggi viewport yang menampilkan ilustrasi promosi, teks display raksasa bergaya iklan web (36px–48px), dan ruang kosong masif.
* **Penggunaan yang Dilarang**: Halaman Discover/Beranda, halaman Library, dan halaman Detail Novel.
* **Alasan Larangan**: Menghabiskan ruang layar ponsel yang terbatas; pengguna aplikasi novel ingin langsung melihat daftar bacaan atau mencari bab, bukan membaca slogan promosi.
* **Pengganti yang Diwajibkan**: Header aplikasi fungsional yang ringkas (tinggi 48dp–56dp) dengan bilah pencarian instan dan feed konten yang langsung dapat diakses tanpa menggulir jauh.
* **Contoh Larangan vs Pengganti**:
  * *Dilarang*: Halaman Discover memuat hero banner 350dp dengan teks "Jelajahi Dunia Fantasi Tanpa Batas Sekarang Juga!".
  * *Gunakan*: Top bar 56dp berisi judul "Discover" dan search bar, diikuti langsung oleh seksi horizontal "Novel Populer" dan feed vertikal "Pembaruan Terbaru".
* **Batas Penerapan**: Halaman detail novel menampilkan cover novel berukuran proporsional (tinggi maksimal 160dp–180dp) yang berdampingan dengan metadata ringkas.

### 3.7 Bento Grid, "Card Soup", dan Kotak Bertumpuk Tanpa Kebutuhan
* **Nama Indonesia**: Tata Letak Bento Grid dan Kartu Bertumpuk Berlebihan.
* **Istilah Industri**: *Bento Grids, Card Soup* (label deskriptif informal), *Nested Card Containers*.
* **Ciri Visual**: Layar dipenuhi kotak-kotak kartu dengan ukuran bervariasi asimetris tak beraturan bergaya promosi gadget; setiap baris teks dibungkus dalam kartu tersendiri; kartu diletakkan di dalam kartu lain (*nested cards*).
* **Penggunaan yang Dilarang**: Halaman daftar bab, pengaturan reader, riwayat perpustakaan, dan detail novel.
* **Alasan Larangan**: Memecah aliran mata (*visual fragmentation*), memboroskan ruang layar karena margin dan padding berulang, serta membuat pemindaian daftar panjang menjadi lambat dan melelahkan.
* **Pengganti yang Diwajibkan**: Tampilan daftar datar (*flat list view*) dengan garis pemisah (*divider*) 1dp yang bersih, atau pengelompokan semantik sederhana menggunakan spasi vertikal.
* **Contoh Larangan vs Pengganti**:
  * *Dilarang*: Setiap bab novel dibungkus dalam kartu rounded tebal tersendiri dengan margin luar 8dp dan bayangan individu (*card soup*).
  * *Gunakan*: Daftar bab ditampilkan sebagai baris daftar datar (*flat list items*) dengan pembatas garis tipis 1dp, menampilkan nomor bab, judul, dan status unduh secara rapi.
* **Batas Penerapan**: Kartu tunggal (*single surface card*) diperbolehkan untuk item novel pada grid katalog 2-kolom di halaman Discover.

### 3.8 "Pill-Shaped Everything" & Radius Border Berlebihan Tanpa Hierarki
* **Nama Indonesia**: Bentuk Kapsul Berlebihan dan Sudut Lengkung Raksasa.
* **Istilah Industri**: *Pill-shaped Everything* (label deskriptif informal), *Uniform Extreme Border Radius*.
* **Ciri Visual**: Semua elemen—mulai dari kotak input teks, kartu novel, dialog, hingga wadah menu—menggunakan sudut lengkung bulat penuh (*fully rounded / border-radius: 9999px*).
* **Penggunaan yang Dilarang**: Kotak dialog, wadah kartu daftar bab, modal sheet, dan container reader.
* **Alasan Larangan**: Menghilangkan hierarki visual antara tombol aksi kecil dan wadah konten struktural; sudut lengkung raksasa pada kartu persegi memotong area bacaan di bagian sudut.
* **Pengganti yang Diwajibkan**: Sistem radius bertingkat yang proporsional dengan skala komponen:
  * Tag / Chip kecil: 4dp – 8dp.
  * Kartu / Input field: 8dp – 12dp.
  * Bottom Sheet / Dialog: 16dp pada sudut atas.
  * Sudut kapsul penuh (pill/9999px) **hanya** untuk tombol aksi mandiri (*action button*) atau *floating action button* jika diperlukan.
* **Contoh Larangan vs Pengganti**:
  * *Dilarang*: Wadah modal pengaturan reader berbentuk kapsul raksasa dengan border-radius 32dp.
  * *Gunakan*: Bottom sheet menggunakan sudut lengkung atas 16dp dan sudut bawah 0dp yang menempel di batas layar bawah.
* **Batas Penerapan**: Badge kategori/genre teks pendek dapat menggunakan radius 4dp–8dp.

### 3.9 Emoji sebagai Ikon Navigasi, Ikon Campur Aduk, dan Simbol AI/Sparkle
* **Nama Indonesia**: Penggunaan Emoji Navigasi, Inkonsistensi Koleksi Ikon, dan Simbol Sparkle/Robot.
* **Istilah Industri**: *Emoji as Navigation Icons, Inconsistent Icon Families, AI Sparkle / Magic Wand Tropes*.
* **Ciri Visual**: Menggunakan emoji sistem (seperti 📖, ⬇️, ⚙️, ⭐) sebagai ikon tombol antarmuka; mencampur ikon outline tipis dengan ikon filled tebal dari keluarga desain berbeda; menggunakan ikon kilauan (*sparkle/stars*) atau robot dekoratif.
* **Penggunaan yang Dilarang**: Bilah navigasi utama, tombol download, tombol bookmark, indikator pengaturan, dan header status.
* **Alasan Larangan**: Emoji di-render berbeda-beda di setiap merek ponsel Android (Samsung, Xiaomi, Google Pixel) dan tidak memiliki bobot visual seragam; motif sparkle menciptakan asosiasi fitur kecerdasan buatan palsu padahal aplikasi adalah pembaca teks murni.
* **Pengganti yang Diwajibkan**: Satu keluarga ikon vektor tunggal terstandar (misalnya: *Material Symbols Rounded* atau *Lucide Icons*) dengan ketebalan garis (*stroke*) dan ukuran seragam (20dp atau 24dp).
* **Contoh Larangan vs Pengganti**:
  * *Dilarang*: Tombol unduh menggunakan emoji "📥 Unduh Bab" dengan ikon kilau bintang "✨ Rekomendasi".
  * *Gunakan*: Tombol unduh menggunakan ikon vektor `download` standar Material berukuran 24dp bersanding dengan label teks sistem yang rapi.
* **Batas Penerapan**: Emoji hanya diizinkan jika secara sah merupakan bagian dari isi teks cerita novel yang ditulis oleh penulis/penerjemah asli.

### 3.10 Ilustrasi Stok Generik & Grafis Vektor Abstrak Tanpa Makna
* **Nama Indonesia**: Gambar Ilustrasi Stok Generik dan Vektor Abstrak Hampa.
* **Istilah Industri**: *Generic Stock Illustrations, Abstract Spot Graphics, Meaningless Placeholder Art*.
* **Ciri Visual**: Karakter manusia kartun bergaya korporat (*flat corporate illustrations*) dengan proporsi tubuh aneh melayang di udara, ilustrasi astronot/roket tanpa konteks pada halaman error.
* **Penggunaan yang Dilarang**: Layar status kosong (*empty state*), layar error 503, dan indikator mode offline.
* **Alasan Larangan**: Menghabiskan kapasitas unduhan aplikasi (*APK bloat*), meremehkan inteligensi pengguna, dan tidak menjelaskan solusi atas kendala yang dialami.
* **Pengganti yang Diwajibkan**: Ikon status monokromatik fungsional (misal: ikon `cloud-off` untuk offline, `bookmark-border` untuk pustaka kosong) disertai judul status yang jelas dan satu tombol tindakan solutif (*action button*).
* **Contoh Larangan vs Pengganti**:
  * *Dilarang*: Layar Pustaka Kosong menampilkan kartun orang berpose bingung di samping tumpukan buku raksasa setinggi 200dp.
  * *Gunakan*: Ikon `collections-bookmark` 48dp berwarna netral sekunder, teks judul "Belum Ada Novel Tersimpan", subteks "Bookmark novel favorit Anda untuk membacanya secara offline", dan tombol "Jelajahi Novel".
* **Batas Penerapan**: Gambar ilustrasi resmi dari penerbit yang disisipkan di dalam bab novel (`ImageBlock`) adalah konten sah dan wajib ditampilkan.

### 3.11 Pola Latar Belakang, Tekstur Noise, Grain, dan Ornamen Visual
* **Nama Indonesia**: Tekstur Kasar, Pola Geometris, dan Ornamen Latar.
* **Istilah Industri**: *Textured Backgrounds, Noise/Grain Overlays, Decorative Watermarks & Grid Patterns*.
* **Ciri Visual**: Latar belakang pembaca yang diberi efek pasir/bintik (*noise grain*), garis-garis kisi tipis (*grid lines*), atau ornamen sulur bunga di sudut halaman.
* **Penggunaan yang Dilarang**: Bidang baca reader, latar belakang dialog, dan bilah navigasi.
* **Alasan Larangan**: Menurunkan ketajaman teks (*font rendering clarity*), mengganggu konsentrasi membaca berjam-jam, dan berisiko menciptakan artefak distorsi pada panel layar OLED/AMOLED ponsel.
* **Pengganti yang Diwajibkan**: Latar belakang datar murni (*pure solid colors*) yang dikalibrasi sesuai tema:
  * Light: `#FFFFFF` atau `#F9FAFB`.
  * Dark: `#121212` atau `#18181B`.
  * Sepia: `#F4ECD8` atau `#EFE6D1`.
* **Contoh Larangan vs Pengganti**:
  * *Dilarang*: Halaman reader Sepia menggunakan gambar latar tekstur kertas kusut tua (*parchment paper texture*).
  * *Gunakan*: Halaman reader Sepia menggunakan warna bidang datar solid `#F4ECD8` dengan warna teks cokelat tua terkalibrasi `#433422`.
* **Batas Penerapan**: Garis pemisah adegan cerita (`<hr>` atau `SeparatorBlock`) dapat ditampilkan sebagai garis solid datar 1dp yang bersih atau tiga titik pemisah netral (`***`).

### 3.12 Teks Sekunder Terlalu Pucat & Kontras Rendah Demi Estetika
* **Nama Indonesia**: Teks Pucat Redup dan Kontras Huruf Terlalu Rendah.
* **Istilah Industri**: *Ultra Low-Contrast Secondary Text, Muted Low-Legibility Copy*.
* **Ciri Visual**: Tanggal rilis, nama penulis, nomor bab, atau sub-judul ditulis dengan warna abu-abu sangat muda (pada tema terang) atau abu-abu sangat gelap (pada tema gelap) yang nyaris menyatu dengan latar belakang.
* **Penggunaan yang Dilarang**: Metadata novel, judul bab pada daftar isi, label tombol navigasi, dan indikator persentase.
* **Alasan Larangan**: Melanggar standar aksesibilitas dasar (WCAG 2.1 SC 1.4.3), membuat informasi tanggal/bab tidak terbaca bagi pengguna yang membaca di bawah cahaya luar ruangan (*outdoor glare*).
* **Pengganti yang Diwajibkan**: Teks sekunder wajib mempertahankan rasio kontras minimal **4.5:1** terhadap warna latarnya.
* **Contoh Larangan vs Pengganti**:
  * *Dilarang*: Pada latar belakang putih `#FFFFFF`, tanggal bab ditulis dengan abu-abu pucat `#D1D5DB` (rasio kontras hanya 1.5:1).
  * *Gunakan*: Tanggal bab ditulis dengan warna abu-abu terkalibrasi `#4B5563` (rasio kontras 7.5:1, lulus WCAG Level AAA).
* **Batas Penerapan**: Teks elemen yang sengaja berstatus non-aktif (*disabled state*) diperbolehkan memiliki kontras lebih rendah, namun tetap harus memiliki rasio minimal **3.0:1** dan indikator status visual yang jelas.

### 3.13 Rata Tengah Berlebihan pada Konten Panjang dan Daftar
* **Nama Indonesia**: Penataan Teks Rata Tengah untuk Paragraf Panjang dan Daftar.
* **Istilah Industri**: *Excessive Center Alignment on Long-Form Text & Dense Lists*.
* **Ciri Visual**: Seluruh isi bab, sinopsis novel 4 paragraf, atau daftar 100 bab ditata dengan perataan rata tengah (`text-align: center`).
* **Penggunaan yang Dilarang**: Isi paragraf bab novel, teks sinopsis pada detail novel, dan teks daftar bab.
* **Alasan Larangan**: Menghilangkan garis tepi awal bacaan (*left anchor margin*); mata pembaca terpaksa mencari titik awal yang berbeda-beda di setiap baris baru, menyebabkan kelelahan membaca dan penurunan kecepatan baca drastis.
* **Pengganti yang Diwajibkan**:
  * Paragraf cerita dan sinopsis: Rata kiri (*Left-aligned / `text-align: left`*) dengan opsi rata kiri-kanan (*Justified*) yang didukung perataan kata yang baik.
  * Daftar bab: Rata kiri secara konsisten.
* **Contoh Larangan vs Pengganti**:
  * *Dilarang*: Paragraf teks cerita 500 kata diatur rata tengah di layar reader.
  * *Gunakan*: Paragraf cerita diatur rata kiri (`text-align: left`) dengan indentasi atau jarak antar paragraf yang konsisten.
* **Batas Penerapan**: Judul bab tunggal di awal halaman pembaca, label heading bab, atau teks status pada dialog konfirmasi singkat diperbolehkan rata tengah.

### 3.14 Badge / Tag / Chip Berlebihan dengan Warna Tanpa Makna
* **Nama Indonesia**: Hujan Lencana / Tag Warna-Warni Tanpa Arti.
* **Istilah Industri**: *Badge Overuse, Meaningless Rainbow Tags, Visual Tag Clutter*.
* **Ciri Visual**: Setiap kata pada kartu novel dibungkus badge kecil berwarna-warni acak (merah untuk fantasi, ungu untuk sihir, hijau untuk reinkarnasi, oranye untuk status); kartu tampak seperti pajangan stiker.
* **Penggunaan yang Dilarang**: Kartu katalog beranda dan header detail novel.
* **Alasan Larangan**: Membebani persepsi visual dengan puluhan warna tanpa arti semantik; mengalihkan fokus dari judul dan cover novel.
* **Pengganti yang Diwajibkan**:
  * Genre novel disajikan sebagai teks biasa dipisahkan koma atau chip monokromatik seragam berlatar netral dengan border tipis.
  * Warna fungsional hanya digunakan untuk status biner penting: Status "Tamat/Completed" (netral/hijau teredam), status "Ongoing" (netral/biru teredam).
* **Contoh Larangan vs Pengganti**:
  * *Dilarang*: Menampilkan 8 tag genre berwarna-warni mencolok di bawah judul novel pada kartu katalog kecil.
  * *Gunakan*: Menampilkan maksimal 2–3 genre utama dalam bentuk teks monokrom netral (misal: "Action, Isekai, Adventure") dengan tipografi sekunder yang rapi.
* **Batas Penerapan**: Tag status unduhan ("Terunduh" / "Mengunduh" / "Gagal") dapat menggunakan indikator warna semantik terkalibrasi (hijau, biru, merah) berdampingan dengan label teks eksplisit.

### 3.15 Animasi Berulang, Efek Parallax, dan Pantulan Berlebihan
* **Nama Indonesia**: Animasi Berulang Mengganggu, Efek Parallax Berat, dan Efek Pantul.
* **Istilah Industri**: *Looping Micro-Animations, Heavy Parallax, Spring/Bounce Motion*.
* **Ciri Visual**: Ikon bookmark yang terus bergoyang berulang-ulang (*infinite pulse/bounce*); cover novel yang bergeser secara parallax berlebihan saat halaman digulir; transisi drawer yang memantul keras (*heavy elastic bounce*).
* **Penggunaan yang Dilarang**: Navigasi pembaca, daftar bab, kartu novel, dan transisi antar layar.
* **Alasan Larangan**: Menyebabkan rasa pusing/mual visual (*vestibular motion sickness*), memakan sumber daya CPU/GPU yang memicu panas perangkat, dan memperlambat interaksi pengguna yang ingin membaca dengan cepat.
* **Pengganti yang Diwajibkan**: Transisi instan atau transisi linier/ease-out halus berdurasi pendek (**150 ms – 200 ms**) tanpa pantulan, serta wajib menghormati pengaturan pengurangan gerakan sistem (*prefers-reduced-motion*).
* **Contoh Larangan vs Pengganti**:
  * *Dilarang*: Saat menu reader dibuka, panel kontrol memantul tiga kali dengan efek pegas elastis (*spring bounce*).
  * *Gunakan*: Panel kontrol muncul dengan transisi *slide-up* atau *fade-in* sederhana berdurasi 150 ms dengan kurva standard easing Material Design.
* **Batas Penerapan**: Indikator aktivitas unduhan (*circular progress spinner*) diperbolehkan memiliki animasi rotasi terus-menerus selama proses download aktif berlangsung.

### 3.16 Kontrol Mengambang Permanen yang Menutupi Konten
* **Nama Indonesia**: Tombol Mengambang Permanen dan Overlay Penutup Teks.
* **Istilah Industri**: *Persistent Floating Action Overlays, Obstructive Floating Badges*.
* **Ciri Visual**: Tombol "Kembali ke Atas", tombol "Bab Selanjutnya", atau pill navigasi yang melayang permanen di atas teks cerita saat pengguna sedang membaca.
* **Penggunaan yang Dilarang**: Antarmuka membaca bab (*Reader screen*).
* **Alasan Larangan**: Menutupi baris kalimat novel yang sedang dibaca; memaksa pembaca terus menggulir ekstra hanya untuk membaca kata-kata yang tertutup tombol mengambang.
* **Pengganti yang Diwajibkan**:
  * Mode Membaca Murni: Layar pembaca **bebas 100%** dari kontrol mengambang saat sesi membaca aktif.
  * Menu pembantu (top bar dan bottom navigation bar) tersembunyi secara otomatis dan hanya muncul saat area tengah layar disentuh (*tap-to-toggle*).
  * Tombol "Bab Sebelumnya" dan "Bab Selanjutnya" diletakkan secara alami di akhir teks cerita (*in-flow footer*).
* **Contoh Larangan vs Pengganti**:
  * *Dilarang*: Tombol bulat melayang "Next Chapter" menempel di pojok kanan bawah layar menutupi 3 baris paragraf terakhir.
  * *Gunakan*: Tombol "Bab Selanjutnya" diletakkan di akhir bab setelah blok cerita terakhir selesai, atau diakses melalui overlay menu navigasi yang muncul saat layar diketuk.
* **Batas Penerapan**: Bilah navigasi bawah (*Bottom Navigation Bar*) tetap tampil secara menetap pada layar utama di luar reader (Discover dan Library).

---

## 4. Standar Pengganti yang Wajib (Normative Standards)

Untuk menjamin konsistensi di seluruh komponen aplikasi Android, seluruh pengembangan UI wajib berpedoman pada standar berikut:

### 4.1 Token Warna Semantik Tri-Tema
Aplikasi mendukung 3 tema resmi sesuai PRD. Setiap token warna memiliki peran semantik eksplisit:

| Peran Token Semantik | Light Mode | Dark Mode | Sepia Mode |
|---|---|---|---|
| `surface-background` | `#FFFFFF` | `#121212` | `#F4ECD8` |
| `surface-raised` (kartu/drawer) | `#F9FAFB` | `#1E1E1E` | `#EAE0C8` |
| `surface-overlay` (modal/menu) | `#FFFFFF` | `#242424` | `#E6DCB8` |
| `text-primary` | `#111827` (rasio > 14:1) | `#F3F4F6` (rasio > 13:1) | `#2D241E` (rasio > 11:1) |
| `text-secondary` | `#4B5563` (rasio > 7:1) | `#9CA3AF` (rasio > 6:1) | `#655344` (rasio > 5.5:1) |
| `border-subtle` | `#E5E7EB` | `#27272A` | `#DDD2B8` |
| `border-strong` | `#D1D5DB` | `#3F3F46` | `#C8BCA0` |
| `accent-primary` | `#2563EB` | `#3B82F6` | `#8B4513` |
| `accent-on-primary` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
| `status-error` | `#DC2626` | `#EF4444` | `#991B1B` |
| `status-success` | `#16A34A` | `#22C55E` | `#2E7D32` |

*Rasio kontras di atas dihitung terhadap `surface-background` masing-masing tema dan memenuhi standar WCAG 2.1 Level AA/AAA.*

### 4.2 Tipografi UI vs Tipografi Konten Bacaan
* **Tipografi Antarmuka (UI Typography)**:
  * Menggunakan font sistem standar Android (*Roboto*) atau *Inter*.
  * Skala Tipe Antarmuka:
    * `Headline`: 20sp / line-height 28sp (Semi-Bold 600).
    * `Title`: 16sp / line-height 24sp (Semi-Bold 600).
    * `Body`: 14sp / line-height 20sp (Regular 400).
    * `Label/Button`: 14sp / line-height 20sp (Medium 500).
    * `Caption`: 12sp / line-height 16sp (Regular 400).
* **Tipografi Konten Novel (Reader Typography)**:
  * Menggunakan 3 pilihan font lokal ter-bundle sesuai PRD: **Inter**, **Merriweather**, dan **OpenDyslexic**.
  * Ukuran font dapat disesuaikan pengguna: **12sp hingga 28sp** (default: **18sp**).
  * Jarak antar baris (*line height*) dapat disesuaikan: **1.4 hingga 2.2** (default: **1.75**).
  * Heading level 1–6 di dalam bab:
    * `Level 1 (h1)`: $1.5 \times$ ukuran font dasar (Bold).
    * `Level 2 (h2)`: $1.35 \times$ ukuran font dasar (Bold).
    * `Level 3 (h3)`: $1.2 \times$ ukuran font dasar (Semi-Bold).
    * `Level 4–6 (h4-h6)`: $1.05 \times$ s.d. $1.1 \times$ ukuran font dasar (Semi-Bold).

### 4.3 Spasi, Penataan, dan Skala Kisi (Spacing System)
* Mengadopsi sistem kelipatan **4dp / 8dp**:
  * `4dp` (`space-1`): Jarak internal antar ikon dan label kecil.
  * `8dp` (`space-2`): Jarak antar elemen dalam satu kelompok.
  * `12dp` (`space-3`): Padding internal input dan chip.
  * `16dp` (`space-4`): Padding standar sisi layar dan margin kartu.
  * `24dp` (`space-6`): Jarak vertikal antar seksi halaman.
  * `32dp` (`space-8`): Jarak vertikal pemisah konten utama.

### 4.4 Border, Sudut Lengkung (Radius), dan Elevasi
* **Border**: Ketebalan garis tepi standar adalah **1dp solid** menggunakan token `border-subtle`. Dilarang menggunakan border putus-putus (*dashed*) atau border berwarna neon.
* **Radius Sudut**:
  * Kontrol kecil (Badge / Chip): **4dp hingga 6dp**.
  * Kartu Novel / Search Bar: **8dp hingga 12dp**.
  * Modal Bottom Sheet: **16dp** khusus pada dua sudut atas (`borderTopLeftRadius`, `borderTopRightRadius`).
* **Elevasi Bayangan (Elevation Levels)**:
  * `Level 0` (Datar): Permukaan layar dasar (`elevation: 0`).
  * `Level 1` (Kartu Katalog): Bayangan sangat halus `elevation: 1` (Android) atau border 1dp solid tanpa bayangan.
  * `Level 2` (Top App Bar / Bottom Nav): `elevation: 3` atau border pemisah 1dp solid.
  * `Level 3` (Modal Drawer / Bottom Sheet): `elevation: 8` disertai lapisan redup latar (*dimmed overlay*).

### 4.5 Ikonografi
* Menggunakan satu keluarga ikon tunggal terpadu: **Material Symbols Rounded** (atau Lucide Icons).
* Ukuran standar ikon interaktif adalah **24dp**; ikon metadata kecil adalah **16dp**.
* Setiap ikon tombol yang berdiri sendiri tanpa teks pendamping **wajib** memiliki atribut `accessibilityLabel` untuk pembaca layar (*screen reader*).

### 4.6 Penanganan Cover Novel dan Ilustrasi Bab
* **Cover Novel**: Rasio aspek baku adalah **2:3** atau **3:4**. Tepi gambar diberi radius **6dp–8dp** dengan border tipis 1dp untuk mencegah tepi gambar menyatu dengan latar belakang gelap.
* **Gambar Cadangan (*Placeholder Cover*)**: Jika cover gagal termuat, gunakan kontainer netral berisi ikon buku monokromatik dan judul novel pendek. Dilarang menggunakan ilustrasi kartun generik.
* **Ilustrasi Bab (`ImageBlock`)**: Gambar di-render penuh sesuai lebar konten (*responsive width*), rata tengah, dengan teks alternatif (*alt text*) dan caption keterangan yang jelas di bawahnya jika tersedia.

### 4.7 Standar Komponen Kontrol Interaktif
* **Tombol (*Buttons*)**:
  * *Filled Primary*: Latar solid `accent-primary`, teks `accent-on-primary`, tinggi minimal 44dp, target sentuh 48dp.
  * *Outlined*: Latar transparan, border 1dp solid `border-strong`, teks `text-primary`.
  * *Text Button*: Tanpa border/latar, teks `accent-primary`, khusus untuk aksi sekunder seperti "Lihat Semua".
* **Input Pencarian (*Search Field*)**: Kontainer datar berlatar `surface-raised`, border 1dp `border-subtle`, ikon pencarian di sisi kiri, dan tombol pembersih "X" di sisi kanan saat terisi.
* **Daftar Bab (*Chapter List Item*)**: Baris datar vertikal setinggi minimal 48dp–52dp, memuat nomor bab, judul bab rata kiri, tanggal rilis, serta ikon status unduhan diskrit di sisi kanan.

### 4.8 Status Antarmuka Lengkap (UI States)
* **Loading State**:
  * Menggunakan *skeleton placeholder* datar dengan pulsa opasitas lambat (tidak menyilaukan) atau indikator putar (*spinner*) melingkar standar Material Design.
* **Empty State**:
  * Terdiri dari ikon outline netral 48dp, judul ringkas 16sp Semi-Bold, deskripsi penjelas 14sp Regular, dan satu tombol aksi primer.
* **Error State**:
  * Menyajikan pesan kesalahan berbahasa manusia yang jelas (misal: "Gagal memuat bab dari sumber") dan tombol solutif "Coba Lagi", bukan kode galat teknis mentah atau ilustrasi lelucon.
* **Offline State**:
  * Menampilkan bilah spanduk netral tipis di bawah top bar bertuliskan *"Mode Offline - Menampilkan konten tersimpan"* dengan kontras yang jelas.
* **Completed State**:
  * Bab yang telah selesai dibaca diberi penanda visual tenang (ikon centang kecil netral atau teks sekunder "Selesai dibaca"), tanpa efek ledakan konfeti atau popup mengganggu.

### 4.9 Standar Aksesibilitas Resmi (Accessibility Compliance)
Sesuai standar resmi **W3C Web Content Accessibility Guidelines (WCAG 2.1)** dan **Google Material Design Accessibility Guidelines**:
* **Rasio Kontras Minimum** (*WCAG 2.1 SC 1.4.3 Level AA*):
  * Teks normal (< 18sp): Wajib memiliki rasio kontras minimal **4.5:1** terhadap latar belakangnya.
  * Teks besar ($\ge$ 18sp atau $\ge$ 14sp tebal) dan komponen UI penting (*WCAG 2.1 SC 1.4.11*): Wajib memiliki rasio kontras minimal **3.0:1**.
* **Ukuran Target Sentuh Minimum** (*Android Material Design & WCAG 2.1 SC 2.5.5 / WCAG 2.2 SC 2.5.8*):
  * Setiap elemen interaktif (tombol, ikon panah, item bab, checkbox) wajib memiliki target sentuh minimal **$48 \times 48\text{ dp}$**. Jika visual ikon berukuran 24dp, tambahkan padding transparan minimal 12dp di sekelilingnya.
* **Dukungan Pembesaran Huruf Sistem** (*WCAG 2.1 SC 1.4.4 Resize Text*):
  * Seluruh teks UI harus menggunakan satuan `sp` (bukan pixel statis `dp`) sehingga dapat merespons pengaturan ukuran teks sistem operasi Android hingga **200%** tanpa terpotong (*clipped*) atau bertumpuk.
* **Bukan Berbasis Warna Semata** (*WCAG 2.1 SC 1.4.1 Use of Color*):
  * Status tidak boleh disampaikan melalui warna saja. Status bab terunduh harus menggunakan kombinasi warna hijau terkalibrasi DAN ikon centang/teks "Terunduh".

---

## 5. Penerapan Spesifik per Layar

### 5.1 Layar Discover & Pencarian
* **Struktur**: Top bar ringkas berisi search input $\rightarrow$ Seksi horizontal "Novel Populer" $\rightarrow$ Seksi vertikal "Pembaruan Terbaru".
* **Kartu Novel**: Kartu vertikal bersih dengan cover 2:3, judul novel (maksimal 2 baris, terpotong elipsis `...`), nama bab terbaru, dan waktu rilis relatif.
* **Dilarang**: Banner raksasa bergerak, border berkilau pada kartu trending, teks gradien pada judul novel.

### 5.2 Layar Detail Novel & Daftar Bab
* **Header Novel**: Kolom dua-sisi sederhana (cover di sisi kiri tinggi 140dp, metadata di sisi kanan: judul, penulis, status, genre).
* **Tombol Tindakan**: Tiga tombol fungsional berjejer rapi: "Mulai Baca" (Filled Primary), "Bookmark" (Outlined Icon), dan "Unduh" (Outlined Icon).
* **Daftar Bab**: Menampilkan jumlah bab, tombol toggle urutan (Ascending/Descending), dan daftar bab berbasis baris datar dengan pembatas garis 1dp.

### 5.3 Layar Reader (Inti Pengalaman Pengguna)
* **Status Membaca Aktif**:
  * Layar **100% bersih** dari header, footer, jam, baterai, tombol navigasi mengambang, atau ornamen tepi.
  * Paragraf teks di-render rata kiri dengan tipografi yang tenang sesuai ukuran yang dipilih pengguna.
* **Status Kontrol (Saat Layar Tengah Diketuk)**:
  * Menampilkan Top Bar: Tombol kembali, judul bab, dan tombol modal pengaturan tipografi.
  * Menampilkan Bottom Bar: Slider progres posisi membaca (dengan angka persentase $0\%$–$100\%$), tombol bab sebelumnya, tombol bab selanjutnya, dan tombol drawer daftar bab.
  * Seluruh bar kontrol berlatar belakang solid opaque sesuai tema (bukan frosted glass).

### 5.4 Layar Library (Pustaka Saya)
* **Tab Navigasi**: Tab sederhana "Terakhir Dibaca" dan "Bookmark".
* **Daftar Riwayat**: Menampilkan novel yang sedang dibaca beserta nomor bab terakhir, tanggal baca terakhir, dan progress bar tipis 4dp berwarna aksen di bawah kartu.
* **Status Kosong**: Ikon bookmark outline tenang disertai ajakan bertindak menuju Discover.

### 5.5 Layar Download Manager
* **Daftar Pekerjaan**: Menampilkan bab yang sedang dalam antrean, persentase unduhan aset teks dan gambar, status (`QUEUED`, `DOWNLOADING`, `PAUSED`, `FAILED`), tombol aksi jeda/lanjutkan (*Pause/Resume*), dan tombol batalkan (*Cancel*).
* **Penanganan Galat**: Jika unduhan gagal, tampilkan ikon peringatan merah tenang, alasan ringkas (misal: "Koneksi terputus"), dan tombol "Coba Lagi".

### 5.6 Modal Pengaturan Reader (Bottom Sheet)
* **Tata Letak**: Modal bottom sheet solid yang muncul dari bawah.
* **Kontrol**:
  * Pilihan Tema: 3 tombol radio visual sederhana (Light, Dark, Sepia) berlabel teks jelas.
  * Ukuran Font: Tombol minus/plus diskrit berdampingan dengan slider nilai ukuran (misal: "18sp").
  * Pilihan Font: Selector vertikal sederhana untuk memilih Inter, Merriweather, atau OpenDyslexic.
  * Jarak Baris: Pilihan segmen tombol (Kompak, Normal, Luas).

---

## 6. Batas Larangan & Pengecualian Fungsional (Valid Exceptions)

Pedoman ini melarang dekorasi yang merusak fungsi dan keterbacaan, **bukan** melarang teknik visual yang memiliki tujuan kegunaan nyata. Pengecualian berikut dinyatakan sah secara hukum desain:

1. **Cover Asli dan Gambar Cerita Novel**:
   * Gambar sampul (*cover art*) dan ilustrasi di dalam bab (`ImageBlock`) yang bersumber dari penerbit asli diperbolehkan memiliki warna-warni, efek artistik, atau gaya ilustrasi apa pun karena merupakan konten karya cipta sastra, bukan elemen antarmuka aplikasi.
2. **Scrim Gradien Pelindung Kontras Teks**:
   * Penggunaan gradien hitam-ke-transparan (*black-to-transparent scrim*) di atas bagian bawah gambar cover novel diperbolehkan semata-mata untuk memastikan teks judul novel berwarna putih di atasnya memenuhi rasio kontras WCAG 4.5:1.
3. **Elevasi Material untuk Menjelaskan Urutan Lapisan (Z-Index)**:
   * Bayangan halus (*elevation 1 s.d. 8*) diperbolehkan secara fungsional untuk membedakan lapisan mengambang (seperti drawer daftar bab atau bottom sheet modal) dari permukaan dasar pembaca.
4. **Chip / Badge Fungsional untuk Metadata**:
   * Penggunaan komponen chip berlatar netral diperbolehkan khusus untuk data kategorikal yang memiliki nilai informasi nyata (misalnya nama genre atau status novel "Tamat"), asalkan tidak menggunakan warna mencolok acak.
5. **Indikator Progres Interaktif**:
   * Bilah progres (*linear progress bar*) pada unduhan dan posisi membaca diperbolehkan menggunakan warna aksen primer karena membawa informasi status kuantitatif yang riil.

> [!CAUTION]
> Pengecualian fungsional di atas tidak boleh disalahgunakan untuk menghidupkan kembali pola dekoratif terlarang seperti gradien ungu-biru neon, efek pendar, atau kartu bertumpuk tanpa fungsi.

---

## 7. Checklist Review UI (Audit Gate)

Setiap implementasi layar atau komponen UI wajib diaudit menggunakan checklist berikut sebelum dinyatakan selesai. Jika terdapat satu butir bertanda **Wajib** yang berstatus **GAGAL**, UI dinyatakan cacat dan wajib diperbaiki.

### 7.1 Pemeriksaan Visual Statis (Berdasarkan Screenshot / Tampilan Diam)

| No | Kriteria Audit Visual | Status Kelulusan | Catatan Evaluasi |
|---|---|---|---|
| **V-01** | Bebas dari gradien ungu/biru neon generik, mesh gradient, dan gumpalan warna dekoratif (*blobs*). | [ ] LULUS / [ ] GAGAL | *Wajib* |
| **V-02** | Permukaan UI dan panel reader menggunakan warna solid opaque; bebas dari efek *glassmorphism / backdrop-blur*. | [ ] LULUS / [ ] GAGAL | *Wajib* |
| **V-03** | Bebas dari efek *neumorphism* (semua tombol memiliki batas kontur border atau bidang yang tegas). | [ ] LULUS / [ ] GAGAL | *Wajib* |
| **V-04** | Bebas dari efek *glow*, border neon, dan bayangan tebal bertumpuk. | [ ] LULUS / [ ] GAGAL | *Wajib* |
| **V-05** | Seluruh teks fungsional menggunakan warna solid; bebas dari *gradient text fill* atau *text stroke* dekoratif. | [ ] LULUS / [ ] GAGAL | *Wajib* |
| **V-06** | Tidak ada hero section raksasa bergaya promosi landing page pada layar utama. | [ ] LULUS / [ ] GAGAL | *Wajib* |
| **V-07** | Bebas dari *bento grids* dan *card soup* (daftar bab menggunakan baris daftar datar yang bersih). | [ ] LULUS / [ ] GAGAL | *Wajib* |
| **V-08** | Sudut lengkung border proporsional (tidak menggunakan *pill-shape* pada wadah konten/modal). | [ ] LULUS / [ ] GAGAL | *Wajib* |
| **V-09** | Ikon navigasi menggunakan satu keluarga vektor resmi (bebas dari emoji navigasi dan simbol sparkle/AI). | [ ] LULUS / [ ] GAGAL | *Wajib* |
| **V-10** | Status kosong/error menggunakan ikon status monokromatis fungsional (bebas dari kartun manusia flat generik). | [ ] LULUS / [ ] GAGAL | *Wajib* |
| **V-11** | Latar belakang reader datar bersih bebas dari tekstur noise, kertas kusut, atau ornamen sulur. | [ ] LULUS / [ ] GAGAL | *Wajib* |
| **V-12** | Seluruh teks paragraf cerita dan sinopsis ditata rata kiri (tidak rata tengah). | [ ] LULUS / [ ] GAGAL | *Wajib* |
| **V-13** | Komponen UI konsisten dan teruji kontrasnya pada ketiga tema resmi: Light, Dark, dan Sepia. | [ ] LULUS / [ ] GAGAL | *Wajib* |

### 7.2 Pemeriksaan Perilaku & Aksesibilitas (Berdasarkan Interaksi / Alat Ukur)

| No | Kriteria Audit Aksesibilitas & Perilaku | Status Kelulusan | Dasar Standar Resmi |
|---|---|---|---|
| **A-01** | Rasio kontras teks utama terhadap latarnya minimal **4.5:1** di ketiga tema. | [ ] LULUS / [ ] GAGAL | *WCAG 2.1 SC 1.4.3* |
| **A-02** | Rasio kontras teks besar / komponen interaktif minimal **3.0:1** di ketiga tema. | [ ] LULUS / [ ] GAGAL | *WCAG 2.1 SC 1.4.11* |
| **A-03** | Seluruh target sentuh tombol dan elemen interaktif minimal **$48 \times 48\text{ dp}$**. | [ ] LULUS / [ ] GAGAL | *Material Design & WCAG 2.5.5* |
| **A-04** | Seluruh teks UI berskala fleksibel (`sp`) saat ukuran font sistem Android dibesarkan hingga **200%**. | [ ] LULUS / [ ] GAGAL | *WCAG 2.1 SC 1.4.4* |
| **A-05** | Seluruh tombol icon-only memiliki atribut `accessibilityLabel` untuk screen reader TalkBack. | [ ] LULUS / [ ] GAGAL | *WCAG 2.1 SC 4.1.2* |
| **A-06** | Tidak ada penyampaian informasi yang hanya mengandalkan warna semata (disertai ikon/teks pembantu). | [ ] LULUS / [ ] GAGAL | *WCAG 2.1 SC 1.4.1* |
| **A-07** | Layar membaca bab bebas 100% dari kontrol mengambang yang menutupi baris teks saat aktif membaca. | [ ] LULUS / [ ] GAGAL | *Reader Usability Standard* |
| **A-08** | Tidak ada animasi bergoyang berulang (*looping motion*) atau pantulan pegas berlebihan (*spring bounce*). | [ ] LULUS / [ ] GAGAL | *Vestibular Motion Safety* |
| **A-09** | Aplikasi menghormati pengaturan pengurangan gerakan sistem (*prefers-reduced-motion*). | [ ] LULUS / [ ] GAGAL | *WCAG 2.1 SC 2.3.3* |
