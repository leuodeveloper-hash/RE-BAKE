import {IconBookFilled, IconExprolerBookFilled} from '@components/Icon/IconIndex';
import {getColorVarKey} from '@components/ColorPicker';
import {cookbookColorOf} from '@contexts/RecipeContext';
import type {AvatarColor} from '@components/Avatar/Avatar';
import type {SemanticColors} from '@constants/tokens';

/**
 * 메뉴의 레시피북 한 줄 — 모든 레시피북 메뉴가 이 하나를 쓴다(홈·둘러보기·레시피북 화면·카드 메뉴).
 * 북 아이콘(공식 북은 공식 레시피북 아이콘) + 그 북의 var 색.
 * 화면마다 따로 만들면 한쪽만 아이콘·색이 빠진다.
 */
export function cookbookMenuItem(
  name: string,
  opts: {colors: SemanticColors; color?: AvatarColor; official?: boolean; id?: string},
) {
  const {colors, color, official = false, id = name} = opts;
  return {
    id,
    label: name,
    icon: official ? IconExprolerBookFilled : IconBookFilled,
    iconColor: colors[getColorVarKey(cookbookColorOf(color, official))] as string,
  };
}
