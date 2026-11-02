<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { wcaApi } from '@/api/wcaApi';
import { formatResult, stripNamePinyin } from '@/utils/format';
import { eventIconClass, eventNameKey } from '@/utils/events';
import AppLoading from '@/components/AppLoading.vue';
import AppError from '@/components/AppError.vue';

interface BattlePerson {
  person: { wcaId: string; name: string; countryId: string };
  events: {
    eventId: string;
    eventName: string;
    bestSingle?: { result: number; formatted: string } | null;
    bestAverage?: { result: number; formatted: string } | null;
  }[];
}

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const idsParam = computed(() =>
  decodeURIComponent(String(route.params.ids ?? ''))
    .toUpperCase()
    .split(/[-,]/)
    .map((s) => s.trim())
    .filter(Boolean),
);

const persons = ref<BattlePerson[]>([]);
const loading = ref(false);
const error = ref('');

async function load() {
  if (idsParam.value.length < 2) {
    error.value = 'needTwo';
    persons.value = [];
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const data = (await wcaApi.getPersonBattle(idsParam.value.join('-'))) as unknown as {
      persons: BattlePerson[];
    };
    persons.value = data.persons ?? [];
  } catch {
    error.value = 'unknown';
    persons.value = [];
  } finally {
    loading.value = false;
  }
}

watch(idsParam, () => void load(), { immediate: true });

const eventIds = computed(() => {
  const set = new Set<string>();
  for (const p of persons.value) for (const ev of p.events) set.add(ev.eventId);
  return [...set];
});

function bestOf(person: BattlePerson, eventId: string) {
  return person.events.find((e) => e.eventId === eventId)?.bestSingle ?? null;
}

function winner(person: BattlePerson, eventId: string): boolean {
  const values = persons.value
    .map((p) => bestOf(p, eventId)?.result ?? Infinity)
    .filter((v) => v > 0);
  if (!values.length) return false;
  const min = Math.min(...values);
  const mine = bestOf(person, eventId)?.result;
  return mine === min;
}

function eventLabel(id: string): string {
  return t(`event.${eventNameKey(id)}`, id);
}

function displayName(p: BattlePerson): string {
  return stripNamePinyin(p.person.name).display;
}

function swap() {
  void router.replace(`/results/battle/${idsParam.value.slice(0, 4).join('-')}`);
}
void swap;
</script>

<template>
  <div class="col-lg-12 results-battle">
    <AppLoading v-if="loading" />
    <AppError v-else-if="error === 'needTwo'" :message="t('common.Person', '选手')" />
    <AppError v-else-if="error" :message="error" />
    <template v-else-if="persons.length">
      <table class="table table-bordered table-condensed battle-table">
        <thead>
          <tr>
            <th>{{ t('common.Event', '项目') }}</th>
            <th v-for="p in persons" :key="p.person.wcaId">
              <RouterLink :to="`/results/person/${p.person.wcaId}`">{{ displayName(p) }}</RouterLink>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="eventId in eventIds" :key="eventId">
            <td>
              <i :class="eventIconClass(eventId)"></i>
              {{ eventLabel(eventId) }}
            </td>
            <td
              v-for="p in persons"
              :key="p.person.wcaId + eventId"
              class="result-cell"
              :class="{ winner: winner(p, eventId) }"
            >
              {{ bestOf(p, eventId) ? formatResult(bestOf(p, eventId)!.result, eventId) : '-' }}
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>

<style scoped>
.battle-table {
  text-align: center;
}
.battle-table td.winner {
  background: #eaf3ea;
  font-weight: 700;
  color: #3c763d;
}
</style>
