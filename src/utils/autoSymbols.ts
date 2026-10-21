/**
 * 입력하면서 바로 바꾸는 기호 — 공통 TextInput·RichEditor가 쓴다(앱 입력칸 전부).
 *  '도씨' → '℃', '-->'·'->' → '→'
 */
const RULES: [RegExp, string][] = [
  [/도씨/g, '℃'],
  [/-{1,2}>/g, '→'],
];

export const autoSymbols = (v: string) => RULES.reduce((s, [re, to]) => s.replace(re, to), v);
