import type {MenuItemData} from '@components/Menu';
import {parseSession} from '@utils/session';
import {
  IconHash,
  IconEdit,
  IconArrowDownToLine,
  IconTrash,
  IconCopyFilled,
  IconBookFilled,
  IconExprolerBookFilled,
  IconShare,
  IconMailFilled,
  IconPin,
  IconPinFilled,
  IconCircleCheck,
  IconCircleCheckFilled,
} from '@components/Icon/IconIndex';
import type {AvatarColor} from '@components/Avatar/Avatar';
import type {SemanticColors} from '@constants/tokens';
import {cookbookMenuItem} from './cookbookMenuItem';

type TFunction = (key: string, params?: Record<string, unknown>) => string;

interface RecipeMenuOptions {
  t: TFunction;
  session?: string;
  /** 목록 상단 고정 — 이미 고정돼 있으면 해제 항목으로 바뀐다 */
  showPin?: boolean;
  isPinned?: boolean;
  /** 만들어봤음 표시 — 이미 표시돼 있으면 해제 항목으로 바뀐다 */
  showMade?: boolean;
  isMade?: boolean;
  showImport?: boolean;
  /** 내 레시피 복제 — 같은 내용으로 새 레시피 하나 더 */
  showDuplicate?: boolean;
  showRemake?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  showCookbook?: boolean;
  showCopyToExplore?: boolean;
  /** 유저: 둘러보기에 공개 신청 (어드민 승인 필요) */
  showSubmitToExplore?: boolean;
  showShare?: boolean;
  /** 이 레시피에 대한 의견 보내기(메일) */
  showFeedback?: boolean;
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
  if (options.showPin) {
    items.push(options.isPinned
      ? {id: 'unpin', label: t('recipeMenuItems.unpin'), icon: IconPinFilled}
      : {id: 'pin', label: t('recipeMenuItems.pin'), icon: IconPin});
  }
  if (options.showMade) {
    items.push(options.isMade
      ? {id: 'unmade', label: t('recipeMenuItems.unmade'), icon: IconCircleCheckFilled}
      : {id: 'made', label: t('recipeMenuItems.made'), icon: IconCircleCheck});
  }
  if (options.showImport) items.push({id: 'save', label: t('recipeMenuItems.copyToMyRecipes'), icon: IconCopyFilled});
  if (options.showDuplicate) items.push({id: 'duplicate', label: t('recipeMenuItems.duplicate'), icon: IconCopyFilled});
  if (options.showRemake) {
    // 다음 회차 번호 = 지금 회차 + 1(회차는 레시피 하나 안 기록 — session엔 지금 회차가 'N회차'로 온다)
    const {current} = parseSession(options.session);
    items.push({id: 'remake', label: t('recipeMenuItems.remakeCount', {count: current + 1}), icon: IconHash});
  }
  if (options.showEdit) items.push({id: 'edit', label: t('recipeMenuItems.edit'), icon: IconEdit});
  if (options.showCookbook) items.push({id: 'cookbook', label: t('recipeMenuItems.recipeBook'), icon: IconBookFilled});
  if (options.showCopyToExplore) items.push({id: 'copyToExplore', label: t('recipeMenuItems.copyToExplore'), icon: IconExprolerBookFilled});
  if (options.showSubmitToExplore) items.push({id: 'submitToExplore', label: t('recipeMenuItems.submitToExplore'), icon: IconExprolerBookFilled});
  if (options.showShare) items.push({id: 'share', label: t('recipeMenuItems.share'), icon: IconShare});
  if (options.showFeedback) items.push({id: 'feedback', label: t('recipeMenuItems.feedback'), icon: IconMailFilled});
  if (options.showDownloadAll) items.push({id: 'downloadAll', label: t('recipeMenuItems.downloadPdf'), icon: IconArrowDownToLine});
  if (options.showDownload !== false && !options.showDownloadAll) {
    items.push({id: 'download', label: t('recipeMenuItems.downloadPdf'), icon: IconArrowDownToLine});
  }
  if (options.showDelete) items.push({id: 'delete', label: t('recipeMenuItems.delete'), icon: IconTrash, destructive: true});
  if (options.showDeleteAll) items.push({id: 'deleteAll', label: t('recipeMenuItems.deleteAll'), icon: IconTrash, destructive: true});
  return items;
}

/** 레시피 하나의 ⋮ 메뉴 상황 — 상세·목록 카드가 같은 규칙으로 항목을 고른다 */
export interface RecipeMenuContext {
  t: TFunction;
  /** 내 레시피 / 둘러보기(공식) 레시피 */
  mine: boolean;
  explore: boolean;
  isAdmin: boolean;
  signedIn: boolean;
  /** 팁(읽는 정보) — 만들었어요·새 회차가 없다 */
  isTip: boolean;
  session?: string;
  canPin?: boolean;
  isPinned?: boolean;
  isMade?: boolean;
  /** 이미 내 레시피로 가져옴 — 가져오기 항목을 숨긴다 */
  alreadyImported?: boolean;
  /** 이미 둘러보기에 있음(둘러보기에서 가져온 것·이미 공개한 것) — 둘러보기 공개 항목을 숨긴다 */
  inExplore?: boolean;
}

/**
 * 상세 ⋮와 목록 카드 ⋮의 공통 항목 — 한 곳에서 정해 두 메뉴가 늘 같다.
 * (상세에만 있는 '이 회차 삭제'·'비교'와 어드민 잠금 항목은 각 화면이 덧붙인다)
 */
export function recipeMenuFor(c: RecipeMenuContext): MenuItemData[] {
  const canEdit = c.mine || (c.explore && c.isAdmin);
  return getRecipeMenuItems({
    t: c.t,
    session: c.session,
    showPin: c.canPin ?? true,
    isPinned: c.isPinned,
    showMade: !c.isTip,
    isMade: c.isMade,
    // 이미 가져왔어도 늘 보인다 — 한 번 더 가져와 새로 고쳐 쓸 수 있다
    showImport: c.explore,
    showDuplicate: c.mine,
    showRemake: c.mine && !c.isTip,
    showEdit: canEdit,
    showDelete: canEdit,
    showCookbook: c.mine,
    showCopyToExplore: c.mine && c.isAdmin && !c.inExplore,
    showSubmitToExplore: c.mine && !c.isAdmin && c.signedIn && !c.inExplore,
    showShare: !c.isTip || c.explore,
    showFeedback: c.explore,
  });
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
    items.push(cookbookMenuItem(name, {colors, color: cookbookColors[name], id: `cookbook:${name}`}));
  }
  const selectedId = currentCookbook
    ? `cookbook:${currentCookbook}`
    : 'cookbook:__none__';
  return {items, selectedId};
}

/** 복제본 — 내용은 그대로, 새 레시피로(회차·스탬프·고정·공개 연결은 새로 시작) */
export function duplicateRecipe<T extends {id: string; title: string}>(r: T, copySuffix: string): T {
  const now = new Date().toISOString();
  const {sessions: _s, sessionId: _si, sessionNumber: _sn, session: _ss, madeAt: _m, pinnedAt: _p, ...rest} = r as any;
  return {...rest, id: `user_${Date.now()}`, title: `${r.title} ${copySuffix}`, createdAt: now, updatedAt: now} as T;
}
