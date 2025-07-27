---
title: 'Dari Frustrasi Jadi Solusi: Perjalanan Merilis Kazz, Aplikasi Keuangan Impian Saya'
date: 2025-07-26T14:16:41+08:00
draft: false
categories: ["Backend"]
tags: ["Keuangan Pribadi", "Aplikasi", "Anggaran", "Fintech", "Review"]
author: "Muchlis"
showToc: true
TocOpen: false
hidemeta: false
comments: true
description: 'Tantangan teknis di balik pengembangan Kazz, aplikasi keuangan yang saya bangun untuk menjadi jawaban atas semua masalah pencatatan keuangan'
disableHLJS: true # to disable highlightjs
disableShare: false
disableHLJS: false
hideSummary: false
searchHidden: false
ShowReadingTime: true
ShowBreadCrumbs: true
ShowPostNavLinks: true
ShowWordCount: true
ShowRssButtonInSectionTermList: true
ShowShareButtons: true
ShareButtons: ["linkedin", "x", "facebook", "whatsapp", "telegram"]
UseHugoToc: true
cover:
    hidden: true # only hide on current single page
editPost:
    URL: "https://github.com/muchlist/paper/tree/main/content"
    Text: "Suggest Changes" # edit text
    appendFilePath: true # to append file path to Edit link
---

Namanya Kazz, sebuah aplikasi money tracker yang lahir dari keresahan pribadi. Di postingan ini, saya mau cerita sedikit soal perjalanannya, dari mulai ide, tantangan, sampai harapan ke depan. Siapa tahu bisa jadi inspirasi buat teman-teman yang lain.

<!--more-->

## Berawal dari "Kok ada yang kurang ya?"

Ceritanya klise. Saya butuh aplikasi untuk mencatat pengeluaran sehari-hari. Kopi di pagi hari, makan siang, jajan sore, sampai bayar parkir. Saya coba unduh beberapa aplikasi keuangan yang populer. Hasilnya? Tidak seperti yang saya harapkan.

Ada yang fiturnya banyak tapi tidak relevan (ada investasi uang betulan didalamnya). Ada yang iklannya muncul setiap habis catat transaksi. Ada juga yang tampilannya kaku dan butuh banyak langkah cuma buat masukin data "beli boba 20 ribu". Saya cuma butuh yang cepat, simpel, dan tidak ribet.

Karena frustrasi tidak menemukan yang pas, tercetuslah ide: **"Kenapa tidak bikin sendiri aja?"**

Saya coba petakan apa saja yang saya rasakan kurang dari aplikasi lain dan apa yang saya inginkan ada di aplikasi saya. Kurang lebih, perbandingannya seperti ini:


|Fitur|Aplikasi Lain (Umumnya)|Kazz ✨|
|---|---|---|
|**Input Transaksi**|Ketik manual, pilih kategori, isi nominal. Butuh beberapa klik.|Cukup ngomong! "Beli kopi susu 18 ribu".|
|**Laporan Keuangan**|Grafik dan angka standar. Sulit dibaca dan tidak ada konteks. Berbayar|Laporan cerdas dari AI, membandingkan dengan periode sebelumnya & memberi _insight_.|
|**Klasifikasi Need/Want**|Tidak ada, padahal ini konsep dasar budgeting.|Otomatis mengklasifikasikan transaksi sebagai Kebutuhan/Keinginan.|
|**Transaksi Serupa**|Harus input ulang dari awal.|Cukup 1-klik untuk duplikat transaksi yang sama.|
|**Transaksi Rutin**|Beberapa tidak ada. Kadang pengaturannya kaku.|Pengaturan dinamis & simpel (misal: "tiap bulan di tanggal 25").|
|**Kelola Bareng Pasangan**|Hampir tidak ada. Kalaupun ada, semua data terbuka dan pasti berbayar.|Bisa pilih dompet mana yang mau dikelola bersama, menjaga privasi dompet pribadi.|
|**Performa**|Semakin banyak data, aplikasi semakin lambat.|Cepat & ringan, data terasa diakses dari memori lokal.|
|**Tampilan**|Penuh iklan, atau terlalu banyak elemen visual yang mengganggu, atau tidak relevan.|Fokus pada data, bersih, minimalis. Tanpa gangguan.|
|**Privacy**|Beberapa meminta nomer hp, bahkan gaji perbulan.|Tidak meminta data PII sama sekali. Memasukkan gaji atau tidak pilihan bebas kamu. Catat hanya pengeluaran saja It's okay.|


Dari tabel sederhana ini, lahirlah Kazz. Tujuannya: 
- Saya ingin semua orang bisa mencatat keuangan dengan mudah. 
- Saya ingin Kazz menjadi **aplikasi keuangan** yang benar-benar mengerti penggunanya.  


Fitur inti sudah selesai. Namun, masih ada beberapa fitur yang saya rencanakan. Misalnya :
- Budget khusus : Idenya adalah kita membuat budget yang akan reaktif setiap dompet terpilih ada transaksi dan kategorinya cocok. Bayangkan kamu membatasi kategori "makan diluar" hanya boleh 2 Juta dalam sebulan.
- Dompet aset : Idenya adalah kita tidak mencatat uang, tetapi bisa komoditas lain juga, seperti emas.


