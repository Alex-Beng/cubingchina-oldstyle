const CUBING_DIRECT = import.meta.env.VITE_CUBING_API_DIRECT === '1';
const CUBING_BASE = (import.meta.env.VITE_CUBING_API_BASE as string | undefined) || '/cubing-api';

export const ApiBase = {
  cubing: CUBING_DIRECT ? 'https://api.cubing.com' : CUBING_BASE,
  wca: (import.meta.env.VITE_WCA_API_BASE as string | undefined) || 'https://wca-api.cubing.com',
} as const;

export const CubingApiNeedsProxy = !CUBING_DIRECT;

export const ProxyNotConfigured =
  CubingApiNeedsProxy && /^\/cubing-api/.test(CUBING_BASE) && import.meta.env.PROD;

export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'notFound'
  | 'forbidden'
  | 'rateLimited'
  | 'server'
  | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly url: string;

  constructor(kind: ApiErrorKind, status: number, url: string, message?: string) {
    super(message ?? `API ${kind} (${status}) for ${url}`);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.url = url;
  }
}

export interface RequestOptions {
  params?: Record<string, unknown> | undefined;
  timeoutMs?: number;
  signal?: AbortSignal | undefined;
  cacheTtlMs?: number;
}

interface CacheEntry {
  expires: number;
  value: unknown;
}

const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TIMEOUT = 20_000;
const DEFAULT_CACHE_TTL = 60_000;

function buildUrl(base: string, path: string, params?: Record<string, unknown>): string {
  const raw = base + path;
  const url = new URL(raw, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(key, String(item));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function kindFromStatus(status: number): ApiErrorKind {
  if (status === 404) return 'notFound';
  if (status === 403 || status === 401) return 'forbidden';
  if (status === 429) return 'rateLimited';
  if (status >= 500) return 'server';
  return 'unknown';
}

export async function requestJson<T>(
  base: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(base, path, options.params);
  const ttl = options.cacheTtlMs ?? DEFAULT_CACHE_TTL;

  const cached = memoryCache.get(url);
  if (cached && cached.expires > Date.now()) {
    return cached.value as T;
  }

  const pending = inflight.get(url);
  if (pending) return pending as Promise<T>;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT,
  );

  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const task = (async (): Promise<T> => {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new ApiError(kindFromStatus(response.status), response.status, url);
      }
      const data = (await response.json()) as T;
      if (ttl > 0) {
        memoryCache.set(url, { expires: Date.now() + ttl, value: data });
      }
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ApiError('timeout', 0, url, `Request timed out: ${url}`);
      }
      throw new ApiError('network', 0, url, (err as Error)?.message);
    } finally {
      clearTimeout(timeoutId);
      inflight.delete(url);
    }
  })();

  inflight.set(url, task);
  return task;
}

export function clearApiCache(): void {
  memoryCache.clear();
  inflight.clear();
}

export function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.kind) {
      case 'notFound':
        return 'notFound';
      case 'forbidden':
        return 'forbidden';
      case 'rateLimited':
        return 'rateLimited';
      case 'timeout':
        return 'timeout';
      case 'network':
        return 'network';
      default:
        return 'server';
    }
  }
  return 'unknown';
}
