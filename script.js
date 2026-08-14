/* Solar Gravity - a cinematic 3D miniature solar system.
   One continuous value drives the mood:
   progress = 0  full day
   progress = 1  full night
   Planets revolve around the sun by day; once night fully settles they
   gently phase out and bounce around the sky, then return at dawn.
   A damped 3D camera, sun lighting, stars and rings are all derived
   per-frame from the same small state. */

"use strict";

const toggle = document.getElementById("dark-toggle");
const root = document.documentElement;
const world = document.getElementById("world");
const sunEl = document.getElementById("sun");
const ringBack = document.getElementById("ring-back");
const ringFront = document.getElementById("ring-front");
const tooltip = document.getElementById("tooltip");
const tooltipName = tooltip.querySelector(".tooltip-name");
const tooltipInfo = tooltip.querySelector(".tooltip-info");
const orbitPathEls = Array.prototype.slice.call(document.querySelectorAll(".orbits path"));
const starPts = {
  far: document.querySelector(".stars-far .pts"),
  mid: document.querySelector(".stars-mid .pts"),
  bright: document.querySelector(".stars-bright .pts"),
};

const DURATION = 4000;          // ms for a full day<->night sweep
const NIGHT_THRESHOLD = 0.9;    // scatter only starts once night fully hits
const SCATTER_DURATION = 3000;  // ms for the orbit -> bounce phase-out
const PERSP = 1400;             // camera perspective distance (px)

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.innerWidth < 640;
const MOBILE_SCALE = isMobile ? 0.78 : 1;

/* ---------- Night bounce paths, (x, y) offsets in vw/vh units ---------- */

const nightPaths = [
  [ { x: -0.38, y: -0.28 }, { x: 0.42, y: -0.22 }, { x: 0.30, y: 0.40 }, { x: -0.42, y: 0.28 } ],
  [ { x: -0.18, y: 0.38 }, { x: 0.40, y: 0.20 }, { x: 0.14, y: -0.42 }, { x: -0.40, y: -0.14 } ],
  [ { x: 0.38, y: -0.34 }, { x: -0.38, y: -0.34 }, { x: -0.30, y: 0.40 }, { x: 0.36, y: 0.38 } ],
  [ { x: -0.24, y: -0.08 }, { x: 0.26, y: 0.42 }, { x: 0.42, y: -0.32 }, { x: -0.42, y: 0.18 } ],
];

/* ---------- Planet data ---------- */

const PLANETS = [
  {
    name: "Mercury", sel: ".p-mercury", labId: "lab-mercury", sizePx: 16,
    gap: 0.050, dir: 1, speed: 0.30, phase: 0.0, selfRot: 0.05,
    tilt: 0.20, incl: 0.05, inclPhase: 0.0, path: 0, pathDuration: 8,
    info: { distance: "0.39 AU", size: "4,879 km", period: "88 days" },
  },
  {
    name: "Venus", sel: ".p-venus", labId: "lab-venus", sizePx: 24,
    gap: 0.075, dir: -1, speed: 0.24, phase: 1.7, selfRot: 0.03,
    tilt: -0.15, incl: 0.05, inclPhase: 1.0, path: 1, pathDuration: 11,
    info: { distance: "0.72 AU", size: "12,104 km", period: "225 days" },
  },
  {
    name: "Earth", sel: ".p-earth", labId: "lab-earth", sizePx: 28,
    gap: 0.100, dir: 1, speed: 0.19, phase: 3.1, selfRot: 0.06,
    tilt: 0.05, incl: 0.06, inclPhase: 2.0, path: 2, pathDuration: 13, clouds: true,
    info: { distance: "1.00 AU", size: "12,742 km", period: "365 days" },
  },
  {
    name: "Mars", sel: ".p-mars", labId: "lab-mars", sizePx: 22,
    gap: 0.125, dir: -1, speed: 0.16, phase: 4.5, selfRot: 0.03,
    tilt: -0.25, incl: 0.06, inclPhase: 3.0, path: 3, pathDuration: 9,
    info: { distance: "1.52 AU", size: "6,779 km", period: "687 days" },
  },
  {
    name: "Jupiter", sel: ".p-jupiter", labId: "lab-jupiter", sizePx: 52,
    gap: 0.150, dir: 1, speed: 0.11, phase: 0.9, selfRot: 0.10,
    tilt: 0.10, incl: 0.07, inclPhase: 0.5, path: 0, pathDuration: 16,
    info: { distance: "5.20 AU", size: "139,820 km", period: "11.9 years" },
  },
  {
    name: "Saturn", sel: ".p-saturn", labId: "lab-saturn", sizePx: 46,
    gap: 0.180, dir: -1, speed: 0.09, phase: 2.3, selfRot: 0.06,
    tilt: -0.10, incl: 0.08, inclPhase: 1.5, path: 1, pathDuration: 15, rings: true,
    info: { distance: "9.58 AU", size: "116,460 km", period: "29.4 years" },
  },
  {
    name: "Uranus", sel: ".p-uranus", labId: "lab-uranus", sizePx: 30,
    gap: 0.210, dir: 1, speed: 0.07, phase: 5.2, selfRot: 0.04,
    tilt: 0.15, incl: 0.08, inclPhase: 2.5, path: 2, pathDuration: 18,
    info: { distance: "19.2 AU", size: "50,724 km", period: "84 years" },
  },
  {
    name: "Neptune", sel: ".p-neptune", labId: "lab-neptune", sizePx: 29,
    gap: 0.240, dir: -1, speed: 0.05, phase: 6.0, selfRot: 0.03,
    tilt: -0.05, incl: 0.09, inclPhase: 3.5, path: 3, pathDuration: 20,
    info: { distance: "30.0 AU", size: "49,244 km", period: "165 years" },
  },
];

