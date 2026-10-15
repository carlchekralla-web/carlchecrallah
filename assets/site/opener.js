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
    el.classList.add('op-out');
    document.documentElement.classList.remove('op-lock');
    setTimeout(function () { el.remove(); }, 1100);
  }
  // hold for the sequence, but never longer than needed
  setTimeout(finish, reduce ? 700 : 2700);
  el.addEventListener('click', finish);
  window.addEventListener('keydown', finish, { once: true });
})();
