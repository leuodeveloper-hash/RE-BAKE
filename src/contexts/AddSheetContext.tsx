import React, {createContext, useContext, useMemo, useRef, useState} from 'react';
import type {AvatarColor} from '@components/Avatar/Avatar';

export interface CookbookEditTarget {
  name: string;
  color: AvatarColor;
  /** 둘러보기(공식) 레시피 북 편집 여부 */
  isExplore?: boolean;
}

interface AddSheetContextValue {
  showAddSheet: boolean;
  setShowAddSheet: (show: boolean) => void;
  /** 통합 검색 모달 표시 (검색 탭에서 토글) */
  showSearchSheet: boolean;
  setShowSearchSheet: (show: boolean) => void;
  hideTabBar: boolean;
  setHideTabBar: (hide: boolean) => void;
  hideContentMask: boolean;
  setHideContentMask: (hide: boolean) => void;
  showCookbookDialog: boolean;
  setShowCookbookDialog: (show: boolean) => void;
  /** 편집 대상 (null이면 추가 모드) */
  cookbookEditTarget: CookbookEditTarget | null;
  setCookbookEditTarget: (target: CookbookEditTarget | null) => void;
  /** 쿡북 추가 다이얼로그의 '공식 레시피 북' 토글 초기값 (둘러보기에서 추가 시 true) */
  cookbookInitialOfficial: boolean;
  setCookbookInitialOfficial: (v: boolean) => void;
  /** 레시피 북 생성 후 콜백 (RecipeEditScreen 등에서 활용) */
  onCookbookCreatedRef: React.RefObject<((name: string, color: AvatarColor) => void) | null>;
}

const AddSheetContext = createContext<AddSheetContextValue | null>(null);

export function AddSheetProvider({children}: {children: React.ReactNode}) {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showSearchSheet, setShowSearchSheet] = useState(false);
  const [hideTabBar, setHideTabBar] = useState(false);
  const [hideContentMask, setHideContentMask] = useState(false);
  const [showCookbookDialog, setShowCookbookDialog] = useState(false);
  const [cookbookEditTarget, setCookbookEditTarget] = useState<CookbookEditTarget | null>(null);
  const [cookbookInitialOfficial, setCookbookInitialOfficial] = useState(false);
  const onCookbookCreatedRef = useRef<((name: string, color: AvatarColor) => void) | null>(null);

  const value = useMemo<AddSheetContextValue>(() => ({
    showAddSheet,
    setShowAddSheet,
    showSearchSheet,
    setShowSearchSheet,
    hideTabBar,
    setHideTabBar,
    hideContentMask,
    setHideContentMask,
    showCookbookDialog,
    setShowCookbookDialog,
    cookbookEditTarget,
    setCookbookEditTarget,
    cookbookInitialOfficial,
    setCookbookInitialOfficial,
    onCookbookCreatedRef,
  }), [showAddSheet, showSearchSheet, hideTabBar, hideContentMask, showCookbookDialog, cookbookEditTarget, cookbookInitialOfficial]);

  return (
    <AddSheetContext.Provider value={value}>{children}</AddSheetContext.Provider>
  );
}

export function useAddSheet(): AddSheetContextValue {
  const ctx = useContext(AddSheetContext);
  if (!ctx) throw new Error('useAddSheet must be used within AddSheetProvider');
  return ctx;
}
