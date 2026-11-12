import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* =========================================================
   Hydroline — 3D «анатомия» противофильтрационного экрана
   Прокрутка управляет состоянием сцены через ключевые кадры.
   ========================================================= */

const W = 8;      // длина фрагмента (вдоль шва, ось X)
const D = 5;      // ширина фрагмента (ось Z)
const SEAM = 0.32; // половина ширины нахлёста

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const BG = 0x0a0e13;
const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.Fog(BG, 16, 42);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(8, 5, 10);

/* ---------- Свет ---------- */
scene.add(new THREE.HemisphereLight(0xbcd8ff, 0x1a120a, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(6, 10, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -8; key.shadow.camera.right = 8;
key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
key.shadow.bias = -0.0004;
scene.add(key);
const rim = new THREE.DirectionalLight(0x3fd0ff, 0.9);
rim.position.set(-8, 3, -6);
scene.add(rim);

/* ---------- Утилиты ---------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const noise2 = (x, z) =>
  Math.sin(x * 1.7 + Math.sin(z * 1.3) * 1.5) * 0.5 +
  Math.sin(z * 2.3 + x * 0.7) * 0.3 +
  Math.sin((x + z) * 4.1) * 0.12;

function canvasTexture(size, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

/* ---------- Текстуры ---------- */
const fiberTex = canvasTexture(512, (ctx, s) => {
  ctx.fillStyle = '#cfd4da';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 3200; i++) {
    const x = Math.random() * s, y = Math.random() * s;
    const a = Math.random() * Math.PI, l = 8 + Math.random() * 26;
    const g = 170 + Math.random() * 85 | 0;
    ctx.strokeStyle = `rgba(${g},${g},${g + 6},${0.25 + Math.random() * 0.4})`;
    ctx.lineWidth = 0.6 + Math.random() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
}, [4, 2.5]);

const soilTex = canvasTexture(512, (ctx, s) => {
  ctx.fillStyle = '#6e4f33';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 9000; i++) {
    const r = Math.random() * 2.4;
    const v = Math.random();
    ctx.fillStyle = v > 0.7 ? `rgba(160,130,95,${Math.random() * 0.6})` : `rgba(40,26,14,${Math.random() * 0.5})`;
    ctx.beginPath();
    ctx.arc(Math.random() * s, Math.random() * s, r, 0, 7);
    ctx.fill();
  }
}, [3, 1.5]);

const hdpeTex = canvasTexture(512, (ctx, s) => {
  ctx.fillStyle = '#1b1f24';
  ctx.fillRect(0, 0, s, s);
  // лёгкая текстурированная поверхность (structured HDPE)
  for (let i = 0; i < 6000; i++) {
    const g = 30 + Math.random() * 22 | 0;
    ctx.fillStyle = `rgba(${g},${g + 2},${g + 6},0.5)`;
    ctx.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5);
  }
}, [6, 4]);

const channelTex = canvasTexture(256, (ctx, s) => {
  const g = ctx.createLinearGradient(0, 0, s, 0);
  g.addColorStop(0, 'rgba(63,208,255,0.05)');
  g.addColorStop(0.45, 'rgba(63,208,255,1)');
  g.addColorStop(0.55, 'rgba(200,245,255,1)');
  g.addColorStop(1, 'rgba(63,208,255,0.05)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
}, [5, 1]);

const heatTex = canvasTexture(256, (ctx, s) => {
  const g = ctx.createLinearGradient(0, 0, s, 0);
  g.addColorStop(0, 'rgba(255,60,0,0)');
  g.addColorStop(0.7, 'rgba(255,110,20,0.75)');
  g.addColorStop(1, 'rgba(255,220,140,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
});
heatTex.wrapS = heatTex.wrapT = THREE.ClampToEdgeWrapping;

/* ---------- Модель ---------- */
const system = new THREE.Group();
scene.add(system);

// 1. Грунтовое основание со «стратами»
const soilH = 1.3;
const soilGeo = new THREE.BoxGeometry(W, soilH, D, 120, 14, 75);
{
  const pos = soilGeo.attributes.position;
  const colors = [];
  const cTop = new THREE.Color(0x8a6a48), cMid = new THREE.Color(0x5e4029), cLow = new THREE.Color(0x3a2a1c), cBand = new THREE.Color(0xa58a62);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (y > soilH / 2 - 1e-4) pos.setY(i, y + noise2(x, z) * 0.025 - 0.025);
    const h = (y + soilH / 2) / soilH; // 0..1
    tmp.copy(cLow).lerp(cMid, smooth(clamp(h * 1.6))).lerp(cTop, smooth(clamp((h - 0.6) * 2.5)));
    const band = Math.sin(h * 26 + noise2(x * 0.8, z * 0.8) * 2.2);
    if (band > 0.82) tmp.lerp(cBand, 0.35);
    tmp.multiplyScalar(0.9 + Math.random() * 0.12);
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  soilGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  soilGeo.computeVertexNormals();
}
const soil = new THREE.Mesh(soilGeo, new THREE.MeshStandardMaterial({ vertexColors: true, map: soilTex, roughness: 0.95 }));
soil.position.y = -soilH / 2;
soil.receiveShadow = true;
soil.userData = { baseY: -soilH / 2, explode: -0.4 };
system.add(soil);

// камни, вкраплённые в срез (для «анатомичности»)
const stoneGeo = new THREE.IcosahedronGeometry(1, 1);
const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8c8378, roughness: 0.8 });
const stones = new THREE.InstancedMesh(stoneGeo, stoneMat, 90);
{
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < 90; i++) {
    const face = i % 2;
    const r = 0.03 + Math.random() * 0.07;
    if (face === 0) p.set((Math.random() - 0.5) * W * 0.98, -0.25 - Math.random() * 0.95, D / 2 - r * 0.4);
    else p.set(W / 2 - r * 0.4, -0.25 - Math.random() * 0.95, (Math.random() - 0.5) * D * 0.98);
    q.setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, 0));
    s.set(r, r * (0.6 + Math.random() * 0.4), r);
    m.compose(p, q, s);
    stones.setMatrixAt(i, m);
  }
}
soil.add(stones);
stones.position.y = soilH / 2;

