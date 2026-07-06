import React, {useState} from 'react';
import {Image, Pressable, StyleSheet, View} from 'react-native';
import {IconClose} from '@components/Icon/IconIndex';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import type {SemanticColors} from '@constants/tokens';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';

export interface StepPhotosProps {
  /** 사진 URI 배열 */
  photos: string[];
  /**
   * 'view' = 읽기전용 (탭 = 크게 보기)
   * 'edit' = 편집 가능 (탭 = 크게 보기, 롱프레스 = 관리모드 진입 → 삭제 X 표시 / 탭 = 교체)
   */
  mode: 'view' | 'edit';
  /** 정사각 썸네일 한 변 크기 (기본 56). 어떤 비율이든 center-crop 되어 정사각으로 보임. */
  size?: number;
  /** 사진 간 간격 (기본: Spacing.xs) */
  gap?: number;
  /** 상단 패딩 포함 여부 (기본: true) */
  paddingTop?: boolean;
  /** 관리모드에서 삭제(X) 시 호출 */
  onRemove?: (index: number) => void;
  /** 관리모드에서 사진 탭(교체) 시 호출 */
  onReplace?: (index: number) => void;
}

const DEFAULT_SIZE = 56;

/**
 * 요리 과정(스텝) 사진 공통 컴포넌트. 상세/편집/요리모드 뷰·편집에서 동일하게 사용.
 * - 정사각 썸네일 (resizeMode cover → 원본 비율 무관 center-crop)
 * - 탭: 크게 보기(2배 확대 토글)
 * - 롱프레스(edit): 관리모드 토글 → 삭제 버튼(X) 노출 + 탭 시 교체
 */
export function StepPhotos({
  photos,
  mode,
  size = DEFAULT_SIZE,
  gap = Spacing.xs,
  paddingTop = true,
  onRemove,
  onReplace,
}: StepPhotosProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const editable = mode === 'edit';
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [manage, setManage] = useState(false);

  return (
    <Pressable style={[styles.container, {gap}, paddingTop && {paddingTop: Spacing.sm}]}>
      {photos.map((uri, i) => {
        const expanded = expandedIdx === i;
        const side = expanded ? size * 2 : size;
        return (
          <View key={`photo-${i}`} style={styles.wrap}>
            <Pressable
              onPress={() => {
                // 관리모드(롱프레스로 진입)에서 탭 = 교체, 그 외 = 크게 보기 토글
                if (editable && manage) {
                  onReplace?.(i);
                } else {
                  setExpandedIdx(prev => (prev === i ? null : i));
                }
              }}
              onLongPress={editable ? () => setManage(m => !m) : undefined}
              delayLongPress={300}>
              <Image
                source={{uri}}
                style={{width: side, height: side, borderRadius: Radius['radius-sm']}}
                resizeMode="cover"
              />
            </Pressable>
            {editable && manage && onRemove ? (
              <Pressable style={styles.removeButton} onPress={() => onRemove(i)} hitSlop={8}>
                <IconClose width={12} height={12} color={colors['foreground/on-surface-inverse']} />
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </Pressable>
  );
}

const createStyles = (_colors: SemanticColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
