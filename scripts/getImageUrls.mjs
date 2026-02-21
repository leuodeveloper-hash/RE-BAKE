#!/usr/bin/env node

/**
 * Firebase Storage에 업로드된 이미지들의 다운로드 URL을 출력.
 * 이 URL들을 Firebase Console에서 explore_recipes 문서에 수동으로 추가.
 */

import {initializeApp} from 'firebase/app';
import {getStorage, ref, getDownloadURL} from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBxV2M2GYMqhg6_3RFW3-vrB0PkQn9XQaU",
  authDomain: "bakecycle-b82b5.firebaseapp.com",
  projectId: "bakecycle-b82b5",
  storageBucket: "bakecycle-b82b5.firebasestorage.app",
  messagingSenderId: "420587944388",
  appId: "1:420587944388:web:615a0faa8bdde6ff9fcc91",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

const RECIPE_IDS = Array.from({length: 20}, (_, i) => String(i + 1));

async function main() {
  console.log('=== explore_recipes imageUri 매핑 ===\n');

  for (const id of RECIPE_IDS) {
    try {
      const url = await getDownloadURL(ref(storage, `explore_images/thumb_${id}.png`));
      console.log(`레시피 ${id}: ${url}`);
    } catch (e) {
      console.error(`레시피 ${id}: 실패 - ${e.message}`);
    }
  }

  // Step 이미지
  console.log('\n=== Step 이미지 ===\n');
  try {
    const url = await getDownloadURL(ref(storage, 'explore_images/step_1_sheet_1_1.png'));
    console.log(`레시피 1 step[0][0]: ${url}`);
  } catch (e) {
    console.error(`Step 이미지 실패: ${e.message}`);
  }

  process.exit(0);
}

main();
