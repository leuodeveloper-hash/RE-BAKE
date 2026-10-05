import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {Dialog} from './Dialog';
import {Button} from '@components/Button';
import {TextInput} from '@components/TextInput';
import type {AvatarColor} from '@components/Avatar/Avatar';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

export interface NumberValueDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  icon: React.FC<SvgProps>;
  avatarColor?: AvatarColor;
  /** 저장된 값('27°C', '50g') — 숫자만 꺼내 칸에 넣는다 */
  value?: string;
  /** 숫자 뒤에 붙는 단위(°C, g) */
  suffix: string;
  onConfirm: (formatted: string) => void;
  /** 값 지우기 — 값이 있을 때 [삭제] 버튼으로(비우고 확인하는 방식은 쓰지 않는다) */
  onDelete?: () => void;
}

/**
 * 숫자 하나 + 단위 입력 — 반죽 온도(°C), 분할 용량(g)처럼 한 칸짜리 값.
 * 시간·분량처럼 형식이 정해진 값과 같은 모양(위쪽 팝업, 확인·취소).
 */
export function NumberValueDialog({visible, onClose, title, icon, avatarColor = 'lime', value, suffix, onConfirm, onDelete}: NumberValueDialogProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const [num, setNum] = useState('');
  useEffect(() => {
    if (visible) setNum(value?.match(/-?\d+(?:\.\d+)?/)?.[0] ?? '');
  }, [visible, value]);
  const n = num.trim();
  const confirm = () => {
    if (!n) return;
    onConfirm(`${n}${suffix}`);
    onClose();
  };
  return (
    <Dialog
      // 입력 팝업 — 통합 검색처럼 위쪽에(키보드에 안 가리게)
      position="top"
      visible={visible}
      onClose={onClose}
      icon={icon}
      avatarColor={avatarColor}
      title={title}
      actions={<>
        {/* 값이 있으면 왼쪽은 삭제, 없으면 취소 */}
        {value && onDelete ? (
          <Button label={t('common.delete')} variant="soft" destructive onPress={() => { onDelete(); onClose(); }} />
        ) : (
          <Button label={t('time.cancel')} variant="soft" onPress={onClose} />
        )}
        <Button label={t('time.confirm')} variant="filled" onPress={confirm} disabled={!n} />
      </>}
    >
      <View style={styles.row}>
        <View style={styles.inputWrap}>
          <TextInput value={num} onChangeText={setNum} keyboardType="decimal-pad" placeholder="0" maxLength={6} selectTextOnFocus autoFocus />
        </View>
        <Text style={styles.suffix}>{suffix}</Text>
      </View>
    </Dialog>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inputWrap: {
    flex: 1,
  },
  suffix: {
    ...Typography.title.medium,
    color: colors['foreground/on-surface-muted'],
    marginTop: FONT_BASELINE_OFFSET,
  },
});
