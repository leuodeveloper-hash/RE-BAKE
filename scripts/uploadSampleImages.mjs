#!/usr/bin/env node

/**
 * 둘러보기(explore_recipes) 레시피의 썸네일 이미지를 로컬 샘플로 일괄 재업로드.
 *
 * 동작:
 *   1) assets/images/thumbnails/sample_thumb_{N}.png 를 Firebase Storage
 *      explore_images/thumb_{recipeId}.png 로 업로드 (firebase-admin 버킷)
 *   2) 각 explore_recipes/{recipeId} 문서의 imageUri 를 그 다운로드 URL로 업데이트
 *
 * 매핑(기본): 레시피 문서 id가 숫자면 sample_thumb_{id}.png 사용,
 *            없으면 정렬된 샘플을 인덱스 순으로 순환 배정.
 *
 * 인증: firebase-admin 서비스 계정 키(JSON)가 필요.
 *   - 환경변수 GOOGLE_APPLICATION_CREDENTIALS=/경로/key.json  또는
 *   - 프로젝트 루트의 *adminsdk*.json 파일을 자동 탐색.
 *   (Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성)
 *
 * 사용:
 *   node scripts/uploadSampleImages.mjs            # 실제 실행
 *   node scripts/uploadSampleImages.mjs --dry-run  # 매핑만 출력(업로드 X)
 */

import admin from 'firebase-admin';
import {readFileSync, existsSync, readdirSync} from 'fs';
import {resolve, dirname} from 'path';
import {fileURLToPath} from 'url';
import {randomUUID} from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');
// 새 경로 버전 — 같은 경로 덮어쓰면 CDN이 옛 캐시를 서빙하므로, 매 실행마다 새 경로 사용
const VERSION = Date.now().toString(36);

const BUCKET = 'bakecycle-b82b5.firebasestorage.app';
const THUMB_DIR = resolve(ROOT, 'assets/images/thumbnails');

// 문서 id별 수동 매핑 — 샘플 파일명 번호가 음식과 무관해서, 이미지를 직접 보고 음식별로 매칭
const OVERRIDE = {
  '2': 'sample_thumb_6.png',   // 버터스폰지케이크: 공립 ← 둥근 노란 스폰지
  '3': 'sample_thumb_16.png',  // 치즈케이크 (별립과 스왑)
  '4': 'sample_thumb_18.png',  // 파운드케이크 ← 플레인 로프
  '5': 'sample_thumb_4.png',   // 마들렌
  '6': 'sample_thumb_2.png',   // 다쿠와즈 ← 크림 샌드
  '7': 'sample_thumb_11.png',  // 슈
  '8': 'sample_thumb_10.png',  // 쇼트브레드쿠키 ← 격자 계란물
  '9': 'sample_thumb_20.png',  // 흑미롤케이크 ← 검은 롤
  '10': 'sample_thumb_12.png', // 시폰케이크 ← 가운데 구멍
  '11': 'sample_thumb_17.png', // 타르트 ← 아몬드 타르트
  '12': 'sample_thumb_9.png',  // 소프트롤케이크 ← 크림 롤
  '13': 'sample_thumb_7.png',  // 버터쿠키 ← 짜낸 무늬
  '14': 'sample_thumb_15.png', // 초코머핀 ← 초코칩 머핀
  '15': 'sample_thumb_14.png', // 초코롤케이크
  '16': 'sample_thumb_13.png', // 젤리롤케이크 ← 잼 롤
  '17': 'sample_thumb_8.png',  // 브라우니 ← 견과 초코
  '18': 'sample_thumb_1.png',  // 과일케이크 ← 건과일 로프
  '19': 'sample_thumb_3.png',  // 마데라컵케이크 ← 컵케이크
  '20': 'sample_thumb_19.png', // 호두파이 ← 미니 호두 타르트
  'explore_1771782484055': 'sample_thumb_5.png',  // 버터스폰지: 별립 (치즈케이크와 스왑)
  'explore_1771923122317': 'sample_thumb_21.png', // 실기 시험 준비물 ← 셰프복+저울
};

// ---- 서비스 계정 키 찾기 ----
function findServiceAccount() {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && existsSync(envPath)) return envPath;
  const candidate = readdirSync(ROOT).find(f => /adminsdk.*\.json$/i.test(f) || /service.*account.*\.json$/i.test(f));
  if (candidate) return resolve(ROOT, candidate);
  return null;
}

// ---- 사용 가능한 샘플 목록 (sample_thumb_N.png), N 오름차순 ----
function sampleFiles() {
  return readdirSync(THUMB_DIR)
    .map(f => f.match(/^sample_thumb_(\d+)\.png$/i))
    .filter(Boolean)
    .map(m => ({n: Number(m[1]), file: m[0]}))
    .sort((a, b) => a.n - b.n);
}

async function main() {
  const keyPath = findServiceAccount();
  if (!keyPath) {
    console.error('✗ 서비스 계정 키를 찾을 수 없습니다.');
    console.error('  Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 후');
    console.error('  받은 JSON을 프로젝트 루트에 두거나 GOOGLE_APPLICATION_CREDENTIALS 환경변수로 지정하세요.');
    process.exit(1);
  }
  console.log(`• 서비스 계정 키: ${keyPath}`);

  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: BUCKET,
  });
  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  const samples = sampleFiles();
  if (samples.length === 0) {
    console.error(`✗ 샘플 이미지가 없습니다: ${THUMB_DIR}/sample_thumb_*.png`);
    process.exit(1);
  }
  const byNumber = new Map(samples.map(s => [s.n, s.file]));
  console.log(`• 샘플 이미지 ${samples.length}장 발견`);

  const snap = await db.collection('explore_recipes').get();
  const docs = snap.docs.filter(d => !d.data().deletedAt); // 소프트 삭제 제외
  console.log(`• 둘러보기 레시피 ${docs.length}개\n`);

  let i = 0;
  for (const doc of docs) {
    const id = doc.id;
    // 매핑: 숫자 id면 같은 번호 샘플, 아니면 인덱스 순환
    const numId = Number(id);
    const sampleFile = OVERRIDE[id]
      ?? ((Number.isFinite(numId) && byNumber.has(numId))
        ? byNumber.get(numId)
        : samples[i % samples.length].file);
    i++;

    const localPath = resolve(THUMB_DIR, sampleFile);
    // 새 경로(버전 suffix) — CDN 캐시 이력 없는 URL이라 모두 새 이미지를 받음
    const destPath = `explore_images/thumb_${id}_${VERSION}.png`;
    const title = doc.data().title ?? '(제목없음)';

    if (DRY_RUN) {
      console.log(`[dry] ${id} "${title}"  ←  ${sampleFile}`);
      continue;
    }

    try {
      const token = randomUUID();
      await bucket.upload(localPath, {
        destination: destPath,
        metadata: {
          contentType: 'image/png',
          cacheControl: 'no-cache, max-age=0', // 향후 갱신도 재검증되게
          metadata: {firebaseStorageDownloadTokens: token},
        },
      });
      const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(destPath)}?alt=media&token=${token}`;
      await db.collection('explore_recipes').doc(id).update({imageUri: url});
      console.log(`✓ ${id} "${title}"  ←  ${sampleFile}`);
    } catch (e) {
      console.error(`✗ ${id} 실패: ${e.message}`);
    }
  }

  console.log(`\n=== 완료 (${DRY_RUN ? 'dry-run' : '업로드'}) ===`);
  process.exit(0);
}

main().catch(e => { console.error('실패:', e); process.exit(1); });