// 2. Подстилающий геотекстиль
const geoTexMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: fiberTex, bumpMap: fiberTex, bumpScale: 1.2, roughness: 1 });
const geoUnder = new THREE.Mesh(new THREE.BoxGeometry(W, 0.05, D), geoTexMat);
geoUnder.position.y = 0.025;
geoUnder.castShadow = geoUnder.receiveShadow = true;
geoUnder.userData = { baseY: 0.025, explode: 0.9 };
system.add(geoUnder);

// 3. Геомембрана: два полотна с нахлёстом
const membrane = new THREE.Group();
membrane.userData = { baseY: 0, explode: 1.9 };
system.add(membrane);

const hdpeMat = new THREE.MeshPhysicalMaterial({
  color: 0x7d838b, map: hdpeTex, roughness: 0.55, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity: 0.45,
});
const T = 0.03;
function sheet(z0, z1, y) {
  const g = new THREE.BoxGeometry(W, T, z1 - z0, 80, 1, 30);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i) + (z0 + z1) / 2;
    // мягкие волны полотна, у шва — ровно
    const edge = clamp((Math.abs(z) - SEAM * 1.2) / 1.2);
    p.setY(i, p.getY(i) + (Math.sin(x * 1.3 + z * 0.4) * 0.5 + Math.sin(x * 3.1 - z) * 0.2) * 0.018 * edge);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, hdpeMat);
  m.position.set(0, y, (z0 + z1) / 2);
  m.castShadow = m.receiveShadow = true;
  return m;
}
const sheetBack = sheet(-D / 2, SEAM, 0.05 + T / 2);
const sheetFront = sheet(-SEAM, D / 2, 0.05 + T * 1.5 + 0.002);
membrane.add(sheetBack, sheetFront);
const topY = 0.05 + T * 2 + 0.003; // верх нахлёста

// 4. Двойной сварной шов + воздушный канал
const seam = new THREE.Group();
membrane.add(seam);
const trackMat = new THREE.MeshStandardMaterial({ color: 0x4a525c, roughness: 0.2, metalness: 0.1, emissive: 0xff6a10, emissiveIntensity: 0 });
const trackGeo = new THREE.BoxGeometry(1, 0.012, 0.11);
trackGeo.translate(0.5, 0, 0); // рост от начала
const trackA = new THREE.Mesh(trackGeo, trackMat);
const trackB = new THREE.Mesh(trackGeo, trackMat);
trackA.position.set(-W / 2, topY + 0.006, -0.17);
trackB.position.set(-W / 2, topY + 0.006, 0.17);
seam.add(trackA, trackB);

