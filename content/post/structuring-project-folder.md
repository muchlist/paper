---
title: 'Struktur Folder dan Aturan Penulisan Kode dalam Project Golang: Preferensi Pribadi'
date: 2024-07-20T16:06:50+08:00
draft: false
# weight: 1
tags: ["Golang", "Best Practices"]
categories: ["Backend"]
author: "Muchlis"
showToc: true
TocOpen: false
hidemeta: false
comments: true
description: 'Golang Struktur Folder dengan Arsitektur Hexagonal'
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
# canonicalURL: "https://canonical.url/to/page"
cover:
    image: "/img/project/hexagonal-architecture.webp" # image path/url
    alt: "hexagonal architecture"
    hidden: true # only hide on current single page
editPost:
    URL: "https://github.com/muchlist/paper/tree/main/content"
    Text: "Suggest Changes" # edit text
    appendFilePath: true # to append file path to Edit link
translationKey: "structuring-project-folder"
---

Seringkali, program golang yang kita buat tidak hanya berupa server Rest-API saja, tetapi juga mencakup fungsi lain seperti Event Consumer, Scheduller, CLI Program, Backfill Database, atau kombinasi dari semuanya. Pedoman project struktur ini dapat kita gunakan untuk memungkinkan semua itu. Struktur ini berfokus pada pemisahan logika inti dari ketergantungan eksternal, sehingga memungkinkan penggunaan ulang kode dalam berbagai mode aplikasi.

