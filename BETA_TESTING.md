# Berisawer — Panduan Beta Tertutup

Terima kasih sudah membantu menguji Berisawer. Ini adalah beta awal; mohon jangan mengandalkan fitur ini untuk transaksi atau siaran komersial.

## Batasan penting
- QRIS, Midtrans, dan seluruh pembayaran tetap nonaktif.
- Gunakan hanya data demo. Tombol **Kirim alert demo** menghasilkan event sintetis, bukan donasi sungguhan.
- Jangan membagikan URL overlay berisi token, tautan login email, atau informasi akun.
- TTS bergantung pada suara yang tersedia di browser/perangkat; suara Google/perempuan tidak dijamin tersedia di semua perangkat.
- Media Share, polling, timer live, dan sebagian tool lain masih berupa preview.

## Skenario uji
1. Buka https://berisawer.pages.dev dan buat akun/masuk lewat tautan email.
2. Buka Pengaturan, simpan nama kreator, handle unik, bio, dan opsi profil publik.
3. Buka URL publik `/creator/handle-kamu` pada tab privat/perangkat lain. Coba juga profil privat.
4. Buka Live Studio dan buat URL overlay Alerts dari dashboard. Tambahkan URL ke browser biasa atau OBS Browser Source.
5. Klik **Kirim alert demo**. Pastikan alert muncul sekali, bunyi Shine terdengar, dan TTS berbicara jika diaktifkan.
6. Uji volume, bahasa, pilihan suara, pembacaan pesan, dan aturan moderasi.
7. Muat ulang dashboard dan overlay; periksa apakah pengaturan tetap tersimpan dan event demo tidak diputar ulang tanpa sengaja.
8. Jika memungkinkan, gunakan akun kedua untuk memastikan data kreator tidak bercampur.

## Laporkan bug
Gunakan GitHub Issues dengan template **Laporan bug beta**:
https://github.com/Ndraaa444/Berisawer/issues/new?template=bug_report.yml

Sertakan perangkat/browser, langkah reproduksi, hasil yang diharapkan, hasil aktual, dan pesan error yang sudah dibersihkan dari data pribadi.

## Pesan undangan (salin dan kirim manual)
Halo! Saya sedang membuka uji coba terbatas Berisawer, platform tools livestream yang masih dalam tahap beta. Saya mencari kreator yang bersedia mencoba pendaftaran, profil publik, overlay OBS, dan alert demo, lalu melaporkan bug atau fitur yang membingungkan.

Catatan: pembayaran/QRIS belum aktif, jadi pengujian ini hanya menggunakan event demo dan tidak melibatkan uang sungguhan. Jika tertarik, coba https://berisawer.pages.dev dan kirim masukan/bug melalui https://github.com/Ndraaa444/Berisawer/issues/new?template=bug_report.yml.

Terima kasih sudah membantu membangun Berisawer!
