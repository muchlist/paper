---
title: "Golang Profiling"
date: 2020-09-15T11:30:03+00:00
# weight: 1
# aliases: ["/first"]
tags: ["golang", "profiling", "benchmark"]
author: "Muchlis"
# author: ["Me", "You"] # multiple authors
showToc: true
TocOpen: false
draft: false
hidemeta: false
comments: false
description: "Bagaimana cara melakukan pengukuran kinerja aplikasi golang."
canonicalURL: "https://canonical.url/to/page"
disableHLJS: false # to disable highlightjs
disableShare: false
disableHLJS: false
hideSummary: false
searchHidden: false
ShowReadingTime: true
ShowBreadCrumbs: true
ShowPostNavLinks: true
ShowWordCount: true
ShowRssButtonInSectionTermList: true
UseHugoToc: true
cover:
    image: "<image path/url>" # image path/url
    alt: "<alt text>" # alt text
    caption: "<text>" # display caption under cover
    relative: false # when using page bundles set this to true
    hidden: true # only hide on current single page
editPost:
    URL: "https://github.com/<path_to_repo>/content"
    Text: "Suggest Changes" # edit text
    appendFilePath: true # to append file path to Edit link
---

Profiling adalah proses mengukur kinerja aplikasi untuk mengidentifikasi dan menganalisis berbagai aspek yang mempengaruhi performa, seperti penggunaan CPU, memori, dan goroutine. Profiling sangat penting dalam proses pengembangan untuk memastikan aplikasi berjalan efisien dan optimal serta untuk mendeteksi anomali.

## Tujuan Profiling pada artikel ini 

- Mendeteksi memory leak.
- Mengetahui code mana yang berjalan lambat.
- Optimasi code.

Output profiling di golang contohnya seperti ini :

![profile001.png](/img/pprof/pprof-sample.png)

## Persiapan

1. Modifikasi code. 
    
    Untuk dapat melakukan profiling yang dibutuhkan adalah import package `net/http/pprof`  agar service kita dapat menjalankan dan mengekspose endpoint `/debug/pprof` . Namun, alih alih menggunakan http server utama, menurut hemat saya alangkah lebih baik jika endpoint khusus debug tersebut di expose secara terpisah agar tidak ada kebocoran data yang tidak semestinya. 
    
    Implementasinya seperti contoh dibawah ini. 
    
    ```go
    package main
    
    import (
    	"net/http"
    	"net/http/pprof"
    )
    
    func debugMux() *http.ServeMux {
    	mux := http.NewServeMux()
    
    	// Register all the standard library debug endpoints.
    	mux.HandleFunc("/debug/pprof/", pprof.Index)
    	mux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
    	mux.HandleFunc("/debug/pprof/profile", pprof.Profile)
    	mux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
    	mux.HandleFunc("/debug/pprof/trace", pprof.Trace)
    
    	return mux
    }
    ```
    
    ```go
    func main() {
    	config := cfg.Load()
    	ctx := context.Background()
    
    	debugPort := 4000
    	serverPort := 8080
    
    	// start debug server in other goroutine menggunakan port 4000
    	debugMux := debugMux()
    	go func(mux *http.ServeMux) {
    		if err := http.ListenAndServe(fmt.Sprintf("0.0.0.0:%v", debugPort), mux); err != nil {
    			log.Error("serve debug api", err)
    		}
    	}(debugMux)
    
    	// start main server in main goroutine menggunakan port 8080
    	webApi := web.New(app.logger, serverPort, config.App.Env, config.App.Name)
    	err = webApi.Serve(app.routes())
    	if err != nil {
    		log.Error("serve web api", err)
    	}
    }
    ```
    
    pada contoh diatas, kita menjalankan 2 server http. yaitu port 4000 untuk debug/profiling dan 8080 untuk main program.
    
