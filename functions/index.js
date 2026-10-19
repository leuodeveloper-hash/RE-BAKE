import {onRequest, onCall, HttpsError} from 'firebase-functions/v2/https';
import {setGlobalOptions} from 'firebase-functions/v2';
import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {defineSecret} from 'firebase-functions/params';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore, Timestamp} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import {getAuth} from 'firebase-admin/auth';
import nodemailer from 'nodemailer';

initializeApp();

// ---------------------------------------------------------------------------
// 횟수 제한 — 돈이 나갈 수 있는 함수(외부 호출·AI·대량 읽기)는 하루 한도를 둔다.
// rate_limits/{이름_키_날짜} 문서에 센다(서버만 쓴다, 앱 규칙은 기본 거부).
// 넘으면 resource-exhausted. 이틀 지난 문서는 purgeOldOcrLogs와 같은 정리에서 지운다.
// ---------------------------------------------------------------------------
const todayKey = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // 한국 날짜
async function takeQuota(name, key, limit) {
  const db = getFirestore();
  const ref = db.collection('rate_limits').doc(`${name}_${String(key).replace(/[^\w.:-]/g, '_')}_${todayKey()}`);
  const count = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const n = (snap.exists ? snap.data().count : 0) + 1;
    tx.set(ref, {count: n, day: todayKey(), name}, {merge: true});
    return n;
  });
  return count <= limit;
}
/** 함수 하나가 한 번에 띄울 수 있는 서버 수 — 몰려도 비용이 그 이상 늘지 않는다 */
const MAX_INSTANCES = 3;
// 모든 함수 기본 상한(따로 준 함수는 그 값) — 이상한 호출이 몰려도 서버가 끝없이 늘지 않는다
setGlobalOptions({maxInstances: 5});

/**
 * 레시피 가져오기용 CORS 프록시.
 * 웹(브라우저)은 외부 사이트(만개의레시피 등)를 CORS 때문에 직접 fetch 못 함.
 * 이 함수가 대상 URL을 서버에서 fetch해 HTML을 그대로 돌려준다.
 *   GET /importProxy?url=<encoded target url>
 * 앱은 직접 fetch가 가능하지만, 로직 통일을 위해 이 프록시를 함께 써도 된다.
 */
export const importProxy = onRequest(
  {region: 'asia-northeast3', cors: true, memory: '256MiB', timeoutSeconds: 20, maxInstances: MAX_INSTANCES},
  async (req, res) => {
    // 누구나 부를 수 있는 주소라 IP마다 하루 100번까지(레시피 가져오기 한 번에 1회)
    const ip = String(req.headers['x-forwarded-for'] ?? req.ip ?? 'unknown').split(',')[0].trim();
    if (!(await takeQuota('importProxy', ip, 100))) {
      res.status(429).json({error: 'TOO_MANY_REQUESTS'});
      return;
    }
    const target = req.query.url;
    if (typeof target !== 'string' || !/^https?:\/\//i.test(target)) {
      res.status(400).json({error: 'INVALID_URL'});
      return;
    }
    try {
      const upstream = await fetch(target, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
          'Accept': 'text/html',
        },
        redirect: 'follow',
      });
      if (!upstream.ok) {
        res.status(502).json({error: `HTTP_${upstream.status}`});
        return;
      }
      const html = await upstream.text();
      // 원문 HTML 그대로 반환 (클라이언트가 JSON-LD 파싱)
      res.set('Content-Type', 'text/plain; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=600');
      res.status(200).send(html);
    } catch (e) {
      res.status(502).json({error: 'FETCH_FAILED', detail: String(e?.message ?? e)});
    }
  },
);

// ---------------------------------------------------------------------------
// 의견 메일 전달
//
// 앱에 mailto:를 두면 받는 주소가 그대로 노출되고, 사용자는 앱을 벗어나
// 메일 앱에서 다시 써야 한다. 사용자는 Firestore에 남기고, 주소를 아는
// 서버가 대신 메일로 보낸다 — 주소는 앱 어디에도 들어가지 않는다.
// ---------------------------------------------------------------------------

/** 보내는 계정의 앱 비밀번호. `firebase functions:secrets:set GMAIL_APP_PASSWORD` */
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');

