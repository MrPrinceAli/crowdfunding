# Arsitektur

Dokumen singkat tentang cara kerja kode. Untuk aturan platform, lihat [ATURAN.md](ATURAN.md).

## Gambaran besar

```
Browser (Next.js)
   │  baca data  ──────────────►  JsonRpcProvider  ──►  Blockchain
   │  (tanpa dompet, selalu bisa)                        (Hardhat / testnet)
   │                                                        ▲
   └─ kirim transaksi ─────────►  BrowserProvider ──────────┘
                                  (MetaMask menandatangani)
```

- **Baca** tidak butuh dompet, sehingga kampanye tetap tampil walau MetaMask belum terhubung
  atau sedang berada di jaringan lain.
- **Tulis** selalu lewat dompet pengguna. Tidak ada server backend, tidak ada database.

## Dua smart contract

| Contract           | Peran                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `Crowdfunding.sol` | Registry: membuat kampanye, meneruskan donasi, moderasi (laporan, verifikasi, takedown, banding), nama profil |
| `Project.sol`      | Satu kampanye: donasi, pengelolaan, permintaan penarikan & voting, refund                                     |

`Crowdfunding` membuat `Project` baru setiap kampanye dibuat, dan hanya dia yang boleh meneruskan
donasi ke `Project` (`onlyCrowdfunding`). Jadi tidak ada kampanye "liar" di luar registry.

## Dari contract ke layar

1. **ABI & konstanta.** `npm run compile` menulis ABI ke `frontend/lib/abi/*.json` dan konstanta
   aturan ke `rules.json`. Hasil compile Hardhat sendiri tidak masuk repo.
2. **Akses blockchain.** Semua ada di `frontend/lib/chain/`, dipakai lewat satu pintu `lib/contracts.js`:

   | Berkas          | Isi                                                      |
   | --------------- | -------------------------------------------------------- |
   | `client.js`     | Provider, signer, dan helper bersama (waktu blok, kirim) |
   | `campaigns.js`  | Kampanye, donasi, pengelolaan, refund                    |
   | `withdraw.js`   | Permintaan penarikan & voting                            |
   | `moderation.js` | Laporan, verifikasi, banding, nama profil                |
   | `activity.js`   | Riwayat aktivitas & data statistik (dibaca dari event)   |

3. **State.** Redux menyimpan tiga hal saja: kondisi dompet, nomor blok terbaru, dan daftar kampanye.
   Data per halaman (donasi, voting, riwayat) diambil di komponennya masing-masing.
4. **Tampilan.** Komponen memakai kelas semantik (`card`, `text-strong`, `badge-emerald`, …) yang
   sudah sadar mode gelap, jadi tidak ada warna yang ditulis ulang di tiap komponen.

## Real-time tanpa refresh

`pages/_app.js` mendengarkan event `block` dari provider. Setiap blok baru:

1. Nomor blok masuk ke Redux.
2. `useBlockRefresh(callback)` di tiap halaman memuat ulang datanya, dibatasi paling cepat 3 detik
   sekali (5 detik untuk notifikasi) agar tidak membanjiri RPC.

Karena itu donasi atau voting dari orang lain langsung terlihat tanpa menekan refresh.

## Riwayat & statistik dibaca dari event

Tidak ada database, jadi riwayat aktivitas, pesan dukungan, kabar, laporan, dan grafik semuanya
disusun dari **event** contract (`FundingReceived`, `WithdrawCompleted`, `ProjectCancelled`, …).
Konsekuensinya: data selalu jujur mengikuti blockchain, tetapi pembacaannya berat kalau data sudah
banyak. Untuk jaringan publik, langkah berikutnya adalah indexer (mis. The Graph) atau cache.

## Keputusan desain yang perlu diketahui

| Keputusan                                     | Alasan                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Refund ditarik sendiri (pull), bukan dikirim  | Mengirim ke semua donatur sekaligus boros gas dan bisa gagal total gara-gara satu penerima |
| Saldo refund dibekukan saat klaim pertama     | Supaya urutan klaim tidak memengaruhi besar jatah tiap donatur                             |
| Snapshot pemilih saat permintaan dibuat       | Donatur baru tidak bisa mengubah hasil voting yang sedang berjalan                         |
| Teks panjang disimpan di event, bukan storage | Jauh lebih murah gas, tetap permanen dan bisa diverifikasi                                 |
| Favorit & status baca notifikasi di browser   | Data pribadi ringan, tidak perlu biaya gas                                                 |
| Nama profil tidak unik                        | Menghindari sistem klaim nama; alamat dompet tetap ditampilkan agar bisa dicek             |

## Pengujian

| Lapisan        | Alat                   | Cakupan                                                           |
| -------------- | ---------------------- | ----------------------------------------------------------------- |
| Smart contract | Hardhat + Chai         | 93 test, 100% baris; Slither untuk analisis keamanan statis       |
| Frontend       | Jest + Testing Library | 72 test: logika murni, komponen alur uang, dan kelengkapan bahasa |

CI menjalankan semuanya plus lint, build, dan cek format di setiap push.
