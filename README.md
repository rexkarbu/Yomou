# YomouNovel (読もう)

Aplikasi pembaca Light Novel (LN) berbahasa Indonesia berbasis Android dengan antarmuka bersih tanpa iklan, kapabilitas *offline-first* yang tangguh, serta backend proxy scraping yang aman dan terstruktur.

---

## 📖 Gambaran Proyek

Situs agregator novel web publik umumnya dipenuhi iklan pop-up agresif, redirect berbahaya, dan tata letak yang kurang nyaman untuk layar ponsel. **YomouNovel** memecahkan masalah ini dengan memisahkan ekstraksi konten dari penyajian antarmuka:

* **Backend Proxy & Sanitizer**: Mengambil markup HTML dari situs sumber (Meionovels), membersihkan iklan/skrip berbahaya, mem-parsing teks cerita menjadi **Array Blok Terstruktur (`ContentBlock[]`)**, dan melayani data JSON melalui REST API yang di-cache menggunakan In-Memory LRU.
* **Client Reader (Android Mobile)**: Menampilkan novel dengan tipografi nyaman (pilihan font Inter, Merriweather, OpenDyslexic), tri-tema (Light, Dark, Sepia), pelacakan progres membaca berbasis *block-index anchoring*, serta persistensi penuh via SQLite dan filesystem lokal untuk mode offline (*cold start*).

---

## 🏗️ Arsitektur Monorepo

Repositori ini dikelola sebagai monorepo npm dengan struktur sebagai berikut:

```text
yomou/
├── client/                 # Aplikasi Mobile Android (Expo / React Native)
│   ├── app.json            # Manifest konfigurasi Expo (com.yomou.novel)
│   ├── App.tsx             # Root component antarmuka client
│   ├── index.ts            # Entry point pendaftaran aplikasi
│   ├── src/
│   │   └── types/          # Kontrak tipe data bersama (ContentBlock, API, Novel)
│   ├── assets/             # Ikon aplikasi dan splash screen
│   ├── package.json
│   └── tsconfig.json
├── server/                 # Layanan Backend Scraper Proxy (Node.js + Hono.js)
│   ├── src/
│   │   ├── index.ts        # Bootstrap server Hono & health check
│   │   └── types/          # Kontrak tipe data bersama (ContentBlock, API, Novel)
│   ├── dist/               # Hasil kompilasi TypeScript
│   ├── package.json
│   └── tsconfig.json
├── docs/                   # Spesifikasi Kanonik Proyek
│   ├── PRD.md              # Product Requirements Document (MVP Edition)
│   ├── anti-patterns-ui.md # Pedoman Desain & Larangan Anti-Pattern AI-Slop
│   └── tasks.md            # Rencana Kerja & Daftar Tugas Bertahap (Single Source of Truth)
├── .agents/                # Standar & Custom Agent Skills (Ponytail, Anti-Slop, Scraper Resilience)
├── package.json            # Root workspace npm & skrip orkestrasi
├── package-lock.json
└── .gitignore
```

---

## 🛠️ Tech Stack

### Client (Android Mobile)
* **Framework**: React Native (Expo Managed Workflow SDK 57, TypeScript)
* **Target OS**: Android 8.0+ (API Level 26+)
* **Styling**: NativeWind (Tailwind CSS untuk React Native)
* **State Management**: TanStack Query v5 (server cache) + Zustand (ephemeral state)
* **Persistensi Data**: `expo-sqlite` (database relasional untuk novel, bab, bookmark, riwayat baca, antrean unduhan)
* **Penyimpanan Berkas**: `expo-file-system` (cover novel dan ilustrasi bab offline)
* **Hardware**: `expo-keep-awake` (mencegah layar mati saat membaca)

### Server (Scraper Proxy)
* **Runtime**: Node.js (v20+)
* **Web Framework**: Hono.js (`@hono/node-server`)
* **HTML Parser**: Cheerio
* **HTTP Client**: Axios dengan custom User-Agent, referer rotation, dan hard timeout 8s
* **Cache Engine**: In-Memory LRU Cache (`lru-cache`)
* **Language**: TypeScript (target ES2022, NodeNext resolution)

---

## 🚀 Memulai (Quick Start)

### Prasyarat
* [Node.js](https://nodejs.org/) v20 atau lebih baru (disarankan LTS)
* npm v10 atau lebih baru
* Perangkat Android fisik dengan aplikasi [Expo Go](https://expo.dev/go) atau Emulator Android Studio

### 1. Instalasi Dependensi
Jalankan perintah ini di root repositori untuk menginstal seluruh dependensi workspace (`server` dan `client`) secara terisolasi:

```bash
npm install
```

### 2. Menjalankan Backend Server
Jalankan server proxy Hono di port 3000:

```bash
# Mode pengembangan (dengan live reload tsx)
npm run dev:server

# Atau jalankan hasil build produksi
npm run build:server
npm run start:server
```

Uji ketersediaan server:
```bash
curl http://localhost:3000/health
# Respons: {"status":"ok","service":"yomou-server"}
```

### 3. Menjalankan Aplikasi Client
Mulai Expo Metro bundler:

```bash
npm run start:client
```
* Tekan `a` pada terminal untuk membuka di Emulator Android yang terhubung.
* Atau pindai QR Code menggunakan aplikasi **Expo Go** pada ponsel Android Anda.

---

## 🧪 Skrip Verifikasi & Pengecekan Kualitas

Repositori dilengkapi skrip terpadu untuk memverifikasi tipe dan biner:

```bash
# Kompilasi TypeScript server
npm run build:server

# Typecheck statis client tanpa emit
npm run typecheck:client

# Bundling biner Hermes Expo untuk Android
cd client && npx expo export -p android
```

---

## 📚 Dokumen Spesifikasi Kanonik

Seluruh keputusan teknis, arsitektur, dan pedoman desain diatur dalam folder `docs/`:

1. **[docs/PRD.md](docs/PRD.md)**: Spesifikasi produk lengkap, diagram alur, skema SQLite relasional, kontrak `ContentBlock[]`, kebijakan cache TTL, dan Service Level Agreement (SLA).
2. **[docs/anti-patterns-ui.md](docs/anti-patterns-ui.md)**: Pedoman resmi larangan 16 pola visual generik (*AI-slop*), token warna tri-tema (Light, Dark, Sepia), dan checklist aksesibilitas (WCAG 2.1 AA & Material Design).
3. **[docs/tasks.md](docs/tasks.md)**: Lembar kerja tunggal kanonik yang memetakan implementasi tugas demi tugas secara berurutan dan terverifikasi.

---

## 📄 Lisensi

Proyek ini dikembangkan di bawah lisensi MIT. Lihat file [LICENSE](client/LICENSE) untuk informasi lebih lanjut.