const channelMat = new THREE.MeshBasicMaterial({ map: channelTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
const channel = new THREE.Mesh(new THREE.BoxGeometry(W, 0.01, 0.12), channelMat);
channel.position.set(0, topY + 0.004, 0);
seam.add(channel);

const heatMat = new THREE.MeshBasicMaterial({ map: heatTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
const heat = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.5), heatMat);
heat.rotation.x = -Math.PI / 2;
heat.position.y = topY + 0.015;
seam.add(heat);

// 5. Защитный геотекстиль сверху
const coverMat = geoTexMat.clone();
coverMat.color = new THREE.Color(0xb3bcc6);
coverMat.transparent = true;
const cover = new THREE.Mesh(new THREE.BoxGeometry(W, 0.05, D), coverMat);
cover.castShadow = cover.receiveShadow = true;
cover.userData = { baseY: topY + 0.04, explode: 2.9 };
system.add(cover);

/* ---------- Сварочный аппарат (клиновой автомат) ---------- */
const welder = new THREE.Group();
{
  const body = new THREE.MeshStandardMaterial({ color: 0xf2a400, roughness: 0.35, metalness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.5, metalness: 0.6 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.25, metalness: 0.9 });
  const add = (geo, mat, x, y, z, rx = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.set(rx, 0, rz);
    m.castShadow = true;
    welder.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(0.95, 0.36, 0.62), body, 0, 0.34, 0);
  add(new THREE.BoxGeometry(0.97, 0.06, 0.64), dark, 0, 0.53, 0);
  add(new THREE.BoxGeometry(0.4, 0.14, 0.5), dark, -0.12, 0.62, 0);
  // панель с дисплеем
  const scr = add(new THREE.PlaneGeometry(0.22, 0.09), new THREE.MeshBasicMaterial({ color: 0x3fd0ff }), -0.12, 0.62, 0.252);
  scr.rotation.y = 0;
  // ручка
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 12), steel, -0.55, 0.85, 0, 0, Math.PI / 3.2);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 12), dark, -0.8, 1.1, 0, Math.PI / 2, 0);
  // ролики
  const wheelGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.09, 24);
  [[0.3, -0.24], [0.3, 0.24], [-0.3, -0.24], [-0.3, 0.24]].forEach(([x, z]) => add(wheelGeo, dark, x, 0.11, z, Math.PI / 2, 0));
  // горячий клин
  const wedge = add(new THREE.BoxGeometry(0.16, 0.03, 0.44), new THREE.MeshStandardMaterial({ color: 0x552200, emissive: 0xff5a00, emissiveIntensity: 2.2 }), 0.52, 0.03, 0);
  wedge.castShadow = false;
}
welder.position.set(-6, topY, 0);
membrane.add(welder);
const weldLight = new THREE.PointLight(0xff7a1a, 0, 3, 1.5);
weldLight.position.set(0.6, 0.15, 0);
welder.add(weldLight);

/* ---------- Искры ---------- */
const SPARKS = 260;
const sparkGeo = new THREE.BufferGeometry();
const sPos = new Float32Array(SPARKS * 3);
const sVel = new Float32Array(SPARKS * 3);
const sLife = new Float32Array(SPARKS);
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
const sparkMat = new THREE.PointsMaterial({ color: 0xffa040, size: 0.035, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const sparks = new THREE.Points(sparkGeo, sparkMat);
sparks.frustumCulled = false;
membrane.add(sparks);
for (let i = 0; i < SPARKS; i++) sPos[i * 3 + 1] = -99;
let sparkCursor = 0;

/* ---------- Пыль в воздухе (атмосфера) ---------- */
{
  const n = 400, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - 0.5) * 30; p[i * 3 + 1] = Math.random() * 10 - 2; p[i * 3 + 2] = (Math.random() - 0.5) * 30; }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x5f8aa8, size: 0.03, transparent: true, opacity: 0.5, depthWrite: false }));
  scene.add(dust);
  dust.userData.spin = true;
  scene.userData.dust = dust;
}

/* ---------- Сетка «чертёжа» на полу ---------- */
const grid = new THREE.GridHelper(60, 60, 0x1d2a36, 0x131c25);
grid.position.y = -soilH - 0.6;
scene.add(grid);

