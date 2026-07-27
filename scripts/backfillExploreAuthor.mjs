/**
 * 기존 둘러보기(explore_recipes) 레시피에 작성자(authorId) 정보를 백필.
 * authorId 구조 도입 전에 올라간 레시피는 authorId/authorHandle이 없어 작성자 칩이 안 뜬다.
 * 이미 유저가 올린 게 없고 전부 공식이므로, authorId 없는 것들을 공식 "baeki"로 채운다.
 *
 * 실행:  node scripts/backfillExploreAuthor.mjs [--dry]
 *   --dry : 무엇이 바뀔지 출력만
 */
import admin from 'firebase-admin';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const key = JSON.parse(
  readFileSync(join(ROOT, 'bakecycle-b82b5-firebase-adminsdk-fbsvc-e5a40e25.json'), 'utf8'),
);
admin.initializeApp({credential: admin.credential.cert(key)});
const db = admin.firestore();

const OFFICIAL_AUTHOR_ID = 'baeki';
const OFFICIAL_AUTHOR_HANDLE = '베이키';
const DRY = process.argv.includes('--dry');
const tag = DRY ? '[DRY] ' : '';

async function run() {
  const snap = await db.collection('explore_recipes').get();
  const targets = snap.docs.filter(d => !d.data().authorId);
  console.log(`${tag}explore ${snap.size}개 중 authorId 없는 ${targets.length}개를 공식(baeki)으로 백필`);

  if (!DRY && targets.length > 0) {
    let batch = db.batch();
    let n = 0;
    for (const doc of targets) {
      batch.update(doc.ref, {
        authorId: OFFICIAL_AUTHOR_ID,
        authorHandle: OFFICIAL_AUTHOR_HANDLE,
        authorAvatarSeed: OFFICIAL_AUTHOR_ID,
      });
      if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); }
    }
    await batch.commit();
  }
  console.log(`${tag}완료.`);
}

run().catch(e => { console.error(e); process.exit(1); });
