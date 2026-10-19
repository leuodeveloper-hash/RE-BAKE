import {useCallback} from 'react';
import {doc, setDoc, deleteField} from 'firebase/firestore';
import {db} from '@config/firebase';
import {IconLock, IconUnlock, IconBroom} from '@components/Icon/IconIndex';
import type {MenuItemData} from '@components/Menu';
import type {Recipe} from '../types/recipe';
import {ENTITLEMENTS} from '@constants/entitlements';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useTranslation} from '@contexts/LanguageContext';
import {useExploreRecipeContext} from '@contexts/ExploreRecipeContext';

/**
 * 둘러보기 잠금 — 둘러보기·작성자 홈·어드민 내 홈이 같은 규칙을 쓴다.
 * 어드민이 정한 것 먼저('free'는 늘 열림, 'locked'는 늘 잠김), 나머지는 목록 앞 N개만 무료(자동).
 */
export const FREE_RECIPE_COUNT = ENTITLEMENTS.free.quota.exploreFree;

export function computeLockedIds(list: Recipe[]): Set<string> {
  const ids = new Set<string>();
  let autoIndex = 0;
  for (const r of list) {
    if (r.lockMode === 'free') continue;
    if (r.lockMode === 'locked') { ids.add(r.id); continue; }
    if (autoIndex >= FREE_RECIPE_COUNT) ids.add(r.id);
    autoIndex++;
  }
  return ids;
}

/**
 * 어드민 카드 메뉴에 잠금 항목을 끼운다(삭제 바로 위).
 * 지금 보이는 상태(자물쇠 유무)의 반대 하나만, 정해 둔 상태면 '자동으로'도.
 */
export function insertLockItems(
  items: MenuItemData[], lockMode: Recipe['lockMode'], locked: boolean,
  t: (key: string, params?: Record<string, unknown>) => string,
): MenuItemData[] {
  const lock: MenuItemData[] = [
    locked
      ? {id: 'lockFree', label: t('exploreLock.free'), icon: IconUnlock}
      : {id: 'lockLocked', label: t('exploreLock.locked'), icon: IconLock},
    ...(lockMode ? [{id: 'lockAuto', label: t('exploreLock.auto'), icon: IconBroom}] : []),
  ];
  const del = items.findIndex(i => i.id === 'delete');
  return del < 0 ? [...items, ...lock] : [...items.slice(0, del), ...lock, ...items.slice(del)];
}

export const isLockMenuId = (id: string) => id === 'lockFree' || id === 'lockLocked' || id === 'lockAuto';

/** 잠금 메뉴를 고르면 — 둘러보기 문서에 바로 쓰고 다시 불러온다(비우면 자동) */
export function useSetExploreLock() {
  const {showSnackbar} = useSnackbar();
  const {t} = useTranslation();
  const {reload} = useExploreRecipeContext();
  return useCallback((menuId: string, exploreId: string) => {
    const mode = menuId === 'lockFree' ? 'free' : menuId === 'lockLocked' ? 'locked' : null;
    setDoc(doc(db, 'explore_recipes', exploreId), {lockMode: mode ?? deleteField()}, {merge: true})
      .then(() => {
        reload();
        showSnackbar(t(mode === 'free' ? 'exploreLock.setFree' : mode === 'locked' ? 'exploreLock.setLocked' : 'exploreLock.setAuto'), {tone: 'positive'});
      })
      .catch(() => showSnackbar(t('exploreLock.failed'), {tone: 'error'}));
  }, [reload, showSnackbar, t]);
}