/** 보내는/받는 주소 — 서버에만 둔다 */
const MAIL_FROM = 'leuo.developer@gmail.com';
// hello@bakle.app은 Cloudflare 이메일 라우팅으로 같은 Gmail에 들어오고, Gmail 필터가 라벨로 모은다
const MAIL_TO = 'hello@bakle.app';

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

/**
 * recipe_feedback에 글이 생기면 메일로 보낸다.
 *
 * 전송에 실패해도 문서는 남는다 — 어드민 화면에서 볼 수 있으므로 의견을 잃지 않는다.
 */
export const onRecipeFeedback = onDocumentCreated(
  {
    document: 'recipe_feedback/{docId}',
    region: 'asia-northeast3',
    secrets: [GMAIL_APP_PASSWORD],
    memory: '256MiB',
  },
  async (event) => {
    const d = event.data?.data();
    if (!d) return;
    // 메일은 하루 50통까지(글이 몰려도 Gmail 차단·비용이 늘지 않게) — 넘은 글은 어드민 화면에서 본다
    if (!(await takeQuota('mail', 'all', 50))) return;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {user: MAIL_FROM, pass: GMAIL_APP_PASSWORD.value()},
    });

    const rows = [
      ['레시피', d.recipeTitle],
      ['종류', d.kind],
      ['보낸 사람', d.handle ?? d.uid ?? '비로그인'],
      ['레시피 ID', d.recipeId],
    ]
      .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#888">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
      .join('');

    try {
      await transporter.sendMail({
        from: `베이클 의견 <${MAIL_FROM}>`,
        to: MAIL_TO,
        subject: `[베이클] ${d.recipeTitle ?? '레시피'} 의견`,
        html: `<table>${rows}</table><hr><p style="white-space:pre-wrap">${escapeHtml(d.message)}</p>`,
      });
    } catch (e) {
      // 던지면 재시도가 돌며 같은 메일이 여러 번 갈 수 있다. 문서는 남으니 로그만.
      console.error('[onRecipeFeedback] 메일 전송 실패:', e);
    }
  },
);

/**
 * app_inquiries에 글이 생기면 메일로 보낸다.
 * 레시피 의견과 같은 이유 — 앱에 주소를 두지 않는다.
 */
export const onAppInquiry = onDocumentCreated(
  {
    document: 'app_inquiries/{docId}',
    region: 'asia-northeast3',
    secrets: [GMAIL_APP_PASSWORD],
    memory: '256MiB',
  },
  async (event) => {
    const d = event.data?.data();
    if (!d) return;
    // 메일은 하루 50통까지(글이 몰려도 Gmail 차단·비용이 늘지 않게) — 넘은 글은 어드민 화면에서 본다
    if (!(await takeQuota('mail', 'all', 50))) return;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {user: MAIL_FROM, pass: GMAIL_APP_PASSWORD.value()},
    });

    const rows = [
      ['종류', d.kind],
      ['보낸 사람', d.handle ?? d.uid ?? '비로그인'],
      ['답장받을 주소', d.replyTo ?? '-'],
      ['플랫폼', d.platform],
    ]
      .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#888">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
      .join('');

    try {
      await transporter.sendMail({
        from: `베이클 문의 <${MAIL_FROM}>`,
        to: MAIL_TO,
        // 답장 주소를 적었으면 바로 회신되게 한다
        replyTo: d.replyTo || undefined,
        subject: `[베이클] 문의 (${d.kind})`,
        html: `<table>${rows}</table><hr><p style="white-space:pre-wrap">${escapeHtml(d.message)}</p>`,
      });
    } catch (e) {
      console.error('[onAppInquiry] 메일 전송 실패:', e);
    }
  },
);

// ──────────────────────────────────────────────
// 구독 해지 후 클라우드 레시피 보관 (60일)
//
// 정책: 구독이 끝나면 클라우드 레시피를 60일 보관한 뒤 지운다.
// 기기에는 로컬 사본이 남는다(앱은 구독이 끝나면 로컬 저장소로 돌아간다).
// 60일 안에 다시 구독하면 보관 예약을 취소한다.
//
// Storage 사진은 지우지 않는다 — 기기 로컬 사본과 둘러보기에 올린 레시피가
// 같은 다운로드 URL을 그대로 쓰고 있어, 지우면 그쪽 사진이 깨진다.
// ──────────────────────────────────────────────

const CLOUD_RETENTION_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

