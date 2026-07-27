/**
 * 식빵·단팥빵 explore 레시피의 method를 '비상스트레이트법'으로 업데이트 (삭제 없이 필드만).
 * 실행: node scripts/updateBreadMethod.mjs
 */
import admin from 'firebase-admin';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const key = JSON.parse(readFileSync(join(ROOT, 'bakecycle-b82b5-firebase-adminsdk-fbsvc-e5a40e25.json'), 'utf8'));
admin.initializeApp({credential: admin.credential.cert(key)});
const db = admin.firestore();

const TARGET_TITLES = new Set(['식빵', '단팥빵']);

const snap = await db.collection('explore_recipes').where('cookbook', '==', '제빵기능사').get();
let updated = 0;
for (const doc of snap.docs) {
  const d = doc.data();
  if (TARGET_TITLES.has(d.title)) {
    await doc.ref.set({method: '비상스트레이트법'}, {merge: true});
    updated++;
    console.log(`  ✔ [${doc.id}] ${d.title}: method='비상스트레이트법' (기존 '${d.method}')`);
  }
}
console.log(`\n완료: ${updated}개 업데이트 (대상 ${TARGET_TITLES.size}개)`);
process.exit(0);
