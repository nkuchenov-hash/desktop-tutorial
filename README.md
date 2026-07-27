# GeoScope

A modern, responsive geography guessing game inspired by the location-guessing genre.

## Features

- Five-round World Tour mode
- 90-second round timer
- Interactive OpenStreetMap guessing map
- Distance calculation and exponential scoring up to 5,000 points per round
- Round result map with guess-to-answer line
- Final score breakdown and shareable result
- Responsive desktop and mobile interface
- Curated image mode that works without an API key
- Optional Google Street View integration
- Automatic GitHub Pages deployment

## Run locally

Because the project is static, any local web server works:

```bash
python -m http.server 8080
```

Open `http://localhost:8080`.

## Enable Google Street View

1. Create a Google Maps Platform project.
2. Enable the Maps JavaScript API and billing.
3. Restrict the browser key to your local and deployed domains.
4. Open GeoScope settings, paste the key, enable **Prefer Google Street View**, and save.

The key is stored in the current browser's local storage. For a production public game, use domain restrictions and monitor API billing and quotas.

## Deploy with GitHub Pages

The workflow at `.github/workflows/pages.yml` deploys the repository root whenever `main` is updated. In repository settings, set **Pages → Source** to **GitHub Actions** if it is not selected automatically.

## Data and attribution

- Guess and result maps use OpenStreetMap tiles and show the required attribution.
- Demo photographs are loaded from Unsplash.
- Google Street View is used only when the player supplies an API key.

## Roadmap

- Accounts and persistent statistics
- Daily challenge with deterministic seeds
- Multiplayer rooms and live scoreboards
- Country, city, and regional map packs
- Community-created maps
- Anti-cheat rules and ranked play
- Server-side key handling and content administration

## License

MIT
