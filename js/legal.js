/* legal.js — Privacy policy / Terms of use (pages/legal.html)
   1. Builds a small "On this page" list at the top of each section from its headings.
   2. Highlights the tab (Privacy policy / Terms of use) for the section you are reading.
   3. Shows a "back to top" button once you have scrolled down.
   Include it on the page:  <script src="../js/legal.js" defer></script> */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- 1. "On this page" lists ---------- */
    function slug(text) {
        return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    function buildContents() {
        document.querySelectorAll('.legal-card').forEach(function (card) {
            var headings = card.querySelectorAll('h3');
            if (headings.length < 3) return;

            var nav = document.createElement('nav');
            nav.className = 'legal-toc';
            nav.setAttribute('aria-label', 'On this page: ' + (card.querySelector('h2') || {}).textContent);

            var title = document.createElement('p');
            title.className = 'legal-toc-title';
            title.textContent = 'On this page';
            nav.appendChild(title);

            var list = document.createElement('ol');
            headings.forEach(function (h) {
                if (!h.id) h.id = card.id + '-' + slug(h.textContent);
                var li = document.createElement('li');
                var a = document.createElement('a');
                a.href = '#' + h.id;
                a.textContent = h.textContent;
                li.appendChild(a);
                list.appendChild(li);
            });
            nav.appendChild(list);

            // put it right after the "Last updated" line
            var anchor = card.querySelector('.updated');
            if (anchor) anchor.insertAdjacentElement('afterend', nav);
            else card.insertBefore(nav, card.children[1] || null);
        });
    }

    /* ---------- 2. active tab follows the section you are reading ---------- */
    function trackTabs() {
        var tabs = document.querySelectorAll('.legal-tabs a');
        var terms = document.getElementById('terms');
        if (!tabs.length || !terms) return;

        function mark() {
            var inTerms = terms.getBoundingClientRect().top <= window.innerHeight * 0.4;
            var id = inTerms ? '#terms' : '#privacy';
            tabs.forEach(function (a) {
                var on = a.getAttribute('href') === id;
                a.classList.toggle('active', on);
                if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
            });
        }
        window.addEventListener('scroll', mark, { passive: true });
        window.addEventListener('resize', mark);
        mark();
    }

    /* ---------- 3. back to top ---------- */
    function backToTop() {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'back-to-top';
        btn.setAttribute('aria-label', 'Back to top');
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        btn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        });
        document.body.appendChild(btn);

        function toggle() { btn.classList.toggle('show', window.scrollY > 600); }
        window.addEventListener('scroll', toggle, { passive: true });
        toggle();
    }

    function init() {
        buildContents();
        trackTabs();
        backToTop();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();