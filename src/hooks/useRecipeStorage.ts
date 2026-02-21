import {useCallback, useEffect, useRef, useState} from 'react';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  writeBatch,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';
import {db} from '@config/firebase';
import {useAuth} from '@contexts/AuthContext';
import type {Recipe, RecipeExportData} from '../types/recipe';
import {addToQueue, hasPendingOps, processQueue} from '@utils/syncQueue';
import {getDeviceName} from '@utils/deviceInfo';
import {uploadRecipeImage, isLocalUri} from '@utils/imageUpload';
import {useOnlineStatus} from './useOnlineStatus';

const STORAGE_KEY = 'bakecycle_recipes_v4';

/** 기존 category 필드를 cookbook으로 마이그레이션 */
function migrateRecipe(recipe: any): Recipe {
  let result = recipe;
  if ('category' in result && !('cookbook' in result)) {
    const {category, ...rest} = result;
    result = {...rest, cookbook: category};
  }
  if (!result.createdAt) {
    const tsMatch = result.id?.match(/(\d{13,})/);
    const ts = tsMatch ? Number(tsMatch[1]) : 0;
    result = {...result, createdAt: new Date(ts).toISOString()};
  }
  // 레거시 imageSource / step images (번들 require 결과) 제거
  const {imageSource, ...withoutImageSource} = result;
  result = withoutImageSource;
  if (result.steps) {
    result = {...result, steps: result.steps.map(({images, ...s}: any) => s)};
  }
  if (result.stepGroups) {
    result = {...result, stepGroups: result.stepGroups.map((g: any) => ({
      ...g,
      steps: g.steps.map(({images, ...s}: any) => s),
    }))};
  }
  return result;
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

/** 레시피 내 로컬 이미지를 Firebase Storage에 업로드하고 URL로 교체 */
async function uploadLocalImages(recipe: Recipe): Promise<Recipe> {
  let updated = {...recipe};
  let changed = false;

  // 메인 이미지
  if (updated.imageUri && isLocalUri(updated.imageUri)) {
    try {
      updated.imageUri = await uploadRecipeImage(updated.imageUri, `${recipe.id}_thumb`);
      changed = true;
    } catch (e) {
      console.warn('[Storage] thumb upload failed:', e);
    }
  }

  // stepGroups 내 사진
  if (updated.stepGroups) {
    const newGroups = [];
    for (let gIdx = 0; gIdx < updated.stepGroups.length; gIdx++) {
      const g = updated.stepGroups[gIdx];
      const newSteps = [];
      for (let sIdx = 0; sIdx < g.steps.length; sIdx++) {
        const s = g.steps[sIdx];
        if (!s.photos?.some(isLocalUri)) {
          newSteps.push(s);
          continue;
        }
        const photos = await Promise.all(
          s.photos!.map(async (uri, pIdx) => {
            if (!isLocalUri(uri)) return uri;
            try {
              changed = true;
              return await uploadRecipeImage(uri, `${recipe.id}_g${gIdx}_s${sIdx}_p${pIdx}`);
            } catch { return uri; }
          }),
        );
        newSteps.push({...s, photos});
      }
      newGroups.push({...g, steps: newSteps});
    }
    if (changed) updated.stepGroups = newGroups;
  }

  return changed ? updated : recipe;
}

/** Firestore에 레시피 배열을 동기화 (batch write) */
async function syncToFirestore(uid: string, recipes: Recipe[]) {
  const colRef = collection(db, 'user_recipes', uid, 'recipes');
  const batch = writeBatch(db);
  for (const recipe of recipes) {
    batch.set(doc(colRef, recipe.id), recipe);
  }
  await batch.commit();
  // 동기화한 기기 정보 기록
  await setDoc(doc(db, 'users', uid), {
    lastSyncedDevice: getDeviceName(),
    lastSyncedAt: new Date().toISOString(),
  }, {merge: true});
}

export function useRecipeStorage() {
  const {user} = useAuth();
  const isOnline = useOnlineStatus();
  const [recipes, setRecipesState] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [lastSyncedDevice, setLastSyncedDevice] = useState<string | null>(null);
  const initialized = useRef(false);
  const firestoreUnsubRef = useRef<(() => void) | null>(null);
  /** 로컬 쓰기 중 onSnapshot이 state를 덮어쓰지 않도록 하는 가드 */
  const localWritePending = useRef(false);

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
                ? (JSON.parse(stored) as Recipe[]).map(migrateRecipe)
                : [];
              if (localRecipes.length > 0) {
                await syncToFirestore(user.uid, localRecipes);
              }
            } catch {}
            initialized.current = true;
          })();
          return;
        }
        // 로컬 쓰기 중이면 onSnapshot이 이전 데이터로 state를 덮어쓰지 않도록 스킵
        if (localWritePending.current && initialized.current) return;
        const firestoreRecipes: Recipe[] = snapshot.docs.map(
          d => migrateRecipe({id: d.id, ...d.data()}),
        );
        setRecipesState(firestoreRecipes);
        if (!initialized.current) {
          // 첫 스냅샷: 마지막 동기화 기기 정보 읽기
          getDoc(doc(db, 'users', user.uid)).then(userDoc => {
            if (userDoc.exists()) {
              setLastSyncedDevice(userDoc.data().lastSyncedDevice ?? null);
            }
          }).catch(() => {});
        }
        initialized.current = true;
        setLastSyncedAt(new Date());
        setIsLoading(false);
      }, (error) => {
        // 에러 시 AsyncStorage 폴백
        console.error('[Firestore] onSnapshot error:', error);
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

  // 온라인 복귀 시 큐에 쌓인 작업 처리
  useEffect(() => {
    if (isOnline && user) {
      (async () => {
        const hadPending = await hasPendingOps();
        if (!hadPending) return;
        const allSuccess = await processQueue();
        if (allSuccess) {
          setLastSyncedAt(new Date());
          setLastSyncedDevice(getDeviceName());
          await setDoc(doc(db, 'users', user.uid), {
            lastSyncedDevice: getDeviceName(),
            lastSyncedAt: new Date().toISOString(),
          }, {merge: true}).catch(() => {});
        }
      })();
    }
  }, [isOnline, user]);

  async function loadFromAsyncStorage() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Recipe[] = JSON.parse(stored);
        setRecipesState(parsed.map(migrateRecipe));
      } else {
        setRecipesState([]);
      }
    } catch {}
    initialized.current = true;
    setIsLoading(false);
  }

  // 레시피 업데이트 (state + 저장소 동시)
  const setRecipes = useCallback(
    (updater: Recipe[] | ((prev: Recipe[]) => Recipe[])) => {
      setRecipesState(prev => {
        const next =
          typeof updater === 'function' ? updater(prev) : updater;

        // 실제 변경이 없으면 저장소 동기화 스킵
        const hasChange = JSON.stringify(next) !== JSON.stringify(prev);
        if (!hasChange) return prev;

        if (user) {
          // Firestore에 동기화 (이미지 업로드 → 동기화)
          localWritePending.current = true;
          const nextIds = new Set(next.map(r => r.id));
          const removed = prev.filter(r => !nextIds.has(r.id));

          (async () => {
            try {
              // 로컬 이미지 → Storage 업로드 후 URL로 교체
              const uploaded = await Promise.all(next.map(uploadLocalImages));
              const hasUploads = JSON.stringify(uploaded) !== JSON.stringify(next);
              if (hasUploads) {
                setRecipesState(uploaded);
                AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(uploaded)).catch(() => {});
              }
              // Firestore 동기화 (URL 포함)
              await syncToFirestore(user.uid, uploaded);
              setLastSyncedDevice(getDeviceName());
            } catch {
              addToQueue({type: 'sync', uid: user.uid, data: next});
            }

            // 삭제 처리
            if (removed.length > 0) {
              const colRef = collection(db, 'user_recipes', user.uid, 'recipes');
              const batch = writeBatch(db);
              removed.forEach(r => batch.delete(doc(colRef, r.id)));
              try {
                await batch.commit();
              } catch {
                addToQueue({type: 'delete', uid: user.uid, data: removed.map(r => r.id)});
              }
            }

            localWritePending.current = false;
          })();
        }
        // AsyncStorage에도 항상 백업
        AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(next),
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
      recipes,
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
          const imported = data.recipes.map(migrateRecipe);
          const existingIds = new Set(recipes.map(r => r.id));
          const overlapCount = imported.filter((r: Recipe) => existingIds.has(r.id)).length;

          let shouldOverwrite = false;
          if (overlapCount > 0 && onConfirmOverwrite) {
            shouldOverwrite = await onConfirmOverwrite(overlapCount);
          }

          setRecipes(prev => {
            const prevIds = new Set(prev.map(r => r.id));
            const newRecipes = imported.filter((r: Recipe) => !prevIds.has(r.id));
            if (shouldOverwrite) {
              const importedMap = new Map(imported.map((r: Recipe) => [r.id, r]));
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

  // Pull-to-refresh: 데이터 다시 로드 (isLoading 변경 없이 조용히 갱신)
  const reload = useCallback(async () => {
    if (user) {
      try {
        const {getDocs} = require('firebase/firestore');
        const colRef = collection(db, 'user_recipes', user.uid, 'recipes');
        const snapshot = await getDocs(colRef);
        const firestoreRecipes: Recipe[] = snapshot.docs.map(
          (d: any) => migrateRecipe({id: d.id, ...d.data()}),
        );
        setRecipesState(firestoreRecipes);
        setLastSyncedAt(new Date());
      } catch {
        await loadFromAsyncStorage();
      }
    } else {
      await loadFromAsyncStorage();
    }
  }, [user]);

  return {recipes, setRecipes, exportRecipes, importRecipes, isLoading, lastSyncedAt, lastSyncedDevice, reload};
}
