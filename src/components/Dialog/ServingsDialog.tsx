import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Dialog} from './Dialog';
import {Button} from '@components/Button';
import {Tabs} from '@components/Tabs';
import {TextInput} from '@components/TextInput';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {IconUsersRoundTwotone} from '@components/Icon/IconIndex';
import {useTranslation} from '@contexts/LanguageContext';

export interface ServingsDialogProps {
  visible: boolean;
  onClose: () => void;
  value?: string;
  onConfirm: (formatted: string) => void;
}

/**
 * "3호 4개" → {spec: "3호", amount: "4", unit: "piece"}
 *
 * 저장값은 표시 언어의 단위 라벨이 그대로 붙는다(한국어 "개/인분", 영어 "pcs/servings").
 * 그래서 파서도 두 언어를 모두 알아야 한다 — 한쪽만 보면 다른 언어로 저장된 값이
 * "숫자만" 분기로 떨어져 단위가 항상 piece로 리셋되고 규격도 사라진다.
 */
const PIECE_UNIT = '(?:개|pcs?|pieces?)';
const SERVING_UNIT = '(?:인분|servings?)';
const GRAM_UNIT = '(?:g|kg|그램)';

function parseServings(value?: string): {spec: string; amount: string; unit: string} {
  if (!value) return {spec: '', amount: '', unit: 'piece'};

  // "3인분" / "3 servings" — 규격 분기보다 먼저 본다.
  // (piece 규격 패턴이 .+? 로 앞부분을 먹어 "servings"를 잘못 잡는 것을 막는다)
  const servingMatch = value.match(new RegExp(`(\\d+)\\s*${SERVING_UNIT}\\b`, 'i'));
  if (servingMatch) return {spec: '', amount: servingMatch[1], unit: 'serving'};

  // "3호 4개", "1호 1개" 등 규격 + 수량
  const specPieceMatch = value.match(new RegExp(`(.+?)\\s+(\\d+)\\s*${PIECE_UNIT}\\b`, 'i'));
  if (specPieceMatch) return {spec: specPieceMatch[1], amount: specPieceMatch[2], unit: 'piece'};

  // "12개" / "12 pcs"
  const pieceMatch = value.match(new RegExp(`(\\d+)\\s*${PIECE_UNIT}\\b`, 'i'));
  if (pieceMatch) return {spec: '', amount: pieceMatch[1], unit: 'piece'};

  // "1000g" — 개/인분 분기 뒤에 둔다.
  // "600g 4개"는 규격+수량(piece)으로 잡혀야 하므로 이 검사가 먼저 오면 안 된다.
  const gramMatch = value.match(new RegExp(`^\\s*(\\d+)\\s*${GRAM_UNIT}\\s*$`, 'i'));
  if (gramMatch) return {spec: '', amount: gramMatch[1], unit: 'gram'};

  // 숫자만
  const numMatch = value.match(/(\d+)/);
  if (numMatch) return {spec: '', amount: numMatch[1], unit: 'piece'};

  return {spec: '', amount: '', unit: 'piece'};
}

export function ServingsDialog({visible, onClose, value, onConfirm}: ServingsDialogProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const UNIT_OPTIONS = [
    {id: 'serving', label: t('servings.unitServing')},
    {id: 'piece', label: t('servings.unitPiece')},
    // 시험 레시피는 "반죽 총량 1000g"처럼 무게로 표기하는 경우가 있다
    {id: 'gram', label: t('servings.unitGram')},
  ];
  const UNIT_SUFFIX: Record<string, string> = {
    serving: t('servings.unitServing'),
    piece: t('servings.unitPiece'),
    gram: t('servings.unitGram'),
  };
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
      // 규격은 '개' 단위에서만 의미 있음 (인분엔 규격을 붙이지 않음)
      const specPart = unit === 'piece' ? spec.trim() : '';
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
      title={t('servings.dialogTitle')}
      actions={<>
        <Button label={t('servings.cancel')} variant="soft" onPress={onClose} />
        <Button label={t('servings.confirm')} variant="filled" onPress={handleConfirm} />
      </>}
    >
      <View style={styles.content}>
        {/* 탭이 무엇을 고르는 것인지 알리는 라벨 — 아래 입력칸들과 같은 기준 */}
        <View>
          <Text style={styles.fieldLabel}>{t('servings.unitLabel')}</Text>
          <Tabs
            tabs={UNIT_OPTIONS}
            selectedId={unit}
            onSelect={setUnit}
            fullWidth
          />
        </View>
        {unit === 'piece' ? (
          <View style={styles.row}>
            <View style={styles.inputWrap}>
              <TextInput
                label={t('servings.specLabel')}
                value={spec}
                onChangeText={setSpec}
                placeholder={t('servings.specPlaceholder')}
                maxLength={10}
                selectTextOnFocus
                clearable
              />
            </View>
            <Text style={styles.separator}>/</Text>
            <View style={styles.inputWrap}>
              <TextInput
                label={t('servings.amountLabel')}
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
        ) : (
          <View style={styles.inputWrap}>
            <TextInput
              label={t('servings.amountLabel')}
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              placeholder="0"
              maxLength={4}
              selectTextOnFocus
              clearable
            />
          </View>
        )}
      </View>
    </Dialog>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  content: {
    gap: Spacing.md,
  },
  // TextInput의 label과 같은 기준 — 탭도 입력칸과 같은 위계로 보이게
  fieldLabel: {
    ...Typography.label.medium,
    color: colors['foreground/on-surface-muted'],
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
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
