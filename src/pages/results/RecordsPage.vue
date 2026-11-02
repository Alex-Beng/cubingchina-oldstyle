<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { wcaApi } from '@/api/wcaApi';
import { formatResult } from '@/utils/format';
import { eventIconClass, eventNameKey, sortEvents } from '@/utils/events';
import { regionName } from '@/i18n';
import { useAsyncData } from '@/composables/useAsyncData';
import { setPageMeta } from '@/composables/usePageMeta';
import AppLoading from '@/components/AppLoading.vue';
import AppError from '@/components/AppError.vue';
import type { RecordEntry, RecordHistoryEntry } from '@/api/types/wca';

const { t } = useI18n();

const REGIONS = [
  { type: 'country', id: 'China', label: '中国' },
  { type: 'continent', id: 'Asia', label: '亚洲' },
  { type: 'world', id: '', label: '世界' },
];

const regionKey = ref('country:China');
const tab = ref<'current' | 'history'>('current');

const regionType = computed(() => regionKey.value.split(':')[0] ?? 'country');
const regionId = computed(() => regionKey.value.split(':')[1] ?? 'China');

setPageMeta({
  title: '官方纪录',
  crumbs: [{ label: '成绩', to: '/results' }, { label: '纪录' }],
  description: '本页面列出了所有 WCA 项目的各地区纪录，所有的成绩纪录源自 WCA 赛事的官方纪录。',
});

const currentState = useAsyncData(() =>
  wcaApi.getRecords({ regionType: regionType.value, regionId: regionId.value }),
);

const events = computed(() => sortEvents(currentState.data.value?.events ?? []));

type HistoryGroup = { single: RecordHistoryEntry[]; average: RecordHistoryEntry[] };
const historyMap = ref<Record<string, HistoryGroup>>({});
const historyLoading = ref(false);

async function loadHistory(): Promise<void> {
  const ids = events.value.map((e) => e.eventId);
  if (!ids.length) return;
  historyLoading.value = true;
  const map: Record<string, HistoryGroup> = {};
  await Promise.all(
    ids.map(async (eventId) => {
      try {
        const data = await wcaApi.getRecordHistory({
          regionType: regionType.value,
          regionId: regionId.value,
          eventId,
        });
        map[eventId] = { single: data.single ?? [], average: data.average ?? [] };
      } catch {
        map[eventId] = { single: [], average: [] };
      }
    }),
  );
  historyMap.value = map;
  historyLoading.value = false;
}

watch(events, () => void loadHistory(), { immediate: true });
watch([regionType, regionId], () => {
  historyMap.value = {};
  void currentState.reload();
});

const historyEvents = computed(() =>
  events.value.filter((e) => (historyMap.value[e.eventId]?.single?.length ?? 0) > 0),
);

function eventLabel(id: string, fallback?: string): string {
  return t(`event.${eventNameKey(id)}`, fallback ?? id);
}

function codeOf(entry: RecordEntry | RecordHistoryEntry | undefined): string {
  if (!entry) return '';
  return entry.recordCode ?? '';
}

