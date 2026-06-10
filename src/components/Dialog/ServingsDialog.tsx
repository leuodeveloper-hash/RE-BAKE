import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Dialog} from './Dialog';
import {Button} from '@components/Button';
import {Tabs} from '@components/Tabs';
import {TextInput} from '@components/TextInput';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {IconUsersRoundTwotone} from '@components/Icon/IconIndex';

export interface ServingsDialogProps {
  visible: boolean;
  onClose: () => void;
  value?: string;
  onConfirm: (formatted: string) => void;
}

const UNIT_OPTIONS = [
  {id: 'serving', label: '인분'},
  {id: 'piece', label: '개'},
];

const UNIT_SUFFIX: Record<string, string> = {
  serving: '인분',
  piece: '개',
};

/** "3호 4개" → {spec: "3호", amount: "4", unit: "piece"} */
function parseServings(value?: string): {spec: string; amount: string; unit: string} {
  if (!value) return {spec: '', amount: '', unit: 'piece'};

  // "3호 4개", "1호 1개" 등 규격 + 수량
  const specPieceMatch = value.match(/(.+?)\s+(\d+)\s*개/);
  if (specPieceMatch) return {spec: specPieceMatch[1], amount: specPieceMatch[2], unit: 'piece'};

  // "3인분"
  const servingMatch = value.match(/(\d+)\s*인분/);
  if (servingMatch) return {spec: '', amount: servingMatch[1], unit: 'serving'};

  // "12개"
  const pieceMatch = value.match(/(\d+)\s*개/);
  if (pieceMatch) return {spec: '', amount: pieceMatch[1], unit: 'piece'};

  // 숫자만
  const numMatch = value.match(/(\d+)/);
  if (numMatch) return {spec: '', amount: numMatch[1], unit: 'piece'};

  return {spec: '', amount: '', unit: 'piece'};
}

export function ServingsDialog({visible, onClose, value, onConfirm}: ServingsDialogProps) {
  const styles = useThemedStylesV2(createStyles);
  const [spec, setSpec] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('piece');

  useEffect(() => {
    if (visible) {
      const parsed = parseServings(value);
      setSpec(parsed.spec);
      setAmount(parsed.amount);
      setUnit(parsed.unit);
    }
  }, [visible, value]);

  const handleConfirm = () => {
    const num = parseInt(amount, 10);
    if (num > 0) {
      const specPart = spec.trim();
      const formatted = specPart
        ? `${specPart} ${num}${UNIT_SUFFIX[unit]}`
        : `${num}${UNIT_SUFFIX[unit]}`;
      onConfirm(formatted);
    } else {
      onConfirm('');
    }
    onClose();
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      icon={IconUsersRoundTwotone}
      avatarColor="orange"
      title="분량 설정"
      actions={<>
        <Button label="취소" variant="soft" onPress={onClose} />
        <Button label="확인" variant="filled" onPress={handleConfirm} />
      </>}
    >
      <View style={styles.content}>
        <Tabs
          tabs={UNIT_OPTIONS}
          selectedId={unit}
          onSelect={setUnit}
          fullWidth
        />
        <View style={styles.row}>
          <View style={styles.inputWrap}>
            <TextInput
              label="규격"
              value={spec}
              onChangeText={setSpec}
              placeholder="0"
              maxLength={10}
              selectTextOnFocus
              clearable
            />
          </View>
          <Text style={styles.separator}>/</Text>
          <View style={styles.inputWrap}>
            <TextInput
              label="수량"
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              placeholder="0"
              maxLength={4}
              selectTextOnFocus
              clearable
            />
          </View>
        </View>
      </View>
    </Dialog>
  );
}

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  content: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  inputWrap: {
    flex: 1,
  },
  separator: {
    ...Typography.body.medium,
    color: colors['foreground/on-surface-muted'],
    marginBottom: Spacing.sm,
    marginTop: FONT_BASELINE_OFFSET,
  },
});
