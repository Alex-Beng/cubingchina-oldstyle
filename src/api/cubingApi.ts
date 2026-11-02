import { ApiBase, requestJson, type RequestOptions } from './http';
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
  listCompetitions(query: CompetitionQuery = {}, options: RequestOptions = {}) {
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

  getCompetition(idOrAlias: string | number, options: RequestOptions = {}) {
    return requestJson<DbCompetitionDetail>(
      ApiBase.cubing,
      `/competitions/${encodeURIComponent(String(idOrAlias))}`,
      { ...options, cacheTtlMs: options.cacheTtlMs ?? LONG_TTL },
    );
  },

  getCompetitionSchedule(idOrAlias: string | number, options: RequestOptions = {}) {
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

  getCompetitionMeta(options: RequestOptions = {}) {
    return requestJson<CompetitionSearchMeta>(ApiBase.wca, '/competition/search/meta', {
      ...options,
      cacheTtlMs: options.cacheTtlMs ?? 24 * 60 * 60_000,
    });
  },

  listNews(page = 1, options: RequestOptions = {}) {
    return requestJson<Paginated<DbNews> | DbNews[]>(ApiBase.cubing, '/news', {
      ...options,
      params: { page },
      cacheTtlMs: options.cacheTtlMs ?? SHORT_TTL,
    });
  },

  getNews(aliasOrId: string | number, options: RequestOptions = {}) {
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

  listFaq(options: RequestOptions = {}) {
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

  listFaqCategories(options: RequestOptions = {}) {
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
