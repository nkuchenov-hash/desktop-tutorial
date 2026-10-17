# GeoScope / desktop-tutorial — code/doc parity (2026-10-17)

**Reviewed:** `main` at `537cb1e1e948`, `README.md`, `index.html`, `app.js`, file tree and Pages workflow. Static reading only.

## Actual entry and runtime
- Root `index.html` redirects to `geoscope.html`, forwarding URL query/hash. The README's public site URL is a deployment entry, not the HTML view's owning file.
- Root `app.js` is a bundled self-contained browser game script with locations, screens, rounds, map/result scoring; this is a **legacy/parallel app script candidate** to classify, not something to delete by name.
- The repository additionally contains `arena.html`, several `arena-v*.js`/CSS variants and language/bridge modules. The README describes GeoScope but does not define which Arena variants are published/current or archived.
- `.github/workflows/pages.yml` is the GitHub Pages publishing workflow. No dedicated current architecture/AI rules/test specification was found.

## Safe next actions
1. Establish a source-of-truth map for `geoscope.html`, `arena*.html`, shared JS/CSS, and the root redirect by checking script imports and real navigation. Do **not** delete `app.js`, old Arena variants or assets until all entrypoint consumers are documented.
2. Confirm actual Google Street View/API key and offline curated-image behavior in the browser.
3. Add a lightweight manual smoke checklist for round startup, timer, maps, result/score, locale switching, mobile navigation and deployment.
4. Avoid heavy LIFE OS-style documentation until independent modules/teams justify it.

No code, assets, publication workflows or generated files were changed by this review.
