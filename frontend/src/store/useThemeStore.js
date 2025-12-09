import { create } from 'zustand';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';

// Unified, balanced palettes with semantic tokens for consistent UI
const THEMES = {
    light: {
        name: 'Light',
        // base
        bg: '#ffffff',
        text: '#0b1220',
        muted: '#6b7280',
        // surfaces
        surface: '#ffffff',
        secondary: '#f5f7fb',
        border: '#e5e7eb',
        input: '#ffffff',
        // accent
        accent: '#6366f1',
        accentContrast: '#ffffff',
        // chat specifics
        bubbleIn: '#6366f1',
        bubbleOut: '#ffffff'
    },
    dark: {
        name: 'Dark',
        bg: '#0b1020',
        text: '#e5e7eb',
        muted: '#9ca3af',
        surface: '#111827',
        secondary: '#0f172a',
        border: '#1f2937',
        input: '#0f172a',
        accent: '#8b5cf6',
        accentContrast: '#ffffff',
        bubbleIn: '#8b5cf6',
        bubbleOut: '#111827'
    },
    blue: {
        name: 'Ocean',
        // Deep desaturated blue background (distinct from dark)
        bg: '#0a1526',
        text: '#e6edf7',
        muted: '#9fb0c9',
        surface: '#0e223d',
        secondary: '#0b1b31',
        border: '#143352',
        input: '#0e223d',
        accent: '#3b82f6',
        accentContrast: '#ffffff',
        bubbleIn: '#2563eb',
        bubbleOut: '#0e223d'
    },
    purple: {
        name: 'Plum',
        // Warm purple tones distinct from dark/blue
        bg: '#1a1532',
        text: '#f2ecff',
        surface: '#221b46',
        secondary: '#1a1532',
        border: '#332b62',
        input: '#221b46',
        accent: '#a78bfa',
        bubbleIn: '#8b5cf6',
        bubbleOut: '#221b46'
    },
    // Extra distinct palettes (available in selector via Object.entries)
    forest: {
        name: 'Forest',
        bg: '#0f1a14',
        text: '#e7f5ed',
        muted: '#b7d8c7',
        surface: '#15231b',
        secondary: '#0f1a14',
        border: '#274334',
        input: '#15231b',
        accent: '#34d399',
        accentContrast: '#ffffff',
        bubbleIn: '#10b981',
        bubbleOut: '#15231b'
    },
    rose: {
        name: 'Rose',
        bg: '#1f1418',
        text: '#feeaf0',
        muted: '#f8cdda',
        surface: '#2a1a21',
        secondary: '#1f1418',
        border: '#4a2b36',
        input: '#2a1a21',
        accent: '#f472b6',
        accentContrast: '#ffffff',
        bubbleIn: '#ec4899',
        bubbleOut: '#2a1a21'
    },
    amber: {
        name: 'Amber',
        bg: '#1f1705',
        text: '#fff7ed',
        muted: '#fde68a',
        surface: '#2a1e08',
        secondary: '#1f1705',
        border: '#4a3710',
        input: '#2a1e08',
        accent: '#f59e0b',
        accentContrast: '#ffffff',
        bubbleIn: '#d97706',
        bubbleOut: '#2a1e08'
    },
    teal: {
        name: 'Teal',
        bg: '#071a18',
        text: '#e6fffb',
        muted: '#99f6e4',
        surface: '#0b2623',
        secondary: '#071a18',
        border: '#14433e',
        input: '#0b2623',
        accent: '#14b8a6',
        accentContrast: '#ffffff',
        bubbleIn: '#0d9488',
        bubbleOut: '#0b2623'
    },
    slate: {
        name: 'Slate',
        bg: '#0f1620',
        text: '#e2e8f0',
        muted: '#a3b2c5',
        surface: '#151f2b',
        secondary: '#0f1620',
        border: '#253244',
        input: '#151f2b',
        accent: '#64748b',
        accentContrast: '#ffffff',
        bubbleIn: '#475569',
        bubbleOut: '#151f2b'
    },
    // Requested 2025 palettes
    mocha: { // Mocha Mousse
        name: 'Mocha Mousse',
        bg: '#1a1411',
        text: '#f7efe9',
        muted: '#e0cfc4',
        surface: '#241b17',
        secondary: '#1a1411',
        border: '#3a2b24',
        input: '#241b17',
        accent: '#8b5a44',
        accentContrast: '#ffffff',
        bubbleIn: '#6d4433',
        bubbleOut: '#241b17'
    },
    auraIndigo: { // Aura Indigo
        name: 'Aura Indigo',
        bg: '#0f1226',
        text: '#e9ebff',
        muted: '#c5c9ff',
        surface: '#151a3b',
        secondary: '#0f1226',
        border: '#262e62',
        input: '#151a3b',
        accent: '#6366f1',
        accentContrast: '#ffffff',
        bubbleIn: '#4f46e5',
        bubbleOut: '#151a3b'
    },
    dill: { // Dill Green
        name: 'Dill Green',
        bg: '#0e1a14',
        text: '#e9fff4',
        muted: '#bfead5',
        surface: '#12261c',
        secondary: '#0e1a14',
        border: '#224536',
        input: '#12261c',
        accent: '#22c55e',
        accentContrast: '#ffffff',
        bubbleIn: '#16a34a',
        bubbleOut: '#12261c'
    },
    sunny: { // Sunny Yellow
        name: 'Sunny Yellow',
        bg: '#191300',
        text: '#fffceb',
        muted: '#fde68a',
        surface: '#231b02',
        secondary: '#191300',
        border: '#3b2d05',
        input: '#231b02',
        accent: '#f59e0b',
        accentContrast: '#ffffff',
        bubbleIn: '#d97706',
        bubbleOut: '#231b02'
    },
    verdant: { // Verdant Green
        name: 'Verdant Green',
        bg: '#0b1710',
        text: '#e9fff1',
        muted: '#c2f0d6',
        surface: '#0f2218',
        secondary: '#0b1710',
        border: '#1f4331',
        input: '#0f2218',
        accent: '#34d399',
        accentContrast: '#ffffff',
        bubbleIn: '#10b981',
        bubbleOut: '#0f2218'
    },
    lavender: { // Digital Lavender
        name: 'Digital Lavender',
        bg: '#151425',
        text: '#f3f0ff',
        muted: '#ddd6fe',
        surface: '#1d1c34',
        secondary: '#151425',
        border: '#2a284b',
        input: '#1d1c34',
        accent: '#a78bfa',
        accentContrast: '#ffffff',
        bubbleIn: '#8b5cf6',
        bubbleOut: '#1d1c34'
    },
    cherry: { // Cherry Red
        name: 'Cherry Red',
        bg: '#20090c',
        text: '#ffeef0',
        muted: '#fecdd3',
        surface: '#2b0c10',
        secondary: '#20090c',
        border: '#4a1620',
        input: '#2b0c10',
        accent: '#ef4444',
        accentContrast: '#ffffff',
        bubbleIn: '#dc2626',
        bubbleOut: '#2b0c10'
    }
};

