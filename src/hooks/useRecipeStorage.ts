import {useCallback, useEffect, useRef, useState} from 'react';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';
import {db} from '@config/firebase';
import {useAuth} from '@contexts/AuthContext';
import {MOCK_RECIPES, MockRecipe} from '@data/mockRecipes';
import type {RecipeExportData, SerializableRecipe} from '../types/recipe';

const STORAGE_KEY = 'bakecycle_recipes_v4';

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

/** Firestore에 레시피 배열을 동기화 (batch write) */
async function syncToFirestore(uid: string, recipes: SerializableRecipe[]) {
  const colRef = collection(db, 'user_recipes', uid, 'recipes');
  const batch = writeBatch(db);
  for (const recipe of recipes) {
    batch.set(doc(colRef, recipe.id), recipe);
  }
  await batch.commit();
}

export function useRecipeStorage() {
  const {user} = useAuth();
  const [recipes, setRecipesState] = useState<MockRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);
  const firestoreUnsubRef = useRef<(() => void) | null>(null);

  // 데이터 로드: 로그인 시 Firestore, 비로그인 시 AsyncStorage
  useEffect(() => {
    // 이전 Firestore 구독 정리
    if (firestoreUnsubRef.current) {
      firestoreUnsubRef.current();
      firestoreUnsubRef.current = null;
    }

    if (user) {
      // Firestore 실시간 구독
      const colRef = collection(db, 'user_recipes', user.uid, 'recipes');
      const unsub = onSnapshot(colRef, (snapshot) => {
        if (snapshot.empty && !initialized.current) {
          // 첫 로그인: 로컬 데이터를 Firestore에 시딩
          (async () => {
            try {
              const stored = await AsyncStorage.getItem(STORAGE_KEY);
              const localRecipes = stored
                ? (JSON.parse(stored) as SerializableRecipe[])
                : [];
              if (localRecipes.length > 0) {
                await syncToFirestore(user.uid, localRecipes);
              }
            } catch {}
            initialized.current = true;
          })();
          return;
        }
        const firestoreRecipes: SerializableRecipe[] = snapshot.docs.map(
          d => ({id: d.id, ...d.data()}) as SerializableRecipe,
        );
        setRecipesState(restoreImageSources(firestoreRecipes));
        initialized.current = true;
        setIsLoading(false);
      }, () => {
        // 에러 시 AsyncStorage 폴백
        loadFromAsyncStorage();
      });
      firestoreUnsubRef.current = unsub;
    } else {
      // 비로그인: AsyncStorage에서 로드
      loadFromAsyncStorage();
    }

    return () => {
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }
    };
  }, [user]);

  async function loadFromAsyncStorage() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: SerializableRecipe[] = JSON.parse(stored);
        setRecipesState(restoreImageSources(parsed));
      } else {
        setRecipesState([]);
      }
    } catch {}
    initialized.current = true;
    setIsLoading(false);
  }

  // 레시피 업데이트 (state + 저장소 동시)
  const setRecipes = useCallback(
    (updater: MockRecipe[] | ((prev: MockRecipe[]) => MockRecipe[])) => {
      setRecipesState(prev => {
        const next =
          typeof updater === 'function' ? updater(prev) : updater;
        const serialized = next.map(toSerializable);

        if (user) {
          // Firestore에 동기화
          syncToFirestore(user.uid, serialized).catch(() => {});
        }
        // AsyncStorage에도 항상 백업
        AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(serialized),
        ).catch(() => {});

        return next;
      });
    },
    [user],
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
  // onConfirmOverwrite: 겹치는 레시피 수를 받아 덮어쓸지 확인하는 콜백
  const importRecipes = useCallback((
    onConfirmOverwrite?: (count: number) => Promise<boolean>,
  ): Promise<boolean> => {
    return new Promise(resolve => {
      const applyImport = async (json: string) => {
        try {
          const data = JSON.parse(json);
          if (!validateExportData(data)) {
            resolve(false);
            return;
          }
          const imported = restoreImageSources(data.recipes);
          const existingIds = new Set(recipes.map(r => r.id));
          const overlapCount = imported.filter(r => existingIds.has(r.id)).length;

          let shouldOverwrite = false;
          if (overlapCount > 0 && onConfirmOverwrite) {
            shouldOverwrite = await onConfirmOverwrite(overlapCount);
          }

          setRecipes(prev => {
            const prevIds = new Set(prev.map(r => r.id));
            const newRecipes = imported.filter(r => !prevIds.has(r.id));
            if (shouldOverwrite) {
              const importedMap = new Map(imported.map(r => [r.id, r]));
              const updated = prev.map(r => importedMap.get(r.id) ?? r);
              return [...updated, ...newRecipes];
            }
            return [...prev, ...newRecipes];
          });
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
