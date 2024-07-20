document.addEventListener('DOMContentLoaded', function() {
    // Zoom functionality
    const images = document.querySelectorAll('.clickable-image');
    images.forEach(image => {
        image.addEventListener('click', function() {
            const fullscreenDiv = document.createElement('div');
            fullscreenDiv.classList.add('fullscreen-image');
            const imgClone = this.cloneNode();
            fullscreenDiv.appendChild(imgClone);
            document.body.appendChild(fullscreenDiv);

            fullscreenDiv.addEventListener('click', function() {
                this.remove();
            });
        });
    });

    // Lazy load polyfill
    if ('loading' in HTMLImageElement.prototype) {
        const lazyImages = document.querySelectorAll('img[loading="lazy"]');
        lazyImages.forEach(img => {
            img.src = img.dataset.src;
        });
    } else {
        // Dynamically import the LazySizes library
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.2.2/lazysizes.min.js';
        script.integrity = 'sha512-w2XFRaI8Pj2UoEDDbBTT4j+cwx6NzAMsKxI1rEsTPYY6N6yf6dUBpcFSokGzt4W1Hb8Hg9G8ZCOd1pM/mg5Yfw==';
        script.crossOrigin = 'anonymous';
        document.body.appendChild(script);
    }
});
