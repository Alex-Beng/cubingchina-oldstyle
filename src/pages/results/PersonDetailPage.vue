<script setup lang="ts">
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, RouterLink } from 'vue-router';
import { wcaApi } from '@/api/wcaApi';
import { regionName } from '@/i18n';
import { formatDate, formatResult } from '@/utils/format';
import { eventIconClass, eventNameKey, sortEvents } from '@/utils/events';
import { useAsyncData } from '@/composables/useAsyncData';
import { setPageMeta } from '@/composables/usePageMeta';
import AppLoading from '@/components/AppLoading.vue';
import AppError from '@/components/AppError.vue';

const { t } = useI18n();
const route = useRoute();

const wcaId = computed(() => String(route.params.id ?? '').toUpperCase());

setPageMeta({
  title: '选手主页',
  crumbs: [{ label: '成绩', to: '/results' }, { label: '选手', to: '/results/person' }, { label: '选手主页' }],
});

const profile = useAsyncData(() => wcaApi.getPerson(wcaId.value));
const competitions = useAsyncData(() => wcaApi.getPersonCompetitions(wcaId.value));
const records = useAsyncData(() => wcaApi.getPersonRecords(wcaId.value));
const misc = useAsyncData(() => wcaApi.getPersonMisc(wcaId.value));

watch(wcaId, () => {
  void profile.reload();
  void competitions.reload();
  void records.reload();
  void misc.reload();
});

const person = computed(() => profile.data.value?.person ?? null);
const events = computed(() => sortEvents(profile.data.value?.events ?? []));

const displayName = computed(() => person.value?.name ?? '');

const careerRange = computed(() => {
  const p = person.value;
  if (!p?.firstCompetition || !p?.lastCompetition) return '';
  return `${formatDate(p.firstCompetition.date).replace(/-/g, '.')} - ${formatDate(
    p.lastCompetition.date,
  ).replace(/-/g, '.')}`;
});

const competitionCount = computed(
  () => person.value?.totalCompetitions ?? competitions.data.value?.data?.length ?? 0,
);

const recordGroups = computed(() => {
  const data = records.data.value;
  if (!data) return [];
  const labels: Record<string, string> = {
    world: '世界纪录',
    continent: '洲际纪录',
    country: '国家/地区纪录',
  };
  const groups: { scope: string; label: string; items: { eventId: string; eventName: string }[] }[] = [];
  for (const [scope, list] of Object.entries(data)) {
    if (!Array.isArray(list) || !list.length) continue;
    groups.push({
      scope,
      label: labels[scope] ?? scope,
      items: list.map((g) => ({ eventId: g.eventId, eventName: g.eventName })),
    });
  }
  return groups;
});

function eventLabel(eventId: string, fallback: string): string {
  return t(`event.${eventNameKey(eventId)}`, fallback);
}

function rankText(rank: number | undefined): string {
  if (!rank || rank <= 0) return '';
  return String(rank);
}

function medalText(count: number | undefined): string {
  return count && count > 0 ? String(count) : '';
}

function genderText(g: string | undefined): string {
  if (!g) return '';
  if (g === 'f') return t('common.Female', '女');
  if (g === 'm') return t('common.Male', '男');
  return '';
}
</script>

