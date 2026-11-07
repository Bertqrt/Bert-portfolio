# Bertrand Osei-Owusu Bosu: portfolio

Personal portfolio of a Level 200 Computer Engineering student at the University of Ghana, focused on embedded systems and applied AI.

**Live site:** https://bertqrt.github.io/Bert-portfolio/

The design follows a circuit board idea, kept quiet: copper traces, a chip, datasheet-style parts lists, and a stepped trace through the Journey page. Copper is the only accent colour, and mono type is used only for data. It shares its colours and fonts with my blog at https://bertqrt.github.io/bertrandbosu-blog1/.

## Motion

The home page hero is a 3D circuit board you can play with (`hero3d.js`, built on three.js 0.160 loaded from jsDelivr). Parts drop onto the board with squash and stretch, current flows along the copper traces and lights the LEDs, clicking a part makes it jump, and clicking the chip or the button sends a shockwave through the whole board. Drag to spin it; scroll away and it comes apart into an exploded view. If WebGL or the download fails, the flat hero with the photo comes back.

The rest lives in `script.js`, with keyframes at the end of `style.css`:

- "Hi, I'm Bert." and the footer line drop in letter by letter, and the letters hop when you touch them.
- Other headlines rise word by word and lean with the speed of your scroll; blocks flip up as they arrive.
- Whenever a mouse or touchpad is used, the normal pointer is replaced by a copper dot that sits exactly on the mouse and a ring that trails it (it snaps instead of trailing with reduced motion). The normal pointer comes back in fullscreen video, when the mouse leaves the page, and on touch. Every click throws copper sparks.
- A two-row marquee races faster, and flips direction, as you scroll.
- The Latest build card plays an example `/study` chat while it is on screen.
- Project filters throw cards off screen and bounce the new ones in; parts lists decode in.
- A spark with a tail rides the front of the Journey trace.
- Pages change with a tilted curtain transition, and back-to-top launches like a rocket.
- The theme switch spreads out in a quick circle from the toggle (a short colour fade where that isn't supported).

All of it is off when the visitor's device asks for reduced motion. Low-memory phones and data savers get the calm version (no 3D, no cursor effects, no marquee).

## Pages

| File | What it is |
|---|---|
| `index.html` | Home: hero, the chip navigation, latest build and recent blog posts |
| `projects.html` | Projects with parts lists and "See it working" media drawers |
| `journey.html` | How I got here, as chapters along a copper trace |
| `now.html` | What I'm learning, writing and building right now |
| `404.html` | Shown by GitHub Pages for any missing page |

## Files

- `style.css` holds all styling. Colours, type sizes, radii and easings are CSS variables at the top, with dark mode values under `[data-theme="dark"]`.
- `script.js` handles the theme toggle, scroll animations, the journey trace, project filters, media drawers and the video player.
- `media/` holds the project video, its poster, and `og.jpg`, the preview image shown when the link is shared.
- `photo.jpg` is the photo on the home page.

## Editing

It's plain HTML, CSS and JavaScript with no build step. Edit a file, commit, and push to `main`; GitHub Pages republishes in about a minute.

Each page has its own copy of the header and footer, so a change there has to be made in all five HTML files.

After changing `style.css` or `script.js`, bump the version number in the links on every page (`style.css?v=25` to `?v=26`). Otherwise browsers keep showing the old cached file.

To add a photo to a project that already has a drawer (like the Smart Waste Bin), put the file in `media/` and add it inside that project's `.bench` in `projects.html`:

```html
<figure class="shot media-item">
  <img src="media/my-photo.jpg" alt="What the photo shows">
  <figcaption>a short handwritten caption</figcaption>
</figure>
```

## Credits

Me and a bit of claude