const planets = PLANETS.map((def, i) => ({
  ...def,
  index: i,
  el: document.querySelector(def.sel),
  labEl: document.getElementById(def.labId),
  angle: def.phase,
  selfAngle: 0,
  pathTime: Math.random(),
  proj: { sx: 0, sy: 0, sz: 0, ss: 1 },
  zIndex: 10,
}));

/* ---------- State ---------- */

let progress = 0;            // current animated mood
let target = 0;              // where we are heading
let scatterProgress = 0;     // 0 = orbiting the sun, 1 = fully bouncing
let scatterTarget = 0;
let camYaw = 0;              // damped camera angles (radians)
let camPitch = 0;
let camYawTarget = 0;
let camPitchTarget = 0;
let autoYaw = 0;
let autoRotate = false;
let camEnabled = true;
let parX = 0;                // cursor parallax (normalised -0.5..0.5)
let parY = 0;
let parTX = 0;
let parTY = 0;
let hoverIndex = -1;
let selectedIndex = -1;
let rafId = null;
let lastTime = null;

let U = 0;                   // base unit = min(vw, vh) * scale
let sunR = isMobile ? 50 : 75;
let currentNight = 0;
let currentSink = 0;

/* ---------- Math helpers ---------- */

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function easeInOutSine(value) {
  return -(Math.cos(Math.PI * value) - 1) / 2;
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function bell(center, width, value) {
  const d = (value - center) / width;
  return Math.exp(-d * d);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixColor(hexA, hexB, t) {
  const a = [parseInt(hexA.slice(1, 3), 16), parseInt(hexA.slice(3, 5), 16), parseInt(hexA.slice(5, 7), 16)];
  const b = [parseInt(hexB.slice(1, 3), 16), parseInt(hexB.slice(3, 5), 16), parseInt(hexB.slice(5, 7), 16)];
  const r = Math.round(lerp(a[0], b[0], t));
  const g = Math.round(lerp(a[1], b[1], t));
  const bl = Math.round(lerp(a[2], b[2], t));
  return "rgb(" + r + ", " + g + ", " + bl + ")";
}

function mixRgba(hexA, hexB, t, alpha) {
  const rgb = mixColor(hexA, hexB, t);
  return rgb.replace(")", ", " + alpha + ")").replace("rgb(", "rgba(");
}

/* One point on an ellipse, rotated by `tilt`. */
function ellipsePoint(rx, ry, tilt, angle) {
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  const ex = rx * Math.cos(angle);
  const ey = ry * Math.sin(angle);
  return {
    x: ex * c - ey * s,
    y: ex * s + ey * c,
  };
}

/* Walk a bounce path as a closed loop (linear segments = bouncing corners). */
function samplePath(path, t) {
  const n = path.length;
  const scaled = t * n;
  const i = Math.floor(scaled) % n;
  const local = scaled - Math.floor(scaled);
  const a = path[i];
  const b = path[(i + 1) % n];
  return {
    x: a.x + (b.x - a.x) * local,
    y: a.y + (b.y - a.y) * local,
  };
}

function setVar(name, value) {
  root.style.setProperty(name, value);
}

/* ---------- Geometry: scale, orbits, projection ---------- */

function computeScale() {
  U = Math.min(window.innerWidth, window.innerHeight) * MOBILE_SCALE;
}

function buildOrbits() {
  for (const p of planets) {
    const rx = sunR + p.gap * U;
    const ry = rx * 0.45;
    const pts = [];
    const N = 72;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const e = ellipsePoint(rx, ry, p.tilt, a);
      pts.push({ x: e.x, y: e.y, z: Math.sin(a + p.inclPhase) * p.incl * U });
    }
    p.orbitPx = { rx, ry, pts };
  }
}

/* Rotate a world-space point by yaw (around Y) then pitch (around X),
   then apply perspective. Returns an offset from screen centre. */
function project(x, y, z, cyw, syw, cpx, spx) {
  const X = x * cyw + z * syw;
  const Z = -x * syw + z * cyw;
  const Y2 = y * cpx - Z * spx;
  const Z2 = y * spx + Z * cpx;
  const s = PERSP / (PERSP + Z2);
  return { x: X * s, y: Y2 * s, z: Z2, s: s };
}

/* ---------- Stars ---------- */

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function buildStars() {
  const counts = isMobile ? { far: 70, mid: 30, bright: 10 } : { far: 120, mid: 48, bright: 18 };
  const w = window.innerWidth;
  const h = window.innerHeight;
  let far = "";
  let mid = "";
  let bright = "";

  for (let i = 0; i < counts.far; i++) {
    far += rand(0, w).toFixed(0) + "px " + rand(0, h).toFixed(0) + "px 0 0 " +
      (i % 3 ? "#ffffff" : "#dbe9ff") + (i < counts.far - 1 ? ", " : "");
  }
  for (let i = 0; i < counts.mid; i++) {
    mid += rand(0, w).toFixed(0) + "px " + rand(0, h).toFixed(0) + "px 0 0 #eaf2ff" +
      (i < counts.mid - 1 ? ", " : "");
  }
  for (let i = 0; i < counts.bright; i++) {
    const x = rand(0, w).toFixed(0) + "px ";
    const y = rand(0, h).toFixed(0) + "px ";
    bright += x + y + "0 1px #ffffff, " + x + y + "0 3px rgba(190, 215, 255, 0.5)" +
      (i < counts.bright - 1 ? ", " : "");
  }

  starPts.far.style.boxShadow = far;
  starPts.mid.style.boxShadow = mid;
  starPts.bright.style.boxShadow = bright;
}

/* ---------- Phase curves (continuous, blended, no hard edges)
   DAY      0.00 - 0.55
   SUNSET   0.55 - 0.70
   TWILIGHT 0.70 - 0.85
   NIGHT    0.85 - 1.00   */

function cloudColor(sunset, night) {
  const white = [255, 255, 255];
  const warm = [255, 217, 160];
  const navy = [28, 36, 66];
  let r = white[0] + (warm[0] - white[0]) * sunset;
  let g = white[1] + (warm[1] - white[1]) * sunset;
  let b = white[2] + (warm[2] - white[2]) * sunset;
  r = r + (navy[0] - r) * night;
  g = g + (navy[1] - g) * night;
  b = b + (navy[2] - b) * night;
  return "rgb(" + Math.round(r) + ", " + Math.round(g) + ", " + Math.round(b) + ")";
}

function applyPhase(value) {
  currentNight = smoothstep(0.45, 0.95, value);
  const sunset = bell(0.62, 0.14, value);
  const twilight = bell(0.78, 0.12, value);

  setVar("--night", currentNight);
  setVar("--sunset", sunset);
  setVar("--twilight", twilight);

  setVar("--stars", smoothstep(0.5, 0.9, value));

  // Sun: warms at sunset, sinks, fades out; eclipse disc covers it at night.
  currentSink = smoothstep(0.35, 0.9, value) * 160;
  setVar("--sun-sink", currentSink + "px");
  setVar("--sun-fade", (1 - smoothstep(0.5, 0.92, value)).toFixed(3));
  setVar("--eclipse", currentNight);
  setVar("--sun-a", mixColor("#fffbe0", "#ffe3a8", sunset));
  setVar("--sun-b", mixColor("#ffd93d", "#ff9a2a", sunset));
  setVar("--sun-c", mixColor("#ff9f1a", "#f4641a", sunset));
  setVar("--sun-d", mixColor("#e8670a", "#b93808", sunset));

  // Clouds: bright by day, warm at sunset, faint and dark at night.
  setVar("--cloud-bg", cloudColor(sunset, currentNight));
  setVar("--cloud-fade", (1 - currentNight * 0.65).toFixed(3));

  // Silhouettes: birds fade out at dusk, rockets fade in for the night.
  setVar("--bird-fade", (1 - smoothstep(0.45, 0.75, value)).toFixed(3));
  setVar("--nightlife-fade", smoothstep(0.55, 0.8, value));

  // Interface colouring adapts to the sky.
  setVar("--ui-text", mixColor("#123a6b", "#e8e4f4", currentNight));
  setVar("--title-color", mixColor("#0b2a5e", "#f5e6c0", currentNight));
  setVar("--title-glow", mixRgba("#ffffff", "#ffd98f", currentNight, 0.85));
  setVar("--orbit-c", mixColor("#4a5f96", "#c8d8ff", currentNight));
}

/* ---------- Render ---------- */

function setSvgSize() {
  const svg = document.getElementById("orbits");
  svg.setAttribute("viewBox", "0 0 " + window.innerWidth + " " + window.innerHeight);
}

function render(yaw, pitch) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = vw / 2;
  const cy = vh / 2;
  const cyw = Math.cos(yaw);
  const syw = Math.sin(yaw);
  const cpx = Math.cos(pitch);
  const spx = Math.sin(pitch);
  const orbitOffY = currentSink * 0.35;
  const lightY = cy + currentSink;
  const scatter = easeInOutSine(scatterProgress);
  const night = currentNight;
  const tNow = performance.now() / 1000;

  for (const p of planets) {
    const e = ellipsePoint(p.orbitPx.rx, p.orbitPx.ry, p.tilt, p.angle);
    const wob = Math.sin(p.angle + p.inclPhase) * p.incl * U;
    const day = project(e.x, e.y + orbitOffY, wob, cyw, syw, cpx, spx);
    const np = samplePath(nightPaths[p.path], p.pathTime);
    const nx = np.x * vw;
    const ny = np.y * vh;

    const sx = lerp(day.x, nx - cx, scatter);
    const sy = lerp(day.y, ny - cy, scatter);
    const sz = day.z * (1 - scatter);
    const ss = lerp(day.s, 1, scatter);
    p.proj = { sx: sx, sy: sy, sz: sz, ss: ss };

    // Face the bright side toward the sun, compensating the planet's spin.
    const face = Math.atan2(cy + sy - lightY, cx + sx - cx) * 180 / Math.PI - p.selfAngle * 180 / Math.PI;
    const posLight = Math.min(1.25, Math.max(0.6, 0.82 + (ss - 1) * 1.6));
    const b = posLight * (1 - night * 0.35);

    p.el.style.transform =
      "translate3d(" + sx.toFixed(2) + "px," + sy.toFixed(2) + "px,0) " +
      "rotate(" + p.selfAngle.toFixed(4) + "rad) scale(" + ss.toFixed(4) + ")";
    p.el.style.setProperty("--face", face.toFixed(2) + "deg");
    p.el.style.setProperty("--pl", b.toFixed(3));

    if (p.clouds) {
      p.el.style.setProperty("--cloud-x", ((tNow * 9) % 22 - 11).toFixed(2) + "px");
    }
  }

  // Painter's sort: deepest first, the sun sits at depth zero.
  const items = planets.map((p) => ({ p: p, z: p.proj.sz }));
  items.push({ sun: true, z: 0 });
  items.sort((a, b) => a.z - b.z);
  let zi = 10;
  for (const it of items) {
    if (it.sun) {
      sunEl.style.zIndex = zi;
    } else {
      it.p.el.style.zIndex = zi;
      it.p.zIndex = zi;
    }
    zi++;
  }

  // Saturn's rings: front and back halves pinned to the planet.
  const sat = planets.find((p) => p.rings);
  if (sat) {
    const theta = -24 + pitch * 57.2958 * 0.55;
    const t3 = "translate3d(" + sat.proj.sx.toFixed(2) + "px," + sat.proj.sy.toFixed(2) + "px,0) " +
      "scale(" + sat.proj.ss.toFixed(4) + ") scaleY(0.38) rotate(" + theta.toFixed(2) + "deg)";
    ringBack.style.transform = t3;
    ringFront.style.transform = t3;
    ringBack.style.zIndex = Math.max(2, sat.zIndex - 1);
    ringFront.style.zIndex = sat.zIndex + 1;
  }

  // Orbit lines (project the precomputed polylines each frame).
  for (let i = 0; i < planets.length; i++) {
    const p = planets[i];
    const pts = p.orbitPx.pts;
    let d = "";
    for (let k = 0; k < pts.length; k++) {
      const pr = project(pts[k].x, pts[k].y + orbitOffY, pts[k].z, cyw, syw, cpx, spx);
      d += (k ? "L" : "M") + (cx + pr.x).toFixed(1) + " " + (cy + pr.y).toFixed(1);
    }
    d += "Z";
    orbitPathEls[i].setAttribute("d", d);
  }

  // Labels float just above their planet.
  if (document.body.classList.contains("labels-on")) {
    for (const p of planets) {
      const off = p.sizePx * p.proj.ss / 2 + 12;
      p.labEl.style.transform = "translate3d(" + p.proj.sx.toFixed(2) + "px," + (p.proj.sy - off).toFixed(2) + "px,0)";
    }
  }

  // Starfield parallax with the camera.
  starPts.far.parentElement.style.transform = "translate3d(" + (yaw * -18).toFixed(2) + "px," + (pitch * -18).toFixed(2) + "px,0)";
  starPts.mid.parentElement.style.transform = "translate3d(" + (yaw * -34).toFixed(2) + "px," + (pitch * -34).toFixed(2) + "px,0)";
  starPts.bright.parentElement.style.transform = "translate3d(" + (yaw * -52).toFixed(2) + "px," + (pitch * -52).toFixed(2) + "px,0)";

  // Tooltip follows the hovered planet.
  if (hoverIndex >= 0) {
    const p = planets[hoverIndex];
    const tx = cx + p.proj.sx + parX * 12;
    const ty = cy + p.proj.sy - 48;
    const tw = tooltip.offsetWidth || 190;
    let fx = tx + 14;
    if (fx + tw > vw - 8) fx = tx - tw - 14;
    let fy = ty;
    if (fy < 8) fy = cy + p.proj.sy + p.sizePx * p.proj.ss / 2 + 18;
    tooltip.style.transform = "translate3d(" + fx + "px," + fy + "px,0)";
    tooltip.classList.add("show");
  }
}

