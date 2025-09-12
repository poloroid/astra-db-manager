<template>
  <ul><li v-for="db in databases" :key="db.name">{{ db.name }}</li></ul>
</template>
<script>
export default {
  props: ['databases']
};
</script>
