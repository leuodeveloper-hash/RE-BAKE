import type {MenuItemData} from '@components/Menu';
import {parseSession} from '@utils/session';
import {
  IconHash,
  IconEdit,
  IconArrowDownToLine,
  IconTrash,
  IconFilesFilled,
  IconBookFilled,
  IconExprolerBookFilled,
  IconShare,
} from '@components/Icon/IconIndex';
import type {AvatarColor} from '@components/Avatar/Avatar';
import type {SemanticColors} from '@constants/tokens';
import {getColorVarKey} from '@components/ColorPicker';

type TFunction = (key: string, params?: Record<string, unknown>) => string;

interface RecipeMenuOptions {
  t: TFunction;
  session?: string;
  showImport?: boolean;
  showRemake?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  showCookbook?: boolean;
  showCopyToExplore?: boolean;
  /** 유저: 둘러보기에 공개 신청 (어드민 승인 필요) */
  showSubmitToExplore?: boolean;
  showShare?: boolean;
  /** 전체 PDF 다운로드 (단일 download 대신, 리스트 화면용) */
  showDownloadAll?: boolean;
  /** 전체 삭제 (리스트 화면용). false면 아예 숨김 */
  showDeleteAll?: boolean;
  /** 단일 PDF 다운로드 노출 여부 (기본 true) */
  showDownload?: boolean;
}

export function getRecipeMenuItems(options: RecipeMenuOptions): MenuItemData[] {
  const {t} = options;
  const items: MenuItemData[] = [];
  if (options.showImport) items.push({id: 'save', label: t('recipeMenuItems.copyToMyRecipes'), icon: IconFilesFilled});
  if (options.showRemake) {
    const {total} = parseSession(options.session);
    items.push({id: 'remake', label: t('recipeMenuItems.remakeCount', {count: total + 1}), icon: IconHash});
  }
  if (options.showEdit) items.push({id: 'edit', label: t('recipeMenuItems.edit'), icon: IconEdit});
  if (options.showCookbook) items.push({id: 'cookbook', label: t('recipeMenuItems.recipeBook'), icon: IconBookFilled});
  if (options.showCopyToExplore) items.push({id: 'copyToExplore', label: t('recipeMenuItems.copyToExplore'), icon: IconExprolerBookFilled});
  if (options.showSubmitToExplore) items.push({id: 'submitToExplore', label: t('recipeMenuItems.submitToExplore'), icon: IconExprolerBookFilled});
  if (options.showShare) items.push({id: 'share', label: t('recipeMenuItems.share'), icon: IconShare});
  if (options.showDownloadAll) items.push({id: 'downloadAll', label: t('recipeMenuItems.downloadPdf'), icon: IconArrowDownToLine});
  if (options.showDownload !== false && !options.showDownloadAll) {
    items.push({id: 'download', label: t('recipeMenuItems.downloadPdf'), icon: IconArrowDownToLine});
  }
  if (options.showDelete) items.push({id: 'delete', label: t('recipeMenuItems.delete'), icon: IconTrash, destructive: true});
  if (options.showDeleteAll) items.push({id: 'deleteAll', label: t('recipeMenuItems.deleteAll'), icon: IconTrash, destructive: true});
  return items;
}

interface CookbookSubmenuOptions {
  t: TFunction;
  availableCookbooks: string[];
  cookbookColors: Record<string, AvatarColor>;
  currentCookbook: string;
  colors: SemanticColors;
}

export function getCookbookSubmenuItems(options: CookbookSubmenuOptions): {
  items: MenuItemData[];
  selectedId: string;
} {
  const {t, availableCookbooks, cookbookColors, currentCookbook, colors} = options;
  const items: MenuItemData[] = [
    {id: 'cookbook:__none__', label: t('recipeMenuItems.noRecipeBook'), icon: IconBookFilled},
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