// RevenueCat 대시보드 웹훅의 Authorization 헤더 값과 같아야 한다.
const REVENUECAT_WEBHOOK_AUTH = defineSecret('REVENUECAT_WEBHOOK_AUTH');

/** 구독이 (다시) 살아난 이벤트 — 보관 예약을 취소한다 */
const ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_EXTENDED',
]);

/**
 * RevenueCat 웹훅 — 구독 만료 시각을 기록한다.
 * CANCELLATION은 자동갱신만 끈 것(기간 끝까지는 Pro)이라 보지 않고, 실제 만료(EXPIRATION)를 본다.
 * 앱이 RevenueCat에 Firebase uid로 logIn하므로 app_user_id가 곧 uid다.
 *
 * 기록은 cloud_retention/{uid} — 규칙에 없는 컬렉션이라 클라이언트는 못 건드린다.
 */
export const revenuecatWebhook = onRequest(
  {region: 'asia-northeast3', secrets: [REVENUECAT_WEBHOOK_AUTH], memory: '256MiB'},
  async (req, res) => {
    if (req.method !== 'POST' || req.headers.authorization !== REVENUECAT_WEBHOOK_AUTH.value()) {
      res.status(401).end();
      return;
    }
    const event = req.body?.event;
    const uid = event?.app_user_id;
    // 로그인 전 익명 구매는 계정에 묶이지 않아 대상이 아니다
    if (!event || typeof uid !== 'string' || uid.startsWith('$RCAnonymousID')) {
      res.status(200).end();
      return;
    }

    const ref = getFirestore().doc(`cloud_retention/${uid}`);
    if (event.type === 'EXPIRATION') {
      const expiredAtMs = event.expiration_at_ms ?? event.event_timestamp_ms ?? Date.now();
      await ref.set({
        expiredAt: Timestamp.fromMillis(expiredAtMs),
        deleteAfter: Timestamp.fromMillis(expiredAtMs + CLOUD_RETENTION_DAYS * DAY_MS),
        product: event.product_id ?? null,
      });
    } else if (ACTIVE_EVENTS.has(event.type)) {
      await ref.delete();
    }
    res.status(200).end();
  },
);

/** 매일 새벽, 보관 기간이 지난 계정의 클라우드 레시피를 지운다 */
export const purgeExpiredCloudRecipes = onSchedule(
  {schedule: 'every day 04:00', timeZone: 'Asia/Seoul', region: 'asia-northeast3', memory: '512MiB', timeoutSeconds: 540},
  async () => {
    const db = getFirestore();
    const due = await db.collection('cloud_retention')
      .where('deleteAfter', '<=', Timestamp.now())
      .limit(200)
      .get();

    for (const snap of due.docs) {
      const uid = snap.id;
      try {
        // 어드민은 결제 없이 Pro라 만료 이벤트가 와도 지우지 않는다
        if ((await db.doc(`admin/${uid}`).get()).exists) {
          await snap.ref.delete();
          continue;
        }
        await db.recursiveDelete(db.collection(`user_recipes/${uid}/recipes`));
        await db.doc(`users/${uid}`).set({cloudPurgedAt: Timestamp.now()}, {merge: true});
        await snap.ref.delete();
        console.log(`[purgeExpiredCloudRecipes] ${uid} 클라우드 레시피 삭제`);
      } catch (e) {
        // 한 계정 실패로 나머지를 막지 않는다. 문서가 남아 다음 날 다시 시도한다.
        console.error(`[purgeExpiredCloudRecipes] ${uid} 삭제 실패:`, e);
      }
    }
  },
);

// ──────────────────────────────────────────────
// 사진 인식(OCR) 기록 정리 — 3일 보관
//
// 인식은 기기 안에서 하지만, 실패 원인을 보려고 쓴 사진을 ocr_logs/에 올리고
// 결과를 ocr_logs 문서로 남긴다. 사용자 사진이라 오래 둘 이유가 없다 —
// 개인정보 처리방침에 "3일 후 파기"로 적었으니 이 값을 바꾸면 방침도 고칠 것.
// ──────────────────────────────────────────────

const OCR_LOG_RETENTION_DAYS = 3;

