import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, Linking, PanResponder, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {IconClose, IconYoutube} from '@components/Icon/IconIndex';
import {IconButton} from '@components/IconButton';
import {APPBAR_CONTENT_BOTTOM} from '@components/Navigation';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';

export interface YouTubePlayerModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string | null;
}

// PLAYER_WIDTH/HEIGHT는 화면폭 기준으로 컴포넌트에서 동적 계산(풀 와이드).
const MARGIN = 16;
const HANDLE_H = 22; // 드래그 핸들 바 높이 (영상 위 바깥에 위치)
const BOTTOM_RESERVE = MARGIN; // 하단 스냅 시 안전영역(win.bottom) 위로 MARGIN만 띄워 바닥에 붙임
// 최소화(손톱) 크기 — 화면 왼쪽으로 던지면 우상단에 작게 도킹, 소리만 유지
const NAIL_W = 72;
const NAIL_H = Math.round((NAIL_W * 9) / 16);

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

/**
 * 네이티브(iOS/Android): 화면 위에 떠다니는 PiP 스타일 미니 플레이어.
 * - Modal이 아닌 절대 위치 오버레이라 뒤 화면을 계속 사용할 수 있음
 * - 비디오 영역 어디든 드래그해서 이동 (투명 오버레이가 터치를 가로채 WebView로 전달 안 함)
 * - iOS 새창/에러 방지: onShouldStartLoadWithRequest로 watch 링크 top-level 이동 차단,
 *   Android는 setSupportMultipleWindows=false로 새창 팝업 차단
 */
