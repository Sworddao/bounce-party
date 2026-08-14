/* Solar Gravity — smooth day/night transition.
   One continuous value drives everything:
   progress = 0  full day
   progress = 1  full night
   All visuals are derived from this value, so nothing ever snaps. */

const toggle = document.getElementById("dark-toggle");
const root = document.documentElement;

const DURATION = 4000; // ms for a full day<->night sweep
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let progress = 0; // current animated value
let target = 0;   // where we are heading
let rafId = null;
let lastTime = null;

/* ---------- Math helpers ---------- */

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function easeInOutSine(value) {
  return -(Math.cos(Math.PI * value) - 1) / 2;
}

/* ---------- Planet data ----------
   Day:   every planet revolves around the sun on its own elliptical path.
   Night: planets phase out of their orbit and bounce around the screen.
   The day/night progress smoothly blends between the two paths, so the
   handover is always interpolated from wherever a planet currently is. */

/* Night bounce paths, as (x, y) offsets from screen center in vw/vh units. */
const nightPaths = [
  [ { x: -0.38, y: -0.28 }, { x: 0.42, y: -0.22 }, { x: 0.30, y: 0.40 }, { x: -0.42, y: 0.28 } ],
  [ { x: -0.18, y: 0.38 }, { x: 0.40, y: 0.20 }, { x: 0.14, y: -0.42 }, { x: -0.40, y: -0.14 } ],
  [ { x: 0.38, y: -0.34 }, { x: -0.38, y: -0.34 }, { x: -0.30, y: 0.40 }, { x: 0.36, y: 0.38 } ],
  [ { x: -0.24, y: -0.08 }, { x: 0.26, y: 0.42 }, { x: 0.42, y: -0.32 }, { x: -0.42, y: 0.18 } ],
];

const planetDefs = [
  {
    selector: ".p-mercury", size: 1.00, depth: 0.55, dir: 1, speed: 0.30, phase: 0.0, selfRot: 0.05,
    orbit: { rx: 0.060, ry: 0.035, tilt: 0.20 },
    path: 0, pathDuration: 8,
  },
  {
    selector: ".p-venus", size: 1.05, depth: 0.65, dir: -1, speed: 0.24, phase: 1.7, selfRot: 0.03,
    orbit: { rx: 0.090, ry: 0.050, tilt: -0.15 },
    path: 1, pathDuration: 11,
  },
  {
    selector: ".p-earth", size: 1.15, depth: 0.80, dir: 1, speed: 0.19, phase: 3.1, selfRot: 0.04,
    orbit: { rx: 0.120, ry: 0.060, tilt: 0.05 },
    path: 2, pathDuration: 13,
  },
  {
    selector: ".p-mars", size: 1.00, depth: 0.70, dir: -1, speed: 0.16, phase: 4.5, selfRot: 0.03,
    orbit: { rx: 0.150, ry: 0.070, tilt: -0.25 },
    path: 3, pathDuration: 9,
  },
  {
    selector: ".p-jupiter", size: 1.00, depth: 0.45, dir: 1, speed: 0.11, phase: 0.9, selfRot: 0.02,
    orbit: { rx: 0.180, ry: 0.080, tilt: 0.10 },
    path: 0, pathDuration: 16,
  },
  {
    selector: ".p-saturn", size: 1.00, depth: 0.40, dir: -1, speed: 0.09, phase: 2.3, selfRot: 0.06,
    orbit: { rx: 0.210, ry: 0.090, tilt: -0.10 },
    path: 1, pathDuration: 15,
  },
  {
    selector: ".p-uranus", size: 0.95, depth: 0.35, dir: 1, speed: 0.07, phase: 5.2, selfRot: 0.02,
    orbit: { rx: 0.240, ry: 0.100, tilt: 0.15 },
    path: 2, pathDuration: 18,
  },
  {
    selector: ".p-neptune", size: 0.90, depth: 0.30, dir: -1, speed: 0.05, phase: 6.0, selfRot: 0.02,
    orbit: { rx: 0.270, ry: 0.110, tilt: -0.05 },
    path: 3, pathDuration: 20,
  },
];

const planetInstances = planetDefs.map((def) => ({
  ...def,
  el: document.querySelector(def.selector),
  angle: def.phase,
  selfAngle: 0,
  pathTime: Math.random(), // desync night bouncing
}));

const isMobile = window.innerWidth < 600;
const MOBILE_SCALE = isMobile ? 0.7 : 1;
const MAX_PARALLAX = 22; // px, for the deepest planet

let sunSinkPx = 0;
let parallaxX = 0;
let parallaxY = 0;
let parallaxTargetX = 0;
let parallaxTargetY = 0;
let planetLastTime = null;
let planetRafId = null;

