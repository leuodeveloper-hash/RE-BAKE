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
  enableNetwork,
} from 'firebase/firestore';
import {db} from '@config/firebase';
import {useAuth} from '@contexts/AuthContext';
import {useSubscription} from '@contexts/SubscriptionContext';
import type {Recipe, RecipeExportData} from '../types/recipe';
import {addToQueue, hasPendingOps, processQueue} from '@utils/syncQueue';
import {stableStringify} from '@utils/stableStringify';
import {RECIPES_STORAGE_KEY, LOCAL_EDITS_KEY} from '@utils/accountCache';
import {getDeviceName} from '@utils/deviceInfo';
import {uploadRecipeImage, isLocalUri} from '@utils/imageUpload';
import {useOnlineStatus} from './useOnlineStatus';
import {ENTITLEMENTS, type Tier} from '@constants/entitlements';

// 스텝 사진: string(uri) 또는 {uri, caption} 둘 다 지원.
const photoUri = (p: any): string => (typeof p === 'string' ? p : p?.uri);
const hasLocalPhoto = (photos: any[] | undefined): boolean => !!photos?.some((p: any) => isLocalUri(photoUri(p)));

const STORAGE_KEY = RECIPES_STORAGE_KEY;

/** 무료 등급 레시피 상한 — 정책 단일 출처는 @constants/entitlements */
export const MAX_CLOUD_RECIPES = ENTITLEMENTS.free.quota.recipes;

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
  console.log('[Upload] checking recipe:', recipe.id, 'imageUri:', updated.imageUri?.substring(0, 50), 'isLocal:', updated.imageUri ? isLocalUri(updated.imageUri) : false);
  if (updated.imageUri && isLocalUri(updated.imageUri)) {
    try {
      updated.imageUri = await uploadRecipeImage(updated.imageUri, `${recipe.id}_thumb`);
      changed = true;
    } catch (e) {
      console.warn('[Storage] thumb upload failed:', e);
    }
  }

  // 추가 상단 사진(대표 뒤 2장) — 빠져 있어서 로컬 경로(웹은 data: URL)가 그대로 동기화됐다.
  // 다른 기기에서 안 보이고, 웹은 문서가 1MB를 넘어 저장 자체가 실패했다.
  if (updated.imageUris?.some(isLocalUri)) {
    updated.imageUris = await Promise.all(
      updated.imageUris.map(async (uri, i) => {
        if (!isLocalUri(uri)) return uri;
        try {
          changed = true;
          return await uploadRecipeImage(uri, `${recipe.id}_hero${i + 1}`);
        } catch (e) { console.warn('[Storage] extra hero upload failed:', e); return uri; }
      }),
    );
  }

  // 베이키의 조언 사진 — 빠져 있으면 로컬 경로가 그대로 동기화돼 다른 기기에서 안 보인다
  if (updated.advicePhotos?.some(isLocalUri)) {
    updated.advicePhotos = await Promise.all(
      updated.advicePhotos.map(async (uri, i) => {
        if (!isLocalUri(uri)) return uri;
        try {
          changed = true;
          return await uploadRecipeImage(uri, `${recipe.id}_advice_p${i}`);
        } catch (e) { console.warn('[Storage] advice photo upload failed:', e); return uri; }
      }),
    );
  }

  // stepGroups 내 사진
  if (updated.stepGroups) {
    const newGroups = [];
    for (let gIdx = 0; gIdx < updated.stepGroups.length; gIdx++) {
      const g = updated.stepGroups[gIdx];
      const newSteps = [];
      for (let sIdx = 0; sIdx < g.steps.length; sIdx++) {
        const s = g.steps[sIdx];
        if (!hasLocalPhoto(s.photos as any)) {
          newSteps.push(s);
          continue;
        }
        const photos = await Promise.all(
          (s.photos as any[])!.map(async (p, pIdx) => {
            const uri = photoUri(p);
            if (!isLocalUri(uri)) return p;
            try {
              changed = true;
              const nextUri = await uploadRecipeImage(uri, `${recipe.id}_g${gIdx}_s${sIdx}_p${pIdx}`);
              return typeof p === 'string' ? nextUri : {...p, uri: nextUri};
            } catch (e) { console.warn('[Storage] stepGroup photo upload failed:', e); return p; }
          }),
        );
        newSteps.push({...s, photos});
      }
      newGroups.push({...g, steps: newSteps});
    }
    if (changed) updated.stepGroups = newGroups;
  }

  // steps (플랫 구조) 내 사진
  if (updated.steps) {
    const newSteps = [];
    for (let sIdx = 0; sIdx < updated.steps.length; sIdx++) {
      const s = updated.steps[sIdx];
      if (!hasLocalPhoto(s.photos as any)) {
        newSteps.push(s);
        continue;
      }
      const photos = await Promise.all(
        (s.photos as any[])!.map(async (p, pIdx) => {
          const uri = photoUri(p);
          if (!isLocalUri(uri)) return p;
          try {
            changed = true;
            const nextUri = await uploadRecipeImage(uri, `${recipe.id}_s${sIdx}_p${pIdx}`);
            return typeof p === 'string' ? nextUri : {...p, uri: nextUri};
          } catch (e) { console.warn('[Storage] step photo upload failed:', e); return p; }
        }),
      );
      newSteps.push({...s, photos});
    }
    if (changed) updated.steps = newSteps;
  }

  return changed ? updated : recipe;
}

