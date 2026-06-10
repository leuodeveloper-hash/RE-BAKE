import React, {useEffect, useState} from 'react';
import {Animated, Pressable, Text, View, StyleSheet} from 'react-native';
import {Dialog} from './Dialog';
import {Button} from '@components/Button';
import {TextInput} from '@components/TextInput';
import {ColorPicker} from '@components/ColorPicker';
import {IconBookTwotone, IconExprolerBookTwotone} from '@components/Icon/IconIndex';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2} from '@contexts/ThemeContext';
import {DEFAULT_COOKBOOK_COLOR} from '@contexts/RecipeContext';
import type {AvatarColor} from '@components/Avatar/Avatar';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

const COOKBOOK_COLORS: AvatarColor[] = [
  'gray', 'greybrown', 'brown', 'yellow', 'red',
  'orange', 'lime', 'green', 'lightblue', 'purple',
];

export interface CookbookDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (name: string, color: AvatarColor, isOfficial?: boolean) => void;
  /** 편집 대상 (null이면 추가 모드) */
  editTarget?: {name: string; color: AvatarColor; isExplore?: boolean} | null;
  /** 어드민 여부 (true일 때 공식 레시피 북 토글 표시) */
  isAdmin?: boolean;
  /** 공식 레시피 북 토글 초기값 */
  initialOfficial?: boolean;
}

export function CookbookDialog({visible, onClose, onConfirm, editTarget, isAdmin, initialOfficial}: CookbookDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<AvatarColor>(DEFAULT_COOKBOOK_COLOR);
  const [isOfficial, setIsOfficial] = useState(false);
  const s = useThemedStylesV2(createStyles);
  const colors = useColorsV2();

  useEffect(() => {
    if (visible) {
      if (editTarget) {
        setName(editTarget.name);
        setColor(editTarget.color);
        setIsOfficial(!!editTarget.isExplore);
      } else {
        setName('');
        setColor(initialOfficial ? 'orange' : DEFAULT_COOKBOOK_COLOR);
        setIsOfficial(!!initialOfficial);
      }
    }
  }, [visible, editTarget, initialOfficial]);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (trimmed) {
      onConfirm(trimmed, color, isOfficial);
    }
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      icon={isOfficial ? IconExprolerBookTwotone : IconBookTwotone}
      avatarColor={color}
      title={editTarget ? '레시피 북 편집' : '레시피 북 만들기'}
      actions={
        <>
          <Button label="취소" variant="soft" onPress={onClose} />
          <Button
            label="확인"
            variant="filled"
            onPress={handleConfirm}
            disabled={!name.trim()}
          />
        </>
      }>
      <View style={s.content}>
        {(isAdmin && !editTarget || editTarget?.isExplore) && (
          <Pressable
            style={[s.officialRow, editTarget?.isExplore && {opacity: 0.5}]}
            onPress={editTarget?.isExplore ? undefined : () => setIsOfficial(prev => !prev)}
            disabled={!!editTarget?.isExplore}>
            <Text style={s.officialLabel}>공식 레시피 북</Text>
            <View style={[s.toggleTrack, isOfficial && {backgroundColor: colors['custom/orange-var']}]}>
              <Animated.View style={[s.toggleThumb, isOfficial && {transform: [{translateX: 16}]}]} />
            </View>
          </Pressable>
        )}
        <TextInput
          label="이름"
          placeholder="예: 제과"
          value={name}
          onChangeText={setName}
        />
        <ColorPicker
          label="컬러"
          selected={color}
          onSelect={setColor}
          colors={COOKBOOK_COLORS}
          dotSize={20}
        />
      </View>
    </Dialog>
  );
}

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
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
