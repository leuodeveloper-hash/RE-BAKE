/**
 * 제과/제빵 공법 설명 데이터.
 * - 제과: RecipeEditScreen의 BAKING_METHODS(슬래시 메뉴 이름)와 이름을 일치시켜, 레시피 공법 태그와 연결됨.
 * - 제빵: 대표 공법을 추가 (레시피 태그가 아직 없어도 설명 참고용).
 * 설명은 요약(1~2문장) 수준. 정확도 검토 후 다듬을 것.
 */

export type MethodCategory = 'pastry' | 'bakery';

export interface BakingMethod {
  /** 공법 이름 (제과는 BAKING_METHODS와 동일) */
  name: string;
  /** 한 줄 요약 설명 */
  description: string;
  /** 사전 항목 id — 기본 용어는 이름, 어드민이 추가한 용어는 생성 id */
  id?: string;
  category?: MethodCategory;
}

/** 제과(케이크·구움과자) 공법 — 기존 BAKING_METHODS 10종 */
export const PASTRY_METHODS: BakingMethod[] = [
  {name: '시폰법', description: '노른자 반죽과 머랭을 따로 만들어 섞는 방법. 유지를 액체(식용유)로 써서 가볍고 촉촉한 시폰케이크에 쓴다.'},
  {name: '별립법', description: '노른자와 흰자를 분리해 각각 거품 내고 마지막에 합치는 방법. 부피가 크고 폭신한 스펀지·롤케이크에 적합하다.'},
  {name: '공립법', description: '전란(노른자+흰자)을 한꺼번에 거품 내는 방법. 별립법보다 조직이 촘촘하고 탄력 있는 스펀지가 나온다.'},
  {name: '슈가법', description: '유지와 설탕을 먼저 크리밍한 뒤 달걀·가루를 넣는 방법(=슈가배터법). 부드럽고 결이 고운 버터케이크·파운드케이크에 쓴다.'},
  {name: '익반죽법', description: '가루에 뜨거운 물이나 유지를 부어 호화(익반죽)시킨 뒤 반죽하는 방법. 슈(슈크림 껍질) 등 특수 반죽에 쓴다.'},
  {name: '크림법', description: '유지와 설탕을 공기가 들어가도록 충분히 크리밍하는 방법. 쿠키·파운드케이크 등에서 부드러운 식감을 만든다.'},
  {name: '제노아즈법', description: '전란과 설탕을 데워가며 거품 내 만드는 스펀지 반죽. 유지를 녹여 넣어 촉촉하고 진한 제누아즈 시트가 나온다.'},
  {name: '블렌딩법', description: '유지와 밀가루를 먼저 섞어 가루를 유지로 코팅한 뒤 나머지 재료를 넣는 방법. 글루텐이 덜 생겨 부드럽고 연한 조직의 케이크(데블스 푸드 등)에 쓴다.'},
  {name: '1단계법', description: '모든 재료를 한꺼번에 넣고 섞는 단단계법. 유화제와 베이킹파우더를 써서 공정이 간단하고 빠르며, 마들렌 등에 쓴다.'},
  {name: '크림별립법', description: '유지와 설탕을 크리밍한 반죽에 노른자를 넣고, 따로 낸 흰자 머랭을 나눠 섞는 방법. 크림법의 부드러움과 별립법의 가벼움을 함께 낸다(버터 스펀지, 초코머핀 등).'},
  {name: '머랭법', description: '흰자에 설탕을 넣어 단단히 거품 낸 머랭을 기반으로 하는 방법. 마카롱·다쿠아즈·머랭쿠키의 뼈대가 된다.'},
  {name: '핫프로세스법', description: '재료를 가열하며 섞어 만드는 방법. 커스터드·캐러멜 등 열로 농도를 잡는 필링·반죽에 쓴다.'},
  {name: '냉동반죽법', description: '반죽을 미리 만들어 냉동 보관했다가 필요할 때 해동·굽는 방법. 쿠키·페이스트리의 작업 효율과 보관성을 높인다.'},
];

/** 제빵(빵) 공법 — 대표 공법 */
export const BAKERY_METHODS: BakingMethod[] = [
  {name: '스트레이트법', description: '모든 재료를 한 번에 넣고 반죽하는 직접법. 공정이 단순하고 빠르지만 발효 관리가 중요하다. 가장 기본이 되는 제빵법.'},
  {name: '비상스트레이트법', description: '스트레이트법에서 이스트를 늘리고 반죽 온도를 높여 발효 시간을 크게 단축한 방법. 시간이 급할 때 쓰며, 기본 스트레이트법보다 발효·풍미는 약하다.'},
  {name: '스펀지법', description: '밀가루 일부와 물·이스트로 먼저 스펀지(중종)를 발효시킨 뒤 나머지를 섞는 중종법. 풍미가 깊고 노화가 느리다.'},
  {name: '액종법(풀리시)', description: '가루와 같은 양의 물에 소량의 이스트로 액체 발효종을 만들어 쓰는 방법. 바삭한 크러스트와 풍부한 향의 유럽식 빵에 쓴다.'},
  {name: '탕종법', description: '밀가루에 뜨거운 물을 부어 전분을 호화시킨 탕종을 넣는 방법. 수분 보유력이 높아 쫄깃하고 촉촉하며 노화가 느리다.'},
  {name: '오토리즈', description: '밀가루와 물만 먼저 섞어 20~60분 휴지시킨 뒤 이스트·소금을 넣는 방법. 글루텐이 자연스레 형성돼 반죽이 부드러워진다.'},
  {name: '사워도우(천연발효)', description: '이스트 대신 밀가루·물로 배양한 천연 발효종(르방)으로 발효시키는 방법. 특유의 신맛과 깊은 풍미, 긴 보존성이 특징이다.'},
  {name: '노타임법', description: '발효 시간을 크게 줄이고 반죽 개량제·기계 반죽으로 빠르게 굽는 방법. 대량 생산에 쓰이나 풍미는 약한 편이다.'},
  {name: '냉장발효법(저온숙성)', description: '반죽을 냉장고에서 장시간(밤새) 천천히 발효시키는 방법. 풍미가 깊어지고 작업 시간을 유연하게 나눌 수 있다.'},
];

