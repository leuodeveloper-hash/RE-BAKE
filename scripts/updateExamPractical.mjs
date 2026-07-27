/**
 * 실기 시험을 '기간'으로 반영 — 실기 문서에 examEndDate(종료일) 추가.
 * 큐넷 2026 기능사 정기 실기 기간 (종목 공통):
 *   1회 3.14~4.1 / 2회 5.30~6.14 / 3회 8.29~9.16 / 4회 11.14~12.2
 * 시작일(examDate)은 기존 값과 일치하므로 examEndDate만 set (merge).
 * 실행: node scripts/updateExamPractical.mjs
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

// 회차 → 실기 종료일 (ISO, KST 09:00 — 시작일 포맷과 통일)
// 기간: 1회 3.14~4.1 / 2회 5.30~6.14 / 3회 8.29~9.16 / 4회 11.14~12.2
const END_BY_ROUND = {
  '2026년 1회': '2026-04-01T09:00:00+09:00',
  '2026년 2회': '2026-06-14T09:00:00+09:00',
  '2026년 3회': '2026-09-16T09:00:00+09:00',
  '2026년 4회': '2026-12-02T09:00:00+09:00',
};

const snap = await db.collection('exam_schedules').where('examType', 'in', ['baking_practical', 'pastry_practical']).get();
let updated = 0, skipped = 0;
for (const doc of snap.docs) {
  const d = doc.data();
  const end = END_BY_ROUND[d.round];
  if (!end) { skipped++; console.log(`⚠️  ${doc.id}: 회차 매칭 실패 (${d.round})`); continue; }
  await doc.ref.set({examEndDate: end}, {merge: true});
  updated++;
  console.log(`  ✔ ${doc.id} ${d.round}: examEndDate=${end}`);
}
console.log(`\n완료: ${updated}개 업데이트, ${skipped}개 스킵`);
process.exit(0);
