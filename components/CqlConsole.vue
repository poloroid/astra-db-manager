<template>
  <div class="xterm-wrap"><div ref="term" class="xterm-container"></div></div>
</template>
<script>
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const KEYWORDS = [
  'SELECT','FROM','WHERE','INSERT','INTO','VALUES','UPDATE','SET','DELETE','IF','EXISTS','NOT','PRIMARY','KEY',
  'CREATE','TABLE','TYPE','KEYSPACE','INDEX','MATERIALIZED','VIEW','WITH','AND','ORDER','BY','ASC','DESC',
  'ALLOW','FILTERING','LIMIT','TOKEN','IN','CONTAINS','DROP','ALTER','ADD','APPLY','BATCH','BEGIN','TRUNCATE','USE'
];

export default {
  props: ['db', 'knownTables', 'knownTypes'],
  data() {
    return {
      term: null,
      fit: null,
      buffer: '',
      input: '',
      history: [],
      histIdx: -1,
      prompt: 'cql> '
    };
  },
  methods: {
    write(s) { this.term && this.term.write(s); },
    nl() { this.write('\r\n'); },
    showPrompt() { this.write(`\x1b[1m${this.prompt}\x1b[0m`); },
    clearLine() { this.write('\r\x1b[2K'); this.showPrompt(); this.write(this.input); },
    async executeIfReady() {
      const trimmed = this.input.trim();
      this.nl();
      this.buffer += (this.input + '\n');
      this.input = '';
      if (!trimmed.endsWith(';')) { this.prompt = '...> '; this.showPrompt(); return; }
      const stmt = this.buffer.trim(); this.buffer = ''; this.prompt = 'cql> ';
      if (!stmt) { this.showPrompt(); return; }
      this.history.push(stmt); this.histIdx = this.history.length;
      try {
        const res = await window.electronAPI.executeCql(this.db.slug, stmt);
        if (res?.success && Array.isArray(res.results)) {
          for (const r of res.results) {
            if (r.columns?.length) {
              const txt = this.renderTable(r.columns, r.rows || []);
              this.write(txt.split('\n').map(l => l + '\r\n').join(''));
            }
            this.write(`(\x1b[36m${r.rowCount}\x1b[0m rows, \x1b[36m${r.tookMs}\x1b[0m ms)\r\n`);
          }
        } else { this.write(`\x1b[31mError:\x1b[0m ${res?.message || 'Execution failed'}\r\n`); }
      } catch (_) { this.write(`\x1b[31mError:\x1b[0m Execution failed\r\n`); }
      this.showPrompt();
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
    tryAutocomplete() {
      const pool = [ ...KEYWORDS, ...(this.knownTables || []), ...(this.knownTypes || []) ];
      const m = this.input.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);
      if (!m) return false;
      const tok = m[1];
      const lower = tok.toLowerCase();
      const candidates = Array.from(new Set(pool.filter(w => String(w).toLowerCase().startsWith(lower))));
      if (candidates.length === 0) return false;
      if (candidates.length === 1) {
        const insert = candidates[0];
        const before = this.input.slice(0, this.input.length - tok.length) + insert;
        this.input = before; this.clearLine(); return true;
      }
      this.nl(); this.write(candidates.slice(0, 20).join('  ') + (candidates.length > 20 ? ' …' : '') + '\r\n');
      this.showPrompt(); this.write(this.input); return false;
    },
    handleData(data) {
      for (const ch of data) {
        const code = ch.charCodeAt(0);
        if (ch === '\r') { this.executeIfReady(); continue; }
        if (code === 0x7F) { if (this.input.length) { this.input = this.input.slice(0,-1); this.write('\b \b'); } continue; }
        if (ch === '\t') { const ok = this.tryAutocomplete(); if (!ok) this.write('\x07'); continue; }
        if (code >= 0x20 && code !== 0x7F) { this.input += ch; this.write(ch); }
      }
    },
    handleKey(e) {
      if (e.domEvent.key === 'ArrowUp') { if (this.histIdx > 0) { this.histIdx--; this.input = this.history[this.histIdx] || ''; this.clearLine(); } e.preventDefault(); }
      else if (e.domEvent.key === 'ArrowDown') { if (this.histIdx < this.history.length - 1) { this.histIdx++; this.input = this.history[this.histIdx] || ''; } else { this.histIdx = this.history.length; this.input=''; } this.clearLine(); e.preventDefault(); }
      else if ((e.domEvent.ctrlKey || e.domEvent.metaKey) && e.domEvent.key.toLowerCase() === 'c') { this.buffer=''; this.input=''; this.nl(); this.showPrompt(); e.preventDefault(); }
    }
  },
  mounted() {
    if (!Terminal) {
      // Show a simple message if terminal libs failed to load
      const el = this.$refs.term;
      if (el) el.innerText = 'Terminal failed to load. Check console for errors.';
      return;
    }
    this.term = new Terminal({ convertEol: true, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \'Courier New\', monospace', fontSize: 12, theme: { background: '#121a2e', foreground: '#e6eaf2' }, cursorBlink: true });
    if (FitAddon) { this.fit = new FitAddon(); this.term.loadAddon(this.fit); }
    this.term.open(this.$refs.term); try { this.fit && this.fit.fit(); } catch (_) {}
    this.write('Welcome to CQL console. Type statements ending with ; and press Enter.\r\n'); this.showPrompt();
    this.term.onData(this.handleData); this.term.onKey(this.handleKey);
    const onResize = () => { try { this.fit.fit(); } catch (_) {} }; window.addEventListener('resize', onResize); this.$once('hook:beforeUnmount', () => window.removeEventListener('resize', onResize));
  }
};
</script>
<style>
.xterm-wrap { border: 1px solid var(--border); border-radius: 10px; background: var(--surface); min-height: 260px; }
.xterm-container { width: 100%; height: 50vh; min-height: 260px; }
</style>