/* ---------- 3D-подписи (HTML) ---------- */
const labelsEl = document.getElementById('labels');
const labelDefs = [
  { t: 'Защитный геотекстиль', s: 'пригруз · защита от УФ', c: '#a9b4bf', p: () => v3(cover, -1.6, 0.03, 1.2), show: (st) => st.explode * st.cover },
  { t: 'Сварной шов', s: '2 дорожки × 15 мм', c: '#ff7a1a', p: () => v3(membrane, 1.2, topY + 0.01, 0), show: (st) => st.explode * (1 - st.welder) },
  { t: 'Геомембрана HDPE', s: '0,5–3,0 мм · Kf < 10⁻¹³ м/с', c: '#3fd0ff', p: () => v3(membrane, -2.4, topY, 1.6), show: (st) => st.explode },
  { t: 'Подстилающий геотекстиль', s: '300–600 г/м²', c: '#d9dde2', p: () => v3(geoUnder, 2.4, 0.03, 1.8), show: (st) => st.explode },
  { t: 'Грунтовое основание', s: 'Kупл ≥ 0,95', c: '#a07a52', p: () => v3(soil, -3.0, -0.2, D / 2), show: (st) => st.explode },
  { t: 'Горячий клин', s: '380–450 °C', c: '#ff7a1a', p: () => v3(welder, 0.6, 0.05, 0.3), show: (st) => st.welder * (1 - st.test) * band(st.weld, 0.02, 0.98) },
  { t: 'Двойной шов', s: 'прижим роликами', c: '#ffb070', p: () => v3(membrane, welder.position.x - 1.3, topY, 0.17), show: (st) => st.welder * (1 - st.test) * band(st.weld, 0.25, 1.1) },
  { t: 'Воздушный канал', s: 'испытание 2–2,5 бар', c: '#3fd0ff', p: () => v3(membrane, 0.6, topY, 0), show: (st) => st.test },
];
const tmpV = new THREE.Vector3();
function v3(obj, x, y, z) { return obj.localToWorld(tmpV.set(x, y, z)); }
function band(v, a, b) { return clamp((v - a) / 0.05) * clamp((b - v) / 0.05); }
labelDefs.forEach((d) => {
  const el = document.createElement('div');
  el.className = 'tag';
  el.style.setProperty('--c', d.c);
  el.innerHTML = `<span class="tag-line"></span><span class="tag-box"><b>${d.t}</b><small>${d.s}</small></span>`;
  labelsEl.appendChild(el);
  d.el = el;
});

/* ---------- Ключевые кадры (по секциям) ---------- */
// cam/target — позиция камеры и точка взгляда
// shift — сдвиг кадра по горизонтали (доля ширины), чтобы модель не пряталась под текстовой панелью
const K = [
  { cam: [7.8, 5.4, 9.6], tgt: [0, 0.1, 0], explode: 0, cover: 1, welder: 0, weld: 0, test: 0, spin: 1, dim: 0, shift: 0.2 },     // hero
  { cam: [8.6, 4.6, 8.8], tgt: [0, 1.25, 0], explode: 1, cover: 1, welder: 0, weld: 0, test: 0, spin: 0.3, dim: 0, shift: -0.17 }, // анатомия
  { cam: [-6.4, 2.9, 5.6], tgt: [-2.4, 0.1, 0], explode: 0, cover: 0, welder: 1, weld: 0, test: 0, spin: 0, dim: 0, shift: 0.17 }, // начало сварки
  { cam: [6.6, 2.6, 5.0], tgt: [2.6, 0.1, 0], explode: 0, cover: 0, welder: 1, weld: 1, test: 0, spin: 0, dim: 0, shift: 0.17 },   // шов готов
  { cam: [-1.2, 4.2, 4.6], tgt: [0, 0.05, 0], explode: 0, cover: 0, welder: 1, weld: 1, test: 1, spin: 0, dim: 0, shift: -0.17 },  // испытание
  { cam: [10, 7.5, 12], tgt: [0, 0.2, 0], explode: 0.35, cover: 0.6, welder: 0, weld: 1, test: 0.4, spin: 1, dim: 0.75, shift: 0.15 }, // объекты / финал
];
// где внутри секций стоят ключевые кадры: [номер секции + доля, индекс кадра]
const KEY_AT = [[0.5, 0], [1.5, 1], [2.2, 2], [2.85, 3], [3.5, 4], [4.5, 5]];
const steps = [...document.querySelectorAll('.scene-step')];
const state = { ...K[0], cam: [...K[0].cam], tgt: [...K[0].tgt] };
const target = { ...state, cam: [...state.cam], tgt: [...state.tgt] };

