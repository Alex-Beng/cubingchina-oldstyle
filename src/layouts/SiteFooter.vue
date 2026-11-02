<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const year = new Date().getFullYear();
void t;
</script>

<template>
  <footer class="footer">
    <div class="bottom-bar">
      <div class="container">
        <div class="row">
          <small class="copyright col-md-6 col-sm-12 col-xs-12">
            Copyright @ {{ year }} {{ t('common.Cubing China', '粗饼·中国魔方赛事网') }} ·
            <a href="https://cubing.com" target="_blank" rel="noopener">
              {{ t('common.New Cubing China', '新版粗饼网') }}
            </a>
          </small>
          <ul class="social pull-right col-md-6 col-sm-12 col-xs-12">
            <li class="row-end">
              <a href="https://v1.cubing.com/feed" target="_blank" rel="noopener" title="RSS">
                <i class="fa fa-rss"></i>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </footer>
</template>
