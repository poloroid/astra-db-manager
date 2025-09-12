<template>
  <div class="modal">
    <div class="modal-content">
      <h2>Add Database</h2>
      <input type="file" @change="onScbChange" accept=".zip" />
      <input type="file" @change="onCredsChange" accept=".json" />
      <div class="actions">
        <button @click="onTest">Test</button>
        <button @click="onSave">Save</button>
        <button @click="$emit('close')">Cancel</button>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  emits: ['save', 'test', 'close'],
  data() {
    return { scbFile: null, credsFile: null };
  },
  methods: {
    onScbChange(e) { this.scbFile = e.target.files[0]; },
    onCredsChange(e) { this.credsFile = e.target.files[0]; },
    onSave() {
      if (!this.scbFile || !this.credsFile) { alert('Select both files'); return; }
      this.$emit('save', { scbFile: this.scbFile, credsFile: this.credsFile });
    },
    onTest() {
      if (!this.scbFile || !this.credsFile) { alert('Select both files'); return; }
      this.$emit('test', { scbFile: this.scbFile, credsFile: this.credsFile });
    }
  }
};
</script>
