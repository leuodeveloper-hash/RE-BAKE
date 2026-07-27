import {Platform} from 'react-native';
import {Directory, File, Paths} from 'expo-file-system';
import type {Recipe} from '../types/recipe';

const APP_GROUP = 'group.com.bakle.app';
const WIDGET_NAME = 'BakleWidget';

/** 로컬 타임존 기준 날짜 시드(YYYYMMDD 정수) — 위젯 Swift와 동일 규칙. */
function dateSeed(d: Date = new Date()): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/**
 * 오늘의 레시피 이미지를 App Group 컨테이너에 로컬 파일로 저장하고 경로 반환.
 * iOS 위젯은 원격 URL 이미지를 못 불러오므로(WidgetKit 제약), 오늘 보여줄 1장만
 * 미리 로컬로 받아둔다. 이미지 없거나 실패 시 ''(위젯은 이모지 타일 폴백).
 */
async function downloadTodayImage(recipe: Recipe, dir: Directory): Promise<string> {
  const url = recipe.imageUri;
  if (!url || !url.startsWith('http')) return '';
  try {
    const dest = new File(dir, 'today.jpg');
    if (dest.exists) dest.delete();
    const file = await File.downloadFileAsync(url, dest);
    return file.uri.replace('file://', '');
  } catch {
    return '';
  }
}

/**
 * 위젯 동기화.
 * - 후보 "전체"(id·제목·북)를 App Group에 저장 → 모든 레시피가 순환 대상. 다운로드 없음(가벼움).
 * - 날짜 시드로 오늘 1개를 골라, 그 이미지 1장만 미리 다운로드해 로컬 경로도 함께 저장.
 * - 위젯(Swift)은 같은 날짜 규칙으로 오늘 항목을 고르고, 이미지는 이 로컬 경로를 쓴다.
 *   → 앱을 안 열어도 매일 자동으로 바뀌고(텍스트), 앱을 한 번이라도 열면 그날 이미지까지 갱신.
 * - 후보는 호출부가 권한에 맞게 구성해 넘긴다(어드민=비공개 포함). iOS 전용.
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

  // 후보 전체(다운로드 없이 메타만) — 모든 레시피가 순환에 포함된다.
  const items = candidates.map(r => ({
    id: r.id,
    title: r.title,
    cookbook: r.cookbook ?? '',
  }));

  // 오늘 항목을 날짜 시드로 선택 후, 그 이미지 1장만 다운로드.
  const todayIndex = ((dateSeed() % items.length) + items.length) % items.length;
  const todayImagePath = await downloadTodayImage(candidates[todayIndex], dir);

  try {
    // 자체 로컬 Expo 모듈(WidgetStorage)로 App Group에 기록 + 위젯 갱신.
    // (@bacons/apple-targets의 ExtensionStorage는 SDK54 platform 불일치로 링크 안 돼 대체.)
    // 네이티브 미링크 환경(웹 등)에서 require가 throw해도 앱은 정상.
    const WidgetStorage = require('../../modules/widget-storage').default;
    WidgetStorage.setString('recipeCandidates', JSON.stringify(items), APP_GROUP);
    WidgetStorage.setString('todayImagePath', todayImagePath, APP_GROUP);
    WidgetStorage.reloadWidget(WIDGET_NAME);
    console.log(`[widgetSync] 저장 완료 — 후보 ${items.length}개, 오늘=${items[todayIndex]?.title}, 이미지=${todayImagePath ? 'O' : 'X'}`);
  } catch (e) {
    console.warn('[widgetSync] 동기화 실패:', e);
  }
}
