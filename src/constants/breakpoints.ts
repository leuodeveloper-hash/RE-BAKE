/**
 * 화면 너비 분기점.
 *
 * 값을 쓰는 곳마다 숫자를 적으면(600, 768…) 기준이 조금씩 어긋난다.
 * 폭으로 무언가를 바꿀 때는 여기에 이름을 두고 가져다 쓴다.
 */

/** 이 폭부터 태블릿·데스크톱으로 본다 — 타이포 확대, 그리드 칸 수 등 */
export const TABLET_BREAKPOINT = 600;

/** 이 폭 미만은 좁은 폰 — 바깥 여백을 줄인다(LayoutV2.marginBaseUnder360) */
export const NARROW_PHONE_BREAKPOINT = 360;
