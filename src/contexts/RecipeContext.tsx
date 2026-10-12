import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useRecipeStorage} from '@hooks/useRecipeStorage';
import type {Recipe} from '../types/recipe';
import type {AvatarColor} from '@components/Avatar/Avatar';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useAuth} from '@contexts/AuthContext';
import {doc, getDoc, setDoc} from 'firebase/firestore';
import {db} from '@config/firebase';

const COOKBOOK_COLORS_KEY = 'bakle_cookbook_colors_v1';
// 홈/둘러보기 메뉴 선택 유지 (앱 재시작해도 마지막 본 페이지 유지)
const SELECTION_KEY = 'bakle_home_selection_v1';
export const DEFAULT_COOKBOOK_COLOR: AvatarColor = 'brown';
/** 공식(둘러보기) 레시피북의 기본 색 */
export const DEFAULT_OFFICIAL_COOKBOOK_COLOR: AvatarColor = 'orange';
/**
 * 색을 정하지 않은 레시피북의 색 — 아이콘·팩 표지 글씨·메뉴가 모두 이 값을 쓴다.
 * 화면마다 기본값을 따로 적으면(브라운/오렌지) 같은 북인데 아이콘과 글씨 색이 달라진다.
 */
export const cookbookColorOf = (color: AvatarColor | undefined, official = false): AvatarColor =>
  color || (official ? DEFAULT_OFFICIAL_COOKBOOK_COLOR : DEFAULT_COOKBOOK_COLOR);

interface RecipeContextValue {
  recipes: Recipe[];
  setRecipes: (updater: Recipe[] | ((prev: Recipe[]) => Recipe[])) => void;
  exportRecipes: () => Promise<void>;
  importRecipes: (onConfirmOverwrite?: (count: number) => Promise<boolean>) => Promise<boolean>;
  isLoading: boolean;
  lastSyncedAt: Date | null;
  lastSyncedDevice: string | null;
  selectedCookbook: string | null;
  setSelectedCookbook: (cookbook: string | null) => void;
  selectedMethod: string | null;
  setSelectedMethod: (method: string | null) => void;
  selectedExploreCookbook: string | null;
  setSelectedExploreCookbook: (cookbook: string | null) => void;
  availableCookbooks: string[];
  /** id로 레시피 찾기 */
  findRecipeById: (id: string) => Recipe | undefined;
  /** 레시피 북별 색상 매핑 */
  cookbookColors: Record<string, AvatarColor>;
  /** 레시피 북 색상 설정 */
  setCookbookColor: (name: string, color: AvatarColor) => void;
  /** 레시피 북 이름 변경 시 색상도 이전 */
  renameCookbookColor: (oldName: string, newName: string) => void;
  /** 레시피 북 색상 삭제 */
  removeCookbookColor: (name: string) => void;
  /** Pull-to-refresh 시 데이터 다시 로드 */
  reload: () => Promise<void>;
  /** 레시피 추가 가능 여부 (로그인 유저 30개 제한) */
  canAddRecipe: () => boolean;
  /** 게스트→로그인(Pro) 시 올릴 로컬 레시피 수 (>0이면 확인 팝업) */
  migrationCount: number;
  /** 로컬 데이터를 계정에 올리기 (이미지 업로드 + 동기화) */
  confirmMigration: () => Promise<void>;
  /** 나중에 (로컬 유지, 업로드 안 함) */
  dismissMigration: () => void;
}

const RecipeContext = createContext<RecipeContextValue | null>(null);

