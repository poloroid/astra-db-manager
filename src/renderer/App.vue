<template>
  <div>
    <hamburger-menu @toggle-dark="toggleDarkMode"></hamburger-menu>

    <h1>{{ title }}</h1>

    <div v-if="view !== 'explorer'">
      <database-list :databases="databases" @explore="exploreDb" @delete="deleteDatabase"></database-list>
      <button @click="openModal">Add Database</button>
    </div>

    <div v-else>
      <db-explorer :db="currentDb" @back="backHome"></db-explorer>
    </div>

    <add-database-modal
      v-if="showModal"
      @save="addDatabase"
      @test="testConnection"
      @close="closeModal"
    ></add-database-modal>
  </div>
</template>
<script>
import DatabaseList from '../../components/DatabaseList.vue';
import AddDatabaseModal from '../../components/AddDatabaseModal.vue';
import HamburgerMenu from '../../components/HamburgerMenu.vue';
import DbExplorer from '../../components/DbExplorer.vue';
import CqlConsole from '../../components/CqlConsole.vue';

export default {
  name: 'App',
  components: {
    DatabaseList,
    AddDatabaseModal,
    HamburgerMenu,
    DbExplorer,
    CqlConsole
  },
  data() {
    return {
      databases: [],
      showModal: false,
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
    }
  }
};
</script>
