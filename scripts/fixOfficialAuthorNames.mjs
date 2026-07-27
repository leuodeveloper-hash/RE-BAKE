/**
 * 공식 작성자 이름 정리: handle은 영문(baeki), 표시명은 displayName(베이키)로 분리.
 * - authors/baeki: handle="baeki", displayName="베이키"
 * - explore_recipes 중 authorId=="baeki": authorHandle="baeki", authorDisplayName="베이키"
 *   (이전 백필에서 authorHandle에 한글 "베이키"가 잘못 들어간 것을 교정)
 *
 * 실행:  node scripts/fixOfficialAuthorNames.mjs [--dry]
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

const ID = 'baeki';
const HANDLE = 'baeki';
const DISPLAY = '베이키';
const DRY = process.argv.includes('--dry');
const tag = DRY ? '[DRY] ' : '';

async function run() {
  // 1) authors/baeki
  console.log(`${tag}authors/${ID}: handle=${HANDLE}, displayName=${DISPLAY}`);
  if (!DRY) await db.collection('authors').doc(ID).set({handle: HANDLE, displayName: DISPLAY}, {merge: true});

  // 2) explore_recipes (authorId==baeki)
  const snap = await db.collection('explore_recipes').where('authorId', '==', ID).get();
  console.log(`${tag}explore ${snap.size}개 authorHandle/DisplayName 교정`);
  if (!DRY && snap.size > 0) {
    let batch = db.batch();
    let n = 0;
    for (const doc of snap.docs) {
      batch.update(doc.ref, {authorHandle: HANDLE, authorDisplayName: DISPLAY});
      if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); }
    }
    await batch.commit();
  }
  console.log(`${tag}완료.`);
}

run().catch(e => { console.error(e); process.exit(1); });