/** undefined 값을 재귀적으로 제거 (Firestore는 undefined 미지원) */
function stripUndefined(obj: any): any {
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)]),
    );
  }
  return obj;
}

/**
 * Firestore가 거부하는 값을 찾아 경로를 돌려준다(없으면 null).
 * 중첩 배열(배열 안 배열)과 NaN/Infinity, 함수가 대표적이다.
 */
function findUnsupported(v: any, path = '', inArray = false): string | null {
  if (Array.isArray(v)) {
    if (inArray) return `${path} — 배열 안에 배열이 있습니다`;
    for (let i = 0; i < v.length; i++) {
      const r = findUnsupported(v[i], `${path}[${i}]`, true);
      if (r) return r;
    }
    return null;
  }
  if (typeof v === 'number' && !Number.isFinite(v)) return `${path} — 숫자가 NaN/Infinity 입니다`;
  if (typeof v === 'function') return `${path} — 함수가 들어 있습니다`;
  if (v && typeof v === 'object') {
    for (const [k, val] of Object.entries(v)) {
      const r = findUnsupported(val, path ? `${path}.${k}` : k, false);
      if (r) return r;
    }
  }
  return null;
}

/** Firestore에 레시피 배열을 동기화 (batch write) */
async function syncToFirestore(uid: string, recipes: Recipe[]) {
  const colRef = collection(db, 'user_recipes', uid, 'recipes');
  const writes: {id: string; data: any}[] = [];
  for (const recipe of recipes) {
    const data = stripUndefined(recipe);
    // 웹에서 고른 사진은 data: URL(base64)이라 문서가 1MB를 넘으면 Firestore가
    // invalid-argument로 거부한다 — 어느 레시피가 문제인지 알려준다
    const size = JSON.stringify(data).length;
    if (size > 900_000) {
      throw Object.assign(new Error(`"${recipe.title}"이(가) 너무 큽니다(${Math.round(size / 1024)}KB). 사진을 줄여주세요.`), {code: 'too-large'});
    }
    // Firestore가 못 받는 값을 미리 찾는다 — 중첩 배열, NaN, 함수 등.
    // batch는 하나만 어긋나도 전체가 invalid-argument로 죽어 원인을 알 수 없다.
    const bad = findUnsupported(data);
    if (bad) {
      throw Object.assign(new Error(`"${recipe.title}"의 ${bad}`), {code: 'bad-field'});
    }
    writes.push({id: recipe.id, data});
  }
  // writeBatch가 웹에서 응답 없이 매달린다(같은 Firestore인데 setDoc은 된다).
  // 레시피 수가 많지 않으므로 문서별 setDoc으로 쓴다 — 한 번에 묶이지 않는 대신
  // 어느 문서에서 막히는지도 드러난다.
  // 쓰기가 서버까지 갔는지 확인한다 — SDK가 오프라인으로 판단하면 setDoc은
  // 로컬 캐시에만 쓰고 곧바로 resolve해 "성공"처럼 보인다(서버는 그대로).
  await enableNetwork(db).catch(() => {});
  await Promise.race([
    Promise.all(writes.map(w => setDoc(doc(colRef, w.id), w.data))),
    new Promise((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error('Firestore 쓰기가 응답하지 않습니다(15초)'), {code: 'timeout'})), 15000),
    ),
  ]);
  // 동기화한 기기 정보 기록
  await setDoc(doc(db, 'users', uid), {
    lastSyncedDevice: getDeviceName(),
    lastSyncedAt: new Date().toISOString(),
  }, {merge: true});
}

