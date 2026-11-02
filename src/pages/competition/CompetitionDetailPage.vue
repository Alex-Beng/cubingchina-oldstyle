<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { cubingApi } from '@/api/cubingApi';
import { wcaApi } from '@/api/wcaApi';
import { currentLocale } from '@/i18n';
import { formatDateRange, formatResult } from '@/utils/format';
import { renderContent } from '@/utils/markdown';
import { eventIconClass, eventNameKey, sortEvents } from '@/utils/events';
import { useAsyncData } from '@/composables/useAsyncData';
import AppLoading from '@/components/AppLoading.vue';
import AppError from '@/components/AppError.vue';
import type { CompetitionI18nAttribute, ScheduleRow } from '@/api/types/cubing';
import { setPageMeta } from '@/composables/usePageMeta';

const { t } = useI18n();
const route = useRoute();

const alias = computed(() => String(route.params.alias ?? ''));
const isEn = computed(() => currentLocale() === 'en');

const state = useAsyncData(() => cubingApi.getCompetition(alias.value));

watch(alias, () => void state.reload());

const comp = computed(() => state.data.value);

watch(
  () => comp.value,
  (c) => {
    if (!c) return;
    setPageMeta({
      title: c.nameZh || c.name,
      crumbs: [{ label: '赛事', to: '/competition' }, { label: c.nameZh || c.name }],
    });
  },
  { immediate: true },
);

const TABS = [
  { key: 'information', label: 'common.Detail', fallback: '赛事详情' },
  { key: 'schedule', label: 'common.Schedule', fallback: '赛程' },
  { key: 'regulations', label: 'common.Regulations', fallback: '比赛规则' },
  { key: 'travel', label: 'common.Travel', fallback: '交通信息' },
  { key: 'results', label: 'common.Competition Results', fallback: '比赛成绩' },
] as const;

const activeTab = ref<string>('information');

const events = computed(() => sortEvents([...(comp.value?.events ?? [])]));

const delegates = computed(
  () => (comp.value?.roles ?? []).filter((r) => r.role === 'delegate').map((r) => r.user),
);
const organizers = computed(
  () => (comp.value?.roles ?? []).filter((r) => r.role === 'organizer').map((r) => r.user),
);

const location = computed(() => comp.value?.locations?.[0] ?? null);

function i18nValue(key: string): string {
  const list: CompetitionI18nAttribute[] = comp.value?.i18nAttributes ?? [];
  const wanted = isEn.value ? ['en'] : ['zh'];
  for (const locale of wanted) {
    const hit = list.find((a) => a.key === key && a.locale === locale);
    if (hit?.value) return hit.value;
  }
  const fallback = list.find((a) => a.key === key);
  return fallback?.value ?? '';
}

const visibleTabs = computed(() => {
  const result: typeof TABS[number][] = [];
  for (const tab of TABS) {
    if (tab.key === 'results') {
      if (comp.value?.resultsPublishedAt) result.push(tab);
      continue;
    }
    if (tab.key === 'schedule') {
      if (comp.value) result.push(tab);
      continue;
    }
    if (i18nValue(tab.key)) result.push(tab);
  }
  return result;
});

const scheduleState = useAsyncData(
  async () => {
    if (!comp.value) return [];
    return (await cubingApi.getCompetitionSchedule(alias.value)) as unknown as ScheduleRow[];
  },
  { immediate: false },
);

const resultsState = useAsyncData(
  async () => {
    const c = comp.value;
    if (!c?.wcaCompetitionId || !c.resultsPublishedAt) return null;
    try {
      return await wcaApi.getCompetitionResults(c.wcaCompetitionId);
    } catch {
      return null;
    }
  },
  { immediate: false },
);

watch(
  () => comp.value,
  (c) => {
    if (!c) return;
    if (c.resultsPublishedAt) void resultsState.reload();
  },
);

watch(activeTab, (tab) => {
  if (tab === 'schedule' && !scheduleState.data.value) void scheduleState.reload();
  if (tab === 'results' && !resultsState.data.value) void resultsState.reload();
});

