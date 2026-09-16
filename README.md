# Crowdfunding DApp

Platform galang dana berbasis smart contract Ethereum. Donasi disimpan di contract, dan setiap penarikan dana oleh penggalang dana harus disetujui donatur melalui voting.

## Struktur proyek

```
.
├── smart-contract/          Solidity 0.8.24 + Hardhat
│   ├── contracts/           Crowdfunding.sol (registry & moderasi), Project.sol (satu kampanye)
│   ├── scripts/             deploy.js, seed.js (data demo)
│   └── test/                Unit test contract
├── frontend/                Next.js 15 + React 18 + Tailwind + Redux + ethers v6
│   ├── pages/               /, /dashboard, /my-contributions, /project-details/[id], /creators/[address]
│   ├── components/          layout/, ui/, campaign/, withdraw/
│   ├── lib/                 config, format, campaign (aturan voting), contracts (akses blockchain), wallet, share, ...
│   ├── hooks/               useWallet, useTransaction, useBlockRefresh, useNow
│   ├── store/               Redux: dompet, blok terbaru & daftar kampanye
│   ├── artifacts/           ABI hasil compile contract (ditulis otomatis oleh Hardhat)
│   └── __tests__/           Unit test frontend (Jest + Testing Library)
└── .github/workflows/ci.yml Test, coverage, Slither, lint, build, dan cek format otomatis
```

## Fitur

- **Kampanye**: kategori, gambar cover (link URL), cerita, target, donasi minimum, dan batas waktu
- **Jelajahi**: filter status & kategori, pencarian, urutan (terbaru, hampir berakhir, dana terbanyak, progres), pagination
- **Donasi** dengan pesan dukungan (maks. 280 karakter), perkiraan nilai Rupiah, dan riwayat donasi
- **Donatur teratas** (🥇🥈🥉), **grafik perkembangan donasi**, dan **riwayat aktivitas** lengkap per kampanye
- **Favorit**: simpan kampanye dengan tombol ♥ (tersimpan di browser), lalu filter _Favorit_ di halaman jelajahi
- **Lokasi kampanye**: 38 provinsi (plus Nasional/Online & Luar Negeri) dengan filter provinsi di halaman jelajahi
- **Pencarian** berdasarkan judul, cerita, nama profil/ENS penggalang dana, atau alamat dompet
- **Kelola kampanye**: edit cerita, gambar, kategori, dan provinsi (dengan **riwayat edit** sebelum/sesudah); perpanjang deadline satu kali; tutup donasi lebih awal; batalkan kampanye
- **Voting penarikan dana** (setuju/tolak) dengan progres suara, batas waktu, dan kuorum
- **Kabar terbaru** dari penggalang dana, tersimpan permanen di blockchain
- **Transparansi dana**: terkumpul / sudah ditarik / tersisa, bukti transaksi penarikan
- **Dana terbengkalai**: donatur bisa menarik kembali sisa dana jika penggalang dana tidak aktif
- **Moderasi**: laporan kampanye mencurigakan (publik), badge _Terverifikasi_, dan **takedown** kampanye oleh admin
- **Notifikasi** (ikon lonceng): donasi & voting di kampanyemu, permintaan penarikan & kabar dari kampanye yang kamu dukung atau favoritkan, keputusan banding, dan **pengingat** kampanye favorit yang berakhir ≤ 3 hari lagi
- **Nama profil & ENS**: alamat dompet ditampilkan sebagai nama profil (disimpan di contract) atau nama ENS
- **Statistik platform** (`/stats`): total dana, donatur unik, donasi per hari, dana per kategori, kampanye & donatur teratas
- **Profil & statistik penggalang dana** (`/creators/<alamat>`): total dana, donatur unik, grafik donasi per hari
- **Panel admin** (`/admin`): kampanye yang dilaporkan, antrean verifikasi, dan daftar terverifikasi
- **Tombol bagikan** (salin link, WhatsApp, X, Telegram, Facebook) dengan **preview link** (judul, deskripsi, dan gambar progres otomatis via `/api/og`)
- **Bahasa Indonesia / English** dan **mode gelap**: toggle di navbar, pilihan tersimpan di browser
- **Real-time**: data diperbarui otomatis setiap ada transaksi baru, tanpa refresh
- **Status koneksi**: tombol hubungkan dompet, peringatan jaringan salah, dan pesan jika blockchain tidak bisa dihubungi

