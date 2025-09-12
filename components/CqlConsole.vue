<template>
  <div class="console">
    <div class="console-input">
      <textarea
        ref="editor"
        v-model="text"
        class="code-input"
        placeholder="-- Type CQL and press Run or Ctrl+Enter\nSELECT * FROM system.local;"
        @keydown.tab.prevent="applyAutocomplete()"
        @keyup="updateSuggestions"
      ></textarea>
      <div v-if="suggestions.length" class="suggestions">
        <span class="muted">suggestions:</span>
        <span v-for="s in suggestions.slice(0, 10)" :key="s" class="sg">{{ s }}</span>
        <span v-if="suggestions.length > 10" class="muted">…</span>
      </div>
      <div class="actions">
        <button @click="run" :disabled="running">{{ running ? 'Running…' : 'Run' }}</button>
        <button @click="clearOutput" :disabled="!output.length">Clear</button>
      </div>
    </div>
    <div class="console-output">
      <div v-for="(entry, idx) in output" :key="idx" class="entry">
        <div class="prompt">cql&gt; {{ entry.statement }}</div>
        <pre v-if="entry.error" class="err">Error: {{ entry.error }}</pre>
        <template v-else>
          <pre class="tbl" v-if="entry.columns && entry.columns.length">
{{ renderTable(entry.columns, entry.rows) }}
          </pre>
          <div class="hint" v-else>OK ({{ entry.rowCount }} rows, {{ entry.tookMs }} ms)</div>
        </template>
      </div>
    </div>
  </div>
  
</template>
<script>
const KEYWORDS = [
  'SELECT','FROM','WHERE','INSERT','INTO','VALUES','UPDATE','SET','DELETE','IF','EXISTS','NOT','PRIMARY','KEY',
  'CREATE','TABLE','TYPE','KEYSPACE','INDEX','MATERIALIZED','VIEW','WITH','AND','ORDER','BY','ASC','DESC',
  'ALLOW','FILTERING','LIMIT','TOKEN','IN','CONTAINS','CONTAINS KEY','DROP','ALTER','ADD','APPLY','BATCH',
  'BEGIN','TRUNCATE','USE'
];

export default {
  props: ['db', 'knownTables', 'knownTypes'],
  data() {
    return {
      text: '',
      running: false,
      output: [],
      suggestions: []
    };
  },
  methods: {
    async run() {
      const stmt = (this.text || '').trim();
      if (!stmt) return;
      this.running = true;
      try {
        const res = await window.electronAPI.executeCql(this.db.slug, stmt);
        if (res?.success && Array.isArray(res.results)) {
          res.results.forEach(r => this.output.push(r));
        } else {
          this.output.push({ statement: stmt, error: res?.message || 'Execution failed' });
        }
      } catch (e) {
        this.output.push({ statement: stmt, error: 'Execution failed' });
      } finally {
        this.running = false;
      }
    },
    clearOutput() {
      this.output = [];
    },
    renderTable(cols, rows) {
      const widths = cols.map(c => c.length);
      for (const r of rows) {
        cols.forEach((c, i) => {
          const val = r[c];
          const str = val == null ? 'null' : (typeof val === 'object' ? JSON.stringify(val) : String(val));
          widths[i] = Math.max(widths[i], str.length);
        });
      }
      const pad = (s, w) => (s + ' '.repeat(w)).slice(0, w);
      const header = cols.map((c, i) => pad(c, widths[i])).join('  ');
      const sep = widths.map(w => '-'.repeat(w)).join('  ');
      const lines = rows.map(r => cols.map((c, i) => pad((r[c] == null ? 'null' : (typeof r[c] === 'object' ? JSON.stringify(r[c]) : String(r[c]))), widths[i])).join('  '));
      return [header, sep, ...lines].join('\n');
    },
    updateSuggestions() {
      const text = this.text || '';
      const caret = this.$refs.editor ? this.$refs.editor.selectionStart : text.length;
      const upto = text.slice(0, caret);
      const m = upto.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);
      if (!m) { this.suggestions = []; return; }
      const tok = m[1];
      const pool = [
        ...KEYWORDS,
        ...(this.knownTables || []),
        ...(this.knownTypes || [])
      ];
      const lower = tok.toLowerCase();
      const sugg = Array.from(new Set(pool.filter(w => String(w).toLowerCase().startsWith(lower))));
      this.suggestions = sugg.slice(0, 25);
    },
    applyAutocomplete() {
      if (!this.suggestions.length) return;
      const text = this.text || '';
      const ta = this.$refs.editor;
      const caret = ta ? ta.selectionStart : text.length;
      const upto = text.slice(0, caret);
      const after = text.slice(caret);
      const m = upto.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);
      if (!m) return;
      const prefix = m[1];
      const insert = this.suggestions[0];
      const before = upto.slice(0, upto.length - prefix.length) + insert;
      this.text = before + after;
      this.$nextTick(() => {
        if (ta) {
          const pos = before.length;
          ta.setSelectionRange(pos, pos);
        }
      });
      this.updateSuggestions();
    }
  },
  mounted() {
    // Keyboard shortcut: Ctrl/Cmd + Enter to run
    this.$refs.editor && this.$refs.editor.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        this.run();
      }
    });
  }
};
</script>
<style>
.console { display: grid; grid-template-columns: 1fr; gap: 10px; }
.console-input { display: grid; gap: 8px; }
.code-input { min-height: 120px; background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: 10px; padding: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 12px; }
.console-output { border: 1px solid var(--border); border-radius: 10px; padding: 10px; background: var(--surface); max-height: 50vh; overflow: auto; }
.prompt { color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 12px; margin-bottom: 6px; }
.entry { margin-bottom: 12px; }
.err { color: #ff6b6b; white-space: pre-wrap; }
.tbl { white-space: pre; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace; font-size: 12px; }
.suggestions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.suggestions .sg { background: rgba(123, 97, 255, 0.12); border: 1px solid var(--border); border-radius: 8px; padding: 2px 6px; font-size: 11px; }
</style>
