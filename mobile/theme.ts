export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };

export const shadow = {
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
};

export type ColorScheme = 'light' | 'dark';

export type ThemeColors = {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    background: string;
    card: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    warning: string;
    warningText: string;
    danger: string;
    success: string;
};

export const lightColors: ThemeColors = {
    primary: '#E97CA0',       // sakura pink
    primaryDark: '#D45C82',
    primaryLight: '#FFE8EF',
    background: '#FFF7F9',
    card: '#FFFFFF',
    border: '#F5D9E3',
    textPrimary: '#3A2530',
    textSecondary: '#9C8790',
    warning: '#FFF0DE',
    warningText: '#9A5B00',
    danger: '#E5484D',
    success: '#12B76A',
};

export const darkColors: ThemeColors = {
    primary: '#F0A8C1',       // sakura pink, más claro para contrastar sobre oscuro
    primaryDark: '#E97CA0',
    primaryLight: '#3D2530',
    background: '#221A1E',
    card: '#2E2429',
    border: '#3F3138',
    textPrimary: '#F5E9EE',
    textSecondary: '#B8A2AC',
    warning: '#4A3A24',
    warningText: '#F0C98A',
    danger: '#F27C81',
    success: '#4ADE95',
};

export function getColors(scheme: ColorScheme): ThemeColors {
    return scheme === 'dark' ? darkColors : lightColors;
}