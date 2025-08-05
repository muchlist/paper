---
title: "Pay Attention to These Things When Using Golang Goroutines"
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
description: "Effective ways to avoid mistakes that can occur when using goroutines."
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

In backend development with Golang, managing background processes using goroutines is a common practice that can improve application performance. However, there are several common problems often encountered when implementing goroutines, especially regarding panic handling, context management, and proper shutdown processes. This article will review some common mistakes related to goroutine usage and how to overcome them.

<!--more-->

## Common Problems in Goroutine Usage
1. Panics inside sub goroutines are not included in the main goroutine's recovery area.
2. Context passed to goroutines can be subject to deadline or cancellation when the main goroutine finishes execution.
3. Graceful shutdown can still ignore background processes that are being processed.

### 1. Handling Panic Inside Sub Goroutines
Many developers assume that panics in all code in HTTP services will be recovered by recovery middleware. However, panic recovery only applies to one goroutine. If we call another goroutine, we need additional recovery code. Here's an example:

```go
func main() {
    // panic recovery for main program
    defer func() {
        if err := recover(); err != nil {
            fmt.Printf("panic recovered: %s", err)
        }
    }()

    go func() {
        // panic recovery for sub goroutine
        defer func() {
            if err := recover(); err != nil {
                fmt.Printf("panic recovered: %s", err)
            }
        }()    

        // Running in background
        publish(context.Background(), response)
    }()

    ...
}
```

To make it easier, we can create a helper function as follows:

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
Using this helper function, the previous example code can be changed to:

```go
func main() {
    // panic recovery for main program
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

### 2. Managing Context in Goroutines
Context is always used in Golang programs to pass important data such as tracing identification, request_id, and for process canceling needs. However, context passed to goroutines can cause problems, especially if the context finishes faster than the goroutine. For example, context from HTTP requests is passed to functions running in different goroutines. If that context finishes, then the process in the goroutine will be canceled if it's aware of context cancellation.

Example:

```go
func SampleHandler(w http.ResponseWriter, r *http.Request) {
    response, err := doSomeTask(r.Context(), r)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return 
    }

    go func() {
        // suppose publish takes 2 seconds
        // and is aware of context status
        err := publish(r.Context(), response)
    }()

    // SampleHandler finishes in 1 second
    ...
}
```

With the above example, publish will fail and get a context canceled error. To overcome this, we can replace `r.Context()` with `context.Background()`. However, what if we need values inside the `context`? The solution is to create our own context implementation:

```go
type Detach struct {
    ctx context.Context
}

func (d Detach) Deadline() (time.Time, bool) {
    return time.Time{}, false
}

// done signal will be ignored
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

Using this custom context, cancellation signals from the parent context will have no effect, while other values remain the same. Here's its application to the previous example:

```go
func SampleHandler(w http.ResponseWriter, r *http.Request) {
    response, err := doSomeTask(r.Context(), r)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return 
    }

    go func() {
        // suppose publish takes 2 seconds
        // publish will continue even if it takes longer than main func
        err := publish(Detach{ctx: r.Context()}, response)
    }()

    // SampleHandler finishes in 1 second
    ...
}

```


### 3. Performing Graceful Shutdown with Goroutines
Graceful shutdown is the process of waiting for all processes to finish before the application is completely stopped. In HTTP servers, the steps are usually as follows:

1. Get application terminate signal.
2. Close HTTP server so no requests come in.
3. Wait for all processes in one request-response cycle to finish.
4. Close all database connections.

However, what about processes still running in goroutines? If the process is important (for example invalidate cache), we can use `sync.WaitGroup` to detect if there are still unfinished processes. Here's example code using `sync.WaitGroup`:

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

This code ensures that all Background processes are recorded for start and completion through waitgroup. In the main program that implements Graceful Shutdown, we add `wgProcess.Wait()` so the process blocks until the waitgroup is 0 (when all processes finish running). Make sure that functions adding sync.WaitGroup can stop, or add timeout.

---

By understanding and implementing the solutions above, you can manage background processes more effectively in Golang. Always make sure to handle panic in every goroutine, manage context properly, and perform application shutdown properly so all processes can finish correctly.