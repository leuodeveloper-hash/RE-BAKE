import React, {useCallback, useEffect, useState} from 'react';
import {LayoutChangeEvent, Modal, StyleSheet, View} from 'react-native';
import {GestureHandlerRootView, Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {useAnimatedStyle, useSharedValue} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Image} from 'expo-image';
import {ImageManipulator, SaveFormat} from 'expo-image-manipulator';
import {Button} from '@components/Button';
import {BottomActionBar} from '@components/BottomActionBar';
import {Spacing} from '@constants/spacing';

export interface OcrCropModalProps {
  visible: boolean;
  /** 크롭 대상 이미지 URI */
  imageUri: string | null;
  /** 원본 이미지 픽셀 크기 (ImagePicker asset의 width/height) */
  imageWidth: number;
  imageHeight: number;
  onCancel: () => void;
  /** 크롭 완료 → 잘라낸 이미지 URI 전달 */
  onConfirm: (croppedUri: string) => void;
}

/** 크롭 박스 최소 크기 (화면 pt) */
const MIN_BOX = 56;
/** 모서리 핸들 시각 크기 */
const HANDLE = 28;

/** contain 방식으로 컨테이너 안에 letterbox 배치된 이미지 rect 계산 */
function computeDisplayRect(cw: number, ch: number, iw: number, ih: number) {
  if (!cw || !ch || !iw || !ih) return {x: 0, y: 0, w: 0, h: 0};
  const imgAspect = iw / ih;
  const containerAspect = cw / ch;
  let w: number;
  let h: number;
  if (imgAspect > containerAspect) {
    w = cw;
    h = cw / imgAspect;
  } else {
    h = ch;
    w = ch * imgAspect;
  }
  return {x: (cw - w) / 2, y: (ch - h) / 2, w, h};
}

function clamp(v: number, lo: number, hi: number): number {
  'worklet';
  return Math.min(Math.max(v, lo), hi);
}

/**
 * 촬영/선택한 이미지에서 인식할 영역을 자유롭게 지정하는 크롭 모달.
 * 조절 가능한 박스(본체 드래그 + 네 모서리 리사이즈) → 지정 영역만 잘라 OCR로 전달.
 */
