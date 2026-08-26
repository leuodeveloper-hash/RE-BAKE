/**
 * 본문 안 링크 — 마크다운 [텍스트](url) 문법으로 평문에 저장한다.
 * 스키마 변경 없이 기존 string 필드를 그대로 쓰고, 보기 화면에서만 파싱해 렌더한다.
 */

export interface TextSegment {
  text: string;
  /** 링크면 URL, 아니면 undefined */
  url?: string;
}

// [텍스트](url) — 텍스트에 ]가, url에 )가 없다고 본다(중첩 링크 미지원).
const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/**
 * 마크다운 링크가 섞인 문자열을 세그먼트 배열로 분해한다.
 * 링크가 없으면 [{text: 원문}] 하나만 반환하므로 호출부에서 분기할 필요가 없다.
 */
export function parseRichText(input: string): TextSegment[] {
  if (!input) return [];
  const out: TextSegment[] = [];
  let last = 0;
  LINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LINK_RE.exec(input)) !== null) {
    if (m.index > last) out.push({text: input.slice(last, m.index)});
    out.push({text: m[1], url: normalizeUrl(m[2])});
    last = m.index + m[0].length;
  }
  if (last < input.length) out.push({text: input.slice(last)});
  return out.length > 0 ? out : [{text: input}];
}

/** 마크다운 링크를 표시 텍스트만 남기고 제거 (검색·미리보기·공유용) */
export function stripRichText(input: string): string {
  if (!input) return '';
  return input.replace(LINK_RE, '$1');
}

/** 링크 문법이 들어있는지 */
export function hasLink(input: string): boolean {
  LINK_RE.lastIndex = 0;
  return LINK_RE.test(input);
}

/** 스킴 없으면 https 붙임 — 사용자가 'example.com'만 입력하는 경우 대비 */
export function normalizeUrl(url: string): string {
  const u = url.trim();
  if (!u) return u;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : `https://${u}`;
  return shortenUrl(withScheme);
}

/**
 * 공유 링크에 붙는 추적·세션 파라미터를 떼어 URL을 짧게 만든다.
 *
 * 편집 화면은 마크다운 원문([텍스트](url))이 그대로 보이므로, 긴 URL이 들어가면
 * 문장을 알아보기 어렵다. 쿠팡·유튜브 공유 링크가 특히 길다.
 * 제거해도 대상 페이지는 동일하게 열린다.
 */
const TRACKING_PARAMS = [
  'itemid', 'vendoritemid', 'src', 'spec', 'addtag', 'ctag', 'lptag', 'itime',
  'pagetype', 'pageid', 'deviceid', 'token', 'landing', 'traceid', 'placementid',
  'clickbeacon', 'campaignid', 'contentcategory', 'imgsize', 'tsource', 'subid',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'igshid', 'si',
];

export function shortenUrl(url: string): string {
  try {
    const parsed = new URL(url);
    let changed = false;
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (TRACKING_PARAMS.includes(key.toLowerCase())) {
        parsed.searchParams.delete(key);
        changed = true;
      }
    }
    if (!changed) return url;
    // 쿼리가 비면 '?'까지 떨어뜨린다
    const qs = parsed.searchParams.toString();
    return `${parsed.origin}${parsed.pathname}${qs ? `?${qs}` : ''}${parsed.hash}`;
  } catch {
    return url; // URL 파싱 실패(사용자 오타 등)면 원본 유지
  }
}

/**
 * 선택 구간에 링크를 씌운 새 문자열을 만든다.
 * 이미 링크인 구간이면 URL만 교체하고, url이 비면 링크를 해제한다.
 */
export function applyLink(
  text: string,
  selection: {start: number; end: number},
  url: string,
  /** 표시 텍스트를 바꿀 때 (생략하면 선택 구간의 글자를 그대로 쓴다) */
  label?: string,
): string {
  const {start, end} = selection;
  if (start === end) return text; // 선택 없음 — 그대로
  const before = text.slice(0, start);
  const selected = text.slice(start, end);
  const after = text.slice(end);
  const trimmedUrl = url.trim();
  // 링크 해제: 선택 구간이 통째로 마크다운 링크면 표시 텍스트만 남긴다
  if (!trimmedUrl) return before + (label?.trim() || stripRichText(selected)) + after;
  const finalLabel = label?.trim() || stripRichText(selected);
  return `${before}[${finalLabel}](${normalizeUrl(trimmedUrl)})${after}`;
}

/**
 * 선택 구간이 마크다운 링크 안에 걸쳐 있으면, 그 링크 전체 범위로 확장한다.
 *
 * 편집 화면에는 원문([텍스트](url))이 그대로 보이므로 사용자는 보통 표시 텍스트만
 * 선택한다. 그 상태로는 "이미 링크인지" 판별이 안 돼 수정/해제가 되지 않는다.
 * 표시 텍스트만 골라도 링크를 고칠 수 있게 범위를 넓혀준다.
 */
