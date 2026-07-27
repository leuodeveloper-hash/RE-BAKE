/**
 * 논리적 작성자 — 계정(uid)과 분리된 콘텐츠 소유 주체.
 * 여러 계정이 하나의 작성자를 공동소유할 수 있고(ownerUids), 계정이 소멸/이전돼도
 * 작성자는 유지된다. 공식 콘텐츠는 "baeki"(어드민 여럿 공동소유), 유저는 각자 하나.
 */
export interface Author {
  /** 문서 ID = authorId (레시피의 authorId와 매칭). 공식은 "baeki" */
  id: string;
  /** 이 작성자를 소유·관리하는 계정 uid들. 하나가 빠져도 나머지가 유지 */
  ownerUids: string[];
  /** 고유 아이디 — 영문/숫자/언더스코어만 (URL·멘션용, 예: "baeki") */
  handle: string;
  /** 화면 표시 이름 — 한글 등 자유 (예: "베이키"). 없으면 handle 표시 */
  displayName?: string;
  /** 아바타 시드 */
  avatarSeed: string;
  /** 한 줄 소개 */
  bio?: string;
}

/** 공식(둘러보기) 콘텐츠의 고정 작성자 ID = handle(영문) */
export const OFFICIAL_AUTHOR_ID = 'baeki';
/** 공식 작성자 영문 handle (표시용 @핸들) */
export const OFFICIAL_AUTHOR_HANDLE = 'bakey';
/** 공식 작성자 화면 표시 이름 */
export const OFFICIAL_AUTHOR_DISPLAY_NAME = 'bakey';

/** 공식 작성자 여부 */
export const isOfficialAuthor = (authorId?: string | null): boolean => authorId === OFFICIAL_AUTHOR_ID;

/**
 * 표시명 폴백 해석 — 공식 작성자면 항상 고정 표시명(bakey), 아니면 주어진 후보들 중 첫 유효값.
 * 레시피에 박제된 authorDisplayName이 비어도 공식은 handle('baeki')로 새지 않게 한다.
 */
export function resolveAuthorDisplayName(authorId?: string | null, ...candidates: (string | undefined | null)[]): string {
  if (isOfficialAuthor(authorId)) return OFFICIAL_AUTHOR_DISPLAY_NAME;
  return candidates.find(c => !!c) ?? (authorId ?? '');
}

/**
 * 표시용 handle 해석 — 공식 작성자면 고정 handle(bakey), 아니면 박제된 handle.
 * 기존 데이터가 'baeki'로 박제돼 있어도 화면엔 항상 최신 공식 handle을 보여준다.
 */
export function resolveAuthorHandle(authorId?: string | null, stampedHandle?: string | null): string | undefined {
  if (isOfficialAuthor(authorId)) return OFFICIAL_AUTHOR_HANDLE;
  return stampedHandle ?? undefined;
}
