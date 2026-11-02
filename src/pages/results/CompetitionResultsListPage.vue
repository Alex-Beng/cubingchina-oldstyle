<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { wcaApi } from '@/api/wcaApi';
import { unwrapList } from '@/api/unwrap';
import AppLoading from '@/components/AppLoading.vue';
import { useAsyncData } from '@/composables/useAsyncData';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const PAGE_SIZE = 20;
const page = ref(1);
const keyword = ref('');

const state = useAsyncData(() => wcaApi.browseCompetitions({ countryId: 'China' }));

const all = computed(() => unwrapList(state.data.value));
const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  if (!q) return all.value;
  return all.value.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      (c.nameZh ?? '').toLowerCase().includes(q) ||
      c.wcaId.toLowerCase().includes(q),
  );
});
const paged = computed(() =>
  filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
);

function go(id: string) {
  void router.push(`/results/competition/${id}`);
}
void route;
void t;
</script>

<template>
  <div class="col-lg-12">
    <div class="filter-bar clearfix">
      <div class="form-group pull-left">
        <input
          v-model="keyword"
          class="form-control"
          :placeholder="t('common.Name, parts or WCA ID', '赛事名称或WCA ID')"
        />
      </div>
    </div>

    <AppLoading v-if="state.loading.value" />
    <table v-else class="table table-bordered table-condensed table-responsive">
      <thead>
        <tr>
          <th>{{ t('common.Competition', '比赛') }}</th>
          <th>{{ t('common.Date', '日期') }}</th>
          <th>{{ t('common.City', '城市') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in paged" :key="c.wcaId" class="clickable" @click="go(c.wcaId)">
          <td><a>{{ c.nameZh || c.name }}</a></td>
          <td class="result-cell">{{ c.startDate }}</td>
          <td>{{ c.cityName }}</td>
        </tr>
        <tr v-if="!paged.length">
          <td colspan="3" class="text-center text-muted">{{ t('common.No data', '暂无数据') }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.clickable {
  cursor: pointer;
}
</style>
