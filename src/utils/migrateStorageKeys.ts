import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 리브랜딩(bakecycle → bakle)으로 로컬 스토리지 키가 바뀌었다.
 * 기존 사용자(TestFlight 테스터 등)의 로컬 데이터가 날아가지 않게,
 * 앱 시작 시 옛 키 값을 새 키로 1회 복사한다.
 *
 * ⚠️ 반드시 다른 스토어(Context/hook)가 새 키를 읽기 "전에" 완료돼야 한다.
 *    → app/_layout.tsx에서 렌더 게이트로 await.
 * 멱등: 새 키에 이미 값이 있으면 건너뜀. 완료 플래그로 재실행 스킵.
 */
const MIGRATION_FLAG = 'bakle_key_migration_v1';

// [옛 키, 새 키]
const KEY_RENAMES: [string, string][] = [
  ['@bakecycle_avatar_seed', '@bakle_avatar_seed'],
  ['@bakecycle_photo_cloud_backup', '@bakle_photo_cloud_backup'],
  ['@bakecycle_group_view_mode', '@bakle_group_view_mode'],
  ['@bakecycle_exam_notif_prefs', '@bakle_exam_notif_prefs'],
  ['bakecycle_cookbook_colors_v1', 'bakle_cookbook_colors_v1'],
  ['bakecycle_sync_queue', 'bakle_sync_queue'],
  ['bakecycle_recipes_v4', 'bakle_recipes_v4'],
];

export async function migrateStorageKeys(): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(MIGRATION_FLAG);
    if (done) return;
    for (const [oldKey, newKey] of KEY_RENAMES) {
      const existingNew = await AsyncStorage.getItem(newKey);
      if (existingNew != null) continue; // 새 키에 이미 값 있으면 유지
      const oldVal = await AsyncStorage.getItem(oldKey);
      if (oldVal != null) {
        await AsyncStorage.setItem(newKey, oldVal);
        // 옛 키는 남겨둬도 무해하지만 정리 (롤백 필요 없으면)
        await AsyncStorage.removeItem(oldKey);
      }
    }
    await AsyncStorage.setItem(MIGRATION_FLAG, '1');
  } catch {
    // 마이그레이션 실패해도 앱은 떠야 함 (플래그 미설정 → 다음 실행에 재시도)
  }
}
