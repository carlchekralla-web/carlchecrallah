// The world behind every page:
//  1. a liquid acrylic pour that drifts from daylight haze into dusk as you scroll,
//  2. an iridescent abstract form that morphs (blob → torus → urchin → ribbon → blob),
//  3. on the home page, a head that glitches in and out of its texture.
//     Drop a face scan at assets/3d/head.glb and it replaces the placeholder head.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.getElementById('world');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const HEAD_URL = 'assets/3d/head.glb';

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch (e) { return false; }
}


/* ── Shared GLSL ─────────────────────────────────────────── */
const NOISE3 = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float hash1(float n){return fract(sin(n)*43758.5453123);}
`;

// The site's pigments, no pinks or purples: teal → acid → tangerine → cobalt → teal
const RAMP = /* glsl */`
vec3 ramp(float x){
  x = fract(x) * 4.;
  vec3 c0 = vec3(.07, .78, .72), c1 = vec3(.76, 1., .27), c2 = vec3(1., .52, .18), c3 = vec3(.16, .32, 1.);
  vec3 a = x < 1. ? c0 : x < 2. ? c1 : x < 3. ? c2 : c3;
  vec3 b = x < 1. ? c1 : x < 2. ? c2 : x < 3. ? c3 : c0;
  return mix(a, b, smoothstep(0., 1., fract(x)));
}
`;

// Thin-film iridescence shared by the form and the head shell: graphite with the ramp in its sheen
const FILM = /* glsl */`
${RAMP}
vec3 film(vec3 N, vec3 V, float t, float dusk){
  float fr = pow(1. - max(dot(N, V), 0.), 1.5);
  float h = dot(N, vec3(.3, .8, .5)) * .35 + fr * .8 + t * .03 + dusk * .5;
  vec3 iri = ramp(h);
  vec3 base = vec3(.09, .1, .12);
  vec3 col = mix(base + iri * .25, iri, fr * .9);
  vec3 L = normalize(vec3(-.4, .8, .6));
  vec3 H = normalize(L + V);
  col += pow(max(dot(N, H), 0.), 70.) * .7;
  return col;
}
`;

function init() {
  document.documentElement.classList.add('gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.autoClear = false;

  /* ── 1. Acrylic pour (full-screen) ──────────────────────── */
  const bgScene = new THREE.Scene();
  const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bgU = { uTime: { value: 0 }, uDusk: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uMouse: { value: new THREE.Vector2() } };
  const bgMat = new THREE.ShaderMaterial({
    uniforms: bgU, depthWrite: false, depthTest: false,
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: /* glsl */`
      precision highp float;
      uniform float uTime, uDusk; uniform vec2 uRes, uMouse;
      vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return -1. + 2. * fract(sin(p) * 43758.5453); }
      float noise(vec2 p){
        const float K1 = .366025404, K2 = .211324865;
        vec2 i = floor(p + (p.x + p.y) * K1); vec2 a = p - i + (i.x + i.y) * K2;
        float m = step(a.y, a.x); vec2 o = vec2(m, 1. - m);
        vec2 b = a - o + K2; vec2 c = a - 1. + 2. * K2;
        vec3 h = max(.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.);
        vec3 n = h * h * h * h * vec3(dot(a, hash2(i)), dot(b, hash2(i + o)), dot(c, hash2(i + 1.)));
        return dot(n, vec3(70.));
      }
      float fbm(vec2 p){ float f = 0., a = .5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 5; i++){ f += a * noise(p); p = m * p; a *= .5; } return f; }
      ${RAMP}
      void main(){
        vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
        float t = uTime * .03;
        vec2 p = uv * 1.25 + uMouse * .06 + vec2(0., uDusk * .8);
        vec2 q = vec2(fbm(p + vec2(0., t)), fbm(p + vec2(5.2, 1.3) - t));
        vec2 r = vec2(fbm(p + 3.4 * q + vec2(1.7, 9.2) + t * 1.4), fbm(p + 3.4 * q + vec2(8.3, 2.8) - t * 1.1));
        float f = fbm(p + 3. * r);
        float k = f * 2.6 + length(q) * 1.3 + r.x * .9;

        // near-black ground; saturated pours in teal, acid, tangerine and cobalt.
        // Scrolling (uDusk = page progress) walks the pours through that ramp.
        vec3 pour = ramp(k * .42 + t * 1.2 + uDusk * 1.1);
        float m = smoothstep(.3, .95, f + .45 * r.y + .15);
        vec3 col = mix(vec3(.018, .02, .026), pour, m * .78);

        // cells: the thin lacing of a real acrylic pour
        float band = fract(k * 1.6);
        float lace = 1. - smoothstep(0., .035, band) * smoothstep(1., .965, band);
        col = mix(col, vec3(.92, .96, .9), lace * .08 * (.3 + m));

        // soft vignette + film grain
        col *= 1. - .22 * dot(uv * .9, uv * .9);
        col += (fract(sin(dot(gl_FragCoord.xy + uTime, vec2(12.9898, 78.233))) * 43758.5453) - .5) * .025;
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));

  /* ── 3D scene ───────────────────────────────────────────── */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  /* ── 2. Morphing form ───────────────────────────────────── */
  const formU = { uTime: { value: 0 }, uMorph: { value: 0 }, uDusk: { value: 0 } };
  const form = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, 72),
    new THREE.ShaderMaterial({
      uniforms: formU, side: THREE.DoubleSide,
      vertexShader: /* glsl */`
        uniform float uTime, uMorph;
        varying vec3 vN; varying vec3 vView;
        ${NOISE3}
        vec3 shape(vec3 n){
          float t = uTime * .22;
          vec3 a = n * (1. + .3 * snoise(n * 1.3 + t));                        // amoeba
          float th = atan(n.z, n.x), ph = asin(clamp(n.y, -1., 1.)) * 2.;
          vec3 b = vec3((.8 + .36 * cos(ph)) * cos(th), .36 * sin(ph), (.8 + .36 * cos(ph)) * sin(th));
          b += n * .07 * snoise(n * 3. + t);                                   // torus
          vec3 c = n * (.78 + .75 * pow(abs(snoise(n * 2.1 + t * .6)), 1.4));  // urchin
          vec3 d = n; d.y *= 1.55;                                              // twisted ribbon
          d.xz *= .5 + .28 * sin(n.y * 3. + t * 2.);
          float ang = n.y * 2.6 + t; d.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * d.xz;
          float m = uMorph;
          vec3 p = a;
          p = mix(p, b, smoothstep(0., 1., clamp(m, 0., 1.)));
          p = mix(p, c, smoothstep(0., 1., clamp(m - 1., 0., 1.)));
          p = mix(p, d, smoothstep(0., 1., clamp(m - 2., 0., 1.)));
          p = mix(p, a * 1.08, smoothstep(0., 1., clamp(m - 3., 0., 1.)));
          return p;
        }
        void main(){
          vec3 n = normalize(position);
          vec3 p = shape(n);
          vec3 tA = normalize(cross(n, abs(n.y) < .99 ? vec3(0., 1., 0.) : vec3(1., 0., 0.)));
          vec3 tB = cross(n, tA);
          vec3 pa = shape(normalize(n + tA * .012)), pb = shape(normalize(n + tB * .012));
          vec3 nn = normalize(cross(pa - p, pb - p));
          vN = normalize(normalMatrix * nn);
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          vView = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform float uTime, uDusk;
        varying vec3 vN; varying vec3 vView;
        ${FILM}
        void main(){
          vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
          gl_FragColor = vec4(film(N, normalize(vView), uTime, uDusk), 1.);
        }`,
    })
  );
  scene.add(form);

  /* ── 3. Glitch head (home page only) ────────────────────── */
  const wantsHead = document.body.hasAttribute('data-head');
  const headU = {
    uTime: { value: 0 }, uDusk: { value: 0 }, uGlitch: { value: 0 }, uReveal: { value: 0 }, uFade: { value: 1 },
    uMap: { value: null }, uUseUV: { value: 0 },
  };
  const headMat = new THREE.ShaderMaterial({
    uniforms: headU, transparent: true,
    vertexShader: /* glsl */`
      uniform float uTime, uGlitch, uUseUV;
      varying vec3 vN; varying vec3 vView; varying vec3 vObj; varying vec2 vUv;
      ${NOISE3}
      void main(){
        vec3 p = position;
        // horizontal slice tearing while glitching
        float slice = floor(p.y * 22. + floor(uTime * 14.));
        float r = hash1(slice + floor(uTime * 23.) * 7.13);
        if (r > 1. - uGlitch * .55) p.x += (hash1(slice * 1.71) - .5) * .5 * uGlitch;
        vObj = position;
        vUv = uv;
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uDusk, uGlitch, uReveal, uFade, uUseUV;
      uniform sampler2D uMap;
      varying vec3 vN; varying vec3 vView; varying vec3 vObj; varying vec2 vUv;
      ${NOISE3}
      ${FILM}
      void main(){
        vec3 N = normalize(vN), V = normalize(vView);
        vec3 shell = film(N, V, uTime, uDusk);

        // texture: a face scan's own map when one is loaded; otherwise generated
        // topographic contours in the site's pigments (no photo)
        float off = .018 * uGlitch * (hash1(floor(vObj.y * 30. + uTime * 20.)) - .3);
        vec3 tex;
        if (uUseUV > .5) {
          tex = vec3(texture2D(uMap, vUv + vec2(off, 0.)).r, texture2D(uMap, vUv).g, texture2D(uMap, vUv - vec2(off, 0.)).b);
        } else {
          float h = snoise(vObj * 2.2 + vec3(off * 20., uTime * .05, 0.)) * .5 + snoise(vObj * 5.) * .2;
          float lines = smoothstep(.06, 0., abs(fract(h * 7.) - .5) - .38);
          tex = mix(vec3(.03, .035, .04), ramp(h * .6 + uTime * .02), lines);
        }
        float facing = 1.;

        // dissolve between shell and texture, with a burning acrylic edge
        float d = snoise(vObj * 1.7 + vec3(0., uTime * .35, 0.)) * .5 + .5;
        float texMask = smoothstep(uReveal + .04, uReveal - .04, d) * facing;
        float edge = smoothstep(.06, 0., abs(d - uReveal)) * facing * step(.02, uReveal);
        vec3 col = mix(shell, tex * 1.08, texMask);
        col += edge * ramp(hash1(floor(uTime * 6.)));

        // scanlines and colour-channel bleed during bursts
        col *= 1. - uGlitch * .25 * step(.5, fract(gl_FragCoord.y * .5));
        col.r += uGlitch * .18 * step(.85, hash1(floor(gl_FragCoord.y * .2) + floor(uTime * 30.)));
        gl_FragColor = vec4(col, uFade);
      }`,
  });

  const head = new THREE.Group();
  if (wantsHead) scene.add(head);

  function proceduralHead() {
    // A mannequin head shaped from a sphere: skull, brow, eye sockets, nose, lips, jaw.
    const g = new THREE.SphereGeometry(1, 180, 180);
    const pos = g.attributes.position, v = new THREE.Vector3();
    const gauss = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      let { x, y, z } = v;
      const front = Math.max(0, z);
      x *= 0.78; z *= 0.9; y *= 1.08;
      if (y < 0) { const k = Math.min(1, -y / 1.08); x *= 1 - 0.32 * k * k; z *= 1 - 0.12 * k; }
      z += front * (0.18 * gauss(x, y, 0, -0.08, 0.1, 0.22)            // nose
        + 0.06 * gauss(x, y, 0, 0.3, 0.42, 0.07)                       // brow
        + 0.05 * gauss(x, y, 0, -0.47, 0.17, 0.05)                     // lips
        + 0.05 * gauss(x, y, 0, -0.78, 0.2, 0.1)                       // chin
        - 0.09 * gauss(Math.abs(x), y, 0.25, 0.14, 0.1, 0.07));        // eye sockets
      x += Math.sign(x) * 0.03 * gauss(Math.abs(x), y, 0.55, 0.0, 0.15, 0.15); // cheekbones
      pos.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();
    const skull = new THREE.Mesh(g, headMat);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 1.1, 96, 1, true), headMat);
    neck.position.y = -1.28;
    head.add(skull, neck);
  }

  function loadScan() {
    // Your own face scan wins when it exists: assets/3d/head.glb
    new GLTFLoader().load(HEAD_URL, (gltf) => {
      const root = gltf.scene;
      let map = null;
      root.traverse((o) => { if (o.isMesh) { if (!map && o.material && o.material.map) map = o.material.map; o.material = headMat; } });
      const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      const s = 2.4 / Math.max(size.x, size.y, size.z);
      root.scale.setScalar(s); root.position.sub(c.multiplyScalar(s));
      head.add(root);
      if (map) { headU.uMap.value = map; headU.uUseUV.value = 1; }
    }, undefined, proceduralHead);
  }
  if (wantsHead) {
    fetch(HEAD_URL, { method: 'HEAD' }).then((r) => (r.ok ? loadScan() : proceduralHead())).catch(proceduralHead);
  }

  /* ── Layout + input ─────────────────────────────────────── */
  let aspect = 1;
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    aspect = w / h;
    camera.aspect = aspect; camera.updateProjectionMatrix();
    const pr = renderer.getPixelRatio();
    bgU.uRes.value.set(w * pr, h * pr);
  }
  window.addEventListener('resize', resize); resize();

  const mouse = new THREE.Vector2(), mouseT = new THREE.Vector2();
  window.addEventListener('pointermove', (e) => mouseT.set(e.clientX / window.innerWidth - 0.5, 0.5 - e.clientY / window.innerHeight), { passive: true });

  let dusk = 0, last = 0;
  const clock = new THREE.Clock();
  let burstUntil = 0, nextBurst = 1.5;

  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const now = clock.getElapsedTime();
    const dt = Math.min(0.1, now - last); last = now;
    const t = reduce ? 8 : now;
    const target = window.__dusk || 0;
    // time-based easing, so slow GPUs keep up with the scroll
    dusk += (target - dusk) * (1 - Math.exp(-dt * 4));
    mouse.lerp(mouseT, 1 - Math.exp(-dt * 3));

    bgU.uTime.value = t; bgU.uDusk.value = dusk; bgU.uMouse.value.copy(mouse);
    formU.uTime.value = t; formU.uDusk.value = dusk; formU.uMorph.value = Math.min(4, dusk * 4.4);
    headU.uTime.value = t; headU.uDusk.value = dusk;

    const wide = aspect > 1.15;
    // the form drifts through the page; on the home page it starts behind the head
    const s = wide ? 1.15 : 0.85;
    form.scale.setScalar(s * (wantsHead ? 0.55 + dusk * 0.7 : 1));
    form.position.set(wide ? (wantsHead ? 1.9 : 2.75) - dusk * 0.6 : (wantsHead ? 0.4 : 1.3), (wide ? 0.2 : 1.6) - dusk * 0.4 + Math.sin(t * 0.4) * 0.08, wantsHead ? -1.6 + dusk : 0);
    form.rotation.set(t * 0.08 + mouse.y * 0.4 + dusk * 1.4, t * 0.12 + mouse.x * 0.6, 0);

    if (wantsHead) {
      // glitch bursts at irregular intervals, more of them as you scroll
      if (!reduce && t > nextBurst) { burstUntil = t + 0.18 + Math.random() * 0.45; nextBurst = t + 1.2 + Math.random() * (3 - dusk * 2); }
      const bursting = t < burstUntil;
      headU.uGlitch.value += ((bursting ? 1 : dusk * 0.25) - headU.uGlitch.value) * 0.35;
      // the texture breathes in and out; bursts flash it fully on or off
      const breathe = 0.5 + 0.5 * Math.sin(t * 0.7);
      headU.uReveal.value = bursting ? (Math.sin(t * 40) > 0 ? 1.05 : -0.05) : breathe * (1 - dusk * 1.6);
      const out = Math.min(1, dusk / 0.38);
      headU.uFade.value = 1 - out;
      head.visible = out < 1;
      head.position.set(wide ? 1.75 : 0, (wide ? -0.15 : 1.3) + out * 1.6, 0);
      head.scale.setScalar((wide ? 1 : 0.56) * (1 - out * 0.3));
      head.rotation.set(-mouse.y * 0.25, -0.35 + mouse.x * 0.7 + Math.sin(t * 0.3) * 0.12, 0);
    }

    renderer.clear();
    renderer.render(bgScene, bgCam);
    renderer.clearDepth();
    renderer.render(scene, camera);
  }
  frame();
}

if (canvas && webglOK()) init();
