
### 20 Juli 2024 - Muchlis
untuk menambahkan fitur zoom image ketika di hover dan klik: 
- add assets/css
- add assets/js
- copy and modify 
    - layouts/_default/baseof.html => line 10 - 15
    - add layouts/shortcodes/zoom-image.html
```
before to show image we use this
![hey.png](/img/pprof/hey.png#center)

or
{{< figure align=center src="image.jpg" >}}

with this change, use 
{{< zoom-image src="/img/pprof/hey.png" title="" alt="hey example for load test" >}}
```
    