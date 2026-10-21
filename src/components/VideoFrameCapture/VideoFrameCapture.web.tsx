import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {FloatingNavBar, NavPillButton} from '@components/Navigation';
import {Button} from '@components/Button';
import {IconClose} from '@components/Icon/IconIndex';
import {useTranslation} from '@contexts/LanguageContext';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export interface CapturedFrame {uri: string; width: number; height: number; base64?: string | null}

export const formatClock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * 웹 — 영상에서 장면 캡처. 브라우저 video로 장면을 보여주고 막대(range)로 고른 뒤 canvas로 떠서 넘긴다(data URL·base64).
 * 네이티브와 같은 모양·문구(VideoFrameCapture.tsx)
 */
export function VideoFrameCapture({uri, durationMs, onCancel, onCapture}: {
  uri: string;
  durationMs: number;
  onCancel: () => void;
  onCapture: (frame: CapturedFrame) => void;
}) {
  const {t} = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState(durationMs);
  const [time, setTime] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.currentTime = time / 1000;
  }, [time]);

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL('image/jpeg', 0.9);
    onCapture({uri: dataUrl, width: c.width, height: c.height, base64: dataUrl.split(',')[1]});
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      <FloatingNavBar left={<NavPillButton icon={IconClose} onPress={onCancel} />} title={t('videoCapture.title')} />
      <View style={styles.stage}>
        <video
          ref={videoRef}
          src={uri}
          muted
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          onLoadedMetadata={e => { const d = (e.currentTarget as HTMLVideoElement).duration; if (isFinite(d)) setDuration(d * 1000); }}
          style={{width: '100%', height: '100%', objectFit: 'contain'}}
        />
      </View>
      <View style={styles.bottom}>
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatClock(time)}</Text>
          <Text style={styles.time}>{formatClock(duration)}</Text>
        </View>
        <input
          type="range"
          min={0}
          max={Math.max(1, duration)}
          step={50}
          value={time}
          onChange={e => setTime(Number(e.currentTarget.value))}
          style={{width: '100%', accentColor: '#fff'}}
        />
        <Button label={t('videoCapture.capture')} variant="filled" onPress={capture} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {backgroundColor: '#000', zIndex: 100},
  stage: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 64},
  bottom: {paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.md},
  timeRow: {flexDirection: 'row', justifyContent: 'space-between'},
  time: {...Typography.caption.medium, color: 'rgba(255,255,255,0.8)'},
});
