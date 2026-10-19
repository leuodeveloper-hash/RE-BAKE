/**
 * 공유 링크의 대표 주소 — 커스텀 도메인(bakle.app).
 * bakle.web.app·firebaseapp.com도 같은 사이트지만, 링크는 이 주소 하나로만 만든다.
 * (예전엔 웹에서 지금 열어 둔 주소를 그대로 써서 web.app/bakle.app 링크가 섞였다)
 */
export const SHARE_BASE_URL = 'https://bakle.app';
/** 커스텀 도메인이 안 열리면(도메인·DNS 문제) 쓰는 원래 주소 — 같은 사이트 */
export const SHARE_FALLBACK_URL = 'https://bakle.web.app';

/** 지금 링크에 쓰는 주소 — 앱을 켤 때 한 번 열어 보고, 안 열리면 원래 주소로 */
let baseUrl = SHARE_BASE_URL;
let checked = false;

/** 커스텀 도메인 확인 — 3초 안에 안 열리면 원래 주소로 바꾼다(앱 시작 때 한 번) */
export async function checkShareDomain(): Promise<void> {
  if (checked) return;
  checked = true;
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), 3000);
  try {
    // 웹은 다른 주소라 응답 내용을 못 읽는다(no-cors) — 연결만 되면 열리는 것으로 본다
    const web = typeof document !== 'undefined';
    const res = await fetch(`${SHARE_BASE_URL}/`, {method: 'HEAD', ...(web ? {mode: 'no-cors' as RequestMode} : {}), ...(ctrl ? {signal: ctrl.signal} : {})});
    baseUrl = web || res.ok ? SHARE_BASE_URL : SHARE_FALLBACK_URL;
  } catch {
    baseUrl = SHARE_FALLBACK_URL;
  } finally {
    clearTimeout(timer);
  }
}

export function getShareBaseUrl(): string {
  return baseUrl;
}

export function getRecipeShareUrl(id: string): string {
  return `${baseUrl}/recipe/${id}`;
}

/** 공식 북 공유 URL: `/cookbook/o/{name}` */
export function getOfficialCookbookShareUrl(name: string): string {
  return `${baseUrl}/cookbook/o/${encodeURIComponent(name)}`;
}

/** 공개한 개인 북 URL: `/cookbook/u/{uid}/{name}` (원본을 바로 보여 주므로 항상 최신) */
export function getPersonalCookbookShareUrl(uid: string, name: string): string {
  return `${baseUrl}/cookbook/u/${uid}/${encodeURIComponent(name)}`;
}

/** 작성자 홈(프로필) URL: `/u/{handle}` */
export function getProfileShareUrl(handle: string): string {
  return `${baseUrl}/u/${encodeURIComponent(handle)}`;
}
