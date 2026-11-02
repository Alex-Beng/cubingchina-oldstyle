<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import SiteHeader from './SiteHeader.vue';
import SiteNavibar from './SiteNavibar.vue';
import SiteFooter from './SiteFooter.vue';
import PageBreadcrumbs from './PageBreadcrumbs.vue';
import { usePageMeta } from '@/composables/usePageMeta';

const props = withDefaults(
  defineProps<{
    title?: string;
    crumbs?: { label: string; to?: string }[];
  }>(),
  { title: '', crumbs: () => [] },
);

const route = useRoute();
const { t } = useI18n();
const meta = usePageMeta();

const effectiveTitle = computed(() => props.title || meta.title);
const effectiveCrumbs = computed(() =>
  props.crumbs.length ? props.crumbs : meta.crumbs,
);
const description = computed(() => (props.title ? '' : meta.description));

const bodyClass = computed(() => {
  const controller = (route.meta.controller as string) ?? 'site';
  const action = (route.meta.action as string) ?? 'index';
  return `${controller} ${controller}-${action}`;
});

defineExpose({ bodyClass });
void t;
</script>

<template>
  <div class="wrapper">
    <SiteHeader />
    <SiteNavibar />
    <div class="content container">
      <div class="page-wrapper">
        <header v-if="effectiveTitle" class="page-heading clearfix">
          <h1 class="heading-title pull-left">{{ effectiveTitle }}</h1>
          <PageBreadcrumbs :crumbs="effectiveCrumbs" />
        </header>
        <div class="page-content">
          <p v-if="description" class="page-description">{{ description }}</p>
          <div class="row page-row">
            <slot />
          </div>
        </div>
      </div>
    </div>
  </div>
  <SiteFooter />
</template>
