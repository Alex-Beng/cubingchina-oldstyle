import { ApiBase, requestJson, type RequestOptions } from './http';
import type {
  CompetitionResultsResponse,
  PersonBattleResponse,
  PersonHistory,
  PersonMiscResponse,
  PersonProfile,
  PersonRecordsResponse,
  PersonSearchResult,
  RankingsResponse,
  RecordsResponse,
  RecordHistoryResponse,
  StatisticsBlock,
  StatisticsIndex,
  SumOfRanksResponse,
  WcaCompetitionSummary,
} from './types/wca';

const LONG_TTL = 5 * 60_000;
const MEDIUM_TTL = 2 * 60_000;

export interface RankingsQuery {
  eventId: string;
  type: 'single' | 'average';
  regionType?: string;
  regionId?: string;
  gender?: string;
  page?: number;
  limit?: number;
}

export interface RecordsQuery {
  regionType?: string;
  regionId?: string;
  eventId?: string;
}

export const wcaApi = {
  getPerson(wcaId: string, options: RequestOptions = {}) {
    return requestJson<PersonProfile>(
      ApiBase.wca,
      `/person/${encodeURIComponent(wcaId)}`,
      { ...options, cacheTtlMs: options.cacheTtlMs ?? LONG_TTL },
    );
  },

  searchPersons(q: string, options: RequestOptions = {}) {
    return requestJson<{ results: PersonSearchResult[] }>(
      ApiBase.wca,
      '/person/search',
      {
        ...options,
        params: { q },
        cacheTtlMs: options.cacheTtlMs ?? MEDIUM_TTL,
      },
    );
  },

  getPersonHistory(wcaId: string, options: RequestOptions = {}) {
    return requestJson<PersonHistory>(
      ApiBase.wca,
      `/person/${encodeURIComponent(wcaId)}/history`,
      { ...options, cacheTtlMs: options.cacheTtlMs ?? LONG_TTL },
    );
  },

  getPersonCompetitions(wcaId: string, options: RequestOptions = {}) {
    return requestJson<{ data: WcaCompetitionSummary[] }>(
      ApiBase.wca,
      `/person/${encodeURIComponent(wcaId)}/competitions`,
      { ...options, cacheTtlMs: options.cacheTtlMs ?? LONG_TTL },
    );
  },

  getPersonRecords(wcaId: string, options: RequestOptions = {}) {
    return requestJson<PersonRecordsResponse>(
      ApiBase.wca,
      `/person/${encodeURIComponent(wcaId)}/records`,
      { ...options, cacheTtlMs: options.cacheTtlMs ?? LONG_TTL },
    );
  },

  getPersonMisc(wcaId: string, options: RequestOptions = {}) {
    return requestJson<PersonMiscResponse>(
      ApiBase.wca,
      `/person/${encodeURIComponent(wcaId)}/misc`,
      { ...options, cacheTtlMs: options.cacheTtlMs ?? LONG_TTL },
    );
  },

  getPersonBattle(wcaId: string, options: RequestOptions = {}) {
    return requestJson<PersonBattleResponse>(
      ApiBase.wca,
      `/person/battle/${encodeURIComponent(wcaId)}`,
      { ...options, cacheTtlMs: options.cacheTtlMs ?? MEDIUM_TTL },
    );
  },

  getRankings(query: RankingsQuery, options: RequestOptions = {}) {
    return requestJson<RankingsResponse>(ApiBase.wca, '/results/rankings', {
      ...options,
      params: {
        eventId: query.eventId,
        type: query.type,
        regionType: query.regionType,
        regionId: query.regionId,
        gender: query.gender,
        page: query.page,
        limit: query.limit,
      },
      cacheTtlMs: options.cacheTtlMs ?? MEDIUM_TTL,
    });
  },

  getRecords(query: RecordsQuery = {}, options: RequestOptions = {}) {
    return requestJson<RecordsResponse>(ApiBase.wca, '/results/records', {
      ...options,
      params: {
        regionType: query.regionType,
        regionId: query.regionId,
        eventId: query.eventId,
      },
      cacheTtlMs: options.cacheTtlMs ?? MEDIUM_TTL,
    });
  },

  getRecordHistory(query: RecordsQuery, options: RequestOptions = {}) {
    return requestJson<RecordHistoryResponse>(ApiBase.wca, '/results/records/history', {
      ...options,
      params: {
        regionType: query.regionType,
        regionId: query.regionId,
        eventId: query.eventId,
      },
      cacheTtlMs: options.cacheTtlMs ?? MEDIUM_TTL,
    });
  },

  getCompetitionResults(wcaId: string, options: RequestOptions = {}) {
    return requestJson<CompetitionResultsResponse>(
      ApiBase.wca,
      `/results/competition/${encodeURIComponent(wcaId)}`,
      { ...options, timeoutMs: 45_000, cacheTtlMs: options.cacheTtlMs ?? LONG_TTL },
    );
  },

  browseCompetitions(query: Record<string, unknown> = {}, options: RequestOptions = {}) {
    return requestJson<{ data: WcaCompetitionSummary[] }>(
      ApiBase.wca,
      '/competition/search',
      { ...options, params: query, cacheTtlMs: options.cacheTtlMs ?? MEDIUM_TTL },
    );
  },

  getStatisticsIndex(options: RequestOptions = {}) {
    return requestJson<StatisticsIndex>(ApiBase.wca, '/statistics', {
      ...options,
      timeoutMs: 40_000,
      cacheTtlMs: options.cacheTtlMs ?? 10 * 60_000,
    });
  },

  getStatisticBlock(blockId: string, options: RequestOptions = {}) {
    return requestJson<StatisticsBlock>(
      ApiBase.wca,
      `/statistics/${encodeURIComponent(blockId)}`,
      { ...options, cacheTtlMs: options.cacheTtlMs ?? 10 * 60_000 },
    );
  },

  getTop100(
    query: { type?: string; eventId?: string; regionType?: string; regionId?: string; gender?: string },
    options: RequestOptions = {},
  ) {
    return requestJson<StatisticsBlock>(ApiBase.wca, '/statistics/top-100', {
      ...options,
      params: query,
      cacheTtlMs: options.cacheTtlMs ?? 10 * 60_000,
    });
  },

  getSumOfRanks(query: Record<string, unknown> = {}, options: RequestOptions = {}) {
    return requestJson<SumOfRanksResponse>(ApiBase.wca, '/person/sum-of-ranks', {
      ...options,
      params: query,
      cacheTtlMs: options.cacheTtlMs ?? 10 * 60_000,
    });
  },
};
