# Astra DB Manager
[![Node](https://img.shields.io/badge/node-18.x%20%7C%2020.x%20%7C%2022.x-339933?logo=node.js&logoColor=white)](#)

Minimal Electron + Vue app to manage Astra DB connections locally.

## Downloads

Grab the latest release from GitHub Releases (unsigned on macOS):

- macOS (Apple Silicon, unsigned DMG):
  https://github.com/poloroid/astra-db-manager/releases/latest/download/Astra%20DB%20Manager-mac-arm64.dmg
- Windows (x64, NSIS installer):
  https://github.com/poloroid/astra-db-manager/releases/latest/download/Astra%20DB%20Manager-win-x64.exe
- Linux (x64, AppImage):
  https://github.com/poloroid/astra-db-manager/releases/latest/download/Astra%20DB%20Manager-linux-x64.AppImage

If a link 404s, the latest tag may still be building. You can also browse all releases:
https://github.com/poloroid/astra-db-manager/releases

## What it does

- Add a database by selecting your Secure Connect Bundle (.zip) and credentials JSON.
- Store credentials securely in the OS keychain via keytar (never in plain files).
- Validate SCB contents and credentials; optional live connectivity check.
- Persist DB metadata locally and list your saved databases.
- Explore a keyspace: list tables and UDTs; view generated CREATE statements.
- Console tab to run CQL with basic autocomplete; view results in a table-like output.
- Remove a saved database (app-local only; does not delete the actual cluster).

## Development

```bash
npm install

# Terminal A (Vite dev server)
npm run dev

# Terminal B (launch Electron pointing to dev server)
npm run electron-dev
```

Build + run (production-like)
- `npm start` — builds the renderer with Vite and launches Electron to load `dist/index.html`.

Editing guide
- Renderer entry: `src/renderer/main.js`; app root: `src/renderer/App.vue`.
- Components live in `components/*.vue`; global styles in `styles.css`.
- Main process code in `main.js`; preload bridge in `preload.js`.

## Testing

```bash
npm test
```

## Release pipeline

- Pushing a tag `v*` triggers GitHub Actions to build and publish installers.
- macOS builds are unsigned (no Apple Developer account). Windows signing is optional via secrets.
- Artifacts are attached to the GitHub Release; links above point to the latest.
