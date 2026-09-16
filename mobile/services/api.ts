import * as SecureStore from 'expo-secure-store';
import { resetToOnboardingWithSessionExpired } from '../navigation/navigationRef';

const API_URL = 'https://mindcheck-backend-h77p.onrender.com';

async function getTokenInternal() {
    return SecureStore.getItemAsync('access_token');
}

export async function getToken() {
    return getTokenInternal();
}

export class SessionExpiredError extends Error {
    constructor() {
        super('Your session expired. Please log in again.');
    }
}

export class NetworkError extends Error {
    constructor() {
        super('Could not reach the server. Check your connection and try again.');
    }
}

export class RateLimitError extends Error {
    constructor() {
        super("You're going too fast — please wait a moment and try again.");
    }
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
    try {
        return await fetch(url, init);
    } catch {
        throw new NetworkError();
    }
}

async function handleUnauthorized() {
    await SecureStore.deleteItemAsync('access_token');
    resetToOnboardingWithSessionExpired();
}

async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await getTokenInternal();
    const res = await safeFetch(`${API_URL}${path}`, {
        ...init,
        headers: {
            ...(init.headers || {}),
            Authorization: `Bearer ${token}`,
        },
    });

    if (res.status === 401) {
        await handleUnauthorized();
        throw new SessionExpiredError();
    }
    if (res.status === 429) {
        throw new RateLimitError();
    }

    return res;
}

export class AuthError extends Error {
    kind: 'email_in_use' | 'invalid_credentials' | 'weak_password' | 'generic';

    constructor(kind: AuthError['kind'], message: string) {
        super(message);
        this.kind = kind;
    }
}

export async function register(email: string, password: string) {
    const res = await safeFetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
        if (res.status === 429) {
            throw new RateLimitError();
        }
        if (res.status === 400) {
            throw new AuthError('email_in_use', 'This email is already in use.');
        }
        if (res.status === 422) {
            let detail: any = null;
            try {
                detail = (await res.json()).detail;
            } catch {
                // sin body legible -> mensaje genérico
            }
            const passwordIssue = Array.isArray(detail)
                ? detail.find((d: any) => Array.isArray(d.loc) && d.loc.includes('password'))
                : null;
            if (passwordIssue) {
                throw new AuthError('weak_password', 'Password must be at least 8 characters.');
            }
            throw new AuthError('generic', 'Please enter a valid email and password.');
        }
        throw new AuthError('generic', 'Could not create your account.');
    }

    const data = await res.json();
    await SecureStore.setItemAsync('access_token', data.access_token);
    return data;
}

export async function login(email: string, password: string) {
    const body = new URLSearchParams();
    body.append('username', email);
    body.append('password', password);

    const res = await safeFetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!res.ok) {
        if (res.status === 429) {
            throw new RateLimitError();
        }
        if (res.status === 401) {
            throw new AuthError('invalid_credentials', 'Email or password is incorrect.');
        }
        throw new AuthError('generic', 'Could not log in.');
    }

    const data = await res.json();
    await SecureStore.setItemAsync('access_token', data.access_token);
    return data;
}

export async function hasSession() {
    return (await getTokenInternal()) !== null;
}

export async function logout() {
    await SecureStore.deleteItemAsync('access_token');
}

export type CurrentUser = {
    email: string;
    created_at: string;
};

export async function getMe(): Promise<CurrentUser> {
    const res = await authorizedFetch('/auth/me');
    if (!res.ok) throw new Error('Could not load your account');
    return res.json();
}

export class PasswordChangeError extends Error {
    kind: 'wrong_current' | 'same_password' | 'weak_password' | 'generic';

    constructor(kind: PasswordChangeError['kind'], message: string) {
        super(message);
        this.kind = kind;
    }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await authorizedFetch('/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });

    if (!res.ok) {
        if (res.status === 400) {
            let detail: any = null;
            try {
                detail = (await res.json()).detail;
            } catch {
                // sin body legible -> mensaje genérico
            }
            if (detail === 'wrong_current_password') {
                throw new PasswordChangeError('wrong_current', 'Current password is incorrect.');
            }
            if (detail === 'same_password') {
                throw new PasswordChangeError('same_password', 'New password must be different from the current one.');
            }
            throw new PasswordChangeError('generic', 'Could not change your password.');
        }
        if (res.status === 422) {
            throw new PasswordChangeError('weak_password', 'New password must be at least 8 characters.');
        }
        throw new PasswordChangeError('generic', 'Could not change your password.');
    }
}

export type AnalyzeResult = {
    depression_score: number;
    suicide_risk_score: number;
    risk_score: number;
    category: string;
    high_risk: boolean;
};

export class AnalyzeError extends Error {
    kind: 'not_english' | 'too_short' | 'generic';
    wordCount?: number;
    minWords?: number;

    constructor(
        kind: 'not_english' | 'too_short' | 'generic',
        message: string,
        extra?: { wordCount?: number; minWords?: number }
    ) {
        super(message);
        this.kind = kind;
        this.wordCount = extra?.wordCount;
        this.minWords = extra?.minWords;
    }
}

async function preprocessText(text: string): Promise<string> {
    const res = await authorizedFetch('/preprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    });

    if (!res.ok) {
        let detail: any = null;
        try {
            detail = (await res.json()).detail;
        } catch {
            // sin body legible -> se queda como error generico
        }

        if (detail === 'not_english') {
            throw new AnalyzeError('not_english', 'Please write your entry in English.');
        }
        if (detail && typeof detail === 'object' && detail.error === 'too_short') {
            const missing = detail.min_words - detail.word_count;
            throw new AnalyzeError(
                'too_short',
                `Write a little more — about ${missing} more word${missing === 1 ? '' : 's'} and you're set.`,
                { wordCount: detail.word_count, minWords: detail.min_words }
            );
        }
        throw new AnalyzeError('generic', 'Could not analyze this entry');
    }

    const { cleaned_text } = await res.json();
    return cleaned_text;
}

export async function analyzeEntry(
    text: string,
    onProgress?: (p: { fileName: string; progress: number }) => void
): Promise<AnalyzeResult> {
    const cleanedText = await preprocessText(text);

    const { analyzeLocally, ensureModelsReady } = await import('../utils/riskAnalysis');
    await ensureModelsReady(onProgress);
    const scores = await analyzeLocally(cleanedText);

    const res = await authorizedFetch('/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, ...scores }),
    });

    if (!res.ok) {
        throw new AnalyzeError('generic', 'Could not save this entry');
    }

    return res.json();
}

export type JournalEntry = {
    id: number;
    text: string;
    depression_score: number;
    suicide_risk_score: number;
    risk_score: number;
    category: string;
    created_at: string;
};

export async function getEntries(): Promise<JournalEntry[]> {
    const res = await authorizedFetch('/entries');
    if (!res.ok) throw new Error('Could not load your history');
    return res.json();
}

export async function exportMyData(): Promise<unknown> {
    const res = await authorizedFetch('/account/export');
    if (!res.ok) throw new Error('Could not export your data');
    return res.json();
}

export async function deleteMyAccount(): Promise<void> {
    const res = await authorizedFetch('/account/', { method: 'DELETE' });
    if (!res.ok) throw new Error('Could not delete your account');
}