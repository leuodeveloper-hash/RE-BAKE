import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  writeBatch,
} from 'firebase/firestore';
import {db} from '@config/firebase';

const QUEUE_KEY = 'bakecycle_sync_queue';

interface SyncOperation {
  type: 'sync' | 'delete';
  uid: string;
  /** sync: 전체 레시피 배열, delete: 삭제할 레시피 id 배열 */
  data: any;
  timestamp: number;
}

async function getQueue(): Promise<SyncOperation[]> {
  try {
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: SyncOperation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** 실패한 Firestore 작업을 큐에 추가 */
export async function addToQueue(op: Omit<SyncOperation, 'timestamp'>): Promise<void> {
  const queue = await getQueue();
  // 같은 uid + type 조합이 있으면 최신으로 교체 (중복 방지)
  const filtered = queue.filter(
    q => !(q.uid === op.uid && q.type === op.type),
  );
  filtered.push({...op, timestamp: Date.now()});
  await saveQueue(filtered);
}

/** 큐에 대기 중인 작업이 있는지 확인 */
export async function hasPendingOps(): Promise<boolean> {
  const queue = await getQueue();
  return queue.length > 0;
}

/** 큐에 쌓인 작업을 Firestore에 일괄 처리. 성공 시 true 반환 */
export async function processQueue(): Promise<boolean> {
  const queue = await getQueue();
  if (queue.length === 0) return true;

  const failed: SyncOperation[] = [];

  for (const op of queue) {
    try {
      if (op.type === 'sync') {
        const colRef = collection(db, 'user_recipes', op.uid, 'recipes');
        const batch = writeBatch(db);
        for (const recipe of op.data) {
          batch.set(doc(colRef, recipe.id), recipe);
        }
        await batch.commit();
      } else if (op.type === 'delete') {
        const colRef = collection(db, 'user_recipes', op.uid, 'recipes');
        const batch = writeBatch(db);
        for (const id of op.data) {
          batch.delete(doc(colRef, id));
        }
        await batch.commit();
      }
    } catch {
      failed.push(op);
    }
  }

  await saveQueue(failed);
  return failed.length === 0;
}

/** 큐 비우기 (로그아웃 시 등) */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
