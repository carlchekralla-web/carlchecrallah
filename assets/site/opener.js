/* Opening sequence, once per visit: the portrait surfaces inside a liquid blob,
   glitches into its colour channels, the name rises, then it blooms away.
   Loaded synchronously at the top of <body> so the page never flashes first. */
(function () {
  var KEY = 'cc-opened';
  try { if (sessionStorage.getItem(KEY)) return; sessionStorage.setItem(KEY, '1'); } catch (e) {}

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var music = document.body.classList.contains('music');
  var fr = false;
  try { fr = localStorage.getItem('lang') === 'fr'; } catch (e) {}

  var img = music ? 'assets/images/opener-cheux.jpg' : 'assets/images/opener-portrait.jpg';
  var name = music ? 'CHEUX' : 'Carl Checrallah';
  var tag = music ? (fr ? 'Artiste · Musicien' : 'Artist · Musician')
                  : (fr ? 'Motion design · Direction artistique' : 'Motion design · Art direction');

  var letters = name.split('').map(function (ch, i) {
    return '<span style="animation-delay:' + (0.55 + i * 0.045).toFixed(3) + 's">' + (ch === ' ' ? '&nbsp;' : ch) + '</span>';
  }).join('');

  var el = document.createElement('div');
  el.id = 'opener';
  el.setAttribute('aria-hidden', 'true');
  if (reduce) el.className = 'op-reduce';
  if (music) el.classList.add('op-music');
  el.innerHTML =
    '<div class="op-stage">' +
      '<div class="op-aura"></div>' +
      '<div class="op-face">' +
        '<i style="background-image:url(' + img + ')"></i>' +
        '<i class="op-r" style="background-image:url(' + img + ')"></i>' +
        '<i class="op-b" style="background-image:url(' + img + ')"></i>' +
      '</div>' +
      '<p class="op-name">' + letters + '</p>' +
      '<p class="op-tag">' + tag + '</p>' +
    '</div>';
  document.body.prepend(el);
  document.documentElement.classList.add('op-lock');

  var done = false;
  function finish() {
    if (done) return;
    done = true;
    document.documentElement.classList.remove('op-lock');
    var face = el.querySelector('.op-face');
    var target = document.querySelector('.site-header .id img');
    var b = target && target.getBoundingClientRect();
    if (reduce || !b || !b.width) {
      el.classList.add('op-out');
      setTimeout(function () { el.remove(); }, 1100);
      return;
    }
    // Fly the portrait into the header avatar: freeze it, then move and shrink it onto the target.
    var a = face.getBoundingClientRect();
    face.style.animation = 'none';
    face.style.borderRadius = getComputedStyle(face).borderRadius;
    var dx = (b.left + b.width / 2) - (a.left + a.width / 2);
    var dy = (b.top + b.height / 2) - (a.top + a.height / 2);
    var s = b.width / a.width;
    el.classList.add('op-fly');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        face.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
        face.style.borderRadius = '50%';
      });
    });
    setTimeout(function () { el.classList.add('op-landed'); }, 950);
    setTimeout(function () { el.remove(); }, 1250);
  }
  // hold for the sequence, but never longer than needed
  setTimeout(finish, reduce ? 700 : 2700);
  el.addEventListener('click', finish);
  window.addEventListener('keydown', finish, { once: true });
})();
