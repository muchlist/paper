---
title: 'Kekurangan Backend Pagination Menggunakan Limit, Offset, dan Total Count'
date: 2024-07-27T17:33:10+08:00
draft: true
categories: ["Backend"]
tags: ["Golang", "Database", "Optimization", "Best Practice"]
author: "Muchlis"
showToc: true
TocOpen: false
hidemeta: false
comments: true
description: 'Bagaimana cara paling optimal dalam melakukan pagination di sisi backend'
disableHLJS: true
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

Pagination adalah teknik umum untuk membagi hasil query database menjadi bagian-bagian yang lebih kecil. Meskipun LIMIT OFFSET adalah metode yang sederhana, metode ini memiliki beberapa kelemahan, terutama dalam hal performa pada dataset yang sangat besar. Artikel ini akan membahas masalah-masalah yang sering muncul saat menggunakan LIMIT OFFSET dan mengeksplorasi alternatif yang lebih efisien, seperti cursor-based pagination dan seek method.

<!--more-->

## Pentingnya Pagination dan Tantangannya

Pagination memiliki beberapa manfaat signifikan:

- Performance: Mengembalikan data yang besar sekaligus itu lambat dan memakan banyak sumber daya. Dengan membagi data menjadi potongan-potongan yang lebih kecil, API bisa mengembalikan data lebih cepat dan dengan sumber daya yang lebih sedikit.

- Memory Management: Memproses data yang besar dapat memerlukan banyak memori, yang bisa menjadi masalah untuk perangkat dengan sumber daya terbatas seperti ponsel. Dengan menggunakan pagination, API dapat membatasi jumlah data yang perlu disimpan dalam memori pada suatu waktu.

- User Experience: Untuk aplikasi klien yang menampilkan data kepada pengguna, pagination dapat meningkatkan pengalaman pengguna dengan menyediakan antarmuka yang lebih cepat dan responsif. Pengguna dapat melihat hasil awal dengan cepat dan dapat meminta data tambahan sesuai kebutuhan.

Namun, penting untuk diingat bahwa pagination tidak selalu menjadi solusi yang sempurna. Pada dataset yang sangat besar, bahkan pagination pun dapat menghadapi tantangan.

## Masalah LIMIT OFFSET

Disini kita akan bahas kekurangan dari cara pagination menggunakan LIMIT OFFSET.

### Isu Performa

#### Mengapa LIMIT OFFSET Lambat untuk Dataset Besar?

Saat berhadapan dengan dataset yang sangat besar, pagination menggunakan LIMIT OFFSET seringkali mengalami penurunan performa. Ini karena setiap kali kita meminta halaman baru, database harus memindai seluruh tabel dari awal untuk menemukan data yang sesuai, meskipun kita hanya membutuhkan sebagian kecil data.

Berikut adalah contoh query SQL yang menunjukkan bagaimana LIMIT dan OFFSET diterapkan:

```sql
SELECT * FROM records
ORDER BY id
LIMIT 10 OFFSET 1000;
```

Penjelasan:

`LIMIT` menentukan jumlah maksimal baris yang dikembalikan.   
`OFFSET` menentukan berapa banyak baris yang harus dilewati sebelum mulai mengembalikan hasil.

Pada contoh di atas, query tersebut sebenarnya akan memindai 1000 baris pertama, membuang data yang tidak diperlukan, dan mengembalikan 10 baris berikutnya. Jika tabel memiliki jutaan baris, melewati sejumlah besar baris dengan offset yang besar akan membuat query berjalan lebih lambat karena database harus memindai semua baris tersebut sebelum mengembalikan hasil.

Artinya jika klien melakukan permintaaan page 2, page 3 dan seterusnya maka akan menyebabkan database harus memproses berkali-kali lipat data dibandingkan dengan jumlah yang sebenarnya dikembalikan kepada klien.

Sebagai ilustrasi, asumsi jika 1 halaman menampilkan 100 data:
- `Untuk page 1: OFFSET 0, LIMIT 100` -> memindai dan mengembalikan 100 baris.
- `Untuk page 2: OFFSET 100, LIMIT 100` -> memindai dan membuang 100 baris, kemudian memindai dan mengembalikan 100 baris berikutnya.
- `Untuk page 3: OFFSET 200, LIMIT 100` -> memindai dan membuang 200 baris, kemudian memindai dan mengembalikan 100 baris berikutnya.
- `Untuk page 100: OFFSET 10000, LIMIT 100` -> memindai dan membuang 10000 baris, kemudian memindai dan mengembalikan 100 baris berikutnya.

Semakin besar nilai offset, semakin banyak baris yang perlu dipindai dan dibuang, yang membuat query semakin lambat dan tidak efisien. Ini menjadi sangat buruk untuk tabel dengan jutaan baris karena memproses dan membuang banyak data setiap kali ada permintaan halaman baru.

Worst Case : Client ingin mendapatkan semua data dengan cara melakukan scan dari page 1 sampai dengan page terakhir. 

Bayangkan kita ingin membaca sebuah buku yang sangat tebal halaman demi halaman. Jika kita menggunakan metode LIMIT dan OFFSET, kita harus membuka buku dari awal setiap kali ingin membaca halaman berikutnya. Ini tentu sangat tidak efisien, karena kita akan mengulang-ulang membuka halaman yang sama. Dalam konteks database, hal ini sama dengan membuat database bekerja lebih keras dari yang seharusnya. Oleh karena itu, jika tujuan kita adalah mendapatkan semua data, lebih baik kita langsung mengambil seluruh buku (data) sekaligus, lalu membacanya (memprosesnya) di aplikasi.

#### Dampak Query COUNT(*) terhadap Performa

