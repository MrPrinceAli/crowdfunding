/**
 * Satu pintu untuk mencatat kegagalan membaca data dari blockchain.
 * Dipakai agar semua kegagalan punya format yang sama dan gampang disambungkan
 * ke layanan pemantauan (misalnya Sentry) nanti, cukup dari satu tempat.
 *
 * Catatan: ini hanya untuk kegagalan yang sudah ditangani di UI (ada fallback,
 * misalnya daftar kosong). Kesalahan transaksi pengguna tetap lewat toast.
 */
export const reportError = (context, error) => {
  // eslint-disable-next-line no-console
  console.error(`[crowdfunding] ${context}:`, error);
};

/** Versi siap pakai untuk .catch(): `.catch(onError("Memuat notifikasi"))` */
export const onError = (context, fallback) => (error) => {
  reportError(context, error);
  return fallback;
};
