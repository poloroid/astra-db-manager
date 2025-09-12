<template>
  <div class="modal">
    <div class="modal-content">
      <h2>Add Database</h2>

      <div class="notice warn" role="note">
        Security: credentials are never stored in plain text. They are saved in your operating system keychain via Keytar (Keychain on macOS, Credential Manager on Windows, Secret Service on Linux).
      </div>

      <!-- Hidden per-file pickers for Change actions -->
      <input ref="scbInput" class="file-input-hidden" type="file" accept=".zip" @change="onScbChange" aria-hidden="true" />
      <input ref="credsInput" class="file-input-hidden" type="file" accept=".json,application/json" @change="onCredsChange" aria-hidden="true" />

      <p class="hint">Upload the Secure Connect Bundle (.zip) and the Credentials JSON from Astra.</p>

      <!-- Name is derived automatically from SCB; no manual input to keep it simple. -->

      <!-- Combined drop zone: users can drop both files at once -->
      <div
        class="dropzone combo"
        :class="{ over: bothOver }"
        role="button"
        tabindex="0"
        aria-label="Drop both files here (.zip and .json) or click to browse"
        @click.stop="openBothPicker"
        @keydown.enter.prevent.stop="openBothPicker"
        @keydown.space.prevent.stop="openBothPicker"
        @dragover.prevent.stop="bothOver = true"
        @dragleave.stop="bothOver = false"
        @drop.prevent.stop="onBothDrop"
      >
        <input ref="bothInput" class="file-input-hidden" type="file" multiple accept=".zip,.json,application/json" @change="onBothChange" />
        <svg class="dz-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 14a4 4 0 0 1 1-7.874 5 5 0 0 1 9.799-1.07A4.5 4.5 0 1 1 18.5 14H15l-3-3-3 3H6z" fill="currentColor"/>
        </svg>
        <div class="dz-lines">
          <div class="dz-primary">Drop both files here</div>
          <div class="dz-secondary">or <span class="link" @click.stop="openBothPicker">click to browse</span></div>
        </div>
      </div>

      <!-- Summary and quick actions -->
      <div class="file-summary">
        <div class="file-row">
          <div class="file-label">SCB</div>
          <div class="file-info" :class="{ err: !!scbError }">{{ scbFile ? scbInfo : 'Not selected' }}</div>
          <div class="file-actions">
            <span v-if="scbFile" class="link" @click.stop="openScbPicker">Change</span>
            <span v-if="scbFile" class="sep">•</span>
            <span v-if="scbFile" class="link" @click.stop="clearScb">Remove</span>
          </div>
        </div>
        <div v-if="scbLoading" class="file-sub"><span class="spinner tiny" aria-hidden="true"></span> Discovering files…</div>
        <div v-else-if="scbEntries.length" class="file-sub">
          <span :class="['req-summary', scbAllOk ? 'ok' : 'bad']">
            <svg class="icon" viewBox="0 0 20 20" aria-hidden="true">
              <path v-if="scbAllOk" d="M7.5 13.5l-3-3 1.4-1.4 1.6 1.6 5-5 1.4 1.4-6.4 6.4z" fill="currentColor" />
              <path v-else d="M5 5 L15 15 M15 5 L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            {{ scbAllOk ? 'All required files found' : 'Missing required files' }}
          </span>
          <span class="sep">•</span>
          <span class="link" @click.stop="scbExpanded = !scbExpanded">{{ scbExpanded ? 'Hide details' : 'Show details' }}</span>
          <div v-if="scbExpanded" class="req-list">
            <div v-for="req in scbRequired" :key="req.name" class="req-item">
              <span :class="['badge', req.present ? 'ok' : 'bad']"></span>
              <code class="mono">{{ req.name }}</code>
            </div>
          </div>
        </div>
        <small v-if="scbError" class="hint err">{{ scbError }}</small>

        <div class="file-row">
          <div class="file-label">Credentials</div>
          <div class="file-info" :class="{ err: !!credsError }">{{ credsFile ? credsInfo : 'Not selected' }}</div>
          <div class="file-actions">
            <span v-if="credsFile" class="link" @click.stop="openCredsPicker">Change</span>
            <span v-if="credsFile" class="sep">•</span>
            <span v-if="credsFile" class="link" @click.stop="clearCreds">Remove</span>
          </div>
        </div>
        <div v-if="credsJson || credsError" class="file-sub">
          <span :class="['req-summary', credsAllOk && !credsError ? 'ok' : 'bad']">
            <svg class="icon" viewBox="0 0 20 20" aria-hidden="true">
              <path v-if="credsAllOk && !credsError" d="M7.5 13.5l-3-3 1.4-1.4 1.6 1.6 5-5 1.4 1.4-6.4 6.4z" fill="currentColor" />
              <path v-else d="M5 5 L15 15 M15 5 L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            {{ credsError ? 'Invalid JSON' : (credsAllOk ? 'All required fields found' : 'Missing required fields') }}
          </span>
          <span class="sep">•</span>
          <span class="link" @click.stop="credsExpanded = !credsExpanded">{{ credsExpanded ? 'Hide details' : 'Show details' }}</span>
          <div v-if="credsExpanded" class="req-list">
            <div v-for="req in credsRequired" :key="req.name" class="req-item">
              <span :class="['badge', req.present ? 'ok' : 'bad']"></span>
              <code class="mono">{{ req.name }}</code>
            </div>
          </div>
        </div>
        <small v-if="credsError" class="hint err">{{ credsError }}</small>
      </div>

      <div class="actions">
        <button @click="onTestAndSave" :disabled="actionsDisabled">
          <span v-if="isTesting || isSaving" class="spinner" aria-hidden="true"></span>
          {{ actionLabel }}
        </button>
        <button @click="$emit('close')">Cancel</button>
      </div>
      <p v-if="status.message" :class="['hint', statusClass]" role="status" aria-live="polite">{{ status.message }}</p>
    </div>
  </div>
