const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const keytar = require('keytar');
const yauzl = require('yauzl');
let cassandra; // Lazy require to avoid overhead if not testing

// Auto-reload in development to avoid restarting manually
if (process.env.NODE_ENV !== 'production') {
  try {
    require('electron-reload')(__dirname, {
      electron: require('electron'),
      awaitWriteFinish: true
    });
  } catch (_) {
    // ignore if not available
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('save-db', async (event, { name, scbPath, credsPath }) => {
  try {
    const creds = await fs.promises.readFile(credsPath, 'utf8');
    // Decide on a durable, user-friendly name from SCB if not provided
    const effectiveName = (name && String(name).trim()) || await deriveDbNameFromScb(scbPath);
    // Store credentials securely in the OS keychain under the database name
    await keytar.setPassword('astra-db-manager', effectiveName, creds);
    // Persist DB metadata and copy SCB into app data
    const db = await persistDatabase(effectiveName, scbPath);
    return { success: true, db };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('test-connection', async (event, { scbPath, credsPath }) => {
  try {
    // Validate SCB file
    if (!scbPath) throw new Error('Missing Secure Connect Bundle path');
    const scbStat = await fs.promises.stat(scbPath);
    if (!scbStat.isFile()) throw new Error('Secure Connect Bundle is not a file');
    const scbFd = await fs.promises.open(scbPath, 'r');
    const buf = Buffer.alloc(4);
    await scbFd.read(buf, 0, 4, 0);
    await scbFd.close();
    const isZip = buf[0] === 0x50 && buf[1] === 0x4B; // 'PK'
    if (!isZip) throw new Error('Secure Connect Bundle does not look like a valid .zip');

    // Inspect SCB contents to ensure required files exist
    const entries = await listZipEntries(scbPath);
    const filesOnly = Array.from(entries).filter(n => !n.endsWith('/'));
    const bases = new Set(filesOnly.map(n => n.split('/').pop()));
    const required = ['cert.pfx','cqlshrc','config.json','trustStore.jks','identity.jks','cert','key','ca.crt'];
    const missing = required.filter(name => !bases.has(name));
    if (missing.length) {
      throw new Error(`Secure Connect Bundle missing required files: ${missing.join(', ')}`);
    }

    // Validate credentials JSON
    if (!credsPath) throw new Error('Missing credentials JSON path');
    const credsRaw = await fs.promises.readFile(credsPath, 'utf8');
    let creds;
    try { creds = JSON.parse(credsRaw); } catch {
      throw new Error('Credentials file is not valid JSON');
    }
    const keys = Object.keys(creds || {});
    const hasClientId = keys.includes('clientId') || keys.includes('clientID');
    const hasSecret = keys.includes('clientSecret') || keys.includes('secret');
    const hasToken = keys.includes('token') || keys.includes('tokenJwt');
    const missingFields = [];
    if (!hasClientId) missingFields.push('clientId');
    if (!hasSecret) missingFields.push('secret');
    if (!hasToken) missingFields.push('token');
    if (missingFields.length) {
      throw new Error(`Credentials JSON missing required fields: ${missingFields.join(', ')}`);
    }

    // Attempt a real connectivity check if a token is available
    if (hasToken) {
      try {
        if (!cassandra) cassandra = require('cassandra-driver');
        const token = creds.token || creds.tokenJwt;
        const client = new cassandra.Client({
          cloud: { secureConnectBundle: scbPath },
          credentials: { username: 'token', password: token }
        });
        // Run a lightweight query with a timeout
        const timeoutMs = 8000;
        const result = await withTimeout(
          (async () => {
            await client.connect();
            const rs = await client.execute('SELECT release_version FROM system.local');
            await client.shutdown();
            return rs?.rowLength ? 'Connected' : 'Connected (no rows)';
          })(),
          timeoutMs,
          'Connectivity check timed out'
        );
        return { success: true, message: `${result}. SCB and credentials validated.` };
      } catch (e) {
        // Do not leak secrets in error messages
        return { success: false, message: `Connectivity failed: ${e.message || e}` };
      }
    }

    // Fall back: structural validation only (no token present)
    return { success: true, message: 'Files look valid. Provide a token to run a live connectivity check.' };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// Return the list of files inside the Secure Connect Bundle (zip)
ipcMain.handle('scb-entries', async (event, scbPath) => {
  try {
    if (!scbPath) throw new Error('Missing Secure Connect Bundle path');
    const names = await listZipEntries(scbPath);
    return { success: true, entries: Array.from(names) };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('scb-entries-data', async (event, arrayBuffer) => {
  try {
    if (!arrayBuffer) throw new Error('Missing SCB data');
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    const names = await listZipEntriesFromBuffer(buffer);
    return { success: true, entries: Array.from(names) };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// Return parsed config.json contents from SCB (path)
ipcMain.handle('scb-config', async (event, scbPath) => {
  try {
    if (!scbPath) throw new Error('Missing Secure Connect Bundle path');
    const txt = await readZipEntryText(scbPath, /(^|\/)config\.json$/i);
    if (!txt) return { success: false, message: 'config.json not found' };
    const json = JSON.parse(txt);
    return { success: true, config: json };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// Return parsed config.json contents from SCB (ArrayBuffer)
ipcMain.handle('scb-config-data', async (event, arrayBuffer) => {
  try {
    if (!arrayBuffer) throw new Error('Missing SCB data');
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    const txt = await readZipEntryTextFromBuffer(buffer, /(^|\/)config\.json$/i);
    if (!txt) return { success: false, message: 'config.json not found' };
    const json = JSON.parse(txt);
    return { success: true, config: json };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

function listZipEntries(zipPath) {
  return new Promise((resolve, reject) => {
    const names = new Set();
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        names.add(entry.fileName);
        zipfile.readEntry();
      });
      zipfile.on('end', () => resolve(names));
      zipfile.on('error', reject);
    });
  });
}

function listZipEntriesFromBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const names = new Set();
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        names.add(entry.fileName);
        zipfile.readEntry();
      });
      zipfile.on('end', () => resolve(names));
      zipfile.on('error', reject);
    });
  });
}

function readZipEntryText(zipPath, nameMatcher) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      let done = false;
      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        if (done) return;
        if (nameMatcher.test(entry.fileName)) {
          zipfile.openReadStream(entry, (err2, stream) => {
            if (err2) { zipfile.close(); return reject(err2); }
            const chunks = [];
            stream.on('data', (c) => chunks.push(c));
            stream.on('end', () => {
              done = true;
              zipfile.close();
              resolve(Buffer.concat(chunks).toString('utf8'));
            });
          });
        } else {
          zipfile.readEntry();
        }
      });
      zipfile.on('end', () => { if (!done) resolve(null); });
      zipfile.on('error', reject);
    });
  });
}

function readZipEntryTextFromBuffer(buffer, nameMatcher) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      let done = false;
      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        if (done) return;
        if (nameMatcher.test(entry.fileName)) {
          zipfile.openReadStream(entry, (err2, stream) => {
            if (err2) { zipfile.close(); return reject(err2); }
            const chunks = [];
            stream.on('data', (c) => chunks.push(c));
            stream.on('end', () => {
              done = true;
              zipfile.close();
              resolve(Buffer.concat(chunks).toString('utf8'));
            });
          });
        } else {
          zipfile.readEntry();
        }
      });
      zipfile.on('end', () => { if (!done) resolve(null); });
      zipfile.on('error', reject);
    });
  });
}

