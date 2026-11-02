<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { LOCALES, currentLocale, setLocale, type Locale } from '@/i18n';
import { siteAsset } from '@/router';

const { t } = useI18n();
const router = useRouter();

const locale = computed(() => currentLocale());

const logo = computed(() =>
  siteAsset(currentLocale() === 'en' ? 'images/logo-en.png' : 'images/logo.png'),
);

function switchLocale(next: Locale) {
  setLocale(next);
  const query = { ...router.currentRoute.value.query };
  delete query.lang;
  void router.replace({ query });
}
</script>

<template>
  <header class="header">
    <div class="header-main container">
      <h1 class="logo col-md-4 col-sm-4">
        <RouterLink to="/"><img id="logo" :src="logo" alt="Cubing China" width="220" /></RouterLink>
      </h1>
      <div class="info col-md-8 col-sm-8 hidden-xs">
        <ul class="menu-top navbar-right">
          <li
            v-for="(item, index) in LOCALES"
            :key="item.code"
            :class="{ divider: index < LOCALES.length - 1 }"
          >
            <a
              href="#"
              :class="{ active: item.code === locale }"
              @click.prevent="switchLocale(item.code)"
            >{{ item.label }}</a>
          </li>
        </ul>
        <br />
        <div class="contact pull-right">
          <p class="email">
            <a href="https://cubing.com" target="_blank" rel="noopener">
              <i class="fa fa-external-link"></i>
              {{ t('common.New Cubing China', '新版粗饼网') }}
            </a>
          </p>
          <p class="phone">
            <a
              href="https://github.com/Alex-Beng/cubingchina-oldstyle"
              target="_blank"
              rel="noopener"
            >
              <i class="fa fa-github"></i>
              GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
  </header>
</template>
