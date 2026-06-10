import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, PanResponder, Platform, StyleSheet, View, useWindowDimensions} from 'react-native';
import {WebView} from 'react-native-webview';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {IconClose} from '@components/Icon/IconIndex';
import {IconButton} from '@components/IconButton';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {buildYouTubeEmbedHtml} from '@utils/youtube';

export interface YouTubePlayerModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string | null;
}

const PLAYER_WIDTH = 220;
const PLAYER_HEIGHT = Math.round((PLAYER_WIDTH * 9) / 16);
const MARGIN = 16;
const BOTTOM_RESERVE = 96; // 하단 탭바/슬라이더 영역 확보

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
  const embedHtml = useMemo(() => (videoId ? buildYouTubeEmbedHtml(videoId) : null), [videoId]);

  const pan = useRef(new Animated.ValueXY()).current;
  const value = useRef({x: 0, y: 0});
  const bounds = useRef({minX: MARGIN, minY: MARGIN, maxX: MARGIN, maxY: MARGIN});

  useEffect(() => {
    const id = pan.addListener((v) => {
      value.current = v;
    });
    return () => pan.removeListener(id);
  }, [pan]);

  // 보이게 될 때 우하단으로 초기 배치 + 경계 갱신
  useEffect(() => {
    const minX = MARGIN;
    const minY = insets.top + MARGIN;
    const maxX = width - PLAYER_WIDTH - MARGIN;
    const maxY = height - PLAYER_HEIGHT - insets.bottom - BOTTOM_RESERVE;
    bounds.current = {minX, minY, maxX, maxY};
    if (visible) {
      pan.setValue({x: clamp(maxX, minX, maxX), y: clamp(maxY, minY, maxY)});
    }
  }, [visible, width, height, insets.top, insets.bottom, pan]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}], {useNativeDriver: false}),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        const {minX, minY, maxX, maxY} = bounds.current;
        Animated.spring(pan, {
          toValue: {
            x: clamp(value.current.x, minX, maxX),
            y: clamp(value.current.y, minY, maxY),
          },
          friction: 8,
          tension: 60,
          useNativeDriver: false,
        }).start();
      },
    }),
  ).current;

  if (!visible || !embedHtml) return null;

  return (
    <Animated.View
      style={[styles.floating, {transform: pan.getTranslateTransform()}]}
      pointerEvents="box-none">
      {/* 비디오: 터치 비활성 — 위 드래그 오버레이가 이동 담당 */}
      <View style={styles.videoWrap} pointerEvents="none">
        <WebView
          source={{html: embedHtml, baseUrl: 'https://www.youtube.com'}}
          originWhitelist={['*']}
          style={styles.webview}
          allowsInlineMediaPlayback
          allowsPictureInPictureMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo={false}
          javaScriptCanOpenWindowsAutomatically={false}
          setSupportMultipleWindows={false}
          androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
          onShouldStartLoadWithRequest={(req) => {
            const url = req.url || '';
            // 임베드 내부 로드는 허용
            if (url.startsWith('about:')) return true;
            if (url.includes('/embed/')) return true;
            // "watch on YouTube" 같은 top-level 이동(새창/에러 원인) 차단
            if (
              url.includes('youtube.com/watch') ||
              url.includes('youtu.be') ||
              url.includes('m.youtube.com') ||
              url.includes('://www.youtube.com/') ||
              url.includes('://youtube.com/')
            ) {
              return false;
            }
            return true;
          }}
        />
      </View>

      {/* 드래그 캡처 오버레이 (WebView 위, 닫기 버튼 아래) */}
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />

      {/* 닫기 — 오버레이보다 위에 렌더되어 자체 터치 처리 */}
      <View style={styles.closeBtn}>
        <IconButton icon={IconClose} onPress={onClose} variant="ghost-inverse" size="small" onImage />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floating: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    borderRadius: Radius['radius-xl'],
    backgroundColor: '#000',
    overflow: 'hidden',
    zIndex: 1000,
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
  closeBtn: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
  },
});
