---
title: 'Mengapa Penting Memisahkan Entity dan Model dalam Pengembangan Aplikasi'
date: 2025-01-16T14:55:17+08:00
draft: false
# weight: 1
categories: ["Backend"]
tags: ["first"]
author: "Muchlis"
showToc: true
TocOpen: false
hidemeta: false
comments: true
description: 'Struct Separation'
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
    hidden: true # only hide on current single page
editPost:
    URL: "https://github.com/muchlist/paper/tree/main/content"
    Text: "Suggest Changes" # edit text
    appendFilePath: true # to append file path to Edit link
---

Dalam pengembangan API, terutama dengan Golang, sering kali kita menggunakan satu struktur data (struct) untuk berbagai keperluan, seperti representasi data di database sekaligus payload dalam request dan response API. Meskipun terlihat praktis, pendekatan ini sebenarnya dapat memunculkan masalah terkait keamanan dan pemeliharaan. Artikel ini akan membahas pentingnya memisahkan Entity dan Model dengan menerapkan prinsip Domain-Driven Design (DDD).

<!--more-->

## Memahami Domain-Driven Design: Entity, Model, & DTO
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
3. **Repository** : Menyembunyikan detail implementasi penyimpanan data. Struct model untuk database berfungsi sebagai media bantu untuk repository.
4. **Application Service** : Menangani logika yang memerlukan interaksi dengan komponen eksternal atau layanan lainnya, dalam clean architecture ini sering disebut usecase dimana memerlukan interaksi ke repository atau api client pihak ketiga. Menghandle operasi-operasi yang tidak secara alami cocok dalam konteks Entity atau Value Object.

Sebenarnya masih banyak yang lain, Misalnya Value Object, Aggregate, Domain-Service dll. Namun kita ingin agar apa yang bisa diterapkan berada ditengah-tengah antara cukup baik untuk maintainability, tapi tidak menjadi terlalu rumit, jadi disini kita agak sedikit longgar dalam penerapan DDD tersebut.

## Mengapa Pemisahan itu Penting?

Menggunakan struktur yang sama di berbagai lapisan aplikasi (database, logika bisnis, presentasi) dapat menciptakan keterikatan yang tinggi. Ini berarti perubahan di satu area, seperti database, dapat mempengaruhi area lain, seperti API. Misalnya, menambahkan kolom baru di database yang tidak relevan untuk pengguna API tetapi diperlukan untuk proses internal dapat menyebabkan perluasan struct yang tidak perlu dan bahkan mengacaukan logika aplikasi.  

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

### Skenario
Suatu hari, API cuaca pihak ketiga mengumumkan perubahan pada respons mereka, menambahkan lebih banyak detail seperti airQualityIndex, visibility, dan uvIndex. Bahkan melakukan perubahan major ke versi 2 seperti split temperatur menjadi temperature_celcius dan temperature_kelvin.

### Dampak Tanpa Pemisahan Struktur
Jika kita menggunakan Weather struct yang sama untuk menangkap respons dari API, menyimpan data di database, dan juga sebagai respons API kita, perubahan pada API pihak ketiga dapat menyebabkan beberapa masalah:
- **Overfetching and Irrelevant Data**: kita mungkin tidak memerlukan semua data tambahan seperti temperature_kelvin atau uvIndex untuk tujuan aplikasi kita, tetapi karena menggunakan struktur yang sama, kita terpaksa menangani data ekstra ini.
- **Peningkatan Kompleksitas**: Perubahan atau penambahan lebih banyak field ke Weather struct meningkatkan kompleksitas pengelolaan data tersebut, baik dalam hal pemrosesan maupun penyimpanan.
- **Perubahan di Banyak Tempat**: Perlu mengubah database, logika bisnis, dan mungkin juga frontend untuk menangani data baru.

### Dampak Dengan Pemisahan Struktur
Dengan pemisahan DTO, Entity, dan Model, kita dapat lebih efisien dalam menangani perubahan ini:

DTO (Data Transfer Object): kita membuat DTO khusus untuk menangkap respons dari API cuaca yang mencakup semua data baru (atau hanya data relevan). Membantu kita untuk mengetahui ketersediaan data dari API.  
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

Entity: Entity Weather dalam aplikasi kita hanya menyimpan data yang relevan untuk fungsi aplikasi, seperti Temperature, Humidity, dan Description. Tidak perlu menyimpan uvIndex atau visibility jika data tersebut tidak digunakan dalam proses perencanaan acara, dengan begitu kita mengetahui data mana yang penting untuk logic dan yang tidak.

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

Logika Bisnis (Usecase Layer): Logika bisnis hanya mengolah data yang sudah berupa Entity, Logika bisnis seharusnya tidak mengenal model database atau response dari API pihak ketiga. Ini memudahkan pemeliharaan dan mengurangi risiko error.

