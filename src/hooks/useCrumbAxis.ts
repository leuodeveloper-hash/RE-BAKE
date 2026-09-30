import type {GroupAxis} from '@components/RecipeGroups/groupAxis';

/**
 * 브레드크럼에 보일 축을 정한다 — 홈·둘러보기가 같이 쓴다.
 *
 * 평면 목록('레시피별')엔 두 길로 온다:
 *  - 레시피북 탭을 고름 → 탭 화면 그대로 ('all')
 *  - 레시피북/공법 목록에서 하나를 눌러 들어옴(drillFrom) → 2뎁스
 *    [돌아갈 축 아이콘] [항목 ⌄] — 탭은 숨긴다.
 * 둘 다 축은 'all'이라 필터만으론 구분이 안 된다. 그래서 들어온 길을 따로 받는다.
 *
 * 필터(북·공법)가 걸렸다고 축을 뒤집으면, 축 메뉴에서 북을 골라 들어온 사람이
 * 뒤로 갈 때 왔던 평면 목록이 아니라 책 표지 화면에 떨어진다.
 * 현재 축이 '레시피별'이면 그대로 둬서 들어온 길로 돌아가게 한다.
 *
 * 두 화면이 같은 구조라 여기 한 곳만 고치면 둘 다 바뀐다.
 */
export function crumbAxisOf(
  axis: GroupAxis,
  filters: {cookbook?: string | null; method?: string | null},
  /** 레시피북/공법 목록에서 항목을 눌러 들어왔으면 그 축 */
  drillFrom?: GroupAxis | null,
): GroupAxis {
  if (axis === 'all') {
    if (drillFrom === 'cookbook' && filters.cookbook) return 'cookbook';
    if (drillFrom === 'method' && filters.method) return 'method';
    return 'all';
  }
  if (filters.cookbook) return 'cookbook';
  if (filters.method) return 'method';
  return axis;
}