export const purgeOldOcrLogs = onSchedule(
  {schedule: 'every day 04:30', timeZone: 'Asia/Seoul', region: 'asia-northeast3', memory: '512MiB', timeoutSeconds: 540},
  async () => {
    const cutoffMs = Date.now() - OCR_LOG_RETENTION_DAYS * DAY_MS;

    // 1) 기록 문서
    const db = getFirestore();
    // 0) 지난 횟수 제한 기록(이틀 전 것부터) — 오늘·어제 것만 남긴다
    const yesterday = new Date(Date.now() + 9 * 3600 * 1000 - DAY_MS).toISOString().slice(0, 10);
    const oldLimits = await db.collection('rate_limits').where('day', '<', yesterday).limit(2000).get();
    await Promise.all(oldLimits.docs.map(d => d.ref.delete()));
    const old = await db.collection('ocr_logs')
      .where('createdAt', '<', Timestamp.fromMillis(cutoffMs))
      .limit(2000)
      .get();
    const writer = db.bulkWriter();
    old.docs.forEach(d => writer.delete(d.ref));
    await writer.close();

    // 2) 사진 — 문서와 따로 지운다. 업로드만 되고 기록이 실패한 사진도 남기지 않는다.
    const [files] = await getStorage().bucket().getFiles({prefix: 'ocr_logs/'});
    let removed = 0;
    for (const f of files) {
      const created = Date.parse(f.metadata?.timeCreated ?? '');
      if (Number.isNaN(created) || created >= cutoffMs) continue;
      try {
        await f.delete();
        removed++;
      } catch (e) {
        console.error(`[purgeOldOcrLogs] ${f.name} 삭제 실패:`, e);
      }
    }
    console.log(`[purgeOldOcrLogs] 기록 ${old.size}건, 사진 ${removed}개 삭제`);
  },
);

/**
 * 계정 삭제(앱 안에서) — 앱스토어 심사 5.1.1(v).
 * 로그인한 본인만. 계정 데이터·레시피·사진을 지우고 마지막에 인증 계정을 지운다.
 * 둘러보기(공식) 레시피와 작성자(authors)는 운영 데이터라 건드리지 않는다.
 * 앱스토어 구독은 Apple이 관리하므로 여기서 해지되지 않는다(앱에서 안내).
 */
export const deleteAccount = onCall(
  {region: 'asia-northeast3', memory: '512MiB', timeoutSeconds: 120},
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'LOGIN_REQUIRED');
    const db = getFirestore();
    const bucket = getStorage().bucket();

    // 레시피 사진(recipe_images/{recipeId}…) — 레시피 id로 지운다
    const recipes = await db.collection('user_recipes').doc(uid).collection('recipes').get();
    await Promise.all(recipes.docs.map(d =>
      bucket.deleteFiles({prefix: `recipe_images/${d.id}`}).catch(() => {})));
    // 회고 사진
    await bucket.deleteFiles({prefix: `review_photos/${uid}/`}).catch(() => {});

    // 계정 데이터 — 하위 컬렉션까지
    await db.recursiveDelete(db.collection('user_recipes').doc(uid));
    await db.recursiveDelete(db.collection('public_cookbooks').doc(uid));
    await db.recursiveDelete(db.collection('users').doc(uid));
    await db.collection('cloud_retention').doc(uid).delete().catch(() => {});

    await getAuth().deleteUser(uid);
    return {ok: true};
  },
);

/**
 * 덮어쓴 레시피 되살리기 — 최근 1시간 안의 한 시점(minutesAgo분 전) 내 레시피를 읽어,
 * 지금과 다른 레시피만 '(복구본 N분 전)' 사본으로 넣는다. 지금 레시피는 건드리지 않는다.
 * Firestore는 기본으로 1시간 안의 이전 판을 읽을 수 있다(그보다 오래되면 못 읽는다).
 */
