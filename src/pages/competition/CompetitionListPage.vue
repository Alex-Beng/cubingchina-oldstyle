<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { wcaApi } from '@/api/wcaApi';
import { cubingApi } from '@/api/cubingApi';
import { unwrapList, unwrapTotal } from '@/api/unwrap';
import { formatDateRange, stripNamePinyin } from '@/utils/format';
import { getEvent } from '@/utils/events';
import type { DbCompetition } from '@/api/types/cubing';
import AppPager from '@/components/AppPager.vue';
import { useAsyncData } from '@/composables/useAsyncData';
import AppLoading from '@/components/AppLoading.vue';
import { setPageMeta } from '@/composables/usePageMeta';

setPageMeta({
  title: '赛事列表',
  crumbs: [{ label: '赛事' }],
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const keyword = ref(String(route.query.q ?? ''));
const searched = ref(!!route.query.q);

const metaState = useAsyncData(() => cubingApi.getCompetitionMeta());

function currentYear(): string {
  return String(new Date().getFullYear());
}

const year = computed(() => String(route.query.year ?? currentYear()));
const type = computed(() => String(route.query.type ?? ''));
const event = computed(() => String(route.query.event ?? ''));
const province = computed(() => String(route.query.province ?? ''));

const listState = useAsyncData(() =>
  cubingApi.listCompetitions({
    year: year.value,
    type: type.value || undefined,
    event: event.value || undefined,
    province: province.value || undefined,
  }),
);

const competitions = computed(() => unwrapList(listState.data.value));

const searchState = useAsyncData(
  async () => {
    if (!searched.value || !route.query.q) return { results: [] };
    return wcaApi.searchPersons(String(route.query.q));
  },
  { immediate: false },
);

const persons = computed(() => searchState.data.value?.results ?? []);

function applyFilter() {
  const query: Record<string, string> = {};
  if (year.value && year.value !== currentYear()) query.year = year.value;
  if (type.value) query.type = type.value;
  if (event.value) query.event = event.value;
  if (province.value) query.province = province.value;
  void router.push({ name: 'competition-index', query });
}

function doSearch() {
  const q = keyword.value.trim();
  if (!q) return;
  searched.value = true;
  void router.push({ name: 'competition-index', query: { ...route.query, q } });
  void searchState.reload();
}

function eventLabel(eventId: string): string {
  return t(`event.${getEvent(eventId)?.nameZhKey ?? eventId}`, getEvent(eventId)?.name ?? eventId);
}

function compTitle(c: { nameZh?: string; name?: string }): string {
  return c.nameZh || c.name || '';
}

const provinces = computed(() => {
  const set = new Set<string>();
  for (const c of competitions.value) {
    for (const l of c.locations ?? []) {
      if (l.provinceName) set.add(l.provinceName);
    }
  }
  return [...set].sort();
});

function locationsOf(c: DbCompetition) {
  return c.locations ?? [];
}

function rowClass(c: DbCompetition): string {
  const today = new Date().toISOString().slice(0, 10);
  const start = c.startDate ?? '';
  const end = c.endDate || start;
  if (end && today > end) return 'active';
  if (start && today >= start && today <= end) return 'success';
  const regStart = c.registrationStartTime ? String(c.registrationStartTime).slice(0, 10) : '';
  const regEnd = c.registrationEndTime ? String(c.registrationEndTime).slice(0, 10) : '';
  if (regStart && regEnd && today >= regStart && today <= regEnd) return 'danger';
  if (regStart && today < regStart) return 'warning';
  return '';
}

const pagerTo = () => ({ name: 'competition-index', query: route.query });
void AppPager;
void unwrapTotal;
void formatDateRange;
void stripNamePinyin;
void eventLabel;
void compTitle;
void pagerTo;
</script>

<template>
  <div class="col-lg-12 competition-index-page">
    <div class="filter-bar clearfix">
      <div class="form-group pull-left">
        <label>{{ t('common.Year', '年份') }}</label>
        <select v-model="year" class="form-control input-sm" @change="applyFilter">
          <option
            v-for="y in metaState.data.value?.years ?? []"
            :key="y"
            :value="String(y)"
          >{{ y }}</option>
        </select>
      </div>
      <div class="form-group pull-left">
        <label>{{ t('common.Event', '项目') }}</label>
        <select v-model="event" class="form-control input-sm" @change="applyFilter">
          <option value="">{{ t('common.All', '全部') }}</option>
          <option
            v-for="e in metaState.data.value?.events ?? []"
            :key="e.id"
            :value="e.id"
          >{{ t(`event.${e.name}`, e.name) }}</option>
        </select>
      </div>
      <div class="form-group pull-left">
        <label>{{ t('common.Province', '省份') }}</label>
        <select v-model="province" class="form-control input-sm" @change="applyFilter">
          <option value="">{{ t('common.All', '全部') }}</option>
          <option v-for="p in provinces" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
      <div class="form-group pull-left">
        <input
          v-model="keyword"
          class="form-control input-sm"
          :placeholder="t('common.Search', '搜索')"
          @keyup.enter="doSearch"
        />
      </div>
      <button class="btn btn-primary btn-sm pull-left" @click="doSearch">
        {{ t('common.Search', '搜索') }}
      </button>
    </div>

    <div v-if="searched" class="panel panel-default">
      <div class="panel-heading">{{ t('common.Persons', '选手') }}</div>
      <ul class="list-group">
        <li v-for="p in persons" :key="p.wcaId" class="list-group-item">
          <RouterLink :to="`/results/person/${p.wcaId}`">{{ p.name }}</RouterLink>
          <span class="text-muted"> · {{ p.wcaId }}</span>
        </li>
        <li v-if="!persons.length" class="list-group-item text-muted">
          {{ t('common.No data', '暂无数据') }}
        </li>
      </ul>
    </div>

    <AppLoading v-if="listState.loading.value" />
    <div v-else class="table-responsive">
      <table class="table table-bordered table-condensed table-hover table-boxed">
        <thead>
          <tr>
            <th>{{ t('common.Date', '日期') }}</th>
            <th>{{ t('Competition.Competition', '赛事') }}</th>
            <th>{{ t('common.Province', '省份') }}</th>
            <th>{{ t('common.City', '城市') }}</th>
            <th>{{ t('common.Venue', '地点') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in competitions" :key="c.id" :class="rowClass(c)">
            <td class="result-cell">{{ formatDateRange(c.startDate, c.endDate) }}</td>
            <td>
              <RouterLink :to="`/competition/${c.alias}`">{{ compTitle(c) }}</RouterLink>
            </td>
            <td>{{ locationsOf(c)[0]?.provinceName ?? '' }}</td>
            <td>{{ locationsOf(c)[0]?.cityName ?? '' }}</td>
            <td class="venue-cell">{{ locationsOf(c)[0]?.venueZh || locationsOf(c)[0]?.venue || '' }}</td>
          </tr>
          <tr v-if="!competitions.length">
            <td colspan="5" class="text-center text-muted">{{ t('common.No data', '暂无数据') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
