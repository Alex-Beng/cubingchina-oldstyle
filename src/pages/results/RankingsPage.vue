<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { wcaApi } from '@/api/wcaApi';
import { regionName } from '@/i18n';
import { formatResult } from '@/utils/format';
import { eventIconClass, eventNameKey, EVENTS } from '@/utils/events';
import { useAsyncData } from '@/composables/useAsyncData';
import AppLoading from '@/components/AppLoading.vue';
import AppError from '@/components/AppError.vue';
import AppPager from '@/components/AppPager.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const PAGE_SIZE = 100;

const eventId = computed(() => String(route.query.event ?? '333'));
const type = computed(() => (route.query.type === 'average' ? 'average' : 'single'));
const regionType = computed(() => String(route.query.regionType ?? 'country'));
const regionId = computed(() => String(route.query.regionId ?? 'China'));
const gender = computed(() => String(route.query.gender ?? 'all'));
const page = computed(() => {
  const n = Number(route.query.page ?? 1);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
});

const state = useAsyncData(() =>
  wcaApi.getRankings({
    eventId: eventId.value,
    type: type.value,
    regionType: regionType.value,
    regionId: regionId.value,
    gender: gender.value,
    page: page.value,
    limit: PAGE_SIZE,
  }),
);

watch(
  () => [eventId.value, type.value, regionType.value, regionId.value, gender.value, page.value],
  () => void state.reload(),
);

const rows = computed(() => state.data.value?.results ?? []);
const total = computed(() => state.data.value?.pagination?.total ?? rows.value.length);

const regions = [
  { type: 'country', id: 'China', labelKey: 'common.China' },
  { type: 'continent', id: 'Asia', labelKey: 'common.Asia' },
  { type: 'world', id: '', labelKey: 'common.World' },
];

const genderOptions = ref([
  { value: 'all', labelKey: 'common.All' },
  { value: 'm', labelKey: 'common.Male' },
  { value: 'f', labelKey: 'common.Female' },
]);

function updateQuery(patch: Record<string, string | undefined>) {
  const query: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...route.query, ...patch })) {
    if (v !== undefined && v !== '' && v !== null) query[k] = String(v);
  }
  if (query.page === '1') delete query.page;
  void router.push({ name: 'results-rankings', query });
}

const pagerTo = (p: number) => ({ name: 'results-rankings', query: { ...route.query, page: String(p) } });

function eventLabel(id: string): string {
  return t(`event.${eventNameKey(id)}`, EVENTS.find((e) => e.id === id)?.name ?? id);
}
void genderOptions;
void AppPager;
void pagerTo;
void regionName;
void formatResult;
void eventIconClass;
void eventLabel;
</script>

<template>
  <div class="col-lg-12 results-rankings">
    <div class="filter-bar clearfix">
      <div class="form-group pull-left">
        <label>{{ t('common.Event', '项目') }}</label>
        <select class="form-control input-sm" :value="eventId" @change="updateQuery({ event: ($event.target as HTMLSelectElement).value })">
          <option v-for="e in EVENTS" :key="e.id" :value="e.id">{{ eventLabel(e.id) }}</option>
        </select>
      </div>
      <div class="form-group pull-left">
        <label>{{ t('common.Type', '类型') }}</label>
        <select class="form-control input-sm" :value="type" @change="updateQuery({ type: ($event.target as HTMLSelectElement).value })">
          <option value="single">{{ t('common.Single', '单次') }}</option>
          <option value="average">{{ t('common.Average', '平均') }}</option>
        </select>
      </div>
      <div class="form-group pull-left">
        <label>{{ t('common.Region', '地区') }}</label>
        <select
          class="form-control input-sm"
          :value="`${regionType}:${regionId}`"
          @change="updateQuery({
            regionType: ($event.target as HTMLSelectElement).value.split(':')[0],
            regionId: ($event.target as HTMLSelectElement).value.split(':')[1],
          })"
        >
          <option v-for="r in regions" :key="`${r.type}:${r.id}`" :value="`${r.type}:${r.id}`">
            {{ t(r.labelKey, r.id || '世界') }}
          </option>
        </select>
      </div>
      <div class="form-group pull-left">
        <label>{{ t('common.Gender', '性别') }}</label>
        <select class="form-control input-sm" :value="gender" @change="updateQuery({ gender: ($event.target as HTMLSelectElement).value })">
          <option value="all">{{ t('common.All', '全部') }}</option>
          <option value="m">{{ t('common.Male', '男') }}</option>
          <option value="f">{{ t('common.Female', '女') }}</option>
        </select>
      </div>
    </div>

    <AppLoading v-if="state.loading.value" />
    <AppError v-else-if="state.error.value" :message="state.error.value" />
    <table v-else class="table table-bordered table-condensed table-responsive">
      <thead>
        <tr>
          <th class="rank-cell">#</th>
          <th>{{ t('common.Person', '选手') }}</th>
          <th>{{ t('common.Region', '地区') }}</th>
          <th class="result-cell">{{ t('common.Result', '成绩') }}</th>
          <th>{{ t('common.Competition', '比赛') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="`${row.personId}-${row.rank}`">
          <td class="rank-cell">{{ row.rank }}</td>
          <td>
            <RouterLink class="person-link" :to="`/results/person/${row.personId}`">
              {{ row.personName }}
            </RouterLink>
          </td>
          <td>{{ regionName(row.countryId) }}</td>
          <td class="result-cell">{{ row.resultFormatted || formatResult(row.result, eventId) }}</td>
          <td>
            <RouterLink :to="`/results/competition/${row.sourceCompetitionId}`">
              {{ row.sourceCompetitionNameZh || row.sourceCompetitionName }}
            </RouterLink>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="5" class="text-center text-muted">{{ t('common.No data', '暂无数据') }}</td>
        </tr>
      </tbody>
    </table>

    <AppPager
      v-if="!state.loading.value && total > PAGE_SIZE"
      :total="total"
      :page="page"
      :page-size="PAGE_SIZE"
      :to="pagerTo"
    />
  </div>
</template>
