import * as Localization from 'expo-localization';
import ko from './ko.json';
import en from './en.json';

export type Language = 'ko' | 'en';

const dictionaries: Record<Language, Record<string, string>> = {ko, en};

/** 기기 로케일로 기본 언어 결정: 한국(언어 ko 또는 지역 KR) → ko, 그 외 → en */
export function deviceLanguage(): Language {
  try {
    const first = Localization.getLocales()[0];
    if (!first) return 'en';
    if (first.languageCode === 'ko' || first.regionCode === 'KR') return 'ko';
  } catch {}
  return 'en';
}

/**
 * 키로 번역 문구 조회. 없으면 ko 폴백 → 그래도 없으면 키 그대로.
 * 파라미터: 문구 안 {{name}} 치환. 예: t('recipeDetail.specificGravity', {ratio: 1.5})
 */
export function translate(
  lang: Language,
  key: string,
  params?: Record<string, string | number>,
): string {
  // 영문 단수/복수 — params.count가 1이면 `<key>_one` 키를 우선 사용한다.
  // (한국어는 수 구분이 없어 그대로 두면 된다)
  const count = params?.count;
  const dict = dictionaries[lang];
  let s: string | undefined;
  if (lang === 'en' && typeof count === 'number' && Math.abs(count) === 1) {
    s = dict?.[`${key}_one`];
  }
  s = s ?? dict?.[key] ?? dictionaries.ko?.[key] ?? key;
  if (params) {
    for (const k of Object.keys(params)) {
      s = s.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(params[k]));
    }
  }
  return s;
}
