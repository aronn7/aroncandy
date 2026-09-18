# ARONCANDY

Game match-3 original dengan Next.js, React, TypeScript, 20 level, dan lima dunia. Aset candy, blocker, special, dan logo memakai file yang disediakan. Logo ditemukan di `public/assets/icons/icon.png`, disalin ke path logo yang diminta. File sumber tetap utuh; WebP ringan berada di `public/assets/optimized/`.

## Menjalankan

Gunakan Node.js 22+ dan npm. Proyek ini juga memasang Node.js lokal sebagai dev dependency untuk komputer yang masih menggunakan Node lama.

```sh
npm install
npm run dev
```

Buka `http://127.0.0.1:3000`. Untuk produksi:

```sh
npm run assets
npm run build
```

Hasil statis berada di `out/`. Siap di-deploy ke Vercel dengan framework Next.js dan build command `npm run build`. Tidak memerlukan server Next.js saat runtime; Supabase diakses melalui HTTPS. `npm start` hanya relevan jika konfigurasi `output: 'export'` diubah ke server mode; untuk hasil ekspor gunakan static hosting.

## Fitur

- Home, loading aset, map lima dunia, intro level, game, pause, menang/kalah.
- 20 konfigurasi level; 10 bentuk mask termasuk diamond, cross, heart, split, lubang, jalur sempit, dan islands.
- Swap tetangga, validasi gerakan, bounce-back, match T/L, special candy, kombinasi special, cascade dan multiplier.
- Ice berlapis, box, chocolate menyebar, stone, lock; objective score, collect, break, dan drop item.
- Booster hammer/shuffle/rainbow, pembelian dengan koin permainan, petunjuk, dan automatic dead-board shuffle.
- Lives dengan pemulihan 30 menit, daily reward, skor terbaik, bintang, nama pemain, penyimpanan localStorage.
- Pointer/touch, keyboard, reduced motion, animasi transform, partikel canvas dengan pool 120 objek.
- Audio Web Audio original yang mulai setelah interaksi pengguna. Tidak ada musik proprietary atau permintaan file audio yang kosong.
- Supabase magic-link auth, sinkronisasi progres, leaderboard dengan validasi replay server; mode tamu tetap berfungsi tanpa konfigurasi.

Level 1–4 merupakan pengenalan, lalu blocker dan bentuk arena diperkenalkan bertahap dalam versi 20 level. Urutan 100 level pada brief dapat dikembangkan lewat konfigurasi tanpa mengganti engine.

## Arsitektur

`src/game/` berisi engine TypeScript deterministik yang tidak bergantung React. `Game.act()` menghasilkan snapshot animasi, lalu UI memainkan snapshot secara berurutan dan mengunci input. `src/components/` menangani presentasi, gesture, dialog, HUD, dan map. `src/levels/index.ts` menyimpan konfigurasi dan bentuk arena. `src/services/` mengurus progres, auth, dan akses database. Tidak memakai Phaser karena papan 81 tile cukup ditangani transform CSS dan canvas partikel; engine tetap terpisah dari renderer.

Gravity bekerja per segmen kolom. Lubang, es, gembok, dan blocker solid menjadi batas segmen; setiap segmen mendapat spawn sendiri. Kiriman hanya dihitung saat mencapai tile paling bawah kolomnya. Ice tidak bisa digeser sebelum pecah, tetapi candy di bawahnya dapat menjadi bagian match. Lock juga dapat dibuka dengan match yang bersebelahan.

Tambahkan level dengan `LevelConfig`: mask 9×9, moves, candyTypes, objectives, blockers, stars, spawnWeights opsional, dan items. Perluas daftar dunia/map serta batas progres/validator jika jumlah level melampaui 20. RNG menggunakan seed agar client dan server menghasilkan board identik.

## Supabase (perlu konfigurasi proyek Anda)

1. Buat proyek Supabase. Aktifkan email magic-link dan atur Site URL serta redirect URLs ke domain game dan localhost.
2. Jalankan SQL `supabase/migrations/202609170001_initial.sql` melalui SQL Editor atau migration CLI.
3. Salin `.env.example` ke `.env.local`, isi URL proyek dan anon/publishable key publik. Jangan memasukkan service-role key ke variabel `NEXT_PUBLIC_*`.
4. Jalankan `npm run build:validator`, lalu deploy `supabase/functions/game-session` dengan Supabase CLI. Validator `_shared/validator.js` dibundel dari engine yang sama. `SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di lingkungan Edge Function.
5. Jalankan build ulang agar konfigurasi publik masuk ke bundle frontend. Untuk Vercel, isi kedua variabel environment sebelum build.

Konfigurasi Supabase belum disertakan, sehingga login/global leaderboard tidak aktif pada build tanpa environment tersebut. UI menampilkan mode tamu dan rekor lokal secara jujur; tidak ada data peringkat palsu.

Progres pribadi dilindungi RLS berdasarkan `auth.uid()`. Progres client tidak pernah menjadi sumber skor leaderboard. Server mengeluarkan seed sesi dan menghitung ulang seluruh tindakan; client tidak mengirim angka skor sebagai otoritas. Hasil harus WIN, koordinat/tindakan harus valid, dan sesi hanya boleh dipakai sekali melalui transaksi SQL. Ada batas umur sesi, jumlah tindakan, frekuensi start, dan budget ranked 3 hammer / 2 shuffle / 1 rainbow per sesi. Level ranked dibuka lewat kemenangan ranked sebelumnya. Ini mencegah manipulasi sederhana dan replay submission, bukan jaminan pencegahan bot atau kecurangan kompetitif tingkat lanjut. Guest coins/inventory bersifat device-local dan bukan ekonomi berbayar.

Dokumentasi integrasi: [Supabase Auth di Edge Functions](https://supabase.com/docs/guides/functions/auth-legacy-jwt), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Verifikasi

```sh
npm run typecheck
npm test
npm run build
```

Tes mencakup 600 board awal, legal/illegal swaps, special combinations, ice HP, gravity di mask, shuffle, drop, terminal states, lives, dan replay deterministik untuk seluruh level. Validator server juga menolak log yang tidak valid. Integrasi Supabase langsung membutuhkan proyek yang dikonfigurasi.

Pemeriksaan visual/touch pada browser fisik belum dilakukan karena tidak ada browser terhubung pada sesi pembangunan. Sebelum rilis publik, uji 320/375/390/430 px, tablet, desktop, dan landscape pada perangkat nyata. Target 60 FPS adalah target desain, belum hasil benchmark perangkat.

Ada dua tool WebMCP opsional (`aroncandy_read_board`, `aroncandy_swap`) yang memakai state/aksi game yang sama. Registrasi memakai feature detection dan dibersihkan saat unmount. Browser WebMCP tidak tersedia untuk verifikasi integrasi pada sesi ini.

## Catatan aset

`ice-cracked.png`, background dunia, dan file audio tidak disertakan. Es retak menggunakan aset es asli dengan overlay retakan; latar menggunakan gradien/geometri ambient, bukan aset game lain. Audio disintesis secara original. Keenam candy dinormalisasi dalam kanvas transparan 160×160 agar konsisten pada setiap tile. Jangan menimpa original bila melakukan optimasi ulang.
