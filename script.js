/* Solar Bounce Party — smooth day/night transition.
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
  setVar("--sun-sink", (sunSink * 140) + "px");
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
    toggleNightClass(progress);
    rafId = null;
    return;
  }

  applyPhase(progress);
  toggleNightClass(progress);
  rafId = requestAnimationFrame(tick);
}

/* Planets bounce off the screen edges only once we are deep into the night,
   so the handover never looks like a snap mid-transition. */
function toggleNightClass(value) {
  document.body.classList.toggle("night", value >= 0.85);
}

function animateTo(nextTarget) {
  target = nextTarget;
  lastTime = null;
  if (rafId !== null) cancelAnimationFrame(rafId);

  if (reducedMotion) {
    progress = target;
    applyPhase(progress);
    toggleNightClass(progress);
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
toggleNightClass(0);
