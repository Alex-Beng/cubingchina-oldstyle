<script setup lang="ts">
import { watchEffect, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import MainLayout from '@/layouts/MainLayout.vue';

const route = useRoute();

function applyBodyClass(controller: string, action: string): void {
  document.body.className = `${controller} ${controller}-${action}`;
}

watchEffect(() => {
  const controller = (route.meta.controller as string) ?? 'site';
  const action = (route.meta.action as string) ?? 'index';
  applyBodyClass(controller, action);
});

onUnmounted(() => {
  document.body.className = '';
});
</script>

<template>
  <MainLayout>
    <RouterView v-slot="{ Component, route: current }">
      <component :is="Component" :key="current.fullPath" />
    </RouterView>
  </MainLayout>
</template>
