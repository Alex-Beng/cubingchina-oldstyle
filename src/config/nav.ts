import type { Locale } from '@/i18n';

export interface NavItem {
  key: string;
  label: string;
  icon?: string;
  to?: string;
  external?: string;
  activeWhen?: string[];
  children?: NavItem[];
}

export function buildNavItems(_locale: Locale): NavItem[] {
  return [
    {
      key: 'home',
      label: 'common.Home',
      icon: 'home',
      to: '/',
    },
    {
      key: 'competitions',
      label: 'common.Competitions',
      icon: 'cubes',
      to: '/competition',
      activeWhen: ['competition'],
    },
    {
      key: 'results',
      label: 'common.Results',
      icon: 'newspaper-o',
      activeWhen: ['results'],
      children: [
        { key: 'persons', label: 'common.Persons', icon: 'users', to: '/results/person' },
        {
          key: 'competitions',
          label: 'Competitions.Competitions',
          icon: 'archive',
          to: '/results/competition',
        },
        { key: 'rankings', label: 'common.Rankings', icon: 'trophy', to: '/results/rankings' },
        { key: 'records', label: 'common.Records', icon: 'flag-checkered', to: '/results/records' },
        {
          key: 'statistics',
          label: 'common.Statistics',
          icon: 'bar-chart',
          to: '/results/statistics',
        },
      ],
    },
    {
      key: 'tools',
      label: 'common.Tools',
      icon: 'wrench',
      children: [
        { key: 'luckyDraw', label: 'common.Lucky Draw', icon: 'gift', to: '/tools/luckyDraw' },
      ],
    },
    {
      key: 'more',
      label: 'common.More Info',
      icon: 'info-circle',
      children: [
        { key: 'faq', label: 'common.FAQ', icon: 'question-circle', to: '/faq' },
        { key: 'about', label: 'common.About', icon: 'file-text-o', to: '/about.html' },
        { key: 'contact', label: 'common.Contact', icon: 'pencil-square-o', to: '/contact.html' },
        { key: 'links', label: 'common.Links', icon: 'link', to: '/links.html' },
        {
          key: 'disclaimer',
          label: 'common.Disclaimer',
          icon: 'list-alt',
          to: '/disclaimer.html',
        },
      ],
    },
  ];
}
