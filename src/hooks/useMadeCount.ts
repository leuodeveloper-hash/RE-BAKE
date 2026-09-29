import {useMemo} from 'react';
import {useRecipes} from '@contexts/RecipeContext';

/**
 * 지금까지 모은 우표 수.
 *
 * 다음에 찍힐 우표의 모양이 이 값으로 정해지므로, 확인 시트의 미리보기와
 * 우표첩에 실제로 붙는 모양이 어긋나지 않으려면 같은 기준으로 세야 한다.
 * 회차(remakeGroupId)는 우표첩과 마찬가지로 한 장으로 묶는다.
 */
export function useMadeCount(): number {
  const {recipes} = useRecipes();

  return useMemo(() => {
    const groups = new Set<string>();
    for (const r of recipes) if (r.madeAt) groups.add(r.remakeGroupId ?? r.id);
    return groups.size;
  }, [recipes]);
}
