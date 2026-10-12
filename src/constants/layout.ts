import {Spacing} from './spacing';

/**
 * 앱바 레이아웃 — 값은 여기 한 곳에만 둔다.
 *
 * 룰: 앱바 공간(위아래 여백 포함 64) 다음에 8(APPBAR_CONTENT_GAP)을 두고 첫 요소가 온다.
 * - 화면은 숫자(54, 72, 80…)를 적지 않고 아래 값이나 그걸 쓰는 공통 훅/컴포넌트만 쓴다
 *   (usePageContentPadding · PageScrollView · useAppBarContentTop).
 * - 안전영역(insets.top)은 그 훅이 플랫폼별로 더한다(네이티브 기기 값, 웹 0).
 * - 첫 요소에 marginTop/스페이서를 더하지 않는다. 더하면 8이 깨진다.
 */
export const NAV_PILL_HEIGHT = 44;
/** 안전영역 아래 앱바 위 여백 */
export const APPBAR_TOP_PADDING = Spacing.smd;
/** 앱바 버튼(알약) 아래 끝(안전영역 제외) — 10 + 44 = 54. 앱바 버튼에 붙는 메뉴·팝오버 기준 */
export const APPBAR_CONTENT_BOTTOM = APPBAR_TOP_PADDING + NAV_PILL_HEIGHT;
/** 앱바 공간 아래 끝(안전영역 제외) — 위 10 + 알약 44 + 아래 10 = 64 */
export const APPBAR_AREA_BOTTOM = APPBAR_CONTENT_BOTTOM + APPBAR_TOP_PADDING;
/** 앱바 공간과 첫 요소 사이 */
export const APPBAR_CONTENT_GAP = Spacing.sm;
/** 첫 요소가 시작하는 위치(안전영역 제외) — 앱바 공간 64 + 8 = 72 */
export const APPBAR_CONTENT_TOP = APPBAR_AREA_BOTTOM + APPBAR_CONTENT_GAP;

/** 앱바 안 떠 있는 요소(알약·버튼·로고) 사이 간격 */
export const APPBAR_ITEM_GAP = 4;
