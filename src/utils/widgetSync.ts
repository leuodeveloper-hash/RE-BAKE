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
    const name = `day-${seed}-${safeId}.jpg`;
    const dest = new File(dir, name);
    // 절대경로가 아니라 "파일명만" 반환한다. App Group 컨테이너의 절대경로는 UUID가 포함돼
    // 앱 재설치/업데이트/프로세스에 따라 바뀔 수 있어, 앱이 저장한 절대경로를 위젯이 읽을 때
    // 안 맞아 이미지가 안 뜨는 문제(특히 재설치·다른 기기)가 있었음. 위젯(Swift)이 런타임에
    // 컨테이너 경로를 구해 파일명과 합쳐 읽는다 → UUID가 바뀌어도 항상 유효.
    if (dest.exists) return name;
    await File.downloadFileAsync(url, dest);
    return name;
  } catch {
    // 같은 파일을 다른 동기화가 먼저 받아 두면 "이미 있음"으로 실패한다 — 파일이 있으면 성공이다.
    // (''을 돌려주면 이미지 경로가 빈 세트가 저장돼 위젯에 사진이 안 뜬다)
    try {
      const safeId = recipe.id.replace(/[^a-zA-Z0-9_-]/g, '');
      const name = `day-${seed}-${safeId}.jpg`;
      if (new File(dir, name).exists) return name;
    } catch { /* 무시 */ }
    return '';
  }
}

/**
 * 위젯 동기화 — 앞으로 DAYS_AHEAD일치를 "날짜별 세트"로 준비.
 * - 각 날짜의 레시피를 날짜 시드로 고르고, 그 이미지를 미리 다운로드.
 * - 결과를 dailySets[]로 저장(seed→제목·북·이미지). 위젯은 그날 seed에 맞는 세트를 그대로 쓴다.
 *   → 텍스트-이미지 항상 일치 + 다음날도 빈칸 없이 이미지 표시(앱 안 열어도 준비된 만큼).
 * - 후보는 호출부가 권한에 맞게 구성해 넘긴다. iOS 전용.
 *
 * 레시피북별로도 한 벌씩 만든다 — 위젯 편집에서 북을 고르면 그 북 것만 돈다.
 * 전체는 빈 키('')에 둔다(고르지 않았을 때의 기본).
 */
// 동기화는 한 번에 하나만 — 앱 시작 때 캐시·Firestore로 연달아 불려 겹치면
// 같은 파일을 동시에 받다 한쪽이 실패하고, 늦게 끝난 쪽이 이미지 없는 세트로 덮어썼다.
let syncChain: Promise<void> = Promise.resolve();

export function syncTodayRecipeToWidget(candidates: Recipe[]): Promise<void> {
  syncChain = syncChain.then(() => runWidgetSync(candidates)).catch(() => {});
  return syncChain;
}

async function runWidgetSync(candidates: Recipe[]): Promise<void> {
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
  // 위젯은 이미지가 핵심 → 이미지(http URL) 있는 레시피만 후보로. 없으면 위젯이 빈 배경+제목만 떠서
  // "제목만 나옴"이 됐음. 이미지 있는 것만 순환.
  const withImage = candidates.filter(r => !!r.imageUri && r.imageUri.startsWith('http'));
  const pool = withImage.length > 0 ? withImage : candidates; // 이미지 있는 게 하나도 없으면 폴백
  let unseen = pool.filter(r => !seenSet.has(r.id));
  // 다 봤으면 한 바퀴 → seen 초기화하고 (이미지 있는) 전체를 다시 순환.
  if (unseen.length === 0) {
    unseen = pool;
    try { await AsyncStorage.removeItem('widget_seen_ids'); } catch { /* 무시 */ }
  }

  // 앞으로 DAYS_AHEAD일: 안 본 것을 순서대로 각 날짜에 배정(오늘=unseen[0], 내일=unseen[1]...).
  // 이미지는 그 레시피 것 다운로드. seed는 날짜 기준(위젯이 그날 엔트리를 찾는 키).
  const validSeeds = new Set<number>();

  /** 주어진 후보로 DAYS_AHEAD일치 세트를 만든다 */
  const buildSets = async (list: Recipe[]) => {
    if (list.length === 0) return [];
    const m = list.length;
    return Promise.all(
      Array.from({length: DAYS_AHEAD}, async (_, offset) => {
        const day = new Date(startOfDay);
        day.setDate(day.getDate() + offset);
        const seed = dateSeed(day);
        validSeeds.add(seed);
        const r = list[offset % m];
        // 파일명에 레시피 id가 들어가므로 북이 달라도 서로 덮어쓰지 않는다
        const imagePath = await downloadImageFor(r, dir, seed);
        return {seed, id: r.id, title: r.title, cookbook: r.cookbook ?? '', imagePath};
      }),
    );
  };

  const dailySets = await buildSets(unseen);

  // 레시피북별 세트 — 북 안에서도 "안 본 것 먼저" 순서를 그대로 따른다
  const books = [...new Set(pool.map(r => r.cookbook).filter(Boolean) as string[])];
  const byBook: Record<string, Awaited<ReturnType<typeof buildSets>>> = {};
  for (const book of books) {
    const inBook = unseen.filter(r => r.cookbook === book);
    const list = inBook.length > 0 ? inBook : pool.filter(r => r.cookbook === book);
    byBook[book] = await buildSets(list);
  }

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
    // 북별 세트 — 위젯이 고른 북 이름으로 찾아 읽는다
    for (const [book, sets] of Object.entries(byBook)) {
      WidgetStorage.setString(`dailySets_${book}`, JSON.stringify(sets), APP_GROUP);
    }
    // 고를 수 있는 북 목록 — 위젯 편집 화면이 이걸 읽어 선택지를 만든다
    WidgetStorage.setString('widgetCookbooks', JSON.stringify(books), APP_GROUP);
    WidgetStorage.reloadWidget(WIDGET_NAME);
    console.log(`[widgetSync] 저장 완료 — ${dailySets.length}일치, 오늘=${dailySets[0]?.title}, 이미지=${dailySets[0]?.imagePath ? 'O' : 'X'}`);
  } catch (e) {
    console.warn('[widgetSync] 동기화 실패:', e);
  }
}
