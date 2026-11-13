/* carouselDots.js
   Adds position dots between the ← → buttons of the "Suggested for you" carousel.
   Works alongside homePage.js: it reads which slide is showing and highlights that dot.
   Include it AFTER homePage.js:  <script src="/js/carouselDots.js" defer></script> */
(function () {
    'use strict';

    function init() {
        var track = document.getElementById('news-carousel-track');
        var prev = document.getElementById('hero-prev');
        var next = document.getElementById('hero-next');
        if (!track || !prev || !next) return;

        var dots = document.createElement('div');
        dots.className = 'carousel-dots';
        dots.setAttribute('aria-hidden', 'true');
        prev.insertAdjacentElement('afterend', dots);

        var counter = 0; // fallback when the active slide can't be read from the DOM

        function slides() {
            return Array.prototype.slice.call(track.children);
        }

        // 1) slide-by-transform carousels, 2) carousels that mark one slide .active
        function readIndex(list) {
            var m = /translateX\((-?[\d.]+)(%|px)/.exec(track.style.transform || '');
            if (m) {
                var v = Math.abs(parseFloat(m[1]));
                if (m[2] === '%') return Math.round(v / 100);
                var w = list[0] ? list[0].getBoundingClientRect().width : 0;
                if (w) return Math.round(v / w);
            }
            for (var i = 0; i < list.length; i++) {
                var c = list[i].classList;
                if (c.contains('active') || c.contains('is-active') || c.contains('current')) return i;
            }
            return null;
        }

        function render() {
            var list = slides();
            var n = list.length;

            if (dots.children.length !== n) {
                dots.innerHTML = '';
                for (var i = 0; i < n; i++) dots.appendChild(document.createElement('span'));
            }
            dots.style.display = n > 1 ? '' : 'none';

            var idx = readIndex(list);
            if (idx === null) idx = counter;
            idx = Math.max(0, Math.min(n - 1, idx));

            Array.prototype.forEach.call(dots.children, function (d, i) {
                d.classList.toggle('is-active', i === idx);
            });
        }

        // fallback counter, updated after homePage.js has handled the click
        next.addEventListener('click', function () {
            var n = slides().length || 1;
            counter = (counter + 1) % n;
            setTimeout(render, 0);
        });
        prev.addEventListener('click', function () {
            var n = slides().length || 1;
            counter = (counter - 1 + n) % n;
            setTimeout(render, 0);
        });

        // slides arrive from Supabase after load, and the track moves/changes classes
        new MutationObserver(render).observe(track, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
        window.addEventListener('resize', render);

        render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();