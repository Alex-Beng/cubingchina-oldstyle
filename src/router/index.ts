import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/home/HomePage.vue'),
    meta: { controller: 'site', action: 'index' },
  },
  {
    path: '/competition',
    name: 'competition-index',
    component: () => import('@/pages/competition/CompetitionListPage.vue'),
    meta: { controller: 'competition', action: 'index' },
  },
  {
    path: '/competition/:alias',
    name: 'competition-detail',
    component: () => import('@/pages/competition/CompetitionDetailPage.vue'),
    meta: { controller: 'competition', action: 'detail' },
  },
  {
    path: '/results',
    name: 'results-index',
    component: () => import('@/pages/results/ResultsIndexPage.vue'),
    meta: { controller: 'results', action: 'index' },
  },
  {
    path: '/results/person',
    name: 'results-person',
    component: () => import('@/pages/results/PersonListPage.vue'),
    meta: { controller: 'results', action: 'person' },
  },
  {
    path: '/results/person/:id',
    name: 'results-p',
    component: () => import('@/pages/results/PersonDetailPage.vue'),
    meta: { controller: 'results', action: 'p' },
  },
  {
    path: '/results/competition',
    name: 'results-competition',
    component: () => import('@/pages/results/CompetitionResultsListPage.vue'),
    meta: { controller: 'results', action: 'competition' },
  },
  {
    path: '/results/competition/:id',
    name: 'results-c',
    component: () => import('@/pages/results/CompetitionResultsPage.vue'),
    meta: { controller: 'results', action: 'c' },
  },
  {
    path: '/results/rankings',
    name: 'results-rankings',
    component: () => import('@/pages/results/RankingsPage.vue'),
    meta: { controller: 'results', action: 'rankings' },
  },
  {
    path: '/results/records',
    name: 'results-records',
    component: () => import('@/pages/results/RecordsPage.vue'),
    meta: { controller: 'results', action: 'records' },
  },
  {
    path: '/results/statistics/:name?',
    name: 'results-statistics',
    component: () => import('@/pages/results/StatisticsPage.vue'),
    meta: { controller: 'results', action: 'statistics' },
  },
  {
    path: '/results/battle/:ids',
    name: 'results-battle',
    component: () => import('@/pages/results/BattlePage.vue'),
    meta: { controller: 'results', action: 'battle' },
  },
  {
    path: '/faq/:categoryId?',
    name: 'faq',
    component: () => import('@/pages/faq/FaqPage.vue'),
    meta: { controller: 'faq', action: 'index' },
  },
  {
    path: '/post/:alias',
    name: 'post-detail',
    component: () => import('@/pages/post/PostDetailPage.vue'),
    meta: { controller: 'post', action: 'detail' },
  },
  {
    path: '/tools/luckyDraw',
    name: 'tools-lucky-draw',
    component: () => import('@/pages/tools/LuckyDrawPage.vue'),
    meta: { controller: 'tools', action: 'luckyDraw' },
  },
  {
    path: '/about.html',
    name: 'page-about',
    component: () => import('@/pages/site/StaticPage.vue'),
    props: { page: 'about' },
    meta: { controller: 'site', action: 'page' },
  },
  {
    path: '/contact.html',
    name: 'page-contact',
    component: () => import('@/pages/site/StaticPage.vue'),
    props: { page: 'contact' },
    meta: { controller: 'site', action: 'page' },
  },
  {
    path: '/links.html',
    name: 'page-links',
    component: () => import('@/pages/site/StaticPage.vue'),
    props: { page: 'links' },
    meta: { controller: 'site', action: 'page' },
  },
  {
    path: '/disclaimer.html',
    name: 'page-disclaimer',
    component: () => import('@/pages/site/StaticPage.vue'),
    props: { page: 'disclaimer' },
    meta: { controller: 'site', action: 'page' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/site/NotFoundPage.vue'),
    meta: { controller: 'site', action: 'error' },
  },
];

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved;
    if (to.path === from.path) return false;
    return { top: 0 };
  },
});

export function siteAsset(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/f/${path.replace(/^\//, '')}`;
}
