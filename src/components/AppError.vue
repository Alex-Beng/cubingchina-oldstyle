<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ProxyNotConfigured } from '@/api/http';

const props = withDefaults(defineProps<{ message?: string }>(), { message: '' });
const { t } = useI18n();

const text = computed(() => {
  switch (props.message) {
    case 'notFound':
      return t('common.Not found', '未找到');
    case 'forbidden':
      return t('common.Access denied', '无权访问');
    case 'rateLimited':
      return t('common.Too many requests', '请求过于频繁，请稍后再试');
    case 'timeout':
      return t('common.Request timed out', '请求超时，请稍后再试');
    case 'network':
      return t('common.Network error', '网络错误，请检查网络连接');
    case 'server':
      return t('common.Server error', '服务器错误，请稍后再试');
    case 'unknown':
      return t('common.Something goes wrong', '出错了');
    default:
      return props.message;
  }
});

const showProxyHint = computed(() => ProxyNotConfigured);
</script>

<template>
  <div class="col-lg-12">
    <div class="alert alert-danger">
      <p>{{ text }}</p>
      <p v-if="showProxyHint" class="small mb-0">
        {{
          t(
            'common.Proxy not configured',
            '数据服务尚未配置。请通过 Cloudflare Worker 代理访问 api.cubing.com，并在构建时设置 VITE_CUBING_API_BASE。',
          )
        }}
      </p>
    </div>
  </div>
</template>