export const restoreRecipesAt = onCall(
  {region: 'asia-northeast3', memory: '512MiB', timeoutSeconds: 120, maxInstances: MAX_INSTANCES},
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'LOGIN_REQUIRED');
    // 전체 레시피를 두 번 읽는다 — 사람마다 하루 10번까지
    if (!(await takeQuota('restoreRecipesAt', uid, 10))) throw new HttpsError('resource-exhausted', 'DAILY_LIMIT');
    const minutesAgo = Math.min(59, Math.max(1, Number(req.data?.minutesAgo) || 10));
    const db = getFirestore();
    // scope 'explore' — 공식(둘러보기) 레시피, 어드민만
    const explore = req.data?.scope === 'explore';
    if (explore && !(await db.collection('admin').doc(uid).get()).exists) throw new HttpsError('permission-denied', 'ADMIN_ONLY');
    const col = explore ? db.collection('explore_recipes') : db.collection('user_recipes').doc(uid).collection('recipes');
    const readTime = Timestamp.fromMillis(Date.now() - minutesAgo * 60 * 1000);
    const past = await db.runTransaction(tx => tx.get(col), {readOnly: true, readTime});
    const now = await col.get();
    const nowById = new Map(now.docs.map(d => [d.id, JSON.stringify(d.data())]));
    let restored = 0;
    const stamp = new Date().toISOString();
    for (const d of past.docs) {
      if (d.id.includes('_restored_')) continue;
      if (nowById.get(d.id) === JSON.stringify(d.data())) continue; // 그대로면 건너뜀
      const data = d.data();
      const id = `${d.id}_restored_${minutesAgo}m`;
      await col.doc(id).set({
        ...data,
        id,
        title: `${data.title ?? ''} (복구본 ${minutesAgo}분 전)`,
        createdAt: stamp,
        updatedAt: stamp,
        // 공식 복구본은 숨김으로 — 확인 전에 사용자에게 보이지 않게
        ...(explore ? {hidden: true} : {}),
      });
      restored++;
    }
    return {restored, minutesAgo};
  },
);

// ---------------------------------------------------------------------------
// 사진 보정(어드민 전용) — 올린 사진을 커버 사진 톤앤매너로 다시 그린다(OpenAI 이미지 편집).
// 프롬프트는 Firestore config/photoStyle.prompt에서 고칠 수 있다(없으면 기본 템플릿).
// 키는 비밀값 OPENAI_API_KEY — 앱·코드에 두지 않는다.
// ---------------------------------------------------------------------------
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const DEFAULT_PHOTO_STYLE_PROMPT = [
  '너는 하마다 히데아키의 사진에서 영감을 받은 감각을 가진 전문 푸드 사진작가이자 포토에디터야. 원본 베이킹 사진을 분석해 주인공(빵·디저트)을 찾아내고, 구도부터 색감까지 완성도 높게 개선해 줘.',
  '1. 구도: 주인공을 파악하고 크롭과 여백만으로 가장 좋은 구도를 만든다. 음식과 소품의 위치·각도·배치는 옮기거나 돌리지 않는다.',
  '2. 빛: 창가의 부드러운 자연광 느낌을 살리고, 노출과 명암을 부드럽게 보정한다. 그림자는 은은하게.',
  '3. 색감: 하마다 히데아키의 사진에서 영감을 받은 맑고 담백한 색감. 화이트 밸런스는 중립으로, 흰색은 흰색 그대로. 노랗거나 주황빛 톤을 더하지 않는다. 빵의 구운 색은 실제 그대로 자연스럽게.',
  '4. 배경·환경: 실제 배경의 모습은 유지하되 어수선한 물건은 덜어내고 단순하고 정돈된 느낌으로.',
  '5. 분위기: 일상의 한 순간을 포착한 듯 자연스럽고 차분하게.',
  '6. 원본 유지: 음식의 모양, 크기, 개수, 질감, 단면, 토핑을 그대로 보존한다. 새로운 음식이나 소품을 더하거나 빼지 않는다.',
  '7. 금지: 과한 필터, 인위적인 블러, 과한 채도·광택, AI 특유의 매끈하고 부자연스러운 느낌, 글자·로고·워터마크.',
  '사진마다 가장 적합한 구도와 보정 방식을 스스로 판단하고, 단순한 색감 보정을 넘어 전문 푸드 사진작가가 촬영한 듯한 완성도 높은 사진 한 장을 만들어 줘.',
].join('\n');