// ── 클라우드가 꺼진 동안 로컬에서 바뀐 레시피 id ──
// 다시 Pro가 됐을 때 이 레시피만 클라우드에 합친다(@utils/accountCache LOCAL_EDITS_KEY 참고).
// 읽고-고치고-쓰기가 겹치지 않도록 한 줄로 세운다.
let localEditsChain: Promise<unknown> = Promise.resolve();

async function readLocalEdits(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_EDITS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markLocalEdits(prev: Recipe[], next: Recipe[]) {
  const prevById = new Map(prev.map(r => [r.id, stableStringify(r)]));
  const changed = next.filter(r => prevById.get(r.id) !== stableStringify(r)).map(r => r.id);
  if (changed.length === 0) return;
  localEditsChain = localEditsChain.then(async () => {
    const ids = await readLocalEdits();
    changed.forEach(id => ids.add(id));
    await AsyncStorage.setItem(LOCAL_EDITS_KEY, JSON.stringify([...ids]));
  }).catch(e => console.warn('[Storage] 로컬 수정 기록 실패:', e));
}

function clearLocalEdits() {
  localEditsChain = localEditsChain
    .then(() => AsyncStorage.removeItem(LOCAL_EDITS_KEY))
    .catch(() => {});
}

export function useRecipeStorage(showSnackbar?: (message: string) => void) {
  const {user, isAdmin} = useAuth();
  const {isPro, photoCloudBackup} = useSubscription();
  const cloudEnabled = !!user && isPro;
  const isOnline = useOnlineStatus();
  const [recipes, setRecipesState] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [lastSyncedDevice, setLastSyncedDevice] = useState<string | null>(null);
  const initialized = useRef(false);
  const firestoreUnsubRef = useRef<(() => void) | null>(null);
  /** 로컬 쓰기 중 onSnapshot이 state를 덮어쓰지 않도록 하는 가드 */
  const localWritePending = useRef(false);
  // setRecipes는 useCallback으로 굳어 있어 최신 콜백을 ref로 본다
  const showSnackbarRef = useRef(showSnackbar);
  showSnackbarRef.current = showSnackbar;
  // 동기화 조건도 ref로 — setRecipes는 useCallback이라 굳은 값을 보는데,
  // 업데이터가 실행되는 시점엔 로그인·Pro가 이미 true로 바뀌어 있을 수 있다
  const cloudRef = useRef({cloudEnabled, user, isPro, photoCloudBackup});
  cloudRef.current = {cloudEnabled, user, isPro, photoCloudBackup};
  /** 게스트→로그인(Pro) 시 올릴 로컬 레시피 후보 (확인 팝업 대기) */
  const migrationRecipesRef = useRef<Recipe[] | null>(null);
  const [migrationCount, setMigrationCount] = useState(0);

  // 데이터 로드: Pro 유저 Firestore, 그 외 AsyncStorage
  useEffect(() => {
    // 이전 Firestore 구독 정리
    if (firestoreUnsubRef.current) {
      firestoreUnsubRef.current();
      firestoreUnsubRef.current = null;
    }

    if (cloudEnabled && user) {
      // Firestore 실시간 구독
      const colRef = collection(db, 'user_recipes', user.uid, 'recipes');
      // 이 구독의 첫 스냅샷인지 — initialized는 한 번 true가 되면 돌아오지 않아
      // 앱을 쓰다가 Pro가 되면 첫 스냅샷 처리(올리기 팝업·병합)를 건너뛰었다.
      let firstSnapshot = true;
      const unsub = onSnapshot(colRef, (snapshot) => {
        const isFirst = firstSnapshot;
        firstSnapshot = false;
        if (snapshot.empty && isFirst) {
          // Pro 전환 시: 자동 업로드 대신 "확인 팝업" 대기 — 로컬 후보만 잡아두고 표시
          (async () => {
            try {
              const stored = await AsyncStorage.getItem(STORAGE_KEY);
              const localRecipes = stored
                ? (JSON.parse(stored) as Recipe[]).map(migrateRecipe)
                : [];
              if (localRecipes.length > 0) {
                migrationRecipesRef.current = localRecipes;
                setMigrationCount(localRecipes.length);
                setRecipesState(localRecipes); // 확인 전까진 로컬 데이터 그대로 보여줌
              }
            } catch {}
            initialized.current = true;
            setIsLoading(false);
          })();
          return;
        }
        // 로컬 쓰기 중이면 onSnapshot이 이전 데이터로 state를 덮어쓰지 않도록 스킵
        if (localWritePending.current && !isFirst) return;
        const firestoreRecipes: Recipe[] = snapshot.docs.map(
          d => migrateRecipe({id: d.id, ...d.data()}),
        );
        setRecipesState(firestoreRecipes);
        if (isFirst) {
          // 재구독: 무료 기간에 이 기기에서 만들거나 고친 레시피를 클라우드에 합친다
          mergeLocalEditsIntoCloud(user.uid, firestoreRecipes);
          // 첫 스냅샷: 마지막 동기화 정보 읽기
          getDoc(doc(db, 'users', user.uid)).then(userDoc => {
            if (userDoc.exists()) {
              const data = userDoc.data();
              setLastSyncedDevice(data.lastSyncedDevice ?? null);
              if (data.lastSyncedAt) setLastSyncedAt(new Date(data.lastSyncedAt));
            }
          }).catch(() => {});
        }
        initialized.current = true;
        setIsLoading(false);
      }, (error) => {
        // 에러 시 AsyncStorage 폴백
        console.error('[Firestore] onSnapshot error:', error);
        loadFromAsyncStorage();
      });
      firestoreUnsubRef.current = unsub;
    } else {
      // 비Pro / 비로그인: AsyncStorage에서 로드
      loadFromAsyncStorage();
    }

    return () => {
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }
    };
  }, [cloudEnabled, user]);

  // 온라인 복귀 시 큐에 쌓인 작업 처리
  useEffect(() => {
    if (isOnline && cloudEnabled && user) {
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
  }, [isOnline, cloudEnabled, user]);

  /**
   * 클라우드가 꺼진 동안 로컬에서 바뀐 레시피를 클라우드 목록에 합쳐 올린다.
   * 같은 id면 로컬이 이긴다(클라우드 쪽은 그동안 이 기기에서 못 고쳤으므로).
   */
  async function mergeLocalEditsIntoCloud(uid: string, cloudRecipes: Recipe[]) {
    localWritePending.current = true;
    try {
      const edits = await readLocalEdits();
      if (edits.size === 0) return;
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const local: Recipe[] = stored ? (JSON.parse(stored) as Recipe[]).map(migrateRecipe) : [];
      const changed = local.filter(r => edits.has(r.id));
      if (changed.length === 0) {
        clearLocalEdits();
        return;
      }
      const uploaded = cloudRef.current.photoCloudBackup
        ? await Promise.all(changed.map(uploadLocalImages))
        : changed;
      const byId = new Map(uploaded.map(r => [r.id, r]));
      const merged = [
        ...cloudRecipes.map(r => byId.get(r.id) ?? r),
        ...uploaded.filter(r => !cloudRecipes.some(c => c.id === r.id)),
      ];
      setRecipesState(merged);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      try {
        await syncToFirestore(uid, uploaded);
        setLastSyncedAt(new Date());
        setLastSyncedDevice(getDeviceName());
      } catch (e) {
        console.error('[Storage] 로컬 레시피 병합 동기화 실패:', e);
        addToQueue({type: 'sync', uid, data: merged});
      }
      clearLocalEdits();
      showSnackbarRef.current?.(`이 기기에서 만든 레시피 ${changed.length}개를 클라우드에 합쳤어요`);
    } catch (e) {
      console.warn('[Storage] 로컬 레시피 병합 실패:', e);
    } finally {
      localWritePending.current = false;
    }
  }

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

        // 실제 변경이 없으면 저장소 동기화 스킵.
        // stableStringify를 쓰는 이유: JSON.stringify는 undefined 키를 통째로 버려
        // {uri, caption: undefined}와 {uri}가 같아진다 → 실제 변경이 "변경 없음"으로
        // 판정돼 저장이 스킵됐다(요리모드 수정이 반영 안 되던 문제).
        const hasChange = stableStringify(next) !== stableStringify(prev);
        if (!hasChange) return prev;

        // 최신 값을 ref에서 읽는다 — setState 콜백 안이라 클로저가 낡는다
        const {cloudEnabled: cloudNow, user: userNow, photoCloudBackup: backupNow} = cloudRef.current;
        if (cloudNow && userNow) {
          // Firestore에 동기화 (이미지 업로드 → 동기화)
          localWritePending.current = true;
          const nextIds = new Set(next.map(r => r.id));
          const removed = prev.filter(r => !nextIds.has(r.id));

          (async () => {
            try {
              // 사진 클라우드 백업 ON일 때만 로컬 이미지 → Storage 업로드. OFF면 로컬 URI 유지(이 기기 전용).
              const uploaded = backupNow
                ? await Promise.all(next.map(uploadLocalImages))
                : next;
              const hasUploads = JSON.stringify(uploaded) !== JSON.stringify(next);
              if (hasUploads) {
                setRecipesState(uploaded);
                AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(uploaded)).catch(() => {});
              }
              // Firestore 동기화 (URL 포함)
              await syncToFirestore(userNow.uid, uploaded);
              setLastSyncedAt(new Date());
              setLastSyncedDevice(getDeviceName());
            } catch (e: any) {
              // 조용히 큐에 넣기만 하면 사용자는 저장된 줄 안다 — 실패를 알린다
              console.error('[Storage] upload/sync failed:', e);
              // 에러 모양이 제각각이라(code/message가 없는 것도 온다) 최대한 드러낸다
              const detail = e?.code || e?.message || (() => {
                try { return JSON.stringify(e); } catch { return String(e); }
              })();
              showSnackbarRef.current?.(`동기화 실패: ${detail}`);
              addToQueue({type: 'sync', uid: userNow.uid, data: next});
            }

            // 삭제 처리
            if (removed.length > 0) {
              const colRef = collection(db, 'user_recipes', userNow.uid, 'recipes');
              const batch = writeBatch(db);
              removed.forEach(r => batch.delete(doc(colRef, r.id)));
              try {
                await batch.commit();
              } catch {
                addToQueue({type: 'delete', uid: userNow.uid, data: removed.map(r => r.id)});
              }
            }

            localWritePending.current = false;
          })();
        } else {
          markLocalEdits(prev, next);
        }
        // AsyncStorage에도 항상 백업.
        // 실패를 삼키지 않는다 — 웹은 localStorage(보통 5MB)라 사진이 data: URL로
        // 쌓이면 QuotaExceededError가 나는데, 조용히 넘기면 메모리에만 남아
        // "그 화면에선 보이는데 목록 갔다 오면 사라지는" 증상이 된다.
        AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(next),
        ).catch(e => console.error('[Storage] 로컬 저장 실패 — 앱을 다시 열면 최근 변경이 사라집니다:', e));

        return next;
      });
    },
    [cloudEnabled, user, photoCloudBackup],
  );

  // JSON 내보내기
  const exportRecipes = useCallback(async () => {
    const exportData: RecipeExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      recipes,
    };
    const json = JSON.stringify(exportData, null, 2);
    const filename = `bakle_recipes_${new Date().toISOString().slice(0, 10)}.json`;

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
      const FileSystem = require('expo-file-system/legacy');
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
            const FileSystem = require('expo-file-system/legacy');
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
    if (cloudEnabled && user) {
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
  }, [cloudEnabled, user]);

  // 등급별 개수 제한은 @constants/entitlements 한 곳에서 관리한다.
  // (게스트=체험 3개 / 무료=로컬 무제한 / Pro=클라우드 상한)
  const canAddRecipe = useCallback(() => {
    const tier: Tier = !user ? 'guest' : isPro ? 'pro' : 'free';
    return recipes.length < ENTITLEMENTS[tier].quota.recipes;
  }, [user, isPro, recipes.length]);

  // 확인 팝업 "올리기": 로컬 이미지 Storage 업로드 후 Firestore 동기화
  const confirmMigration = useCallback(async () => {
    const cand = migrationRecipesRef.current;
    if (!cand || !user) return;
    localWritePending.current = true;
    try {
      const uploaded = photoCloudBackup
        ? await Promise.all(cand.map(uploadLocalImages))
        : cand;
      await syncToFirestore(user.uid, uploaded);
      setRecipesState(uploaded);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(uploaded));
      clearLocalEdits();
      setLastSyncedAt(new Date());
      setLastSyncedDevice(getDeviceName());
    } catch (e) {
      console.warn('[migration] 업로드/동기화 실패:', e);
      throw e;
    } finally {
      localWritePending.current = false;
      migrationRecipesRef.current = null;
      setMigrationCount(0);
    }
  }, [user, photoCloudBackup]);

  // 확인 팝업 "나중에": 후보만 비움(로컬 유지, 업로드 안 함)
  const dismissMigration = useCallback(() => {
    migrationRecipesRef.current = null;
    setMigrationCount(0);
  }, []);

  return {recipes, setRecipes, exportRecipes, importRecipes, isLoading, lastSyncedAt, lastSyncedDevice, reload, canAddRecipe, migrationCount, confirmMigration, dismissMigration};
}
