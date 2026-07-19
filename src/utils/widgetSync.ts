import {Platform} from 'react-native';
import {Directory, File, Paths} from 'expo-file-system';
import type {Recipe} from '../types/recipe';
import {getTodayRecipe} from './dailyRecipe';

const APP_GROUP = 'group.com.bakle.app';
const WIDGET_NAME = 'BakleWidget';

/**
 * 오늘의 레시피 이미지를 App Group 컨테이너에 로컬 파일로 저장하고 그 경로(path)를 반환.
 * 위젯은 원격 URL을 못 읽으므로 로컬 파일만 표시 가능 → 미리 다운로드해 둔다.
 * 이미지가 없거나 실패하면 null(위젯은 이모지 타일로 폴백).
 */
async function downloadImageToSharedContainer(recipe: Recipe): Promise<string | null> {
  const url = recipe.imageUri;
  if (!url || !url.startsWith('http')) return null;
  try {
    const container = Paths.appleSharedContainers?.[APP_GROUP];
    if (!container) return null;
    const dir = new Directory(container, 'widget');
    if (!dir.exists) dir.create({intermediates: true});

    // 레시피별 파일명(확장자는 jpg로 통일). 매일 같은 레시피면 재다운로드 생략.
    const dest = new File(dir, `today.jpg`);
    if (dest.exists) dest.delete();
    const file = await File.downloadFileAsync(url, dest);
    return file.uri.replace('file://', '');
  } catch {
    return null;
  }
}

/**
 * 오늘의 레시피를 iOS 위젯에 동기화.
 * - dailyRecipe 유틸로 "그날의 하나"를 확정해 App Group shared UserDefaults에 기록.
 * - @bacons/apple-targets의 ExtensionStorage(shared UserDefaults) + reloadWidget 사용.
 * - 후보(candidates)는 호출부가 권한에 맞게 구성해 넘긴다(어드민=비공개 포함).
 * - iOS 전용. 안드로이드/웹은 no-op.
 */
export async function syncTodayRecipeToWidget(candidates: Recipe[]): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (candidates.length === 0) return;

  const pick = await getTodayRecipe(candidates);
  if (!pick) return;

  const imagePath = await downloadImageToSharedContainer(pick);

  try {
    // 네이티브 모듈이 없는 환경(웹 번들, 위젯 미반영 빌드)에서 require 실패해도 앱은 정상.
    const {ExtensionStorage} = require('@bacons/apple-targets');
    const storage = new ExtensionStorage(APP_GROUP);
    storage.set('todayRecipe', {
      id: pick.id,
      title: pick.title,
      cookbook: pick.cookbook ?? '',
      imagePath: imagePath ?? '',
    });
    ExtensionStorage.reloadWidget(WIDGET_NAME);
  } catch (e) {
    console.warn('위젯 동기화 실패:', e);
  }
}