Link Repository : [https://github.com/muchlist/templaterepo](https://github.com/muchlist/templaterepo)

<!--more-->

## Prinsip dan tujuan :

- Konsistensi Pengembangan: Menyediakan metode yang seragam dalam membangun aplikasi untuk meningkatkan pemahaman dan kolaborasi tim.
- Modularitas: Memastikan kode terpisah antar modul dan tidak tightly coupled, sehingga memudahkan pemeliharaan dan pengembangan lebih lanjut.
- Manajemen Dependensi yang Efektif: Dapat menghindari error siklus dependensi meskipun ada banyak modul yang saling terhubung, melalui penerapan prinsip dependency inversion.
- Kode yang Testable: Menerapkan prinsip arsitektur Hexagonal untuk memisahkan logika inti dari ketergantungan eksternal, sehingga dapat meningkatkan fleksibilitas dan kemudahan pengujian.

### Konseptual Hexagonal Architecture

Arsitektur hexagonal, juga dikenal sebagai arsitektur port dan adapter, berfokus pada pemisahan core logika dari ketergantungan eksternal. Pendekatan ini mendukung prinsip-prinsip desain yang telah disebutkan dengan memastikan bahwa core aplikasi tetap bersih dan terisolasi dari komponen eksternal.

{{< zoom-image src="/img/project/hexagonal-architecture.webp" title="" alt="hexagonal architecture golang" >}}

- `Core` : Berisi logika bisnis aplikasi.
- `Ports` : Kumpulan abstraksi yang mendefinisikan bagaimana bagian luar sistem dapat berinteraksi dengan core. Ports dapat berupa interface yang digunakan oleh core untuk berinteraksi dengan komponen eksternal seperti database, notifikasi provider, dll. Saya biasanya menggunakan idiom golang dalam memberikan nama kepada tipe interface ini seperti `storer`, `reader`, `saver`, `assumer`.
- `Adapters` : Implementasi dari ports. Adapters menerapkan antarmuka yang didefinisikan oleh ports untuk menghubungkan core dengan komponen eksternal.

## Project structure

```bash
├── app
│   ├── api-user
│   │   ├── main.go
│   │   └── url_map.go
│   ├── consumer-user
│   │   └── main.go
│   └── tool-logfmt
│       └── main.go
├── business
│   ├── complex
│   │   ├── handler
│   │   │   └── handler.go
│   │   ├── helper
│   │   │   └── formula.go
│   │   ├── port
│   │   │   └── storer.go
│   │   ├── repo
│   │   │   └── repo.go
│   │   └── service
│   │       └── service.go
│   ├── notifserv
│   │   └── service.go
│   └── user
│       ├── handler.go
│       ├── repo.go
│       ├── service.go
│       ├── storer.go
│       └── worker.go
├── conf
│   ├── conf.go
│   └── confs.go
├── go.mod
├── go.sum
├── migrations
│   ├── 000001_create_user.down.sql
│   └── 000001_create_user.up.sql
├── models
│   ├── notif
│   │   └── notif.go
│   └── user
│       ├── user_dto.go
│       └── user_entity.go
└── pkg
    ├── db-pg
    │   └── db.go
    ├── errr
    │   └── custom_err.go
    ├── mid
    │   └── middleware.go
    ├── mlog
    │   ├── log.go
    │   └── logger.go
    └── validate
        └── validate.go
```

### Folder: app/

Folder App menyimpan kode yang tidak dapat digunakan ulang. Fokus code didalam folder ini antara lain : 
- Titik awal program ketika dijalankan (memulai dan menghentikan aplikasi).
- Menyusun kode dependency yang diperlukan program. 
- Spesifik untuk operasi input/output. 

Pada kebanyakan projek lainnya, folder ini akan dinamakan dengan `cmd`. Dinamakan app karena posisi folder akan berada diatas (yang mana dirasa cukup bagus) dan cukup mewakili fungsi folder.  

Alih-alih menggunakan kerangka kerja seperti Cobra untuk memilih aplikasi yang dijalankan, kita menggunakan metode paling sederhana seperti menjalankan program dengan `go run ./app/api-user` untuk aplikasi API-USER dan `go run ./app/consumer-user` untuk aplikasi KAFKA-USER-CONSUMER.


### Folder: pkg/

Berisi paket-paket yang dapat digunakan ulang di mana saja, biasanya elemen dasar yang tidak terkait dengan modul bisnis, seperti logger, web framework, atau helper. Tempat untuk meletakkan library yang sudah di wrap agar mudah di mock. 
Lapisan aplikasi dan lapisan bisnis dapat mengimpor `pkg` ini.

Menggunakan `pkg/` sebagai penampung kode yang awalnya garu ingin di tempatkan dimana, terbukti dapat mempercepat proses development. Pertanyaan seperti `"Taruh di mana?"` akan mendapatkan jawaban `"Taruh di pkg/."` secara default.

### Folder: business/ atau internal/

Berisi code yang terkait dengan logika bisnis, problem bisnis, data bisnis.

#### Folder: business/{nama-domain}/*

Dalam setiap domain bisnis, ada layer service (atau core dalam istilah hexagonal) yang harus tetap bersih dari pustaka eksternal. Ini mencakup lapisan untuk mengakses data persisten (repo) dan interface-interface yang berfungsi sebagai port.

#### Folder: business/{nama-domain}/{subfolder}

Terkadang, sebuah domain dapat menjadi sangat kompleks, sehingga perlu memisahkan service, repo, dan elemen lainnya ke dalam beberapa bagian. Dalam kasus seperti ini, kita lebih memilih untuk mengatur dan memisahkan komponen-komponen tersebut ke dalam folder yang berbeda, yang juga akan memerlukan penggunaan package yang berbeda. Misalnya, business/complex.

### Folder: models

Model-model (termasuk DTO, Payload, Entitas) biasanya diletakkan di dalam package bisnis masing-masing. Namun, dalam kasus yang kompleks di mana aplikasi A membutuhkan model B dan C, kita bisa mempertimbangkan untuk menempatkan model-model tersebut di level yang lebih tinggi agar dapat diakses oleh semua bagian yang membutuhkannya.

Memisahkan struct antara Entity, DTO, dan Model cukup penting agar fleksibilitas dan kebersihan kode tetap terjaga. Hal ini disebabkan karena:
- Tidak selamanya apa yang dikonsumsi oleh logika bisnis akan sama persis dengan model database.
- Tidak selamanya response yang diterima user sama persis dengan tabel di database. Dan seterusnya.

Baca : [Memahami Pentingnya Memisahkan DTO, Entity dan Model dalam Pengembangan Aplikasi](/post/struct-separation)

## Rules

Sangat penting untuk membuat dan memperbarui aturan yang telah disepakati agar semua pihak mengikuti pendekatan yang konsisten. Misalnya, template repositori ini didasarkan pada kemampuannya untuk menghindari kode yang terlalu terikat (tightly-coupled), maka aturan `Cara Penulisan Dependensi Kode` menjadi sangat penting untuk dipatuhi. 

Aturan ini akan bertambah seiring berjalannya waktu. Misalnya, yang seringkali terjadi perbedaan pendapat : 
- `Seberapa dalam kondisi if else boleh dilakukan` 
- `Bagaimana cara melakukan database transaction di logic layer ?`. dan sebagainya. 

Baca juga [Teknik Implementasi Database Transaction pada Logic Layer di Backend Golang](/post/db-transaction)

### Cara Penulisan Dependensi Kode

#### Menggunakan Dependency Injection :
Dependency Injection (DI) adalah pola desain di mana dependensi disediakan dari luar objek tersebut. Ini membantu mengelola ketergantungan antar komponen, membuat kode lebih modular, dan memudahkan pengujian. Jadi, modul yang saling ketergantungan, harus bergantung pada abstraksi.

Contoh konstruktor untuk membuat logic service user  `business/user/service.go`

```go
type UserService struct {
	storer   UserStorer
	notifier NotifSender
}

// NewUserService memerlukan UserStorer dan NotifSender.
// UserStorer dan NotifSender adalah abstraksi yang diperlukan oleh UserService
// Objek yang akan memenuhi UserStorer dan NotifSender ini akan ditentukan oleh 
// pengaturan dependensi di folder /app.
// UserStorer dan NotifSender juga dapat dibuat tiruannya untuk memudahkan pengujian
func NewUserService(store UserStorer, notifier NotifSender) *UserService {
	return &UserService{storer: store, notifier: notifier}
}
```

#### Menerapkan Prinsip Dependency Inversion: 
Di lapisan business, terutama untuk bagian logic (biasanya dinamakan `service.go` atau `usecase.go` atau `core`), komunikasi antar layer mengandalkan abstraksi dan penerapan prinsip `dependency inversion` yang kuat. Dalam golang, dependensi inversi yang sesungguhnya bisa dicapai seperti penjelasan pada gambar berikut.  

{{< zoom-image src="/img/project/invers-interface.webp" title="" alt="dependency inversion interface golang" >}}

Mengenai posisi interface, sebaiknya diletakkan pada modul yang membutuhkannya. Hal ini pernah dibahas dalam buku [100 Go Mistake and how to avoid them](https://www.manning.com/books/100-go-mistakes-and-how-to-avoid-them) dan beberapa buku lainnya.

Misalnya, domain `business/user` memerlukan fungsi untuk mengirimkan notifikasi yang bisa dipenuhi oleh `business/notifserv`, namun tidak secara gamblang `business/user` mengatakan perlu `business/notifserv`, melainkan lebih kepada mengatakan `"Saya perlu unit yang bisa menjalankan SendNotification()"` -- titik.  
Implementasi dependensinya dapat dilihat di `app/api-user/routing.go`. Metode ini mencegah error siklus dependensi impor dan memastikan kode tetap tidak terlalu terikat (tightly-coupled) antar domain.

Contoh dependensi yang dibutuhkan untuk membuat core logic user `business/user/storer.go`: 
```go
package user

import (
	"context"
	modelUser "templaterepo/models/user"
)

// UserStorer adalah interface yang mendefinisikan operasi yang dapat dilakukan terhadap database user.
// Interface ini Merupakan milik dari layer service dan dimaksudkan ditulis pada bagian layer service
// Meskipun kita tau persis implementasinya ada di business/user/repo.go, tetap layer service (core) hanya bergantung pada interface ini.
// Implementasi konkret dari antarmuka ini akan ditentukan oleh pengaturan dependensi di folder /app.
type UserStorer interface {
	Get(ctx context.Context, uid string) (modelUser.UserDTO, error)
	CreateOne(ctx context.Context, user *modelUser.UserEntity) error
}

// NotifSender adalah interface yang mendefinisikan operasi untuk mengirim notifikasi.
// Interface ini Merupakan milik dari layer service dan dimaksudkan ditulis pada bagian layer service
// Objek yang digunakan untuk mengirim notifikasi akan ditentukan oleh pengaturan dependensi di folder /app.
type NotifSender interface {
	SendNotification(message string) error
}
```

Contoh konstruktor untuk membuat notif `business/notifserv/service.go`
```go
package notifserv

type NotifService struct{}

// return konkrit struct, bukan interfacenya
// karena NotifService tidak dikekang hanya untuk menjadi NotifSender
func NewNotifServ() *NotifService { 
	return &NotifService{}
}

// SendNotification diperlukan untuk memenuhi interface NotifSender pada service user
func (n *NotifService) SendNotification(message string) error {
	// TODO : send notif to other server
	return nil
}

// SendWhatsapp tidak diperlukan oleh service user namun bisa jadi diperlukan oleh service lain
func (n *NotifService) SendWhatsapp(message string, phone string) error {
	// TODO : send whatsapp 
	return nil
}
```

### Aturan Lainnya yang Disepakati

- Ikuti panduan gaya Uber sebagai dasar ([https://github.com/uber-go/guide/blob/master/style.md](https://github.com/uber-go/guide/blob/master/style.md)). Aturan ini akan ditimpa apabila ada aturan yang tertulis disini.
- File konfigurasi hanya boleh diakses di main.go. Lapisan lain yang ingin mengakses konfigurasi harus menerimanya melalui parameter fungsi.
- Konfigurasi harus memiliki nilai default yang berfungsi di environment lokal, yang dapat ditimpa oleh file `.env` dan argumen pada command line.
- Error harus dihandle hanya sekali dan tidak boleh di abaikan. Maksudnya adalah antara di konsumsi atau di return, tetapi tidak keduanya sekaligus. contoh konsumsi : menulis error pada log, contoh return : mereturn error apabila error tidak nil.
- Jangan mengekspose variable dalam package, Gunakan kombinasi variabel private dan fungsi publik sebagai gantinya.
- Ketika kode banyak digunakan, buatlah helper.go. Namun jika digunakan di beberapa paket, buatlah paket baru (misalnya untuk mengekstrak error yang cuma ada di user, `/business/user/ipkg/error_parser.go`). Jika penggunaannya sangat luas, masukkan di `/pkg` (misalnya, `pkg/slicer/slicer.go`, `pkg/datastructure/ds.go`, `pkg/errr/custom_error.go`).
- Patuhi idiom golang. Namakan interface dengan akhiran -er atau -tor untuk menunjukkan bahwa mereka adalah interface, misalnya Writer, Reader, Assumer, Saver, Reader, Generator. ([https://go.dev/doc/effective_go#interface-names](https://go.dev/doc/effective_go#interface-names)). Contoh: Dalam proyek dengan tiga lapisan: UserServiceAssumer, UserStorer, UserSaver, UserLoader.

## Tools

### Makefile

Makefile berisi command untuk membantu proses menjalankan aplikasi dengan cepat karena tidak harus mengingat semua command yang panjang. Berfungsi seperti alias. Caranya adalah dengan menuliskan cmd di file Makefile seperti contoh berikut.

Baris teratas adalah comment yang akan muncul ketika memanggil helper.  
`.PHONY` adalah penanda agar terminal tidak menganggap command makefile sebagai akses ke file.  
`run/tidy:` adalah alias untuk cmd yang ada didalam nya.

```sh
## run/tidy: run golang formater and tidying code
.PHONY: run/tidy
run/tidy:
  @echo 'Tidying and verifying module dependencies...'
  go mod tidy
  go mod verify
  @echo 'Formatting code...'
  go fmt ./...
```

Sebagai contoh, untuk menjalankan aplikasi-aplikasi yang ada di repositori ini kita bisa menggunakan command seperti dibawah ini :  

```sh

# 1. pastikan ketersediaan dependency seperti database dll.
# 2. menjalankan aplikasi dengan makefile (lihat file Makefile)
$ make run/api/user

# command tersebut akan mengeksekusi
$ go run ./app/api-user
# sehingga mode http server dari aplikasi akan dijalankan

```  

### pre-commit

Disarankan menggunakan pre-commit ([https://pre-commit.com/](https://pre-commit.com/)).  

  ```bash
  // init
  pre-commit install

  // precommit akan di trigger setiap commit

  // manual
  pre-commit run --all-files

  ```

