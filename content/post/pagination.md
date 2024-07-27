---
title: 'Kekurangan Backend Pagination Menggunakan Limit, Offset, dan Total Count'
date: 2024-07-27T17:33:10+08:00
draft: false
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

Bagaimana cara paling optimal dalam melakukan pagination di sisi backend

<!--more-->

Karena judulnya sudah sangat niche, Untuk mempersingkat, Saya tidak akan membahas apa itu pagination, Namun saya akan membahas mengenai kebencian tersendiri saya terhadap cara yang biasanya dilakukan untuk memproses data pagination pada sisi backend, terutama yang berkaitan dengan database.

## Kenapa Pagination Penting ?

Pagination dipandang sangat penting karena beberapa alasan berikut:

- Performance: Mengembalikan data yang besar sekaligus itu lambat dan memakan banyak sumber daya. Dengan membagi data menjadi potongan-potongan yang lebih kecil, API bisa mengembalikan data lebih cepat dan dengan sumber daya yang lebih sedikit.

- Memory Management: Memproses data yang besar dapat memerlukan banyak memori, yang bisa menjadi masalah untuk perangkat dengan sumber daya terbatas seperti ponsel. Dengan menggunakan pagination, API dapat membatasi jumlah data yang perlu disimpan dalam memori pada suatu waktu.

- User Experience: Untuk aplikasi klien yang menampilkan data kepada pengguna, pagination dapat meningkatkan pengalaman pengguna dengan menyediakan antarmuka yang lebih cepat dan responsif. Pengguna dapat melihat hasil awal dengan cepat dan dapat meminta data tambahan sesuai kebutuhan.

Ketiga alasan berikut sangat valid. Namun cara kita memproses pagination ini tidak hanya dapat dicapai dengan Query Limit Offset + Count.

## Alternatif Limit Offset ?

### Cursor-based Pagination

Introduction to cursor-based pagination (a.k.a. keyset pagination).
Explain how it works by using unique record identifiers.
Advantages: Better performance for large datasets, consistent results.

### Seek Method

Explanation of the seek method for pagination.
Advantages: More efficient for certain types of queries.


## Kenapa Cara Alternatif Ini Lebih Bagus ?

Disini kita akan bahas kekurangan dari cara pagination menggunakan limit offset.

### Performance Issues

#### Database Query Performance
Saat offset meningkat, database perlu memindai lebih banyak baris, yang menyebabkan query menjadi lebih lambat. Offsets yang besar dapat menurunkan kinerja, terutama pada tabel dengan jutaan rekaman. Berikut adalah contoh query SQL yang menunjukkan bagaimana LIMIT dan OFFSET digunakan:

```sql
SELECT * FROM records
ORDER BY id
LIMIT 10 OFFSET 1000;
```

Penjelasan:

`LIMIT` menentukan jumlah maksimal baris yang dikembalikan.  
`OFFSET` menentukan berapa banyak baris yang harus dilewati sebelum mulai mengembalikan hasil.

Pada contoh di atas, query ini sebenarnya akan memindai 1000 baris pertama, membuang data yang tidak diperlukan, dan mengembalikan 10 baris berikutnya. Jika tabel memiliki jutaan baris, melewati sejumlah besar baris dengan offset yang besar akan membuat query berjalan lebih lambat karena database harus memindai semua baris tersebut sebelum mengembalikan hasil.

Hal ini berarti jika klien melakukan permintaaan page 2, page 3 dan seterusnya maka akan menyebabkan database harus memproses berkali-kali lipat data dibandingkan dengan jumlah yang sebenarnya dikembalikan kepada klien.

Sebagai ilustrasi:
- Untuk page 1: OFFSET 0, LIMIT 100 -> memindai dan mengembalikan 100 baris.
- Untuk page 2: OFFSET 100, LIMIT 100 -> memindai dan membuang 100 baris, kemudian mengembalikan 100 baris berikutnya.
- Untuk page 3: OFFSET 200, LIMIT 100 -> memindai dan membuang 200 baris, kemudian mengembalikan 100 baris berikutnya.
- Untuk page 100: OFFSET 10000, LIMIT 100 -> memindai dan membuang 10000 baris, kemudian mengembalikan 100 baris berikutnya.

