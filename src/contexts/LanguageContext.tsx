import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {type Language, deviceLanguage, translate} from '../i18n';

const STORAGE_KEY = '@bakle_language';

export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** UI 문구 번역. t('some.key') / t('key', {name}) */
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * 앱 언어(ko/en) 관리. 기본은 기기 로케일(한국→ko, 그 외→en), 사용자가 세팅에서 변경 시 저장.
 */
export function LanguageProvider({children}: {children: React.ReactNode}) {
  const [language, setLang] = useState<Language>(() => deviceLanguage());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v === 'ko' || v === 'en') setLang(v);
    }).catch(() => {});
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(language, key, params),
    [language],
  );

  const value = useMemo(() => ({language, setLanguage, t}), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');
  return ctx;
}
