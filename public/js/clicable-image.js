document.addEventListener('DOMContentLoaded', function() {
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
});