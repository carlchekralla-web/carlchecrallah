/* Shared behaviour: menu, EN/FR switch, stencil spray-in, video visibility, manifest peek. */
(function () {
  var doc = document.documentElement;
  doc.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Menu ─────────────────────────────────────────────── */
  var btn = document.querySelector('.menu-btn');
  var nav = document.querySelector('.nav');
  if (btn && nav) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target)) { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ── Language ─────────────────────────────────────────── */
  // English lives in the HTML; FR strings come from window.SITE_FR (i18n.js).
  var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-i18n]'));
  nodes.forEach(function (el) { el.__en = el.innerHTML; });
  var attrNodes = Array.prototype.slice.call(document.querySelectorAll('[data-i18n-aria]'));
  attrNodes.forEach(function (el) { el.__enAria = el.getAttribute('aria-label'); });

  function applyLang(lang) {
    var fr = window.SITE_FR || {};
    nodes.forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      el.innerHTML = (lang === 'fr' && fr[k] !== undefined) ? fr[k] : el.__en;
    });
    attrNodes.forEach(function (el) {
      var k = el.getAttribute('data-i18n-aria');
      el.setAttribute('aria-label', (lang === 'fr' && fr[k] !== undefined) ? fr[k] : el.__enAria);
    });
    doc.lang = lang;
    document.querySelectorAll('.lang button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
    });
    try { localStorage.setItem('lang', lang); } catch (e) {}
    document.dispatchEvent(new CustomEvent('site:lang', { detail: lang }));
  }
  var initial = 'en';
  try { initial = localStorage.getItem('lang') || 'en'; } catch (e) {}
  applyLang(initial === 'fr' ? 'fr' : 'en');
  document.querySelectorAll('.lang button').forEach(function (b) {
    b.addEventListener('click', function () { applyLang(b.getAttribute('data-lang')); });
  });
  window.siteLang = function () { return doc.lang === 'fr' ? 'fr' : 'en'; };

  /* ── Stencil spray-in ─────────────────────────────────── */
  var sprays = document.querySelectorAll('.spray');
  if (reduce || !('IntersectionObserver' in window)) {
    sprays.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    sprays.forEach(function (el) { io.observe(el); });
  }

  /* ── Videos: load lazily, play only while visible ──────── */
  var vids = document.querySelectorAll('video[data-src], video[autoplay]');
  if ('IntersectionObserver' in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) {
          if (v.dataset.src && !v.src) { v.src = v.dataset.src; }
          v.muted = true;
          if (!reduce) { var p = v.play(); if (p) p.catch(function () {}); }
        } else { v.pause(); }
      });
    }, { rootMargin: '200px 0px', threshold: 0.01 });
    vids.forEach(function (v) { vio.observe(v); });
  }

  /* ── Manifest peek: a thumbnail rides the cursor ───────── */
  var peek = document.querySelector('.peek');
  if (peek && window.matchMedia('(hover: hover)').matches) {
    var rows = document.querySelectorAll('[data-peek]');
    var cur = null;
    rows.forEach(function (row) {
      row.addEventListener('mouseenter', function () {
        var src = row.getAttribute('data-peek');
        if (cur !== src) {
          cur = src;
          peek.innerHTML = /\.mp4$/i.test(src)
            ? '<video src="' + src + '" muted loop playsinline autoplay></video>'
            : '<img src="' + src + '" alt="">';
        }
        peek.classList.add('on');
      });
      row.addEventListener('mouseleave', function () { peek.classList.remove('on'); });
      row.addEventListener('mousemove', function (e) {
        var x = Math.min(window.innerWidth - 300, e.clientX + 24);
        var y = Math.min(window.innerHeight - 200, e.clientY - 80);
        peek.style.left = x + 'px'; peek.style.top = y + 'px';
      });
    });
  }

  /* ── Footer year ──────────────────────────────────────── */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
