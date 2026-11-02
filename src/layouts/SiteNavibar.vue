<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, RouterLink } from 'vue-router';
import { buildNavItems, type NavItem } from '@/config/nav';
import { currentLocale } from '@/i18n';

const { t } = useI18n();
const route = useRoute();
const openDropdown = ref<string | null>(null);
const navOpen = ref(false);

const locale = computed(() => currentLocale());
const items = computed<NavItem[]>(() => buildNavItems(locale.value));

const colorful = computed(() => {
  const c = route.meta.controller as string | undefined;
  return c === 'competition' || c === 'live';
});

const controller = computed(() => (route.meta.controller as string) ?? 'site');
const action = computed(() => (route.meta.action as string) ?? 'index');

function isActive(item: NavItem): boolean {
  if (!item.activeWhen) return false;
  const controller = route.meta.controller as string | undefined;
  return !!controller && item.activeWhen.includes(controller);
}

function toggleDropdown(key: string) {
  openDropdown.value = openDropdown.value === key ? null : key;
}
</script>

<template>
  <nav class="main-nav" :class="{ colorful }" role="navigation">
    <div class="container">
      <div class="navbar-header" @click="navOpen = !navOpen">
        <button class="navbar-toggle" type="button">{{ t('common.Menu', '菜单') }}</button>
      </div>
      <div class="navbar-collapse" :class="{ collapse: !navOpen }" id="navbar-collapse">
        <ul class="nav navbar-nav" :class="[controller, `${controller}-${action}`]">
          <li class="nav-item archive-new-site">
            <a href="https://cubing.com" target="_blank" rel="noopener">
              <i class="fa fa-external-link"></i>
              {{ t('common.New Cubing China', '新版粗饼网') }}
            </a>
          </li>
          <li
            v-for="item in items"
            :key="item.key"
            class="nav-item"
            :class="{ dropdown: !!item.children, active: isActive(item), open: openDropdown === item.key }"
          >
            <template v-if="item.children">
              <a
                class="dropdown-toggle"
                href="#"
                @click.prevent="toggleDropdown(item.key)"
              >
                <i v-if="item.icon" class="fa" :class="`fa-${item.icon}`"></i>
                {{ t(item.label) }}
                <i class="fa fa-angle-down"></i>
              </a>
              <ul v-show="openDropdown === item.key" class="dropdown-menu">
                <li v-for="child in item.children" :key="child.key">
                  <RouterLink :to="child.to ?? '#'">
                    <i v-if="child.icon" class="fa" :class="`fa-${child.icon}`"></i>
                    {{ t(child.label) }}
                  </RouterLink>
                </li>
              </ul>
            </template>
            <RouterLink v-else :to="item.to ?? '/'">
              <i v-if="item.icon" class="fa" :class="`fa-${item.icon}`"></i>
              {{ t(item.label) }}
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>
