import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorScheme, ThemeColors, getColors } from '../theme';

const STORAGE_KEY = 'mindcheck_color_scheme';

type ThemeContextValue = {
    scheme: ColorScheme;
    colors: ThemeColors;
    isDark: boolean;
    toggleScheme: () => void;
    setScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [scheme, setSchemeState] = useState<ColorScheme>('light');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((value) => {
            if (value === 'light' || value === 'dark') setSchemeState(value);
            setLoaded(true);
        });
    }, []);

    function setScheme(next: ColorScheme) {
        setSchemeState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => { });
    }

    function toggleScheme() {
        setScheme(scheme === 'dark' ? 'light' : 'dark');
    }

    const value = useMemo<ThemeContextValue>(() => ({
        scheme,
        colors: getColors(scheme),
        isDark: scheme === 'dark',
        toggleScheme,
        setScheme,
    }), [scheme]);

    if (!loaded) return null;

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
    return ctx;
}