/* ---------- Animation loop ---------- */

function frame(time) {
  if (lastTime === null) lastTime = time;
  const dt = Math.min(100, time - lastTime);
  lastTime = time;
  const dtSec = dt / 1000;

  const dir = target >= progress ? 1 : -1;
  progress += dir * (dt / DURATION);
  if ((dir === 1 && progress >= target) || (dir === -1 && progress <= target)) {
    progress = target;
  }

  // Planets only phase out once night fully hits (and wait for true day
  // before returning to their orbits).
  scatterTarget = progress >= NIGHT_THRESHOLD ? 1 : 0;
  if (scatterProgress < scatterTarget) {
    scatterProgress = Math.min(scatterTarget, scatterProgress + dt / SCATTER_DURATION);
  } else if (scatterProgress > scatterTarget) {
    scatterProgress = Math.max(scatterTarget, scatterProgress - dt / SCATTER_DURATION);
  }

  const damp = 1 - Math.exp(-dt / 450);
  if (camEnabled) {
    camYaw += (camYawTarget - camYaw) * damp;
    camPitch += (camPitchTarget - camPitch) * damp;
  }
  if (autoRotate) autoYaw += dtSec * 0.05;
  parX += (parTX - parX) * damp;
  parY += (parTY - parY) * damp;

  for (const p of planets) {
    p.angle += p.speed * p.dir * dtSec;
    p.selfAngle += p.selfRot * dtSec;
    p.pathTime = (p.pathTime + dtSec / p.pathDuration) % 1;
  }

  applyPhase(progress);
  world.style.transform =
    "translate3d(" + (parX * 12).toFixed(2) + "px," + (parY * 10).toFixed(2) + "px,0)";
  render(camYaw + autoYaw, camPitch);

  rafId = requestAnimationFrame(frame);
}

