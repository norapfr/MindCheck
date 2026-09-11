import type { JournalEntry } from '../services/api';
import { parseAsUtc } from './streak';

export type RangeFilter = 'week' | 'month' | 'all';

export const RANGE_LABELS: Record<RangeFilter, string> = {
    week: 'Last 7 days',
    month: 'Last 30 days',
    all: 'All time',
};

/**
 * Filtra entradas por rango relativo a HOY, contando días naturales
 * completos en hora local (no UTC) — igual criterio que la racha.
 */
export function filterByRange(entries: JournalEntry[], range: RangeFilter): JournalEntry[] {
    if (range === 'all') return entries;

    const days = range === 'week' ? 7 : 30;

    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (days - 1)); // incluye el día de hoy dentro del rango

    return entries.filter((e) => parseAsUtc(e.created_at) >= cutoff);
}