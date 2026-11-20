# fu.0 — Yun Ma

Open `index.html` in a browser. The build and all visual assets are included. A network connection is unnecessary.

## Editing

- `index.html` contains project copy, categories, About and Contact. Replace the editorial placeholders when verified materials are available.
- `style.css` defines the layout, responsive grid and editorial typography.
- `src/sculpture.js` builds the beveled tile meshes, glaze, image surfaces and the open tile layout. It evaluates camera and group transforms from normalized scroll progress.
- `src/main.js` connects scroll progress to the typography, grid, model and category links. It also controls the work index and reduced-motion behavior.
- `assets/built.jpg` is the cover supplied in the Built Un-built project documentation. `assets/sculpture.webp` is an output from the site's WebGL scene and is used when WebGL is unavailable. The six inset faces share a synchronized excerpt from `assets/built-loop.mp4`, cut from the supplied Built Un-built installation documentation. `assets/built-still.jpg` is a frame from that same film used while playback loads and when reduced motion is on.

Install and rebuild with `npm install` and `npm run build`. The built script is a classic browser script so local files can open directly. `python3 -m http.server 8765` is another way to preview this folder.

Desktop visual QA used a 1280 × 720 browser viewport. Mobile layout QA used a 390 × 844 viewport in the same desktop browser. Physical mobile devices and Safari were outside this test run.

The tile wall uses a shared playlist. To add another work, put its muted MP4 in `assets/` and add a second `<video data-wall-clip playsinline muted preload="metadata" …>` beside the current one in `index.html`. Single clips loop. Additional clips rotate in document order with a shared crossfade across all film tiles. Update the tile wall’s accessible description when the featured works change.
