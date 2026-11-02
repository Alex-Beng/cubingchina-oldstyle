<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { wcaApi } from '@/api/wcaApi';
import { regionName } from '@/i18n';
import AppLoading from '@/components/AppLoading.vue';
import AppError from '@/components/AppError.vue';
import type { PersonSearchResult } from '@/api/types/wca';
import { setPageMeta } from '@/composables/usePageMeta';

setPageMeta({
  title: '选手',
  crumbs: [{ label: '成绩', to: '/results' }, { label: '选手' }],
  description: '在这里你可以搜索 WCA 选手，输入姓名或 WCA ID 即可查询。',
});

const { t } = useI18n();
const router = useRouter();

const keyword = ref('');
const results = ref<PersonSearchResult[]>([]);
const loading = ref(false);
const error = ref('');
const searched = ref(false);

const isIdLike = computed(() => /^\d{4}[A-Z]{4}\d{2}$/i.test(keyword.value.trim()));

async function search() {
  const q = keyword.value.trim();
  if (!q) return;
  loading.value = true;
  error.value = '';
  searched.value = true;
  try {
    if (/^\d{4}[A-Z]{4}\d{2}$/i.test(q)) {
      void router.push(`/results/person/${q.toUpperCase()}`);
      return;
    }
    const data = await wcaApi.searchPersons(q);
    results.value = data.results ?? [];
  } catch {
    error.value = 'unknown';
    results.value = [];
  } finally {
    loading.value = false;
  }
}

function goPerson(wcaId: string) {
  void router.push(`/results/person/${wcaId}`);
}
</script>

<template>
  <div class="col-lg-12 results-person-list">
    <div class="filter-bar clearfix">
      <div class="form-group pull-left">
        <input
          v-model="keyword"
          class="form-control"
          :placeholder="t('common.Enter WCA ID or name', '输入WCA ID或姓名')"
          @keyup.enter="search"
        />
      </div>
      <button class="btn btn-primary pull-left" :disabled="loading" @click="search">
        {{ t('common.Search', '搜索') }}
      </button>
    </div>

    <AppLoading v-if="loading" />
    <AppError v-else-if="error" :message="error" />
    <table v-else-if="searched" class="table table-bordered table-condensed table-hover table-boxed table-responsive">
      <thead>
        <tr>
          <th>{{ t('common.Name', '姓名') }}</th>
          <th>{{ t('common.WCA ID', 'WCA ID') }}</th>
          <th>{{ t('common.Country', '国家/地区') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in results" :key="p.wcaId" class="clickable" @click="goPerson(p.wcaId)">
          <td><a class="person-link">{{ p.name }}</a></td>
          <td>{{ p.wcaId }}</td>
          <td>{{ regionName(p.countryId) }}</td>
        </tr>
        <tr v-if="!results.length">
          <td colspan="3" class="text-center text-muted">{{ t('common.No data', '暂无数据') }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty-hint">
      {{ t('common.Name, parts or WCA ID', '姓名或WCA ID') }}
      <span v-if="isIdLike"></span>
    </p>
  </div>
</template>

<style scoped>
.clickable {
  cursor: pointer;
}
</style>
