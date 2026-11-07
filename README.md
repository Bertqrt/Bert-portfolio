# Bertrand Osei-Owusu Bosu: portfolio

Personal portfolio of a Level 200 Computer Engineering student at the University of Ghana, focused on embedded systems and applied AI.

**Live site:** https://bertqrt.github.io/Bert-portfolio/

The design follows a circuit board idea, kept quiet: copper traces, a chip, datasheet-style parts lists, and a stepped trace through the Journey page. Copper is the only accent colour, and mono type is used only for data. It shares its colours and fonts with my blog at https://bertqrt.github.io/bertrandbosu-blog1/.

## Motion

Most of the motion lives in `script.js`, with its keyframes at the end of `style.css`:

- Headlines rise word by word; blocks fade up as you scroll to them.
- Faint PCB traces behind the home hero carry pulses of current, and glow copper around the cursor.
- The photo tilts toward the cursor; buttons marked `magnetic` lean toward it.
- The Latest build card plays an example `/study` chat while it is on screen.
- Project filters slide a pill to the chosen filter and reflow the list; parts lists decode in.
- A spark rides the front of the Journey trace.
- Pages change with a curtain transition, and the theme switch spreads out in a circle.
- The header line and the back-to-top ring show how far down the page you are.

All of it is off when the visitor's device asks for reduced motion. Low-memory phones and data savers skip the heaviest parts (the scroll reveals, the cursor glow, the magnetic buttons and the flowing current).

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