export function YouTubePlayerModal({visible, onClose, videoId}: YouTubePlayerModalProps) {
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  // 풀 와이드: 좌우 16 여백 확보, 최대 480 캡. 세로는 16:9.
  const PLAYER_WIDTH = Math.min(Math.round(width - MARGIN * 2), 480);
  const PLAYER_HEIGHT = Math.round((PLAYER_WIDTH * 9) / 16);

  const pan = useRef(new Animated.ValueXY()).current;
  const value = useRef({x: 0, y: 0});
  // 0 = 전체 크기, 1 = 최소화(손톱)
  const minim = useRef(new Animated.Value(0)).current;
  const [minimized, setMinimized] = useState(false);
  const minimizedRef = useRef(false);
  minimizedRef.current = minimized;
  // WebView 하드 로드 실패(네트워크/HTTP) 감지 → 폴백 카드 노출
  const [loadFailed, setLoadFailed] = useState(false);

  // 임베드가 안 되는 영상(150/153)이거나 로드 실패 시 → 유튜브 앱/브라우저로 탈출
  const openInYouTube = useCallback(() => {
    if (!videoId) return;
    Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`).catch(() => {});
  }, [videoId]);
  // 최소화 직전 전체 위치 (복원 시 사용)
  const lastFull = useRef({x: 0, y: 0});
  // 화면 치수 ref (한 번만 생성되는 PanResponder에서 최신값 참조용)
  const win = useRef({width, height, top: insets.top, bottom: insets.bottom});

  useEffect(() => {
    const id = pan.addListener((v) => {
      value.current = v;
    });
    return () => pan.removeListener(id);
  }, [pan]);

  // 현재 모드(전체/최소화) 크기 기준으로 위치를 화면 안에 클램프
  const clampPos = (x: number, y: number, minimizedMode: boolean) => {
    const w = minimizedMode ? NAIL_W : PLAYER_WIDTH;
    const h = minimizedMode ? NAIL_H : PLAYER_HEIGHT + HANDLE_H;
    const minX = MARGIN;
    // 이동 상한: 앱바(상단 nav) 바로 아래까지 (앱바와 겹치지 않게)
    const minY = win.current.top + APPBAR_CONTENT_BOTTOM + MARGIN;
    const maxX = win.current.width - w - MARGIN;
    const maxY = win.current.height - h - win.current.bottom - BOTTOM_RESERVE;
    return {x: clamp(x, minX, maxX), y: clamp(y, minY, maxY)};
  };

  // 사방 네 모서리 중 (x,y) 위치의 중심과 가장 가까운 코너로 스냅 (전체 크기 기준)
  const snapToCorner = (x: number, y: number) => {
    const w = PLAYER_WIDTH, h = PLAYER_HEIGHT + HANDLE_H;
    const minX = MARGIN;
    const minY = win.current.top + APPBAR_CONTENT_BOTTOM + MARGIN;
    const maxX = win.current.width - w - MARGIN;
    const maxY = win.current.height - h - win.current.bottom - BOTTOM_RESERVE;
    const cx = x + w / 2, cy = y + h / 2;
    return {
      x: cx < win.current.width / 2 ? minX : maxX,           // 좌/우
      y: cy < (minY + maxY) / 2 ? minY : maxY,               // 상/하
    };
  };

  // 우상단 손톱 도킹 — transform: scale는 중심 기준이라, 축소된 박스의 중심이
  // 우상단 손톱 위치에 오도록 전체(220×124) 박스의 좌상단을 역산해서 배치
  const nailDock = () => ({
    x: win.current.width - MARGIN - NAIL_W / 2 - PLAYER_WIDTH / 2,
    y: win.current.top + APPBAR_CONTENT_BOTTOM + MARGIN + NAIL_H / 2 - PLAYER_HEIGHT / 2,
  });

  const minimize = () => {
    lastFull.current = clampPos(value.current.x, value.current.y, false);
    minimizedRef.current = true;
    setMinimized(true);
    Animated.parallel([
      Animated.spring(pan, {toValue: nailDock(), friction: 9, tension: 70, useNativeDriver: false}),
      Animated.timing(minim, {toValue: 1, duration: 220, useNativeDriver: false}),
    ]).start();
  };

  const restore = () => {
    minimizedRef.current = false;
    setMinimized(false);
    const pos = clampPos(lastFull.current.x, lastFull.current.y, false);
    Animated.parallel([
      Animated.spring(pan, {toValue: pos, friction: 9, tension: 70, useNativeDriver: false}),
      Animated.timing(minim, {toValue: 0, duration: 220, useNativeDriver: false}),
    ]).start();
  };

  // 보이게 될 때(또는 새 영상) 상단 중앙 전체 크기로 초기 배치 + 치수 갱신
  useEffect(() => {
    win.current = {width, height, top: insets.top, bottom: insets.bottom};
    if (visible && videoId) {
      minimizedRef.current = false;
      setMinimized(false);
      setLoadFailed(false);
      minim.setValue(0);
      // 상단 중앙으로 클램프 (x는 가로 중앙, y=0 → 앱바 아래 minY로 클램프)
      const pos = clampPos((width - PLAYER_WIDTH) / 2, 0, false);
      pan.setValue(pos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, videoId, width, height, insets.top, insets.bottom]);

  const panResponder = useRef(
    PanResponder.create({
      // 드래그 핸들 위에서는 시작부터 제스처를 점유 (아래 콘텐츠/스크롤로 새지 않게)
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // 부모 ScrollView가 드래그 중간에 제스처를 가로채지 못하게 막음
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}], {useNativeDriver: false}),
      onPanResponderRelease: (_, g) => {
        pan.flattenOffset();
        // 왼쪽 가장자리로 끌어 일부가 화면 밖으로 나가거나, 왼쪽으로 던지면 → 최소화(우상단 손톱)
        const offLeft = value.current.x < -PLAYER_WIDTH * 0.18;
        const flungLeft = g.vx < -0.6 && value.current.x < MARGIN + 24;
        if (offLeft || flungLeft) {
          minimize();
          return;
        }
        // 던진 속도만큼 관성 반영한 지점에서 가장 가까운 네 모서리로 스냅 (상하좌우 어디든)
        const PROJECT = 90;
        const projX = value.current.x + g.vx * PROJECT;
        const projY = value.current.y + g.vy * PROJECT;
        const pos = snapToCorner(projX, projY);
        Animated.spring(pan, {toValue: pos, friction: 7, tension: 50, useNativeDriver: false}).start();
      },
    }),
  ).current;

  if (!visible || !videoId) return null;

  // 크기는 항상 고정(220×124) → WebView 프레임 안정(검은화면 방지). 최소화는 scale로만.
  const scale = minim.interpolate({inputRange: [0, 1], outputRange: [1, NAIL_W / PLAYER_WIDTH]});

  return (
    <Animated.View
      style={[styles.floating, {width: PLAYER_WIDTH, height: PLAYER_HEIGHT + HANDLE_H}, {transform: [...pan.getTranslateTransform(), {scale}]}]}
      pointerEvents="box-none">
      {/* 드래그 핸들 — 영상 위(바깥). 박스 높이에 포함시켜 터치도 정상 수신 */}
      <View style={styles.handleBar} {...panResponder.panHandlers}>
        <View style={styles.grabber} />
      </View>

      {/* 영상 카드 (라운드·클립·그림자) */}
      <View style={styles.videoCard}>
        {/* 비디오: YouTube 기본 컨트롤을 쓰도록 터치 활성화 (이동은 상단 핸들로) */}
        <View style={styles.videoWrap}>
          {loadFailed ? (
            // 하드 로드 실패 → 검은 박스 대신 외부 열기 안내 카드
            <View style={styles.fallback}>
              <Text style={styles.fallbackText}>여기서 재생할 수 없는 영상이에요</Text>
              <Pressable style={styles.fallbackBtn} onPress={openInYouTube}>
                <Text style={styles.fallbackBtnText}>유튜브에서 열기</Text>
              </Pressable>
            </View>
          ) : (
          // 검증된 라이브러리: WKWebView의 Referer/origin 핸드셰이크를 정식 처리해
          // iOS 152/153 임베드 거부를 회피. 그래도 막히는 영상은 onError로 폴백 카드.
          <YoutubePlayer
            height={PLAYER_HEIGHT}
            width={PLAYER_WIDTH}
            videoId={videoId}
            play
            onError={() => setLoadFailed(true)}
            initialPlayerParams={{
              controls: true,
              rel: false,
              iv_load_policy: 3,
            }}
            webViewProps={{
              allowsInlineMediaPlayback: true,
              allowsPictureInPictureMediaPlayback: true,
              androidLayerType: Platform.OS === 'android' ? 'hardware' : undefined,
            }}
          />
          )}
        </View>

        {minimized ? (
          // 최소화(손톱): 탭하면 전체로 복원. 영상은 계속 재생돼 소리만 들을 수 있음
          <Pressable style={StyleSheet.absoluteFill} onPress={restore} />
        ) : (
          <>
            {/* 유튜브에서 열기 — 임베드 거부(150/153) 영상도 빠져나갈 수 있는 상시 탈출구 */}
            <View style={styles.openBtn}>
              <IconButton icon={IconYoutube} onPress={openInYouTube} variant="soft" size="medium" onImage />
            </View>

            {/* 닫기 */}
            <View style={styles.closeBtn}>
              <IconButton icon={IconClose} onPress={onClose} variant="soft" size="medium" onImage />
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floating: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'visible', // 핸들 바가 영상 위(바깥)에 보이도록
    zIndex: 1000,
  },
  videoCard: {
    flex: 1,
    borderRadius: Radius['radius-xl'],
    backgroundColor: '#000',
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
  },
  videoWrap: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  handleBar: {
    height: HANDLE_H, // 영상 위(바깥) — 박스 안 in-flow라 터치 정상
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(60, 60, 60, 0.55)', // 밝은 앱 배경 위에서도 보이게
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    zIndex: 6,
  },
  openBtn: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    zIndex: 6,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    backgroundColor: '#1A1A1A',
  },
  fallbackText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  fallbackBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius['radius-md'],
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  fallbackBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
