import React, {useEffect, useState} from 'react';
import {Animated, Pressable, Text, View, StyleSheet} from 'react-native';
import {Dialog} from './Dialog';
import {Button} from '@components/Button';
import {TextInput} from '@components/TextInput';
import {ColorPicker} from '@components/ColorPicker';
import {IconBookTwotone, IconExprolerBookFilled} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import type {AvatarColor} from '@components/Avatar/Avatar';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

// 레시피 북 색상: 브라운·그레이브라운 제외
const COOKBOOK_COLORS: AvatarColor[] = [
  'gray', 'yellow', 'red',
  'orange', 'lime', 'green', 'lightblue', 'purple',
];
// 기본 선택색 (brown이 제외돼 목록의 첫 색을 기본으로)
const DEFAULT_COOKBOOK_PICK: AvatarColor = COOKBOOK_COLORS[0];

export interface CookbookDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (name: string, color: AvatarColor, isOfficial?: boolean, hidden?: boolean) => void;
  /** 편집 대상 (null이면 추가 모드) */
  editTarget?: {name: string; color: AvatarColor; isExplore?: boolean; hidden?: boolean} | null;
  /** 어드민 여부 (true일 때 공식 레시피 북 토글 표시) */
  isAdmin?: boolean;
  /** 공식 레시피 북 토글 초기값 */
  initialOfficial?: boolean;
}

export function CookbookDialog({visible, onClose, onConfirm, editTarget, isAdmin, initialOfficial}: CookbookDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<AvatarColor>(DEFAULT_COOKBOOK_PICK);
  const [isOfficial, setIsOfficial] = useState(false);
  // 토글 표시 여부는 '열릴 때' 캡처해 고정 → 닫힐 때 editTarget이 null로 리셋돼도
  // 토글이 반짝 나타났다 사라지지 않게(닫힘 애니메이션 중 조건 변동 방지).
  // 공식 여부는 '생성' 때만 정함(온/오프는 데이터 이동이라 미지원) → 편집 시엔 토글 숨김.
  const [showOfficialToggle, setShowOfficialToggle] = useState(false);
  // 제목(편집/만들기)도 열릴 때 캡처 → 닫힘 애니메이션 중 editTarget이 null로 리셋돼도 '만들기'로 안 튐.
  const [editMode, setEditMode] = useState(false);
  // 숨김(다른 유저 비공개) — 공식 북 편집 + 어드민일 때만.
  const [hidden, setHidden] = useState(false);
  const [showHiddenToggle, setShowHiddenToggle] = useState(false);
  const s = useThemedStyles(createStyles);
  const colors = useColors();
  const {t} = useTranslation();

  useEffect(() => {
    if (visible) {
      setEditMode(!!editTarget);
      if (editTarget) {
        setName(editTarget.name);
        // 저장된 색이 피커 목록에 없으면(예: 기본색 brown/graybrown 제외됨) 유효한 기본색으로 보정
        // → 편집 시 색이 '선택 안 됨'으로 보이던 문제 방지
        setColor(COOKBOOK_COLORS.includes(editTarget.color) ? editTarget.color : DEFAULT_COOKBOOK_PICK);
        setIsOfficial(!!editTarget.isExplore);
        setShowOfficialToggle(false); // 편집: 공식 토글 숨김 (온/오프 미지원)
        setHidden(!!editTarget.hidden);
        setShowHiddenToggle(!!editTarget.isExplore && !!isAdmin); // 공식 북 + 어드민일 때만 숨김 토글
      } else {
        setName('');
        setColor(initialOfficial ? 'orange' : DEFAULT_COOKBOOK_PICK);
        setIsOfficial(!!initialOfficial);
        setShowOfficialToggle(!!isAdmin); // 추가: 어드민이면 토글 노출(조작 가능)
        setHidden(false);
        setShowHiddenToggle(false);
      }
    }
  }, [visible, editTarget, initialOfficial, isAdmin]);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (trimmed) {
      onConfirm(trimmed, color, isOfficial, hidden);
    }
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      icon={isOfficial ? IconExprolerBookFilled : IconBookTwotone}
      avatarColor={color}
      title={editMode ? t('cookbook.editTitle') : t('cookbook.createTitle')}
      actions={
        <>
          <Button label={t('cookbook.cancel')} variant="soft" onPress={onClose} />
          <Button
            label={t('cookbook.confirm')}
            variant="filled"
            onPress={handleConfirm}
            disabled={!name.trim()}
          />
        </>
      }>
      <View style={s.content}>
        {showOfficialToggle && (
          <Pressable
            style={s.officialRow}
            onPress={() => setIsOfficial(prev => !prev)}>
            <Text style={s.officialLabel}>{t('cookbook.officialLabel')}</Text>
            <View style={[s.toggleTrack, isOfficial && {backgroundColor: colors['custom/orange-var']}]}>
              <Animated.View style={[s.toggleThumb, isOfficial && {transform: [{translateX: 16}]}]} />
            </View>
          </Pressable>
        )}
        {showHiddenToggle && (
          <Pressable style={s.officialRow} onPress={() => setHidden(prev => !prev)}>
            <Text style={s.officialLabel}>{t('cookbook.hiddenLabel')}</Text>
            <View style={[s.toggleTrack, hidden && {backgroundColor: colors['custom/orange-var']}]}>
              <Animated.View style={[s.toggleThumb, hidden && {transform: [{translateX: 16}]}]} />
            </View>
          </Pressable>
        )}
        <TextInput
          label={t('cookbook.nameLabel')}
          placeholder={t('cookbook.namePlaceholder')}
          value={name}
          onChangeText={setName}
        />
        <ColorPicker
          label={t('cookbook.colorLabel')}
          selected={color}
          onSelect={setColor}
          colors={COOKBOOK_COLORS}
          dotSize={20}
        />
      </View>
    </Dialog>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  content: {
    gap: Spacing.md,
  },
  officialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  officialLabel: {
    ...Typography.label.medium,
    fontWeight: Typography.label.medium.fontWeight as '600',
    color: colors['foreground/on-surface'],
    marginTop: FONT_BASELINE_OFFSET,
  },
  toggleTrack: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors['foreground/on-surface-muted'],
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
});
