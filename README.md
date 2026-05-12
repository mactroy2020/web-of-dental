# Wheel of Dental

A static single-page spin-the-wheel built with D3.js for picking tables without repeats. Pick a number of tables, spin the wheel, and it tracks which slices have already been chosen (state is persisted in `localStorage`).

## Live site

Deployed to GitHub Pages: **https://mactroy2020.github.io/web-of-dental/**

Every push to `main` triggers the [Deploy to GitHub Pages](.github/workflows/) workflow, which publishes the contents of [src/](src/).

## Running locally

```bash
docker-compose up
```

Then open http://localhost:8080. `src/` is bind-mounted, so HTML/CSS/JS edits show up on browser reload.