function withTimeout(promise, ms, msg) {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error(msg)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(t)), timeout]);
}
ipcMain.handle('get-databases', async () => {
  try {
    const list = await readDbIndex();
    return { success: true, databases: list };
  } catch (e) {
    return { success: false, message: e.message, databases: [] };
  }
});

// Delete a saved database (app-local only)
ipcMain.handle('delete-db', async (event, { slug }) => {
  try {
    if (!slug) throw new Error('Missing database slug');
    const list = await readDbIndex();
    const entry = list.find(e => e.slug === slug);
    if (!entry) {
      // Nothing to delete; treat as success
      return { success: true };
    }
    // Remove stored credentials from keychain
    try { await keytar.deletePassword('astra-db-manager', entry.name); } catch (_) {}
    // Remove on-disk files for this DB
    const dir = path.dirname(entry.scbPath);
    try { await fs.promises.rm(dir, { recursive: true, force: true }); } catch (_) {}
    // Update index
    const remaining = list.filter(e => e.slug !== slug);
    await writeDbIndex(remaining);
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    || `db-${Date.now()}`;
}

async function persistDatabase(name, sourceScbPath) {
  const userDir = app.getPath('userData');
  const dbDir = path.join(userDir, 'databases');
  await fs.promises.mkdir(dbDir, { recursive: true });
  const slug = slugify(name);
  const targetDir = path.join(dbDir, slug);
  await fs.promises.mkdir(targetDir, { recursive: true });
  const targetScb = path.join(targetDir, 'secure-connect.zip');
  await fs.promises.copyFile(sourceScbPath, targetScb);
  const keyspaceName = await deriveKeyspaceFromScb(targetScb);
  const entry = { name, slug, scbPath: targetScb, keyspaceName, createdAt: Date.now() };
  const list = await readDbIndex();
  const without = list.filter(e => e.slug !== slug);
  without.push(entry);
  await writeDbIndex(without);
  return entry;
}

function dbIndexPath() {
  const userDir = app.getPath('userData');
  const dbDir = path.join(userDir, 'databases');
  return path.join(dbDir, 'dbs.json');
}

async function readDbIndex() {
  const idx = dbIndexPath();
  try {
    const data = await fs.promises.readFile(idx, 'utf8');
    return JSON.parse(data);
  } catch (_) {
    return [];
  }
}

async function writeDbIndex(list) {
  const idx = dbIndexPath();
  await fs.promises.mkdir(path.dirname(idx), { recursive: true });
  await fs.promises.writeFile(idx, JSON.stringify(list, null, 2), 'utf8');
}

async function deriveDbNameFromScb(scbPath) {
  try {
    const txt = await readZipEntryText(scbPath, /(^|\/)config\.json$/i);
    if (txt) {
      try {
        const cfg = JSON.parse(txt);
        const candidates = [
          cfg.database_name,
          cfg.databaseName,
          cfg.db,
          cfg.keyspace,
          cfg.name,
          cfg.cluster_name
        ];
        const val = candidates.find(v => typeof v === 'string' && v.trim().length > 0);
        if (val) return String(val).trim();
      } catch (_) { /* ignore */ }
    }
  } catch (_) { /* ignore */ }
  // Fallback: derive from filename
  const base = path.basename(scbPath).replace(/\.zip$/i, '');
  return base
    .replace(/^secure-connect-?/i, '')
    .replace(/-bundle$/i, '')
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    || 'database';
}

async function deriveKeyspaceFromScb(scbPath) {
  try {
    const txt = await readZipEntryText(scbPath, /(^|\/)config\.json$/i);
    if (txt) {
      const cfg = JSON.parse(txt);
      const candidates = [
        cfg.keyspace,
        Array.isArray(cfg.keyspaces) ? cfg.keyspaces[0] : undefined,
        cfg?.connection_info?.keyspace
      ];
      const val = candidates.find(v => typeof v === 'string' && v.trim().length > 0);
      return val ? String(val).trim() : '';
    }
  } catch (_) {}
  return '';
}

function getTokenFromCreds(creds) {
  return creds.token || creds.tokenJwt;
}

function mapLikeKeys(obj) {
  if (!obj) return [];
  if (obj instanceof Map) return Array.from(obj.keys());
  if (Array.isArray(obj)) return obj.map(v => v && (v.name || v.table_name)).filter(Boolean);
  if (typeof obj === 'object') return Object.keys(obj);
  return [];
}

function mapLikeGet(obj, key) {
  if (!obj || !key) return null;
  const k = String(key);
  if (obj instanceof Map) return obj.get(k) ?? obj.get(k.toLowerCase());
  if (Array.isArray(obj)) return obj.find(v => (v?.name === k) || (v?.name && v.name.toLowerCase() === k.toLowerCase()));
  if (typeof obj === 'object') return obj[k] ?? obj[k.toLowerCase()] ?? null;
  return null;
}

async function connectFor(slug) {
  const list = await readDbIndex();
  const entry = list.find(e => e.slug === slug);
  if (!entry) throw new Error('Database not found');
  const credsStr = await keytar.getPassword('astra-db-manager', entry.name);
  if (!credsStr) throw new Error('Credentials not found');
  let creds;
  try { creds = JSON.parse(credsStr); } catch { throw new Error('Stored credentials invalid'); }
  const token = getTokenFromCreds(creds);
  if (!token) throw new Error('Token missing in credentials');
  if (!cassandra) cassandra = require('cassandra-driver');
  const client = new cassandra.Client({
    cloud: { secureConnectBundle: entry.scbPath },
    credentials: { username: 'token', password: token }
  });
  return { client, entry };
}

ipcMain.handle('db-schema', async (event, { slug }) => {
  const { client, entry } = await connectFor(slug);
  try {
    await client.connect();
    const keyspace = entry.keyspaceName || client.keyspace || (await deriveKeyspaceFromScb(entry.scbPath));
    if (!keyspace) throw new Error('Keyspace not found in SCB');
    const ks = await getKeyspaceMeta(client.metadata, keyspace);
    if (!ks) throw new Error(`Keyspace not found: ${keyspace}`);
    const tables = mapLikeKeys(ks.tables).sort();
    const types = mapLikeKeys(ks.udts).sort();
    return { success: true, keyspace, tables, types };
  } catch (e) {
    return { success: false, message: e.message };
  } finally {
    await client.shutdown().catch(() => {});
  }
});

ipcMain.handle('describe-table', async (event, { slug, table }) => {
  const { client, entry } = await connectFor(slug);
  try {
    await client.connect();
    const keyspace = entry.keyspaceName || client.keyspace || (await deriveKeyspaceFromScb(entry.scbPath));
    const ks = await getKeyspaceMeta(client.metadata, keyspace);
    const tm = ks && ks.tables ? mapLikeGet(ks.tables, table) : null;
    if (!tm) throw new Error(`Table not found: ${keyspace}.${table}`);
    const ddl = renderCreateTable(keyspace, tm);
    return { success: true, createCql: ddl };
  } catch (e) {
    return { success: false, message: e.message };
  } finally {
    await client.shutdown().catch(() => {});
  }
});

ipcMain.handle('describe-type', async (event, { slug, type }) => {
  const { client, entry } = await connectFor(slug);
  try {
    await client.connect();
    const keyspace = entry.keyspaceName || client.keyspace || (await deriveKeyspaceFromScb(entry.scbPath));
    const ks = await getKeyspaceMeta(client.metadata, keyspace);
    const udt = ks && ks.udts ? mapLikeGet(ks.udts, type) : null;
    if (!udt) throw new Error(`Type not found: ${keyspace}.${type}`);
    const ddl = renderCreateType(keyspace, udt);
    return { success: true, createCql: ddl };
  } catch (e) {
    return { success: false, message: e.message };
  } finally {
    await client.shutdown().catch(() => {});
  }
});

function getKeyspaceMeta(metadata, keyspace) {
  if (!metadata) return null;
  try {
    if (typeof metadata.getKeyspace === 'function') {
      return metadata.getKeyspace(keyspace);
    }
  } catch (_) {}
  const ks = metadata.keyspaces;
  if (ks instanceof Map) return ks.get(keyspace);
  if (ks && typeof ks === 'object') return ks[keyspace] || (typeof ks.get === 'function' ? ks.get(keyspace) : null);
  return null;
}

function renderCreateTable(keyspace, tm) {
  const cols = Array.from(tm.columns.values()).map(c => `  ${c.name} ${c.type}`);
  const pks = tm.partitionKeys.map(c => c.name);
  const cks = tm.clusteringKeys.map(c => c.name);
  const pk = pks.length > 1 ? `(${pks.join(', ')})` : pks[0];
  const ckPart = cks.length ? `, ${cks.join(', ')}` : '';
  const primary = `  PRIMARY KEY (${pk}${ckPart})`;
  const lines = [...cols, primary].join(',\n');
  return `CREATE TABLE ${keyspace}.${tm.name} (\n${lines}\n);`;
}

function renderCreateType(keyspace, udt) {
  const fields = udt.fields.map(f => `  ${f.name} ${f.type}`);
  return `CREATE TYPE ${keyspace}.${udt.name} (\n${fields.join(',\n')}\n);`;
}
