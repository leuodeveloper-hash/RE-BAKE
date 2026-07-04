/**
 * YouTube URL 감지 및 비디오 ID 추출
 * - youtube.com/watch?v=ID
 * - youtu.be/ID
 * - youtube.com/shorts/ID
 * - youtube.com/embed/ID
 * - m.youtube.com/...
 */
export function parseYouTubeVideoId(url: string | undefined | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');

    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return isValidId(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const v = u.searchParams.get('v');
      if (v && isValidId(v)) return v;

      const segments = u.pathname.split('/').filter(Boolean);
      if (segments.length >= 2 && (segments[0] === 'shorts' || segments[0] === 'embed' || segments[0] === 'live')) {
        return isValidId(segments[1]) ? segments[1] : null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function isValidId(id: string | undefined): id is string {
  return !!id && /^[a-zA-Z0-9_-]{6,20}$/.test(id);
}

export function isYouTubeUrl(url: string | undefined | null): boolean {
  return parseYouTubeVideoId(url) !== null;
}

/** PiP 가능 임베드 URL — YouTube 자체 UI 완전히 숨김 (controls=0) */
export function buildYouTubeEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    controls: '1',          // YouTube 기본 컨트롤(재생/정지/탐색) 사용
    iv_load_policy: '3',    // annotation 숨김
    disablekb: '1',         // 키보드 단축키 차단
    fs: '0',                // 풀스크린 버튼 숨김
  });
  // youtube-nocookie.com이 일부 영상에서 더 안정적 (mobile WebView)
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

/**
 * iOS WebView 임베드용 HTML 래퍼.
 * - 직접 URL 로드 시 about:blank origin이라 YouTube가 error 153으로 거부
 * - HTML로 wrap + baseUrl을 youtube.com으로 → embed 정상 동작
 * - ⚠️ iOS(WKWebView)는 3rd-party 쿠키/스토리지를 기본 차단한다. baseUrl이
 *   youtube.com인데 iframe을 youtube-nocookie.com으로 넣으면 교차 도메인(3rd-party)
 *   프레임이 돼 일부 영상이 error 150/153으로 재생 거부된다(웹 브라우저는 통과).
 *   → iframe도 baseUrl과 같은 1st-party(youtube.com/embed)로 맞춘다.
 */
export function buildYouTubeEmbedHtml(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    controls: '1',          // YouTube 기본 컨트롤(재생/정지/탐색) 사용
    iv_load_policy: '3',
    disablekb: '1',
    fs: '0',
  });
  // baseUrl(youtube.com)과 동일 도메인 → 1st-party 프레임으로 WKWebView 차단 회피
  const src = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <style>
      html, body { margin: 0; padding: 0; background: #000; height: 100%; overflow: hidden; }
      iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
    </style>
  </head>
  <body>
    <iframe
      src="${src}"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen
    ></iframe>
  </body>
</html>`;
}
