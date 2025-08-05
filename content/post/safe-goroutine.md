---
title: "Perhatikan hal-hal ini jika kamu menggunakan Golang Goroutine"
date: 2022-12-26T11:30:03+00:00
# weight: 1
tags: ["Golang", "Goroutine", "Context Management", "Error Handling", "Graceful Shutdown", "Best Practices"]
categories: ["Backend"]
author: "Muchlis at eFishery"
showToc: true
TocOpen: false
draft: false
hidemeta: false
comments: true
description: "Cara efektif menghindari kesalahan yang bisa terjadi pada penggunaan goroutine."
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
translationKey: "safe-goroutine"
---

Dalam pengembangan backend dengan Golang, pengelolaan proses di background menggunakan goroutine merupakan praktik umum yang dapat meningkatkan kinerja aplikasi. Namun, terdapat beberapa masalah umum yang sering dihadapi ketika mengimplementasikan goroutine, terutama dalam hal penanganan panic, pengelolaan context, dan proses shutdown yang baik. Artikel ini akan mengulas beberapa kesalahan umum yang terkait dengan penggunaan goroutine dan cara mengatasinya.

<!--more-->

## Masalah Umum dalam Penggunaan Goroutine
1. Panic di dalam sub goroutine tidak termasuk dalam area recovery main goroutine.
2. Context yang dipassing ke goroutine bisa terkena deadline atau canceled ketika main goroutine selesai dieksekusi.
3. Gracefully shutdown masih dapat mengabaikan proses background yang sedang diproses.

### 1. Menangani Panic di Dalam Sub Goroutine
Banyak pengembang yang beranggapan bahwa panic pada keseluruhan kode di service HTTP akan direcovery oleh middleware recovery. Padahal, recovery panic hanya berlaku pada satu goroutine. Jika kita memanggil goroutine lain, kita memerlukan kode recovery tambahan. Berikut adalah contohnya:

```go
func main() {
    // recovery panic untuk main program
    defer func() {
        if err := recover(); err != nil {
            fmt.Printf("panic recovered: %s", err)
        }
    }()

    go func() {
        // recovery panic untuk sub goroutine
        defer func() {
            if err := recover(); err != nil {
                fmt.Printf("panic recovered: %s", err)
            }
        }()    

        // Berjalan di latar belakang
        publish(context.Background(), response)
    }()

    ...
}
```

Untuk mempermudah, kita bisa membuat helper function sebagai berikut:

```go
func Background(fn func()) {
    go func() {
        defer func() {
            if err := recover(); err != nil {
                fmt.Printf("panic recovered: %s", err)
            }
        }()

        fn()
    }()
}
```
Dengan menggunakan helper function ini, kode contoh sebelumnya dapat diubah menjadi:

```go
func main() {
    // recovery panic untuk main program
    defer func() {
        if err := recover(); err != nil {
            fmt.Printf("panic recovered: %s", err)
        }
    }()

    Background(func() {
        publish(context.Background(), response)
    })

    ...
}
```

### 2. Mengelola Context pada Goroutine
Context selalu digunakan dalam program Golang untuk meneruskan data penting seperti tracing identification, request_id, dan untuk kebutuhan canceling proses. Namun, context yang diteruskan ke goroutine bisa menyebabkan masalah, terutama jika context tersebut selesai lebih cepat dari goroutine. Misalnya, context dari HTTP request diteruskan ke fungsi yang berjalan di goroutine yang berbeda. Jika context tersebut selesai, maka proses di goroutine akan dibatalkan jika aware terhadap context cancellation.

Contoh : 

```go
func SampleHandler(w http.ResponseWriter, r *http.Request) {
    response, err := doSomeTask(r.Context(), r)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return 
    }

    go func() {
        // misalnya publish memerlukan waktu 2 detik
        // dan aware terhadap status dari context
        err := publish(r.Context(), response)
    }()

    // SampleHandler selesai dalam 1 detik
    ...
}
```

Dengan contoh di atas, publish akan gagal dan mendapatkan error context canceled. Untuk mengatasi ini, kita bisa mengganti `r.Context()` dengan `context.Background()`. Namun, bagaimana jika kita memerlukan value di dalam `context`? Solusinya adalah membuat implementasi context kita sendiri:

```go
type Detach struct {
    ctx context.Context
}

func (d Detach) Deadline() (time.Time, bool) {
    return time.Time{}, false
}

// signal done akan diabaikan
func (d Detach) Done() <-chan struct{} {
    return nil
}

func (d Detach) Err() error {
    return nil
}

func (d Detach) Value(key any) any {
    return d.ctx.Value(key)
}

```

Dengan menggunakan context custom ini, signal cancellation dari parent context tidak akan berpengaruh, sedangkan value lainnya tetap sama. Berikut adalah penerapannya pada contoh sebelumnya:

```go
func SampleHandler(w http.ResponseWriter, r *http.Request) {
    response, err := doSomeTask(r.Context(), r)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return 
    }

    go func() {
        // misalnya publish memerlukan waktu 2 detik
        // publish akan tetap dilanjutkan meskipun lebih lama daripada main func
        err := publish(Detach{ctx: r.Context()}, response)
    }()

    // SampleHandler selesai dalam 1 detik
    ...
}

```


### 3. Melakukan Gracefully Shutdown dengan Goroutine
Gracefully shutdown adalah proses menunggu semua proses selesai sebelum aplikasi dihentikan total. Pada HTTP server, langkah-langkahnya biasanya sebagai berikut:

1. Mendapatkan sinyal terminate aplikasi.
2. Menutup HTTP server sehingga tidak ada request yang masuk.
3. Menunggu semua proses dalam satu siklus request-response selesai.
4. Menutup semua koneksi database.

Namun, bagaimana dengan proses yang masih berjalan di goroutine? Jika proses tersebut penting (misalnya invalidate cache), kita bisa menggunakan `sync.WaitGroup` untuk mendeteksi masih adanya proses yang belum selesai. Berikut adalah contoh kode yang menggunakan `sync.WaitGroup`:

```go
import (
    "context"
    "fmt"
    "sync"
)

// wgProcess waitgroup for gracefully shutdown background process
var wgProcess sync.WaitGroup

func Background(fn func()) {
    wgProcess.Add(1)

    go func() {
        defer wgProcess.Done()

        defer func() {
            if err := recover(); err != nil {
                log.Error(fmt.Sprintf("panic when run background process"), fmt.Errorf("%s", err))
            }
        }()

        fn()
    }()
}
```

Kode ini menjamin bahwa semua proses Background tercatat mulai dan selesainya melalui waitgroup. Pada main program yang menerapkan Gracefully Shutdown, kita tambahkan `wgProcess.Wait()` agar prosesnya blocking sampai waitgroup-nya 0 (saat semua proses selesai dijalankan). Pastikan bahwa fungsi yang menambahkan sync.WaitGroup bisa berhenti, atau tambahkan timeout.

---

Dengan memahami dan mengimplementasikan solusi-solusi di atas, Anda dapat mengelola proses background dengan lebih efektif di Golang. Selalu pastikan untuk menangani panic di setiap goroutine, mengelola context dengan tepat, dan melakukan shutdown aplikasi dengan baik agar semua proses dapat selesai dengan benar.