<template>
  <div class="col-lg-12 results-person" :data-person-id="wcaId">
    <AppLoading v-if="profile.loading.value" />
    <AppError v-else-if="profile.error.value" :message="profile.error.value" />
    <template v-else-if="person">
      <h1 class="text-center">{{ displayName }}</h1>

      <div class="panel panel-info person-detail">
        <div class="panel-body">
          <div class="row">
            <div class="col-md-4 col-sm-6 col-xs-12">
              <span class="info-title">{{ t('Results.Name', '姓名') }}:</span>
              <span class="info-value">{{ displayName }}</span>
            </div>
            <div class="col-md-4 col-sm-6 col-xs-12">
              <span class="info-title">{{ t('common.Region', '地区') }}:</span>
              <span class="info-value">{{ regionName(person.countryId) }}</span>
            </div>
            <div class="col-md-4 col-sm-6 col-xs-12">
              <span class="info-title">{{ t('Results.Competitions', '参赛次数') }}:</span>
              <span class="info-value">{{ competitionCount }}</span>
            </div>
            <div class="col-md-4 col-sm-6 col-xs-12">
              <span class="info-title">{{ t('common.WCA ID', 'WCA ID') }}:</span>
              <span class="info-value">
                <a
                  :href="`https://www.worldcubeassociation.org/persons/${wcaId}`"
                  target="_blank"
                  rel="noopener"
                ><i class="fa fa-trophy"></i> {{ wcaId }}</a>
              </span>
            </div>
            <div v-if="genderText(person.gender)" class="col-md-4 col-sm-6 col-xs-12">
              <span class="info-title">{{ t('common.Gender', '性别') }}:</span>
              <span class="info-value">{{ genderText(person.gender) }}</span>
            </div>
            <div v-if="careerRange" class="col-md-4 col-sm-6 col-xs-12">
              <span class="info-title">{{ t('Results.Career', '参赛经历') }}:</span>
              <span class="info-value">{{ careerRange }}</span>
            </div>
          </div>
        </div>
      </div>

      <h2>{{ t('Results.Current Personal Records', '个人最好成绩') }}</h2>
      <div class="table-responsive">
        <table class="table table-bordered table-condensed table-hover table-boxed">
          <thead>
            <tr>
              <th>{{ t('common.Event', '项目') }}</th>
              <th>{{ t('statistics.NR', '地区排名') }}</th>
              <th>{{ t('statistics.CR', '洲际排名') }}</th>
              <th>{{ t('statistics.WR', '世界排名') }}</th>
              <th>{{ t('common.Single', '单次') }}</th>
              <th>{{ t('common.Average', '平均') }}</th>
              <th>{{ t('statistics.WR', '世界排名') }}</th>
              <th>{{ t('statistics.CR', '洲际排名') }}</th>
              <th>{{ t('statistics.NR', '地区排名') }}</th>
              <th>{{ t('statistics.Gold', '金') }}</th>
              <th>{{ t('statistics.Silver', '银') }}</th>
              <th>{{ t('statistics.Bronze', '铜') }}</th>
              <th>{{ t('statistics.Solves/Attempts', '复原/尝试') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ev in events" :key="ev.eventId">
              <td>
                <RouterLink :to="`/results/rankings?event=${ev.eventId}`">
                  <i :class="eventIconClass(ev.eventId)"></i>
                  {{ eventLabel(ev.eventId, ev.eventName) }}
                </RouterLink>
              </td>
              <td>{{ rankText(ev.bestSingle?.country) }}</td>
              <td>{{ rankText(ev.bestSingle?.continent) }}</td>
              <td>{{ rankText(ev.bestSingle?.world) }}</td>
              <td class="result-cell">
                {{ ev.bestSingle ? formatResult(ev.bestSingle.result, ev.eventId) : '' }}
              </td>
              <td class="result-cell">
                {{ ev.bestAverage ? formatResult(ev.bestAverage.result, ev.eventId) : '' }}
              </td>
              <td>{{ rankText(ev.bestAverage?.world) }}</td>
              <td>{{ rankText(ev.bestAverage?.continent) }}</td>
              <td>{{ rankText(ev.bestAverage?.country) }}</td>
              <td>{{ medalText(ev.medalStats?.gold) }}</td>
              <td>{{ medalText(ev.medalStats?.silver) }}</td>
              <td>{{ medalText(ev.medalStats?.bronze) }}</td>
              <td>{{ ev.solveAttemptStats.solves }}/{{ ev.solveAttemptStats.attempts }}</td>
            </tr>
            <tr v-if="!events.length">
              <td colspan="13" class="text-center text-muted">{{ t('common.No data', '暂无数据') }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <template v-if="recordGroups.length">
        <h2>{{ t('Results.Overall Record Collection', '纪录汇总') }}</h2>
        <div v-for="group in recordGroups" :key="group.scope" class="record-group">
          <h4>{{ group.label }}</h4>
          <p>
            <RouterLink
              v-for="item in group.items"
              :key="item.eventId"
              :to="`/results/records?event=${item.eventId}`"
              class="record-link"
            >
              <i :class="eventIconClass(item.eventId)"></i>
              {{ eventLabel(item.eventId, item.eventName) }}
            </RouterLink>
          </p>
        </div>
      </template>

      <template v-if="competitions.data.value?.data?.length">
        <h2>{{ t('Results.Competition History', '参赛历史') }}</h2>
        <div class="table-responsive">
          <table class="table table-condensed table-hover table-bordered table-boxed">
            <tbody>
              <tr v-for="c in competitions.data.value.data" :key="c.wcaId">
                <td class="result-cell">{{ formatDate(c.startDate).replace(/-/g, '.') }}</td>
                <td>
                  <RouterLink :to="`/results/competition/${c.wcaId}`">
                    {{ c.nameZh || c.name }}
                  </RouterLink>
                </td>
                <td class="text-muted">{{ c.cityName }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-if="misc.data.value?.closestCubers?.length">
        <h2>{{ t('Results.Closest Cubers', '最亲密魔友') }}</h2>
        <ul class="list-inline">
          <li v-for="m in misc.data.value.closestCubers.slice(0, 20)" :key="m.personId">
            <RouterLink :to="`/results/person/${m.personId}`">{{ m.personName }}</RouterLink>
            <span class="text-muted">({{ m.count }})</span>
          </li>
        </ul>
      </template>
    </template>
  </div>
</template>

<style scoped>
.info-title {
  font-weight: 600;
  margin-right: 6px;
}
.record-group h4 {
  margin-top: 14px;
}
.record-link {
  margin-right: 12px;
  white-space: nowrap;
}
</style>
