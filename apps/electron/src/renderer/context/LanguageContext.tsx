import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { en } from '../locales/en';
import type { Translations } from '../locales/en';
import { zh } from '../locales/zh';

type LanguageContextType = {
    language: 'en' | 'zh';
    setLanguage: (lang: 'en' | 'zh') => void;
    t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<'en' | 'zh'>('en');

    useEffect(() => {
        // Initial load
        window.electronAPI?.getUiLanguage?.().then(setLanguageState);

        // Listen to changes from other windows
        const unsubscribe = window.electronAPI?.onUiLanguageChange?.((lang) => {
            setLanguageState(lang);
        });
        return () => unsubscribe?.();
    }, []);

    const setLanguage = useCallback((lang: 'en' | 'zh') => {
        setLanguageState(lang);
        window.electronAPI?.setUiLanguage?.(lang);
    }, []);

    const t = useCallback((key: string): string => {
        const keys = key.split('.');
        let cur: any = language === 'zh' ? zh : en;
        for (const k of keys) {
            if (cur[k] === undefined) {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
            cur = cur[k];
        }
        return cur as string;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
}
