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

/** 축 메뉴에 들어갈 항목 한 줄 */
interface AxisItem {id: string; label: string; icon?: any; iconColor?: string}

/**
 * 축 메뉴 섹션을 만든다 — 홈·둘러보기가 같이 쓴다.
 *
 * '레시피별'에 화살표를 달고, 펼치면 바로 그 밑에 레시피북이 온다.
 * 축 목록을 통째로 그린 뒤 붙이면 맨 아래(회고 다음)에 떨어져 무엇에
 * 딸린 목록인지 알 수 없다. 그래서 '레시피별'과 나머지 사이에 끼운다.
 */
export function axisMenuSections(opts: {
  axisItems: AxisItem[];
  crumbAxis: GroupAxis;
  /** 펼쳤을 때 보일 레시피북 목록 */
  cookbookItems: AxisItem[];
  cookbookListOpen: boolean;
  selectedCookbookId: string;
}) {
  const {axisItems, crumbAxis, cookbookItems, cookbookListOpen, selectedCookbookId} = opts;
  return [
    {
      items: axisItems.filter(a => a.id === 'all').map(a => ({...a, hasChildren: true})),
      selectedId: crumbAxis,
    },
    ...(cookbookListOpen
      ? [{items: cookbookItems, selectedId: selectedCookbookId}]
      : []),
    {
      items: axisItems.filter(a => a.id !== 'all'),
      selectedId: crumbAxis,
    },
  ];
}
