# Solar Gravity

A calm, cinematic 3D miniature solar system built with **HTML + CSS + a little JavaScript** — no libraries, no images, no canvas.

- ☀️ A realistic sun: granulated photosphere, warm corona and glow — **click it** (or use the *Night* button) to switch between day and night
- 🪐 Eight textured 3D planets (Mercury → Neptune) with sun-facing lighting:
  - Shaded spheres with a soft terminator, specular highlight and a thin atmosphere rim — the light always comes from the sun's direction
  - Earth shows oceans, continents, drifting cloud streaks and a blue atmosphere; Saturn gets proper multi-band rings that pass both behind and in front of its disc
  - Each planet has its own orbit radius, speed, direction, inclination and spin
- 🕐 **Day/night cycle:** one continuous sweep drives everything — blue day, warm sunset, deep-blue twilight, then a black night with twinkling stars, a nebula and a distant galaxy
  - The sun warms, sinks toward the horizon and fades; at night it becomes a faint eclipse disc so the toggle stays clickable
  - Planets keep revolving through sunset and twilight, and only **once night has fully fallen** do they gently phase out and bounce around the sky, then glide back to their orbits at dawn — always from wherever they happen to be, never a snap
- 🎥 **Camera:** a damped, subtle 3D camera follows your cursor (and can auto-rotate); orbits, ring depth and planet sizes respond to the view
- 🖱️ **Parallax:** the whole scene, the starfield and the planets drift subtly with your cursor
- 🏷️ **Controls:** glass toolbar — Night/Day, Camera, Orbits, Labels, Rotate
- 💬 **Interactivity:** hover a planet for its name, distance, diameter and orbital period; click to highlight it
- 🌒 Decorative touches: drifting clouds by day, faint bird/plane silhouettes, and a quiet rocket launch in the night sky — all subtle, never competing with the solar system
- ♿ **Accessibility:** honors `prefers-reduced-motion` (instant snap, camera and decorative motion disabled)
- 📱 **Responsive:** scales down for small screens with fewer stars and smaller effects

## Try it

Open `index.html` in your browser, or visit the live page.

## Edit it

Everything is in three files:

| File        | What's inside                                      |
|-------------|----------------------------------------------------|
| `index.html`| Page structure: sky layers, starfield, sun, planets, controls |
| `style.css` | Realistic planet/sun/ring/star styling, sky themes, glass UI |
| `script.js` | Day/night phase engine, 3D camera, lighting, stars, controls |

- Tune each planet in the `PLANETS` array in `script.js` (orbit radius, speed, direction, inclination, spin, night bounce path).
- Tweak `DURATION`, `NIGHT_THRESHOLD` and `SCATTER_DURATION` in `script.js` to change the pacing of the cycle.
- Adjust `PERSP` for a stronger or gentler 3D perspective.

## About

A pure HTML + CSS + JS sky scene — cinematic day/night cycle, lit 3D planets with depth and parallax.