</template>
<script>
export default {
  emits: ['save', 'test', 'close'],
  data() {
    return {
      scbFile: null,
      credsFile: null,
      status: { success: false, message: '' },
      isTesting: false,
      isSaving: false,
      dbName: '',
      scbError: '',
      scbLoading: false,
      credsError: '',
      credsJson: null,
      credsExpanded: false,
      scbOver: false,
      credsOver: false,
      bothOver: false,
      scbEntries: [],
      scbExpanded: false
    };
  },
  computed: {
    ready() { return !!(this.scbFile && this.credsFile); },
    scbValid() { return !!this.scbFile && !this.scbError; },
    credsValid() { return !!this.credsFile && !this.credsError; },
    actionsDisabled() {
      const basic = !this.ready || !this.scbValid || !this.credsValid || this.isTesting || this.scbLoading;
      if (!this.scbFile) return basic;
      return basic || !this.scbAllOk || !this.credsAllOk;
    },
    scbHint() { return this.scbFile ? (this.scbFile.name || this.scbFile.path) : 'Choose the SCB zip file'; },
    credsHint() { return this.credsFile ? (this.credsFile.name || this.credsFile.path) : 'Choose the credentials JSON'; },
    scbInfo() { return this.scbFile ? `${this.scbFile.name || this.scbFile.path} (${this.formatBytes(this.scbFile.size)})` : ''; },
    credsInfo() { return this.credsFile ? `${this.credsFile.name || this.credsFile.path} (${this.formatBytes(this.credsFile.size)})` : ''; },
    statusClass() { return this.status.success ? 'ok' : 'err'; },
    actionLabel() { return this.isTesting ? 'Testing…' : (this.isSaving ? 'Saving…' : 'Test and Save'); }
    ,
    scbRequired() {
      const base = this.scbFilesAll || [];
      const req = ['cert.pfx','cqlshrc','config.json','trustStore.jks','identity.jks','cert','key','ca.crt'];
      return req.map(name => ({ name, present: base.includes(name) }));
    },
    scbAllOk() {
      return this.scbRequired.every(r => r.present);
    },
    credsRequired() {
      const j = this.credsJson || {};
      const hasId = typeof j.clientId === 'string' || typeof j.clientID === 'string';
      const hasSecret = typeof j.clientSecret === 'string' || typeof j.secret === 'string';
      const hasToken = typeof j.token === 'string' || typeof j.tokenJwt === 'string';
      return [
        { name: 'clientId', present: hasId },
        { name: 'secret', present: hasSecret },
        { name: 'token', present: hasToken }
      ];
    },
    credsAllOk() {
      return this.credsRequired.every(r => r.present);
    }
  },
  methods: {
    openBothPicker() { this.$refs.bothInput && this.$refs.bothInput.click(); },
    onBothChange(e) { const list = e.target.files; if (list && list.length) this.setBothFilesFromList(Array.from(list)); },
    onBothDrop(e) { this.bothOver = false; const list = e.dataTransfer.files; if (list && list.length) this.setBothFilesFromList(Array.from(list)); },
    setBothFilesFromList(files) {
      const zip = files.find(f => /\.zip$/i.test(f.name) || (f.type === 'application/zip'));
      const json = files.find(f => /\.json$/i.test(f.name) || /json/.test(f.type || ''));
      if (zip) this.setScbFile(zip);
      if (json) this.setCredsFile(json);
      if (!zip || !json) {
        this.status = { success: false, message: 'Please provide both a .zip and a .json file.' };
      }
    },
    clearScb() { this.scbFile = null; this.scbError = ''; this.scbEntries = []; this.scbFilesAll = []; this.scbPreview = []; this.status = { success: false, message: '' }; },
    clearCreds() { this.credsFile = null; this.credsError = ''; this.status = { success: false, message: '' }; },
    openScbPicker() { this.$refs.scbInput && this.$refs.scbInput.click(); },
    openCredsPicker() { this.$refs.credsInput && this.$refs.credsInput.click(); },
    onScbChange(e) {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      this.setScbFile(f);
    },
    onCredsChange(e) {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      this.setCredsFile(f);
    },
    onScbDrop(e) {
      this.scbOver = false;
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) this.setScbFile(f);
    },
    onCredsDrop(e) {
      this.credsOver = false;
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) this.setCredsFile(f);
    },
    async setScbFile(file) {
      this.scbError = '';
      if (!/\.zip$/i.test(file.name) && file.type !== 'application/zip') {
        this.scbError = 'File must be a .zip';
      } else if (file.size > 50 * 1024 * 1024) {
        this.scbError = 'File is too large (> 50 MB)';
      }
      this.scbFile = file;
      this.status = { success: false, message: '' };
      this.scbEntries = [];
      this.scbFilesAll = [];
      this.scbPreview = [];
      this.scbLoading = true;
      try {
        if (this.scbError) return;
        if (this.scbFile?.path && window?.electronAPI?.listScbEntries) {
          const res = await window.electronAPI.listScbEntries(this.scbFile.path);
          if (res?.success && Array.isArray(res.entries)) {
            const files = res.entries.filter((n) => !n.endsWith('/'));
            const bases = Array.from(new Set(files.map(n => n.split('/').pop())));
            this.scbFilesAll = bases;
            this.scbPreview = bases.slice(0, 6);
            this.scbEntries = this.scbPreview;
            // Try to get database name from config.json
            if ((!this.dbName) && window?.electronAPI?.getScbConfig) {
              const cfgRes = await window.electronAPI.getScbConfig(this.scbFile.path);
              if (cfgRes?.success && cfgRes.config) {
                const guess = this.deriveDbName(cfgRes.config) || this.deriveDbNameFromFilename(this.scbFile.name || this.scbFile.path);
                if (guess) this.dbName = guess;
              }
            } else if (!this.dbName) {
              const guess = this.deriveDbNameFromFilename(this.scbFile.name || this.scbFile.path);
              if (guess) this.dbName = guess;
            }
            return;
          }
        }
        if (window?.electronAPI?.listScbEntriesFromData && this.scbFile?.arrayBuffer) {
          const ab = await this.scbFile.arrayBuffer();
          const res2 = await window.electronAPI.listScbEntriesFromData(ab);
          if (res2?.success && Array.isArray(res2.entries)) {
            const files = res2.entries.filter((n) => !n.endsWith('/'));
            const bases = Array.from(new Set(files.map(n => n.split('/').pop())));
            this.scbFilesAll = bases;
            this.scbPreview = bases.slice(0, 6);
            this.scbEntries = this.scbPreview;
            // Try to get database name from config.json in buffer
            if ((!this.dbName) && window?.electronAPI?.getScbConfigFromData) {
              const cfgRes2 = await window.electronAPI.getScbConfigFromData(ab);
              if (cfgRes2?.success && cfgRes2.config) {
                const guess = this.deriveDbName(cfgRes2.config) || this.deriveDbNameFromFilename(this.scbFile.name || '');
                if (guess) this.dbName = guess;
              }
            } else if (!this.dbName) {
              const guess = this.deriveDbNameFromFilename(this.scbFile.name || '');
              if (guess) this.dbName = guess;
            }
          }
        }
      } catch (_) { /* ignore */ }
      finally { this.scbLoading = false; }
    },
    deriveDbName(cfg) {
      if (!cfg || typeof cfg !== 'object') return '';
      const candidates = [cfg.database_name, cfg.databaseName, cfg.db, cfg.keyspace, cfg.name, cfg.cluster_name];
      const val = candidates.find(v => typeof v === 'string' && v.trim().length > 0);
      return val ? String(val).trim() : '';
    },
    deriveDbNameFromFilename(name) {
      if (!name) return '';
      let base = name.split(/[\\/]/).pop() || name;
      base = base.replace(/\.zip$/i, '');
      base = base.replace(/^secure-connect-?/i, '');
      base = base.replace(/-bundle$/i, '');
      base = base.replace(/_/g, '-');
      base = base.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '');
      return base || '';
    },
    setCredsFile(file) {
      this.credsError = '';
      if (!/\.json$/i.test(file.name) && !/json/.test(file.type || '')) {
        this.credsError = 'File must be a .json';
      } else if (file.size > 1 * 1024 * 1024) {
        this.credsError = 'File is too large (> 1 MB)';
      }
      this.credsFile = file;
      this.status = { success: false, message: '' };
      this.credsJson = null;
      if (!this.credsError && this.credsFile?.text) {
        this.credsFile.text().then(txt => {
          try {
            const obj = JSON.parse(txt);
            // Only keep minimal keys to avoid accidental exposure in dev tools
            const safe = {
              clientId: obj.clientId || obj.clientID,
              clientSecret: obj.clientSecret || obj.secret,
              token: obj.token || obj.tokenJwt
            };
            this.credsJson = safe;
          } catch (e) {
            this.credsError = 'Invalid JSON format';
          }
        }).catch(() => {
          this.credsError = 'Unable to read file';
        });
      }
    },
    formatBytes(bytes) {
      if (!bytes && bytes !== 0) return '';
      const units = ['B', 'KB', 'MB', 'GB'];
      let v = bytes;
      let i = 0;
      while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
      return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
    },
    onSave() {
      if (!this.scbFile || !this.credsFile) { alert('Select both files'); return; }
      this.$emit('save', { scbFile: this.scbFile, credsFile: this.credsFile }, this.dbName);
    },
    async onTest() {
      if (!this.scbFile || !this.credsFile) { alert('Select both files'); return; }
      this.$emit('test', { scbFile: this.scbFile, credsFile: this.credsFile });
      try {
        this.isTesting = true;
        this.status = { success: false, message: 'Testing…' };
        const result = await window.electronAPI.testConnection(this.scbFile.path, this.credsFile.path);
        this.status = { success: !!result.success, message: result.message || (result.success ? 'OK' : 'Failed') };
      } catch (e) {
        this.status = { success: false, message: e?.message || 'Test failed' };
      } finally {
        this.isTesting = false;
      }
    }
    ,
    async onTestAndSave() {
      if (!this.scbFile || !this.credsFile) { this.status = { success: false, message: 'Select both files' }; return; }
      await this.onTest();
      if (this.status.success) {
        this.isSaving = true;
        try { this.onSave(); }
        finally { /* parent likely closes modal; leave isSaving true until unmount */ }
      }
    }
  }
};
</script>
