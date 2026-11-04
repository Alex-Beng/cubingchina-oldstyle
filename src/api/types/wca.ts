export interface PersonProfile {
  person: {
    wcaId: string;
    name: string;
    gender: string;
    countryId: string;
    totalEvents: number;
    totalCompetitions: number;
    firstCompetition: { competitionId: string; date: string } | null;
    lastCompetition: { competitionId: string; date: string } | null;
    solveAttemptStats: { solves: number; attempts: number };
  };
  events: PersonEventSummary[];
  historyYears?: number[];
  sumOfRanks?: {
    single: RegionRankMap;
    average: RegionRankMap;
  };
  medalStats?: MedalCount;
  recordStats?: { wr: number; cr: number; nr: number; score: number };
  championshipMedals?: {
    world: MedalCount;
    continent: MedalCount;
    country: MedalCount;
    extra?: unknown[];
  };
  championshipPodiums?: ChampionshipPodiumGroup[];
  metPersons?: {
    count: number;
    worldRank: number;
    continentRank: number;
    countryRank: number;
  };
}

export interface MedalCount {
  gold: number;
  silver: number;
  bronze: number;
}

export interface RegionRankMap {
  country: { sum: number; rank: number };
  continent: { sum: number; rank: number };
  world: { sum: number; rank: number };
}

export interface ChampionshipPodiumResult {
  competitionId: string;
  eventId: string;
  competitionName: string;
  competitionNameZh?: string | null;
  competitionCountryId?: string;
  personCountryId?: string;
  date?: string;
  position: number;
  best: number;
  bestFormatted?: string;
  average: number;
  averageFormatted?: string;
  formatId?: string;
  regionalSingleRecord?: string | null;
  regionalAverageRecord?: string | null;
  attempts?: { attemptNumber: number; value: number; valueFormatted?: string }[];
}

export interface ChampionshipPodiumGroup {
  key: string;
  championshipType: string;
  results: ChampionshipPodiumResult[];
}


export interface PersonEventSummary {
  eventId: string;
  eventName: string;
  bestSingle: RankedResult | null;
  bestAverage: RankedResult | null;
  historyCount: number;
  medalStats: { gold: number; silver: number; bronze: number };
  solveAttemptStats: { solves: number; attempts: number };
}

export interface RankedResult {
  result: number;
  formatted: string;
  world: number;
  continent: number;
  country: number;
}

export interface PersonSearchResult {
  wcaId: string;
  name: string;
  gender: string;
  countryId: string;
}

export interface PersonHistoryEntry {
  competitionId: string;
  eventId: string;
  competitionName: string;
  competitionCountryId: string;
  personCountryId: string;
  date: string;
  roundTypeId: string;
  roundName: string;
  roundTypeRank: number;
  formatId: string;
  position: number;
  podiumPosition: number | null;
  best: number;
  bestFormatted?: string;
  average: number;
  averageFormatted?: string;
  [key: string]: unknown;
}

export interface PersonHistory {
  history: PersonHistoryEntry[];
}

export interface RankingResultRow {
  rank: number;
  personId: string;
  personName: string;
  countryId: string;
  countryName: string;
  result: number;
  resultFormatted: string;
  gender: string;
  worldRank: number;
  continentRank: number;
  countryRank: number;
  sourceCompetitionId: string;
  sourceCompetitionName: string;
  sourceCompetitionNameZh?: string;
  sourceCompetitionYear: number;
  sourceCompetitionMonth: number;
  sourceCompetitionDay: number;
  sourceCompetitionEndYear?: number;
  sourceCompetitionEndMonth?: number;
  sourceCompetitionEndDay?: number;
}

export interface RankingsResponse {
  eventId: string;
  eventName: string;
  type: 'single' | 'average' | string;
  regionType: string;
  regionId: string | null;
  regionName: string | null;
  results: RankingResultRow[];
  pagination?: {
    nextCursor: number | null;
    hasMore: boolean;
    count: number;
    total: number;
    limit: number;
    offset: number;
  };
}


