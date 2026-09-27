# Avalonia Conf Online 2026

Website for Avalonia Conf Online 2026, a free online **community conference** about Avalonia UI and .NET.

It is made by and for the Avalonia community: the talks come from people building real applications with Avalonia, chosen through an open Call for Papers, and anyone can watch for free.

**Live site:** https://jsuarezruiz.github.io/AvaloniaConf/ ([English](https://jsuarezruiz.github.io/AvaloniaConf/en/))

| | |
| --- | --- |
| Date | Wednesday, December 2, 2026, 09:00–17:00 CET |
| Format | Online, 45-minute talks, open live stream, no registration |
| Call for Papers | Open until November 13, 2026, 23:59 CET, on [Koliseo](https://koliseo.com/jsuarezruiz/avalonia-conf-2026/sessions) |
| Languages | Spanish and English |
| Code of Conduct | [Español](https://jsuarezruiz.github.io/AvaloniaConf/conduct.html) · [English](https://jsuarezruiz.github.io/AvaloniaConf/en/conduct.html) |

## How the site works

A static site with no build step and no framework. The page is a scroll-driven three.js scene: one island, one camera, six chapters. The text lives in normal HTML, so the site reads fine without JavaScript or WebGL.

| File | Purpose |
| --- | --- |
| `content.js` | Dates, links and every string in Spanish and English |
| `index.html`, `conduct.html` | Page markup (Spanish is the source) |
| `script.js` | Language, light/dark theme, countdown, event phases, menu |
| `world.js` | The 3D scene |
| `styles.css` | Styles for both themes |
| `vendor/` | Trimmed three.js bundle used by `world.js` |
| `tools/` | Local server, page sync and three.js bundle scripts |

The site changes by itself as the dates pass: CFP open, CFP closed, live on the day, and ended.

## Run it locally

```bash
python3 tools/serve.py
```

Then open http://127.0.0.1:4173. It must be served over http because `world.js` is an ES module. This server also turns off caching, so edits always show.

Useful query strings: `?lang=en` or `?lang=es` to pick a language, and `?phase=selection`, `?phase=live` or `?phase=ended` to preview a phase before its date.

## Make changes

1. Edit `content.js` for dates, links or text, and `index.html`, `conduct.html`, `styles.css`, `script.js` or `world.js` for everything else.
2. Regenerate the derived files:

   ```bash
   node tools/sync-pages.mjs
   ```

   This writes the English pages in `en/`, the static text in both languages, the calendar files, `404.html`, `robots.txt`, `sitemap.xml` and the metadata search engines and link previews read. It also stamps content hashes on script and style URLs, so browsers never mix old and new files.
3. Commit and push. GitHub Pages publishes `main` in about 30 seconds.

When `world.js` starts using a three.js class it did not use before, rebuild the bundle (needs [Bun](https://bun.sh)):

```bash
sh tools/build-three.sh
```

## Before the event

- Set `streamUrl` in `content.js` once the stream exists. Until then, the "Watch live" buttons point to the FAQ.
- After November 13, regenerate `assets/social-card.jpg`, which still says the Call for Papers is open.

## Credits

Built with [three.js](https://threejs.org) (MIT) and the [Unbounded](https://github.com/googlefonts/unbounded) typeface (SIL Open Font License 1.1).
