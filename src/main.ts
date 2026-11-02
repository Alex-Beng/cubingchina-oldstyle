import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { i18n, resolveInitialLocale, setLocale } from './i18n';
import { router } from './router';
import './styles/app.css';

const initial = resolveInitialLocale();
setLocale(initial);

createApp(App).use(createPinia()).use(router).use(i18n).mount('#app');
