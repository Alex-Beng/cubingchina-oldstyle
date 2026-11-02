<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { wcaApi } from '@/api/wcaApi';
import { regionName } from '@/i18n';
import { formatResult } from '@/utils/format';
import { eventIconClass, eventNameKey } from '@/utils/events';
import { useAsyncData } from '@/composables/useAsyncData';
import AppLoading from '@/components/AppLoading.vue';
import AppError from '@/components/AppError.vue';

const { t } = useI18n();
const route = useRoute();

const competitionId = computed(() => String(route.params.id ?? ''));
const state = useAsyncData(() => wcaApi.getCompetitionResults(competitionId.value));

const events = computed(() =>
  [...(state.data.value?.events ?? [])].sort((a, b) => a.eventRank - b.eventRank),
);

const activeEvent = computed(() => state.data.value?.events?.[0]?.eventId ?? '');

function eventLabel(id: string, fallback: string): string {
  return t(`event.${eventNameKey(id)}`, fallback);
}

function isLong(eventId: string): boolean {
  return ['444bf', '555bf', '333mbf', '333fm'].includes(eventId);
}
void activeEvent;
void isLong;
void regionName;
</script>

<template>
  <div class="col-lg-12 results-competition">
    <AppLoading v-if="state.loading.value" />
    <AppError v-else-if="state.error.value" :message="state.error.value" />
    <template v-else>
      <div class="panel panel-info">
        <div class="panel-heading">
          <h3 class="panel-title">
            <a
              :href="`https://www.worldcubeassociation.org/competitions/${competitionId}`"
              target="_blank"
              rel="noopener"
            >{{ competitionId }}</a>
          </h3>
        </div>
      </div>

      <div v-for="ev in events" :key="ev.eventId" class="event-block">
        <h2>
          <i :class="eventIconClass(ev.eventId)"></i>
          {{ eventLabel(ev.eventId, ev.eventName) }}
        </h2>

        <div v-for="round in ev.rounds" :key="`${ev.eventId}-${round.roundTypeId}`" class="round-block">
          <h4>{{ round.roundName }}</h4>
          <table class="table table-bordered table-condensed table-responsive">
            <thead>
              <tr>
                <th class="rank-cell">#</th>
                <th>{{ t('common.Person', '选手') }}</th>
                <th>{{ t('common.Region', '地区') }}</th>
                <th class="result-cell">{{ t('common.Best', '单次') }}</th>
                <th class="result-cell">{{ t('common.Average', '平均') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in round.results" :key="`${row.personId}-${row.position}`">
                <td class="rank-cell">{{ row.position }}</td>
                <td>
                  <RouterLink class="person-link" :to="`/results/person/${row.personId}`">
                    {{ row.personName }}
                  </RouterLink>
                </td>
                <td>{{ regionName(row.personCountryId) }}</td>
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
      <p v-if="!events.length" class="empty-hint">{{ t('common.No data', '暂无数据') }}</p>
    </template>
  </div>
</template>

<style scoped>
.event-block {
  margin-bottom: 28px;
}
.round-block h4 {
  font-size: 15px;
  font-weight: 600;
  color: #6091ba;
}
</style>
