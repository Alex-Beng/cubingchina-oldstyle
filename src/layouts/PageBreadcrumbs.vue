<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import type { Crumb } from '@/composables/usePageMeta';

withDefaults(defineProps<{ crumbs: Crumb[] }>(), { crumbs: () => [] });

const { t, te } = useI18n();

function label(crumb: Crumb): string {
  if (crumb.label.includes('.') && te(crumb.label)) return t(crumb.label);
  return crumb.label;
}
</script>

<template>
  <div class="breadcrumbs pull-right hidden-xs">
    <ul class="breadcrumbs-list">
      <li class="breadcrumbs-label">{{ t('common.You are here:', '您在这里:') }}</li>
      <li>
        <RouterLink to="/">{{ t('common.Home', '首页') }}</RouterLink>
        <i class="fa fa-angle-right"></i>
      </li>
      <li
        v-for="(crumb, index) in crumbs"
        :key="crumb.to ?? index"
        :class="{ current: index === crumbs.length - 1 }"
      >
        <RouterLink v-if="crumb.to && index !== crumbs.length - 1" :to="crumb.to">
          {{ label(crumb) }}
        </RouterLink>
        <span v-else>{{ label(crumb) }}</span>
        <i v-if="index !== crumbs.length - 1" class="fa fa-angle-right"></i>
      </li>
    </ul>
  </div>
</template>
