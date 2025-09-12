<template>
  <ul>
    <li v-for="db in databases" :key="db.slug || db.name">
      <div>
        <strong>{{ db.name }}</strong>
        <span v-if="db.keyspaceName" class="muted"> — {{ db.keyspaceName }}</span>
      </div>
      <div class="row-actions">
        <button class="icon" @click="$emit('explore', db)" title="Explore">
          🔍
        </button>
        <button class="icon danger" @click="$emit('delete', db)" title="Delete">
          🗑️
        </button>
      </div>
    </li>
  </ul>
</template>
<script>
export default {
  props: ['databases']
};
</script>