## Aturan platform

**Model dana: keep-it-all.** Penggalang dana boleh menarik dana berapa pun jumlah yang terkumpul, tidak harus mencapai target.

| Aturan              | Keterangan                                                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Donasi              | Dibuka sampai deadline, walaupun target sudah tercapai. Harus ≥ donasi minimum                                                                                                      |
| Pembuat kampanye    | Tidak bisa berdonasi, memberi suara, atau melaporkan kampanyenya sendiri                                                                                                            |
| Pengajuan penarikan | Kapan saja, wajib ada alasan. Total pengajuan yang belum ditarik tidak boleh melebihi saldo contract                                                                                |
| Pembatalan          | Pembuat bisa membatalkan pengajuan yang belum ditarik untuk melepas saldo yang dipesan                                                                                              |
| Edit kampanye       | Hanya cerita, gambar, dan kategori, selama kampanye berjalan. Judul, target, dan minimum tetap                                                                                      |
| Perpanjang deadline | Satu kali, maksimal 30 hari, sebelum deadline, dan hanya jika target belum tercapai                                                                                                 |
| Tutup donasi awal   | Kapan saja sebelum deadline. Deadline menjadi saat itu; voting & penarikan tetap berjalan                                                                                           |
| Batalkan kampanye   | Kapan saja oleh pembuat, wajib alasan. Donasi & penarikan berhenti, pengajuan terbuka ikut batal                                                                                    |
| Takedown (admin)    | Sama seperti pembatalan, badge terverifikasi dicabut, dan kampanye disembunyikan dari halaman jelajahi                                                                              |
| Banding takedown    | Pembuat mengajukan 1x, maks. 14 hari setelah takedown. Jika diterima admin: label takedown dicabut & tampil lagi di daftar, tapi kampanye tetap dibatalkan dan refund tetap terbuka |
| Nama profil         | Maks. 32 byte, tidak unik (alamat dompet tetap ditampilkan). Urutan: nama profil → ENS → alamat                                                                                     |

**Voting penarikan dana.** Donatur memilih _Setujui_ atau _Tolak_, satu alamat satu suara. Yang berhak memilih hanya donatur yang **sudah berdonasi saat permintaan dibuat**, sehingga donatur baru tidak bisa mengubah keputusan.

| Kondisi                                                                       | Hasil              |
| ----------------------------------------------------------------------------- | ------------------ |
| Setuju > 50% pemilih yang berhak                                              | Langsung disetujui |
| Tolak > 50% pemilih yang berhak                                               | Langsung ditolak   |
| Setelah 3 hari: yang memilih ≥ 20% pemilih yang berhak **dan** setuju > tolak | Disetujui          |
| Setelah 3 hari: kuorum tidak tercapai **atau** setuju ≤ tolak                 | Ditolak            |

**Dana terbengkalai.** Jika penggalang dana tidak mengajukan atau menarik dana selama **30 hari** setelah kampanye berakhir (atau setelah aktivitas terakhirnya), donatur dapat menarik kembali sisa dana sesuai porsi donasinya. Setelah itu penggalang dana tidak bisa lagi mengajukan atau menarik dana.

**Refund.** Saat kampanye dibatalkan (oleh pembuat atau takedown admin), donatur dapat menarik kembali **sisa saldo** kampanye sesuai porsi donasinya, sama seperti dana terbengkalai. Dana yang sudah ditarik sebelumnya tidak ikut dikembalikan.

