/** 처음 연 사람이 소개(홈) 화면을 이미 봤는지 */
export const WELCOME_SEEN_KEY = '@bakle_welcome_seen';

/** 보기 메뉴의 [홈]처럼 일부러 소개 화면으로 올 때 — 이미 봤어도 보여준다 */
let landingRequested = false;
export function requestLanding() { landingRequested = true; }
/** 요청이 있었는지 읽고 지운다 */
export function takeLandingRequest(): boolean {
  const v = landingRequested;
  landingRequested = false;
  return v;
}
