import type { JournalEntry } from '../services/api';

const COLORS = {
    primary: '#E97CA0',
    primaryDark: '#D45C82',
    background: '#FFF7F9',
    card: '#FFFFFF',
    border: '#F5D9E3',
    textPrimary: '#3A2530',
    textSecondary: '#9C8790',
    danger: '#E5484D',
    moderate: '#C98A1F',
    success: '#12B76A',
};

function categoryColor(category: string): string {
    if (category === 'high') return COLORS.danger;
    if (category === 'moderate') return COLORS.moderate;
    return COLORS.success;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Mismo criterio de parseo UTC-safe que ya usamos en utils/streak.ts —
// el backend manda datetimes naive en UTC, sin sufijo "Z".
function formatDate(iso: string): string {
    const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(iso);
    const d = new Date(hasTimezone ? iso : `${iso}Z`);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function buildChartSvg(entries: JournalEntry[]): string {
    const width = 680;
    const height = 220;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    if (entries.length < 2) {
        return `<div style="text-align:center; color:${COLORS.textSecondary}; padding: 40px 0; font-size: 13px;">Not enough entries yet to show a trend chart.</div>`;
    }

    const stepX = plotWidth / (entries.length - 1);

    function pointsFor(getValue: (e: JournalEntry) => number): string {
        return entries
            .map((e, i) => {
                const x = paddingLeft + i * stepX;
                const y = paddingTop + (1 - getValue(e)) * plotHeight;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');
    }

    const depressionPoints = pointsFor((e) => e.depression_score);
    const suicidePoints = pointsFor((e) => e.suicide_risk_score);

    return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${paddingTop + plotHeight}" stroke="${COLORS.border}" stroke-width="1"/>
            <line x1="${paddingLeft}" y1="${paddingTop + plotHeight}" x2="${paddingLeft + plotWidth}" y2="${paddingTop + plotHeight}" stroke="${COLORS.border}" stroke-width="1"/>
            <text x="${paddingLeft - 8}" y="${paddingTop + 4}" font-size="10" fill="${COLORS.textSecondary}" text-anchor="end">1.0</text>
            <text x="${paddingLeft - 8}" y="${paddingTop + plotHeight + 4}" font-size="10" fill="${COLORS.textSecondary}" text-anchor="end">0.0</text>
            <polyline points="${depressionPoints}" fill="none" stroke="${COLORS.primary}" stroke-width="2.5"/>
            <polyline points="${suicidePoints}" fill="none" stroke="${COLORS.textSecondary}" stroke-width="2.5"/>
        </svg>
        <div style="display:flex; gap: 24px; justify-content:center; margin-top: 4px; font-size: 12px;">
            <span style="color:${COLORS.primary}; font-weight:600;">&#9679; Depression</span>
            <span style="color:${COLORS.textSecondary}; font-weight:600;">&#9679; Suicide risk</span>
        </div>
    `;
}

function buildEntryRow(entry: JournalEntry): string {
    const color = categoryColor(entry.category);
    return `
        <div style="border:1px solid ${COLORS.border}; border-radius:10px; padding:14px 16px; margin-bottom:12px; page-break-inside: avoid;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-size:12px; color:${COLORS.textSecondary};">${formatDate(entry.created_at)}</span>
                <span style="font-size:11px; font-weight:700; color:#fff; background:${color}; padding:2px 10px; border-radius:999px; text-transform:uppercase;">${entry.category}</span>
            </div>
            <p style="font-size:13px; line-height:1.5; color:${COLORS.textPrimary}; margin: 0 0 8px 0; white-space:pre-wrap;">${escapeHtml(entry.text)}</p>
            <div style="font-size:11px; color:${COLORS.textSecondary};">
                Depression: ${entry.depression_score.toFixed(2)} &nbsp;&middot;&nbsp;
                Suicide risk: ${entry.suicide_risk_score.toFixed(2)}
            </div>
        </div>
    `;
}

export function buildJournalReportHtml(params: {
    email: string;
    accountCreatedAt: string;
    entries: JournalEntry[];
}): string {
    const { email, accountCreatedAt, entries } = params;
    const generatedOn = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    return `
    <html>
        <head>
            <meta charset="utf-8" />
            <style>
                body { font-family: -apple-system, Helvetica, Arial, sans-serif; background:${COLORS.background}; color:${COLORS.textPrimary}; margin:0; padding: 32px; }
                h1 { font-size: 22px; margin: 0 0 4px 0; color:${COLORS.primaryDark}; }
                .subtitle { font-size: 13px; color:${COLORS.textSecondary}; margin-bottom: 24px; }
                .meta { font-size: 12px; color:${COLORS.textSecondary}; margin-bottom: 24px; }
                .section-title { font-size: 14px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:${COLORS.textSecondary}; margin: 28px 0 12px 0; }
                .chart-card { background:${COLORS.card}; border:1px solid ${COLORS.border}; border-radius:14px; padding:16px; }
                .disclaimer { margin-top: 32px; font-size: 11px; color:${COLORS.textSecondary}; line-height:1.5; border-top:1px solid ${COLORS.border}; padding-top:16px; }
            </style>
        </head>
        <body>
            <h1>MindCheck — Journal Report</h1>
            <div class="subtitle">${escapeHtml(email)} &middot; Member since ${formatDate(accountCreatedAt)}</div>
            <div class="meta">Generated on ${generatedOn} &middot; ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}</div>

            <div class="section-title">Mood trend</div>
            <div class="chart-card">${buildChartSvg(entries)}</div>

            <div class="section-title">Entries</div>
            ${entries.map(buildEntryRow).join('')}

            <div class="disclaimer">
                Depression and suicide risk scores are automated estimates produced by MindCheck's
                on-device model, based on the wording of each entry. They are not a clinical
                diagnosis and should be interpreted only as a starting point for conversation with
                a qualified professional. This report was generated at the user's request to
                support that conversation.
            </div>
        </body>
    </html>
    `;
}