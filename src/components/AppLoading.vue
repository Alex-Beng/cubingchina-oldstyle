<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="col-lg-12">
    <p class="text-center text-muted loading-block">
      <i class="fa fa-spinner fa-spin"></i>
      {{ t('common.Loading', '加载中…') }}
    </p>
  </div>
</template>
