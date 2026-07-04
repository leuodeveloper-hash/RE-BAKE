import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';

interface YouTubePlayerContextValue {
  /** 현재 재생 중인 영상 ID (null이면 닫힘) */
  videoId: string | null;
  /** 영상 ID로 PiP 열기 */
  open: (videoId: string) => void;
  /** PiP 닫기 */
  close: () => void;
}

const YouTubePlayerContext = createContext<YouTubePlayerContextValue | null>(null);

/**
 * YouTube PiP를 앱 루트에서 단일 인스턴스로 관리.
 * 상세/편집 등 라우트가 바뀌어도 같은 플레이어가 모든 화면 위에 유지됨.
 */
export function YouTubePlayerProvider({children}: {children: React.ReactNode}) {
  const [videoId, setVideoId] = useState<string | null>(null);

  // iOS 포함 모든 플랫폼에서 PiP로 연다. iOS는 react-native-youtube-iframe가
  // WKWebView Referer/origin을 정식 처리해 임베드 재생을 시도하고,
  // 그래도 막히는 영상은 PiP 내부에서 "유튜브에서 열기" 폴백으로 처리된다.
  const open = useCallback((id: string) => setVideoId(id), []);
  const close = useCallback(() => setVideoId(null), []);

  const value = useMemo(() => ({videoId, open, close}), [videoId, open, close]);

  return (
    <YouTubePlayerContext.Provider value={value}>
      {children}
    </YouTubePlayerContext.Provider>
  );
}

export function useYouTubePlayer(): YouTubePlayerContextValue {
  const ctx = useContext(YouTubePlayerContext);
  if (!ctx) {
    throw new Error('useYouTubePlayer must be used within YouTubePlayerProvider');
  }
  return ctx;
}
