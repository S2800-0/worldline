# Worldline

My portfolio. It reads like a normal portfolio until you open the meter, change a decision in my past, and watch the site become the one a different version of me would have made.

Built with [Astro](https://astro.build), hosted on AWS Amplify Hosting.

## Run it

```sh
npm ci
npm run dev
```

After changing page content, regenerate the images the page warp uses:

```sh
npm run shots
```

## How it's made

- **Meter and dial:** 3D renders scripted in Blender (`art/render_meter.py`, `art/render_dial.py`).
- **Paper, books and engravings:** real public-domain scans. See [CREDITS.md](CREDITS.md). The originals aren't committed; `art/textures.sh` lists what they become.
- **Transition:** a small WebGL shader (`src/scripts/warp.ts`) twists an image of the current page, then reveals the new one along the veins of a real marbled book cover.
- **Accessibility:** everything works by keyboard, and reduced motion gets a crossfade. With JavaScript off, the real site still reads in full.
