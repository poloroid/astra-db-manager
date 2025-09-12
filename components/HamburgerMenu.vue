<template>
  <div>
    <button class="hamburger" @click="menuOpen = !menuOpen">☰</button>
    <div v-if="menuOpen" class="menu">
      <button @click="toggleDark">Toggle Dark Mode</button>
    </div>
  </div>
</template>
<script>
export default {
  emits: ['toggle-dark'],
  data() {
    return { menuOpen: false };
  },
  methods: {
    toggleDark() {
      this.$emit('toggle-dark');
      this.menuOpen = false;
    }
  }
};
</script>
