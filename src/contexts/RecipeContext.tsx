import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {useRecipeStorage} from '@hooks/useRecipeStorage';
import {MockRecipe} from '@data/mockRecipes';

interface RecipeContextValue {
  recipes: MockRecipe[];
  setRecipes: (updater: MockRecipe[] | ((prev: MockRecipe[]) => MockRecipe[])) => void;
  exportRecipes: () => Promise<void>;
  importRecipes: () => Promise<boolean>;
  isLoading: boolean;
  selectedCookbook: string | null;
  setSelectedCookbook: (cookbook: string | null) => void;
  availableCookbooks: string[];
  /** id로 레시피 찾기 */
  findRecipeById: (id: string) => MockRecipe | undefined;
}

const RecipeContext = createContext<RecipeContextValue | null>(null);

export function RecipeProvider({children}: {children: React.ReactNode}) {
  const {recipes, setRecipes, exportRecipes, importRecipes, isLoading} = useRecipeStorage();
  const [selectedCookbook, setSelectedCookbook] = useState<string | null>(null);

  const availableCookbooks = useMemo(() => {
    return [...new Set(recipes.map(r => r.category).filter(Boolean))] as string[];
  }, [recipes]);

  const findRecipeById = useCallback((id: string) => {
    return recipes.find(r => r.id === id);
  }, [recipes]);

  const value = useMemo<RecipeContextValue>(() => ({
    recipes,
    setRecipes,
    exportRecipes,
    importRecipes,
    isLoading,
    selectedCookbook,
    setSelectedCookbook,
    availableCookbooks,
    findRecipeById,
  }), [recipes, setRecipes, exportRecipes, importRecipes, isLoading, selectedCookbook, availableCookbooks, findRecipeById]);

  return (
    <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>
  );
}

export function useRecipes(): RecipeContextValue {
  const ctx = useContext(RecipeContext);
  if (!ctx) throw new Error('useRecipes must be used within RecipeProvider');
  return ctx;
}
