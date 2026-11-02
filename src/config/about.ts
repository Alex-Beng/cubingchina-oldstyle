import links from '../data/links.json';

export interface AboutLink {
  name: string;
  name_zh?: string;
  url: string;
  logo?: string;
  description?: string;
  description_zh?: string;
  separator?: boolean;
}

export const aboutSideNav = [
  { key: 'about', label: 'common.About', path: '/about.html' },
  { key: 'contact', label: 'common.Contact', path: '/contact.html' },
  { key: 'links', label: 'common.Links', path: '/links.html' },
  { key: 'disclaimer', label: 'common.Disclaimer', path: '/disclaimer.html' },
];

export const aboutLinks = links as AboutLink[];
