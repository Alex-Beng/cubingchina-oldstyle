<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { wcaApi } from '@/api/wcaApi';
import { formatResult } from '@/utils/format';
import { eventIconClass, eventNameKey, sortEvents } from '@/utils/events';
import { useAsyncData } from '@/composables/useAsyncData';
import AppLoading from '@/components/AppLoading.vue';
import AppError from '@/components/AppError.vue';
import AppPager from '@/components/AppPager.vue';
import type { RecordEntry } from '@/api/types/wca';

const { t } = useI18n();

const PAGE_SIZE = 100;
const regionType = ref('country');
const regionId = ref('China');
const tab = ref<'current' | 'history'>('current');
const page = ref(1);

const state = useAsyncData(() =>
  wcaApi.getRecords({ regionType: regionType.value, regionId: regionId.value }),
);

const events = computed(() => sortEvents(state.data.value?.events ?? []));

const pagedEvents = computed(() =>
  events.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
);

const regions = [
  { type: 'country', id: 'China', label: '中国' },
  { type: 'continent', id: 'Asia', label: '亚洲' },
  { type: 'world', id: '', label: '世界' },
];

function reload() {
  void state.reload();
}

function localRank(entry: RecordEntry): string {
  if (regionType.value === 'world') return entry.worldRank > 0 ? String(entry.worldRank) : '';
  if (regionType.value === 'continent') return entry.continentRank > 0 ? String(entry.continentRank) : '';
  return entry.countryRank > 0 ? String(entry.countryRank) : '';
}

function eventLabel(id: string, fallback: string): string {
  return t(`event.${eventNameKey(id)}`, fallback);
}
</script>

<template>
  <div class="col-lg-12 results-records">
    <div class="filter-bar clearfix">
      <div class="form-group pull-left">
        <label>{{ t('common.Region', '地区') }}</label>
        <select
          v-model="regionId"
          class="form-control input-sm"
          @change="regionType = regions.find((r) => r.id === regionId)?.type ?? 'country'; page = 1; reload()"
        >
          <option v-for="r in regions" :key="r.id" :value="r.id">{{ r.label }}</option>
        </select>
      </div>
      <ul class="nav nav-tabs pull-left">
        <li :class="{ active: tab === 'current' }">
          <a href="#" @click.prevent="tab = 'current'">{{ t('Results.Current', '当前纪录') }}</a>
        </li>
        <li :class="{ active: tab === 'history' }">
          <a href="#" @click.prevent="tab = 'history'">{{ t('Results.History', '历史纪录') }}</a>
        </li>
      </ul>
    </div>

    <AppLoading v-if="state.loading.value" />
    <AppError v-else-if="state.error.value" :message="state.error.value" />
    <template v-else>
      <div v-for="ev in pagedEvents" :key="ev.eventId" class="record-event">
        <h3>
          <i :class="eventIconClass(ev.eventId)"></i>
          {{ eventLabel(ev.eventId, ev.eventName) }}
        </h3>
        <table class="table table-bordered table-condensed">
          <thead>
            <tr>
              <th class="rank-cell">#</th>
              <th>{{ t('common.Single', '单次') }}</th>
              <th>{{ t('common.Person', '选手') }}</th>
              <th>{{ t('common.Single', '单次平均') }}</th>
              <th>{{ t('common.Person', '选手') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="rank-cell">{{ localRank(ev.single[0]) }}</td>
              <td class="result-cell">
                <RouterLink
                  v-if="ev.single[0]"
                  :to="`/results/competition/${ev.single[0].sourceCompetitionId}`"
                >{{ formatResult(ev.single[0].result, ev.eventId) }}</RouterLink>
              </td>
              <td>
                <RouterLink
                  v-if="ev.single[0]"
                  :to="`/results/person/${ev.single[0].personId}`"
                >{{ ev.single[0].personName }}</RouterLink>
              </td>
              <td class="result-cell">
                <RouterLink
                  v-if="ev.average[0]"
                  :to="`/results/competition/${ev.average[0].sourceCompetitionId}`"
                >{{ formatResult(ev.average[0].result, ev.eventId) }}</RouterLink>
              </td>
              <td>
                <RouterLink
                  v-if="ev.average[0]"
                  :to="`/results/person/${ev.average[0].personId}`"
                >{{ ev.average[0].personName }}</RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppPager
        v-if="events.length > PAGE_SIZE"
        :total="events.length"
        :page="page"
        :page-size="PAGE_SIZE"
        :to="() => ({ name: 'results-records' })"
      />
    </template>
  </div>
</template>

<style scoped>
.record-event {
  margin-bottom: 26px;
}
.record-event h3 {
  font-size: 16px;
  color: #6091ba;
  border-bottom: 1px solid #eee;
  padding-bottom: 6px;
}
</style>
