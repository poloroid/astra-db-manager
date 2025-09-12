# Astra DB Manager
[![CI](https://github.com/poloroid/astra-db-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/poloroid/astra-db-manager/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-18.x%20%7C%2020.x%20%7C%2022.x-339933?logo=node.js&logoColor=white)](#)
[![License](https://img.shields.io/github/license/poloroid/astra-db-manager)](https://github.com/poloroid/astra-db-manager/blob/main/LICENSE)

Electron + Vue.js skeleton application for managing Astra databases.

## Features

- Home page lists stored Astra DB connections.
- Modal to add a new DB by uploading an SCB zip and credentials JSON.
- "Test" button stub for validating connectivity.
- Credentials stored securely using the operating system keychain via [`keytar`](https://github.com/atom/node-keytar).
- Dark mode persisted between sessions and toggled via a hamburger menu.
- UI built from reusable Vue components.

## Development

```bash
npm install
npm start
```

Live reload (no manual restarts)
- The app auto-reloads on file changes in development via `electron-reload`.
- Just run `npm start` once and edit files like `components/*.vue`, `renderer.js`, `styles.css`, `main.js`.
- Changes to renderer files reload the window; changes to main/preload restart Electron.

## Testing

```bash
npm test
```
