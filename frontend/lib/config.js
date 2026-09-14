// Konfigurasi jaringan & alamat contract, diambil dari .env.local (lihat .env.example).
// Nilai default = Hardhat node lokal dengan contract hasil deploy pertama.
// Catatan: variabel NEXT_PUBLIC_* harus ditulis lengkap agar bisa dibaca Next.js di browser.

export const CROWDFUNDING_ADDRESS =
  process.env.NEXT_PUBLIC_CROWDFUNDING_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337);

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";

export const NETWORK_NAME = process.env.NEXT_PUBLIC_NETWORK_NAME || "Hardhat Localhost";

// Block explorer untuk link bukti transaksi, misalnya https://sepolia.etherscan.io (kosong = tanpa link)
export const EXPLORER_URL = (process.env.NEXT_PUBLIC_EXPLORER_URL || "").replace(/\/$/, "");
