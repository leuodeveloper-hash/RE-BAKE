import type {GroupAxis} from '@components/RecipeGroups/groupAxis';

/**
 * 브레드크럼에 보일 축을 정한다 — 홈·둘러보기가 같이 쓴다.
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
): GroupAxis {
  if (axis === 'all') return 'all';
  if (filters.cookbook) return 'cookbook';
  if (filters.method) return 'method';
  return axis;
}
