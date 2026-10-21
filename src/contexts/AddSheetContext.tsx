import React, {createContext, useCallback, useContext, useMemo, useRef, useState} from 'react';
import type {AvatarColor} from '@components/Avatar/Avatar';

export interface CookbookEditTarget {
  name: string;
  color: AvatarColor;
  /** 둘러보기(공식) 레시피 북 편집 여부 */
  isExplore?: boolean;
  /** 공식 북 숨김 여부(편집 프리필용) — 어드민만 보임 */
  hidden?: boolean;
}

interface AddSheetContextValue {
  showAddSheet: boolean;
  setShowAddSheet: (show: boolean) => void;
  /** 통합 검색 모달 표시 (검색 탭에서 토글) */
  showSearchSheet: boolean;
  setShowSearchSheet: (show: boolean) => void;
  /** 검색 창을 이 글로 바로 연다 — 목록 메타데이터(레시피북·공법)를 눌렀을 때 */
  openSearch: (query?: string) => void;
  /** 검색 창을 열 때 넣어 둘 글 */
  searchQuery: string;
  hideTabBar: boolean;
  setHideTabBar: (hide: boolean) => void;
  hideContentMask: boolean;
  setHideContentMask: (hide: boolean) => void;
  showCookbookDialog: boolean;
  setShowCookbookDialog: (show: boolean) => void;
  /** 편집 대상 (null이면 추가 모드) */
  cookbookEditTarget: CookbookEditTarget | null;
  setCookbookEditTarget: (target: CookbookEditTarget | null) => void;
  /** 레시피 북 추가 다이얼로그의 '공식 레시피 북' 토글 초기값 (둘러보기에서 추가 시 true) */
  cookbookInitialOfficial: boolean;
  setCookbookInitialOfficial: (v: boolean) => void;
  /** 레시피 북 생성 후 콜백 (RecipeEditScreen 등에서 활용) */
  onCookbookCreatedRef: React.RefObject<((name: string, color: AvatarColor) => void) | null>;
}

const AddSheetContext = createContext<AddSheetContextValue | null>(null);

export function AddSheetProvider({children}: {children: React.ReactNode}) {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showSearchSheet, setShowSearchSheetState] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // 그냥 열면 빈 검색, openSearch(글)이면 그 글로
  const setShowSearchSheet = useCallback((show: boolean) => { if (show) setSearchQuery(''); setShowSearchSheetState(show); }, []);
  const openSearch = useCallback((query?: string) => { setSearchQuery(query ?? ''); setShowSearchSheetState(true); }, []);
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
    openSearch,
    searchQuery,
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
  }), [showAddSheet, showSearchSheet, searchQuery, setShowSearchSheet, openSearch, hideTabBar, hideContentMask, showCookbookDialog, cookbookEditTarget, cookbookInitialOfficial]);

  return (
    <AddSheetContext.Provider value={value}>{children}</AddSheetContext.Provider>
  );
}

export function useAddSheet(): AddSheetContextValue {
  const ctx = useContext(AddSheetContext);
  if (!ctx) throw new Error('useAddSheet must be used within AddSheetProvider');
  return ctx;
}