export interface RecordEntry {
  rank: number;
  recordCode?: string;
  personId: string;
  personName: string;
  countryId: string;
  countryName: string;
  result: number;
  resultFormatted: string;
  gender: string;
  worldRank: number;
  continentRank: number;
  countryRank: number;
  sourceCompetitionId: string;
  sourceCompetitionName: string;
  sourceCompetitionNameZh?: string;
  sourceCompetitionYear: number;
  sourceCompetitionMonth: number;
  sourceCompetitionDay: number;
}

export interface RecordsResponse {
  regionType: string;
  regionId: string;
  regionName: string;
  events: {
    eventId: string;
    eventName: string;
    single: RecordEntry[];
    average: RecordEntry[];
  }[];
}

export interface RecordHistoryEntry {
  recordCode: string;
  personId: string;
  personName: string;
  countryId: string;
  countryName: string;
  result: number;
  resultFormatted?: string;
  gender?: string;
  competitionId?: string;
  competitionName?: string;
  competitionNameZh?: string;
  sourceCompetitionId?: string | null;
  sourceCompetitionName?: string | null;
  sourceCompetitionNameZh?: string | null;
  sourceCompetitionYear?: number | null;
  sourceCompetitionMonth?: number | null;
  sourceCompetitionDay?: number | null;
  sourceCompetitionEndYear?: number | null;
  sourceCompetitionEndMonth?: number | null;
  sourceCompetitionEndDay?: number | null;
  date?: string;
}


export interface RecordHistoryResponse {
  eventId: string;
  eventName: string;
  regionType: string;
  regionId: string;
  regionName: string;
  single: RecordHistoryEntry[];
  average: RecordHistoryEntry[];
}

export interface CompetitionResultsRound {
  roundTypeId: string;
  roundName: string;
  roundTypeRank: number;
  formatId: string;
  results: CompetitionResultRow[];
}

export interface CompetitionResultRow {
  position: number;
  personId: string;
  personName: string;
  personCountryId: string;
  best: number;
  bestFormatted: string;
  average: number;
  averageFormatted: string;
  attempts?: (number | string)[];
  [key: string]: unknown;
}

export interface CompetitionResultsEvent {
  eventId: string;
  eventName: string;
  eventRank: number;
  rounds: CompetitionResultsRound[];
}

export interface CompetitionResultsResponse {
  events: CompetitionResultsEvent[];
}

export interface StatisticsBlockColumn {
  key: string;
  kind: 'position' | 'person' | 'value' | 'competition' | string;
  highlight?: boolean;
}

export interface StatisticsBlockRow {
  position?: number;
  personId?: string;
  personName?: string;
  [key: string]: unknown;
}

export interface StatisticsBlock {
  id: string;
  title?: string;
  titleZh?: string;
  description?: string;
  descriptionZh?: string;
  columns: StatisticsBlockColumn[];
  rows: StatisticsBlockRow[];
  total?: number;
}

export interface StatisticsIndex {
  region: string;
  generatedAt: string;
  sections: {
    id: string;
    title?: string;
    titleZh?: string;
    blocks: { id: string; title?: string; titleZh?: string }[];
  }[];
}

export interface PersonRecordsResponse {
  world: PersonRecordGroup[];
  continent?: PersonRecordGroup[];
  country?: PersonRecordGroup[];
}

export interface PersonRecordGroup {
  eventId: string;
  eventName: string;
  results: RecordHistoryEntry[];
}

export interface PersonMiscResponse {
  closestCubers: { personId: string; personName: string; count: number }[];
  [key: string]: unknown;
}

export interface PersonBattleResponse {
  [key: string]: unknown;
}

export interface WcaCompetitionSummary {
  wcaId: string;
  name: string;
  countryId: string;
  countryName: string;
  cityName: string;
  places: { provinceCode?: string; cityCode?: string }[];
  startDate: string;
  endDate?: string | null;
  nameZh?: string;
}

export interface SumOfRanksResponse {
  type: string;
  scope: string;
  scopeId: string;
  gender: string;
  eventIds: string[];
  results: {
    rank: number;
    personId: string;
    personName: string;
    countryId?: string;
    [key: string]: unknown;
  }[];
}
