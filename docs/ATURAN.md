# Aturan platform

Dokumen ini merinci aturan yang dijalankan smart contract. Ringkasan alurnya ada di [README](../README.md).

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

## Dari mana angka aturan berasal

Semua angka (3 hari voting, kuorum 20%, 30 hari terbengkalai, 14 hari banding, batas panjang teks)
ditulis sekali saja sebagai `uint256 public constant` di Solidity.

`npm run compile` meng-export nilainya ke `frontend/lib/abi/rules.json`, dan `frontend/lib/campaign.js`
menurunkan seluruh konstanta frontend dari file itu. Jadi cukup ubah Solidity lalu compile ulang;
tidak ada angka yang perlu diubah manual di frontend. Test `frontend/__tests__/lib/rules.test.js`
menjaga keduanya tetap sama.
