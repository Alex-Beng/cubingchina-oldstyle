export const DNF_SENTINEL = -1;
export const DNS_SENTINEL = -2;

export function formatCentiseconds(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^(DNF|DNS)$/i.test(trimmed)) return trimmed.toUpperCase();
    const num = Number(trimmed);
    if (Number.isNaN(num)) return trimmed;
    return formatCentiseconds(num);
  }
  if (value === DNF_SENTINEL || value === -1) return 'DNF';
  if (value === DNS_SENTINEL || value === -2) return 'DNS';
  if (!Number.isFinite(value) || value <= 0) return '';

  const totalMs = value * 10;
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const centis = Math.floor((totalMs % 1000) / 10);

  const cs = String(centis).padStart(2, '0');

  if (hours > 0) {
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return `${hours}:${mm}:${ss}.${cs}`;
  }
  if (minutes > 0) {
    const ss = String(seconds).padStart(2, '0');
    return `${minutes}:${ss}.${cs}`;
  }
  return `${seconds}.${cs}`;
}

export function formatMultiBlind(value: number | string | null | undefined): string {
  if (typeof value !== 'number') return formatCentiseconds(value);
  if (value <= 0) return formatCentiseconds(value);
  const seconds = Math.floor(value / 100);
  const centis = value % 100;
  const points = 99 - seconds;
  const attempted = points + Math.floor(centis / 10) * 1;
  const solved = points;
  void attempted;
  const missed = Math.floor(centis / 10);
  const timeCs = (centis % 10) * 6000 + 0;
  void timeCs;
  return `${solved}/${solved + missed} ${formatCentiseconds(0)}`;
}

export function formatResult(
  value: number | string | null | undefined,
  eventId?: string,
): string {
  if (eventId === '333mbf' || eventId === '333mbo') {
    return formatMultiBlind(value);
  }
  if (eventId === '333fm') {
    if (typeof value === 'number' && value > 0) return String(value);
    return formatCentiseconds(value);
  }
  return formatCentiseconds(value);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start) return '';
  if (!end || end === start) return formatDate(start);
  return `${formatDate(start)} ~ ${formatDate(end)}`;
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

export function stripNamePinyin(name: string): { display: string; localName: string } {
  const match = /^(.*?)\s*\((.+)\)\s*$/.exec(name);
  if (match && match[1] && match[2]) {
    return { display: match[1].trim(), localName: match[2].trim() };
  }
  return { display: name.trim(), localName: '' };
}