{{< zoom-image src="/img/money-tracker-app/aplikasi-catatan-keuangan.webp" title="" alt="aplikasi catatan keuangan" >}}

## Tech Stack: Teknologi yang Memberi Kazz Kekuatan

Pemilihan teknologi bukan hanya soal preferensi, tetapi tentang fondasi yang kokoh untuk kecepatan, keamanan, dan skalabilitas. Setiap komponen dipilih untuk menjalankan peran spesifik demi memberikan pengalaman terbaik.

### Backend: Otak di Balik Kazz
- **Golang (Go):** Dipilih karena performanya yang luar biasa cepat dan efisien dalam menangani banyak permintaan sekaligus. Inilah yang membuat Kazz tetap responsif bahkan saat data kamu semakin banyak.
- **PostgreSQL:** Sebagai fondasi data, keandalannya tidak diragukan. Teknologi ini menjamin setiap data yang kamu catat tersimpan dengan aman dan konsisten, tanpa risiko kehilangan data.
- **Redis:** Bertindak sebagai lapisan _cache_ super cepat. Data yang sering kamu akses disimpan di sini, sehingga aplikasi terasa instan, seolah semua data ada di memori lokal ponsel.
- **Asynq:** Pahlawan di belakang layar. Tugas-tugas berat seperti membuat laporan bulanan atau memproses AI dijalankan secara terpisah, sehingga kita bisa terus menggunakan aplikasi tanpa merasakan adanya jeda.
- **Go-GenAI:** Jembatan khusus yang menghubungkan Kazz dengan model AI generatif, memungkinkan Kazz memberikan _insight_ keuangan yang cerdas dan personal.

### Aplikasi Android
- **Flutter:** Memungkinkan Kazz dikembangkan dengan cepat untuk berbagai platform (Android dan nantinya iOS) dari satu basis kode. Ini memastikan pengalaman pengguna yang konsisten dan mulus, dengan performa layaknya aplikasi native.
- **BLoC State Management:** Bertindak sebagai arsitek yang menjaga kerapian kode aplikasi. Pola ini memastikan logika dan tampilan terpisah, membuat aplikasi lebih stabil, mudah di-maintenance, dan minim _bug_.

## Di Balik Layar: Serunya Membuat Fitur "Rumit"

Membuat Kazz itu seru, terutama saat harus memecahkan masalah teknis yang kelihatannya simpel di permukaan, tapi ternyata kompleks di belakang. Ini beberapa di antaranya:

1. **Perintah Suara (Voice Command):** Ini bukan sekadar rekam suara jadi teks. Tantangannya adalah bagaimana aplikasi bisa "mengerti" bahasa manusia sehari-hari. Misalnya, saat saya bilang "bayar parkir dua ribu", aplikasi harus bisa menerjemahkan itu menjadi: Kategori `Transportasi`, Nama Transaksi `Parkir`, dan Nominal `Rp 2.000`. 
2. **Laporan dengan AI:** Saya tidak mau laporan Kazz cuma jadi pajangan angka. Saya ingin AI-nya bisa jadi teman ngobrol finansial. Jadi, bukan cuma `total pengeluaran: Rp 2.000.000`, tapi lebih ke "Hei, bulan ini pengeluaran untuk jajan kopimu naik 20% lho. Mungkin bisa sedikit direm?". Membuat logika AI yang bisa memberikan _insight_ personal seperti ini adalah bagian paling kompleks. Selain itu laporan ini juga membandingkan dengan periode sebelumnya. Lalu, tantangan lainnya adalah bagaimana kita menyaring informasi sekaligus menghemat total pengeluaran AI itu sendiri.
3. **Transaksi Berulang yang Dinamis:** Fitur "transaksi berulang" kedengarannya mudah, kan? Cukup setel "tiap bulan". Tapi bagaimana jika user maunya: "tiap 2 bulan sekali, tapi di tanggal yang sama"? Atau "setiap tanggal 15 dan 30 tiap bulan, tetapi berakhir di bulan yang ditentukan"? Logic `if-else` biasa tidak akan cukup. Di sini, saya mengandalkan `RRULE` (Recurrence Rule), sebuah spesifikasi standar (RFC 5545) untuk mendefinisikan aturan perulangan. Menerapkannya di backend butuh usaha ekstra, tapi hasilnya, Kazz bisa memprediksi tanggal transaksi di masa depan dengan sangat fleksibel dan akurat.
4. **Pagination vs. Report Data:** Agar aplikasi tetap ngebut, saya menerapkan _cursor-based pagination_, di mana aplikasi hanya memuat beberapa transaksi terakhir saat di-scroll dengan infinity load. Pertanyaannya: bagaimana cara membuat laporan secara akurat, padahal data yang di-load hanya sebagian kecil? Pertimbangan - pertimbangan bahwa logic A harus berada di Backend dan B harus di Android ini sangat menarik, terutama ada variable bahwa kita harus memperhitungkan kesanggupan server dalam melayani banyaknya request perhitungan yang rumit dan memakan waktu. Untuk pagination, saya menulis artikel khusus disini: [Optimasi Pagination: Mengapa Limit-Offset Bisa Menjadi Bom Waktu dan Cursor Pagination Menjadi Solusinya](/post/pagination)
5. **Masalah Kategori di Dompet Bersama:** Saat sebuah dompet dikelola berdua dengan pasangan, muncul masalah UX yang menarik. Jika pasangan saya membuat kategori baru "Hobi", apakah kategori itu harus muncul juga di daftar kategori pribadi saya? Bagaimana dengan pengguna yang terhubung ke beberapa dompet orang lain?. Sedangkan system perlu belajar kategori-kategori baru itu ketika melakukan parsing lewat perintah suara. Maka untuk sementara saya menutup fitur kebebasan dalam membuat kategori ini dan menggantinya dengan kategori statis yang banyak, dan user hanya bisa menyembunyikan yang tidak relevan.    
6. **Seni Menampilkan Angka:** Bagaimana membuat aplikasi yang isinya dominan angka dan teks tetap terlihat menarik tanpa gambar atau ilustrasi?
6. **Tipe data, skalabilitas aplikasi :** Target saat ini memang Indonesia. Namun sebenarnya backend sudah siap untuk negara lainnya, bahkan bisa menyimpan selain mata uang, sebut saja Emas atau bebas, Perak, Kepingan Lego mungkin. "Tipe data apa yang paling cocok untuk menyimpan nominal uang?" pertanyaan seperti itu bahkan dapat menjadi bahasan yang cukup menarik. Jika jawabanmu float64, salah besar.

