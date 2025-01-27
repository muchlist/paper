---
title: 'Memahami Pentingnya Memisahkan DTO, Entity dan Model dalam Pengembangan Aplikasi'
date: 2025-01-26T00:49:17+08:00
draft: false
# weight: 1
categories: ["Backend"]
tags: ["golang", "Best Practices"]
author: "Muchlis"
showToc: true
TocOpen: false
hidemeta: false
comments: true
description: 'Bagaimana pemisahan tanggung jawab antar struct (atau class) dapat meningkatkan keamanan, keberlanjutan, dan efisiensi dalam pengembangan aplikasi.'
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
# canonicalURL: "https://canonical.url/to/page"
cover:
    image: "/img/struct-separation/struct-separation.webp" # image path/url
    alt: "struct separation golang"
    hidden: true # only hide on current single page
editPost:
    URL: "https://github.com/muchlist/paper/tree/main/content"
    Text: "Suggest Changes" # edit text
    appendFilePath: true # to append file path to Edit link
---

Dalam pengembangan Aplikasi Golang, sering kali kita temukan satu struct object yang dipakai untuk berbagai keperluan, 
seperti representasi data di database sekaligus payload dalam request dan response API. 
Meskipun terlihat praktis, pendekatan ini sebenarnya dapat memunculkan masalah terkait keamanan dan pemeliharaan. 
Artikel ini akan membahas pentingnya memisahkan DTO, Entity dan Model dengan menerapkan sedikit prinsip Domain-Driven Design (DDD).

<!--more-->

## Memahami Entity, Model dan DTO dalam Prinsip Domain-Driven Design
Domain-Driven Design (DDD) adalah metodologi pengembangan perangkat lunak yang berfokus pada pemisahan tanggung jawab melalui pemodelan yang berorientasi pada domain bisnis. Dalam DDD, kita mengenal beberapa konsep penting:

1. **Data Transfer Object (DTO)** :  Digunakan untuk mengirimkan data antar fungsi tanpa melibatkan logika bisnis yang kompleks. Misalnya, struct untuk request, response, dan parameter fungsi.
2. **Entity** : Digunakan untuk menyimpan data yang akan digunakan dalam logika aplikasi. Sebuah struct disebut entity jika memiliki identitas (seperti ID) yang membedakannya dari data lain. Entity dapat memiliki logika sendiri. Misalnya, entitas Weather yang memiliki metode `IsOutdoorEventFeasible()` untuk mengevaluasi apakah cuaca cocok untuk acara luar ruang.
	```go
	type WeatherEntity struct {
		ID          string   // misal : Kombinasi Kode Lokasi dan Timestamp
		City        string  
		Temperature float64 
		Humidity    int     
		Description string  
	}

	// IsOutdoorEventFeasible mengevaluasi apakah cuaca cocok untuk acara luar ruang.
	func (w *WeatherEntity) IsOutdoorEventFeasible() bool {
		// acara luar ruang dianggap tidak layak jika:
		// - Suhu di bawah 15 derajat Celsius atau di atas 35 derajat Celsius
		// - Deskripsi cuaca mengindikasikan hujan atau badai
		if w.Temperature < 15 || w.Temperature > 35 {
			return false
		}
		if w.Description == "rain" || w.Description == "storm" {
			return false
		}
		return true
	}
	```
3. **Repository** : Object Repository menyembunyikan detail implementasi penyimpanan data. Sedangkan Struct Model berfungsi sebagai representasi data pada database yang digunakan oleh Repository.
4. **Application Service** : Menangani logika bisnis yang memerlukan interaksi dengan komponen eksternal atau layanan lainnya, dalam clean architecture ini sering disebut `usecase` atau `service`. 
Menghandle operasi-operasi yang tidak secara alami cocok dalam konteks Entity atau Value Object.

Sebenarnya masih banyak yang lain, Misalnya `Value Object`, `Aggregate`, `Domain-Service` dll. 
Namun kita ingin agar code kita menjadi "cukup-baik untuk maintainability", tetapi juga "tidak menjadi terlalu rumit", jadi disini kita agak sedikit longgar dalam penerapan DDD tersebut.

## Mengapa Pemisahan itu Penting?

Menggunakan struct yang sama di berbagai lapisan aplikasi (database, logika bisnis, presentasi) dapat menciptakan keterikatan yang tinggi. 
Ini berarti perubahan di satu area, seperti database, dapat mempengaruhi area lain, seperti API. 
Misalnya, menambahkan kolom baru di database yang tidak relevan untuk pengguna API tetapi diperlukan untuk proses internal dapat menyebabkan perluasan struct yang tidak perlu dan bahkan mengacaukan logika aplikasi.  

### Skenario

Misalkan kita memiliki aplikasi yang membantu pengguna merencanakan acara berdasarkan prakiraan cuaca. Aplikasi kita menggunakan API cuaca pihak ketiga untuk mendapatkan informasi cuaca terkini.

