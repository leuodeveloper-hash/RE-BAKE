/**
 * 기능사 과제 이미지(assets/images/thumbnails/pdf, JPG)를 공식 레시피의 두 번째 상단 사진으로 넣는다.
 * - 대표 사진(imageUri)은 그대로, imageUris 맨 앞에 끼운다 → 상세에서 두 번째 사진.
 * - 이미 넣은 레시피는 건너뛴다(다시 돌려도 안전). 예전 PNG가 있으면 그 자리를 JPG로 바꾸고 PNG는 지운다.
 * 실행: node scripts/addPdfRecipeImages.mjs [--dry]
 */
import admin from 'firebase-admin';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';
import {randomUUID} from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DRY = process.argv.includes('--dry');
// --force=제빵 : 이 접두사로 시작하는 파일은 이미 JPG가 있어도 새 파일로 덮어쓴다(이미지를 다시 뽑았을 때)
const FORCE = (process.argv.find(a => a.startsWith('--force=')) ?? '').slice('--force='.length);
const key = JSON.parse(readFileSync(join(ROOT, 'bakecycle-b82b5-firebase-adminsdk-fbsvc-e5a40e25.json'), 'utf8'));
admin.initializeApp({credential: admin.credential.cert(key), storageBucket: 'bakecycle-b82b5.firebasestorage.app'});
const db = admin.firestore();
const bucket = admin.storage().bucket();

const PDF = join(ROOT, 'assets/images/thumbnails/pdf');
// 레시피 문서 id → 이미지 파일
const MAP = {
  // 제과
  '14': '1.초코머핀(쵸코컵 케이크).jpg',
  'explore_1771782484055': '2.버터스펀지 케이크(별립법).jpg',
  '16': '3.젤리롤 케이크.jpg',
  '12': '4.소프트롤 케이크.jpg',
  '2': '5.버터스펀지 케이크(공립법).jpg',
  '5': '6.마드레느.jpg',
  '8': '7.쇼트브레드 쿠키.jpg',
  '7': '8.슈.jpg',
  '17': '9.브라우니.jpg',
  '18': '10.과일 케이크.jpg',
  '4': '11.파운드 케이크.jpg',
  '6': '12.다쿠와즈.jpg',
  '11': '13.타르트.jpg',
  '9': '14.흑미롤케이크(공립법).jpg',
  '10': '15.시퐁 케이크(시퐁법).jpg',
  '19': '16.마데라(컵) 케이크.jpg',
  '13': '17.버터 쿠키.jpg',
  '3': '18.치즈케이크.jpg',
  '20': '19.호두파이.jpg',
  '15': '20.초코롤.jpg',
  // 제빵
  '21': '제빵/1.빵도넛.jpg',
  '31': '제빵/2.소시지빵.jpg',
  '33': '제빵/3.식빵(비상스트레이트법).jpg',
  '24': '제빵/4.단팥빵(비상스트레이트법).jpg',
  '23': '제빵/5.그리시니.jpg',
  '26': '제빵/6.밤식빵.jpg',
  '29': '제빵/7.베이글.jpg',
  '32': '제빵/8.스위트롤.jpg',
  '35': '제빵/9.우유식빵.jpg',
  '38': '제빵/10.단과자빵(트위스트형).jpg',
  '36': '제빵/11.단과자빵(크림빵).jpg',
  '39': '제빵/12.풀만식빵.jpg',
  '30': '제빵/13.단과자빵(소보로빵).jpg',
  '22': '제빵/14.쌀식빵.jpg',
  '40': '제빵/15.호밀빵.jpg',
  '28': '제빵/16.버터톱식빵.jpg',
  '34': '제빵/17.옥수수식빵.jpg',
  '25': '제빵/18.모카빵.jpg',
  '27': '제빵/19.버터롤.jpg',
  '37': '제빵/20.통밀빵.jpg',
};

let done = 0, skipped = 0;
for (const [id, file] of Object.entries(MAP)) {
  const ref = db.collection('explore_recipes').doc(id);
  const snap = await ref.get();
  if (!snap.exists) { console.log(`⚠️  ${id} 없음`); skipped++; continue; }
  const r = snap.data();
  const extras = r.imageUris ?? [];
  const jpgIdx = extras.findIndex(u => typeof u === 'string' && u.includes(`explore_${id}_pdf.jpg`));
  const force = !!FORCE && file.startsWith(FORCE);
  if (jpgIdx >= 0 && !force) { console.log(`= ${r.title} 이미 JPG`); skipped++; continue; }
  // 예전 PNG 자리(_pdf.png)가 있으면 그 자리를 JPG로 바꾸고, 없으면 맨 앞(두 번째 사진)에 끼운다
  const pngIdx = jpgIdx >= 0 ? jpgIdx : extras.findIndex(u => typeof u === 'string' && u.includes(`explore_${id}_pdf.png`));
  if (pngIdx < 0 && extras.length >= 2) { console.log(`⚠️  ${r.title} 추가 사진이 이미 2장`); skipped++; continue; }
  console.log(`${DRY ? '[dry] ' : ''}${r.title} ← ${file}${pngIdx >= 0 ? ' (PNG 교체)' : ''}`);
  if (DRY) continue;
  const token = randomUUID();
  const dest = `recipe_images/explore_${id}_pdf.jpg`;
  await bucket.upload(join(PDF, file), {destination: dest, metadata: {contentType: 'image/jpeg', metadata: {firebaseStorageDownloadTokens: token}}});
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;
  const next = pngIdx >= 0 ? extras.map((u, i) => (i === pngIdx ? url : u)) : [url, ...extras];
  await ref.set({imageUris: next}, {merge: true});
  if (pngIdx >= 0 && jpgIdx < 0) await bucket.file(`recipe_images/explore_${id}_pdf.png`).delete().catch(() => {});
  done++;
}
console.log(`\n완료: ${done}개 추가, ${skipped}개 건너뜀`);
process.exit(0);
