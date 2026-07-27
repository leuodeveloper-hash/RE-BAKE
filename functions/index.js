import {onRequest} from 'firebase-functions/v2/https';

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
