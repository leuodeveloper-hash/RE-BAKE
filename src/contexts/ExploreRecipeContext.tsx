import React, {createContext, useContext, useMemo} from 'react';
import {useExploreRecipes} from '@hooks/useExploreRecipes';
import {useSnackbar} from './SnackbarContext';
import {useAuth} from './AuthContext';
import type {Recipe} from '../types/recipe';
import type {ExploreCookbook} from '@hooks/useExploreRecipes';

interface ExploreRecipeContextValue {
  recipes: Recipe[];
  exploreCookbooks: ExploreCookbook[];
  isLoading: boolean;
  reload: () => Promise<void>;
}

const ExploreRecipeContext = createContext<ExploreRecipeContextValue | null>(null);

export function ExploreRecipeProvider({children}: {children: React.ReactNode}) {
  const {showSnackbar} = useSnackbar();
  const {isAdmin} = useAuth();
  const {recipes, exploreCookbooks, isLoading, reload} = useExploreRecipes(showSnackbar, isAdmin);

  const value = useMemo<ExploreRecipeContextValue>(() => ({
    recipes, exploreCookbooks, isLoading, reload,
  }), [recipes, exploreCookbooks, isLoading, reload]);

  return (
    <ExploreRecipeContext.Provider value={value}>
      {children}
    </ExploreRecipeContext.Provider>
  );
}

export function useExploreRecipeContext(): ExploreRecipeContextValue {
  const ctx = useContext(ExploreRecipeContext);
  if (!ctx) throw new Error('useExploreRecipeContext must be used within ExploreRecipeProvider');
  return ctx;
}