**Moderasi.** Siapa pun (kecuali pembuat kampanye) dapat melaporkan kampanye satu kali beserta alasan; laporan tercatat publik. Badge _Terverifikasi_ hanya bisa diberikan atau dicabut oleh **admin, yaitu akun yang men-deploy contract**.

Konstanta aturan (`VOTING_PERIOD`, `QUORUM_PERCENT`, `ABANDON_PERIOD`, `MAX_EXTENSION`, `MAX_MESSAGE_LENGTH`) ada di `smart-contract/contracts/Project.sol`. Kalau diubah, samakan juga konstanta di `frontend/lib/campaign.js`.

## Prasyarat

- Node.js 20
- Browser dengan ekstensi [MetaMask](https://metamask.io/download/)

## Menjalankan di komputer lokal

Pertama kali, pasang semua dependency dari root proyek:

```bash
npm run install:all
```

Lalu buka **dua terminal** di root proyek:

```bash
# Terminal 1 — blockchain lokal (biarkan tetap berjalan)
npm run node
```

```bash
# Terminal 2 — deploy contract, isi data demo, jalankan frontend
npm run deploy:local
npm run seed:local   # opsional: 3 kampanye, donasi, kabar, dan 1 kampanye terverifikasi
npm run dev
```

Buka http://localhost:4000 dan klik **Hubungkan MetaMask**.

> Setiap kali `npm run node` di-restart, blockchain kembali kosong. Ulangi `deploy:local` (dan `seed:local`), lalu reset MetaMask (lihat di bawah).

**Mode dev tanpa MetaMask.** Di jaringan lokal (chain 31337), browser tanpa MetaMask otomatis memakai Account #0 dari Hardhat (ditandai `dev` di navbar). Berguna untuk mencoba cepat; untuk berganti akun gunakan MetaMask.

## Setting MetaMask

Jaringan akan ditawarkan otomatis saat menghubungkan dompet. Kalau ingin menambahkannya manual:

| Kolom           | Nilai                   |
| --------------- | ----------------------- |
| Network name    | Hardhat Localhost       |
| RPC URL         | `http://127.0.0.1:8545` |
| Chain ID        | `31337`                 |
| Currency symbol | ETH                     |

**Akun test.** `npm run node` menampilkan 20 akun berisi 10000 ETH beserta private key-nya. Import beberapa akun ke MetaMask (_Add account → Import account_). Data demo dari `seed:local` memakai:

| Kampanye                          | Pembuat    | Donatur        | Catatan                        |
| --------------------------------- | ---------- | -------------- | ------------------------------ |
| Beasiswa untuk 50 anak di pelosok | Account #0 | Account #1, #2 | Ada 1 kabar terbaru            |
| Renovasi perpustakaan desa        | Account #1 | Account #0     |                                |
| Air bersih untuk Nusa Tenggara    | Account #2 | Account #3     | Target tercapai, terverifikasi |

Account #0 juga admin (akun deployer).

> Private key akun Hardhat bersifat publik. Jangan pernah dipakai di jaringan asli.

**Setelah node di-restart**, transaksi bisa gagal karena nonce lama. Buka MetaMask → _Settings → Advanced → Clear activity tab data_.

## Konfigurasi frontend (`frontend/.env.local`)

Nilai default sudah cocok untuk Hardhat node lokal. Kalau alamat contract atau jaringan berbeda (misalnya deploy ke testnet):

```bash
cp frontend/.env.example frontend/.env.local   # lalu edit nilainya, dan restart `npm run dev`
```

| Variabel                           | Default                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_CROWDFUNDING_ADDRESS` | `0x5FbDB2315678afecb367f032d93F642f64180aa3`                                                      |
| `NEXT_PUBLIC_CHAIN_ID`             | `31337`                                                                                           |
| `NEXT_PUBLIC_RPC_URL`              | `http://127.0.0.1:8545`                                                                           |
| `NEXT_PUBLIC_NETWORK_NAME`         | `Hardhat Localhost`                                                                               |
| `NEXT_PUBLIC_EXPLORER_URL`         | kosong. Isi misalnya `https://sepolia.etherscan.io` agar hash transaksi penarikan menjadi link    |
| `NEXT_PUBLIC_ENS_RPC_URL`          | RPC Ethereum mainnet untuk nama & avatar ENS (default publicnode). Isi kosong untuk menonaktifkan |
| `NEXT_PUBLIC_APP_URL`              | kosong. Alamat publik aplikasi untuk tautan _Bagikan_ dan preview link                            |

**Perkiraan nilai Rupiah** diambil dari API publik CoinGecko (kurs ETH/IDR, di-cache 5 menit). Jika gagal dimuat (misalnya offline), nilai Rupiah disembunyikan dan aplikasi tetap berjalan normal. Di jaringan lokal/testnet ETH tidak bernilai uang; angka Rupiah hanya ilustrasi.

## Perintah

Semua perintah dijalankan dari root proyek.

| Perintah               | Fungsi                                                   |
| ---------------------- | -------------------------------------------------------- |
| `npm run install:all`  | Pasang dependency root, `smart-contract`, dan `frontend` |
| `npm run node`         | Menjalankan blockchain lokal (Hardhat)                   |
| `npm run deploy:local` | Deploy contract ke node lokal                            |
| `npm run seed:local`   | Mengisi data demo                                        |
| `npm run dev`          | Frontend di http://localhost:4000                        |
| `npm test`             | Unit test contract (Hardhat) dan frontend (Jest)         |
| `npm run lint`         | ESLint frontend                                          |
| `npm run build`        | Build produksi frontend                                  |
| `npm run format`       | Format semua file (Prettier, termasuk Solidity)          |
| `npm run format:check` | Cek format tanpa mengubah file                           |

Perintah khusus smart contract (jalankan dengan `npm --prefix smart-contract run <perintah>`):

| Perintah   | Fungsi                                                                        |
| ---------- | ----------------------------------------------------------------------------- |
| `compile`  | Compile contract; ABI di `frontend/artifacts/` ikut diperbarui                |
| `coverage` | Laporan cakupan test (`smart-contract/coverage/`)                             |
| `test:gas` | Test beserta laporan biaya gas per fungsi                                     |
| `slither`  | Analisis keamanan statis (butuh [Slither](https://github.com/crytic/slither)) |

Setelah mengubah contract, jalankan `compile` lalu deploy ulang.

## Continuous Integration

Workflow `.github/workflows/ci.yml` berjalan setiap push ke `main`/`master` dan setiap pull request:

- **Smart contract**: `npm test` dan `npm run coverage`
- **Slither**: analisis keamanan, gagal jika ada temuan tingkat _medium_ ke atas
- **Frontend**: `npm run lint`, `npm test`, `npm run build`
- **Format**: `npm run format:check`

## Troubleshooting

| Masalah                               | Solusi                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Banner merah "Tidak dapat terhubung"  | Pastikan `npm run node` berjalan dan `npm run deploy:local` sudah dijalankan setelah node terakhir di-restart |
| Banner kuning "jaringan lain"         | Klik tombol _Pindah ke Hardhat Localhost_ di banner                                                           |
| "Failed to connect to MetaMask"       | Unlock MetaMask, matikan ekstensi wallet lain, lalu refresh halaman                                           |
| Saldo 0 ETH di MetaMask               | Pastikan jaringan _Hardhat Localhost_ aktif dan akun Hardhat sudah di-import                                  |
| Transaksi gagal / nonce error         | _Settings → Advanced → Clear activity tab data_                                                               |
| `Error HH700: Artifact ... not found` | Cache Hardhat tidak sinkron. Jalankan `npx hardhat clean` lalu `npm run compile` di folder `smart-contract`   |