```go
type Weather struct {
    City        string    `json:"city" db:"city"`
    Temperature float64   `json:"temperature" db:"temperature"`
    Humidity    int       `json:"humidity" db:"humidity"`
    WindSpeed   float64   `json:"wind_speed" db:"wind_speed"`
    Description string    `json:"description" db:"description"`
}
```

Suatu hari, API cuaca pihak ketiga mengumumkan perubahan pada respons mereka, menambahkan lebih banyak detail seperti airQualityIndex, visibility, dan uvIndex. Bahkan melakukan perubahan major ke versi 2 seperti split temperatur menjadi temperature_celcius dan temperature_kelvin.

### Dampak Tanpa Pemisahan Struct (bad)
Jika kita menggunakan Weather struct yang sama untuk menangkap respons dari API, menyimpan data di database, dan juga sebagai respons API kita, perubahan pada API pihak ketiga dapat menyebabkan beberapa masalah berikut:
- **Perubahan di Banyak Tempat**: Perubahan di suatu struct artinya juga mengubah database, logika bisnis, dan mungkin juga data yang dikonsumsi oleh frontend.
- **Overfetching and Irrelevant Data**: kita mungkin tidak memerlukan semua data tambahan seperti temperature_kelvin atau uvIndex untuk tujuan aplikasi kita, tetapi karena menggunakan struktur yang sama, kita terpaksa menangani data ekstra ini.
- **Peningkatan Kompleksitas**: Dengan adanya data baru, kita mungkin memerlukan sedikit modifikasi pada tipe datanya untuk menyesuaikan Tag, Marshaler, Scanners and Valuers.

### Dampak Dengan Pemisahan Struct (good)
Sebaliknya, dengan memisahkan DTO, Entity, dan Model, kita dapat lebih efisien dalam menangani perubahan ini.

**DTO (Data Transfer Object):**  
kita membuat struct khusus untuk menangkap respons dari API cuaca yang mencakup semua data baru (atau hanya data relevan). 
Membantu kita untuk mengetahui ketersediaan data dari API.  
Terhadap skenario diatas, kita cukup menyesuaikan dibagian layer API Client saja.

```go
type WeatherAPIResponse struct {
    City                string  `json:"city"`
    TemperatureCelcius  float64 `json:"temperature_celcius"`
    TemperatureKelvin   float64 `json:"temperature_kelvin"`
    Humidity            int     `json:"humidity"`
    WindSpeed           float64 `json:"wind_speed"`
    Description         string  `json:"description"`
    AirQualityIndex     int     `json:"airQualityIndex"`
    Visibility          int     `json:"visibility"`
    UvIndex             int     `json:"uvIndex"`
}

func (w *WeatherAPIResponse) ToEntity(){
    // transform
}
```

**Entity:**  
Entity Weather dalam aplikasi kita hanya menyimpan data yang relevan untuk fungsi aplikasi, seperti Temperature, Humidity, dan Description. Tidak perlu menyimpan uvIndex atau visibility jika data tersebut tidak digunakan dalam proses perencanaan acara, dengan begitu kita mengetahui data mana yang penting untuk logic dan yang tidak.

```go
type WeatherEntity struct {
    ID          string   // Kombinasi Kode Lokasi dan Timestamp
    City        string  
    Temperature float64 
    Humidity    int     
    Description string  
}

// IsOutdoorEventFeasible mengevaluasi apakah cuaca cocok untuk acara luar ruang.
func (w *WeatherEntity) IsOutdoorEventFeasible() bool {
    // acara luar ruang dianggap tidak layak jika:
    // - Suhu di bawah 15 derajat Celsius atau di atas 35 derajat Celsius
    // - Deskripsi cuaca mengindikasikan hujan atau badai
    if w.Temperature < 15 || w.Temperature > 35 {
        return false
    }
    if w.Description == "rain" || w.Description == "storm" {
        return false
    }
    return true
}
```

**Logika Bisnis (Usecase Layer):**  
Logika bisnis seharusnya tidak mengenal model database atau response dari API pihak ketiga. Logika bisnis hanya mengolah data yang sudah berupa Entity atau yang kita bisa kontrol kestabilannya.  Ini memudahkan pemeliharaan dan mengurangi risiko error.

**Model Database:**  
Untuk keperluan menyimpan ke database gunakan struct tersendiri, khususnya jika menggunkan ORM
```go
type WeatherModel struct {
    ID          string  `db:"id"`  
    City        string  `db:"city"`
    Temperature float64 `db:"temperature"`
    Humidity    int     `db:"humidity"`
    Description string  `db:"description"`
}

func (w *WeatherModel) ToEntity(){
    // transform
}
func FromEntity(WeatherEntity) WeatherModel {
    // transform
}
```

dan seterusnya untuk `WeatherRequestDTO` dan `WeatherResponseDTO`.

