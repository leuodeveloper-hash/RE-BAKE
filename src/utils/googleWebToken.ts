/**
 * 웹 Google 로그인 토큰 — Google Identity Services(GIS) 창으로 액세스 토큰을 받는다.
 * Firebase 팝업은 크롬 COOP 때문에 결과가 안 넘어오고, 탭 이동은 처리 주소가 같은 사이트일 때만 된다.
 * localhost처럼 처리 주소가 다른 곳에서 쓴다(Google 클라이언트의 JavaScript 원본에 주소가 있어야 한다).
 */
const GIS_SRC = 'https://accounts.google.com/gsi/client';

let loading: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if ((window as any).google?.accounts?.oauth2) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = GIS_SRC;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { loading = null; reject(new Error('gis-load-failed')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** 창을 띄워 액세스 토큰을 받는다 — 닫으면 code 'auth/popup-closed-by-user'로 실패 */
export async function requestGoogleAccessToken(clientId: string): Promise<string> {
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (res: {access_token?: string; error?: string}) => {
        if (res.access_token) resolve(res.access_token);
        else reject(Object.assign(new Error(res.error ?? 'gis-failed'), {code: 'auth/gis-failed'}));
      },
      error_callback: (err: {type?: string}) => reject(Object.assign(new Error(err.type ?? 'gis-closed'),
        {code: err.type === 'popup_closed' ? 'auth/popup-closed-by-user' : 'auth/gis-failed'})),
    });
    client.requestAccessToken();
  });
}