const getTimeBasedTheme = (preferences) => {
    if (!preferences.timeBased) {
        return preferences.globalTheme || 'dark';
    }

    const hour = new Date().getHours();
    
    if (hour >= 0 && hour < 12) {
        return preferences.morningTheme || 'light';
    } else if (hour >= 12 && hour < 18) {
        return preferences.afternoonTheme || 'blue';
    } else {
        return preferences.nightTheme || 'dark';
    }
};

export const useThemeStore = create((set, get) => ({
    currentTheme: 'dark',
    preferences: {
        timeBased: false,
        globalTheme: 'dark',
        morningTheme: 'light',
        afternoonTheme: 'blue',
        nightTheme: 'dark'
    },
    themes: THEMES,
    isLoading: false,

    // Apply theme to document
    applyTheme: (themeName) => {
        const theme = THEMES[themeName] || THEMES.dark;
        document.documentElement.className = `theme-${themeName}`;
        // Base
        document.documentElement.style.setProperty('--bg', theme.bg);
        document.documentElement.style.setProperty('--text', theme.text);
        document.documentElement.style.setProperty('--muted', theme.muted);
        // Surfaces
        document.documentElement.style.setProperty('--surface', theme.surface);
        document.documentElement.style.setProperty('--secondary', theme.secondary);
        // Borders (support both legacy --border and new --border-color)
        document.documentElement.style.setProperty('--border', theme.border);
        document.documentElement.style.setProperty('--border-color', theme.border);
        document.documentElement.style.setProperty('--input', theme.input);
        // Accent
        document.documentElement.style.setProperty('--accent', theme.accent);
        document.documentElement.style.setProperty('--accent-contrast', theme.accentContrast);
        // Chat specifics
        document.documentElement.style.setProperty('--bubble-in', theme.bubbleIn);
        document.documentElement.style.setProperty('--bubble-out', theme.bubbleOut);
        set({ currentTheme: themeName });
    },

    // Fetch theme preferences from backend
    fetchThemePreferences: async () => {
        try {
            set({ isLoading: true });
            const response = await axiosInstance.get('/auth/theme');
            const prefs = response.data.themePreferences;
            
            set({ preferences: prefs });
            
            // Apply the correct theme based on time or global setting
            const themeToApply = getTimeBasedTheme(prefs);
            get().applyTheme(themeToApply);
            
        } catch (error) {
            console.error('Error fetching theme preferences:', error);
            // Apply default theme on error
            get().applyTheme('dark');
        } finally {
            set({ isLoading: false });
        }
    },

    // Update theme preferences
    updateThemePreferences: async (newPreferences) => {
        try {
            set({ isLoading: true });
            const response = await axiosInstance.put('/auth/theme', newPreferences);
            const prefs = response.data.themePreferences;
            
            set({ preferences: prefs });
            
            // Apply the new theme immediately
            const themeToApply = getTimeBasedTheme(prefs);
            get().applyTheme(themeToApply);
            
            toast.success('Theme preferences saved!');
        } catch (error) {
            console.error('Error updating theme preferences:', error);
            toast.error('Failed to save theme preferences');
        } finally {
            set({ isLoading: false });
        }
    },

    // Set a specific theme (for manual override)
    setTheme: (themeName) => {
        get().applyTheme(themeName);
    },

    // Check and update theme based on time (for time-based themes)
    checkTimeBasedTheme: () => {
        const { preferences } = get();
        if (preferences.timeBased) {
            const themeToApply = getTimeBasedTheme(preferences);
            if (themeToApply !== get().currentTheme) {
                get().applyTheme(themeToApply);
            }
        }
    }
}));