export function OcrCropModal({
  visible,
  imageUri,
  imageWidth,
  imageHeight,
  onCancel,
  onConfirm,
}: OcrCropModalProps) {
  const [container, setContainer] = useState({w: 0, h: 0});
  const [processing, setProcessing] = useState(false);

  // 표시 영역(letterbox) rect
  const disp = computeDisplayRect(container.w, container.h, imageWidth, imageHeight);

  // 크롭 박스 (컨테이너 좌표) — 애니메이션 shared values
  const bx = useSharedValue(0);
  const by = useSharedValue(0);
  const bw = useSharedValue(0);
  const bh = useSharedValue(0);
  // 표시영역 경계 (worklet 클램프용)
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const dw = useSharedValue(0);
  const dh = useSharedValue(0);
  // 제스처 시작 스냅샷
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const sw = useSharedValue(0);
  const sh = useSharedValue(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    setContainer({w: width, h: height});
  }, []);

  // 표시영역이 정해지면 박스를 안쪽 여백 12%로 초기화
  useEffect(() => {
    if (!disp.w || !disp.h) return;
    dx.value = disp.x;
    dy.value = disp.y;
    dw.value = disp.w;
    dh.value = disp.h;
    const insetX = disp.w * 0.12;
    const insetY = disp.h * 0.12;
    bx.value = disp.x + insetX;
    by.value = disp.y + insetY;
    bw.value = disp.w - insetX * 2;
    bh.value = disp.h - insetY * 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disp.x, disp.y, disp.w, disp.h]);

  // 본체 이동
  const bodyPan = Gesture.Pan()
    .onStart(() => {
      sx.value = bx.value;
      sy.value = by.value;
    })
    .onUpdate(e => {
      bx.value = clamp(sx.value + e.translationX, dx.value, dx.value + dw.value - bw.value);
      by.value = clamp(sy.value + e.translationY, dy.value, dy.value + dh.value - bh.value);
    });

  // 모서리 리사이즈 제스처 생성기 (corner: 어떤 모서리를 잡았는지)
  const makeCorner = (corner: 'tl' | 'tr' | 'bl' | 'br') =>
    Gesture.Pan()
      .onStart(() => {
        sx.value = bx.value;
        sy.value = by.value;
        sw.value = bw.value;
        sh.value = bh.value;
      })
      .onUpdate(e => {
        const left = sx.value;
        const top = sy.value;
        const right = sx.value + sw.value;
        const bottom = sy.value + sh.value;
        if (corner === 'tl' || corner === 'bl') {
          // 왼쪽 엣지 이동, 오른쪽 고정
          const nx = clamp(left + e.translationX, dx.value, right - MIN_BOX);
          bx.value = nx;
          bw.value = right - nx;
        } else {
          // 오른쪽 엣지 이동, 왼쪽 고정
          const nr = clamp(right + e.translationX, left + MIN_BOX, dx.value + dw.value);
          bw.value = nr - left;
        }
        if (corner === 'tl' || corner === 'tr') {
          // 위쪽 엣지 이동, 아래 고정
          const ny = clamp(top + e.translationY, dy.value, bottom - MIN_BOX);
          by.value = ny;
          bh.value = bottom - ny;
        } else {
          // 아래쪽 엣지 이동, 위 고정
          const nb = clamp(bottom + e.translationY, top + MIN_BOX, dy.value + dh.value);
          bh.value = nb - top;
        }
      });

  const boxStyle = useAnimatedStyle(() => ({
    left: bx.value,
    top: by.value,
    width: bw.value,
    height: bh.value,
  }));
  const dimTop = useAnimatedStyle(() => ({
    left: dx.value,
    top: dy.value,
    width: dw.value,
    height: Math.max(0, by.value - dy.value),
  }));
  const dimBottom = useAnimatedStyle(() => ({
    left: dx.value,
    top: by.value + bh.value,
    width: dw.value,
    height: Math.max(0, dy.value + dh.value - (by.value + bh.value)),
  }));
  const dimLeft = useAnimatedStyle(() => ({
    left: dx.value,
    top: by.value,
    width: Math.max(0, bx.value - dx.value),
    height: bh.value,
  }));
  const dimRight = useAnimatedStyle(() => ({
    left: bx.value + bw.value,
    top: by.value,
    width: Math.max(0, dx.value + dw.value - (bx.value + bw.value)),
    height: bh.value,
  }));

  const handleConfirm = useCallback(async () => {
    if (!imageUri || processing) return;
    const scaleX = disp.w ? imageWidth / disp.w : 1;
    const scaleY = disp.h ? imageHeight / disp.h : 1;
    const relX = bx.value - disp.x;
    const relY = by.value - disp.y;
    const originX = Math.round(clamp(relX * scaleX, 0, imageWidth));
    const originY = Math.round(clamp(relY * scaleY, 0, imageHeight));
    const width = Math.round(clamp(bw.value * scaleX, 1, imageWidth - originX));
    const height = Math.round(clamp(bh.value * scaleY, 1, imageHeight - originY));
    setProcessing(true);
    try {
      const ref = await ImageManipulator.manipulate(imageUri)
        .crop({originX, originY, width, height})
        .renderAsync();
      const result = await ref.saveAsync({compress: 0.95, format: SaveFormat.JPEG});
      onConfirm(result.uri);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('crop failed', err);
      // 크롭 실패 시 원본 그대로 넘겨 인식 시도
      onConfirm(imageUri);
    } finally {
      setProcessing(false);
    }
  }, [imageUri, processing, disp.w, disp.h, disp.x, disp.y, imageWidth, imageHeight, bx, by, bw, bh, onConfirm]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onCancel}>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.stage} onLayout={onLayout}>
            {imageUri && (
              <Image
                source={{uri: imageUri}}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            )}
            {/* 바깥 어둠 처리 (박스 기준 4방향) */}
            <Animated.View pointerEvents="none" style={[styles.dim, dimTop]} />
            <Animated.View pointerEvents="none" style={[styles.dim, dimBottom]} />
            <Animated.View pointerEvents="none" style={[styles.dim, dimLeft]} />
            <Animated.View pointerEvents="none" style={[styles.dim, dimRight]} />
            {/* 크롭 박스 */}
            <GestureDetector gesture={bodyPan}>
              <Animated.View style={[styles.box, boxStyle]}>
                <CornerHandle corner="tl" gesture={makeCorner('tl')} />
                <CornerHandle corner="tr" gesture={makeCorner('tr')} />
                <CornerHandle corner="bl" gesture={makeCorner('bl')} />
                <CornerHandle corner="br" gesture={makeCorner('br')} />
              </Animated.View>
            </GestureDetector>
          </View>
          <BottomActionBar background="#000000">
            <View style={styles.barBtn}>
              <Button label="취소" variant="ghost" onPress={onCancel} disabled={processing} />
            </View>
            <View style={styles.barBtn}>
              <Button
                label="이 영역 인식"
                variant="filled"
                onPress={handleConfirm}
                loading={processing}
              />
            </View>
          </BottomActionBar>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

function CornerHandle({
  corner,
  gesture,
}: {
  corner: 'tl' | 'tr' | 'bl' | 'br';
  gesture: ReturnType<typeof Gesture.Pan>;
}) {
  const pos: any = {position: 'absolute'};
  if (corner === 'tl' || corner === 'bl') pos.left = -HANDLE / 2;
  if (corner === 'tr' || corner === 'br') pos.right = -HANDLE / 2;
  if (corner === 'tl' || corner === 'tr') pos.top = -HANDLE / 2;
  if (corner === 'bl' || corner === 'br') pos.bottom = -HANDLE / 2;
  const mark = [
    styles.handleMark,
    corner === 'tl' && styles.markTL,
    corner === 'tr' && styles.markTR,
    corner === 'bl' && styles.markBL,
    corner === 'br' && styles.markBR,
  ];
  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.handleHit, pos]}>
        <View style={mark} />
      </View>
    </GestureDetector>
  );
}

const BORDER = '#FFFFFF';

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#000'},
  safe: {flex: 1, backgroundColor: '#000'},
  stage: {flex: 1, overflow: 'hidden'},
  dim: {position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)'},
  box: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: 'transparent',
  },
  handleHit: {
    width: HANDLE,
    height: HANDLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleMark: {
    width: HANDLE,
    height: HANDLE,
    borderColor: BORDER,
  },
  markTL: {borderLeftWidth: 3, borderTopWidth: 3},
  markTR: {borderRightWidth: 3, borderTopWidth: 3},
  markBL: {borderLeftWidth: 3, borderBottomWidth: 3},
  markBR: {borderRightWidth: 3, borderBottomWidth: 3},
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smd,
    gap: Spacing.sm,
    backgroundColor: '#000',
  },
  barBtn: {flex: 1},
});
