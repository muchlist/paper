---
title: 'Implementasi DB Transaction pada Logic Layer di Golang'
date: 2024-10-12T15:19:36+08:00
draft: false
# weight: 1
categories: ["Backend"]
tags: ["Golang","Best Practices","Database"]
author: "Muchlis"
showToc: true
TocOpen: false
hidemeta: false
comments: false
description: 'Teknik tingkat mahir untuk menerapkan database transaction pada arsitektur yang modular'
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
editPost:
    URL: "https://github.com/muchlist/paper/tree/main/content"
    Text: "Suggest Changes" # edit text
    appendFilePath: true # to append file path to Edit link
cover:
    image: "/img/db-transaction/db-trsansaction-ddd.webp"
    alt: "database transaction in service layer golang"
    hidden: true # only hide on current single page
images:
  - /img/db-transaction/db-trsansaction-ddd.webp
#   - image_02.png
---

Database transaction adalah aspek krusial dalam pengembangan aplikasi, terutama pada proyek yang menuntut konsistensi data yang tinggi. Artikel ini akan membahas bagaimana cara melakukan transaksi-database pada service layer (logic), dengan tetap mempertahankan prinsip-prinsip clean architecture dan separation of concerns.

<!--more-->
## Arsitektur terhadap Database Transaction

Dalam arsitektur populer seperti Clean Architecture, Hexagonal Architecture, maupun pendekatan Domain-Driven Design (DDD), pemisahan tanggung jawab menjadi kunci utama. Kita umumnya membagi kode menjadi beberapa lapisan, misalnya Handler -> Service -> Repository. Lapisan service idealnya berisi logika bisnis murni tanpa bergantung pada library eksternal, sementara repository bertanggung jawab atas interaksi dengan database.

Namun, ketika mengimplementasikan operasi database yang memenuhi prinsip ACID (Atomicity, Consistency, Isolation, Durability), muncul pertanyaan: **`di mana sebaiknya logika database-transaction ditempatkan?`** Di lapisan logika atau di lapisan repository? Hal ini seringkali menjadi dilema para programmer, terutama karena tantangan yang muncul dari prinsip arsitektur yang mendesak pemecahan akses ke datastore melalui berbagai repository yang kecil-kecil dan termodularisasi.

> note : Atomicity artinya Menjamin bahwa serangkaian operasi dalam satu transaksi harus sepenuhnya berhasil atau sepenuhnya gagal. 

Sebagai ilustrasi, mari kita tinjau kasus transfer uang antar rekening: "Transfer uang dari rekening A ke rekening B, perbarui semua data terkait, dan jika gagal, batalkan seluruh proses." Terdapat dua pendekatan umum:

### Pendekatan A : Logika Transaksi di Repository 

{{< zoom-image src="/img/db-transaction/transaction-logic-in-repo.webp" title="" alt="database transaction logic in repo" >}}

Pendekatan ini sederhana karena transaksi dimulai dan dikelola langsung di lapisan repository. Namun, pendekatan ini memiliki kelemahan: logika bisnis (transfer uang) tercampur dengan logika akses data. Bayangkan jika ada kebutuhan tambahan, seperti mengirim event saldo ke pihak ketiga sebagai bagian dari atomicity transaksi. Apakah repository harus memiliki dependensi ke layanan eksternal juga? Hal ini jelas melanggar prinsip separation of concerns. Selain itu, service layer menjadi sangat tipis, sehingga menghilangkan manfaat unit test pada layer tersebut.

### Pendekatan B : Logika Transaksi di Service

{{< zoom-image src="/img/db-transaction/transaction-logic-in-service.webp" title="" alt="database transaction logic in service" >}}

Pendekatan ini menempatkan logika transaksi di service layer, sesuai dengan prinsip separation of concerns. Namun, implementasinya lebih menantang. Bagaimana caranya agar service layer tetap independen dari library database, seperti GORM, sambil tetap bisa mengelola transaksi?


