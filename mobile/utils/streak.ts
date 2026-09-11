import type { JournalEntry } from '../services/api';

// El backend manda datetimes naive en UTC (sin sufijo "Z"), y new Date()
// en JS interpreta un string sin zona horaria como HORA LOCAL del
// dispositivo. Como el dato es UTC, hay que forzar esa interpretación
// explícitamente o el día calendario calculado quedaría mal según el
// huso horario del usuario. Se exporta porque dateRange.ts la reutiliza.
export function parseAsUtc(isoString: string): Date {
    const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(isoString);
    return new Date(hasTimezone ? isoString : `${isoString}Z`);
}

function localDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export type StreakInfo = {
    streak: number;
    hasEntryToday: boolean;
};

/**
 * Calcula la racha de días consecutivos con al menos una entrada,
 * usando el día calendario LOCAL del dispositivo (no UTC).
 *
 * La racha se cuenta hacia atrás desde hoy. Si hoy todavía no hay
 * ninguna entrada, se empieza a contar desde ayer en su lugar —así la
 * racha no aparece rota de golpe nada más cambiar de día, dando margen
 * a que el usuario escriba hoy antes de perderla (mismo patrón que
 * usan apps de hábitos tipo Duolingo).
 */
export function computeStreak(entries: JournalEntry[]): StreakInfo {
    if (entries.length === 0) {
        return { streak: 0, hasEntryToday: false };
    }

    const dateKeys = new Set(entries.map((e) => localDateKey(parseAsUtc(e.created_at))));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hasEntryToday = dateKeys.has(localDateKey(today));

    const cursor = new Date(today);
    if (!hasEntryToday) {
        cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;
    while (dateKeys.has(localDateKey(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }

    return { streak, hasEntryToday };
}