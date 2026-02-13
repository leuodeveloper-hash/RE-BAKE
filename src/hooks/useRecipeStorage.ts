import {useCallback, useEffect, useRef, useState} from 'react';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {MOCK_RECIPES, MockRecipe} from '@data/mockRecipes';
import type {RecipeExportData, SerializableRecipe} from '../types/recipe';

const STORAGE_KEY = 'bakecycle_recipes';

/** imageSource를 제거하여 직렬화 가능한 형태로 변환 */
function toSerializable(recipe: MockRecipe): SerializableRecipe {
  const {imageSource, ...rest} = recipe;
  return rest;
}

/** MOCK_RECIPES에서 id가 일치하는 레시피의 imageSource를 복원 */
function restoreImageSources(recipes: SerializableRecipe[]): MockRecipe[] {
  const mockMap = new Map(MOCK_RECIPES.map(r => [r.id, r.imageSource]));
  return recipes.map(r => ({
    ...r,
    imageSource: mockMap.get(r.id),
  }));
}

/** 가져온 데이터가 유효한 RecipeExportData인지 검증 */
function validateExportData(data: unknown): data is RecipeExportData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (d.version !== 1 || !Array.isArray(d.recipes)) return false;
  return d.recipes.every(
    (r: unknown) =>
      r &&
      typeof r === 'object' &&
      typeof (r as Record<string, unknown>).id === 'string' &&
      typeof (r as Record<string, unknown>).title === 'string',
  );
}

export function useRecipeStorage() {
  const [recipes, setRecipesState] = useState<MockRecipe[]>(() => [
    ...MOCK_RECIPES,
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  // AsyncStorage에서 데이터 로드
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: SerializableRecipe[] = JSON.parse(stored);
          setRecipesState(restoreImageSources(parsed));
        }
      } catch {}
      initialized.current = true;
      setIsLoading(false);
    })();
  }, []);

  // 레시피 업데이트 (state + AsyncStorage 동시)
  const setRecipes = useCallback(
    (updater: MockRecipe[] | ((prev: MockRecipe[]) => MockRecipe[])) => {
      setRecipesState(prev => {
        const next =
          typeof updater === 'function' ? updater(prev) : updater;
        // 비동기 저장 (fire-and-forget)
        AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(next.map(toSerializable)),
        ).catch(() => {});
        return next;
      });
    },
    [],
  );

  // JSON 내보내기
  const exportRecipes = useCallback(async () => {
    const exportData: RecipeExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      recipes: recipes.map(toSerializable),
    };
    const json = JSON.stringify(exportData, null, 2);
    const filename = `bakecycle_recipes_${new Date().toISOString().slice(0, 10)}.json`;

    if (Platform.OS === 'web') {
      const blob = new Blob([json], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 100);
    } else {
      const FileSystem = require('expo-file-system');
      const Sharing = require('expo-sharing');
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, json);
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: filename,
      });
    }
  }, [recipes]);

  // JSON 가져오기
  const importRecipes = useCallback((): Promise<boolean> => {
    return new Promise(resolve => {
      const applyImport = (json: string) => {
        try {
          const data = JSON.parse(json);
          if (!validateExportData(data)) {
            resolve(false);
            return;
          }
          const imported = restoreImageSources(data.recipes);
          setRecipes(imported);
          resolve(true);
        } catch {
          resolve(false);
        }
      };

      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) {
            resolve(false);
            return;
          }
          const text = await file.text();
          applyImport(text);
          input.remove();
        };
        // 취소 시 처리
        input.addEventListener('cancel', () => {
          resolve(false);
          input.remove();
        });
        input.click();
      } else {
        (async () => {
          try {
            const DocumentPicker = require('expo-document-picker');
            const FileSystem = require('expo-file-system');
            const result = await DocumentPicker.getDocumentAsync({
              type: 'application/json',
              copyToCacheDirectory: true,
            });
            if (result.canceled || !result.assets?.[0]) {
              resolve(false);
              return;
            }
            const text = await FileSystem.readAsStringAsync(
              result.assets[0].uri,
            );
            applyImport(text);
          } catch {
            resolve(false);
          }
        })();
      }
    });
  }, [setRecipes]);

  return {recipes, setRecipes, exportRecipes, importRecipes, isLoading};
}
