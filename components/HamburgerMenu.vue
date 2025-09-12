<template>
  <div>
    <button class="hamburger" @click="menuOpen = !menuOpen" aria-label="Open menu">☰</button>

    <!-- Backdrop (always in DOM for smooth transitions) -->
    <div class="backdrop" @click="menuOpen = false" aria-hidden="true"></div>

    <!-- Sidepane (always in DOM; visibility handled by CSS + body class) -->
    <aside class="menu" role="navigation" aria-label="Side menu">
      <div class="menu-header">
        <h3>Astra Manager</h3>
        <div
          class="menu-close"
          role="button"
          tabindex="0"
          aria-label="Close menu"
          @click="menuOpen = false"
          @keydown.enter.prevent="menuOpen = false"
          @keydown.space.prevent="menuOpen = false"
        >
          <svg class="icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path d="M5 5 L15 15 M15 5 L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
      <div class="menu-content">
        <button @click="toggleDark">Toggle Dark Mode</button>
      </div>
    </aside>
  </div>
</template>
<script>
export default {
  emits: ['toggle-dark'],
  data() {
    return { menuOpen: false };
  },
  watch: {
    menuOpen(val) {
      // Shift page content when the sidepane is open
      document.body.classList.toggle('with-sidepane', val);
    }
  },
  beforeUnmount() {
    document.body.classList.remove('with-sidepane');
  },
  methods: {
    toggleDark() {
      this.$emit('toggle-dark');
      this.menuOpen = false;
    }
  }
};
</script>
