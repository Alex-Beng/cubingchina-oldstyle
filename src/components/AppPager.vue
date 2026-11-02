<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { RouteLocationRaw } from 'vue-router';

const props = withDefaults(
  defineProps<{
    total: number;
    page: number;
    pageSize: number;
    windowSize?: number;
    to: (page: number) => RouteLocationRaw;
  }>(),
  { windowSize: 5 },
);

const { t } = useI18n();

const lastPage = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
const pages = computed(() => {
  const total = lastPage.value;
  const current = props.page;
  const half = Math.floor(props.windowSize / 2);
  let start = Math.max(1, current - half);
  const end = Math.min(total, start + props.windowSize - 1);
  start = Math.max(1, end - props.windowSize + 1);
  const list: number[] = [];
  for (let i = start; i <= end; i += 1) list.push(i);
  return list;
});
</script>

<template>
  <div v-if="lastPage > 1" class="pager-container">
    <ul class="pagination">
      <li class="first" :class="{ disabled: page <= 1 }">
        <RouterLink :to="to(1)">&lt;&lt; {{ t('common.First', '首页') }}</RouterLink>
      </li>
      <li class="previous" :class="{ disabled: page <= 1 }">
        <RouterLink :to="to(Math.max(1, page - 1))">&lt; {{ t('common.Prev', '前页') }}</RouterLink>
      </li>
      <li v-for="p in pages" :key="p" class="page" :class="{ active: p === page }">
        <RouterLink :to="to(p)">{{ p }}</RouterLink>
      </li>
      <li class="next" :class="{ disabled: page >= lastPage }">
        <RouterLink :to="to(Math.min(lastPage, page + 1))">
          {{ t('common.Next', '后页') }} &gt;
        </RouterLink>
      </li>
      <li class="last" :class="{ disabled: page >= lastPage }">
        <RouterLink :to="to(lastPage)">{{ t('common.Last', '末页') }} &gt;&gt;</RouterLink>
      </li>
    </ul>
  </div>
</template>