Database : Untuk keperluan menyimpan ke database gunakan struct tersendiri, khususnya jika menggunkan ORM
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

## Cara Memisahkan Struktur Data yang tepat

Saya menyarankan pendekatan berikut untuk memisahkan struktur data dalam arsitektur API yang robust dan scalable. Pendekatan ini memastikan bahwa setiap lapisan dalam aplikasi memiliki tanggung jawab yang jelas dan terpisah, sehingga memudahkan pemeliharaan dan pengembangan di masa mendatang.

### Struct untuk Lapisan API:
- WeatherRequest dan WeatherResponse: Struct ini digunakan untuk menangani data yang masuk dan keluar dari API. Mereka bertanggung jawab untuk memvalidasi dan memformat data sesuai dengan kebutuhan klien.
- Untuk kasus yang lebih kompleks, seperti fitur partial update, Anda mungkin memerlukan WeatherUpdateRequest. Versi ini menggunakan field pointer untuk memungkinkan pembaruan sebagian.
### Struct untuk Lapisan Domain: 
- WeatherEntity: Entity ini mewakili data dalam domain bisnis dan berisi logika yang terkait langsung dengan aturan bisnis. Entity harus stabil dan tidak terpengaruh oleh perubahan di lapisan lain, seperti database atau API eksternal.
- Untuk kasus yang lebih kompleks, seperti fitur partial update, Anda mungkin memerlukan WeatherUpdateDTO. Versi DTO yang juga menggunakan field pointer untuk fleksibilitas dalam pengiriman data.
### Struct untuk Lapisan Persistence:
- WeatherModel: Struct ini digunakan untuk interaksi dengan database. Model ini mencerminkan skema penyimpanan dan dapat berubah seiring dengan perubahan di layer database.

## Implementasi di Setiap Layer

{{< zoom-image src="/img/struct-separation/struct-separation.webp" title="" alt="struct separation layer" >}}

- Layer Handler: Menerima WeatherRequest, mengubahnya menjadi WeatherEntity, dan sebaliknya, mengubah WeatherEntity atau DTO dari usecase menjadi WeatherResponse.
- Layer Usecase: Beroperasi dengan WeatherEntity, memastikan bahwa logika bisnis dijalankan secara konsisten. Layer ini mengembalikan entity atau DTO sesuai kebutuhan.
- Layer Repository: Mengelola interaksi dengan database, menerima WeatherEntity atau DTO, dan mengembalikan WeatherEntity ke layer usecase.

Di level usecase, penting untuk menjaga agar kita hanya bekerja dengan entity. Entity adalah representasi domain yang harus tetap stabil meskipun ada perubahan di lapisan lain, seperti perubahan skema database. Dengan cara ini, logika bisnis kita tetap konsisten dan tidak terpengaruh oleh perubahan eksternal.

Untuk API yang berintegrasi dengan layanan eksternal, sangat dianjurkan untuk memiliki representasi entitas tersendiri dari respons API tersebut. Hal ini menjaga stabilitas logika internal dan mengurangi ketergantungan pada perubahan dari API eksternal. Misalnya, jika API eksternal mengembalikan data A-Z tetapi aplikasi kita hanya memerlukan A, B, dan C, kita dapat menghindari kebingungan di masa depan dengan hanya memproses data yang relevan.

Intinya :
- Handler Layer: Harus mengelola request dan response, mengubahnya ke tipe data internal yang kita kontrol.
- Usecase Layer: Harus bekerja dengan entity yang stabil, menghindari ketergantungan langsung pada model database atau format API eksternal.
- Repository Layer: Harus mengelola akses ke database dan mengubah data ke dan dari entity yang digunakan oleh usecase.
Pendekatan ini memastikan bahwa setiap lapisan terisolasi dari perubahan yang tidak relevan di lapisan lain, sehingga meningkatkan ketahanan dan fleksibilitas aplikasi.

## Kesimpulan
Menerapkan DDD dalam desain API tidak hanya membantu dalam pemisahan dan pengorganisasian kode tetapi juga meningkatkan keamanan dan keberlanjutan aplikasi. Walaupun mungkin terlihat sebagai penambahan kerumitan awal, pemisahan struktur data ini memfasilitasi pemeliharaan dan adaptasi sistem terhadap perubahan yang mungkin terjadi di masa depan. Dengan pendekatan ini, kita dapat memastikan bahwa setiap komponen sistem memiliki tanggung jawab yang jelas, mengurangi ketergantungan antar-modul, dan memperkuat arsitektur aplikasi secara keseluruhan.

Melalui pengintegrasian DDD dalam pembuatan API dengan Golang, developer dapat menciptakan sistem yang tidak hanya efisien tetapi juga mudah dikelola dan diperluas. Ini adalah investasi kecil di awal yang dapat menghemat banyak waktu dan sumber daya dalam pengembangan dan pemeliharaan sistem di masa depan.
