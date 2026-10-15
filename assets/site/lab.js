/* Tools page demos. Each one runs only while it is on screen. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TAU = Math.PI * 2;

  function whenVisible(el, onChange) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { onChange(true); return; }
    new IntersectionObserver(function (en) { onChange(en[0].isIntersecting); }, { threshold: 0.15 }).observe(el);
  }
  function loop(fn) {
    var on = false, raf = 0, t0 = performance.now();
    function tick(now) { fn((now - t0) / 1000); if (on) raf = requestAnimationFrame(tick); }
    return {
      start: function () { if (!on) { on = true; raf = requestAnimationFrame(tick); } },
      stop: function () { on = false; cancelAnimationFrame(raf); },
    };
  }
  function fitCanvas(c) {
    var r = c.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return { w: w, h: h, d: d };
  }
  var fr = function () { return document.documentElement.lang === 'fr'; };

  /* ── washwish orb (ported from washwish/src/renderer/orb.ts) ── */
  var ORB = {
    idle: ['#38d6ff', '#7d5cff', '#ff4fd8', '#3f7bff'],
    listening: ['#38d6ff', '#7d5cff', '#ff4fd8', '#3f7bff'],
    thinking: ['#8fb0ff', '#c4a3ff', '#6fe3ff', '#e6e2ff'],
  };
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + Math.max(0, Math.min(1, a)) + ')';
  }
  function softEllipse(ctx, x, y, rx, ry, rot, color, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, ry / rx);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
  }
  function drawOrb(ctx, cx, cy, r, t, level, mode) {
    var pal = ORB[mode];
    var breathe = mode === 'thinking' ? 0.035 * Math.sin(t * 5) : 0.015 * Math.sin(t * 1.6);
    var R = r * (1 + level * 0.14 + breathe);
    ctx.save();
    var haloR = R * (1.45 + level * 0.55);
    var glow = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, haloR);
    glow.addColorStop(0, rgba(pal[1], 0.28 + level * 0.4));
    glow.addColorStop(0.5, rgba(pal[0], 0.1 + level * 0.15));
    glow.addColorStop(1, rgba(pal[0], 0));
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, haloR, 0, TAU); ctx.fill();
    var shell = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.4, R * 0.05, cx, cy, R);
    shell.addColorStop(0, '#454b5c'); shell.addColorStop(0.65, '#141824'); shell.addColorStop(1, '#04050a');
    ctx.fillStyle = shell; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R * 0.95, 0, TAU); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(' + Math.max(1, R * 0.16) + 'px)';
    var speed = mode === 'thinking' ? 2.2 : 0.7 + level * 3;
    for (var i = 0; i < pal.length; i++) {
      var phase = i * 1.9, a = t * speed * (0.55 + i * 0.18) + phase;
      var orbit = R * (0.3 + 0.2 * level + 0.05 * i);
      var bx = cx + Math.cos(a) * orbit * Math.cos(a * 0.63 + phase);
      var by = cy + Math.sin(a * 1.27 + phase) * orbit;
      var br = R * (0.62 + 0.22 * level + 0.08 * Math.sin(t * 2.3 + phase));
      var g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, rgba(pal[i], mode === 'idle' ? 0.85 : 1)); g.addColorStop(1, rgba(pal[i], 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
    }
    ctx.filter = 'blur(' + Math.max(0.5, R * 0.035) + 'px)';
    for (var k = 0; k < 2; k++) {
      ctx.save(); ctx.translate(cx, cy);
      ctx.rotate(t * (0.9 + level * 1.5) * (k ? -1 : 1) + k * 1.3);
      ctx.scale(1, 0.32 + 0.28 * level + 0.06 * Math.sin(t * 1.7 + k));
      var band = ctx.createLinearGradient(-R, 0, R, 0);
      band.addColorStop(0, rgba(pal[k], 0));
      band.addColorStop(0.5, rgba(k ? pal[2] : '#ffffff', 0.55 + level * 0.3));
      band.addColorStop(1, rgba(pal[k + 1], 0));
      ctx.strokeStyle = band; ctx.lineWidth = R * 0.07;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.62, 0, TAU); ctx.stroke(); ctx.restore();
    }
    ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
    var depth = ctx.createRadialGradient(cx - R * 0.15, cy - R * 0.2, R * 0.35, cx, cy, R);
    depth.addColorStop(0, 'rgba(0,0,8,0)'); depth.addColorStop(0.75, 'rgba(0,0,8,0.16)'); depth.addColorStop(1, 'rgba(0,0,8,0.62)');
    ctx.fillStyle = depth; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
    var lw = Math.max(1, R * 0.05);
    var rim = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    rim.addColorStop(0, 'rgba(255,255,255,0.95)'); rim.addColorStop(0.3, 'rgba(150,160,180,0.55)');
    rim.addColorStop(0.55, 'rgba(30,34,46,0.6)'); rim.addColorStop(0.8, 'rgba(170,185,210,0.6)'); rim.addColorStop(1, 'rgba(255,255,255,0.85)');
    ctx.strokeStyle = rim; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(cx, cy, R - lw / 2, 0, TAU); ctx.stroke();
    softEllipse(ctx, cx - R * 0.2, cy - R * 0.5, R * 0.52, R * 0.25, -0.35, '#ffffff', 0.75);
    softEllipse(ctx, cx - R * 0.38, cy - R * 0.42, R * 0.12, R * 0.07, -0.6, '#ffffff', 0.95);
    softEllipse(ctx, cx + R * 0.08, cy + R * 0.66, R * 0.46, R * 0.12, 0.1, '#dfe8ff', 0.22);
    ctx.restore();
  }
  (function () {
    var c = document.getElementById('orb'); if (!c) return;
    var ctx = c.getContext('2d');
    var btn = document.getElementById('holdTalk');
    var mode = 'idle', level = 0, held = false, thinkUntil = 0;
    function press(on) {
      held = on; btn.setAttribute('aria-pressed', String(on));
      if (on) mode = 'listening'; else { mode = 'thinking'; thinkUntil = performance.now() + 1100; }
    }
    btn.addEventListener('pointerdown', function (e) { e.preventDefault(); btn.setPointerCapture(e.pointerId); press(true); });
    btn.addEventListener('pointerup', function () { if (held) press(false); });
    btn.addEventListener('pointercancel', function () { if (held) press(false); });
    btn.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !held) { e.preventDefault(); press(true); } });
    btn.addEventListener('keyup', function (e) { if ((e.key === ' ' || e.key === 'Enter') && held) { e.preventDefault(); press(false); } });
    var L = loop(function (t) {
      var now = performance.now();
      if (mode === 'thinking' && now > thinkUntil) mode = 'idle';
      // a voice-like level: syllables over a slow phrase envelope
      var target = held ? Math.max(0, 0.35 + 0.35 * Math.sin(t * 9.3) * Math.sin(t * 3.1) + 0.25 * Math.sin(t * 1.3)) : 0;
      level += (target - level) * 0.18;
      var f = fitCanvas(c);
      ctx.clearRect(0, 0, f.w, f.h);
      drawOrb(ctx, f.w / 2, f.h / 2, f.w * 0.27, reduce ? 0 : t, level, mode);
    });
    whenVisible(c, function (v) { v ? L.start() : L.stop(); });
  })();

  /* ── rilinote board: notes created and connected by MCP calls ── */
  (function () {
    var host = document.getElementById('board'); if (!host) return;
    var svg = host.querySelector('svg'), line = document.getElementById('mcpLine');
    var NS = 'http://www.w3.org/2000/svg';
    function el(name, attrs, parent) { var e = document.createElementNS(NS, name); for (var k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; }
    var links = el('g', {}), cards = el('g', {});
    var notes = {};
    function note(id, x, y, title, color, sub) {
      var g = el('g', { transform: 'translate(' + x + ' ' + y + ') scale(0.6)', opacity: '0', style: 'transition: transform .6s cubic-bezier(.16,1,.3,1), opacity .4s' }, cards);
      el('rect', { x: 0, y: 0, width: 150, height: 62, rx: 6, fill: '#f1eee6' }, g);
      el('rect', { x: 0, y: 0, width: 150, height: 6, rx: 3, fill: color }, g);
      var t = el('text', { x: 12, y: 30, 'font-family': 'Archivo, sans-serif', 'font-weight': '700', 'font-size': 15, fill: '#151515' }, g); t.textContent = title;
      var s = el('text', { x: 12, y: 48, 'font-family': 'JetBrains Mono, monospace', 'font-size': 10, fill: '#5a564d' }, g); s.textContent = sub;
      notes[id] = { g: g, x: x, y: y };
      requestAnimationFrame(function () { g.setAttribute('transform', 'translate(' + x + ' ' + y + ') scale(1)'); g.setAttribute('opacity', '1'); });
      return g;
    }
    function connect(a, b, dashed) {
      var A = notes[a], B = notes[b];
      var x1 = A.x + 150, y1 = A.y + 31, x2 = B.x, y2 = B.y + 31;
      if (x2 < x1) { x1 = A.x; x2 = B.x + 150; }
      var mx = (x1 + x2) / 2;
      var p = el('path', { d: 'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2, fill: 'none', stroke: dashed ? '#d9ff3d' : '#ff5b1f', 'stroke-width': 2.5, 'stroke-dasharray': dashed ? '6 6' : '' }, links);
      var len = p.getTotalLength();
      if (!dashed) { p.style.strokeDasharray = len; p.style.strokeDashoffset = len; p.getBoundingClientRect(); p.style.transition = 'stroke-dashoffset .9s cubic-bezier(.16,1,.3,1)'; p.style.strokeDashoffset = 0; }
    }
    var script = [
      { cmd: 'create_note', arg: '{ title: "Sprint Planning", priority: "high" }', run: function () { note('sp', 300, 250, 'Sprint Planning', '#ff5b1f', 'priority: high'); } },
      { cmd: 'connect_notes', arg: '("Design", "Launch")', run: function () { connect('de', 'la'); } },
      { cmd: 'update_note', arg: '("Sprint Planning", { parentId: "Launch" })', run: function () { connect('la', 'sp', true); } },
      { cmd: 'update_note', arg: '("Research", { checklist: ["refs", "moodboard"] })', run: function () {
        var g = notes.re.g; var s = g.querySelectorAll('text')[1]; s.textContent = 'checklist: 0/2'; } },
    ];
    var timers = [];
    function reset() {
      timers.forEach(clearTimeout); timers = [];
      while (links.firstChild) links.removeChild(links.firstChild);
      while (cards.firstChild) cards.removeChild(cards.firstChild);
      notes = {};
      note('de', 40, 50, 'Design', '#7d5cff', '3 subnotes');
      note('la', 430, 70, 'Launch', '#38d6ff', 'due: Friday');
      note('re', 70, 250, 'Research', '#d9ff3d', 'checklist: 0/0');
      line.innerHTML = '<b>claude</b> ▸ rilinote connected';
    }
    function play() {
      reset();
      var at = 1200;
      script.forEach(function (s) {
        timers.push(setTimeout(function () { line.innerHTML = '<b>claude</b> ▸ ' + s.cmd + s.arg; }, at));
        timers.push(setTimeout(s.run, at + 650));
        at += 2100;
      });
      timers.push(setTimeout(play, at + 2600));
    }
    var running = false;
    whenVisible(host, function (v) {
      if (v && !running) { running = true; reduce ? (reset(), script.forEach(function (s) { s.run(); })) : play(); }
      if (!v && running) { running = false; timers.forEach(clearTimeout); timers = []; }
    });
  })();

  /* ── Claude for AE: prompt → tool calls → keyframes → comp ── */
  (function () {
    var host = document.getElementById('ae'); if (!host) return;
    var promptEl = document.getElementById('aePrompt'), calls = host.querySelectorAll('.ae-calls span');
    var bar = document.getElementById('aeBar'), kfs = host.querySelectorAll('.kf'), ph = document.getElementById('aePh'), title = document.getElementById('aeTitle');
    var timers = [];
    var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
    function text() { return fr() ? 'Fais glisser le titre depuis la gauche, ease out, 1 seconde.' : 'Slide the title in from the left, ease out, 1 second.'; }
    function reset() {
      timers.forEach(clearTimeout); timers = [];
      promptEl.textContent = ''; calls.forEach(function (c) { c.classList.remove('on'); });
      bar.style.width = '0'; kfs.forEach(function (k) { k.classList.remove('on'); });
      ph.style.left = '0'; title.style.transform = 'translate(-260%, -50%)';
    }
    function run() {
      reset();
      var s = text(), at = 300;
      for (var i = 1; i <= s.length; i++) (function (i) { timers.push(setTimeout(function () { promptEl.textContent = s.slice(0, i); }, at + i * 28)); })(i);
      at += s.length * 28 + 400;
      calls.forEach(function (c, i) { timers.push(setTimeout(function () { c.classList.add('on'); }, at + i * 520)); });
      at += 520;
      timers.push(setTimeout(function () { bar.style.width = '70%'; }, at + 500));
      timers.push(setTimeout(function () { kfs[0].classList.add('on'); }, at + 1050));
      timers.push(setTimeout(function () { kfs[1].classList.add('on'); }, at + 1300));
      at += 1900;
      var dur = 1400, start = 0;
      timers.push(setTimeout(function () {
        start = performance.now();
        (function step(now) {
          var p = Math.min(1, (now - start) / dur);
          ph.style.left = (p * 60) + '%';
          var e = easeOut(Math.min(1, p / 0.57));
          title.style.transform = 'translate(' + (-260 + 210 * e) + '%, -50%)';
          if (p < 1) timers.push(requestAnimationFrame(step));
        })(start);
      }, at));
      timers.push(setTimeout(run, at + dur + 3200));
    }
    var running = false;
    whenVisible(host, function (v) {
      if (v && !running) {
        running = true;
        if (reduce) { promptEl.textContent = text(); calls.forEach(function (c) { c.classList.add('on'); }); bar.style.width = '70%'; kfs.forEach(function (k) { k.classList.add('on'); }); title.style.transform = 'translate(-50%, -50%)'; }
        else run();
      }
      if (!v && running) { running = false; timers.forEach(function (t) { clearTimeout(t); cancelAnimationFrame(t); }); timers = []; }
    });
    document.addEventListener('site:lang', function () { if (running && !reduce) run(); });
  })();

  /* ── Lirica: sung pitch vs corrected pitch ───────────────── */
  (function () {
    var c = document.getElementById('pitch'); if (!c) return;
    var ctx = c.getContext('2d');
    var speed = document.getElementById('speed'), out = document.getElementById('speedOut');
    var NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
    var SCALE = [0, 2, 4, 5, 7, 9, 11];
    var melody = [64, 67, 69, 67, 64, 62, 60, 62]; // E4 G4 A4 G4 E4 D4 C4 D4
    var LO = 58, HI = 71;
    function sung(t) {
      var n = melody.length, d = 0.62, i = Math.floor(t / d) % n, f = (t % d) / d;
      var a = melody[i], b = melody[(i + 1) % n];
      var glide = f > 0.82 ? (f - 0.82) / 0.18 : 0;
      var base = a + (b - a) * glide * glide;
      return base + 0.42 * Math.sin(t * 0.9) + 0.28 * Math.sin(t * 2.3 + 1) + 0.22 * Math.sin(t * 34) * Math.min(1, f * 3);
    }
    function nearest(m) {
      var best = m, bd = 99;
      for (var o = 3; o <= 6; o++) SCALE.forEach(function (s) { var x = 12 * (o + 1) + s; var dd = Math.abs(x - m); if (dd < bd) { bd = dd; best = x; } });
      return best;
    }
    function y(m, h) { return h - ((m - LO) / (HI - LO)) * h; }
    function sync() { out.textContent = speed.value + ' ms'; }
    speed.addEventListener('input', sync); sync();
    var L = loop(function (t) {
      var f = fitCanvas(c), w = f.w, h = f.h, d = f.d;
      ctx.clearRect(0, 0, w, h);
      // note rows
      ctx.font = (11 * d) + 'px JetBrains Mono, monospace';
      for (var m = LO; m <= HI; m++) {
        var pc = m % 12, inScale = SCALE.indexOf(pc) >= 0, yy = y(m, h);
        ctx.fillStyle = inScale ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.25)';
        ctx.fillRect(0, yy - h / (HI - LO) / 2, w, h / (HI - LO));
        if (inScale) { ctx.fillStyle = 'rgba(236,235,230,0.55)'; ctx.fillText(NAMES[pc] + Math.floor(m / 12 - 1), 8 * d, yy + 4 * d); }
      }
      var span = 4.2, now = reduce ? 3 : t, N = 260;
      var tau = Math.max(0.0005, speed.value / 1000);
      // warm up the corrector so the trace is continuous
      var outM = nearest(sung(now - span - 0.5));
      for (var k = 0; k < 40; k++) { var tt = now - span - 0.5 + k * 0.5 / 40; outM += (nearest(sung(tt)) - outM) * (1 - Math.exp(-(0.5 / 40) / tau)); }
      var ptsIn = [], ptsOut = [];
      for (var i = 0; i <= N; i++) {
        var ti = now - span + (i / N) * span, s = sung(ti), tgt = nearest(s);
        outM += (tgt - outM) * (1 - Math.exp(-(span / N) / tau));
        var x = 40 * d + (i / N) * (w - 48 * d);
        ptsIn.push([x, y(s, h)]); ptsOut.push([x, y(outM, h)]);
      }
      function stroke(pts, col, lw) { ctx.beginPath(); pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.strokeStyle = col; ctx.lineWidth = lw * d; ctx.lineJoin = 'round'; ctx.stroke(); }
      stroke(ptsIn, 'rgba(200,200,200,0.55)', 2);
      stroke(ptsOut, '#ff5b1f', 3);
    });
    whenVisible(c, function (v) { v ? L.start() : L.stop(); });
  })();

  /* ── JANE-01: faders shape a filter curve ────────────────── */
  (function () {
    var c = document.getElementById('filter'); if (!c) return;
    var ctx = c.getContext('2d');
    var faders = document.querySelectorAll('#janeFaders input');
    var chorus = document.querySelectorAll('#janeFaders [data-chorus]');
    var P = {};
    function read() { faders.forEach(function (f) { P[f.dataset.p] = f.value / 100; }); }
    faders.forEach(function (f) { f.addEventListener('input', read); }); read();
    chorus.forEach(function (b) { b.addEventListener('click', function () { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); }); });
    function mag(f, fc, q, hp) {
      var r = f / fc, lp = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(r / q, 2));
      var hr = f / hp, hpf = (hr * hr) / Math.sqrt(Math.pow(1 - hr * hr, 2) + Math.pow(hr / 0.707, 2));
      return lp * lp * hpf; // two stages ≈ 24 dB/oct
    }
    var L = loop(function (t) {
      var f = fitCanvas(c), w = f.w, h = f.h, d = f.d;
      ctx.clearRect(0, 0, w, h);
      var top = 18, bot = -48, X = function (hz) { return (Math.log10(hz) - Math.log10(20)) / 3 * w; }, Y = function (db) { return (top - db) / (top - bot) * h; };
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = d;
      [100, 1000, 10000].forEach(function (hz) { ctx.beginPath(); ctx.moveTo(X(hz), 0); ctx.lineTo(X(hz), h); ctx.stroke(); });
      [0, -24].forEach(function (db) { ctx.beginPath(); ctx.moveTo(0, Y(db)); ctx.lineTo(w, Y(db)); ctx.stroke(); });
      ctx.fillStyle = 'rgba(236,235,230,0.55)'; ctx.font = (11 * d) + 'px JetBrains Mono, monospace';
      ctx.fillText('100', X(100) + 4 * d, h - 8 * d); ctx.fillText('1k', X(1000) + 4 * d, h - 8 * d); ctx.fillText('10k', X(10000) + 4 * d, h - 8 * d);
      var lfo = reduce ? 0 : Math.sin(t * 2.4) * P.lfo * 0.6;
      var fc = Math.pow(10, Math.log10(60) + (P.freq + lfo * 0.3) * (Math.log10(16000) - Math.log10(60)));
      var q = 0.6 + P.res * P.res * 9, hp = 10 + P.hpf * P.hpf * 1200;
      var chorusOn = Array.prototype.filter.call(chorus, function (b) { return b.getAttribute('aria-pressed') === 'true'; }).length;
      for (var pass = chorusOn; pass >= 0; pass--) {
        var detune = pass ? Math.sin(t * (0.8 + pass * 0.7)) * 0.06 * pass : 0;
        ctx.beginPath();
        for (var i = 0; i <= 300; i++) {
          var hz = 20 * Math.pow(1000, i / 300), db = 20 * Math.log10(Math.max(1e-6, mag(hz, fc * (1 + detune), q, hp)));
          var xx = X(hz), yy = Y(Math.max(bot, Math.min(top, db)));
          i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
        }
        ctx.strokeStyle = pass ? 'rgba(217,255,61,0.28)' : '#ff5b1f'; ctx.lineWidth = (pass ? 1.5 : 3) * d; ctx.stroke();
        if (!pass) { ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fillStyle = 'rgba(255,91,31,0.08)'; ctx.fill(); }
      }
    });
    whenVisible(c, function (v) { v ? L.start() : L.stop(); });
  })();

  /* ── Drums: KIT / BEATS captures ─────────────────────────── */
  (function () {
    var img = document.getElementById('drumShot'); if (!img) return;
    var btns = document.querySelectorAll('[data-shot]');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        img.src = b.dataset.shot; img.alt = b.dataset.alt;
      });
    });
  })();

  /* ── Audio players with real waveforms ───────────────────── */
  (function () {
    var players = document.querySelectorAll('.player'); if (!players.length) return;
    var actx = null, current = null;
    var PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
    var PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
    function fmt(s) { s = Math.max(0, s || 0); return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); }
    players.forEach(function (p) {
      var btn = p.querySelector('button'), cv = p.querySelector('canvas'), time = p.querySelector('time');
      var audio = new Audio(); audio.preload = 'none'; audio.src = p.dataset.src;
      var peaks = null;
      function draw() {
        var f = fitCanvas(cv), ctx = cv.getContext('2d'), w = f.w, h = f.h;
        ctx.clearRect(0, 0, w, h);
        var prog = audio.duration ? audio.currentTime / audio.duration : 0;
        var n = peaks ? peaks.length : 90, bw = w / n;
        for (var i = 0; i < n; i++) {
          var v = peaks ? peaks[i] : 0.08;
          var bh = Math.max(2, v * (h - 16 * f.d));
          ctx.fillStyle = i / n < prog ? '#ff5b1f' : 'rgba(236,235,230,0.38)';
          ctx.fillRect(i * bw + bw * 0.2, h - 4 * f.d - bh, Math.max(1, bw * 0.6), bh);
        }
      }
      function loadPeaks() {
        if (peaks) return;
        fetch(p.dataset.src).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
          actx = actx || new (window.AudioContext || window.webkitAudioContext)();
          return actx.decodeAudioData(buf);
        }).then(function (ab) {
          var data = ab.getChannelData(0), n = 110, size = Math.floor(data.length / n), out = [], max = 0;
          for (var i = 0; i < n; i++) { var m = 0; for (var j = i * size; j < (i + 1) * size; j += 16) { var a = Math.abs(data[j]); if (a > m) m = a; } out.push(m); if (m > max) max = m; }
          peaks = out.map(function (x) { return x / (max || 1); });
          time.textContent = fmt(ab.duration);
          draw();
        }).catch(function () { draw(); });
      }
      whenVisible(p, function (v) { if (v) { loadPeaks(); draw(); } });
      var raf = 0;
      function tick() { draw(); time.textContent = fmt(audio.currentTime); if (!audio.paused) raf = requestAnimationFrame(tick); }
      btn.addEventListener('click', function () {
        if (audio.paused) {
          if (current && current !== audio) current.pause();
          current = audio; audio.play().catch(function () {});
        } else audio.pause();
      });
      audio.addEventListener('play', function () { btn.innerHTML = PAUSE; btn.setAttribute('aria-label', btn.getAttribute('aria-label').replace('Play', 'Pause')); tick(); });
      audio.addEventListener('pause', function () { btn.innerHTML = PLAY; btn.setAttribute('aria-label', btn.getAttribute('aria-label').replace('Pause', 'Play')); cancelAnimationFrame(raf); draw(); });
      audio.addEventListener('ended', function () { audio.currentTime = 0; draw(); time.textContent = fmt(audio.duration); });
      cv.parentElement.addEventListener('click', function (e) {
        if (!audio.duration) return;
        var r = cv.getBoundingClientRect(); audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration; draw();
      });
      window.addEventListener('resize', draw);
    });
  })();
})();
