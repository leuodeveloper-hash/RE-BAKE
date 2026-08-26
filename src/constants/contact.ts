/**
 * 사용자 문의 채널 — 앱 안에서 "문의하기"를 누르면 열리는 곳.
 * 여러 화면에서 쓰이므로 주소는 여기 한 곳에서만 관리한다.
 */

/** 문의 받을 이메일 */
export const CONTACT_EMAIL = 'hk3522@gmail.com';

/** 메일 앱으로 여는 URL (제목 미리 채움) */
export const CONTACT_URL = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('[베이클] 문의')}`;
