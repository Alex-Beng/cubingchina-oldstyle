<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { cubingApi } from '@/api/cubingApi';
import { unwrapList } from '@/api/unwrap';
import { currentLocale } from '@/i18n';
import { useAsyncData } from '@/composables/useAsyncData';
import AppLoading from '@/components/AppLoading.vue';
import AppError from '@/components/AppError.vue';
import { setPageMeta } from '@/composables/usePageMeta';

setPageMeta({
  title: '常见问题',
  crumbs: [{ label: 'FAQ' }],
});

const { t } = useI18n();
const route = useRoute();

const categoryId = computed(() => {
  const raw = route.params.categoryId;
  return raw ? Number(raw) : null;
});

const faqState = useAsyncData(() => cubingApi.listFaq());
const catState = useAsyncData(() => cubingApi.listFaqCategories());

const openId = ref<number | null>(null);

const categories = computed(() => unwrapList(catState.data.value));

const faqs = computed(() => {
  const all = unwrapList(faqState.data.value);
  if (!categoryId.value) return all;
  return all.filter((f) => f.categoryId === categoryId.value);
});

function catName(c: { nameZh?: string; name?: string }): string {
  return currentLocale() === 'en' ? (c.name ?? '') : (c.nameZh || c.name || '');
}

function faqTitle(f: { titleZh?: string; title?: string }): string {
  return currentLocale() === 'en' ? (f.title ?? '') : (f.titleZh || f.title || '');
}

function faqContent(f: { contentZh?: string; content?: string }): string {
  return currentLocale() === 'en' ? (f.content ?? '') : (f.contentZh || f.content || '');
}

function toggle(id: number) {
  openId.value = openId.value === id ? null : id;
}

watch(categoryId, () => {
  openId.value = null;
});
void t;
</script>

<template>
  <div class="content-wrapper col-md-10 col-sm-9">
    <AppLoading v-if="faqState.loading.value" />
    <AppError v-else-if="faqState.error.value" :message="faqState.error.value" />
    <div v-else class="panel-group" id="accordion">
      <div v-for="faq in faqs" :key="faq.id" class="panel panel-default">
        <div class="panel-heading">
          <h4 class="panel-title">
            <a href="#" :class="{ collapsed: openId !== faq.id }" @click.prevent="toggle(faq.id)">
              {{ faqTitle(faq) }}
            </a>
          </h4>
        </div>
        <div v-show="openId === faq.id" class="panel-collapse">
          <div class="panel-body" v-html="faqContent(faq)"></div>
        </div>
      </div>
      <p v-if="!faqs.length" class="empty-hint">{{ t('common.No data', '暂无数据') }}</p>
    </div>
  </div>

  <aside class="page-sidebar col-md-2 col-sm-3">
    <section class="widget">
      <ul class="nav">
        <li>
          <RouterLink to="/faq">{{ t('common.All', '全部') }}</RouterLink>
        </li>
        <li v-for="c in categories" :key="c.id">
          <RouterLink :to="`/faq/${c.id}`">{{ catName(c) }}</RouterLink>
        </li>
      </ul>
    </section>
  </aside>
</template>
