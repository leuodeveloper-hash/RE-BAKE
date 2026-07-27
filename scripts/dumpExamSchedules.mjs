/**
 * exam_schedules 전체 덤프 (읽기 전용). 실기 기간 업데이트 전 현재 데이터 확인용.
 * 실행: node scripts/dumpExamSchedules.mjs
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

const snap = await db.collection('exam_schedules').get();
const rows = snap.docs.map(d => ({id: d.id, ...d.data()}));
rows.sort((a, b) => (a.examType + a.round).localeCompare(b.examType + b.round));
console.log(`총 ${rows.length}개\n`);
for (const r of rows) {
  console.log(`[${r.id}] ${r.examType} | ${r.round} | 접수 ${r.registrationStart} | 시험 ${r.examDate}${r.examEndDate ? '~' + r.examEndDate : ''} | 발표 ${r.resultDate}`);
}
process.exit(0);