function scrollStep() {
  const y = window.scrollY + window.innerHeight * 0.5;
  // s ∈ [0, steps.length]: номер секции + прогресс внутри
  let s = 0;
  for (let i = 0; i < steps.length; i++) {
    const el = steps[i];
    const top = el.offsetTop, h = el.offsetHeight;
    if (y >= top) s = i + clamp((y - top) / h);
  }
  if (s <= KEY_AT[0][0]) return 0;
  for (let i = 0; i < KEY_AT.length - 1; i++) {
    const [a, ka] = KEY_AT[i], [b, kb] = KEY_AT[i + 1];
    if (s <= b) return lerp(ka, kb, (s - a) / (b - a));
  }
  return K.length - 1;
}

function sampleKeys(s) {
  const i = Math.min(Math.floor(s), K.length - 2);
  const t = smooth(clamp(s - i));
  const a = K[i], b = K[i + 1];
  for (const k of Object.keys(a)) {
    if (Array.isArray(a[k])) target[k] = a[k].map((v, j) => lerp(v, b[k][j], t));
    else target[k] = lerp(a[k], b[k], t);
  }
  // Сварка идёт линейно внутри секции «Сварка», без сглаживания
  if (i === 2) target.weld = clamp(s - 2);
}

/* ---------- Интерактив: мышь ---------- */
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
window.addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
});

/* ---------- UI-элементы ---------- */
const roWeld = document.getElementById('roWeld');
const roTemp = document.getElementById('roTemp');
const roPress = document.getElementById('roPress');
const roStatus = document.getElementById('roStatus');
const gaugeFill = document.getElementById('gaugeFill');
const progressBar = document.getElementById('progressBar');