Tidak hanya itu, dalam implementasi pagination menggunakan LIMIT dan OFFSET, query COUNT(*) sering digunakan untuk menghitung jumlah total baris dalam dataset. Informasi ini diperlukan untuk menyusun metadata pagination, seperti jumlah total halaman dan jumlah total item, yang kemudian dikembalikan dalam respon API.

Sebagai contoh, respon API mungkin memiliki struktur sebagai berikut:

```json
{
    "message": "successfully fetch data",
    "data": [
        {}
    ],
    "meta": {
        "current_page": 1,
        "page_size": 100,
        "total_count": 3000,
        "total_page": 30
    }
}
```

Untuk menghasilkan metadata ini, backend perlu melakukan dua query:

1. Untuk mengambil data dengan LIMIT dan OFFSET
```sql
SELECT * FROM members LIMIT 100 OFFSET 0;
```
2. Untuk menghitung jumlah total baris dengan COUNT(*)
```sql
SELECT COUNT(*) FROM members;
```

Penggunaan COUNT(*) pada dataset besar seringkali mengakibatkan penurunan performa yang signifikan. Hal ini dikarenakan:
- Full table scan: Database perlu memindai seluruh tabel untuk menghitung jumlah baris, terutama jika tidak ada indeks yang sesuai.
- Kurangnya optimasi indeks: COUNT(*) seringkali tidak dapat dioptimalkan dengan indeks, sehingga waktu eksekusi query menjadi lebih lama.
- Masalah konkurensi dan locking: Query COUNT(*) dapat menyebabkan konflik dengan query lain dan menghambat kinerja sistem.
- Beban I/O yang tinggi: Proses penghitungan jumlah baris memerlukan banyak operasi baca-tulis disk.

Masalah ini mungkin tidak terlihat jelas pada awal pengembangan, tetapi akan semakin terasa ketika volume data terus bertambah. Pengalaman saya mendorong saya untuk menulis artikel ini. Teknik alternatif dan optimasi dapat menjadi solusi yang baik untuk mengatasinya.

#### Optimasi Database Query LIMIT OFFSET

Dalam studi kasus ini ternyata query untuk pagination dapat dioptimalkan, namun query count belum tentu. Sehingga pilihan yang paling tepat adalah mengganti strategy ke pagination alternative.

Bagaimana cara mengoptimalkan query LIMIT OFFSET ?
Teknik ini justru saya temukan di library yang digunakan pada bahasa lain, PHP Laravel. yang dapat dicontoh pada library ini : https://github.com/hammerstonedev/fast-paginate
Apa yang dilakukan untuk membuat peformanya menjadi lebih baik ?

```sql
select * from members              -- The full data that you want to show your users.
    where members.id in (          -- The "deferred join" or subquery, in our case.
        select id from members     -- The pagination, accessing as little data as possible - ID only.
        limit 15 offset 150000      
    )
```

Idenya adalah agar melakukan penerapan LIMIT dan OFFSET pada data yang scopenya lebih kecil, baru kemudian hasilnya dicari untuk membuat data yang lengkap.

Sayangnya, teknik optimasi pada query LIMIT OFFSET tidak sepenuhnya menyelesaikan masalah, terutama untuk query COUNT(*) pada dataset besar. Hal ini terlihat pada hasil benchmark yang saya lakukan.

{{< zoom-image src="/img/pagination/jaeger-trace-query-count.webp" title="" alt="jaeger trace query count" >}}

Meskipun visualisasi data yang lengkap belum dapat saya sajikan pada artikel ini, hasil benchmark menunjukkan perbedaan kinerja yang signifikan antara query untuk mengambil data dan query COUNT(*).

Dari studi kasus ini, saya menarik beberapa kesimpulan penting:
- `Jumlah query tidak selalu menentukan kinerja`: Tidak selalu benar bahwa semakin sedikit permintaan query yang kita jalankan, semakin baik performanya. Dalam beberapa kasus, membagi query kompleks menjadi beberapa query yang lebih kecil justru dapat meningkatkan kinerja secara keseluruhan.
- `Indeks tidak selalu optimal untuk COUNT(*)`: Meskipun indeks dapat meningkatkan kinerja query secara umum, pada kasus COUNT(*) indeks tidak selalu efektif.
- `Pentingnya benchmark`: Membandingkan kinerja sebelum dan sesudah perubahan query adalah cara yang paling akurat untuk mengukur dampak dari suatu optimasi.


## Alternatif Limit Offset ?

### Cursor-based Pagination

Cursor-based pagination menggunakan nilai unik dari suatu kolom (biasanya kolom yang diurutkan) sebagai "cursor" untuk menandai posisi saat ini dalam hasil query. Alih-alih menggunakan offset, kita mengirimkan cursor dari hasil sebelumnya untuk mendapatkan halaman berikutnya. Ini lebih efisien karena database hanya perlu mencari rekaman yang memiliki nilai cursor lebih besar dari nilai cursor sebelumnya.

```sql
SELECT * FROM members
WHERE sort_column > 'cursor_value'
ORDER BY sort_column
LIMIT 10;
```

Kelebihan:

Performa lebih baik: Tidak perlu memindai seluruh tabel untuk setiap permintaan halaman.
Hasil yang konsisten: Hasil query selalu sama, terlepas dari perubahan data yang terjadi di antara permintaan.

Kekurangan:

Implementasi lebih kompleks: Membutuhkan perencanaan yang matang dalam memilih kolom cursor yang tepat.
Tidak cocok untuk semua jenis query: Hanya efektif untuk query yang diurutkan berdasarkan satu atau beberapa kolom.

### Seek Method

Explanation of the seek method for pagination.
Advantages: More efficient for certain types of queries.