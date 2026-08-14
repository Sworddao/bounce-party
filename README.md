# Solar Gravity

A calm, cinematic 3D miniature solar system built with **HTML + CSS + a little JavaScript** — no libraries, no images, no canvas.

- ☀️ A realistic sun: granulated photosphere, warm corona and glow — **click it** (or use the *Destroy Sun* button) to trigger a solar event, and click the faint remnant left behind to restore it
- 🪐 Eight textured 3D planets (Mercury → Neptune) with sun-facing lighting:
  - Shaded spheres with a soft terminator, specular highlight and a thin atmosphere rim — the light always comes from the sun's direction
  - Earth shows oceans, continents, drifting cloud streaks and a blue atmosphere; Saturn gets proper multi-band rings that pass both behind and in front of its disc
  - Each planet has its own orbit radius, speed, direction, inclination and spin
- ☀️↔🕳️ **Destroy / Restore the Sun:** a small state machine drives the life and death of the star:
  1. *Destabilization* — the corona flares and the photosphere warms (1.5 s)
  2. *Light-travel delay* — the compressed **8 m 20 s** sunlight/gravity delay; the sky stays bright and a wavefront ring expands outward
  3. *Collapse* — the sun fades cleanly (no explosion) as the final photons depart
  4. *Deep space* — stars, a Milky Way band and nebulae take over; clouds, birds and planes vanish; planets leave their orbits and coast forever on straight **inertial trajectories**, each keeping its own (inner worlds faster) speed
  5. *Restoration* — the sun reforms, daylight returns, and the planets curve back to their orbits from wherever they drifted
  - A scientific status readout (bottom-left) narrates each phase, and a countdown bar tracks the light-travel delay
  - Repeats are guarded: the sun only reacts in the `Active` and `Absent` states
- 🎥 **Camera:** a damped, subtle 3D camera follows your cursor (and can auto-rotate); orbits, ring depth and planet sizes respond to the view
- 🖱️ **Parallax:** the whole scene, the starfield and the planets drift subtly with your cursor
- 🏷️ **Controls:** glass toolbar — Destroy Sun, Camera, Orbits, Labels, Rotate
- 💬 **Interactivity:** hover a planet for its name, distance, diameter and orbital period; click to highlight it
- 🌒 Decorative touches: drifting clouds, faint bird/plane silhouettes by day — all fade out once the sun is gone
- ♿ **Accessibility:** the sun is a focusable button (Enter/Space works) and honors `prefers-reduced-motion` (instant snap, camera and decorative motion disabled)
- 📱 **Responsive:** scales down for small screens with fewer stars and smaller effects

## Try it

Open `index.html` in your browser, or visit the live page.

## Edit it

Everything is in three files:

| File        | What's inside                                      |
|-------------|----------------------------------------------------|
| `index.html`| Page structure: sky layers, starfield, sun, planets, controls, status |
| `style.css` | Realistic planet/sun/ring/star styling, deep-space sky, glass UI |
| `script.js` | Destroy/restore state machine, 3D camera, lighting, stars, controls |

- Tune each planet in the `PLANETS` array in `script.js` (orbit radius, speed, direction, inclination, spin, ambient light).
- Tweak `DESTROY_DUR`, `LIGHT_DELAY_DUR`, `DISAPPEAR_DUR`, `ESC_TRANS_DUR`, `RESTORE_REFORM_DUR` and `RESTORE_TOTAL_DUR` to change the pacing of the solar event.
- Adjust `PERSP` for a stronger or gentler 3D perspective.

## About

A pure HTML + CSS + JS sky scene — a cinematic destroy/restore solar cycle, lit 3D planets with depth and parallax.
