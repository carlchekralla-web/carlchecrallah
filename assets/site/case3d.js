// Flight case hero: a laminate road case whose latches flip and lid lifts as you scroll,
// revealing a reel playing in the foam. Three.js + GSAP ScrollTrigger (scrub).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const hero = document.getElementById('hero');
const canvas = document.getElementById('caseCanvas');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch (e) { return false; }
}
if (!hero || !canvas || !webglOK()) {
  hero && hero.classList.add('no-gl');
} else {
  init();
}

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  /* ── Textures drawn in canvas (no raster assets) ─────────── */
  function hexTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#151515'; g.fillRect(0, 0, 512, 512);
    // grain
    const img = g.getImageData(0, 0, 512, 512);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() * 14) | 0;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 2;
    const s = 16, h = s * Math.sqrt(3);
    for (let y = -h; y < 512 + h; y += h) {
      for (let x = -s * 3; x < 512 + s * 3; x += s * 3) {
        for (const off of [0, 1]) {
          const cx = x + off * s * 1.5, cy = y + off * h / 2;
          g.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = Math.PI / 3 * k;
            const px = cx + s * Math.cos(a), py = cy + s * Math.sin(a);
            k ? g.lineTo(px, py) : g.moveTo(px, py);
          }
          g.closePath(); g.stroke();
        }
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }
  function foamTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#1f2023'; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 16) for (let x = 0; x < 256; x += 16) {
      const gr = g.createRadialGradient(x + 8, y + 8, 1, x + 8, y + 8, 9);
      gr.addColorStop(0, '#34363a'); gr.addColorStop(1, '#1a1b1e');
      g.fillStyle = gr; g.beginPath(); g.arc(x + 8, y + 8, 8, 0, Math.PI * 2); g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 6); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function labelCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // Lid stencil: drawn once fonts are ready, redrawn on language change for the tape label.
  const lidCanvas = labelCanvas(2048, 1260);
  const lidTex = new THREE.CanvasTexture(lidCanvas); lidTex.colorSpace = THREE.SRGBColorSpace; lidTex.anisotropy = 8;
  function drawLid() {
    const g = lidCanvas.getContext('2d');
    g.clearRect(0, 0, 2048, 1260);
    g.fillStyle = '#ff5b1f';
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = '900 430px "Big Shoulders Stencil", sans-serif';
    const fit = Math.min(1, 1740 / g.measureText('CHECRALLAH').width);
    g.font = '900 ' + Math.floor(430 * fit) + 'px "Big Shoulders Stencil", sans-serif';
    g.save(); g.globalAlpha = 0.94;
    g.fillText('CARL', 150, 560);
    g.fillText('CHECRALLAH', 150, 960);
    g.restore();
    // overspray
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(255,91,31,${Math.random() * 0.18})`;
      const x = 150 + Math.random() * 1750, y = 160 + Math.random() * 860;
      g.fillRect(x, y, 2, 2);
    }
    g.font = '600 64px "JetBrains Mono", monospace';
    g.fillStyle = 'rgba(236,235,230,0.82)';
    g.fillText('CC-00  ·  THIS SIDE UP  ·  FRAGILE', 160, 1110);
    lidTex.needsUpdate = true;
  }
  const tapeCanvas = labelCanvas(1400, 220);
  const tapeTex = new THREE.CanvasTexture(tapeCanvas); tapeTex.colorSpace = THREE.SRGBColorSpace; tapeTex.anisotropy = 8;
  function drawTape() {
    const g = tapeCanvas.getContext('2d');
    g.clearRect(0, 0, 1400, 220);
    g.fillStyle = '#efebe1';
    g.beginPath();
    g.moveTo(8, 18); g.lineTo(30, 4); g.lineTo(1370, 14); g.lineTo(1396, 2); g.lineTo(1388, 110);
    g.lineTo(1398, 214); g.lineTo(20, 204); g.lineTo(2, 216); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.05)';
    for (let x = 0; x < 1400; x += 4) g.fillRect(x, 0, 1, 220);
    g.fillStyle = '#141414';
    g.font = '400 92px "Permanent Marker", cursive';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const fr = document.documentElement.lang === 'fr';
    g.fillText(fr ? 'MOTION · DIRECTION ARTISTIQUE · OUTILS' : 'MOTION · ART DIRECTION · TOOLS', 700, 118, 1300);
    tapeTex.needsUpdate = true;
  }
  drawLid(); drawTape();
  if (document.fonts) {
    Promise.all([
      document.fonts.load('900 200px "Big Shoulders Stencil"'),
      document.fonts.load('400 80px "Permanent Marker"'),
      document.fonts.load('600 40px "JetBrains Mono"'),
    ]).then(() => { drawLid(); drawTape(); }).catch(() => {});
  }
  document.addEventListener('site:lang', drawTape);

  /* ── Materials ───────────────────────────────────────────── */
  const hex = hexTexture();
  const laminate = new THREE.MeshStandardMaterial({ map: hex, roughness: 0.78, metalness: 0.05, color: 0xffffff });
  hex.repeat.set(3, 2);
  const alu = new THREE.MeshStandardMaterial({ color: 0xc9cdd2, metalness: 1, roughness: 0.3 });
  const aluDark = new THREE.MeshStandardMaterial({ color: 0x8b9096, metalness: 1, roughness: 0.42 });
  const foamMat = new THREE.MeshStandardMaterial({ map: foamTexture(), roughness: 1, metalness: 0 });
  const blackFoam = new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 1 });

  /* ── Geometry ────────────────────────────────────────────── */
  const W = 3.4, HB = 1.2, HL = 0.44, D = 2.1, E = 0.075;
  const kase = new THREE.Group(); scene.add(kase);

  function addEdges(group, w, h, d, y0, which) {
    // aluminium extrusion along box edges (which: 'bottom', 'top', 'vert')
    const mk = (geo, x, y, z) => { const m = new THREE.Mesh(geo, alu); m.position.set(x, y, z); m.castShadow = true; group.add(m); };
    const gx = new THREE.BoxGeometry(w + E, E, E), gz = new THREE.BoxGeometry(E, E, d + E), gy = new THREE.BoxGeometry(E, h, E);
    for (const yy of which.includes('bottom') ? [y0] : []) { mk(gx, 0, yy, d / 2); mk(gx, 0, yy, -d / 2); mk(gz, w / 2, yy, 0); mk(gz, -w / 2, yy, 0); }
    for (const yy of which.includes('top') ? [y0 + h] : []) { mk(gx, 0, yy, d / 2); mk(gx, 0, yy, -d / 2); mk(gz, w / 2, yy, 0); mk(gz, -w / 2, yy, 0); }
    if (which.includes('vert')) for (const sx of [-1, 1]) for (const sz of [-1, 1]) mk(gy, sx * w / 2, y0 + h / 2, sz * d / 2);
  }
  function addBalls(group, w, d, y) {
    const g = new THREE.SphereGeometry(0.105, 32, 20);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const b = new THREE.Mesh(g, alu); b.position.set(sx * w / 2, y, sz * d / 2); b.castShadow = true; group.add(b);
    }
  }

  // Base
  const base = new THREE.Mesh(new RoundedBoxGeometry(W, HB, D, 3, 0.03), laminate);
  base.position.y = HB / 2; base.castShadow = true; base.receiveShadow = true; kase.add(base);
  addEdges(kase, W, HB, D, 0, ['bottom', 'top', 'vert']);
  addBalls(kase, W, D, 0.02);

  // Foam bed with the reel cut into it
  const foamBed = new THREE.Mesh(new THREE.BoxGeometry(W - 0.16, 0.05, D - 0.16), foamMat);
  foamBed.position.y = HB + 0.005; kase.add(foamBed);
  const reelW = 2.72, reelH = reelW * 9 / 16;
  const cut = new THREE.Mesh(new THREE.PlaneGeometry(reelW + 0.08, reelH + 0.08), blackFoam);
  cut.rotation.x = -Math.PI / 2; cut.position.set(0, HB + 0.032, 0.02); kase.add(cut);
  const reelMat = new THREE.MeshBasicMaterial({ color: 0x111111, toneMapped: false });
  const reel = new THREE.Mesh(new THREE.PlaneGeometry(reelW, reelH), reelMat);
  reel.rotation.x = -Math.PI / 2; reel.position.set(0, HB + 0.034, 0.02); kase.add(reel);

  // Tape label on the base front
  const tape = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3 * 220 / 1400), new THREE.MeshStandardMaterial({ map: tapeTex, transparent: true, roughness: 0.9 }));
  tape.position.set(-0.05, HB * 0.42, D / 2 + 0.012); tape.rotation.z = -0.02; kase.add(tape);

  // Side handles
  for (const sx of [-1, 1]) {
    const dish = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.9), aluDark);
    dish.position.set(sx * (W / 2 + 0.016), HB * 0.62, 0); kase.add(dish);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 16), new THREE.MeshStandardMaterial({ color: 0x0f0f10, roughness: 0.6 }));
    bar.rotation.x = Math.PI / 2; bar.position.set(sx * (W / 2 + 0.07), HB * 0.62, 0); kase.add(bar);
  }

  // Lid, hinged at the back top edge
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, HB, -D / 2); kase.add(lidPivot);
  const lid = new THREE.Group(); lid.position.set(0, 0, D / 2); lidPivot.add(lid);
  const lidBox = new THREE.Mesh(new RoundedBoxGeometry(W, HL, D, 3, 0.03), laminate);
  lidBox.position.y = HL / 2; lidBox.castShadow = true; lid.add(lidBox);
  addEdges(lid, W, HL, D, 0, ['bottom', 'top', 'vert']);
  addBalls(lid, W, D, HL - 0.02);
  const stencil = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.4, (W - 0.4) * 1260 / 2048), new THREE.MeshStandardMaterial({ map: lidTex, transparent: true, roughness: 0.85 }));
  stencil.rotation.x = -Math.PI / 2; stencil.position.set(0, HL + 0.004, 0.05); lid.add(stencil);
  const lidFoam = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.16, D - 0.16), foamMat);
  lidFoam.rotation.x = Math.PI / 2; lidFoam.position.y = -0.004; lid.add(lidFoam);

  // Butterfly latches: plate on the base, lever crossing the seam onto the lid
  const latches = [];
  for (const sx of [-0.3, 0.3]) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.03), aluDark);
    plate.position.set(sx * W, HB - 0.13, D / 2 + 0.02); kase.add(plate);
    const pivot = new THREE.Group(); pivot.position.set(sx * W, HB - 0.06, D / 2 + 0.045); kase.add(pivot);
    const lever = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.32, 0.03, 2, 0.012), alu);
    lever.position.y = 0.15; lever.castShadow = true; pivot.add(lever);
    const keeper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.03), aluDark);
    // the keeper is fixed to the lid, so it lifts away with it
    keeper.position.set(sx * W, 0.14, D / 2 + 0.02); lid.add(keeper);
    latches.push(pivot);
  }

  // Ground shadow catcher
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.55 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // Lights
  scene.add(new THREE.HemisphereLight(0xbfc6d0, 0x0a0a0a, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(-4, 8, 5); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -5; key.shadow.camera.right = 5; key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
  key.shadow.bias = -0.0004; key.shadow.radius = 6;
  scene.add(key);
  const rim = new THREE.PointLight(0xff5b1f, 16, 14, 2); rim.position.set(4.2, 2.2, -3.2); scene.add(rim);

  kase.position.set(0, 0, 0);

  /* ── Reel: cut between short clips, like an edit ─────────── */
  const clips = (hero.dataset.reel || '').split('|').filter(Boolean);
  const vids = [document.createElement('video'), document.createElement('video')];
  const texs = vids.map(v => {
    v.muted = true; v.playsInline = true; v.loop = false; v.preload = 'auto'; v.crossOrigin = 'anonymous';
    const t = new THREE.VideoTexture(v); t.colorSpace = THREE.SRGBColorSpace; return t;
  });
  let reelOn = false, active = 0, clipIdx = 0, cutTimer = null;
  function loadClip(v, src) {
    v.src = src; v.load();
    v.addEventListener('loadedmetadata', function h() { v.removeEventListener('loadedmetadata', h); if (isFinite(v.duration)) v.currentTime = Math.min(v.duration * 0.35, Math.max(0, v.duration - 3)); });
  }
  function cutNext() {
    if (!reelOn) return;
    const next = 1 - active;
    vids[next].play().catch(() => {});
    reelMat.map = texs[next]; reelMat.color.set(0xffffff); reelMat.needsUpdate = true;
    vids[active].pause();
    active = next;
    clipIdx = (clipIdx + 1) % clips.length;
    loadClip(vids[1 - active], clips[(clipIdx + 1) % clips.length]);
    cutTimer = setTimeout(cutNext, 2200);
  }
  function startReel() {
    if (reelOn || !clips.length) return;
    reelOn = true;
    loadClip(vids[0], clips[0]);
    loadClip(vids[1], clips[1 % clips.length]);
    vids[0].addEventListener('canplay', function h() {
      vids[0].removeEventListener('canplay', h);
      if (!reelOn) return;
      vids[0].play().catch(() => {});
      reelMat.map = texs[0]; reelMat.color.set(0xffffff); reelMat.needsUpdate = true;
      cutTimer = setTimeout(cutNext, 2200);
    });
  }
  function stopReel() { reelOn = false; clearTimeout(cutTimer); vids.forEach(v => v.pause()); }

  /* ── Camera rig ──────────────────────────────────────────── */
  const camStart = new THREE.Vector3(5.1, 3.5, 6.2), lookStart = new THREE.Vector3(0, 0.9, 0);
  const camEnd = new THREE.Vector3(0, 6.1, 1.35), lookEnd = new THREE.Vector3(0, HB, -0.05);
  let fitStart = 1, fitEnd = 1, shiftX = 0;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    fitStart = Math.min(2.3, Math.max(1.12, 1.5 / camera.aspect));
    fitEnd = Math.min(2.4, Math.max(1, 1.62 / camera.aspect));
    // on wide screens the case sits right of centre, clear of the copy
    shiftX = camera.aspect > 1.2 ? -1.35 : 0;
  }
  window.addEventListener('resize', resize);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);

  /* ── Scroll → state ──────────────────────────────────────── */
  let target = reduce ? 1 : 0, prog = target;
  const overlay = hero.querySelectorAll('[data-phase]');
  if (!reduce && window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    window.ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: (st) => { target = st.progress; },
    });
  } else if (!reduce) {
    const onScroll = () => {
      const r = hero.getBoundingClientRect();
      target = Math.min(1, Math.max(0, -r.top / (r.height - window.innerHeight)));
    };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  // Pointer parallax before the case opens
  let px = 0, py = 0;
  window.addEventListener('pointermove', (e) => { px = e.clientX / window.innerWidth - 0.5; py = e.clientY / window.innerHeight - 0.5; }, { passive: true });

  let visible = true;
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (!visible) stopReel(); }, { threshold: 0 }).observe(hero);

  const clock = new THREE.Clock();
  const tmpCam = new THREE.Vector3(), tmpLook = new THREE.Vector3();
  resize();

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = clock.getElapsedTime();
    prog += (target - prog) * (reduce ? 1 : 0.085);
    const p = prog;

    // latches flip first, then the lid lifts on a heavy hinge
    latches[0].rotation.x = 2.05 * easeOut(sm(0.04, 0.17, p));
    latches[1].rotation.x = 2.05 * easeOut(sm(0.09, 0.22, p));
    lidPivot.rotation.x = -1.98 * easeOut(sm(0.22, 0.6, p));

    const c = easeOut(sm(0.3, 0.86, p));
    tmpCam.copy(camStart).multiplyScalar(fitStart).lerp(tmpLook.copy(camEnd).multiplyScalar(fitEnd), c);
    tmpLook.copy(lookStart).lerp(lookEnd, c);
    const sx = shiftX * (1 - c);
    tmpLook.x += sx; tmpCam.x += sx;
    const idle = 1 - sm(0.0, 0.3, p);
    kase.rotation.y = (px * 0.22 - 0.04) * idle;
    kase.position.y = Math.sin(t * 1.1) * 0.03 * idle;
    camera.position.copy(tmpCam).add(new THREE.Vector3(0, -py * 0.5 * idle, 0));
    camera.lookAt(tmpLook);

    if (p > 0.18 && !reelOn) startReel();
    if (p < 0.12 && reelOn) stopReel();

    overlay.forEach((el) => {
      const ph = el.dataset.phase;
      const o = ph === 'closed' ? 1 - sm(0.08, 0.22, p) : sm(0.72, 0.9, p);
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o < 0.02 ? 'hidden' : 'visible';
      el.style.transform = ph === 'closed' ? `translateY(${(-30 * (1 - o)).toFixed(1)}px)` : `translateY(${(24 * (1 - o)).toFixed(1)}px)`;
    });
    renderer.render(scene, camera);
  }
  hero.classList.add('gl-ready');
  frame();
}
