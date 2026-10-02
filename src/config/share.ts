/**
 * 공유 링크의 대표 주소 — 커스텀 도메인(bakle.app).
 * bakle.web.app·firebaseapp.com도 같은 사이트지만, 링크는 이 주소 하나로만 만든다.
 * (예전엔 웹에서 지금 열어 둔 주소를 그대로 써서 web.app/bakle.app 링크가 섞였다)
 */
export const SHARE_BASE_URL = 'https://bakle.app';

export function getRecipeShareUrl(id: string): string {
  return `${SHARE_BASE_URL}/recipe/${id}`;
}

/** 공식 북 공유 URL: `/cookbook/o/{name}` */
export function getOfficialCookbookShareUrl(name: string): string {
  return `${SHARE_BASE_URL}/cookbook/o/${encodeURIComponent(name)}`;
}

/** 공개한 개인 북 URL: `/cookbook/u/{uid}/{name}` (원본을 바로 보여 주므로 항상 최신) */
export function getPersonalCookbookShareUrl(uid: string, name: string): string {
  return `${SHARE_BASE_URL}/cookbook/u/${uid}/${encodeURIComponent(name)}`;
}
