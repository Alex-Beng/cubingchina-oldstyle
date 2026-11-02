import type { Paginated } from '@/api/types/cubing';

type ListPayload<T> = Paginated<T> | T[] | { data: T[] } | null | undefined;

export function unwrapList<T>(payload: ListPayload<T>): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload.data) ? payload.data : [];
}

export function unwrapTotal<T>(payload: ListPayload<T>): number {
  if (!payload) return 0;
  if (Array.isArray(payload)) return payload.length;
  if ('total' in payload && typeof payload.total === 'number') return payload.total;
  return Array.isArray(payload.data) ? payload.data.length : 0;
}
