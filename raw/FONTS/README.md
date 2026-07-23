# Urdu Archive — Fonts

Place `.ttf`, `.woff`, `.woff2`, and `.otf` files here (subfolders allowed, e.g. `urdu-web-fonts/`).

After adding or renaming fonts, regenerate the manifest:

```bash
node scripts/build-fonts-manifest.mjs
```

Commit both the font files and `manifest.json`. Qaafiyah Expert loads fonts from:

`https://cdn.jsdelivr.net/gh/ShakesVision/urdu-archive@master/raw/FONTS/manifest.json`