export function expandToLink(
  text: string,
  selection: {start: number; end: number},
): {start: number; end: number; url?: string} {
  LINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LINK_RE.exec(text)) !== null) {
    const s = m.index;
    const e = s + m[0].length;
    // 선택이 이 링크와 겹치면 링크 전체를 대상으로
    if (selection.start < e && selection.end > s) {
      return {start: s, end: e, url: m[2]};
    }
  }
  return selection;
}

/** 편집 화면용 — 링크의 표시 텍스트 구간 */
export interface DisplayLink {
  /** 표시 문자열에서의 시작/끝 */
  start: number;
  end: number;
  url: string;
}

/**
 * 저장값(마크다운) → 편집 화면 표시값.
 *
 * 편집 중에는 URL을 숨기고 표시 텍스트만 보여준다. URL이 길면(쿠팡 링크 등)
 * 문장을 알아볼 수 없기 때문이다. 어디에 링크가 걸렸는지는 하이라이트로 알린다.
 *
 * @returns text = 사용자에게 보일 문자열, links = 그 문자열 기준 링크 구간
 */
export function toDisplay(source: string): {text: string; links: DisplayLink[]} {
  const segs = parseRichText(source ?? '');
  let text = '';
  const links: DisplayLink[] = [];
  for (const seg of segs) {
    if (seg.url) {
      links.push({start: text.length, end: text.length + seg.text.length, url: seg.url});
    }
    text += seg.text;
  }
  return {text, links};
}

/**
 * 편집 화면 표시값 → 저장값(마크다운).
 *
 * 사용자가 글자를 고치면 링크 구간도 함께 움직여야 한다.
 * 여기서는 "표시 문자열 기준 구간"을 그대로 신뢰하고 다시 마크다운으로 감싼다.
 * (구간 보정은 onChangeText에서 shiftLinks가 담당)
 */
export function toSource(text: string, links: DisplayLink[]): string {
  if (links.length === 0) return text;
  const sorted = [...links].sort((a, b) => a.start - b.start);
  let out = '';
  let cursor = 0;
  for (const l of sorted) {
    if (l.start < cursor || l.end > text.length || l.start >= l.end) continue; // 깨진 구간은 버린다
    out += text.slice(cursor, l.start);
    out += `[${text.slice(l.start, l.end)}](${l.url})`;
    cursor = l.end;
  }
  out += text.slice(cursor);
  return out;
}

/**
 * 텍스트가 바뀌었을 때 링크 구간을 옮긴다.
 *
 * 어디가 어떻게 바뀌었는지는 앞뒤 공통 부분으로 추정한다(디프 대신 단순 비교).
 * 링크 텍스트가 통째로 지워지면 그 링크는 사라진다 — 의도에 맞는 동작이다.
 */
export function shiftLinks(prev: string, next: string, links: DisplayLink[]): DisplayLink[] {
  if (prev === next || links.length === 0) return links;
  // 앞에서 같은 부분
  let head = 0;
  while (head < prev.length && head < next.length && prev[head] === next[head]) head++;
  // 뒤에서 같은 부분
  let tail = 0;
  while (
    tail < prev.length - head &&
    tail < next.length - head &&
    prev[prev.length - 1 - tail] === next[next.length - 1 - tail]
  ) tail++;

  const removedEnd = prev.length - tail;   // 바뀐 구간: [head, removedEnd)
  const delta = next.length - prev.length;

  const out: DisplayLink[] = [];
  for (const l of links) {
    // 변경 구간보다 완전히 앞 — 그대로
    if (l.end <= head) { out.push(l); continue; }
    // 변경 구간보다 완전히 뒤 — 길이 변화만큼 밀기
    if (l.start >= removedEnd) { out.push({...l, start: l.start + delta, end: l.end + delta}); continue; }
    // 겹침 — 남은 범위로 축소. 다 지워졌으면 링크도 제거
    const start = Math.min(l.start, head);
    const end = Math.max(l.end + delta, head);
    if (end > start) out.push({...l, start, end});
  }
  return out;
}

/**
 * 표시값 기준 선택 구간 → 저장값(마크다운) 기준 구간.
 *
 * 편집 입력에는 URL을 숨긴 표시값이 들어가므로, 툴바가 링크를 적용하려면
 * 저장값 기준 위치로 옮겨야 한다. 앞쪽 링크들이 차지하는 마크다운 문법
 * 길이([]()와 URL)만큼 오프셋이 커진다.
 */
export function displayToSourceRange(
  displayText: string,
  links: DisplayLink[],
  sel: {start: number; end: number},
): {start: number; end: number} {
  const sorted = [...links].sort((a, b) => a.start - b.start);
  // 표시 위치 → 저장 위치
  const map = (pos: number): number => {
    let offset = 0;
    for (const l of sorted) {
      if (l.end <= pos) {
        // 이 링크는 pos보다 앞 — '[' + ']' + '(' + url + ')' 만큼 늘어난다
        offset += 2 + 2 + l.url.length;
      } else if (l.start < pos) {
        // pos가 링크 텍스트 중간 — 여는 '[' 만큼만
        offset += 1;
      }
    }
    return pos + offset;
  };
  return {start: map(sel.start), end: map(sel.end)};
}