export function RecipeProvider({children}: {children: React.ReactNode}) {
  const {showSnackbar} = useSnackbar();
  const {recipes, setRecipes, exportRecipes, importRecipes, isLoading, lastSyncedAt, lastSyncedDevice, reload, canAddRecipe, migrationCount, confirmMigration, dismissMigration} = useRecipeStorage(showSnackbar);
  const [selectedCookbook, setSelectedCookbookState] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethodState] = useState<string | null>(null);
  const [selectedExploreCookbook, setSelectedExploreCookbookState] = useState<string | null>(null);
  const [cookbookColors, setCookbookColorsState] = useState<Record<string, AvatarColor>>({});
  const colorsLoaded = useRef(false);
  // 저장된 선택을 덮어쓰지 않도록, 로드 완료 전엔 저장 스킵
  const selectionLoaded = useRef(false);

  // AsyncStorage에서 색상 로드
  useEffect(() => {
    AsyncStorage.getItem(COOKBOOK_COLORS_KEY).then(stored => {
      if (stored) {
        try { setCookbookColorsState(JSON.parse(stored)); } catch {}
      }
      colorsLoaded.current = true;
    });
  }, []);

  // 홈/둘러보기 메뉴 선택 복원 (마지막 본 페이지 유지)
  useEffect(() => {
    AsyncStorage.getItem(SELECTION_KEY).then(stored => {
      if (stored) {
        try {
          const s = JSON.parse(stored);
          if (s.cookbook != null) setSelectedCookbookState(s.cookbook);
          if (s.method != null) setSelectedMethodState(s.method);
          if (s.exploreCookbook != null) setSelectedExploreCookbookState(s.exploreCookbook);
        } catch {}
      }
      selectionLoaded.current = true;
    });
  }, []);

  // 선택 변경 시 저장 (로드 완료 후에만)
  const persistSelection = useCallback((cookbook: string | null, method: string | null, exploreCookbook: string | null) => {
    if (!selectionLoaded.current) return;
    AsyncStorage.setItem(SELECTION_KEY, JSON.stringify({cookbook, method, exploreCookbook})).catch(() => {});
  }, []);

  const setSelectedCookbook = useCallback((v: string | null) => {
    setSelectedCookbookState(v);
    persistSelection(v, selectedMethod, selectedExploreCookbook);
  }, [persistSelection, selectedMethod, selectedExploreCookbook]);
  const setSelectedMethod = useCallback((v: string | null) => {
    setSelectedMethodState(v);
    persistSelection(selectedCookbook, v, selectedExploreCookbook);
  }, [persistSelection, selectedCookbook, selectedExploreCookbook]);
  const setSelectedExploreCookbook = useCallback((v: string | null) => {
    setSelectedExploreCookbookState(v);
    persistSelection(selectedCookbook, selectedMethod, v);
  }, [persistSelection, selectedCookbook, selectedMethod]);

  // 레시피북 색 저장 — 기기(AsyncStorage)와 계정(users/{uid}.cookbookColors) 둘 다.
  // 기기에만 두면 만들 때 고른 색이 다른 기기·재설치에서 기본색으로 돌아갔다.
  const {user} = useAuth();
  const uidRef = useRef<string | undefined>(undefined);
  uidRef.current = user?.uid;
  const persistColors = useCallback((next: Record<string, AvatarColor>) => {
    AsyncStorage.setItem(COOKBOOK_COLORS_KEY, JSON.stringify(next)).catch(() => {});
    const uid = uidRef.current;
    // mergeFields: 이 필드만 통째로 — merge:true면 지운 북 색이 서버에 남는다
    if (uid) setDoc(doc(db, 'users', uid), {cookbookColors: next}, {mergeFields: ['cookbookColors']})
      .catch(e => console.warn('[RecipeContext] 레시피북 색 저장 실패:', e));
  }, []);

  // 로그인하면 계정 색을 불러와 기기 색과 합친다(계정 우선). 기기에만 있던 색은 계정에 올린다.
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    let alive = true;
    getDoc(doc(db, 'users', uid)).then(snap => {
      if (!alive) return;
      const remote = (snap.data()?.cookbookColors ?? {}) as Record<string, AvatarColor>;
      setCookbookColorsState(prev => {
        const next = {...prev, ...remote};
        const hasLocalOnly = Object.keys(prev).some(k => !(k in remote));
        AsyncStorage.setItem(COOKBOOK_COLORS_KEY, JSON.stringify(next)).catch(() => {});
        if (hasLocalOnly) setDoc(doc(db, 'users', uid), {cookbookColors: next}, {mergeFields: ['cookbookColors']}).catch(() => {});
        return next;
      });
    }).catch(e => console.warn('[RecipeContext] 레시피북 색 불러오기 실패:', e));
    return () => { alive = false; };
  }, [user?.uid]);

  const setCookbookColor = useCallback((name: string, color: AvatarColor) => {
    setCookbookColorsState(prev => {
      const next = {...prev, [name]: color};
      persistColors(next);
      return next;
    });
  }, [persistColors]);

  const renameCookbookColor = useCallback((oldName: string, newName: string) => {
    setCookbookColorsState(prev => {
      if (!(oldName in prev)) return prev;
      const {[oldName]: color, ...rest} = prev;
      const next = {...rest, [newName]: color};
      persistColors(next);
      return next;
    });
  }, [persistColors]);

  const removeCookbookColor = useCallback((name: string) => {
    setCookbookColorsState(prev => {
      if (!(name in prev)) return prev;
      const {[name]: _, ...rest} = prev;
      persistColors(rest);
      return rest;
    });
  }, [persistColors]);

  const availableCookbooks = useMemo(() => {
    const fromRecipes = recipes.map(r => r.cookbook).filter(Boolean) as string[];
    const fromColors = Object.keys(cookbookColors);
    return [...new Set([...fromRecipes, ...fromColors])];
  }, [recipes, cookbookColors]);

  const findRecipeById = useCallback((id: string) => {
    return recipes.find(r => r.id === id);
  }, [recipes]);

  const value = useMemo<RecipeContextValue>(() => ({
    recipes,
    setRecipes,
    exportRecipes,
    importRecipes,
    isLoading,
    lastSyncedAt,
    lastSyncedDevice,
    selectedCookbook,
    setSelectedCookbook,
    selectedMethod,
    setSelectedMethod,
    selectedExploreCookbook,
    setSelectedExploreCookbook,
    availableCookbooks,
    findRecipeById,
    cookbookColors,
    setCookbookColor,
    renameCookbookColor,
    removeCookbookColor,
    reload,
    canAddRecipe,
    migrationCount,
    confirmMigration,
    dismissMigration,
  }), [recipes, setRecipes, exportRecipes, importRecipes, isLoading, lastSyncedAt, lastSyncedDevice, selectedCookbook, selectedMethod, selectedExploreCookbook, availableCookbooks, findRecipeById, cookbookColors, setCookbookColor, renameCookbookColor, removeCookbookColor, reload, canAddRecipe, migrationCount, confirmMigration, dismissMigration]);

  return (
    <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>
  );
}

export function useRecipes(): RecipeContextValue {
  const ctx = useContext(RecipeContext);
  if (!ctx) throw new Error('useRecipes must be used within RecipeProvider');
  return ctx;
}
