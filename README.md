# Crowdfunding DApp

Platform galang dana berbasis smart contract Ethereum. Donasi disimpan di contract, dan setiap penarikan dana oleh penggalang dana harus disetujui donatur melalui voting.

## Struktur proyek

```
.
├── smart-contract/          Solidity 0.8.24 + Hardhat
│   ├── contracts/           Crowdfunding.sol (registry), Project.sol (satu kampanye)
│   ├── scripts/             deploy.js, seed.js (data demo)
│   └── test/                Unit test contract
├── frontend/                Next.js 14 + React 18 + Tailwind + Redux + web3.js
│   ├── pages/               Halaman (/, /dashboard, /my-contributions, /project-details/[id])
│   ├── components/          layout/, ui/, campaign/, withdraw/
│   ├── lib/                 config, format, campaign (aturan voting), contracts (akses blockchain), wallet, ...
│   ├── hooks/               useTransaction, useNow
│   ├── store/               Redux: wallet & daftar kampanye
│   ├── artifacts/           ABI hasil compile contract (ditulis otomatis oleh Hardhat)
│   └── __tests__/           Unit test frontend (Jest + Testing Library)
└── .github/workflows/ci.yml Test, lint, build, dan cek format otomatis
```

## Aturan platform

**Model dana: keep-it-all.** Penggalang dana boleh menarik dana berapa pun jumlah yang terkumpul, tidak harus mencapai target. Tidak ada refund.

| Aturan              | Keterangan                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| Donasi              | Dibuka sampai deadline, walaupun target sudah tercapai. Harus ≥ donasi minimum                       |
| Pembuat kampanye    | Tidak bisa berdonasi atau memberi suara di kampanyenya sendiri                                       |
| Pengajuan penarikan | Kapan saja, wajib ada alasan. Total pengajuan yang belum ditarik tidak boleh melebihi saldo contract |
| Pembatalan          | Pembuat bisa membatalkan pengajuan yang belum ditarik untuk melepas saldo yang dipesan               |

**Voting penarikan dana.** Donatur memilih _Setujui_ atau _Tolak_, satu alamat satu suara.

| Kondisi                                                       | Hasil              |
| ------------------------------------------------------------- | ------------------ |
| Setuju > 50% dari semua donatur                               | Langsung disetujui |
| Tolak > 50% dari semua donatur                                | Langsung ditolak   |
| Setelah 3 hari: pemilih ≥ 20% donatur **dan** setuju > tolak  | Disetujui          |
| Setelah 3 hari: kuorum tidak tercapai **atau** setuju ≤ tolak | Ditolak            |

Durasi voting dan kuorum diatur oleh `VOTING_PERIOD` dan `QUORUM_PERCENT` di `smart-contract/contracts/Project.sol`. Kalau diubah, samakan juga `VOTING_PERIOD_DAYS` dan `QUORUM_PERCENT` di `frontend/lib/campaign.js`.

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
npm run seed:local   # opsional: 3 kampanye + donasi contoh
npm run dev
```

Buka http://localhost:4000 dan klik **Hubungkan MetaMask**.

> Setiap kali `npm run node` di-restart, blockchain kembali kosong. Ulangi `deploy:local` (dan `seed:local`), lalu reset MetaMask (lihat di bawah).

## Setting MetaMask

Jaringan akan ditawarkan otomatis saat menghubungkan dompet. Kalau ingin menambahkannya manual:

| Kolom           | Nilai                   |
| --------------- | ----------------------- |
| Network name    | Hardhat Localhost       |
| RPC URL         | `http://127.0.0.1:8545` |
| Chain ID        | `31337`                 |
| Currency symbol | ETH                     |

**Akun test.** `npm run node` menampilkan 20 akun berisi 10000 ETH beserta private key-nya. Import beberapa akun ke MetaMask (_Add account → Import account_). Data demo dari `seed:local` memakai:

| Kampanye                          | Pembuat    | Donatur        |
| --------------------------------- | ---------- | -------------- |
| Beasiswa untuk 50 anak di pelosok | Account #0 | Account #1, #2 |
| Renovasi perpustakaan desa        | Account #1 | Account #0     |
| Air bersih untuk Nusa Tenggara    | Account #2 | Account #3     |

> Private key akun Hardhat bersifat publik. Jangan pernah dipakai di jaringan asli.

**Setelah node di-restart**, transaksi bisa gagal karena nonce lama. Buka MetaMask → _Settings → Advanced → Clear activity tab data_.

## Konfigurasi frontend (`frontend/.env.local`)

Nilai default sudah cocok untuk Hardhat node lokal. Kalau alamat contract atau jaringan berbeda (misalnya deploy ke testnet):

```bash
cp frontend/.env.example frontend/.env.local   # lalu edit nilainya, dan restart `npm run dev`
```

| Variabel                           | Default                                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_CROWDFUNDING_ADDRESS` | `0x5FbDB2315678afecb367f032d93F642f64180aa3`                                                   |
| `NEXT_PUBLIC_CHAIN_ID`             | `31337`                                                                                        |
| `NEXT_PUBLIC_RPC_URL`              | `http://127.0.0.1:8545`                                                                        |
| `NEXT_PUBLIC_NETWORK_NAME`         | `Hardhat Localhost`                                                                            |
| `NEXT_PUBLIC_EXPLORER_URL`         | kosong. Isi misalnya `https://sepolia.etherscan.io` agar hash transaksi penarikan menjadi link |

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

Setelah mengubah contract, jalankan `npm --prefix smart-contract run compile` agar ABI di `frontend/artifacts/` ikut diperbarui, lalu deploy ulang.

## Continuous Integration

Workflow `.github/workflows/ci.yml` berjalan setiap push ke `main`/`master` dan setiap pull request:

- **Smart contract**: `npm test` (Hardhat)
- **Frontend**: `npm run lint`, `npm test`, `npm run build`
- **Format**: `npm run format:check`

## Troubleshooting

| Masalah                               | Solusi                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| "Failed to connect to MetaMask"       | Unlock MetaMask, matikan ekstensi wallet lain, lalu refresh halaman                                           |
| Saldo 0 ETH di MetaMask               | Pastikan jaringan _Hardhat Localhost_ aktif dan akun Hardhat sudah di-import                                  |
| Transaksi gagal / nonce error         | _Settings → Advanced → Clear activity tab data_                                                               |
| Kampanye tidak muncul                 | Pastikan `npm run node` berjalan dan `npm run deploy:local` sudah dijalankan setelah node terakhir di-restart |
| `Error HH700: Artifact ... not found` | Cache Hardhat tidak sinkron. Jalankan `npx hardhat clean` lalu `npm run compile` di folder `smart-contract`   |
