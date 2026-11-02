<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="col-lg-8 col-lg-offset-2 col-xs-12 text-center">
    <h1 class="error-code">404</h1>
    <p class="lead">{{ t('common.Not found', '未找到') }}</p>
    <p>
      <RouterLink to="/" class="btn btn-primary">{{ t('common.Home', '首页') }}</RouterLink>
    </p>
  </div>
</template>

<style scoped>
.error-code {
  font-size: 96px;
  font-weight: 700;
  color: #6091ba;
  margin-bottom: 0;
}
</style>
