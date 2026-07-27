/**
 * 제빵기능사 레시피북(explore) 재시드.
 * - 기존 제빵기능사 explore_recipes 문서 + Storage 이미지 전부 삭제 후 재생성
 * - 이미지: assets/images/thumbnails/제빵기능사/thumb_*.png → Storage 업로드 → imageUri
 * - referenceUrl(유튜브) 매핑, cookbook='제빵기능사', hidden=true, 임의 재료/과정
 * 실행: node scripts/seedBreadRecipes.mjs
 */
import admin from 'firebase-admin';
import {readFileSync, readdirSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const IMG_DIR = join(ROOT, 'assets/images/thumbnails/제빵기능사');

const key = JSON.parse(readFileSync(join(ROOT, 'bakecycle-b82b5-firebase-adminsdk-fbsvc-e5a40e25.json'), 'utf8'));
admin.initializeApp({credential: admin.credential.cert(key), storageBucket: 'bakecycle-b82b5.firebasestorage.app'});
const db = admin.firestore();
const bucket = admin.storage().bucket();

// 파일명(thumb_ 제거) → 표시 제목 (오타/공백 정리)
const titleFix = {
  '풀먼식방': '풀먼식빵',
  '트위스트 단과자 빵': '트위스트 단과자빵',
};

// 비상스트레이트법으로 지정할 표시 제목 (그 외는 스트레이트법)
const EMERGENCY_STRAIGHT_TITLES = new Set(['식빵', '단팥빵']);

// 표시 제목 → 참고 유튜브 링크
const refUrl = {
  '모카빵': 'https://youtu.be/ocxTAneRVQE',
  '호밀빵': 'https://youtu.be/wWtOjtogG_M',
  '베이글': 'https://youtu.be/Dm0X-0-Pgew',
  '버터톱 식빵': 'https://youtu.be/N7gKc6ZuQdY',
  '단팥빵': 'https://youtu.be/TXV6iVui4_E',
  '크림빵': 'https://youtu.be/tpuiXVChhhU',
  '소보로빵': 'https://youtu.be/XbzleyhYV1U',
  '스위트롤': 'https://youtu.be/dFSmdATAVXE',
  '밤식빵': 'https://youtu.be/0rHUeW69WaY',
  '버터롤': 'https://youtu.be/ddHvIZazXN8',
  '소세지빵': 'https://youtu.be/BELfEoSjI6Y',
  '그리시니': 'https://youtu.be/yD1tEn-SC3Y',
  '트위스트 단과자빵': 'https://youtu.be/zLVn-RItfMQ',
  '식빵': 'https://youtu.be/8H8_KzAFbI8',
  '빵도넛': 'https://youtu.be/rhwExVAEucM',
  '옥수수식빵': 'https://youtu.be/s5OZQQ6RZ0U',
  '쌀식빵': 'https://youtu.be/P33Y3qiD-uw',
  '우유식빵': 'https://youtu.be/21AGWd1HECk',
  '풀먼식빵': 'https://youtu.be/YmGHBrbvzhA',
  '통밀빵': 'https://youtu.be/5A2b8jKB5jw',
};

const baseIngredients = () => [
  {name: '강력분', amount: '1000g'},
  {name: '물', amount: '600g'},
  {name: '이스트', amount: '20g'},
  {name: '설탕', amount: '80g'},
  {name: '소금', amount: '18g'},
  {name: '버터', amount: '60g'},
  {name: '달걀', amount: '50g'},
];
const baseTools = [
  {name: '믹싱볼'}, {name: '계량기'}, {name: '스크래퍼'}, {name: '발효기'}, {name: '오븐'}, {name: '팬'},
];
const baseSteps = (name) => [
  {step: 1, description: '가루 재료와 물, 이스트를 넣어 반죽한다. 클린업 단계에서 버터를 넣고 최종 단계까지 반죽한다.'},
  {step: 2, description: '반죽 온도 27℃, 1차 발효를 60분간 진행한다(부피 2~3배).'},
  {step: 3, description: '분할·둥글리기 후 중간 발효 15분.'},
  {step: 4, description: `${name} 모양으로 성형해 팬에 패닝한다.`},
  {step: 5, description: '2차 발효 40분(온도 38℃, 습도 85%) 후 굽는다.'},
  {step: 6, description: '윗불 190℃ 아랫불 170℃에서 25~30분 굽고 팬에서 분리해 식힌다.'},
];

async function main() {
  // 1) 기존 제빵기능사 문서 + Storage 이미지 삭제
  const old = await db.collection('explore_recipes').where('cookbook', '==', '제빵기능사').get();
  console.log(`기존 제빵기능사 ${old.size}개 삭제 중...`);
  for (const d of old.docs) {
    await bucket.file(`recipe_images/explore_${d.id}`).delete().catch(() => {});
    await d.ref.delete();
  }

  // 2) 새 id 시작값 = 전체 explore_recipes 최대 숫자 id + 1
  const all = await db.collection('explore_recipes').get();
  let maxId = 0;
  all.forEach(d => { const n = parseInt(d.id, 10); if (!isNaN(n) && n > maxId) maxId = n; });

  const files = readdirSync(IMG_DIR).filter(f => f.endsWith('.png')).sort();
  let nextId = maxId + 1;
  let created = 0, withRef = 0;

  for (const file of files) {
    // macOS 파일명은 NFD(자모 분리)라 NFC로 정규화해야 refUrl 키와 매칭됨
    const raw = file.replace(/^thumb_/, '').replace(/\.png$/, '').normalize('NFC');
    const title = titleFix[raw] || raw;
    const docId = String(nextId);

    const dest = `recipe_images/explore_${docId}`;
    await bucket.upload(join(IMG_DIR, file), {
      destination: dest,
      metadata: {contentType: 'image/png', metadata: {firebaseStorageDownloadTokens: docId}},
    });
    const imageUri = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${docId}`;

    const data = {
      id: docId,
      title,
      cookbook: '제빵기능사',
      // 제빵기능사 실기 기준 비상스트레이트법 품목(식빵·단팥빵)만 예외, 나머지는 스트레이트법
      method: EMERGENCY_STRAIGHT_TITLES.has(title) ? '비상스트레이트법' : '스트레이트법',
      reviewCount: 0,
      time: '3시간',
      servings: '적당량',
      session: '1회차',
      ingredientGroups: [{title: '반죽', ingredients: baseIngredients()}],
      tools: baseTools,
      stepGroups: [{title: '과정', steps: baseSteps(title)}],
      steps: baseSteps(title),
      activeFieldIds: ['info', 'photo', 'time', 'ingredients', 'tools', 'steps', 'servings', 'method', 'cookbook', 'review'],
      imageUri,
      hidden: true,
    };
    if (refUrl[title]) { data.referenceUrl = refUrl[title]; withRef++; }

    await db.collection('explore_recipes').doc(docId).set(data);
    console.log(`  ✔ [${docId}] ${title}${refUrl[title] ? ' 🔗' : ''} ← ${file}`);
    nextId++;
    created++;
  }

  console.log(`\n완료: ${created}개 생성 (id ${maxId + 1}~${nextId - 1}), 참고링크 ${withRef}개`);
  process.exit(0);
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
