import React, {useMemo, useState, useEffect, useRef, useCallback} from 'react';
import {StyleSheet, View} from 'react-native';
import {IconClose} from '@components/Icon/IconIndex';
import {IconButton} from '@components/IconButton';
import {Radius} from '@constants/tokens';
import {buildYouTubeEmbedUrl} from '@utils/youtube';

export interface YouTubePlayerModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string | null;
}

const PLAYER_WIDTH = 360;
const PLAYER_HEIGHT = Math.round((PLAYER_WIDTH * 9) / 16);
const MARGIN = 20;
const TABBAR_RESERVE = 100;

/**
 * 웹: PiP-스타일 플로팅 플레이어.
 * - 닫기 버튼은 항상 표시 (배경 바 없음)
 * - 탭바 위에 위치 (zIndex 50)
 * - 비디오 영역 어디든 드래그해서 이동 가능 (iframe은 pointer-events:none이라 가능)
 */
export function YouTubePlayerModal({visible, onClose, videoId}: YouTubePlayerModalProps) {
  const embedUrl = useMemo(() => (videoId ? buildYouTubeEmbedUrl(videoId) : null), [videoId]);

  const [pos, setPos] = useState<{x: number; y: number} | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{startX: number; startY: number; origX: number; origY: number} | null>(null);

  useEffect(() => {
    if (!visible || typeof window === 'undefined') return;
    if (pos) return;
    const x = Math.max(MARGIN, window.innerWidth - PLAYER_WIDTH - MARGIN);
    const y = Math.max(MARGIN, window.innerHeight - PLAYER_HEIGHT - TABBAR_RESERVE);
    setPos({x, y});
  }, [visible, pos]);

  const onPointerDown = useCallback((e: any) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos?.x ?? 0,
      origY: pos?.y ?? 0,
    };
    setDragging(true);
  }, [pos]);

  const onPointerMove = useCallback((e: any) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const maxX = window.innerWidth - PLAYER_WIDTH - MARGIN;
    const maxY = window.innerHeight - PLAYER_HEIGHT - MARGIN;
    const nextX = Math.min(maxX, Math.max(MARGIN, dragRef.current.origX + dx));
    const nextY = Math.min(maxY, Math.max(MARGIN, dragRef.current.origY + dy));
    setPos({x: nextX, y: nextY});
  }, []);

  const onPointerUp = useCallback((e: any) => {
    dragRef.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  if (!embedUrl || !visible) return null;

  return (
    <View
      // @ts-ignore web inline style
      style={{
        position: 'fixed' as any,
        left: pos?.x ?? 0,
        top: pos?.y ?? 0,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        zIndex: 50,
        backgroundColor: '#000',
        borderRadius: Radius['radius-xl'],
        overflow: 'hidden',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      } as any}
      // @ts-ignore web pointer events
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}>
      <View style={styles.iframeWrap} pointerEvents="none">
        {/* @ts-ignore web-only iframe */}
        <iframe
          src={embedUrl}
          style={{border: 'none', width: '100%', height: '100%', display: 'block', pointerEvents: 'none'}}
          allow="accelerated-2d-canvas; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </View>

      <View
        style={styles.closeBtnWrap}
        // @ts-ignore — 닫기 버튼은 드래그 시작 안 되게 propagation 차단
        onPointerDown={(e: any) => e.stopPropagation()}>
        <IconButton
          icon={IconClose}
          onPress={onClose}
          variant="ghost-inverse"
          size="small"
          onImage
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iframeWrap: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeBtnWrap: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
});
