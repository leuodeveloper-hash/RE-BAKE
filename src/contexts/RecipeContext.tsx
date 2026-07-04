import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useRecipeStorage} from '@hooks/useRecipeStorage';
import type {Recipe} from '../types/recipe';
import type {AvatarColor} from '@components/Avatar/Avatar';

const COOKBOOK_COLORS_KEY = 'bakecycle_cookbook_colors_v1';
export const DEFAULT_COOKBOOK_COLOR: AvatarColor = 'brown';

interface RecipeContextValue {
  recipes: Recipe[];
  setRecipes: (updater: Recipe[] | ((prev: Recipe[]) => Recipe[])) => void;
  exportRecipes: () => Promise<void>;
  importRecipes: () => Promise<boolean>;
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
  const {recipes, setRecipes, exportRecipes, importRecipes, isLoading, lastSyncedAt, lastSyncedDevice, reload, canAddRecipe, migrationCount, confirmMigration, dismissMigration} = useRecipeStorage();
  const [selectedCookbook, setSelectedCookbook] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [selectedExploreCookbook, setSelectedExploreCookbook] = useState<string | null>(null);
  const [cookbookColors, setCookbookColorsState] = useState<Record<string, AvatarColor>>({});
  const colorsLoaded = useRef(false);

  // AsyncStorage에서 색상 로드
  useEffect(() => {
    AsyncStorage.getItem(COOKBOOK_COLORS_KEY).then(stored => {
      if (stored) {
        try { setCookbookColorsState(JSON.parse(stored)); } catch {}
      }
      colorsLoaded.current = true;
    });
  }, []);

  const setCookbookColor = useCallback((name: string, color: AvatarColor) => {
    setCookbookColorsState(prev => {
      const next = {...prev, [name]: color};
      AsyncStorage.setItem(COOKBOOK_COLORS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const renameCookbookColor = useCallback((oldName: string, newName: string) => {
    setCookbookColorsState(prev => {
      if (!(oldName in prev)) return prev;
      const {[oldName]: color, ...rest} = prev;
      const next = {...rest, [newName]: color};
      AsyncStorage.setItem(COOKBOOK_COLORS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const removeCookbookColor = useCallback((name: string) => {
    setCookbookColorsState(prev => {
      if (!(name in prev)) return prev;
      const {[name]: _, ...rest} = prev;
      AsyncStorage.setItem(COOKBOOK_COLORS_KEY, JSON.stringify(rest)).catch(() => {});
      return rest;
    });
  }, []);

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
