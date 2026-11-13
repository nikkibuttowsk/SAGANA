
(function () {
    'use strict';

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var timer = null;

    // same gap the CSS uses (html { scroll-padding-top }), so the section sits just under the header
    function offset() {
        var v = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
        if (!isNaN(v)) return v;
        var header = document.getElementById('site-header');
        return (header ? header.offsetHeight : 0) + 12;
    }
    function maxScroll() { return document.documentElement.scrollHeight - window.innerHeight; }
    function targetY(el) {
        return Math.max(0, Math.min(maxScroll(), el.getBoundingClientRect().top + window.scrollY - offset()));
    }

    // wait until the scrolling has stopped, then fix any shortfall (up to 4 times)
    function settle(el, smooth) {
        clearTimeout(timer);
        var lastY = -1, still = 0, fixes = 0;
        (function poll() {
            timer = setTimeout(function () {
                var y = window.scrollY;
                still = Math.abs(y - lastY) < 1 ? still + 1 : 0;
                lastY = y;
                if (still < 2) return poll();                       // still moving
                if (Math.abs(targetY(el) - y) > 3 && fixes++ < 4) {  // stopped short (content moved)
                    window.scrollTo({ top: targetY(el), behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
                    still = 0;
                    return poll();
                }
            }, 150);
        })();
    }

    function go(el, smooth) {
        window.scrollTo({ top: targetY(el), behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
        settle(el, smooth);
    }

    // clicks on links that point at a section of THIS page (#about, homePage.html#contact, …)
    document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href]');
        if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
        var url;
        try { url = new URL(a.href, location.href); } catch (err) { return; }
        if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash || url.hash === '#') return;
        var el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (!el) return;
        e.preventDefault();
        history.pushState(null, '', url.hash);
        go(el, true);
    });

    // arriving from another page with #about in the address: the browser jumps before the content has
    // loaded, so line it up again once everything is in
    function alignFromAddress() {
        if (!location.hash) return;
        var el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (el) setTimeout(function () { go(el, false); }, 350);
    }
    if (document.readyState === 'complete') alignFromAddress();
    else window.addEventListener('load', alignFromAddress);
})();