/* ---------- Цикл ---------- */
const clock = new THREE.Clock();
const lookAt = new THREE.Vector3();
const POSTER = window.HYDRO_POSTER || null;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let prevWelderX = welder.position.x;

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  // Режим постера (banner.html): фиксированное состояние сцены вместо прокрутки
  if (POSTER) { for (const k of Object.keys(K[0])) target[k] = Array.isArray(POSTER[k]) ? [...POSTER[k]] : POSTER[k]; }
  else sampleKeys(scrollStep());
  const k = reduceMotion ? 1 : 1 - Math.pow(0.0015, dt); // плавное догоняние
  for (const key of Object.keys(target)) {
    if (Array.isArray(target[key])) state[key] = state[key].map((v, j) => lerp(v, target[key][j], k));
    else state[key] = lerp(state[key], target[key], k);
  }

  // Камера (на узких экранах — дальше)
  const aspect = window.innerWidth / window.innerHeight;
  const far = aspect < 1 ? 1.75 : aspect < 1.4 ? 1.2 : 1;
  mouse.sx = lerp(mouse.sx, mouse.x, 0.05);
  mouse.sy = lerp(mouse.sy, mouse.y, 0.05);
  const [tx, ty, tz] = state.tgt;
  camera.position.set(
    tx + (state.cam[0] - tx) * far + mouse.sx * 0.5,
    ty + (state.cam[1] - ty) * far - mouse.sy * 0.3,
    tz + (state.cam[2] - tz) * far,
  );
  lookAt.set(tx, ty, tz);
  camera.lookAt(lookAt);
  const wv = window.innerWidth, hv = window.innerHeight;
  const sh = aspect < 1 ? 0 : state.shift;
  camera.setViewOffset(wv, hv, -sh * wv, aspect < 1 ? hv * 0.24 : 0, wv, hv);

  // Вращение «на витрине»
  system.rotation.y = state.spin * Math.sin(time * 0.18) * 0.35;

  // Раздвижение слоёв
  for (const m of [soil, geoUnder, membrane, cover]) m.position.y = m.userData.baseY + m.userData.explode * smooth(state.explode);
  // Защитный слой улетает вверх и гаснет, когда начинаем сварку
  cover.position.y += (1 - state.cover) * 2.5;
  coverMat.opacity = clamp(state.cover * 1.2);
  cover.visible = state.cover > 0.02;

  // Сварка
  const wx = lerp(-W / 2 - 0.6, W / 2 + 0.2, state.weld);
  welder.position.x = lerp(-W / 2 - 3.5, wx, smooth(clamp(state.welder * 1.4)));
  welder.position.y = topY + (1 - state.welder) * 0.0;
  welder.visible = state.welder > 0.01;
  const seamLen = clamp(welder.position.x + 0.45 + W / 2, 0, W);
  const shown = Math.max(seamLen, state.weld > 0.999 ? W : 0);
  trackA.scale.x = trackB.scale.x = Math.max(shown, 1e-4);
  trackA.visible = trackB.visible = shown > 0.001;

  const moving = Math.abs(welder.position.x - prevWelderX) / Math.max(dt, 1e-3);
  prevWelderX = welder.position.x;
  const welding = state.welder > 0.5 && state.weld > 0.005 && state.weld < 0.995 ? 1 : 0;
  const hot = clamp(welding * (0.6 + moving * 0.4));
  heat.position.x = welder.position.x - 0.2;
  heatMat.opacity = lerp(heatMat.opacity, hot * 0.9, 0.1);
  weldLight.intensity = lerp(weldLight.intensity, hot * 6, 0.1);
  trackMat.emissiveIntensity = 0;

  // Искры
  const emit = welding ? 3 : 0;
  for (let e = 0; e < emit; e++) {
    const i = sparkCursor++ % SPARKS;
    sPos[i * 3] = welder.position.x + 0.62;
    sPos[i * 3 + 1] = topY + 0.04;
    sPos[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    sVel[i * 3] = 0.4 + Math.random() * 1.6;
    sVel[i * 3 + 1] = 0.6 + Math.random() * 1.4;
    sVel[i * 3 + 2] = (Math.random() - 0.5) * 1.6;
    sLife[i] = 0.4 + Math.random() * 0.5;
  }
  for (let i = 0; i < SPARKS; i++) {
    if (sLife[i] <= 0) continue;
    sLife[i] -= dt;
    sVel[i * 3 + 1] -= 5.5 * dt;
    sPos[i * 3] += sVel[i * 3] * dt;
    sPos[i * 3 + 1] = Math.max(topY + 0.01, sPos[i * 3 + 1] + sVel[i * 3 + 1] * dt);
    sPos[i * 3 + 2] += sVel[i * 3 + 2] * dt;
    if (sLife[i] <= 0) sPos[i * 3 + 1] = -99;
  }
  sparkGeo.attributes.position.needsUpdate = true;

  // Испытание воздушного канала
  channelMat.opacity = clamp(state.test * 1.3);
  channelTex.offset.x -= dt * 0.6;
  channel.scale.y = 1 + state.test * 1.5 + Math.sin(time * 6) * 0.3 * state.test;

  // Пыль
  scene.userData.dust.rotation.y = time * 0.01;

  // Затемнение сцены под обычным контентом
  canvas.style.opacity = String(1 - state.dim * 0.65);

  // HTML-подписи
  const wPx = window.innerWidth, hPx = window.innerHeight;
  for (const d of labelDefs) {
    const o = POSTER?.labels ? (POSTER.labels.includes(d.t) ? 1 : 0) : clamp(d.show(state));
    if (o < 0.01) { d.el.style.opacity = 0; continue; }
    const p = d.p().project(camera);
    if (p.z > 1) { d.el.style.opacity = 0; continue; }
    const x = (p.x * 0.5 + 0.5) * wPx, y = (-p.y * 0.5 + 0.5) * hPx;
    d.el.style.opacity = o.toFixed(3);
    d.el.style.transform = `translate(${(x - 4.5).toFixed(1)}px, ${(y - 4.5 - 10).toFixed(1)}px)`;
  }

  // Показания в панелях
  if (roWeld) {
  roWeld.textContent = `${Math.round(state.weld * 100)}%`;
  roTemp.textContent = `${Math.round(410 + Math.sin(time * 2) * 6 * welding)} °C`;
  const press = 2.5 * smooth(clamp(state.test / 0.85));
  roPress.textContent = press.toFixed(1).replace('.', ',');
  gaugeFill.style.strokeDashoffset = String(100 - press / 3 * 100);
  const ok = state.test > 0.9;
  roStatus.textContent = ok ? 'Давление стабильно · шов герметичен' : state.test > 0.05 ? 'Накачка канала…' : 'Ожидание испытания';
  roStatus.classList.toggle('ok', ok);

  const max = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = `${(window.scrollY / Math.max(max, 1)) * 100}%`;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Форма (без сервера — подключите свой обработчик/CRM)
document.getElementById('leadForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  document.getElementById('formNote').textContent = 'Спасибо! Заявка принята — мы свяжемся с вами.';
  e.target.reset();
});

requestAnimationFrame(frame);
