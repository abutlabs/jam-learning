// The site's one top bar. Every page, at any depth, has exactly
//
//     <nav id="site-nav" class="top-nav" aria-label="Main navigation"></nav>
//     <script src="<path to>assets/js/nav.js"></script>
//
// and this script fills it, so the bar is identical everywhere: the same logo, the same
// links in the same order; only the highlight moves. Links resolve from this file's own
// URL, so a page never says where it sits. tools/check.py fails a page that writes its
// own bar.
//
// The bar also owns the theme: the saved choice is applied here, before the page below
// paints, and the toggle is wired here.
(function () {
    'use strict';

    var ROOT = new URL('../../', document.currentScript.src);

    // [label, target from the site root, pages (from the site root) that highlight it]
    var LINKS = [
        ['Mixed testnet', 'mixed-testnet/index.html', /^mixed-testnet\//],
        ['Lasair', 'lasair/index.html', /^lasair\/(index\.html|lesson\.html)?$/],
        ['Observability', 'observability/index.html', /^observability\//],
        ['M1 Understanding', 'lasair/exam.html', /^lasair\/exam\.html$/],
        ['Playground', 'lasair/playground.html', /^lasair\/playground\.html$/],
        ['Labs', 'lasair/index.html#labs', /^lasair\/(conformance|mutation|divergences)\.html$/],
    ];
    var GITHUB = 'https://github.com/abutlabs/jam-learning';

    // ---- theme -------------------------------------------------------------------
    // Dark is the default (no attribute); light is data-theme="light".

    function savedTheme() {
        try { return localStorage.getItem('theme'); } catch (e) { return null; }
    }

    function applyTheme(theme) {
        if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
        else document.documentElement.removeAttribute('data-theme');
    }

    function toggleTheme() {
        var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        applyTheme(next);
        try { localStorage.setItem('theme', next); } catch (e) { /* private mode: not remembered */ }
    }

    var saved = savedTheme();
    applyTheme(saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

    // ---- the bar -----------------------------------------------------------------

    function el(tag, attrs, text) {
        var node = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
        if (text) node.textContent = text;
        return node;
    }

    var nav = document.getElementById('site-nav');
    if (!nav) return;
    var page = location.pathname.startsWith(ROOT.pathname)
        ? decodeURIComponent(location.pathname.slice(ROOT.pathname.length))
        : '';

    var logo = el('a', { href: new URL('index.html', ROOT).href, class: 'logo' });
    logo.appendChild(el('span', { class: 'logo-icon', 'aria-hidden': 'true' }, '\u{1F9ED}'));
    logo.appendChild(el('span', { class: 'logo-text' }, 'jam-learning'));

    var menu = el('button', {
        class: 'nav-menu', type: 'button', 'aria-label': 'Menu',
        'aria-expanded': 'false', 'aria-controls': 'site-nav-links',
    }, '☰');

    var links = el('div', { class: 'nav-links', id: 'site-nav-links' });
    LINKS.forEach(function (link) {
        var a = el('a', { href: new URL(link[1], ROOT).href }, link[0]);
        if (link[2].test(page)) {
            a.className = 'active';
            a.setAttribute('aria-current', 'page');
        }
        links.appendChild(a);
    });
    links.appendChild(el('a', { href: GITHUB, target: '_blank', rel: 'noopener' }, 'GitHub'));

    var theme = el('button', { class: 'theme-toggle', type: 'button', 'aria-label': 'Toggle light/dark theme' });
    theme.appendChild(el('span', { class: 'sun', 'aria-hidden': 'true' }, '☀'));
    theme.appendChild(el('span', { class: 'moon', 'aria-hidden': 'true' }, '☾'));
    theme.addEventListener('click', toggleTheme);

    var right = el('div', { class: 'nav-right' });
    right.appendChild(links);
    right.appendChild(theme);
    right.appendChild(menu);

    nav.replaceChildren(logo, right);

    function setOpen(open) {
        nav.classList.toggle('open', open);
        menu.setAttribute('aria-expanded', String(open));
    }
    menu.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
    links.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('click', function (e) { if (!nav.contains(e.target)) setOpen(false); });
})();
