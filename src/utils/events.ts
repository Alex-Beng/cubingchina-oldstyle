export interface EventMeta {
  id: string;
  name: string;
  nameZhKey: string;
  iconClass: string;
  isOfficial: boolean;
  rank: number;
}

export const EVENTS: EventMeta[] = [
  { id: '333', name: '3x3x3 Cube', nameZhKey: '3x3x3 Cube', iconClass: 'event-icon-333', isOfficial: true, rank: 1 },
  { id: '222', name: '2x2x2 Cube', nameZhKey: '2x2x2 Cube', iconClass: 'event-icon-222', isOfficial: true, rank: 2 },
  { id: '444', name: '4x4x4 Cube', nameZhKey: '4x4x4 Cube', iconClass: 'event-icon-444', isOfficial: true, rank: 3 },
  { id: '555', name: '5x5x5 Cube', nameZhKey: '5x5x5 Cube', iconClass: 'event-icon-555', isOfficial: true, rank: 4 },
  { id: '666', name: '6x6x6 Cube', nameZhKey: '6x6x6 Cube', iconClass: 'event-icon-666', isOfficial: true, rank: 5 },
  { id: '777', name: '7x7x7 Cube', nameZhKey: '7x7x7 Cube', iconClass: 'event-icon-777', isOfficial: true, rank: 6 },
  { id: '333bf', name: '3x3x3 Blindfolded', nameZhKey: '3x3x3 Blindfolded', iconClass: 'event-icon-333bf', isOfficial: true, rank: 7 },
  { id: '333fm', name: '3x3x3 Fewest Moves', nameZhKey: '3x3x3 Fewest Moves', iconClass: 'event-icon-333fm', isOfficial: true, rank: 8 },
  { id: '333oh', name: '3x3x3 One-Handed', nameZhKey: '3x3x3 One-Handed', iconClass: 'event-icon-333oh', isOfficial: true, rank: 9 },
  { id: 'clock', name: 'Clock', nameZhKey: 'Clock', iconClass: 'event-icon-clock', isOfficial: true, rank: 10 },
  { id: 'minx', name: 'Megaminx', nameZhKey: 'Megaminx', iconClass: 'event-icon-minx', isOfficial: true, rank: 11 },
  { id: 'pyram', name: 'Pyraminx', nameZhKey: 'Pyraminx', iconClass: 'event-icon-pyram', isOfficial: true, rank: 12 },
  { id: 'skewb', name: 'Skewb', nameZhKey: 'Skewb', iconClass: 'event-icon-skewb', isOfficial: true, rank: 13 },
  { id: 'sq1', name: 'Square-1', nameZhKey: 'Square-1', iconClass: 'event-icon-sq1', isOfficial: true, rank: 14 },
  { id: '444bf', name: '4x4x4 Blindfolded', nameZhKey: '4x4x4 Blindfolded', iconClass: 'event-icon-444bf', isOfficial: true, rank: 15 },
  { id: '555bf', name: '5x5x5 Blindfolded', nameZhKey: '5x5x5 Blindfolded', iconClass: 'event-icon-555bf', isOfficial: true, rank: 16 },
  { id: '333mbf', name: '3x3x3 Multi-Blind', nameZhKey: '3x3x3 Multi-Blind', iconClass: 'event-icon-333mbf', isOfficial: true, rank: 17 },
];

const eventById = new Map(EVENTS.map((e) => [e.id, e]));

export function getEvent(eventId: string): EventMeta | undefined {
  return eventById.get(eventId);
}

export function eventIconClass(eventId: string): string {
  const ev = eventById.get(eventId);
  return ev ? `event-icon ${ev.iconClass}` : 'event-icon';
}

export function eventNameKey(eventId: string): string {
  return eventById.get(eventId)?.nameZhKey ?? eventId;
}

export function isLongEvent(eventId: string): boolean {
  return ['444bf', '555bf', '333mbf', '333fm'].includes(eventId);
}

export function sortEvents<T extends { eventId?: string; id?: string | number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aKey = typeof a.eventId === 'string' ? a.eventId : typeof a.id === 'string' ? a.id : '';
    const bKey = typeof b.eventId === 'string' ? b.eventId : typeof b.id === 'string' ? b.id : '';
    const aRank = eventById.get(aKey)?.rank ?? 99;
    const bRank = eventById.get(bKey)?.rank ?? 99;
    return aRank - bRank;
  });
}
