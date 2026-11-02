import { reactive } from 'vue';

export interface Crumb {
  label: string;
  to?: string;
}

interface PageMetaState {
  title: string;
  crumbs: Crumb[];
  description: string;
}

const state = reactive<PageMetaState>({
  title: '',
  crumbs: [],
  description: '',
});

export function setPageMeta(meta: {
  title?: string;
  crumbs?: Crumb[];
  description?: string;
}): void {
  state.title = meta.title ?? '';
  state.crumbs = meta.crumbs ?? [];
  state.description = meta.description ?? '';
}

export function clearPageMeta(): void {
  state.title = '';
  state.crumbs = [];
  state.description = '';
}

export function usePageMeta(): PageMetaState {
  return state;
}
