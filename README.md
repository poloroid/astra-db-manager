# Astra DB Manager

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

## Testing

```bash
npm test
```
