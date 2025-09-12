<template>
  <div class="db-explorer">
    <div class="toolbar">
      <button @click="$emit('back')">← Back</button>
      <div class="title">{{ db.name }} <span v-if="db.keyspaceName" class="muted">/ {{ db.keyspaceName }}</span></div>
      <div></div>
    </div>
    <div class="tabs">
      <button :class="{active: tab==='tables'}" @click="tab='tables'">Tables</button>
      <button :class="{active: tab==='types'}" @click="tab='types'">Types</button>
    </div>
    <div class="pane">
      <div v-if="loading" class="hint">Loading schema…</div>
      <div v-else>
        <div v-if="tab==='tables'">
          <div class="split">
            <div class="list">
              <div v-for="t in tables" :key="t" class="item" :class="{selected: t===selectedTable}" @click="selectTable(t)">{{ t }}</div>
            </div>
            <div class="detail">
              <pre v-if="tableDDL" class="code">{{ tableDDL }}</pre>
              <div v-else class="hint">Select a table to see its definition.</div>
            </div>
          </div>
        </div>
        <div v-else>
          <div class="split">
            <div class="list">
              <div v-for="u in types" :key="u" class="item" :class="{selected: u===selectedType}" @click="selectType(u)">{{ u }}</div>
            </div>
            <div class="detail">
              <pre v-if="typeDDL" class="code">{{ typeDDL }}</pre>
              <div v-else class="hint">Select a type to see its definition.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  props: ['db'],
  data() {
    return { tab: 'tables', loading: true, tables: [], types: [], selectedTable: '', tableDDL: '', selectedType: '', typeDDL: '' };
  },
  async mounted() {
    await this.loadSchema();
  },
  methods: {
    async loadSchema() {
      this.loading = true;
      try {
        const res = await window.electronAPI.dbSchema(this.db.slug);
        if (res?.success) {
          this.tables = res.tables || [];
          this.types = res.types || [];
        } else {
          alert(res?.message || 'Failed to load schema');
        }
      } finally {
        this.loading = false;
      }
    },
    async selectTable(name) {
      this.selectedTable = name;
      this.tableDDL = '';
      const res = await window.electronAPI.describeTable(this.db.slug, name);
      if (res?.success) this.tableDDL = res.createCql; else alert(res?.message || 'Failed to describe table');
    },
    async selectType(name) {
      this.selectedType = name;
      this.typeDDL = '';
      const res = await window.electronAPI.describeType(this.db.slug, name);
      if (res?.success) this.typeDDL = res.createCql; else alert(res?.message || 'Failed to describe type');
    }
  }
};
</script>
