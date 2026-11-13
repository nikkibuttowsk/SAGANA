/* farmModal.js — close / Esc / click-outside for the farm pop-up, plus the "1 / 4" counter and dots.
   farm.js opens the pop-up (window.openFarmModal) once the selected farm has loaded.
   Include it on farm.html:  <script src="../js/farmModal.js" defer></script> */
(function () {
    'use strict';

    var root = document.documentElement;

    function open()  { root.classList.add('farm-open'); }
    function leave() {
        // close = go back to where the visitor came from (or the farm list)
        var sameSiteReferrer = document.referrer && new URL(document.referrer).origin === window.location.origin;
        if (sameSiteReferrer && window.history.length > 1) window.history.back();
        else window.location.href = 'farm-list.html';
    }
    window.openFarmModal = open;     // farm.js can call these too, e.g. after the farm loads
    window.closeFarmModal = leave;

    document.addEventListener('DOMContentLoaded', function () {
        // X button, Esc key, click outside the pop-up
        document.getElementById('farm-close')?.addEventListener('click', leave);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && root.classList.contains('farm-open')) leave();
        });
        document.addEventListener('click', function (e) {
            if (!root.classList.contains('farm-open')) return;
            if (e.target.closest('.farm-page-container, #site-header')) return;
            leave();
        });

        // "1 / 4" counter + dots follow whichever slide has .active
        var wrapper = document.querySelector('.carousel-wrapper');
        var counter = document.getElementById('slide-counter');
        var dots = document.getElementById('carousel-dots');
        if (!wrapper || !counter || !dots) return;

        function sync() {
            var slides = wrapper.querySelectorAll('.carousel-slide');
            var total = slides.length;
            var idx = Array.prototype.findIndex.call(slides, function (s) { return s.classList.contains('active'); });
            if (idx < 0) idx = 0;

            counter.hidden = dots.hidden = total < 2;
            counter.textContent = (idx + 1) + ' / ' + total;

            if (dots.children.length !== total) {
                dots.innerHTML = '';
                for (var i = 0; i < total; i++) dots.appendChild(document.createElement('span'));
            }
            Array.prototype.forEach.call(dots.children, function (d, i) {
                d.classList.toggle('is-active', i === idx);
            });
        }

        new MutationObserver(sync).observe(wrapper, {
            childList: true, subtree: true, attributes: true, attributeFilter: ['class']
        });
        sync();
    });
})();