Banyak hal-hal terlalu teknis yang tidak bisa dijabarkan satu persatu.

## Tantangan Terbesar: Kepercayaan dan Privasi Data

Saya sangat paham kekhawatiran ini. Saat kita bicara soal aplikasi keuangan, kepercayaan adalah segalanya.  
Saya mau transparan soal ini. **Privasi kamu adalah arsitektur dasar Kazz.** Saya membangun aplikasi ini dengan prinsip:

- **Login Aman dengan OAuth2:** Kazz hanya mengizinkan login via Google, Github, dll. Saya tidak pernah menyimpan password-mu. Jadi, kecil kemungkinan akunmu diretas (kecuali raksasa sekelas Google bisa jebol, kan?).
- **Data Nominal & Anonimitas:** Benar, angka nominal transaksi tidak bisa dienkripsi total karena dibutuhkan untuk kalkulasi (menjumlahkan, rata-rata, dll). Mengenkripsinya akan melumpuhkan semua fitur laporan. **Solusinya adalah dengan memberikan kontrol penuh pada Kamu.** Kazz tidak meminta nama, alamat, atau data pribadi lainnya. Cukup email, dan Kamu bebas menggunakan email mana pun yang tidak terlacak. Ini menjadikan semua riwayat transaksi Kamu bisa bersifat **anonim**.
- **Otorisasi Ketat:** Setiap akses data di aplikasi sudah dilindungi oleh sistem otorisasi. User A tidak akan pernah bisa mengakses data User B, begitu pula sebaliknya. Kecuali memang terhubung lewat fitur Kazzhub, ya. Saya berkomitmen menerapkan semua standar keamanan backend.
- **Tidak Ada Jual Beli Data:** Saya tegaskan sekali lagi, saya tidak akan pernah menjual atau menyalahgunakan datamu. Tujuan saya bukan itu.
    

## Bukan Soal Uang, Tapi Soal Portofolio & Perjalanan

Apakah saya berharap Kazz akan membuat saya kaya raya? Jujur, tidak. Tujuan utama saya membangun Kazz adalah untuk **meningkatkan karir saya, membangun portofolio yang kuat dengan basis pengguna nyata**, sekaligus menyelesaikan masalah yang saya hadapi dan berbagi solusinya.  

Saya berkomitmen untuk menjaga agar fitur inti Kazz tetap gratis. Adapun jika nanti memiliki fitur premium berbayar, itu adalah fitur opsional. Pendapatan dari sana akan digunakan untuk "mensubsidi" seluruh biaya pengembangan aplikasi.  

Melihat ada orang lain yang mengunduh dan merasakan manfaat dari apa yang saya buat, itu sudah jadi bayaran tak ternilai. Perjalanan ini lebih tentang pembuktian diri dan kepuasan menciptakan sesuatu yang berguna.

Kalau kamu sedang mencari **aplikasi keuangan** yang simpel, cerdas, dan benar-benar menghargai privasimu, mungkin Kazz adalah jawabannya.

Saya mengundang kamu untuk mencobanya, dan saya akan sangat senang jika kamu mau memberikan kritik dan saran. Kazz masih jauh dari sempurna dan akan terus berkembang bersama masukan dari para penggunanya.

Kamu bisa mengunduh Kazz di: [PLAYSTORE](https://play.google.com/store/apps/details?id=dev.kalsel.kazz&hl=id)

Terima kasih sudah membaca cerita saya. Semoga bermanfaat!