function setupParallax() {
  window.addEventListener("pointermove", function (event) {
    parallaxTargetX = (event.clientX / window.innerWidth - 0.5) * 2;
    parallaxTargetY = (event.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
}

/* Compute one point on an ellipse, rotated by `tilt`. */
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

function renderPlanets() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const base = Math.min(vw, vh) * MOBILE_SCALE;
  const centerX = vw / 2;
  const centerY = vh / 2 + sunSinkPx * 0.35;

  // Day/night progress smoothly carries each planet from its sun orbit
  // out onto its bouncing path (and back), always from its current spot.
  const scatter = easeInOutSine(progress);

  parallaxX += (parallaxTargetX - parallaxX) * 0.06;
  parallaxY += (parallaxTargetY - parallaxY) * 0.06;

  for (const planet of planetInstances) {
    const dayPoint = ellipsePoint(planet.orbit.rx * base, planet.orbit.ry * base, planet.orbit.tilt, planet.angle);
    const nightPoint = samplePath(nightPaths[planet.path], planet.pathTime);

    const x = lerp(centerX + dayPoint.x, centerX + nightPoint.x * vw, scatter);
    const y = lerp(centerY + dayPoint.y, centerY + nightPoint.y * vh, scatter);

    // Depth parallax: closer planets shift more with the cursor.
    const px = x + parallaxX * planet.depth * MAX_PARALLAX;
    const py = y + parallaxY * planet.depth * MAX_PARALLAX;

    // Brighter for closer planets; planets stay visible while they bounce.
    const opacity = 0.55 + 0.45 * planet.depth;

    planet.el.style.transform =
      "translate3d(" + (px - centerX) + "px, " + (py - centerY) + "px, 0) " +
      "rotate(" + planet.selfAngle + "rad) scale(" + planet.size + ")";
    planet.el.style.opacity = opacity.toFixed(3);
    planet.el.style.zIndex = 3 + Math.round(planet.depth * 4);
  }
}

function planetTick(time) {
  if (planetLastTime === null) planetLastTime = time;
  const dt = Math.min(100, time - planetLastTime);
  planetLastTime = time;

  for (const planet of planetInstances) {
    planet.angle += planet.speed * planet.dir * (dt / 1000);
    planet.selfAngle += planet.selfRot * (dt / 1000);
    planet.pathTime = (planet.pathTime + (dt / 1000) / planet.pathDuration) % 1;
  }

  renderPlanets();
  planetRafId = requestAnimationFrame(planetTick);
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/* A soft bell curve: 1 at `center`, fades out over `width`. */
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

/* ---------- Phase curves (continuous, blended, no hard edges) ----------
   DAY      0.00 - 0.55
   SUNSET   0.55 - 0.70
   TWILIGHT 0.70 - 0.85
   NIGHT    0.85 - 1.00   */

function applyPhase(value) {
  const night = smoothstep(0.45, 0.95, value);
  const sunset = bell(0.62, 0.14, value);
  const twilight = bell(0.78, 0.12, value);

  // Sky: day fades out as night fades in; sunset & twilight peak in between.
  setVar("--night", night);
  setVar("--sunset", sunset);
  setVar("--twilight", twilight);

  // Stars: brightest first, gradually more, full only at night.
  const stars = smoothstep(0.5, 0.9, value);
  setVar("--stars", stars);

  // Sun: stays up, warms at sunset, sinks toward the horizon, fades out.
  const sunSink = smoothstep(0.35, 0.9, value);
  const sunFade = 1 - smoothstep(0.5, 0.92, value);
  sunSinkPx = sunSink * 140;
  setVar("--sun-sink", sunSinkPx + "px");
  setVar("--sun-fade", sunFade);
  setVar("--sun-bg", gradient(
    mixColor("#fff8c0", "#ffb36b", sunset),
    mixColor("#ffd93d", "#ff7a1a", sunset),
    mixColor("#ff9f1a", "#e64a1f", sunset)
  ));

  // Moon: rises from below the horizon and fades in as night takes over.
  const moonFade = smoothstep(0.6, 0.95, value);
  const moonRise = (1 - moonFade) * 120;
  setVar("--moon-fade", moonFade);
  setVar("--moon-rise", moonRise + "px");

  // Clouds: bright by day, warm at sunset, faint and dark at night.
  setVar("--cloud-bg", cloudColor(sunset, night));
  setVar("--cloud-fade", 1 - night * 0.6);

  // Birds drift away as dusk falls; owl & bats appear for the night.
  setVar("--bird-fade", 1 - smoothstep(0.45, 0.75, value));
  setVar("--nightlife-fade", smoothstep(0.55, 0.8, value));

  // Planets: slightly dimmer and cooler as the night deepens.
  setVar("--planet-dim", (1 - night * 0.35).toFixed(3));

  // Title.
  setVar("--title-color", mixColor("#1e3a8a", "#ffe066", night));
  setVar("--title-glow", mixRgba("#ffffff", "#ffd93d", night, 0.95));
}

/* Cloud color walks: white (day) -> warm peach (sunset) -> dark navy (night). */
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

function setVar(name, value) {
  root.style.setProperty(name, value);
}

function gradient(top, mid, bottom) {
  return "radial-gradient(circle, " + top + ", " + mid + " 55%, " + bottom + ")";
}

/* ---------- Animation loop ---------- */

function tick(time) {
  if (lastTime === null) lastTime = time;
  const elapsed = time - lastTime;
  lastTime = time;

  const direction = target >= progress ? 1 : -1;
  progress += direction * (elapsed / DURATION);

  if ((direction === 1 && progress >= target) || (direction === -1 && progress <= target)) {
    progress = target;
    applyPhase(progress);
    rafId = null;
    return;
  }

  applyPhase(progress);
  rafId = requestAnimationFrame(tick);
}

function animateTo(nextTarget) {
  target = nextTarget;
  lastTime = null;
  if (rafId !== null) cancelAnimationFrame(rafId);

  if (reducedMotion) {
    progress = target;
    applyPhase(progress);
    renderPlanets();
    return;
  }

  rafId = requestAnimationFrame(tick);
}

/* ---------- Events ---------- */

toggle.addEventListener("change", function () {
  animateTo(toggle.checked ? 1 : 0);
});

/* ---------- Start ---------- */

applyPhase(0);
setupParallax();
renderPlanets();
if (!reducedMotion) {
  planetRafId = requestAnimationFrame(planetTick);
}
