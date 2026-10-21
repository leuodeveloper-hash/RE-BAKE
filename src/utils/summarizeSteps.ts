/**
 * 사진에서 읽은 요약 글 → 과정 묶음마다 요약. 모두 기기 안에서(서버·AI 없이).
 *  1) 줄 앞 번호(①·1.·(1)) 떼기
 *  2) 맞춤법 — 이 레시피 과정 글·사전 용어에 있는 낱말과 한 글자만 다른 낱말은 그 낱말로(펜닝→팬닝, 클리업→클린업)
 *  3) 띄어쓰기 — '1차발효'→'1차 발효', '중간발효'→'중간 발효'처럼 자주 붙여 쓰는 것만
 *  4) 나누기 — 묶음 이름이나 그 묶음 과정 글에만 있는 낱말로 단계를 알아낸다(뒤로는 안 돌아간다)
 */

const NUMBER_PREFIX = /^\s*(?:[①-⑳]|\(?\d{1,2}[.)]|\d{1,2}\s)\s*/;

/** 자주 붙여 쓰는 말 — 앞말 + 뒷말 사이 띄우기 */
const SPACING: [RegExp, string][] = [
  [/(\d+차)(발효)/g, '$1 $2'],
  [/(중간)(발효)/g, '$1 $2'],
  [/(유지)(첨가)/g, '$1 $2'],
  [/(오븐)(예열)/g, '$1 $2'],
];

/** 제과제빵 기본 낱말 — 이건 맞는 말로 보고 고치지 않는다(발전→발효처럼 맞는 말을 바꾸지 않게) */
const BASE_WORDS = [
  '계량', '픽업', '클린업', '발전', '최종', '렛다운', '유지', '첨가', '반죽', '발효', '중간', '분할', '둥글리기', '성형',
  '팬닝', '굽기', '냉각', '예열', '오븐', '뚜껑', '덮고', '충분히', '아래', '위', '튀기기', '기름', '준비', '앞뒤',
  '이내로', '봉형', '자형', '트위스트형', '틀', '휴지', '접기', '밀기', '말기', '재단', '종이', '중탕', '거품', '비중', '측정',
];

/** 한 글자 차이(바꾸기·넣기·빼기) */
function oneEditApart(a: string, b: string): boolean {
  if (a === b) return false;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, diff = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diff > 1) return false;
    if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
  }
  return diff + (la - i) + (lb - j) <= 1;
}

/** 낱말 모음 — 한글 2글자 이상만(조사 붙은 꼴도 그대로 모은다) */
export function buildVocab(texts: string[]): Set<string> {
  const vocab = new Set<string>();
  for (const w of BASE_WORDS) vocab.add(w);
  for (const tx of texts) for (const w of tx.match(/[가-힣]{2,}/g) ?? []) vocab.add(w);
  return vocab;
}

/** 한 줄 맞춤법·띄어쓰기 */
export function fixLine(line: string, vocab: Set<string>): string {
  let out = line.replace(NUMBER_PREFIX, '').replace(/\s+/g, ' ').trim();
  // 띄어쓰기 먼저 — '1차발효'를 '1차 발효'로 나눠야 낱말을 제대로 본다
  for (const [re, to] of SPACING) out = out.replace(re, to);
  out = out.replace(/(^|[^0-9가-힣])([가-힣]{2,})/g, (m, pre: string, w: string) => {
    if (vocab.has(w)) return m;
    // 같은 길이에서 한 글자만 바뀐 낱말이 딱 하나면 그걸로(여럿이면 헷갈리니 그대로). 숫자에 붙은 말(2봉형·1차)은 건드리지 않는다
    const cands = [...vocab].filter(v => v.length === w.length && oneEditApart(w, v));
    return cands.length === 1 ? pre + cands[0] : m;
  });
  return out;
}

/**
 * 줄들 → 묶음마다 요약. 줄에 묶음 이름이 없어도 그 묶음 과정 글에만 나오는 낱말(팬닝·분할·뚜껑 등)로 단계를 알아낸다.
 * 점수: 묶음 이름이 나오면 3, 그 묶음에만 있는 낱말 하나에 1. 뒤로는 안 돌아가고, 맞는 게 없으면 앞 줄 묶음에
 */
export function splitSummaryByGroups(lines: string[], groups: {title: string; steps: string[]}[]): string[] {
  const norm = (v: string) => v.replace(/\s+/g, '');
  const stem = (w: string) => w.replace(/(합니다|한다|하고|해서|하며|해|을|를|이|가|은|는|에서|에|으로|로|와|과|도)$/, '');
  const titleKeys = groups.map(g => norm(g.title).split(/및|·|,|\//).filter(k => k.length >= 2));
  const wordsOf = (g: {title: string; steps: string[]}) => [...new Set(g.steps.flatMap(st => (st.match(/[가-힣]{2,}/g) ?? []).map(stem)).filter(w => w.length >= 2))];
  const groupWords = groups.map(wordsOf);
  // 줄 낱말이 어느 묶음 과정 글에 나오는지(앞부분이 같으면 같은 말 — 팬닝/패닝합니다 등). 한 묶음에만 나오면 단서
  const clueGroup = (w: string): number => {
    const hits = groupWords.map((ws, i) => (ws.some(o => o.startsWith(w) || w.startsWith(o)) ? i : -1)).filter(i => i >= 0);
    return hits.length === 1 ? hits[0] : -1;
  };
  // 오븐 온도(150 이상, 190/170 등)가 있으면 굽기·튀기기 묶음
  const bakeIdx = groups.findIndex(g => /굽|튀기|오븐/.test(g.title));
  const buckets: string[][] = groups.map(() => []);
  let cur = 0;
  for (const line of lines) {
    const nl = norm(line);
    const lw = (line.match(/[가-힣]{2,}/g) ?? []).map(stem);
    const scores = groups.map((_, i) => (titleKeys[i].some(k => nl.includes(k)) ? 3 : 0));
    for (const w of lw) { const gi = clueGroup(w); if (gi >= 0) scores[gi] += 1; }
    if (bakeIdx >= 0 && (line.match(/\d{3}/g) ?? []).some(n => Number(n) >= 150 && Number(n) <= 300)) scores[bakeIdx] += 2;
    let best = -1, bestScore = 0;
    for (let i = cur; i < groups.length; i++) if (scores[i] > bestScore) { best = i; bestScore = scores[i]; }
    if (best >= 0) cur = best;
    buckets[cur].push(line);
  }
  return buckets.map(b => b.join('\n'));
}

/** 읽은 글 → 묶음마다 요약(맞춤법·나누기까지) */
export function summarizeFromOcr(text: string, groups: {title: string; steps: string[]}[], extraWords: string[] = []): string[] {
  const vocab = buildVocab([...groups.flatMap(g => [g.title, ...g.steps]), ...extraWords]);
  const lines = text.split(/\r?\n/).map(l => fixLine(l, vocab)).filter(Boolean);
  return splitSummaryByGroups(lines, groups);
}