const scheduleRows = computed(() => {
  const rows = scheduleState.data.value ?? [];
  return [...rows].sort((a, b) => a.startTime.localeCompare(b.startTime));
});

const scheduleDays = computed(() => {
  const map = new Map<string, ScheduleRow[]>();
  for (const row of scheduleRows.value) {
    const day = row.startTime.slice(0, 10);
    const list = map.get(day) ?? [];
    list.push(row);
    map.set(day, list);
  }
  return [...map.entries()].map(([day, items]) => ({ day, items }));
});

const resultEvents = computed(() => resultsState.data.value?.events ?? []);

function eventLabel(id: string, fallback?: string): string {
  return t(`event.${eventNameKey(id)}`, fallback ?? id);
}

function timeRange(row: ScheduleRow): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  return `${fmt(row.startTime)} - ${fmt(row.endTime)}`;
}

function rowLabel(row: ScheduleRow): string {
  if (row.eventId) return eventLabel(row.eventId);
  if (row.name || row.nameZh) return isEn.value ? row.name ?? '' : row.nameZh || row.name || '';
  return row.activityType ? t(`event.${row.activityType}`, row.activityType) : '';
}
</script>

<template>
  <div class="col-lg-12 competition-detail">
    <AppLoading v-if="state.loading.value" />
    <AppError v-else-if="state.error.value" :message="state.error.value" />
    <template v-else-if="comp">
      <div class="panel panel-info">
        <div class="panel-body">
          <div class="row">
            <div class="col-md-6 col-sm-12">
              <p>
                <strong>{{ t('common.Date', '日期') }}:</strong>
                {{ formatDateRange(comp.startDate, comp.endDate) }}
              </p>
              <p v-if="location">
                <strong>{{ t('common.Location', '地点') }}:</strong>
                {{ isEn ? location.venue : location.venueZh || location.venue }}
              </p>
              <p v-if="location?.cityName">
                <strong>{{ t('common.City', '城市') }}:</strong>
                {{ location.provinceName }} {{ location.cityName }}
              </p>
            </div>
            <div class="col-md-6 col-sm-12">
              <p v-if="delegates.length">
                <strong>{{ t('common.Delegate', 'WCA代表') }}:</strong>
                <span v-for="(d, i) in delegates" :key="d.id">
                  {{ d.localName || d.name }}<span v-if="i < delegates.length - 1">, </span>
                </span>
              </p>
              <p v-if="organizers.length">
                <strong>{{ t('common.Organizer', '主办方') }}:</strong>
                <span v-for="(o, i) in organizers" :key="o.id">
                  {{ o.localName || o.name }}<span v-if="i < organizers.length - 1">, </span>
                </span>
              </p>
              <p v-if="comp.competitorLimit">
                <strong>{{ t('common.Competitor Limit', '人数限制') }}:</strong>
                {{ comp.competitorLimit }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <p class="event-list">
        <span v-for="ev in events" :key="ev.eventId" class="event-chip">
          <i :class="eventIconClass(ev.eventId)"></i>
          {{ eventLabel(ev.eventId) }}
          <small v-if="ev.roundCount > 1">×{{ ev.roundCount }}</small>
        </span>
      </p>

      <ul class="nav nav-tabs competition-tabs">
        <li v-for="tab in visibleTabs" :key="tab.key" :class="{ active: activeTab === tab.key }">
          <a href="#" @click.prevent="activeTab = tab.key">
            {{ t(tab.label, tab.fallback) }}
          </a>
        </li>
      </ul>

      <div class="tab-body">
        <div
          v-if="activeTab === 'information'"
          class="competition-rich"
          v-html="renderContent(i18nValue('information'))"
        ></div>

        <div v-else-if="activeTab === 'regulations'" class="competition-rich">
          <div v-html="renderContent(i18nValue('regulations'))"></div>
        </div>

        <div v-else-if="activeTab === 'travel'" class="competition-rich">
          <div v-html="renderContent(i18nValue('travel'))"></div>
        </div>

        <div v-else-if="activeTab === 'schedule'">
          <AppLoading v-if="scheduleState.loading.value" />
          <AppError v-else-if="scheduleState.error.value" :message="scheduleState.error.value" />
          <template v-else>
            <div v-for="day in scheduleDays" :key="day.day" class="schedule-day">
              <h3>{{ day.day }}</h3>
              <table class="table table-bordered table-condensed table-hover table-boxed schedule-table">
                <tbody>
                  <tr v-for="row in day.items" :key="row.id">
                    <td class="schedule-time">{{ timeRange(row) }}</td>
                    <td>
                      <span
                        class="schedule-dot"
                        :style="{ background: row.venue?.color || '#6091ba' }"
                      ></span>
                      <i v-if="row.eventId" :class="eventIconClass(row.eventId)"></i>
                      {{ rowLabel(row) }}
                      <span v-if="row.round?.name || row.round?.nameZh" class="text-muted">
                        · {{ row.round?.nameZh || row.round?.name }}
                      </span>
                      <span v-if="row.attempt" class="text-muted">· R{{ row.attempt }}</span>
                    </td>
                    <td class="text-muted">{{ row.venue?.nameZh || row.venue?.name }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="!scheduleDays.length" class="empty-hint">
              {{ t('common.No data', '暂无数据') }}
            </p>
          </template>
        </div>

        <div v-else-if="activeTab === 'results'">
          <AppLoading v-if="resultsState.loading.value" />
          <template v-else-if="resultEvents.length">
            <div v-for="ev in resultEvents" :key="ev.eventId" class="event-block">
              <h3>
                <i :class="eventIconClass(ev.eventId)"></i>
                {{ eventLabel(ev.eventId, ev.eventName) }}
              </h3>
              <div v-for="round in ev.rounds" :key="round.roundTypeId">
                <h4>{{ round.roundName }}</h4>
                <table class="table table-bordered table-condensed table-hover table-boxed">
                  <thead>
                    <tr>
                      <th class="rank-cell">#</th>
                      <th>{{ t('common.Person', '选手') }}</th>
                      <th class="result-cell">{{ t('common.Best', '单次') }}</th>
                      <th class="result-cell">{{ t('common.Average', '平均') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in round.results" :key="row.personId + row.position">
                      <td class="rank-cell">{{ row.position }}</td>
                      <td>
                        <RouterLink :to="`/results/person/${row.personId}`">
                          {{ row.personName }}
                        </RouterLink>
                      </td>
                      <td class="result-cell">
                        {{ row.bestFormatted || formatResult(row.best, ev.eventId) }}
                      </td>
                      <td class="result-cell">
                        {{ row.averageFormatted || formatResult(row.average, ev.eventId) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
          <p v-else class="empty-hint">{{ t('common.No data', '暂无数据') }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.event-list .event-chip {
  display: inline-block;
  background: #f2f6fa;
  border-radius: 4px;
  padding: 4px 10px;
  margin: 0 6px 6px 0;
}
.event-list .event-icon {
  margin-right: 4px;
}
.competition-tabs {
  margin-bottom: 18px;
}
.competition-tabs > li > a {
  cursor: pointer;
}
.tab-body {
  padding-top: 6px;
}
.competition-rich :deep(img) {
  max-width: 100%;
  height: auto;
}
.competition-rich :deep(h2),
.competition-rich :deep(h3) {
  font-size: 18px;
  margin-top: 22px;
}
.schedule-day h3 {
  font-size: 16px;
  color: #6091ba;
  border-bottom: 1px solid #eee;
  padding-bottom: 6px;
}
.schedule-time {
  white-space: nowrap;
  width: 130px;
  font-variant-numeric: tabular-nums;
}
.schedule-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}
.event-block {
  margin-bottom: 24px;
}
.event-block h4 {
  font-size: 14px;
  color: #6091ba;
  font-weight: 600;
}
</style>
