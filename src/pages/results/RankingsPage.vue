<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { wcaApi } from '@/api/wcaApi';
import { regionName } from '@/i18n';
import { formatResult } from '@/utils/format';
import { eventIconClass, eventNameKey, EVENTS } from '@/utils/events';
import { useAsyncData } from '@/composables/useAsyncData';
import { setPageMeta } from '@/composables/usePageMeta';
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

const REGIONS = [
  { type: 'country', id: 'China', label: '中国' },
  { type: 'continent', id: 'Asia', label: '亚洲' },
  { type: 'world', id: '', label: '世界' },
];

const GENDERS = [
  { value: 'all', label: '所有' },
  { value: 'm', label: '男' },
  { value: 'f', label: '女' },
];

setPageMeta({
  title: '个人排名',
  crumbs: [{ label: '成绩', to: '/results' }, { label: '排名' }],
  description:
    '本页面列出了各地选手在所有WCA项目的个人排名，所有的排名成绩源自WCA赛事的官方排名。',
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

const currentRegion = computed(
  () => REGIONS.find((r) => r.type === regionType.value && r.id === regionId.value) ?? REGIONS[0]!,
);

const eventLabel = computed(() => {
  const ev = EVENTS.find((e) => e.id === eventId.value);
  return t(`event.${eventNameKey(eventId.value)}`, ev?.name ?? eventId.value) || eventId.value;
});

function updateQuery(patch: Record<string, string | undefined>) {
  const query: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...route.query, ...patch })) {
    if (v !== undefined && v !== '' && v !== null) query[k] = String(v);
  }
  delete query.page;
  void router.push({ name: 'results-rankings', query });
}

const battleIds = ref<string[]>([]);

function toggleBattle(personId: string, event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.checked) {
    if (!battleIds.value.includes(personId)) battleIds.value.push(personId);
  } else {
    battleIds.value = battleIds.value.filter((id) => id !== personId);
  }
  if (battleIds.value.length >= 2) {
    const ids = battleIds.value.slice(0, 2).join('-');
    battleIds.value = [];
    void router.push(`/results/battle/${ids}`);
  }
}

function displayRank(index: number): string {
  if (index === 0) return String(rows.value[0]?.rank ?? 1);
  const prev = rows.value[index - 1];
  const current = rows.value[index];
  if (prev && current && prev.result === current.result) return '';
  return String(current?.rank ?? '');
}

function competitionDate(row: { sourceCompetitionEndYear?: number; sourceCompetitionEndMonth?: number; sourceCompetitionEndDay?: number; sourceCompetitionYear: number; sourceCompetitionMonth: number; sourceCompetitionDay: number }): string {
  const y = row.sourceCompetitionEndYear ?? row.sourceCompetitionYear;
  const m = row.sourceCompetitionEndMonth ?? row.sourceCompetitionMonth;
  const d = row.sourceCompetitionEndDay ?? row.sourceCompetitionDay;
  if (!y || !m || !d) return '';
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const pagerTo = (p: number) => ({
  name: 'results-rankings',
  query: { ...route.query, page: String(p) },
});

const genderLabel = computed(
  () => GENDERS.find((g) => g.value === gender.value)?.label ?? '所有',
);
</script>

<template>
  <div class="col-lg-12">
    <form class="form-inline rankings-filter" @submit.prevent>
      <div class="form-group">
        <label>{{ t('common.Region', '地区') }}</label>
        <select
          class="form-control"
          :value="`${regionType}:${regionId}`"
          @change="updateQuery({
            regionType: ($event.target as HTMLSelectElement).value.split(':')[0],
            regionId: ($event.target as HTMLSelectElement).value.split(':')[1],
          })"
        >
          <option v-for="r in REGIONS" :key="`${r.type}:${r.id}`" :value="`${r.type}:${r.id}`">
            {{ r.label }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>{{ t('common.Event', '项目') }}</label>
        <select
          class="form-control"
          :value="eventId"
          @change="updateQuery({ event: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="e in EVENTS" :key="e.id" :value="e.id">
            {{ t(`event.${e.nameZhKey}`, e.name) }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>{{ t('common.Gender', '性别') }}</label>
        <select
          class="form-control"
          :value="gender"
          @change="updateQuery({ gender: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="g in GENDERS" :key="g.value" :value="g.value">{{ g.label }}</option>
        </select>
      </div>
      <button
        type="button"
        class="btn"
        :class="type === 'single' ? 'btn-warning' : 'btn-theme'"
        @click="updateQuery({ type: 'single' })"
      >单次</button>
      <button
        type="button"
        class="btn"
        :class="type === 'average' ? 'btn-warning' : 'btn-theme'"
        @click="updateQuery({ type: 'average' })"
      >平均</button>
    </form>

    <div class="event-title">
      <i :class="eventIconClass(eventId)"></i>
      {{ eventLabel }}
      &nbsp;&nbsp;{{ currentRegion.label }}&nbsp;&nbsp;{{ genderLabel }}&nbsp;&nbsp;
      {{ type === 'single' ? '单次' : '平均' }}
    </div>

    <AppLoading v-if="state.loading.value" />
    <AppError v-else-if="state.error.value" :message="state.error.value" />
    <div v-else class="table-responsive">
      <table class="table table-bordered table-condensed table-hover table-boxed">
        <thead>
          <tr>
            <th class="battle-checkbox">{{ t('common.Battle', '较量') }}</th>
            <th>{{ t('statistics.Rank', '排名') }}</th>
            <th>{{ t('statistics.Person', '姓名') }}</th>
            <th>{{ t('common.Region', '地区') }}</th>
            <th>{{ t('common.Result', '成绩') }}</th>
            <th>{{ t('common.Competition', '比赛') }}</th>
            <th>{{ t('common.Date', '日期') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in rows" :key="`${row.personId}-${row.rank}`">
            <td class="battle-checkbox">
              <input
                type="checkbox"
                :value="row.personId"
                :checked="battleIds.includes(row.personId)"
                @change="toggleBattle(row.personId, $event)"
              />
            </td>
            <td class="rank-cell">{{ displayRank(index) }}</td>
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
            <td class="result-cell">{{ competitionDate(row) }}</td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="7" class="text-center text-muted">{{ t('common.No data', '暂无数据') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <AppPager
      v-if="!state.loading.value && total > PAGE_SIZE"
      :total="total"
      :page="page"
      :page-size="PAGE_SIZE"
      :to="pagerTo"
    />
  </div>
</template>
