import React, {useCallback, useRef} from 'react';
import {Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {FloatingNavBar, navPillStyle, NavPillButton} from '@components/Navigation';
import {GlassContainer} from '@components/Container';
import {IconButton} from '@components/IconButton';
import {IconClose, IconPhoto, IconTrash} from '@components/Icon/IconIndex';
import {ForceDarkTheme} from '@contexts/ThemeContext';
import {Typography} from '@constants/typography';

const MAX_CONTENT_WIDTH = 800;

export interface PhotoViewerProps {
  /** 표시할 사진 URI 목록 */
  photos: {uri: string}[];
  /** 현재 보고 있는 인덱스. null이면 닫힘 */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** 편집 가능하면 우측 상단에 교체·삭제 버튼 (없으면 읽기 전용) */
  onReplace?: () => void;
  onDelete?: () => void;
}

/**
 * 사진 전체보기 뷰어. 상세·요리모드 공용.
 *
 * - 배경 탭 = 닫기, 이미지 탭 = 다음 사진, 좌우 스와이프 = 이전/다음
 * - 배경이 늘 검정이라 하위 컴포넌트를 ForceDarkTheme으로 고정한다
 *   (라이트 테마 토큰이 검정 배경에 묻힌다)
 * - 네이티브 Modal은 별도 뷰 계층이라 앱 루트의 SafeAreaProvider가 닿지 않는다.
 *   없으면 FloatingNavBar의 SafeAreaView가 inset을 0으로 읽어 상단바가 상태바와 겹친다.
 */
export function PhotoViewer({
  photos,
  index,
  onIndexChange,
  onClose,
  onReplace,
  onDelete,
}: PhotoViewerProps) {
  const {width: containerWidth} = useWindowDimensions();
  const swipeXRef = useRef(0);

  const total = photos.length;
  const canEdit = !!onReplace || !!onDelete;

  const goNext = useCallback(() => {
    if (index === null || total <= 1) return;
    onIndexChange((index + 1) % total);
  }, [index, total, onIndexChange]);

  const goPrev = useCallback(() => {
    if (index === null || total <= 1) return;
    onIndexChange((index - 1 + total) % total);
  }, [index, total, onIndexChange]);

  if (index === null) return null;
  const uri = photos[index]?.uri;
  if (!uri) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaProvider>
        <ForceDarkTheme>
          <View style={styles.root}>
            {/* 배경 탭 = 닫기 */}
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            {/* Pressable에 높이를 줘야 안쪽 Image의 height:'100%'가 기준을 갖는다
                (auto 높이면 퍼센트가 0으로 계산돼 이미지가 안 보인다) */}
            <Pressable
              onPress={total > 1 ? undefined : goNext}
              style={styles.imageFrame}
              onStartShouldSetResponder={() => total > 1}
              onResponderGrant={e => { swipeXRef.current = e.nativeEvent.pageX; }}
              onResponderRelease={e => {
                const dx = e.nativeEvent.pageX - swipeXRef.current;
                if (Math.abs(dx) < 40) { goNext(); return; } // 탭
                if (dx < 0) goNext(); else goPrev();
              }}>
              <Image
                source={{uri}}
                style={[styles.image, {width: Math.min(Math.max(containerWidth * 0.92, 280), MAX_CONTENT_WIDTH)}]}
                resizeMode="contain"
              />
            </Pressable>
            <FloatingNavBar
              tintColor="#000000"
              left={<NavPillButton icon={IconClose} onPress={onClose} />}
              center={total > 1 ? (
                <Text style={styles.counter}>{index + 1} / {total}</Text>
              ) : undefined}
              right={canEdit ? (
                <GlassContainer contentStyle={navPillStyle}>
                  {onReplace && (
                    <IconButton icon={IconPhoto} onPress={onReplace} variant="ghost-primary" size="medium" />
                  )}
                  {onDelete && (
                    <IconButton icon={IconTrash} onPress={onDelete} variant="ghost-primary" size="medium" />
                  )}
                </GlassContainer>
              ) : undefined}
            />
          </View>
        </ForceDarkTheme>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFrame: {
    height: '74%',
    justifyContent: 'center',
  },
  image: {
    height: '100%',
  },
  counter: {
    color: '#FFFFFF',
    fontFamily: Typography.label.small.fontFamily,
    fontSize: Typography.label.small.fontSize,
    fontWeight: Typography.label.small.fontWeight as '500',
  },
});
