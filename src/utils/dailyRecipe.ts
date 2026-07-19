import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Recipe} from '../types/recipe';

/**
 * "오늘의 레시피" 선정·상태 관리.
 * - 하루에 하나, 완전 랜덤으로 골라 그날 날짜 키에 저장(고정). 같은 날은 항상 같은 레시피.
 * - 배너/알림/위젯 모두 이 유틸을 단일 소스로 사용.
 */

const PICK_KEY = (dateKey: string) => `dailyRecipe:pick:${dateKey}`;

/** 로컬 타임존 기준 YYYY-MM-DD */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 오늘의 레시피를 반환. 아직 안 골랐으면 후보 중 랜덤으로 골라 저장.
 * 후보가 비어 있으면 null.
 */
export async function getTodayRecipe(candidates: Recipe[]): Promise<Recipe | null> {
  if (candidates.length === 0) return null;
  const key = todayKey();

  const savedId = await AsyncStorage.getItem(PICK_KEY(key));
  if (savedId) {
    const found = candidates.find(r => r.id === savedId);
    if (found) return found;
    // 저장된 id가 후보에서 사라졌으면 다시 뽑음
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  await AsyncStorage.setItem(PICK_KEY(key), pick.id);
  return pick;
}
