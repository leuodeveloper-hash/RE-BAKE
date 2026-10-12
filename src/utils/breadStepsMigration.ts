import AsyncStorage from '@react-native-async-storage/async-storage';
import {collection, getDocs, updateDoc} from 'firebase/firestore';
import {db} from '@config/firebase';
import {saveRecipeVersion} from './recipeHistory';
import type {Recipe, Step} from '../types/recipe';

/** 공식 제빵 레시피 반죽 첫 두 과정 — 모든 제빵 레시피를 이 문장으로 맞춘다 */
const BREAD_MIX_STEPS: Pick<Step, 'description' | 'tip'>[] = [
  {
    description: '유지를 제외한 모든 재료를 넣고 저속으로 한덩어리가 될 때까지 반죽합니다.',
    // 1번 팁 — 풀먼식빵에 있던 문구로 통일
    tip: '이스트는 소금과 닿지 않도록 주의하세요. 발효가 지연될 수 있어요.',
  },
  {description: '유지를 넣고 고속으로 최종단계까지 반죽합니다.'},
];

/** 반죽(믹싱) 과정인지 — 발효·분할·반죽 온도 확인 등 다음 단계와 가른다 */
const isMixStep = (s?: Step) => !!s?.description && /반죽|반죽기|섞/.test(s.description) && !/발효|분할|성형|굽|온도/.test(s.description);

/**
 * 첫 그룹 맨 앞의 반죽 과정(최대 3개)을 통일 문장 두 개로 바꾼다.
 * 반죽 과정으로 시작하지 않으면 손대지 않는다(null).
 */
/** 레시피마다 다른 반죽 끝 단계 — 베이글은 일부러 덜 친다(80% 발전 단계) */
const MIX_END_OVERRIDE: Record<string, string> = {
  베이글: '유지를 넣고 고속으로 80% 발전 단계까지 반죽합니다.',
};

export function unifyBreadMixSteps(steps: Step[], title?: string): Step[] | null {
  // 맨 앞에 이어진 반죽 과정(최대 3개 — 유지 넣기를 따로 쓴 레시피가 있다)을 통째로 두 문장으로
  let k = 0;
  while (k < 3 && isMixStep(steps[k])) k += 1;
  if (k === 0) return null;
  // 사진 등은 원래 첫·둘째 과정 것을 이어받는다. 팁은 1번만 통일 문구, 2번은 원래 반죽 과정의 팁이 있으면 유지
  const head: Step[] = BREAD_MIX_STEPS.map((s, i) => ({
    ...steps[i], ...s, step: i + 1,
    ...(i === 1 ? {tip: k >= 2 ? steps[1]?.tip : undefined, ...(title && MIX_END_OVERRIDE[title] ? {description: MIX_END_OVERRIDE[title]} : {})} : {}),
  }));
  const next = [...head, ...steps.slice(k)].map((s, i) => ({...s, step: i + 1}));
  // 이미 같으면 바꿀 것 없음
  return JSON.stringify(next) === JSON.stringify(steps) ? null : next;
}

const FLAG = 'bread_mix_steps_unified_v1';

/** 공식 제빵기능사 레시피의 반죽 과정 통일(어드민 1회). 바꾸기 전 판은 버전 기록에 남긴다. */
export async function migrateBreadMixSteps(): Promise<number> {
  if (await AsyncStorage.getItem(FLAG).catch(() => null)) return 0;
  const snap = await getDocs(collection(db, 'explore_recipes'));
  let n = 0;
  for (const d of snap.docs) {
    const r = d.data() as Recipe;
    if (r.cookbook !== '제빵기능사' || r.kind === 'tip') continue;
    if (r.stepGroups?.length) {
      const first = unifyBreadMixSteps(r.stepGroups[0].steps ?? [], r.title);
      if (!first) continue;
      await saveRecipeVersion(d.ref, d.data());
      await updateDoc(d.ref, {stepGroups: [{...r.stepGroups[0], steps: first}, ...r.stepGroups.slice(1)]});
    } else {
      const next = unifyBreadMixSteps(r.steps ?? [], r.title);
      if (!next) continue;
      await saveRecipeVersion(d.ref, d.data());
      await updateDoc(d.ref, {steps: next});
    }
    n += 1;
  }
  await AsyncStorage.setItem(FLAG, '1').catch(() => {});
  return n;
}
