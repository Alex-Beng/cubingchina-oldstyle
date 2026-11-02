<script setup lang="ts">
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { cubingApi } from '@/api/cubingApi';
import { currentLocale } from '@/i18n';
import { formatDateTime } from '@/utils/format';
import { renderContent } from '@/utils/markdown';
import { useAsyncData } from '@/composables/useAsyncData';
import AppLoading from '@/components/AppLoading.vue';
import AppError from '@/components/AppError.vue';

const { t } = useI18n();
const route = useRoute();

const alias = computed(() => String(route.params.alias ?? ''));
const state = useAsyncData(() => cubingApi.getNews(alias.value));

watch(alias, () => void state.reload());

const news = computed(() => state.data.value);

const title = computed(() => {
  const n = news.value;
  if (!n) return '';
  return currentLocale() === 'en' ? n.title : n.titleZh || n.title;
});

const content = computed(() => {
  const n = news.value;
  if (!n) return '';
  return renderContent(currentLocale() === 'en' ? n.content : n.contentZh || n.content);
});
void t;
</script>

<template>
  <div class="news-wrapper col-lg-12">
    <AppLoading v-if="state.loading.value" />
    <AppError v-else-if="state.error.value" :message="state.error.value" />
    <article v-else-if="news" class="events-item clearfix">
      <div class="panel panel-info">
        <div class="panel-heading">
          <h3 class="panel-title">{{ title }}</h3>
        </div>
        <div class="panel-body">
          <p class="meta">
            <span class="date">
              <i class="fa fa-calendar"></i> {{ formatDateTime(news.createdAt) }}
            </span>
            <span v-if="news.user" class="author">
              <i class="fa fa-user"></i> {{ news.user.localName || news.user.name }}
            </span>
          </p>
          <div class="desc" v-html="content"></div>
        </div>
      </div>
    </article>
  </div>
</template>

<style scoped>
.desc :deep(img) {
  max-width: 100%;
  height: auto;
}
</style>
