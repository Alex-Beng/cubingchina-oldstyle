import { ApiBase, requestJson, type RequestOptions } from './http';
import { readSnapshot } from './snapshot';
import type {
  CompetitionSearchMeta,
  DbCompetition,
  DbCompetitionDetail,
  DbNews,
  FaqCategory,
  FaqItem,
  OfficialEvent,
  Paginated,
  RegistrationSummary,
} from './types/cubing';

const LONG_TTL = 5 * 60_000;
const SHORT_TTL = 60_000;

export interface CompetitionQuery {
  year?: string | number;
  type?: string;
  province?: string;
  event?: string;
  page?: number;
  pageSize?: number;
  status?: string;
}

export const cubingApi = {
  async listCompetitions(query: CompetitionQuery = {}, options: RequestOptions = {}) {
    const canFilterLocally = !query.page && !query.pageSize && !query.status;
    if (canFilterLocally && query.year) {
      const snapshot = await readSnapshot<Paginated<DbCompetition> | DbCompetition[]>(
        `competitions/${query.year}.json`,
      );
      if (snapshot) {
        const items = Array.isArray(snapshot) ? snapshot : snapshot.data ?? [];
        const filtered = items.filter((competition) => {
          if (query.type && competition.type !== query.type) return false;
          if (
            query.event &&
            !(competition.events ?? []).some((event) => event.eventId === query.event)
          ) {
            return false;
          }
          if (query.province) {
            const match = (competition.locations ?? []).some(
              (location) =>
                location.provinceName === query.province ||
                location.provinceCode === query.province,
            );
            if (!match) return false;
          }
          return true;
        });
        if (Array.isArray(snapshot)) return filtered;
        return { ...snapshot, data: filtered, total: filtered.length };
      }
    }
    return requestJson<Paginated<DbCompetition> | DbCompetition[]>(
      ApiBase.cubing,
      '/competitions',
      {
        ...options,
        params: {
          year: query.year,
          type: query.type,
          province: query.province,
          event: query.event,
          page: query.page,
          pageSize: query.pageSize,
          status: query.status,
        },
        cacheTtlMs: options.cacheTtlMs ?? SHORT_TTL,
      },
    );
  },

  async getCompetition(idOrAlias: string | number, options: RequestOptions = {}) {
    const snapshot = await readSnapshot<DbCompetitionDetail>(
      `competition/${encodeURIComponent(String(idOrAlias))}.json`,
    );
    if (snapshot) return snapshot;
    return requestJson<DbCompetitionDetail>(
      ApiBase.cubing,
      `/competitions/${encodeURIComponent(String(idOrAlias))}`,
      { ...options, cacheTtlMs: options.cacheTtlMs ?? LONG_TTL },
    );
  },

  async getCompetitionSchedule(idOrAlias: string | number, options: RequestOptions = {}) {
    const snapshot = await readSnapshot<unknown>(
      `schedule/${encodeURIComponent(String(idOrAlias))}.json`,
    );
    if (snapshot) return snapshot;
    return requestJson<unknown>(
      ApiBase.cubing,
      `/competitions/${encodeURIComponent(String(idOrAlias))}/schedule`,
      { ...options, cacheTtlMs: options.cacheTtlMs ?? LONG_TTL },
    );
  },

  getCompetitionRegistrations(idOrAlias: string | number, options: RequestOptions = {}) {
    return requestJson<RegistrationSummary[] | Paginated<RegistrationSummary>>(
      ApiBase.cubing,
      `/competitions/${encodeURIComponent(String(idOrAlias))}/registrations`,
      { ...options, cacheTtlMs: options.cacheTtlMs ?? SHORT_TTL },
    );
  },

  getCompetitionWcif(idOrAlias: string | number, options: RequestOptions = {}) {
    return requestJson<unknown>(
      ApiBase.cubing,
      `/competitions/${encodeURIComponent(String(idOrAlias))}/wcif`,
      { ...options, cacheTtlMs: options.cacheTtlMs ?? LONG_TTL },
    );
  },

  async getCompetitionMeta(options: RequestOptions = {}) {
    const snapshot = await readSnapshot<CompetitionSearchMeta>('competition-meta.json');
    if (snapshot) return snapshot;
    return requestJson<CompetitionSearchMeta>(ApiBase.wca, '/competition/search/meta', {
      ...options,
      cacheTtlMs: options.cacheTtlMs ?? 24 * 60 * 60_000,
    });
  },

  async listNews(page = 1, options: RequestOptions = {}) {
    const snapshot = await readSnapshot<Paginated<DbNews> | DbNews[]>(`news/page-${page}.json`);
    if (snapshot) return snapshot;
    return requestJson<Paginated<DbNews> | DbNews[]>(ApiBase.cubing, '/news', {
      ...options,
      params: { page },
      cacheTtlMs: options.cacheTtlMs ?? SHORT_TTL,
    });
  },

  async getNews(aliasOrId: string | number, options: RequestOptions = {}) {
    const snapshot = await readSnapshot<DbNews>(
      `post/${encodeURIComponent(String(aliasOrId))}.json`,
    );
    if (snapshot) return snapshot;
    return requestJson<DbNews>(
      ApiBase.cubing,
      `/news/${encodeURIComponent(String(aliasOrId))}`,
      { ...options, cacheTtlMs: options.cacheTtlMs ?? LONG_TTL },
    );
  },

  getOfficialEvents(options: RequestOptions = {}) {
    return requestJson<OfficialEvent[]>(ApiBase.cubing, '/events/official', {
      ...options,
      cacheTtlMs: options.cacheTtlMs ?? 24 * 60 * 60_000,
    });
  },

  async listFaq(options: RequestOptions = {}) {
    const snapshot = await readSnapshot<Paginated<FaqItem> | FaqItem[]>('faq.json');
    if (snapshot) return snapshot;
    return requestJson<Paginated<FaqItem> | FaqItem[]>(ApiBase.cubing, '/faq', {
      ...options,
      cacheTtlMs: options.cacheTtlMs ?? 24 * 60 * 60_000,
    });
  },

  getFaq(aliasOrId: string | number, options: RequestOptions = {}) {
    return requestJson<FaqItem>(
      ApiBase.cubing,
      `/faq/${encodeURIComponent(String(aliasOrId))}`,
      { ...options, cacheTtlMs: options.cacheTtlMs ?? LONG_TTL },
    );
  },

  async listFaqCategories(options: RequestOptions = {}) {
    const snapshot = await readSnapshot<Paginated<FaqCategory> | FaqCategory[]>(
      'faq-categories.json',
    );
    if (snapshot) return snapshot;
    return requestJson<Paginated<FaqCategory> | FaqCategory[]>(
      ApiBase.cubing,
      '/faq-categories',
      { ...options, cacheTtlMs: options.cacheTtlMs ?? 24 * 60 * 60_000 },
    );
  },

  getLivePodiums(idOrAlias: string | number, options: RequestOptions = {}) {
    return requestJson<{ data: unknown }>(
      ApiBase.cubing,
      `/competitions/${encodeURIComponent(String(idOrAlias))}/live/podiums`,
      { ...options, cacheTtlMs: options.cacheTtlMs ?? SHORT_TTL },
    );
  },

  getLiveSumOfRanks(idOrAlias: string | number, options: RequestOptions = {}) {
    return requestJson<{ data: unknown }>(
      ApiBase.cubing,
      `/competitions/${encodeURIComponent(String(idOrAlias))}/live/statistics/sum-of-ranks`,
      { ...options, cacheTtlMs: options.cacheTtlMs ?? SHORT_TTL },
    );
  },
};
