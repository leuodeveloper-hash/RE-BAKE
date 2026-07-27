/**
 * 공식 작성자 표시 핸들 교정: authorHandle "baeki" → "bakey".
 * 코드 상수 OFFICIAL_AUTHOR_HANDLE='bakey'와 DB를 일치시킨다.
 * (authorId는 그대로 "baeki" — 논리적 작성자 ID는 불변)
 *
 * 대상:
 *  - authors/baeki: handle="bakey"
 *  - explore_recipes 중 authorId=="baeki": authorHandle="bakey"
 *
 * 실행:  node scripts/fixOfficialHandleToBakey.mjs [--dry]
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

const ID = 'baeki';       // 논리적 작성자 ID (불변)
const HANDLE = 'bakey';   // 표시 핸들 (코드 상수와 일치)
const DRY = process.argv.includes('--dry');
const tag = DRY ? '[DRY] ' : '';

async function run() {
  // 1) authors/baeki 핸들 교정
  console.log(`${tag}authors/${ID}: handle=${HANDLE}`);
  if (!DRY) await db.collection('authors').doc(ID).set({handle: HANDLE}, {merge: true});

  // 2) explore_recipes (authorId==baeki) authorHandle 교정
  const snap = await db.collection('explore_recipes').where('authorId', '==', ID).get();
  console.log(`${tag}explore_recipes ${snap.size}개 authorHandle → ${HANDLE}`);
  if (!DRY && snap.size > 0) {
    let batch = db.batch();
    let n = 0;
    for (const doc of snap.docs) {
      batch.update(doc.ref, {authorHandle: HANDLE});
      if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); }
    }
    await batch.commit();
  }
  console.log(`${tag}완료.`);
}

run().catch(e => { console.error(e); process.exit(1); });
