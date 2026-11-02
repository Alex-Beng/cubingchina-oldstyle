<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { wcaApi } from '@/api/wcaApi';
import { formatResult } from '@/utils/format';
import { eventIconClass, eventNameKey } from '@/utils/events';
import { regionName } from '@/i18n';
import { useAsyncData } from '@/composables/useAsyncData';
import AppLoading from '@/components/AppLoading.vue';
import AppError from '@/components/AppError.vue';
import type { StatisticsBlockRow } from '@/api/types/wca';
import { setPageMeta } from '@/composables/usePageMeta';

setPageMeta({
  title: '统计',
  crumbs: [{ label: '成绩', to: '/results' }, { label: '统计' }],
  description: '我们基于 WCA 官方比赛成绩，生成了关于中国比赛和选手的多项统计。',
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const indexState = useAsyncData(() => wcaApi.getStatisticsIndex());

const activeBlock = computed(() => String(route.params.name ?? 'sum-single'));

const blockState = useAsyncData(() => wcaApi.getStatisticBlock(activeBlock.value));

const block = computed(() => blockState.data.value);

const sections = computed(() => indexState.data.value?.sections ?? []);

function selectBlock(id: string) {
  void router.push({ name: 'results-statistics', params: { name: id } });
  void blockState.reload();
}

function cellValue(row: StatisticsBlockRow, key: string): string {
  const raw = row[key];
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'object') return '';
  if (/^\d{4,}$/.test(String(raw)) && key !== 'position') {
    return formatResult(Number(raw));
  }
  return String(raw);
}

function personKeys(): string[] {
  return ['person', 'personName'];
}
void personKeys;
void regionName;
void eventIconClass;
void eventNameKey;
</script>

<template>
  <div class="col-lg-12 results-statistics">
    <AppLoading v-if="indexState.loading.value" />
    <template v-else>
      <nav class="stat-nav clearfix">
        <div v-for="section in sections" :key="section.id" class="stat-section">
          <h4 class="stat-section-title">{{ section.titleZh || section.title || section.id }}</h4>
          <ul class="list-inline">
            <li v-for="b in section.blocks" :key="b.id">
              <a
                href="#"
                :class="{ active: b.id === activeBlock }"
                @click.prevent="selectBlock(b.id)"
              >{{ b.titleZh || b.title || b.id }}</a>
            </li>
          </ul>
        </div>
      </nav>

      <hr />

      <AppLoading v-if="blockState.loading.value" />
      <AppError v-else-if="blockState.error.value" :message="blockState.error.value" />
      <template v-else-if="block">
        <h2>{{ block.titleZh || block.title || block.id }}</h2>
        <p v-if="block.descriptionZh || block.description" class="text-muted">
          {{ block.descriptionZh || block.description }}
        </p>
        <table class="table table-bordered table-condensed table-hover table-boxed table-responsive">
          <thead>
            <tr>
              <th v-for="col in block.columns" :key="col.key">
                {{ col.kind === 'position' ? '#' : col.key }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in block.rows" :key="i">
              <td v-for="col in block.columns" :key="col.key">
                <template v-if="col.kind === 'position'">{{ row.position ?? i + 1 }}</template>
                <template v-else-if="col.kind === 'person'">
                  <RouterLink
                    v-if="row.personId"
                    class="person-link"
                    :to="`/results/person/${row.personId}`"
                  >{{ row.personName || row.person }}</RouterLink>
                  <span v-else>{{ row.personName || row.person }}</span>
                </template>
                <template v-else>{{ cellValue(row, col.key) }}</template>
              </td>
            </tr>
            <tr v-if="!block.rows?.length">
              <td :colspan="block.columns.length" class="text-center text-muted">
                {{ t('common.No data', '暂无数据') }}
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </template>
  </div>
</template>

<style scoped>
.stat-section {
  margin-bottom: 10px;
}
.stat-section-title {
  font-size: 14px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}
.stat-section ul {
  margin-bottom: 6px;
}
.stat-section a.active {
  font-weight: 700;
  color: #6091ba;
}
</style>
