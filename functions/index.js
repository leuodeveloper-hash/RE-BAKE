import {onRequest} from 'firebase-functions/v2/https';
import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {defineSecret} from 'firebase-functions/params';
import nodemailer from 'nodemailer';

/**
 * 레시피 가져오기용 CORS 프록시.
 * 웹(브라우저)은 외부 사이트(만개의레시피 등)를 CORS 때문에 직접 fetch 못 함.
 * 이 함수가 대상 URL을 서버에서 fetch해 HTML을 그대로 돌려준다.
 *   GET /importProxy?url=<encoded target url>
 * 앱은 직접 fetch가 가능하지만, 로직 통일을 위해 이 프록시를 함께 써도 된다.
 */
export const importProxy = onRequest(
  {region: 'asia-northeast3', cors: true, memory: '256MiB', timeoutSeconds: 20},
  async (req, res) => {
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
const MAIL_TO = 'leuo.developer@gmail.com';

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
