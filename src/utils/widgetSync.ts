import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Directory, File, Paths} from 'expo-file-system';
import type {Recipe} from '../types/recipe';

const APP_GROUP = 'group.com.bakle.app';
const WIDGET_NAME = 'BakleWidget';
/** 미리 준비할 일수 — 위젯 타임라인(Swift)과 맞춘다. */
const DAYS_AHEAD = 14;

/** 로컬 타임존 기준 날짜 시드(YYYYMMDD 정수) — 위젯 Swift와 동일 규칙. */
function dateSeed(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/**
 * 특정 시드(날짜)의 레시피 이미지를 App Group에 로컬 저장하고 경로 반환.
 * iOS 위젯은 원격 URL을 못 불러오므로(WidgetKit 제약) 미리 로컬로 받아둔다.
 * 파일명에 시드를 넣어 날짜별로 다른 파일 → 위젯이 갱신을 확실히 인식.
 * 이미지 없거나 실패 시 ''(위젯은 이모지 폴백).
 */
async function downloadImageFor(recipe: Recipe, dir: Directory, seed: number): Promise<string> {
  const url = recipe.imageUri;
  if (!url || !url.startsWith('http')) return '';
  try {
    // 파일명에 레시피 id까지 넣어야 함 — seed(날짜)만 쓰면 그날 배정 레시피가 바뀌어도
    // 같은 파일을 재사용해 "이미지 고정" 발생. id 포함 → 레시피 바뀌면 새 파일.
    const safeId = recipe.id.replace(/[^a-zA-Z0-9_-]/g, '');
    const dest = new File(dir, `day-${seed}-${safeId}.jpg`);
    if (dest.exists) return dest.uri.replace('file://', ''); // 같은 날+같은 레시피 → 재사용 OK
    const file = await File.downloadFileAsync(url, dest);
    return file.uri.replace('file://', '');
  } catch {
    return '';
  }
}

/**
 * 위젯 동기화 — 앞으로 DAYS_AHEAD일치를 "날짜별 세트"로 준비.
 * - 각 날짜의 레시피를 날짜 시드로 고르고, 그 이미지를 미리 다운로드.
 * - 결과를 dailySets[]로 저장(seed→제목·북·이미지). 위젯은 그날 seed에 맞는 세트를 그대로 쓴다.
 *   → 텍스트-이미지 항상 일치 + 다음날도 빈칸 없이 이미지 표시(앱 안 열어도 준비된 만큼).
 * - 후보는 호출부가 권한에 맞게 구성해 넘긴다. iOS 전용.
 */
export async function syncTodayRecipeToWidget(candidates: Recipe[]): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (candidates.length === 0) return;

  const container = Paths.appleSharedContainers?.[APP_GROUP];
  if (!container) return;

  const dir = new Directory(container, 'widget');
  try {
    if (!dir.exists) dir.create({intermediates: true});
  } catch {
    return;
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // "본 것 제외" 순환: seen(위젯 탭해서 열어본 레시피) 목록을 읽어 안 본 것부터 순서대로.
  let seen: string[] = [];
  try {
    const raw = await AsyncStorage.getItem('widget_seen_ids');
    seen = raw ? JSON.parse(raw) : [];
  } catch { /* 무시 */ }
  const seenSet = new Set(seen);
  let unseen = candidates.filter(r => !seenSet.has(r.id));
  // 다 봤으면 한 바퀴 → seen 초기화하고 전체를 다시 순환.
  if (unseen.length === 0) {
    unseen = candidates;
    try { await AsyncStorage.removeItem('widget_seen_ids'); } catch { /* 무시 */ }
  }

  // 앞으로 DAYS_AHEAD일: 안 본 것을 순서대로 각 날짜에 배정(오늘=unseen[0], 내일=unseen[1]...).
  // 이미지는 그 레시피 것 다운로드. seed는 날짜 기준(위젯이 그날 엔트리를 찾는 키).
  const m = unseen.length;
  const validSeeds = new Set<number>();
  const dailySets = await Promise.all(
    Array.from({length: DAYS_AHEAD}, async (_, offset) => {
      const day = new Date(startOfDay);
      day.setDate(day.getDate() + offset);
      const seed = dateSeed(day);
      validSeeds.add(seed);
      const r = unseen[offset % m];
      const imagePath = await downloadImageFor(r, dir, seed);
      return {seed, id: r.id, title: r.title, cookbook: r.cookbook ?? '', imagePath};
    }),
  );

  // 오래된(범위 밖) day-{seed}-{id}.jpg 정리 — seed(첫 세그먼트)가 유효 범위 밖이면 삭제.
  try {
    for (const f of dir.list()) {
      if (f instanceof File && f.name.startsWith('day-')) {
        const seedStr = f.name.replace('day-', '').split('-')[0];
        const s = parseInt(seedStr, 10);
        if (!Number.isNaN(s) && !validSeeds.has(s)) f.delete();
      }
    }
  } catch { /* 무시 */ }

  try {
    // 자체 로컬 Expo 모듈(WidgetStorage)로 App Group에 기록 + 위젯 갱신.
    // (@bacons/apple-targets의 ExtensionStorage는 SDK54 platform 불일치로 링크 안 돼 대체.)
    const WidgetStorage = require('../../modules/widget-storage').default;
    WidgetStorage.setString('dailySets', JSON.stringify(dailySets), APP_GROUP);
    WidgetStorage.reloadWidget(WIDGET_NAME);
    console.log(`[widgetSync] 저장 완료 — ${dailySets.length}일치, 오늘=${dailySets[0]?.title}, 이미지=${dailySets[0]?.imagePath ? 'O' : 'X'}`);
  } catch (e) {
    console.warn('[widgetSync] 동기화 실패:', e);
  }
}
