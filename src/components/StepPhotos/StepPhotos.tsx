import React, {useState} from 'react';
import {Image, Pressable, StyleSheet, View} from 'react-native';
import {IconClose} from '@components/Icon/IconIndex';
import {Radius, Spacing} from '@constants/tokens';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2} from '@contexts/ThemeContext';

export interface StepPhotosProps {
  /** 사진 URI 배열 */
  photos: string[];
  /** 'view' = 누르면 확대, 'edit' = 삭제/교체 가능 */
  mode: 'view' | 'edit';
  /** 썸네일 기본 크기 (기본: view={48,32}, edit={64,64}) */
  thumbSize?: {width: number; height: number};
  /** 사진 간 간격 (기본: Spacing.xs) */
  gap?: number;
  /** 상단 패딩 포함 여부 (기본: true) */
  paddingTop?: boolean;
  /** 외부에서 확대 상태 제어 (제어 모드) */
  expanded?: boolean;
  /** 확대 토글 시 호출 (제어 모드) */
  onToggleExpand?: () => void;
  /** edit 모드에서 삭제 시 호출 */
  onRemove?: (index: number) => void;
  /** edit 모드에서 사진 누르면 호출 (교체용) */
  onReplace?: (index: number) => void;
}

const DEFAULT_VIEW_SIZE = {width: 48, height: 32};
const DEFAULT_EDIT_SIZE = {width: 64, height: 64};

export function StepPhotos({
  photos,
  mode,
  thumbSize,
  gap = Spacing.xs,
  paddingTop = true,
  expanded: controlledExpanded,
  onToggleExpand,
  onRemove,
  onReplace,
}: StepPhotosProps) {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();
  const [internalExpanded, setInternalExpanded] = useState(false);

  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const isView = mode === 'view';
  const size = thumbSize ?? (isView ? DEFAULT_VIEW_SIZE : DEFAULT_EDIT_SIZE);
  const expandedSize = {width: size.width * 2, height: size.height * 2};

  const thumbStyle = {
    width: expanded && isView ? expandedSize.width : size.width,
    height: expanded && isView ? expandedSize.height : size.height,
    borderRadius: Radius['radius-sm'],
  };

  const handleToggle = () => {
    if (isControlled) {
      onToggleExpand?.();
    } else {
      setInternalExpanded(prev => !prev);
    }
  };

  return (
    <Pressable
      style={[styles.container, {gap}, paddingTop && {paddingTop: Spacing.sm}]}
      onPress={isView ? handleToggle : undefined}
    >
      {photos.map((uri, i) => {
        const Wrapper = !isView && onReplace ? Pressable : View;
        return (
          <View key={`photo-${i}`} style={styles.wrap}>
            <Wrapper onPress={!isView && onReplace ? () => onReplace(i) : undefined}>
              <Image source={{uri}} style={thumbStyle} resizeMode="cover" />
            </Wrapper>
            {!isView && onRemove && (
              <Pressable style={styles.removeButton} onPress={() => onRemove(i)}>
                <IconClose width={12} height={12} color={colors['foreground/on-surface-inverse']} />
              </Pressable>
            )}
          </View>
        );
      })}
    </Pressable>
  );
}

const createStyles = (_colors: SemanticColorsV2) => StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  wrap: {
    position: 'relative' as const,
  },
  removeButton: {
    position: 'absolute' as const,
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});
