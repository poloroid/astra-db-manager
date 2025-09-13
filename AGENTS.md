# Repository Guidelines

## Project Structure & Module Organization
- `main.js` (Electron main process), `preload.js` (safe IPC bridge), `index.html` + `renderer.js` (Vue app in renderer), `styles.css`.
- `components/` Vue SFCs (PascalCase, one component per file).
- `tests/` Vitest specs (unit tests for components and logic).
- `rebuild-keytar.js` helper for native module troubleshooting.

## Build, Test, and Development Commands
- `npm install` — install dependencies.
- `npm start` — launch the Electron app locally.
- `npm test` — run Vitest in `jsdom` with Vue Test Utils.

Lockfile policy
- Always run `npm install` after changing `package.json` to update `package-lock.json`.
- Commit `package-lock.json` with the same change (CI uses `npm ci` and will fail if out of sync).
- Use Conventional Commit scope `chore(lock): ...` when committing lockfile-only updates.

Notes
- The renderer loads Vue SFCs via `vue3-sfc-loader` at runtime; no bundler is required for development.
- IPC is exposed via `window.electronAPI` from `preload.js`. Prefer this bridge for renderer↔main communication.

## Coding Style & Naming Conventions
- JavaScript: 2‑space indentation, single quotes, and semicolons; camelCase for variables/functions.
- Vue SFCs: PascalCase filenames (e.g., `AddDatabaseModal.vue`), props in kebab-case when used in templates.
- Keep modules small and focused; avoid adding global state. No linter is configured—match the existing style.

## Testing Guidelines
- Frameworks: Vitest + @vue/test-utils (`jsdom`).
- Location: place specs in `tests/` with the suffix `.spec.js` (e.g., `components.spec.js`).
- Scope: test component rendering, emitted events, and basic interaction; mock `window.electronAPI` and global `alert` as needed.
- Run tests via `npm test`.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`, etc. Keep messages imperative and scoped.
- PRs must include: concise description, linked issue (if any), steps to validate, and screenshots/gifs for UI changes.
- Keep diffs minimal and focused; note any security-impacting changes (IPC, file access, credential handling).

## Security & Configuration Tips
- Never commit secrets (SCB zips, credentials JSON). Use local files and store secrets via `keytar` only.
- Do not log sensitive data; prefer structured error messages without tokens.
- If `keytar` fails to load on your platform: delete `node_modules` and `package-lock.json`, run `npm install`, then `npm start`. See `rebuild-keytar.js` for additional steps/troubleshooting hints.