Semakin besar nilai offset, semakin banyak baris yang perlu dipindai dan dibuang, yang membuat query semakin lambat dan tidak efisien. Ini menjadi sangat buruk untuk tabel dengan jutaan baris karena memproses dan membuang banyak data setiap kali ada permintaan halaman baru.


#### Database Query Count Untuk Metadata

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
    },
    "trace_id": "376cd2fb76a2b33afbd1ba648adbe8e3"
}
```

Untuk menghasilkan metadata ini, backend perlu melakukan dua query:

1. Untuk mengambil data dengan LIMIT dan OFFSET
```sql
SELECT * FROM items LIMIT 100 OFFSET 0;
```
2. Untuk menghitung jumlah total baris dengan COUNT(*)
```sql
SELECT COUNT(*) FROM items;
```

Query COUNT(*) memastikan bahwa frontend atau client aplikasi dapat menampilkan informasi pagination yang akurat kepada pengguna, seperti berapa banyak halaman yang tersedia dan jumlah total item yang dapat dilihat. Namun, penggunaan query COUNT(*) pada dataset yang besar dapat berdampak negatif karena dapat (namun belum tentu) mengakibatkan full table scan, tidak selalu dapat dioptimalkan dengan indeks, berpotensi menyebabkan masalah konkurensi dan locking, memerlukan banyak I/O disk, dan menggunakan sumber daya sistem yang signifikan. 

Pada awalnya saat aplikasi mulai dibuat, issue ini tidak akan terasa, namun seiring berjalannya waktu dan dataset menjadi besar maka issue ini akan perlahan lahan muncul. Karena saya mengalaminya sendiri dan pada akhirnya membuat artikel ini.

Menggunakan teknik alternatif dan optimisasi bisa membantu meningkatkan kinerja dalam kasus ini.

#### Optimasi Database Query LIMIT OFFSET

Dalam studi kasus ini query untuk pagination dapat dioptimalkan, namun query count tidak. Sehingga pilihan yang paling tepat adalah mengganti strategy ke pagination alternative.

Bagaimana cara mengoptimalkan query LIMIT OFFSET ?
Teknik ini bahkan saya temukan di library yang digunakan pada bahasa lain, PHP Laravel. yang dapat dicontoh pada library ini : https://github.com/hammerstonedev/fast-paginate
Apa yang dilakukan untuk membuat peformanya menjadi lebih baik ?

```sql
select * from items              -- The full data that you want to show your users.
    where items.id in (          -- The "deferred join" or subquery, in our case.
        select id from items     -- The pagination, accessing as little data as possible - ID only.
        limit 15 offset 150000      
    )
```

Idenya adalah agar melakukan penerapan LIMIT dan OFFSET pada data yang lebih kecil, baru kemudian hasilnya dicari untuk membuat data yang lebih lengkap.

Namun jujurly ini tidak terlalu menolong karena pada kenyataannya query count masih sangat lambat pada jumlah data yang sangat besar. Buktinya ? 

{{< zoom-image src="/img/pagination/jaeger-trace-query-count.webp" title="" alt="jaeger trace query count" >}}

pada artikel ini saya belum bisa memberikan visualisasi data yang lengkap. Namun melalui sample ini saya menemukan perbedaan yang sangat signifikan antara mendapatkan datanya dan mendapatkan jumlah datanya secara keseluruhan.

Pada studi kasus tersebut saya mendapatkan pelajaran bahwa :
- tidak selamanya jumlah N query yg sedikit menjadi lebih peforma dibandingkan jumlah N query
- pada kondisi tertentu query yang dipisah pisah justru menjadikan peformanya naik signifikan
- query count tidak tertolong oleh index dalam kasus saya
    ini didukung oleh problem2 serupa yang dialami beberapa contoh artikel berikut.
- peforma ini dapat diukur dengan benar benar membandingkan peforma before dan after perubahan query. benchmark