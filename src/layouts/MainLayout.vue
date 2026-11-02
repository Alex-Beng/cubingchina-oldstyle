<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import SiteHeader from './SiteHeader.vue';
import SiteNavibar from './SiteNavibar.vue';
import SiteFooter from './SiteFooter.vue';
import PageBreadcrumbs, { type Crumb } from './PageBreadcrumbs.vue';

const props = withDefaults(
  defineProps<{
    title?: string;
    crumbs?: Crumb[];
  }>(),
  { title: '', crumbs: () => [] },
);

const route = useRoute();
const { t } = useI18n();

const bodyClass = computed(() => {
  const controller = (route.meta.controller as string) ?? 'site';
  const action = (route.meta.action as string) ?? 'index';
  return `${controller} ${controller}-${action}`;
});

defineExpose({ bodyClass });
void props;
void t;
</script>

<template>
  <div class="wrapper">
    <SiteHeader />
    <SiteNavibar />
    <div class="content container">
      <div class="page-wrapper">
        <header v-if="title" class="page-heading clearfix">
          <h1 class="heading-title pull-left">{{ title }}</h1>
          <PageBreadcrumbs v-if="crumbs.length" :crumbs="crumbs" />
        </header>
        <div class="page-content">
          <div class="row page-row">
            <slot />
          </div>
        </div>
      </div>
    </div>
  </div>
  <SiteFooter />
</template>
