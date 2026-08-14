# Solar Gravity 🌌

A calm, cinematic solar system built with **HTML + CSS + a little JavaScript**.

- 🪐 Eight gradient planets (Mercury → Neptune) drifting on individual elliptical orbits
  - Each planet has its own radius, speed, direction, tilt, depth, and size
  - Mercury orbits fastest; Neptune drifts slowest
- ☀️ **Click the sun** to switch between day and night:
  - **Day:** planets join the sun and revolve around it, full blue sky with drifting clouds and birds
  - **Night:** planets smoothly phase out of their orbit and bounce around the screen as deep space takes over with twinkling stars, and the sun becomes a full moon
  - The transition is a smooth, reversible 4-second cinematic sweep — never a snap
- 🖱️ **Parallax:** planets drift slightly with your cursor; closer planets move more
- 🦉 Night brings an owl and bats; birds head home at dusk
- ✨ Wiggling title and glowing planets
- 👥 Footer credits: sworddao, demonx-sage, UjjenTamrakar & yashaswikarmacharya10-rgb

## Try it

Open `index.html` in your browser, or visit the live page.

## Edit it

Everything is in three files:

| File        | What's inside                                   |
|-------------|-------------------------------------------------|
| `index.html`| Page structure + the eight planets              |
| `style.css` | Sky layers, themes, and all the styling         |
| `script.js` | Day/night transition + the planet orbit engine  |

- Tune each planet's orbit in the `planetDefs` array in `script.js` (speed, size, depth, day/night anchors).
- Tweak `DURATION` in `script.js` to change how fast the day/night sweep plays.

## About

A pure HTML + CSS + JS sky scene — cinematic day/night cycle, drifting planets with depth and parallax.