2. Menguji endpoint debug.
    
    ketika server dijalankan melakukan hit ke endpoint [`http://localhost:4000/debug/pprof/`](http://localhost:4000/debug/pprof/) akan menampilkan halaman web seperti berikut :
    
    ![debug pprof endpoint](/img/pprof/debug-pprof-endpoint.png)
    
    kalau kita baca Profile description, disitu kita bisa tau keuntungan apa saja, dan data apa saja yang bisa kita analisa dari endpoint ini.
    
    pada umumnya yang digunakan adalah 
    
    - allocs : untuk menganalisa memory berdasarkan sample
    - heap: untuk menganalisa memory pada program yang sedang berjalan
    - profile: untuk menganalisa processor.
3. Requirement tools.
    - Untuk menganalisa kita menggunakan `pprof` yang bisa dijalankan dengan perintah `go tool pprof <file/url>`
    - Program tambahan lainnya adalah graphviz (untuk membuat grafis)
        
        ```bash
        # ubuntu
        apt-get install graphviz gv
        
        # mac
        brew install graphviz
        ```
        

## Cara melakukan Memory Profiling

1. Mendapatkan sample data heap / allocs. command dibawah akan menghasilkan sebuah file bernama heap.out
    
    ```bash
    curl -s -v http://localhost:4000/debug/pprof/heap > heap.out
    ```
    
2. Mulai analisa file tadi dengan pprof
    
    ```bash
    go tool pprof heap.out
    ```
    
    command yang biasa digunakan :
    
    - top : untuk menampilkan data penggunaan memory teratas
    - top50 : untuk menampilkan top sesuai jumlah angka (Top n)
    - top -cum : untuk menampilkan top dengan urutan memory cumulative
    - png : untuk mencetak graphic profiling
    - web: untuk menampilkan graphic di browser
    - list <name func regex> : untuk analisa fungsi lebih dalam
    
    hint:
    
    - flat means that the memory allocated by this function and is held by that function
    - cum(cumulative) means that the memory was allocated by this function or function that it called down the stack
    
    Umumnya semua penggunaan memory bisa terlihat dengan command `png` atau `web` yang akan menampilkan graphic seperti berikut ini. Gambar dibawah ini adalah penggunaan yang cukup normal. jika terjadi memory leak kita bisa dengan mudah melihat kotak besar yang sangat mencolok yang dari waktu kewaktu akan terus membesar :
    
    ![profile001.png](/img/pprof/pprof-sample.png)
    
    untuk lebih detail pprof juga bisa di jalankan hanya menggunakan terminal :
    
    ![heap-out.png](/img/pprof/pprof-heap-out.png)
    
    Menggunakan command `top20 -cum` akan menampilkan fungsi apa saja yang meminjam memory secara kumulatif (dijumlahkan dengan fungsi fungsi pada tumpukan dibawahnya).
    Kita bisa mengabaikan jumlah pemakaian yang wajar, misalnya go-chi sangat wajar mengendap memory sebesar 19MB karena barusan dilakukan load test pada service ini.
    
    misal, anggaplah `jack/chunkreader` mencurigakan. maka tahap selanjutnya kita bisa jalankan perintah `list github.com/jackc/chunkreader/v2.*` (perintah list menggunakan pattern regex)
    
    sehingga menampilkan 
    
    ![top-cum.png](/img/pprof/top-cum.png)
    
    dari sana kita bisa melihat fungsi mana saja yang dirasa kurang optimal jika memang angkanya tidak pas.
    

## Cara melakukan CPU Profiling

1. Agak berbeda dengan memory profiling, pengujian cpu harus di trigger dan dilakukan load pada saat pengambilan data samplenya aktif.
2. Perintah berikut akan mengaktifkan collect profilling cpu selama 5 detik. (meski saat pengujian tetap dikoleksi selama 30s)
    
    ```bash
    go tool pprof http://localhost:4000/debug/pprof/profile\?second\=5
    ```
    
3. Disaat yang bersamaan, lakukan load test. Bisa menggunakan hey atau jmeter atau cuma test manual saja.
4. Hasilnya akan seperti berikut
    
    ![top10-cum.png](/img/pprof/top10-cum.png)
    
    Pada data diatas saya mengecek middleware buatan sendiri yang ternyata proses lamanya adalah di next.ServeHTTP, yang mana itu wajar karena perhitungan kumulatif (dibawah fungsi tersebut akan dijalankan program yang sebenarnya, yaitu menuju handler → service → repo).
    
5. Sample gambar jika melakukan command `png`:
    
    ![output-png.png](/img/pprof/output-png.png)
    
    ## Garbage Collector
    
    Menganalisa peforma juga bisa kita lihat dari jumlah Garbage Collector Cycle yang dijalankan dan juga alokasi memory setelah dan sebelum GC. Pasalnya banyak GC Cycle yang jalan artinya bisa jadi pertanda penggunaan alokasi memory yang tidak optimal, meskipun tidak selalu. Caranya :
    
    1. Jalankan program dengan command berikut ini :
        
        ```bash
        # Build dulu program kita
        go build ./app/api
        
        # Command untuk menjalankan program namun hanya menampilkan log gc
        GODEBUG=gctrace=1 ./api > /dev/null
        ```
        
        Log yang di print pada terminal adalah seperti ini:
        
        ```bash
        gc 1 @0.005s 3%: 0.007+1.6+0.028 ms clock, 0.063+0.12/1.2/0.25+0.22 ms cpu, 3->4->1 MB, 4 MB goal, 0 MB stacks, 0 MB globals, 8 P
        gc 2 @0.010s 3%: 0.024+0.96+0.002 ms clock, 0.19+0/1.2/0.34+0.022 ms cpu, 3->3->2 MB, 4 MB goal, 0 MB stacks, 0 MB globals, 8 P
        gc 3 @0.014s 3%: 0.087+1.4+0.005 ms clock, 0.70+0/1.0/1.8+0.044 ms cpu, 5->5->5 MB, 5 MB goal, 0 MB stacks, 0 MB globals, 8 P
        gc 4 @0.061s 1%: 0.090+1.0+0.019 ms clock, 0.72+0.082/1.4/0+0.15 ms cpu, 11->11->10 MB, 12 MB goal, 0 MB stacks, 0 MB globals, 8 P
        ```
        
        Cara baca :
        
        - `gc 4` artinya selama proses dihidupkan GC sudah berjalan 4 kali.
        - `11->11->10`  (`11` size sebelum GC, `11` size sesudah GC, `10` size live heap)
        - `0.090+1.0+0.019`  (`+1.0` gc time , `+0.019` stop the world time. lebih sedikit lebih baik)
    2. Saat program berjalan, test menggunakan hey, misalnya dengan 10.000 request dan lihat berapa jumlah GC yang dihasilkan.
    3. Catat request per second untuk perbandingan
    4. Jalankan profiling seperti sebelumnya.
        
        ```bash
        go tool pprof http://localhost:4000/debug/pprof/alloc
        # cari yang paling banyak menggunakan memory
        top 40 -cum
        list <name_func>
        ```
        
    5. Lihat heap apakah tetap kecil atau membesar, jika membesar maka artinya ada memory leak.
    6. Setelah melakukan perubahan (jika ada) ujicoba lagi dari step 1 dan bandingkan jumlah GC Cycle nya.
    7. Hasil tersebut membantu kita untuk memastikan memory yang digunakan sudah efesien atau belum dengan melihat jumlah GC cycle yang terjadi, dibarengi dengan alokasi heap sebelum dan sesudah GC cycle. 
    `GC time` dan `Stop the world time` juga akan menambah lamanya program yang dijalankan.
    8. Goalnya adalah peningkatan peforma yang bisa dibuktikan dengan perbandingan kepada code sebelumnya. Saya pribadi dengan cara membandingkan request per second.
    
    ## Bagaimana kita tau code yang kita ubah menjadi lebih baik?
    
    - Melakukan profiling seperti diatas dan membandingkan hasilnya.
    - Menggunakan tools seperti hey untuk load test dan membandingkan outputnya, misal `request per second` . catat hasil sebelum diubah dan sesudah diubah.
    contoh hey :
        
        ![hey.png](/img/pprof/hey.png)
        
    - Melihat peforma Garbage Collector ketika dilakukan load test.