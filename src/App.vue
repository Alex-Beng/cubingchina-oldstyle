<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import MainLayout from '@/layouts/MainLayout.vue';

const route = useRoute();

const controller = computed(() => (route.meta.controller as string) ?? 'site');
const action = computed(() => (route.meta.action as string) ?? 'index');
</script>

<template>
  <MainLayout>
    <RouterView v-slot="{ Component, route: current }">
      <component :is="Component" :key="current.fullPath" />
    </RouterView>
  </MainLayout>
  <div :data-controller="controller" :data-action="action" hidden></div>
</template>
