import React, {useState} from 'react';
import {Image, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {IconClose} from '@components/Icon/IconIndex';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import type {SemanticColors} from '@constants/tokens';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import type {StepPhoto} from '../../types/recipe';
import {PhotoCaptionArrow} from './PhotoCaptionArrow';

export interface StepPhotosProps {
  /** 정규화된 사진 배열 ({uri, caption?}) */
  photos: StepPhoto[];
  /**
   * 'view' = 읽기전용 (탭 = 크게 보기)
   * 'edit' = 편집 가능 (탭 = 크게 보기, 롱프레스 = 관리모드 진입 → 삭제 X + 캡션 입력)
   */
  mode: 'view' | 'edit';
  /** 정사각 썸네일 한 변 크기 (기본 56). */
  size?: number;
  /** 사진 간 간격 (기본: Spacing.xs) */
  gap?: number;
  /** 상단 패딩 포함 여부 (기본: true) */
  paddingTop?: boolean;
  /** 관리모드에서 삭제(X) 시 호출 */
  onRemove?: (index: number) => void;
  /** 관리모드에서 사진 탭(교체) 시 호출 */
  onReplace?: (index: number) => void;
  /** 관리모드에서 캡션 확정(blur/제출) 시 호출 */
  onCaptionChange?: (index: number, caption: string) => void;
  /** 캡션 옆 곡선 화살표 표시 여부. 요리모드에서만 true(상세/편집은 화살표 없이 캡션만). 기본 false */
  showArrow?: boolean;
}

const DEFAULT_SIZE = 56;

/**
 * 요리 과정(스텝) 사진 공통 컴포넌트. 상세/편집/요리모드 공용.
 * - 정사각 썸네일 (center-crop), 탭=크게 보기.
 * - 캡션 있으면 사진 옆에 [곡선화살표][캡션(최대2줄)] 표시. 인덱스 짝/홀로 위/아래 교차.
 * - edit + 관리모드(롱프레스): 삭제 X + 캡션 입력칸 활성. blur 시 원상복구(미확정), 제출 시 확정.
 */
export function StepPhotos({
  photos,
  mode,
  size = DEFAULT_SIZE,
  gap = Spacing.xs,
  paddingTop = true,
  onRemove,
  onReplace,
  onCaptionChange,
  showArrow = false,
}: StepPhotosProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const editable = mode === 'edit';
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  // edit 모드는 이미 편집 중이므로 롱프레스 관리모드 없이 항상 캡션 입력칸·삭제(X) 노출.
  // (상세/편집화면: 모드 전환 불필요 → 바로 편집)
  const [manageState, setManageState] = useState(false);
  const manage = editable ? true : manageState;
  const setManage = setManageState;
  // 캡션 편집 임시값: 저장 전 blur하면 버려짐(원상복구)
  const [draftCaption, setDraftCaption] = useState<{idx: number; text: string} | null>(null);

  const varColor = colors['foreground/on-surface-var'];

  return (
    <Pressable style={[styles.container, {gap}, paddingTop && {paddingTop: Spacing.sm}]}>
      {photos.map((photo, i) => {
        const expanded = expandedIdx === i;
        const side = expanded ? size * 2 : size;
        const caption = photo.caption ?? '';
        const editingThis = manage && draftCaption?.idx === i;
        // 짝수=위(화살표 down), 홀수=아래(화살표 up)로 교차
        const arrowDir: 'down' | 'up' = i % 2 === 0 ? 'down' : 'up';
        const showCaptionRow = editable ? (manage) : !!caption.trim();

        return (
          <View key={`photo-${i}`} style={styles.item}>
            <View style={styles.wrap}>
              <Pressable
                onPress={() => {
                  if (editable && manage) {
                    onReplace?.(i);
                  } else {
                    setExpandedIdx(prev => (prev === i ? null : i));
                  }
                }}
                onLongPress={editable ? () => setManage(m => !m) : undefined}
                delayLongPress={300}>
                <Image
                  source={{uri: photo.uri}}
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

            {/* 캡션 + 화살표: [화살표][텍스트] 가로 배치 */}
            {showCaptionRow && (
              <View style={[styles.captionRow, arrowDir === 'up' && styles.captionRowUp]}>
                {showArrow && <PhotoCaptionArrow direction={arrowDir} color={varColor} size={24} />}
                {editingThis || (editable && manage) ? (
                  <TextInput
                    style={[styles.captionText, styles.captionInput]}
                    value={editingThis ? draftCaption!.text : caption}
                    placeholder="캡션"
                    placeholderTextColor={colors['foreground/on-surface-muted']}
                    multiline
                    maxLength={60}
                    autoFocus={editingThis}
                    onFocus={() => setDraftCaption({idx: i, text: caption})}
                    onChangeText={(v) => setDraftCaption({idx: i, text: v})}
                    // blur(다른 곳 탭)에도 저장 — 완료 안 눌러도 입력값이 반영되게(기존엔 버려짐)
                    onBlur={() => {
                      if (draftCaption?.idx === i) onCaptionChange?.(i, draftCaption.text.trim());
                      setDraftCaption(null);
                    }}
                    onSubmitEditing={() => {
                      if (draftCaption?.idx === i) onCaptionChange?.(i, draftCaption.text.trim());
                      setDraftCaption(null);
                    }}
                    returnKeyType="done"
                    blurOnSubmit
                  />
                ) : (
                  <Pressable
                    style={styles.captionTextWrap}
                    onPress={editable && manage ? () => setDraftCaption({idx: i, text: caption}) : undefined}>
                    <Text style={styles.captionText} numberOfLines={2}>{caption}</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        );
      })}
    </Pressable>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    alignItems: 'center',
  },
  wrap: {
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 2,
    marginTop: 4,
    maxWidth: 160,
  },
  captionRowUp: {
    alignItems: 'flex-end',
  },
  captionTextWrap: {
    flexShrink: 1,
  },
  captionText: {
    fontFamily: Typography.label.small.fontFamily,
    fontSize: Typography.label.small.fontSize,
    fontWeight: Typography.label.small.fontWeight as '500',
    lineHeight: Typography.label.small.lineHeight,
    color: colors['foreground/on-surface-var'],
    flexShrink: 1,
  },
  captionInput: {
    flex: 1,
    padding: 0,
    minWidth: 80,
  },
});