function animateTo(next) {
  target = next;
  updateDayNightButton();
  if (reducedMotion) {
    progress = target;
    scatterProgress = target >= NIGHT_THRESHOLD ? 1 : 0;
    applyPhase(progress);
    render(0, 0);
    return;
  }
  if (rafId === null) rafId = requestAnimationFrame(frame);
}

/* ---------- Controls ---------- */

const ctlDaynight = document.getElementById("ctl-daynight");
const ctlCamera = document.getElementById("ctl-camera");
const ctlOrbits = document.getElementById("ctl-orbits");
const ctlLabels = document.getElementById("ctl-labels");
const ctlRotate = document.getElementById("ctl-rotate");

function updateDayNightButton() {
  ctlDaynight.textContent = toggle.checked ? "Day" : "Night";
  ctlDaynight.setAttribute("aria-pressed", String(toggle.checked));
}

toggle.addEventListener("change", function () {
  animateTo(toggle.checked ? 1 : 0);
  updateDayNightButton();
});

ctlDaynight.addEventListener("click", function () {
  toggle.checked = !toggle.checked;
  toggle.dispatchEvent(new Event("change"));
});

ctlCamera.addEventListener("click", function () {
  camEnabled = !camEnabled;
  ctlCamera.classList.toggle("active", camEnabled);
  ctlCamera.setAttribute("aria-pressed", String(camEnabled));
});