## Trade-offs
Meskipun pemisahan struktur data seperti DTO (Data Transfer Object), Entity, dan Model database memiliki manfaat jangka panjang seperti keamanan, kemudahan dalam testing, dan separation of concern yang jelas, ada beberapa kekurangan yang perlu dipertimbangkan juga. Salah satu kekurangan utamanya adalah kebutuhan untuk melakukan transformasi antara struct-struct ini, yang berarti ada sedikit pengorbanan kecepatan.

Namun, pendekatan ini sering dianggap sebagai bayaran-yang-wajar untuk manfaat yang diperoleh. Buku-buku populer seperti Clean Code oleh Robert C. Martin, The Pragmatic Programmer oleh Andrew Hunt dan David Thomas, serta Refactoring: Improving the Design of Existing Code oleh Martin Fowler, sering kali menekankan pentingnya memprioritaskan kode yang benar dan mudah dipelihara sebelum fokus pada kecepatan.

Lagipula, latensi yang dihasilkan dari transformasi data ini sangat sangat sangat minim jika dibandingkan dengan latensi operasi database, yang cenderung menjadi bottleneck yang lebih signifikan dalam banyak aplikasi.

## Kapan Sebaiknya Tidak Memisahkan Struct?
- Sistemnya terlalu sederhana.
- Memerlukan kecepatan tinggi seperti dalam pengembangan game.
- Peningkatan peforma sekecil-kecilnya dinilai lebih penting daripada keterbacaan dan kemudahan pemeliharaan.

## Cara Memisahkan Struct yang tepat

Saya menyarankan pendekatan berikut untuk memisahkan struct golang dalam arsitektur API. 
Pendekatan ini memastikan bahwa setiap lapisan dalam aplikasi memiliki tanggung jawab yang jelas dan terpisah, sehingga memudahkan pemeliharaan dan pengembangan di masa mendatang.

### Struct untuk Lapisan Presentation:
- WeatherRequest dan WeatherResponse: Struct ini digunakan untuk menangani data yang masuk dan keluar dari API (presentation). Mereka bertanggung jawab untuk memvalidasi dan memformat data sesuai dengan kebutuhan klien.
- Untuk kasus yang lebih kompleks, seperti fitur partial update, Kamu mungkin memerlukan WeatherUpdateRequest. Versi ini menggunakan field pointer untuk memungkinkan pembaruan sebagian (partial update).
### Struct untuk Lapisan Domain: 
- WeatherEntity: Entity ini mewakili data dalam domain bisnis dan berisi logika yang terkait langsung dengan aturan bisnis. Entity harus stabil dan tidak terpengaruh oleh perubahan di lapisan lain, seperti database atau API eksternal.
- Untuk kasus yang lebih kompleks, seperti fitur partial update, Kamu mungkin memerlukan WeatherUpdateDTO. Versi DTO yang juga menggunakan field pointer untuk fleksibilitas dalam pengiriman data.
### Struct untuk Lapisan Persistence:
- WeatherModel: Struct ini digunakan untuk interaksi dengan database. Model ini mencerminkan skema penyimpanan dan dapat berubah seiring dengan perubahan di layer database.

## Diagram Implementasi

{{< zoom-image src="/img/struct-separation/struct-separation.webp" title="" alt="struct separation layer" >}}

Dengan asumsi menggunakan Clean Architecture atau Hexagonal Architecture, maka :

- Handler Layer mengelola data request dan response, mengubah request ke tipe data internal yang dapat kita kontrol sepenuhnya (entity) sebelum diteruskan ke Usecase.
- Usecase Layer bekerja dengan entity yang stabil, layer ini seharusnya menghindari ketergantungan langsung pada model database atau format API eksternal.
- Repository Layer mengelola akses ke database dan mengubah data ke dan dari entity yang digunakan oleh usecase.

Pendekatan ini memastikan bahwa setiap lapisan terisolasi dari perubahan yang tidak relevan di lapisan lain, sehingga meningkatkan ketahanan dan fleksibilitas aplikasi. 
Dengan memisahkan tanggung jawab di setiap layer, aplikasi menjadi lebih modular, memudahkan pemeliharaan dan skalabilitas.

## Kesimpulan
Mengimplementasikan pemisahan struct DTO, Entity dan Model dalam desain API menggunakan Golang merupakan investasi kecil yang bisa menghemat banyak waktu dan 
sumber daya untuk pengembangan dan pemeliharaan di masa depan, 
membuat sistem kita tidak hanya efisien tapi juga mudah untuk dikelola dan dikembangkan. 
Pendekatan ini dapat membagi tanggung jawab tiap komponen secara jelas, mengurangi ketergantungan antar-modul, dan pada akhirnya menguatkan keseluruhan arsitektur aplikasi itu sendiri. 

Tentu, tidak ada satu pendekatan yang sempurna untuk setiap situasi. 
Bagaimana pengalamanmu dalam mengimplementasikan atau mungkin tidak mengimplementasikan prinsip ini? 
Apakah ada kasus khusus di mana kamu menemukan alternatif yang lebih efektif? 
Mari berbagi pengalaman di kolom komentar.