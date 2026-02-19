import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Dialog} from './Dialog';
import {Button} from '@components/Button';
import {Tabs} from '@components/Tabs';
import {TextInput} from '@components/TextInput';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {IconScale} from '@components/Icon/IconIndex';

export interface IngredientAmountDialogProps {
  visible: boolean;
  onClose: () => void;
  amount?: string;
  unit?: string;
  onConfirm: (amount: string, unit: string) => void;
}

interface UnitDef {
  id: string;
  label: string;
  /** true = 수량 입력 불필요 (약간, 조금 등) */
  noAmount?: boolean;
}

const CATEGORY_TABS = [
  {id: 'weight', label: '무게'},
  {id: 'volume', label: '부피'},
  {id: 'count', label: '개수'},
  {id: 'etc', label: '기타'},
];

const UNITS_BY_CATEGORY: Record<string, UnitDef[]> = {
  weight: [
    {id: 'g', label: 'g'},
    {id: 'kg', label: 'kg'},
  ],
  volume: [
    {id: 'ml', label: 'ml'},
    {id: 'L', label: 'L'},
    {id: '컵', label: '컵'},
    {id: '큰술', label: '큰술'},
    {id: '작은술', label: '작은술'},
  ],
  count: [
    {id: '개', label: '개'},
    {id: '장', label: '장'},
    {id: '알', label: '알'},
  ],
  etc: [
    {id: '약간', label: '약간', noAmount: true},
    {id: '조금', label: '조금', noAmount: true},
    {id: '적당량', label: '적당량', noAmount: true},
  ],
};

/** 단위 id → 카테고리 id 역매핑 */
const UNIT_TO_CATEGORY: Record<string, string> = {};
for (const [cat, units] of Object.entries(UNITS_BY_CATEGORY)) {
  for (const u of units) {
    UNIT_TO_CATEGORY[u.id] = cat;
  }
}

function findUnitDef(unitId: string): UnitDef | undefined {
  for (const units of Object.values(UNITS_BY_CATEGORY)) {
    const found = units.find(u => u.id === unitId);
    if (found) return found;
  }
  return undefined;
}

export function IngredientAmountDialog({visible, onClose, amount, unit, onConfirm}: IngredientAmountDialogProps) {
  const styles = useThemedStyles(createStyles);
  const [category, setCategory] = useState('weight');
  const [selectedUnit, setSelectedUnit] = useState('g');
  const [inputAmount, setInputAmount] = useState('');

  useEffect(() => {
    if (visible) {
      const u = unit || 'g';
      setSelectedUnit(u);
      setCategory(UNIT_TO_CATEGORY[u] || 'weight');
      setInputAmount(amount || '');
    }
  }, [visible, amount, unit]);

  const currentUnits = UNITS_BY_CATEGORY[category] || [];
  const currentUnitDef = findUnitDef(selectedUnit);
  const isNoAmount = currentUnitDef?.noAmount ?? false;

  const handleCategoryChange = (catId: string) => {
    setCategory(catId);
    // 카테고리 전환 시 해당 카테고리의 첫 번째 단위 자동 선택
    const units = UNITS_BY_CATEGORY[catId];
    if (units && units.length > 0) {
      setSelectedUnit(units[0].id);
    }
  };

  const handleConfirm = () => {
    if (isNoAmount) {
      onConfirm('', selectedUnit);
    } else {
      onConfirm(inputAmount, selectedUnit);
    }
    onClose();
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      icon={IconScale}
      avatarColor="blue"
      title="용량 설정"
      actions={<>
        <Button label="취소" variant="soft" onPress={onClose} />
        <Button label="확인" variant="filled" onPress={handleConfirm} />
      </>}
    >
      <View style={styles.content}>
        <Tabs
          tabs={CATEGORY_TABS}
          selectedId={category}
          onSelect={handleCategoryChange}
          fullWidth
        />
        <View style={styles.unitChipRow}>
          {currentUnits.map(u => {
            const selected = u.id === selectedUnit;
            return (
              <Pressable
                key={u.id}
                style={[styles.unitChip, selected && styles.unitChipSelected]}
                onPress={() => setSelectedUnit(u.id)}
              >
                <Text style={[styles.unitChipText, selected && styles.unitChipTextSelected]}>
                  {u.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!isNoAmount && (
          <TextInput
            label="수량"
            value={inputAmount}
            onChangeText={setInputAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            maxLength={10}
            selectTextOnFocus
          />
        )}
        {isNoAmount && (
          <Text style={styles.noAmountHint}>수량 없이 단위만 표시됩니다</Text>
        )}
      </View>
    </Dialog>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  content: {
    gap: Spacing.md,
  },
  unitChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  unitChip: {
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.xs,
    borderRadius: Radius['radius-full'],
    backgroundColor: colors['surface-surfacedim'],
    borderWidth: 1,
    borderColor: colors['border-borderlight'],
  },
  unitChipSelected: {
    backgroundColor: colors['surface-primarycontainer'],
    borderColor: colors['foreground-primary'],
  },
  unitChipText: {
    ...Typography.label.large,
    color: colors['foreground-onsurfacevar'],
    marginTop: FONT_BASELINE_OFFSET,
  },
  unitChipTextSelected: {
    color: colors['foreground-primary'],
  },
  noAmountHint: {
    ...Typography.body.small,
    color: colors['foreground-onsurfacemuted'],
    textAlign: 'center',
    marginTop: FONT_BASELINE_OFFSET,
  },
});
