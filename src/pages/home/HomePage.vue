<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { cubingApi } from '@/api/cubingApi';
import { unwrapList, unwrapTotal } from '@/api/unwrap';
import { currentLocale } from '@/i18n';
import { formatDateTime } from '@/utils/format';
import { renderSummary } from '@/utils/markdown';
import { useAsyncData } from '@/composables/useAsyncData';
import AppError from '@/components/AppError.vue';
import AppLoading from '@/components/AppLoading.vue';
import AppPager from '@/components/AppPager.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const page = computed(() => {
  const raw = Number(route.params.page ?? route.query.page ?? 1);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
});

const newsState = useAsyncData(() => cubingApi.listNews(page.value));
const compsState = useAsyncData(() =>
  cubingApi.listCompetitions({ year: new Date().getFullYear() }),
);

const news = computed(() => unwrapList(newsState.data.value));
const total = computed(() => unwrapTotal(newsState.data.value));

const upcoming = computed(() => {
  const today = new Date().toISOString().slice(0, 10);
  return unwrapList(compsState.data.value)
    .filter((c) => (c.startDate ?? '') >= today)
    .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))
    .slice(0, 8);
});

function compTitle(c: { nameZh?: string; name?: string }): string {
  return currentLocale() === 'en' ? (c.name ?? '') : (c.nameZh || c.name || '');
}

function newsTitle(n: { titleZh?: string; title?: string }): string {
  return currentLocale() === 'en' ? (n.title ?? '') : (n.titleZh || n.title || '');
}

function newsBody(n: { contentZh?: string; content?: string; summaryZh?: string; summary?: string }): string {
  const isEn = currentLocale() === 'en';
  const raw = isEn ? (n.summary || n.content) : (n.summaryZh || n.contentZh);
  return renderSummary(raw ?? '', 220);
}

function pagerTo(p: number) {
  return { name: 'home', query: p > 1 ? { page: String(p) } : {} };
}

function monthLabel(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
}

function dayLabel(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return String(d.getDate()).padStart(2, '0');
}

void router;
</script>

<template>
  <div class="news-wrapper col-md-9 col-sm-8">
    <AppLoading v-if="newsState.loading.value" />
    <AppError v-else-if="newsState.error.value" :message="newsState.error.value" />
    <div v-else class="items">
      <article v-for="item in news" :key="item.id" class="events-item clearfix">
        <div class="panel panel-info">
          <div class="panel-heading">
            <h3 class="panel-title">
              <RouterLink :to="`/post/${item.alias}`">{{ newsTitle(item) }}</RouterLink>
            </h3>
          </div>
          <div class="panel-body">
            <p class="meta">
              <span class="date"><i class="fa fa-calendar"></i> {{ formatDateTime(item.createdAt) }}</span>
              <span v-if="item.user" class="author">
                <i class="fa fa-user"></i>
                {{ item.user.localName || item.user.name }}
              </span>
            </p>
            <div class="desc">{{ newsBody(item) }}</div>
          </div>
        </div>
      </article>
      <p v-if="!news.length" class="empty-hint">{{ t('common.No data', '暂无数据') }}</p>
    </div>
    <AppPager v-if="!newsState.loading.value && total > 10" :total="total" :page="page" :page-size="10" :to="pagerTo" />
  </div>

  <aside class="page-sidebar col-md-3 col-sm-4">
    <section v-if="upcoming.length" class="widget">
      <h3 class="title">{{ t('common.Upcoming Competitions', '即将开始的比赛') }}</h3>
      <article v-for="c in upcoming" :key="c.id" class="events-item row page-row">
        <div class="date-label-wrapper col-md-3 col-sm-4 col-xs-2">
          <p class="date-label">
            <span class="month">{{ monthLabel(c.startDate) }}</span>
            <span class="date-number">{{ dayLabel(c.startDate) }}</span>
          </p>
        </div>
        <div class="details col-md-9 col-sm-8 col-xs-10">
          <h5 class="title">
            <RouterLink :to="`/competition/${c.alias}`">{{ compTitle(c) }}</RouterLink>
          </h5>
          <p class="time text-muted">{{ c.startDate }}</p>
        </div>
      </article>
    </section>
  </aside>
</template>