function fullDate(y?: number | null, m?: number | null, d?: number | null): string {
  if (!y || !m || !d) return '';
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function latest(eventId: string, type: 'single' | 'average'): RecordHistoryEntry | undefined {
  return historyMap.value[eventId]?.[type]?.[0];
}
</script>

<template>
  <div class="col-lg-12">
    <form class="form-inline records-filter" @submit.prevent>
      <div class="form-group">
        <label>{{ t('common.Region', '地区') }}</label>
        <select v-model="regionKey" class="form-control">
          <option v-for="r in REGIONS" :key="`${r.type}:${r.id}`" :value="`${r.type}:${r.id}`">
            {{ r.label }}
          </option>
        </select>
      </div>
      <button
        type="button"
        class="btn"
        :class="tab === 'current' ? 'btn-warning' : 'btn-theme'"
        @click="tab = 'current'"
      >{{ t('Results.Current', '当前纪录') }}</button>
      <button
        type="button"
        class="btn"
        :class="tab === 'history' ? 'btn-warning' : 'btn-theme'"
        @click="tab = 'history'"
      >{{ t('Results.History', '历史纪录') }}</button>
    </form>

    <template v-if="tab === 'current'">
      <AppLoading v-if="currentState.loading.value" />
      <AppError v-else-if="currentState.error.value" :message="currentState.error.value" />
      <div v-else class="table-responsive">
        <table class="table table-bordered table-condensed table-hover table-boxed records-table">
          <thead>
            <tr>
              <th>{{ t('Results.Record', '纪录') }}</th>
              <th>{{ t('common.Single', '单次') }}</th>
              <th>{{ t('common.Average', '平均') }}</th>
              <th>{{ t('Results.Name', '姓名') }}</th>
              <th>{{ t('common.Region', '地区') }}</th>
              <th>{{ t('common.Competition', '比赛') }}</th>
              <th>{{ t('common.Date', '日期') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="ev in events" :key="ev.eventId">
              <tr class="event-row">
                <td colspan="7">
                  <i :class="eventIconClass(ev.eventId)"></i>
                  {{ eventLabel(ev.eventId, ev.eventName) }}
                </td>
              </tr>
              <tr>
                <td>{{ codeOf(ev.single[0]) }}</td>
                <td class="result-cell">
                  <RouterLink
                    v-if="ev.single[0]"
                    :to="`/results/person/${ev.single[0].personId}`"
                  >{{ formatResult(ev.single[0].result, ev.eventId) }}</RouterLink>
                </td>
                <td></td>
                <td>
                  <RouterLink
                    v-if="ev.single[0]"
                    :to="`/results/person/${ev.single[0].personId}`"
                  >{{ ev.single[0].personName }}</RouterLink>
                </td>
                <td>{{ ev.single[0] ? regionName(ev.single[0].countryId) : '' }}</td>
                <td>
                  <RouterLink
                    v-if="latest(ev.eventId, 'single')?.sourceCompetitionId"
                    :to="`/results/competition/${latest(ev.eventId, 'single')!.sourceCompetitionId}`"
                  >{{ latest(ev.eventId, 'single')?.sourceCompetitionName }}</RouterLink>
                  <span v-else-if="historyLoading" class="text-muted">…</span>
                </td>
                <td class="result-cell">
                  {{ fullDate(
                    latest(ev.eventId, 'single')?.sourceCompetitionYear,
                    latest(ev.eventId, 'single')?.sourceCompetitionMonth,
                    latest(ev.eventId, 'single')?.sourceCompetitionDay,
                  ) }}
                </td>
              </tr>
              <tr>
                <td>{{ codeOf(ev.average[0]) }}</td>
                <td></td>
                <td class="result-cell">
                  <RouterLink
                    v-if="ev.average[0]"
                    :to="`/results/person/${ev.average[0].personId}`"
                  >{{ formatResult(ev.average[0].result, ev.eventId) }}</RouterLink>
                </td>
                <td>
                  <RouterLink
                    v-if="ev.average[0]"
                    :to="`/results/person/${ev.average[0].personId}`"
                  >{{ ev.average[0].personName }}</RouterLink>
                </td>
                <td>{{ ev.average[0] ? regionName(ev.average[0].countryId) : '' }}</td>
                <td>
                  <RouterLink
                    v-if="latest(ev.eventId, 'average')?.sourceCompetitionId"
                    :to="`/results/competition/${latest(ev.eventId, 'average')!.sourceCompetitionId}`"
                  >{{ latest(ev.eventId, 'average')?.sourceCompetitionName }}</RouterLink>
                  <span v-else-if="historyLoading" class="text-muted">…</span>
                </td>
                <td class="result-cell">
                  {{ fullDate(
                    latest(ev.eventId, 'average')?.sourceCompetitionYear,
                    latest(ev.eventId, 'average')?.sourceCompetitionMonth,
                    latest(ev.eventId, 'average')?.sourceCompetitionDay,
                  ) }}
                </td>
              </tr>
            </template>
            <tr v-if="!events.length">
              <td colspan="7" class="text-center text-muted">{{ t('common.No data', '暂无数据') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template v-else>
      <AppLoading v-if="historyLoading && !historyEvents.length" />
      <div v-else class="table-responsive">
        <table
          v-for="ev in historyEvents"
          :key="ev.eventId"
          class="table table-bordered table-condensed table-hover table-boxed records-table"
        >
          <thead>
            <tr>
              <th colspan="5" class="event-head">
                <i :class="eventIconClass(ev.eventId)"></i>
                {{ eventLabel(ev.eventId, ev.eventName) }}
              </th>
            </tr>
            <tr>
              <th>{{ t('Results.Record', '纪录') }}</th>
              <th>{{ t('common.Result', '成绩') }}</th>
              <th>{{ t('Results.Name', '姓名') }}</th>
              <th>{{ t('common.Competition', '比赛') }}</th>
              <th>{{ t('common.Date', '日期') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, i) in [...(historyMap[ev.eventId]?.single ?? []), ...(historyMap[ev.eventId]?.average ?? [])]"
              :key="i"
            >
              <td>{{ item.recordCode }}</td>
              <td class="result-cell">{{ item.resultFormatted || formatResult(item.result, ev.eventId) }}</td>
              <td>
                <RouterLink :to="`/results/person/${item.personId}`">{{ item.personName }}</RouterLink>
              </td>
              <td>
                <RouterLink :to="`/results/competition/${item.sourceCompetitionId}`">
                  {{ item.sourceCompetitionName }}
                </RouterLink>
              </td>
              <td class="result-cell">
                {{ fullDate(item.sourceCompetitionYear, item.sourceCompetitionMonth, item.sourceCompetitionDay) }}
              </td>
            </tr>
            <tr v-if="!(historyMap[ev.eventId]?.single?.length)">
              <td colspan="5" class="text-center text-muted">{{ t('common.No data', '暂无数据') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.event-row td,
.event-head {
  font-weight: 700;
  background: #f5f8fb !important;
  color: #365d7e !important;
}
.event-row .event-icon,
.event-head .event-icon {
  margin-right: 6px;
}
</style>
