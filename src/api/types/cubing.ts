export interface Paginated<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
}

export interface Place {
  provinceCode?: string;
  cityCode?: string;
  provinceName?: string;
  cityName?: string;
}

export interface DbUserBrief {
  id: number;
  name?: string;
  localName?: string;
  wcaId?: string;
  avatarUrl?: string;
}

export interface DbCompetition {
  id: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  type: string;
  wcaCompetitionId: string;
  mainEvent: string;
  oldCompetitionId: number;
  name: string;
  nameZh: string;
  alias: string;
  publicAccessKey: string | null;
  startDate: string;
  endDate: string | null;
  registrationStartTime?: string | null;
  registrationEndTime?: string | null;
  status?: string;
  locations?: CompetitionLocation[];
  events?: CompetitionEvent[];
  acceptedCount?: number;
  [key: string]: unknown;
}

export interface Venue {
  id?: number;
  name?: string;
  nameZh?: string;
  address?: string;
  addressZh?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CompetitionLocation {
  id: number;
  index: number;
  provinceCode?: string;
  cityCode?: string;
  regionIso2?: string;
  provinceName?: string;
  cityName?: string;
  venue: string;
  venueZh?: string;
  latitude?: number | null;
  longitude?: number | null;
  fee?: number;
  status?: string;
}

export interface CompetitionRole {
  id: number;
  userId: number;
  role: string;
  user: DbUserBrief;
}

export interface CompetitionEvent {
  id: number;
  eventId: string;
  roundCount: number;
  fee: number;
  competitorLimit?: number;
}

export interface CompetitionI18nAttribute {
  id: number;
  key: string;
  locale: string;
  value: string;
  [key: string]: unknown;
}

export interface ScheduleRow {
  id: number;
  scheduleType: string;
  roundId: number | null;
  eventId: string | null;
  activityType: string | null;
  name: string | null;
  nameZh: string | null;
  icon: string | null;
  attempt: number | null;
  group: string | null;
  startTime: string;
  endTime: string;
  venueId: number | null;
  round?: { roundTypeId?: string; name?: string; nameZh?: string } | null;
  venue?: { id: number; name?: string; nameZh?: string; color?: string } | null;
}

export interface DbCompetitionDetail extends DbCompetition {
  locations?: CompetitionLocation[];
  roles?: CompetitionRole[];
  events?: CompetitionEvent[];
  attributes?: Record<string, unknown> | unknown[];
  i18nAttributes?: CompetitionI18nAttribute[];
  competitorLimit?: number;
  information?: string;
  informationZh?: string;
  tba?: boolean;
  resultsPublishedAt?: string | null;
  special?: string | null;
  [key: string]: unknown;
}

export interface DbNews {
  id: number;
  createdAt: string;
  updatedAt: string;
  title: string;
  titleZh: string;
  content: string;
  contentJson?: unknown;
  contentZh: string;
  contentZhJson?: unknown;
  summary?: string;
  summaryZh?: string;
  alias: string;
  user?: DbUserBrief;
  userId?: number;
  competition?: DbCompetition | null;
  competitionId?: number | null;
  status?: string;
  type?: string;
  priority?: number;
  publishedAt?: string | null;
  [key: string]: unknown;
}

export interface OfficialEvent {
  id: number;
  eventId: string;
  name: string;
  nameZh: string;
  isActive: boolean;
  isOfficial: boolean;
  rank: number;
}

export interface FaqItem {
  id: number;
  title: string;
  titleZh: string;
  content: string;
  contentZh: string;
  alias?: string;
  categoryId?: number;
  [key: string]: unknown;
}

export interface FaqCategory {
  id: number;
  name: string;
  nameZh: string;
  [key: string]: unknown;
}

export interface CompetitionSearchMeta {
  years: number[];
  events: { id: string; name: string }[];
  [key: string]: unknown;
}

export interface RegistrationSummary {
  id: number;
  userId?: number;
  user?: DbUserBrief;
  wcaId?: string;
  status?: string;
  [key: string]: unknown;
}

export interface WcaCompetitionSummary {
  wcaId: string;
  name: string;
  countryId: string;
  countryName: string;
  cityName: string;
  places: Place[];
  startDate: string;
  endDate?: string | null;
  nameZh?: string;
}
