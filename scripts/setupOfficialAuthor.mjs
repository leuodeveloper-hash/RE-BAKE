/**
 * 공식 작성자 "베이키"(authors/baeki) 문서를 만들고, 어드민 계정들을 공동소유자로 등록.
 * 여러 어드민이 ownerUids에 들어가면 어느 계정으로 로그인하든 베이키 콘텐츠를 관리할 수 있고,
 * 한 계정이 소멸/이전돼도 나머지로 유지된다.
 *
 * 실행:  node scripts/setupOfficialAuthor.mjs <ADMIN_UID> [ADMIN_UID2 ...]
 *   기존 ownerUids에 합집합으로 추가(중복 제거). handle/avatar는 없을 때만 초기화.
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

const uids = process.argv.slice(2).filter(Boolean);
if (uids.length === 0) {
  console.error('사용법: node scripts/setupOfficialAuthor.mjs <ADMIN_UID> [ADMIN_UID2 ...]');
  process.exit(1);
}

async function run() {
  const ref = db.collection('authors').doc(OFFICIAL_AUTHOR_ID);
  const snap = await ref.get();
  const prev = snap.exists ? snap.data() : {};
  const merged = Array.from(new Set([...(prev.ownerUids ?? []), ...uids]));

  const data = {
    ownerUids: merged,
    handle: prev.handle ?? OFFICIAL_AUTHOR_HANDLE,
    avatarSeed: prev.avatarSeed ?? OFFICIAL_AUTHOR_ID,
  };
  await ref.set(data, {merge: true});
  console.log(`authors/${OFFICIAL_AUTHOR_ID} 갱신 · ownerUids:`, merged);
}

run().catch(e => { console.error(e); process.exit(1); });
