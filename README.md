# Bertrand Osei-Owusu Bosu: portfolio

Personal portfolio of a Level 200 Computer Engineering student at the University of Ghana, focused on embedded systems and applied AI.

**Live site:** https://bertqrt.github.io/Bert-portfolio/

The design follows a circuit board idea: copper traces, a chip, datasheet-style parts lists, and a stepped trace through the Journey page. It shares its colours and fonts with my blog at https://bertqrt.github.io/bertrandbosu-blog1/.

## Pages

| File | What it is |
|---|---|
| `index.html` | Home: hero, the chip navigation, latest build and recent blog posts |
| `projects.html` | Projects with parts lists and "See it working" media drawers |
| `journey.html` | How I got here, as chapters along a copper trace |
| `now.html` | What I'm learning, writing and building right now |
| `404.html` | Shown by GitHub Pages for any missing page |

## Files

- `style.css` holds all styling. Colours are CSS variables at the top, with dark mode values under `[data-theme="dark"]`.
- `script.js` handles the theme toggle, scroll animations, the journey trace, project filters, media drawers and the video player.
- `media/` holds the project video, its poster, and `og.jpg`, the preview image shown when the link is shared.
- `photo.jpg` is the photo on the home page.

## Editing

It's plain HTML, CSS and JavaScript with no build step. Edit a file, commit, and push to `main`; GitHub Pages republishes in about a minute.

Each page has its own copy of the header and footer, so a change there has to be made in all five HTML files.

After changing `style.css` or `script.js`, bump the version number in the links on every page (`style.css?v=15` to `?v=16`). Otherwise browsers keep showing the old cached file.

To add a photo to a project that already has a drawer (like the Smart Waste Bin), put the file in `media/` and add it inside that project's `.bench` in `projects.html`:

```html
<figure class="shot media-item">
  <img src="media/my-photo.jpg" alt="What the photo shows">
  <figcaption>a short handwritten caption</figcaption>
</figure>
```

## Credits

Me and a bit of claude
