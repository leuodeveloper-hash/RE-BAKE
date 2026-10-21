import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, PanResponder, StyleSheet, Text, View} from 'react-native';
import {Image as ExpoImage} from 'expo-image';
import * as VideoThumbnails from 'expo-video-thumbnails';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {FloatingNavBar, NavPillButton} from '@components/Navigation';
import {Button} from '@components/Button';
import {IconClose} from '@components/Icon/IconIndex';
import {useTranslation} from '@contexts/LanguageContext';
import {triggerHaptic} from '@utils/haptics';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export interface CapturedFrame {uri: string; width: number; height: number; base64?: string | null}

/** 0:12 처럼 */
export const formatClock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * 영상에서 장면 캡처 — 아래 막대를 밀어 장면을 고르고 '이 장면 넣기'. 고른 장면은 사진처럼 넘어간다.
 * 화면 위에 덮는 판(Modal 아님 — 사진첩 Modal 안에서 또 Modal을 띄우면 아이폰이 무시한다).
 * 장면은 기기에서 바로 뽑는다(expo-video-thumbnails). 웹은 .web.tsx(video + canvas)
 */
export function VideoFrameCapture({uri, durationMs, onCancel, onCapture}: {
  uri: string;
  durationMs: number;
  onCancel: () => void;
  onCapture: (frame: CapturedFrame) => void;
}) {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const [time, setTime] = useState(0);
  const [frame, setFrame] = useState<CapturedFrame | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackW, setTrackW] = useState(0);
  const trackWRef = useRef(0);
  // 밀고 있는 동안은 마지막 요청만 — 앞 요청이 늦게 와서 장면이 되돌아가지 않게
  const reqId = useRef(0);
  const inFlight = useRef(false);
  const pending = useRef<number | null>(null);

  const grab = useCallback(async (ms: number) => {
    if (inFlight.current) { pending.current = ms; return; }
    inFlight.current = true;
    const id = ++reqId.current;
    try {
      const r = await VideoThumbnails.getThumbnailAsync(uri, {time: Math.round(ms), quality: 0.9});
      if (id === reqId.current || pending.current == null) setFrame({uri: r.uri, width: r.width, height: r.height});
    } catch {
      // 끝 무렵 등 못 뽑는 자리 — 앞 장면을 그대로 둔다
    } finally {
      inFlight.current = false;
      setLoading(false);
      if (pending.current != null) { const next = pending.current; pending.current = null; grab(next); }
    }
  }, [uri]);

  useEffect(() => { grab(0); }, [grab]);

  const seekTo = (x: number) => {
    const w = trackWRef.current;
    if (!w) return;
    const ms = Math.min(1, Math.max(0, x / w)) * durationMs;
    setTime(ms);
    grab(ms);
  };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => { triggerHaptic('selection'); seekTo(e.nativeEvent.locationX); },
    onPanResponderMove: e => seekTo(e.nativeEvent.locationX),
  })).current;

  const ratio = durationMs > 0 ? time / durationMs : 0;

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      <FloatingNavBar left={<NavPillButton icon={IconClose} onPress={onCancel} />} title={t('videoCapture.title')} />
      <View style={styles.stage}>
        {frame ? <ExpoImage source={{uri: frame.uri}} style={StyleSheet.absoluteFill} contentFit="contain" /> : null}
        {loading ? <ActivityIndicator color="#fff" /> : null}
      </View>
      <View style={[styles.bottom, {paddingBottom: insets.bottom + Spacing.sm}]}>
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatClock(time)}</Text>
          <Text style={styles.time}>{formatClock(durationMs)}</Text>
        </View>
        {/* 장면 막대 — 밀거나 눌러 장면을 고른다 */}
        <View
          style={styles.track}
          onLayout={e => { trackWRef.current = e.nativeEvent.layout.width; setTrackW(e.nativeEvent.layout.width); }}
          {...pan.panHandlers}>
          <View style={styles.bar} />
          <View style={[styles.fill, {width: ratio * trackW}]} />
          <View style={[styles.handle, {left: ratio * trackW - HANDLE / 2}]} />
        </View>
        <Button
          label={t('videoCapture.capture')}
          variant="filled"
          disabled={!frame}
          onPress={() => frame && onCapture(frame)}
        />
      </View>
    </View>
  );
}

const HANDLE = 22;
const styles = StyleSheet.create({
  // 사진 뷰어·영역 선택과 같은 검은 바탕
  root: {backgroundColor: '#000', zIndex: 100},
  stage: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  bottom: {paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.md},
  timeRow: {flexDirection: 'row', justifyContent: 'space-between'},
  time: {...Typography.caption.medium, color: 'rgba(255,255,255,0.8)', fontVariant: ['tabular-nums']},
  track: {height: 32, justifyContent: 'center'},
  bar: {height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)'},
  fill: {position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: '#fff'},
  handle: {position: 'absolute', width: HANDLE, height: HANDLE, borderRadius: HANDLE / 2, backgroundColor: '#fff', top: (32 - HANDLE) / 2, boxShadow: '0px 1px 4px rgba(0,0,0,0.4)'},
});
