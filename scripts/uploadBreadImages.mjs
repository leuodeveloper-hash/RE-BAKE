#!/usr/bin/env node

/**
 * 둘러보기(explore_recipes) 썸네일을 "빵이름" 파일과 제목 매칭으로 일괄 업로드.
 *
 * 동작:
 *   1) assets/images/thumbnails/thumb_{빵이름}.png 를 레시피 제목과 매칭
 *   2) 매칭된 파일을 Firebase Storage explore_images/thumb_{recipeId}_{ver}.png 로 업로드
 *   3) explore_recipes/{recipeId}.imageUri 를 그 다운로드 URL로 업데이트
 *
 * 매칭: 제목/파일명을 공백·구두점 제거해 정규화 → 정확 일치 → 포함 관계 순.
 *       빗나가는 예외만 OVERRIDE_BY_TITLE(정규화된 제목 → 파일명)로 강제.
 *
 * 인증: 루트의 *adminsdk*.json 자동 탐색 또는 GOOGLE_APPLICATION_CREDENTIALS.
 *
 * 사용:
 *   node scripts/uploadBreadImages.mjs --dry-run  # 매핑만 출력(업로드 X)
 *   node scripts/uploadBreadImages.mjs            # 실제 업로드
 */

import admin from 'firebase-admin';
import {readFileSync, existsSync, readdirSync} from 'fs';
import {resolve, dirname} from 'path';
import {fileURLToPath} from 'url';
import {randomUUID} from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');
// 같은 경로 덮어쓰면 CDN이 옛 캐시를 서빙하므로 매 실행마다 새 경로 사용
const VERSION = Date.now().toString(36);

const BUCKET = 'bakecycle-b82b5.firebasestorage.app';
const THUMB_DIR = resolve(ROOT, 'assets/images/thumbnails');

// 제목/파일명 정규화: thumb_ 접두·확장자·공백·구두점 제거 후 비교
function norm(s) {
  return s
    .replace(/\.png$/i, '')
    .replace(/^thumb_/, '')
    .replace(/[\s:·∙・…\-_,.()/]/g, '')
    .toLowerCase();
}

// 자동 매칭이 빗나가는 예외만 (정규화된 제목 → 파일명).
const OVERRIDE_BY_TITLE = {
  '초코머핀': 'thumb_초코칩머핀.png', // 제목은 "초코머핀", 파일은 "초코칩머핀"
};

function findServiceAccount() {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && existsSync(envPath)) return envPath;
  const candidate = readdirSync(ROOT).find(f => /adminsdk.*\.json$/i.test(f));
  return candidate ? resolve(ROOT, candidate) : null;
}

function thumbFiles() {
  return readdirSync(THUMB_DIR).filter(f => /^thumb_.+\.png$/i.test(f) && !/^sample_thumb/i.test(f));
}

function pickFile(title, files) {
  const nt = norm(title);
  if (OVERRIDE_BY_TITLE[nt]) return OVERRIDE_BY_TITLE[nt];
  // 1) 정확 일치
  const exact = files.find(f => norm(f) === nt);
  if (exact) return exact;
  // 2) 포함 관계 (가장 길게 겹치는 쪽 우선)
  const cand = files
    .map(f => ({f, nf: norm(f)}))
    .filter(({nf}) => nf && (nf.includes(nt) || nt.includes(nf)))
    .sort((a, b) => b.nf.length - a.nf.length);
  return cand[0]?.f ?? null;
}

async function main() {
  const keyPath = findServiceAccount();
  if (!keyPath) {
    console.error('✗ 서비스 계정 키를 찾을 수 없습니다 (루트 *adminsdk*.json 또는 GOOGLE_APPLICATION_CREDENTIALS).');
    process.exit(1);
  }
  console.log(`• 서비스 계정 키: ${keyPath}`);

  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
  admin.initializeApp({credential: admin.credential.cert(serviceAccount), storageBucket: BUCKET});
  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  const files = thumbFiles();
  if (files.length === 0) {
    console.error(`✗ 빵이름 썸네일이 없습니다: ${THUMB_DIR}/thumb_*.png`);
    process.exit(1);
  }
  console.log(`• 빵이름 썸네일 ${files.length}장 발견`);

  const snap = await db.collection('explore_recipes').get();
  const docs = snap.docs.filter(d => !d.data().deletedAt); // 소프트 삭제 제외
  console.log(`• 둘러보기 레시피 ${docs.length}개\n`);

  const used = new Set();
  const unmatched = [];
  for (const doc of docs) {
    const id = doc.id;
    const title = doc.data().title ?? '(제목없음)';
    const file = pickFile(title, files);

    if (!file) {
      unmatched.push(`${id} "${title}"`);
      console.log(`… ${id} "${title}"  ←  (매칭 없음, 건너뜀)`);
      continue;
    }
    used.add(file);

    if (DRY_RUN) {
      console.log(`[dry] ${id} "${title}"  ←  ${file}`);
      continue;
    }

    try {
      const localPath = resolve(THUMB_DIR, file);
      const destPath = `explore_images/thumb_${id}_${VERSION}.png`;
      const token = randomUUID();
      await bucket.upload(localPath, {
        destination: destPath,
        metadata: {
          contentType: 'image/png',
          cacheControl: 'no-cache, max-age=0',
          metadata: {firebaseStorageDownloadTokens: token},
        },
      });
      const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(destPath)}?alt=media&token=${token}`;
      await db.collection('explore_recipes').doc(id).update({imageUri: url});
      console.log(`✓ ${id} "${title}"  ←  ${file}`);
    } catch (e) {
      console.error(`✗ ${id} 실패: ${e.message}`);
    }
  }

  const unused = files.filter(f => !used.has(f));
  if (unused.length) console.log(`\n• 사용 안 된 파일(${unused.length}): ${unused.join(', ')}`);
  if (unmatched.length) console.log(`• 매칭 실패 레시피(${unmatched.length}): ${unmatched.join(' | ')}`);
  console.log(`\n=== 완료 (${DRY_RUN ? 'dry-run' : '업로드'}) ===`);
  process.exit(0);
}

main().catch(e => { console.error('실패:', e); process.exit(1); });