export const restylePhoto = onCall(
  {region: 'asia-northeast3', memory: '1GiB', timeoutSeconds: 180, secrets: [OPENAI_API_KEY], maxInstances: MAX_INSTANCES},
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'LOGIN_REQUIRED');
    const db = getFirestore();
    if (!(await db.collection('admin').doc(uid).get()).exists) throw new HttpsError('permission-denied', 'ADMIN_ONLY');
    // OpenAI 이미지 편집은 장당 비용이 든다 — 하루 30장까지
    if (!(await takeQuota('restylePhoto', uid, 30))) throw new HttpsError('resource-exhausted', 'DAILY_LIMIT');

    // 사진 — 앱이 줄여 보낸 JPEG base64, 또는 이미 올라간 주소
    const {imageBase64, imageUrl} = req.data ?? {};
    let bytes;
    if (typeof imageBase64 === 'string' && imageBase64) {
      bytes = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    } else if (typeof imageUrl === 'string' && /^https:\/\//.test(imageUrl)) {
      const r = await fetch(imageUrl);
      if (!r.ok) throw new HttpsError('invalid-argument', 'IMAGE_FETCH_FAILED');
      bytes = Buffer.from(await r.arrayBuffer());
    } else {
      throw new HttpsError('invalid-argument', 'IMAGE_REQUIRED');
    }
    if (bytes.length > 8 * 1024 * 1024) throw new HttpsError('invalid-argument', 'IMAGE_TOO_LARGE');

    // 앱에서 고친 프롬프트가 오면 그걸 쓰고, 다음에도 쓰게 저장한다
    const custom = typeof req.data?.prompt === 'string' ? req.data.prompt.trim().slice(0, 2000) : '';
    let prompt;
    if (custom) {
      prompt = custom;
      await db.doc('config/photoStyle').set({prompt: custom, updatedAt: Timestamp.now(), updatedBy: uid}, {merge: true});
    } else {
      const style = (await db.doc('config/photoStyle').get()).data();
      prompt = (typeof style?.prompt === 'string' && style.prompt.trim()) || DEFAULT_PHOTO_STYLE_PROMPT;
    }
    // 이번 한 번만 더하는 요청 — 기본 템플릿은 그대로 두고 뒤에 붙인다(저장하지 않는다)
    const extra = typeof req.data?.extra === 'string' ? req.data.extra.trim().slice(0, 500) : '';
    if (extra) prompt = `${prompt}\n\n추가 요청(위 원칙을 지키면서 반영): ${extra}`;

    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('prompt', prompt);
    form.append('image', new Blob([bytes], {type: 'image/jpeg'}), 'photo.jpg');
    form.append('size', 'auto');
    // 낮춤 — 중간보다 절반쯤 빠르고 싸다(디테일은 조금 덜)
    form.append('quality', 'low');
    form.append('output_format', 'jpeg');
    form.append('output_compression', '80');
    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {Authorization: `Bearer ${OPENAI_API_KEY.value()}`},
      body: form,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[restylePhoto] openai', res.status, json?.error?.message);
      throw new HttpsError('internal', `OPENAI_${res.status}: ${json?.error?.message ?? ''}`.slice(0, 300));
    }
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) throw new HttpsError('internal', 'NO_IMAGE');

    // 결과를 Storage에 — 앱 업로드와 같은 경로(recipe_images), 공개 다운로드 주소로 돌려준다
    const token = crypto.randomUUID();
    const path = `recipe_images/restyled_${uid}_${Date.now()}.jpg`;
    const bucket = getStorage().bucket();
    await bucket.file(path).save(Buffer.from(b64, 'base64'), {
      contentType: 'image/jpeg',
      metadata: {metadata: {firebaseStorageDownloadTokens: token}},
    });
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
    return {url};
  },
);

/** 보정 프롬프트 읽기(어드민) — 저장된 게 없으면 기본 템플릿. reset이면 기본으로 되돌린다 */
export const photoStylePrompt = onCall(
  {region: 'asia-northeast3', memory: '256MiB'},
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'LOGIN_REQUIRED');
    const db = getFirestore();
    if (!(await db.collection('admin').doc(uid).get()).exists) throw new HttpsError('permission-denied', 'ADMIN_ONLY');
    if (req.data?.reset) {
      await db.doc('config/photoStyle').set({prompt: '', updatedAt: Timestamp.now(), updatedBy: uid}, {merge: true});
      return {prompt: DEFAULT_PHOTO_STYLE_PROMPT, isDefault: true};
    }
    const style = (await db.doc('config/photoStyle').get()).data();
    const saved = typeof style?.prompt === 'string' ? style.prompt.trim() : '';
    return {prompt: saved || DEFAULT_PHOTO_STYLE_PROMPT, isDefault: !saved};
  },
);
