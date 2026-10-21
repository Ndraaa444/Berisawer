# Bagisawer — Checklist Pra-Peluncuran

Dokumen ini membedakan status deployment dari kesiapan produk. Deployment berstatus READY tidak otomatis berarti semua alur telah lulus pengujian.

## Status aman saat ini
- Domain utama: https://bagisawer.my.id
- Deployment produksi Vercel terakhir yang diperiksa: READY.
- Login email OTP: sudah berhasil diuji oleh pemilik proyek.
- QRIS, Midtrans, dan transaksi uang sungguhan: NONAKTIF sampai verifikasi merchant dan uji sandbox/webhook lengkap.
- Alert demo: event sintetis, bukan transaksi.
- Beberapa fitur Live Studio masih berupa preview lokal; jangan mengiklankannya sebagai fitur live yang selesai sebelum pengujian end-to-end.

## Checklist pengujian sebelum membuka beta publik

### Akun dan profil
- [ ] Daftar dengan email baru; pastikan menerima kode OTP, bukan tautan login.
- [ ] Verifikasi OTP yang benar, OTP salah, OTP kedaluwarsa, kirim ulang, logout, dan login kembali.
- [ ] Simpan nama, handle, bio, dan status profil publik; muat ulang dan pastikan tetap tersimpan.
- [ ] Buka profil publik di jendela privat; pastikan profil privat tidak terbuka.
- [ ] Uji dengan akun kedua; pastikan pengaturan dan data tidak bercampur.

### Pengaturan dan keamanan
- [ ] Simpan harga minimum dan switch fitur, muat ulang, lalu pastikan nilainya tetap sama.
- [ ] Uji bahwa pengguna hanya dapat membaca/mengubah profil, pengaturan, dan token miliknya.
- [ ] Pastikan tidak ada service-role key atau payment server key pada frontend.
- [ ] Pastikan token overlay dapat dicabut dan URL yang dicabut ditolak.
- [ ] Uji filter moderasi dengan pesan yang diizinkan, disamarkan, dan ditolak.

### Overlay dan Live Studio
- [ ] Buat URL overlay dari akun kreator; gunakan URL itu di browser dan OBS Browser Source.
- [ ] Kirim alert demo; pastikan event tampil satu kali, suara/TTS mengikuti pengaturan, dan tidak membuat baris donasi.
- [ ] Kirim Running Text; pastikan panjang teks dan moderasi diterapkan.
- [ ] Uji koneksi terputus, pemulihan koneksi, token salah/dicabut, serta overlay yang dibuka pertama kali.
- [ ] Tandai subathon, target, polling, request, dan Media Share sebagai preview sampai tiap alur benar-benar tersambung ke event backend dan lulus tes.
- [ ] Uji Chrome desktop, browser mobile, audio OBS, dan tampilan responsif.

### Pembayaran — jangan diaktifkan sebelum semua langkah lulus
- [ ] Merchant/provider menyetujui akun produksi.
- [ ] Konfigurasi server-side menggunakan secret produksi yang benar; jangan letakkan secret pada `VITE_*`.
- [ ] Uji transaksi sandbox sukses, gagal, kedaluwarsa, dibatalkan, nominal tidak cocok, signature salah, dan notifikasi duplikat.
- [ ] Pastikan status paid hanya berasal dari notifikasi provider yang valid; event overlay dibuat satu kali.
- [ ] Uji refund dan rekonsiliasi, serta sediakan kebijakan privasi, syarat layanan, kebijakan refund, dan kanal dukungan.
- [ ] Baru setelah lulus, minta persetujuan eksplisit sebelum mengubah flag pembayaran ke produksi.

## Cara melaporkan bug
Buat GitHub Issue: https://github.com/Ndraaa444/Berisawer/issues/new?template=bug_report.yml

Sertakan browser/perangkat, langkah reproduksi, hasil yang diharapkan, hasil aktual, dan pesan error yang sudah dibersihkan dari data pribadi. Jangan kirim OTP, tautan login, token overlay, atau secret.

## Pesan undangan beta terbatas
Halo! Saya sedang menguji Bagisawer, platform tools livestream. Saya mencari kreator yang bersedia mencoba pendaftaran, profil, pengaturan overlay OBS, alert demo, dan Running Text, lalu melaporkan bug.

Catatan: QRIS dan pembayaran nyata belum aktif. Fitur yang berlabel preview belum boleh diandalkan untuk siaran komersial. Coba https://bagisawer.my.id dan laporkan bug melalui https://github.com/Ndraaa444/Berisawer/issues/new?template=bug_report.yml.

Terima kasih telah membantu menguji Bagisawer.