## Jadi, Di mana sebaiknya logika transaksi ditempatkan? Di lapisan logika atau di lapisan repository?
Jawabannya adalah di lapisan logika. Hal ini berlaku baik ketika proses mutasi yang melibatkan interaksi dengan beberapa sumber data, maupun ketika melakukan pengumpulan data (agregasi). Alasannya adalah karena logika bisnislah yang menentukan keadaan valid dari suatu kumpulan data pada waktu tertentu. Dengan kata lain, jika sebuah agregat tidak disimpan dalam keadaan yang utuh dan valid, maka operasi bisnis yang dilakukan akan dianggap tidak sesuai dengan aturan bisnis yang berlaku.  
Hal diatas juga sejalan dengan penuturan pada buku DDD yang pernah saya baca. [Domain Driven Design](https://www.oreilly.com/library/view/domain-driven-design-tackling/0321125215/)

{{< zoom-image src="/img/db-transaction/db-trsansaction-ddd.webp" title="" alt="database transaction position on ddd" >}}


## Tantangan dan Solusi
Menjaga agar lapisan service tetap murni dari ketergantungan pihak ketiga sambil mengelola transaksi database yang kompleks memang sulit. Namun, beberapa teknik dapat diterapkan untuk mengatasi masalah ini, seperti menggunakan abstraksi transaksi di service tanpa harus berurusan langsung dengan implementasi transaksi dari library database.

Untuk menjaga kemurnian service layer dan tetap mengelola transaksi database dengan efektif, kita akan menggunakan pendekatan berlapis dengan beberapa komponen kunci:

### 1. DBTX interface
Mendefinisikan interface yang mengabstraksi operasi database, baik operasi biasa maupun operasi dalam transaksi. Ini memungkinkan service layer untuk berinteraksi dengan database tanpa bergantung pada implementasi spesifik. Interface ini akan mencakup method-method seperti Exec, Query, QueryRow, Begin, Commit, Rollback, dan lainnya yang dibutuhkan. Kabar baiknya, jika kamu menggunakan gorm, hal ini tidak perlu dilakukan karena gorm sudah melakukannya (menggabungkan kedua method tersebut menjadi 1). Disini saya membuat contoh dengan menggunakan pgx.

```go
package dbtx

import (
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)
type DBTX interface {
    // method ini digunakan pgx untuk operasi biasa
	Prepare(ctx context.Context, name, sql string) (*pgconn.StatementDescription, error)
	Exec(ctx context.Context, sql string, arguments ...interface{}) (commandTag pgconn.CommandTag, err error)
	Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row

    // method ini digunakan pgx untuk operasi transaction
	Begin(ctx context.Context) (pgx.Tx, error)
	Commit(ctx context.Context) error
	Rollback(ctx context.Context) error

    // DBTX menggabungkan keduanya...
}
```

### 2. PGStore 
Menyediakan implementasi konkret dari interface DBTX untuk library pgx. Struktur ini akan menangani pemilihan antara koneksi database biasa atau koneksi transaksi. PGStore akan memeriksa apakah context berisi transaksi yang aktif (pgx.Tx). Jika ada, operasi database akan dilakukan menggunakan transaksi tersebut. Jika tidak, operasi akan dilakukan menggunakan koneksi pool pgxpool.

NewPGStore berfungsi untuk membuat instance PGStore. Fungsi ini menerima koneksi pool pgxpool dan (opsional) objek transaksi pgx.Tx. Hal ini akan memudahkan pembuatan instance PGStore dengan cara yang konsisten dan terkontrol.

```go
type PGStore struct {
	NonTX *pgxpool.Pool
	Tx    pgx.Tx
}

// NewPGStore return interface can execute TX and pgx.Pool
func NewPGStore(pool *pgxpool.Pool, tx pgx.Tx) DBTX {
	var pgstore PGStore
	if tx != nil {
		pgstore.Tx = tx
		return &pgstore
	}
	pgstore.NonTX = pool
	return &pgstore
}

// Begin implements DBTX
func (p *PGStore) Begin(ctx context.Context) (pgx.Tx, error) {
	if p.Tx != nil {
		return nil, errors.New("cannot begin inside running transaction")
	}
	return p.NonTX.Begin(ctx)
}

// Commit implements DBTX
func (p *PGStore) Commit(ctx context.Context) error {
	if p.Tx != nil {
		return p.Tx.Commit(ctx)
	}
	return errors.New("cannot commit: nil tx value")
}

// Rollback implements DBTX
func (p *PGStore) Rollback(ctx context.Context) error {
	if p.Tx != nil {
		return p.Tx.Rollback(ctx)
	}
	return errors.New("cannot roleback: nil tx value")
}

// Exec implements DBTX
func (p *PGStore) Exec(ctx context.Context, sql string, arguments ...interface{}) (commandTag pgconn.CommandTag, err error) {
	if p.Tx != nil {
		return p.Tx.Exec(ctx, sql, arguments...)
	}
	return p.NonTX.Exec(ctx, sql, arguments...)
}

// Prepare implements DBTX
func (p *PGStore) Prepare(ctx context.Context, name string, sql string) (*pgconn.StatementDescription, error) {
	if p.Tx != nil {
		return p.Tx.Prepare(ctx, name, sql)
	}
	return nil, errors.New("cannot prefare: pool does not have prefare method")
}

// Query implements DBTX
func (p *PGStore) Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
	if p.Tx != nil {
		return p.Tx.Query(ctx, sql, args...)
	}
	return p.NonTX.Query(ctx, sql, args...)
}

// QueryRow implements DBTX
func (p *PGStore) QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row {
	if p.Tx != nil {
		return p.Tx.QueryRow(ctx, sql, args...)
	}
	return p.NonTX.QueryRow(ctx, sql, args...)
}

```

### 3. Fungsi ExtractTx dan injectTx
Selanjutnya kita buat helper yang mengotomasi penggunaan `NewPGStore` ini.
`ExtractTx` digunakan untuk mengekstraksi `koneksi database transaction` yang disimpan pada context
`injectTx` digunakan untuk hal yang sebaliknya, yaitu menginjeksi `database transaction` ke context.


```go
package dbtx

import (
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type KeyTransaction string

const TXKey KeyTransaction = "unique-key-transaction"

// ExtractTx extract transaction from context and transform database into dbtx.DBTX
func ExtractTx(ctx context.Context, defaultPool *pgxpool.Pool) DBTX {
	tx, ok := ctx.Value(TXKey).(pgx.Tx)
	if !ok || tx == nil {
		return NewPGStore(defaultPool, nil)
	}
	return NewPGStore(nil, tx)
}

// injectTx injects transaction to context
func injectTx(ctx context.Context, tx pgx.Tx) context.Context {
	return context.WithValue(ctx, TXKey, tx)
}

```

### 4. TxManager dan fungsi WithAtomic
WithAtomic mengotomasi penggunaan ExtractTx dan injectTx ini. Merupakan wrapper function yang apabila gagal akan melakukan ROLEBACK, dan apabila berhasil akan melakukan COMMIT database transaction.

Singkatnya, ketika WithAtomic dipanggil, context akan terisi dengan database transaction, selanjutnya context berisi database transaction itu yang akan dipakai untuk menjalankan operasi-operasi database berikutnya, repository otomatis akan menggunakannya transaction ini karena melakukan ExtractTx setiap kali perintah database dieksekusi.

pada layer logika kita hanya berurusan dengan WithAtomic ini. 


```go
package dbtx

import (
	"log/slog"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TxManager interface {
	WithAtomic(ctx context.Context, tFunc func(ctx context.Context) error) error
}

type txManager struct {
	db  *pgxpool.Pool
	log *slog.Logger
}

func NewTxManager(sqlDB *pgxpool.Pool, log *slog.Logger) TxManager {
	return &txManager{
		db:  sqlDB,
		log: log,
	}
}

// =========================================================================
// TRANSACTION

// WithAtomic runs function within transaction
// The transaction commits when function were finished without error
func (r *txManager) WithAtomic(ctx context.Context, tFunc func(ctx context.Context) error) error {

	// begin transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}

	// run callback
	err = tFunc(injectTx(ctx, tx))
	if err != nil {
		// if error, rollback
		if errRollback := tx.Rollback(ctx); errRollback != nil {
			r.log.Error("rollback transaction", slog.String("error", errRollback.Error()))
		}
		return err
	}
	// if no error, commit
	if errCommit := tx.Commit(ctx); errCommit != nil {
		return fmt.Errorf("failed to commit transaction: %w", errCommit)
	}
	return nil
}
```

### 5. Implementasi WithAtomic dan ExtractTx
#### Service Layer: 
Service layer menggunakan TxManager.WithAtomic untuk membungkus logika bisnis dalam transaksi. Ini memastikan bahwa semua operasi database dalam logika bisnis tersebut dilakukan secara atomik.
#### Repository Layer: 
Repository layer menggunakan ExtractTx untuk mendapatkan objek DBTX yang tepat (berbasis transaksi atau koneksi biasa) dari context. Semua operasi database di repository dilakukan melalui objek DBTX ini.

Sehingga codenya akan kurang lebih menjadi seperti berikut.

```go

type service struct {
	Repo      AccountStorer
	TxManager TxManager // helper untuk transaction menjadi dependecy tambahan atau bisa digabung ke repo
}

func (s *service) TransferMoney(ctx context.Context, input model.TransferDTO) error {

	// shared variable untuk menampung hasil didalam WithAtomic jika ada
	// result := ...

	// Membungkus prosesnya dengan database transaction
	txErr := s.TxManager.WithAtomic(ctx, func(ctx context.Context) error {
		// Mengambil account A
		accountA, err := s.Repo.GetAccountByID(ctx, input.AccountA)
		if err != nil {
			return err // Gagal mengambil account A
		}

		// Mengambil account B
		accountB, err := s.Repo.GetAccountByID(ctx, input.AccountB)
		if err != nil {
			return err // Gagal mengambil account B
		}

		// Memeriksa apakah saldo account A cukup
		if accountA.Balance < input.Amount {
			return errors.New("saldo tidak cukup") // Gagal karena saldo tidak cukup
		}

		// Mengurangi saldo account A
		accountA.Balance -= input.Amount
		if err := s.Repo.UpdateAccount(ctx, accountA); err != nil {
			return err // Gagal update saldo account A
		}

		// Menambahkan jumlah ke saldo account B
		accountB.Balance += input.Amount
		if err := s.Repo.UpdateAccount(ctx, accountB); err != nil {
			return err // Gagal update saldo account B
		}

		return nil
	})

	if txErr != nil {
		return txErr
	}

	return nil
}


```


```go
// Mengambil account berdasarkan ID
func (r *repo) GetAccountByID(ctx context.Context, id uint) (model.AccountEntity, error) {
    dbtx := ExtractTx(ctx, r.db) // mengekstraksi context dan menjadikan db biasa menjadi DBTX interface

    var account model.AccountModel
    err := dbtx.QueryRow(ctx, "SELECT * FROM accounts WHERE id = $1", id).Scan( 
        /* ...scan fields of account... */ )
    
    return account, err
}

// Mengupdate account
func (r *repo) UpdateAccount(ctx context.Context, account model.AccountEntity) error {
    dbtx := ExtractTx(ctx, r.db) // mengekstraksi context dan menjadikan db biasa menjadi DBTX interface

    _, err := dbtx.Exec(ctx, `
        UPDATE accounts 
        SET balance = $1
        WHERE id = $2`, account.Balance, account.ID)

    return err
}
```

Dengan mengimplementasikan cara diatas, kita berhasil memisahkan lapisan logika dari ketergantungan pada library pihak ketiga. Pada contoh repository yang saya sertakan, dapat dilihat bahwa untuk mengganti ORM pun, service layer tidak memerlukan perubahan apapun. YEYY. 

Mari kita jabarkan lagi, apa saja keuntungannya : 
1. Logic layer tetap murni, tidak tercemar oleh package gorm atau driver lainnya.
2. Transaksi database dapat dikendalikan dengan efektif, memungkinkan untuk mengatur scope transaksi dijaga sekecil mungkin jika diperlukan. Pendekatan ini berbeda dengan penerapan transaksi dalam middleware, yang dapat menyebabkan seluruh proses logika berada dalam satu transaksi database.
3. Readability kode tetap terjaga.
4. Unit testing tetap berfokus pada logika bisnis saja.

## Sample Github Repository

Saya menyertakan contoh kode dalam dua versi, satu untuk GORM dan satu lagi untuk implementasi lainnya (pgx). Di sini, GORM lebih simple karena secara dasar GORM telah menggabungkan operasi database biasa dengan operasi database transaction.

Berikut ini repositorynya : [REPOSITORY](https://github.com/muchlist/example-dbtx-in-logic/blob/main/main.go) 

Dalam menerapkan transaksi database, penting juga untuk mempertimbangkan kemungkinan terjadinya deadlock. Dalam contoh kode yang saya berikan di atas, saya telah menyederhanakan kode dengan mengesampingkan aspek-aspek tersebut. Saya akan membahas tentang deadlock lebih lanjut dalam kesempatan berikutnya.