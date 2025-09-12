import * as Vue from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';
import { loadModule } from 'https://unpkg.com/vue3-sfc-loader';

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

const [DatabaseList, AddDatabaseModal, HamburgerMenu] = await Promise.all([
  loadModule('./components/DatabaseList.vue', options),
  loadModule('./components/AddDatabaseModal.vue', options),
  loadModule('./components/HamburgerMenu.vue', options)
]);

const { createApp } = Vue;

const app = createApp({
  data() {
    return {
      databases: [],
      showModal: false,
      darkMode: localStorage.getItem('darkMode') === 'true'
    };
  },
  mounted() {
    if (this.darkMode) {
      document.body.classList.add('dark');
    }
  },
  methods: {
    openModal() { this.showModal = true; },
    closeModal() { this.showModal = false; },
    async addDatabase({ scbFile, credsFile }) {
      const name = prompt('Database name');
      if (!name) return;
      await window.electronAPI.saveDatabase(name, scbFile.path, credsFile.path);
      this.databases.push({ name });
      this.closeModal();
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

app.mount('#app');