/**
 * 사전 — 기본 용어(위 목록) 위에 어드민이 고친·추가한·지운 항목(Firestore dictionary)을 덮어쓴 현재 목록.
 * 항목 하나씩(포스트잇처럼) 고친다. 앱 어디서나 이 목록 하나를 본다(본문 밑줄·검색·사전 페이지).
 */
export const BUILTIN_METHODS: BakingMethod[] = [
  ...PASTRY_METHODS.map(m => ({...m, id: m.name, category: 'pastry' as const})),
  ...BAKERY_METHODS.map(m => ({...m, id: m.name, category: 'bakery' as const})),
];

/** 서버 항목 — 기본 용어와 같은 id면 덮어쓰고, deleted면 숨긴다 */
export interface DictionaryOverride {
  id: string;
  name?: string;
  description?: string;
  category?: MethodCategory;
  deleted?: boolean;
  createdAt?: string;
}

let current: BakingMethod[] = BUILTIN_METHODS;
let METHOD_BY_TERM = new Map<string, BakingMethod>();
let METHOD_TERM_RE: RegExp | null = null;
let version = 0;
const listeners = new Set<() => void>();

function rebuild() {
  METHOD_BY_TERM = new Map();
  for (const m of current) {
    // '액종법(풀리시)'처럼 괄호가 있으면 앞·괄호 안 이름 둘 다로 찾는다
    const match = m.name.match(/^(.+?)\((.+)\)$/);
    for (const term of match ? [match[1], match[2]] : [m.name]) if (term.trim()) METHOD_BY_TERM.set(term.trim(), m);
  }
  const keys = [...METHOD_BY_TERM.keys()]
    // 긴 이름부터 — '비상스트레이트법' 안의 '스트레이트법'이 먼저 잡히지 않게
    .sort((a, b) => b.length - a.length)
    .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  METHOD_TERM_RE = keys.length ? new RegExp(keys.join('|'), 'g') : null;
}
rebuild();

/** 서버 항목을 반영한다(useDictionarySync가 부른다) */
export function applyDictionary(overrides: DictionaryOverride[]) {
  const byId = new Map(overrides.map(o => [o.id, o]));
  const merged: BakingMethod[] = [];
  for (const b of BUILTIN_METHODS) {
    const o = byId.get(b.id!);
    if (o?.deleted) continue;
    merged.push(o ? {...b, ...stripUndefined(o)} : b);
  }
  // 어드민이 새로 만든 항목(기본 용어에 없는 id) — 만든 순서대로 뒤에
  overrides
    .filter(o => !o.deleted && !BUILTIN_METHODS.some(b => b.id === o.id) && o.name?.trim())
    .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
    .forEach(o => merged.push({id: o.id, name: o.name!.trim(), description: o.description ?? '', category: o.category ?? 'pastry'}));
  current = merged;
  rebuild();
  version++;
  listeners.forEach(l => l());
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([k, v]) => v !== undefined && k !== 'deleted' && k !== 'createdAt')) as Partial<T>;
}

export function getDictionary(): BakingMethod[] { return current; }
export function getDictionaryVersion(): number { return version; }
export function subscribeDictionary(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** 글을 공법 이름 기준으로 나눈다 — method가 있는 조각이 공법 이름 */
export function splitMethodTerms(text: string): {text: string; method?: BakingMethod}[] {
  if (!METHOD_TERM_RE) return [{text}];
  const out: {text: string; method?: BakingMethod}[] = [];
  let last = 0;
  for (const m of text.matchAll(METHOD_TERM_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push({text: text.slice(last, i)});
    out.push({text: m[0], method: METHOD_BY_TERM.get(m[0])});
    last = i + m[0].length;
  }
  if (last < text.length) out.push({text: text.slice(last)});
  return out;
}

/** 공법 태그 값('비상스트레이트법' 등)으로 사전 항목 찾기 */
export function findMethod(name: string): BakingMethod | undefined {
  return METHOD_BY_TERM.get(name.trim());
}

/** 검색어에 맞는 사전 항목 — 이름(괄호 속 이름 포함)에 검색어가 들어 있거나, 검색어 안에 이름이 있으면 */
export function searchMethods(query: string): BakingMethod[] {
  const q = query.trim();
  if (!q) return [];
  const out = new Set<BakingMethod>();
  for (const [term, m] of METHOD_BY_TERM) {
    if (term.includes(q) || q.includes(term)) out.add(m);
  }
  return [...out];
}
