<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="col-lg-12">
    <div class="alert alert-warning">
      <p>{{ t('common.Under construction', '页面建设中') }}</p>
    </div>
  </div>
</template>
