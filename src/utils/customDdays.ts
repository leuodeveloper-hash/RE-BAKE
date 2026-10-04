import AsyncStorage from '@react-native-async-storage/async-storage';
import {doc, getDoc, setDoc} from 'firebase/firestore';
import {auth, db} from '@config/firebase';

/**
 * 내 D-day — 시험과 상관없이 아무 일정(이름 + 날짜)을 최대 5개.
 * 기기(AsyncStorage)에 두고, 로그인했으면 계정(users/{uid}.customDdays)에도 둬서 다른 기기에서 이어진다.
 * 홈 배너·위젯은 시험 일정과 섞어 가장 가까운 것을 보여준다.
 */
export const CUSTOM_DDAYS_KEY = '@bakle_custom_ddays';
export const MAX_CUSTOM_DDAYS = 5;

export interface CustomDday {
  id: string;
  title: string;
  /** 'YYYY-MM-DD' — 반복이면 처음 날짜(기준일) */
  date: string;
  /** 반복 주기 — 없으면 한 번 */
  repeat?: DdayRepeat;
}

export type DdayRepeat = 'none' | 'weekly' | 'monthly' | 'yearly';
export const DDAY_REPEATS: DdayRepeat[] = ['none', 'weekly', 'monthly', 'yearly'];

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * 반복 D-day의 다음 날짜 — 오늘이거나 그 뒤 첫 번째 회차('YYYY-MM-DD').
 * 기준일이 아직 안 왔거나 반복이 없으면 기준일 그대로. 31일 같은 날이 없는 달은 그 달 말일.
 */
export function nextDdayDate(dday: Pick<CustomDday, 'date' | 'repeat'>): string {
  const repeat = dday.repeat ?? 'none';
  const [y, m, d] = dday.date.split('-').map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const base = new Date(y, m - 1, d);
  if (repeat === 'none' || base >= today) return dday.date;
  const at = (k: number): Date => {
    if (repeat === 'weekly') return new Date(y, m - 1, d + 7 * k);
    const yy = repeat === 'yearly' ? y + k : y;
    const mm = repeat === 'monthly' ? m - 1 + k : m - 1;
    const last = new Date(yy, mm + 1, 0).getDate();
    return new Date(yy, mm, Math.min(d, last));
  };
  let k = repeat === 'weekly' ? Math.floor((today.getTime() - base.getTime()) / (7 * 86400000))
    : repeat === 'monthly' ? (today.getFullYear() - y) * 12 + today.getMonth() - (m - 1)
    : today.getFullYear() - y;
  k = Math.max(0, k - 1);
  let next = at(k);
  while (next < today) next = at(++k);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

export async function loadCustomDdays(): Promise<CustomDday[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_DDAYS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 계정 값을 기기로 이어받는다(계정에 있으면 계정 우선) */
export async function pullCustomDdaysFromAccount(): Promise<CustomDday[]> {
  const local = await loadCustomDdays();
  const uid = auth.currentUser?.uid;
  if (!uid) return local;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const remote = snap.data()?.customDdays as CustomDday[] | undefined;
    if (!remote) return local;
    await AsyncStorage.setItem(CUSTOM_DDAYS_KEY, JSON.stringify(remote));
    return remote;
  } catch {
    return local;
  }
}

export async function saveCustomDdays(list: CustomDday[]): Promise<CustomDday[]> {
  const next = list.slice(0, MAX_CUSTOM_DDAYS);
  await AsyncStorage.setItem(CUSTOM_DDAYS_KEY, JSON.stringify(next));
  const uid = auth.currentUser?.uid;
  if (uid) setDoc(doc(db, 'users', uid), {customDdays: next}, {mergeFields: ['customDdays']}).catch(() => {});
  return next;
}

/** 오늘 자정 기준 남은 일수(지났으면 음수) */
export function ddayDays(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86400000);
}

/** D-day 라벨 — 당일 D-DAY, 남음 D-N, 지남 D+N */
export function ddayLabel(days: number): string {
  if (days === 0) return 'D-DAY';
  return days > 0 ? `D-${days}` : `D+${-days}`;
}
