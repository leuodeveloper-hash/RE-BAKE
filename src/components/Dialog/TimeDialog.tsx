import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Dialog} from './Dialog';
import {NavPillButton} from '@components/Navigation/NavPillButton';
import {IconScanText} from '@components/Icon/IconIndex';
import {Button} from '@components/Button';
import {TextInput} from '@components/TextInput';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {IconClockTwotone} from '@components/Icon/IconIndex';
import {useTranslation} from '@contexts/LanguageContext';

export interface TimeDialogProps {
  /** 사진에서 읽어 채우기 — 주면 헤더 오른쪽에 인식 버튼 */
  onScan?: () => void;
  visible: boolean;
  onClose: () => void;
  value?: string;
  onConfirm: (formatted: string) => void;
  /** 비우고 확인하면 지운다 — 주면 빈 값도 받는다(과정 타이머 끄기 등) */
  onDelete?: () => void;
  /** 제목 바꾸기 — 기본 '시간' */
  title?: string;
}

/** "1시간 30분" → {hours: 1, minutes: 30} */
export function parseTime(value?: string): {hours: string; minutes: string} {
  if (!value) return {hours: '', minutes: ''};
  const hourMatch = value.match(/(\d+)\s*시간/);
  const minMatch = value.match(/(\d+)\s*분/);
  return {
    hours: hourMatch ? hourMatch[1] : '',
    minutes: minMatch ? minMatch[1] : '',
  };
}

function formatTime(hours: string, minutes: string): string {
  const h = parseInt(hours, 10) || 0;
  const m = parseInt(minutes, 10) || 0;
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  if (m > 0) return `${m}분`;
  return '';
}

export function TimeDialog({visible, onClose, value, onConfirm, onScan, onDelete, title}: TimeDialogProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');

  useEffect(() => {
    if (visible) {
      const parsed = parseTime(value);
      setHours(parsed.hours);
      setMinutes(parsed.minutes);
    }
  }, [visible, value]);

  const handleConfirm = () => {
    const formatted = formatTime(hours, minutes);
    if (formatted) onConfirm(formatted);
    else onDelete?.();
    onClose();
  };

  return (
    <Dialog
      // 입력 팝업 — 통합 검색처럼 위쪽에(키보드에 안 가리게)
      position="top"
      // 사진에서 읽기 — 헤더 오른쪽(누르면 사진·영역을 골라 이 칸을 채운다)
      headerRight={onScan ? <NavPillButton icon={IconScanText} onPress={onScan} /> : undefined}
      visible={visible}
      onClose={onClose}
      icon={IconClockTwotone}
      avatarColor="lime"
      title={title ?? t('time.dialogTitle')}
      actions={<>
        <Button label={t('time.cancel')} variant="soft" onPress={onClose} />
        <Button label={t('time.confirm')} variant="filled" onPress={handleConfirm} />
      </>}
    >
      <View style={styles.row}>
        <View style={styles.inputWrap}>
          <TextInput
            label={t('time.hoursLabel')}
            value={hours}
            onChangeText={setHours}
            keyboardType="number-pad"
            placeholder="0"
            maxLength={2}
            selectTextOnFocus
          />
        </View>
        <Text style={styles.colon}>:</Text>
        <View style={styles.inputWrap}>
          <TextInput
            label={t('time.minutesLabel')}
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="number-pad"
            placeholder="0"
            maxLength={2}
            selectTextOnFocus
          />
        </View>
      </View>
    </Dialog>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  inputWrap: {
    flex: 1,
  },
  colon: {
    ...Typography.title.large,
    color: colors['foreground/on-surface-muted'],
    marginBottom: Spacing.smd,
    marginTop: FONT_BASELINE_OFFSET,
  },
});
