import type {MenuItemData} from '@components/Menu';
import {parseSession} from '@utils/session';
import {
  IconHash,
  IconEdit,
  IconArrowDownToLine,
  IconTrash,
  IconFilesFilled,
  IconBookFilled,
} from '@components/Icon/IconIndex';
import type {AvatarColor} from '@components/Avatar/Avatar';
import type {SemanticColors} from '@constants/tokens';
import {getColorVarKey} from '@components/ColorPicker';

interface RecipeMenuOptions {
  session?: string;
  showImport?: boolean;
  showRemake?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  showCookbook?: boolean;
}

export function getRecipeMenuItems(options: RecipeMenuOptions): MenuItemData[] {
  const items: MenuItemData[] = [];
  if (options.showImport) items.push({id: 'save', label: '내 레시피로 복사', icon: IconFilesFilled});
  if (options.showRemake) {
    const {total} = parseSession(options.session);
    items.push({id: 'remake', label: `다시 만들기: ${total + 1}회차`, icon: IconHash});
  }
  if (options.showEdit) items.push({id: 'edit', label: '편집', icon: IconEdit});
  if (options.showCookbook) items.push({id: 'cookbook', label: '요리책', icon: IconBookFilled});
  items.push({id: 'download', label: 'PDF 다운로드', icon: IconArrowDownToLine});
  if (options.showDelete) items.push({id: 'delete', label: '삭제', icon: IconTrash, destructive: true});
  return items;
}

interface CookbookSubmenuOptions {
  availableCookbooks: string[];
  cookbookColors: Record<string, AvatarColor>;
  currentCookbook: string;
  colors: SemanticColors;
}

export function getCookbookSubmenuItems(options: CookbookSubmenuOptions): {
  items: MenuItemData[];
  selectedId: string;
} {
  const {availableCookbooks, cookbookColors, currentCookbook, colors} = options;
  const items: MenuItemData[] = [
    {id: 'cookbook:__none__', label: '그룹없음', icon: IconBookFilled},
  ];
  for (const name of availableCookbooks) {
    const avatarColor = cookbookColors[name];
    items.push({
      id: `cookbook:${name}`,
      label: name,
      icon: IconBookFilled,
      iconColor: avatarColor ? colors[getColorVarKey(avatarColor)] : undefined,
    });
  }
  const selectedId = currentCookbook
    ? `cookbook:${currentCookbook}`
    : 'cookbook:__none__';
  return {items, selectedId};
}