ctlOrbits.addEventListener("click", function () {
  document.body.classList.toggle("orbits-on");
  ctlOrbits.classList.toggle("active");
  ctlOrbits.setAttribute("aria-pressed", String(document.body.classList.contains("orbits-on")));
});

ctlLabels.addEventListener("click", function () {
  document.body.classList.toggle("labels-on");
  ctlLabels.classList.toggle("active");
  ctlLabels.setAttribute("aria-pressed", String(document.body.classList.contains("labels-on")));
});

ctlRotate.addEventListener("click", function () {
  autoRotate = !autoRotate;
  ctlRotate.classList.toggle("active", autoRotate);
  ctlRotate.setAttribute("aria-pressed", String(autoRotate));
});

/* ---------- Pointer interaction ---------- */

window.addEventListener("pointermove", function (event) {
  const nx = event.clientX / window.innerWidth - 0.5;
  const ny = event.clientY / window.innerHeight - 0.5;
  parTX = nx;
  parTY = ny;
  camYawTarget = nx * 0.55;
  camPitchTarget = ny * 0.34;
}, { passive: true });

planets.forEach(function (p) {
  p.el.addEventListener("pointerenter", function () {
    hoverIndex = p.index;
    tooltipName.textContent = p.name;
    tooltipInfo.innerHTML =
      "Distance: " + p.info.distance + "<br>" +
      "Diameter: " + p.info.size + "<br>" +
      "Orbital period: " + p.info.period;
    tooltip.setAttribute("aria-hidden", "false");
  });

  p.el.addEventListener("pointerleave", function () {
    hoverIndex = -1;
    tooltip.classList.remove("show");
    tooltip.setAttribute("aria-hidden", "true");
  });

  p.el.addEventListener("click", function (event) {
    event.stopPropagation();
    selectedIndex = selectedIndex === p.index ? -1 : p.index;
    planets.forEach(function (q) {
      q.el.classList.toggle("selected", q.index === selectedIndex);
    });
  });
});

document.addEventListener("pointerdown", function () {
  if (selectedIndex !== -1) {
    selectedIndex = -1;
    planets.forEach(function (q) {
      q.el.classList.remove("selected");
    });
  }
});

/* ---------- Resize ---------- */

let resizeTimer = null;
window.addEventListener("resize", function () {
  if (resizeTimer !== null) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function () {
    computeScale();
    buildOrbits();
    setSvgSize();
    buildStars();
  }, 200);
});

/* ---------- Start ---------- */

applyPhase(0);
computeScale();
buildOrbits();
setSvgSize();
buildStars();
render(0, 0);
updateDayNightButton();

if (!reducedMotion) {
  rafId = requestAnimationFrame(frame);
}
