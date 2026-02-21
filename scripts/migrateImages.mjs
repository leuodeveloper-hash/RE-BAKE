#!/usr/bin/env node

/**
 * Firestore explore_recipes 문서에 imageUri를 업데이트하는 마이그레이션 스크립트.
 * 이미지는 이미 Firebase Storage에 업로드 완료 상태.
 * firebase-admin (서비스 계정 키) 사용.
 *
 * 사용: node scripts/migrateImages.mjs
 */

import admin from 'firebase-admin';
import {getStorage} from 'firebase/storage';
import {initializeApp} from 'firebase/app';
import {ref, getDownloadURL} from 'firebase/storage';
import {readFileSync} from 'fs';
import {resolve, dirname} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Admin SDK 초기화 (Firestore 쓰기용)
const serviceAccount = JSON.parse(
  readFileSync(resolve(ROOT, 'bakecycle-b82b5-firebase-adminsdk-fbsvc-6db2afe5a4.json'), 'utf8')
);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const adminDb = admin.firestore();

// Client SDK 초기화 (Storage URL 조회용)
const firebaseConfig = {
  apiKey: "AIzaSyBxV2M2GYMqhg6_3RFW3-vrB0PkQn9XQaU",
  storageBucket: "bakecycle-b82b5.firebasestorage.app",
};
const clientApp = initializeApp(firebaseConfig, 'client');
const storage = getStorage(clientApp);

// 레시피 ID → 이미 업로드된 Storage 경로
const RECIPE_IDS = Array.from({length: 20}, (_, i) => String(i + 1));

async function main() {
  console.log('=== Firestore imageUri 업데이트 시작 ===\n');

  // 1. 썸네일 imageUri 업데이트
  for (const id of RECIPE_IDS) {
    try {
      const url = await getDownloadURL(ref(storage, `explore_images/thumb_${id}.png`));
      await adminDb.collection('explore_recipes').doc(id).update({imageUri: url});
      console.log(`[${id}] imageUri 업데이트 완료`);
    } catch (e) {
      console.error(`[${id}] 실패:`, e.message);
    }
  }

  // 2. 레시피 1의 step 이미지 → photos로 업데이트
  console.log('\nStep 이미지 업데이트...');
  try {
    const stepUrl = await getDownloadURL(ref(storage, 'explore_images/step_1_sheet_1_1.png'));
    const docRef = adminDb.collection('explore_recipes').doc('1');
    const snap = await docRef.get();
    if (snap.exists) {
      const data = snap.data();
      if (data.stepGroups?.[0]?.steps?.[0]) {
        const stepGroups = [...data.stepGroups];
        const steps = [...stepGroups[0].steps];
        const {images, ...stepWithoutImages} = steps[0];
        steps[0] = {...stepWithoutImages, photos: [stepUrl]};
        stepGroups[0] = {...stepGroups[0], steps};
        await docRef.update({stepGroups});
        console.log('[1] step photos 업데이트 완료');
      }
    }
  } catch (e) {
    console.error('Step 이미지 실패:', e.message);
  }

  console.log('\n=== 마이그레이션 완료 ===');
  process.exit(0);
}

main().catch(e => {
  console.error('마이그레이션 실패:', e);
  process.exit(1);
});
