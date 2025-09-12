// Load Vue and the SFC loader from local node_modules to avoid external CDNs
import * as Vue from './node_modules/vue/dist/vue.esm-browser.prod.js';
import { loadModule } from './node_modules/vue3-sfc-loader/dist/vue3-sfc-loader.esm.js';

const options = {
  moduleCache: { vue: Vue },
  getFile(url) {
    return fetch(url).then(r => r.text());
  },
  addStyle(styleStr) {
    const style = document.createElement('style');
    style.textContent = styleStr;
    document.head.appendChild(style);
  }
};

const [DatabaseList, AddDatabaseModal, HamburgerMenu, DbExplorer, CqlConsole] = await Promise.all([
  loadModule('./components/DatabaseList.vue', options),
  loadModule('./components/AddDatabaseModal.vue', options),
  loadModule('./components/HamburgerMenu.vue', options),
  loadModule('./components/DbExplorer.vue', options),
  loadModule('./components/CqlConsole.vue', options)
]);

const { createApp } = Vue;

const app = createApp({
  data() {
    return {
      databases: [],
      showModal: false,
      // Default to dark mode on first run to match Astra style
      darkMode: (() => {
        const stored = localStorage.getItem('darkMode');
        return stored ? stored === 'true' : true;
      })(),
      title: 'Astra DBs',
      view: 'home',
      currentDb: null
    };
  },
  mounted() {
    if (this.darkMode) {
      document.body.classList.add('dark');
    }
    // Load persisted databases
    if (window?.electronAPI?.getDatabases) {
      window.electronAPI.getDatabases().then((res) => {
        if (res?.success && Array.isArray(res.databases)) {
          this.databases = res.databases.map(d => ({ name: d.name, slug: d.slug }));
        }
      }).catch(() => {});
    }
  },
  methods: {
    openModal() { this.showModal = true; },
    closeModal() { this.showModal = false; },
    async addDatabase({ scbFile, credsFile }, name) {
      const preferred = (name && String(name).trim()) || '';
      const res = await window.electronAPI.saveDatabase(preferred, scbFile.path, credsFile.path);
      const saved = res?.db || { name: preferred || 'Database' };
      this.databases.push({ name: saved.name, slug: saved.slug });
      this.title = `Astra DBs — ${saved.name}`;
      try { document.title = `Astra DB Manager — ${saved.name}`; } catch (_) {}
      this.closeModal();
    },
    exploreDb(db) {
      this.currentDb = db;
      this.view = 'explorer';
    },
    async deleteDatabase(db) {
      try {
        if (!db?.slug) return;
        const ok = confirm(`Remove saved database "${db.name}" from this app?`);
        if (!ok) return;
        const res = await window.electronAPI.deleteDatabase(db.slug);
        if (res?.success) {
          this.databases = this.databases.filter(d => d.slug !== db.slug);
          if (this.currentDb && this.currentDb.slug === db.slug) {
            this.backHome();
          }
        } else if (res && res.message) {
          alert(`Delete failed: ${res.message}`);
        }
      } catch (e) {
        alert('Delete failed');
      }
    },
    backHome() {
      this.view = 'home';
      this.currentDb = null;
    },
    async testConnection({ scbFile, credsFile }) {
      const result = await window.electronAPI.testConnection(scbFile.path, credsFile.path);
      alert(result.success ? 'Connection succeeded' : 'Connection failed');
    },
    toggleDarkMode() {
      this.darkMode = !this.darkMode;
      document.body.classList.toggle('dark', this.darkMode);
      localStorage.setItem('darkMode', this.darkMode);
    }
  }
});

app.component('database-list', DatabaseList);
app.component('add-database-modal', AddDatabaseModal);
app.component('hamburger-menu', HamburgerMenu);
app.component('db-explorer', DbExplorer);
app.component('cql-console', CqlConsole);

app.mount('#app');
