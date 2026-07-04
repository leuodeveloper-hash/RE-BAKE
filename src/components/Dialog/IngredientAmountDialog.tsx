import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Dialog} from './Dialog';
import {Button} from '@components/Button';
import {Selector} from '@components/Selector';
import {Menu} from '@components/Menu';
import {TextInput} from '@components/TextInput';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import type {SemanticColorsV2} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {IconScaleTwotone} from '@components/Icon/IconIndex';

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

const ALL_UNITS: UnitDef[] = [
  {id: 'g', label: 'g'},
  {id: 'kg', label: 'kg'},
  {id: 'ml', label: 'ml'},
  {id: 'L', label: 'L'},
  {id: '컵', label: '컵'},
  {id: '큰술', label: '큰술'},
  {id: '작은술', label: '작은술'},
  {id: '개', label: '개'},
  {id: '장', label: '장'},
  {id: '알', label: '알'},
  {id: '약간', label: '약간', noAmount: true},
  {id: '조금', label: '조금', noAmount: true},
  {id: '적당량', label: '적당량', noAmount: true},
];

function findUnitDef(unitId: string): UnitDef | undefined {
  return ALL_UNITS.find(u => u.id === unitId);
}

export function IngredientAmountDialog({visible, onClose, amount, unit, onConfirm}: IngredientAmountDialogProps) {
  const styles = useThemedStylesV2(createStyles);
  const [selectedUnit, setSelectedUnit] = useState('g');
  const [inputAmount, setInputAmount] = useState('');
  const [showUnitMenu, setShowUnitMenu] = useState(false);

  useEffect(() => {
    if (visible) {
      const u = unit || 'g';
      setSelectedUnit(u);
      setInputAmount(amount || '');
      setShowUnitMenu(false);
    }
  }, [visible, amount, unit]);

  const currentUnitDef = findUnitDef(selectedUnit);
  const isNoAmount = currentUnitDef?.noAmount ?? false;

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
      icon={IconScaleTwotone}
      avatarColor="green"
      title="용량 설정"
      actions={<>
        <Button label="취소" variant="soft" onPress={onClose} />
        <Button label="확인" variant="filled" onPress={handleConfirm} />
      </>}
    >
      <View style={styles.content}>
        {!isNoAmount ? (
          <View style={styles.row}>
            <View style={styles.inputWrap}>
              <TextInput
                label="양"
                value={inputAmount}
                onChangeText={setInputAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                maxLength={10}
                selectTextOnFocus
              />
            </View>
            <View style={styles.unitWrap}>
              <Text style={styles.unitLabel}>단위</Text>
              <Selector
                label={currentUnitDef?.label ?? selectedUnit}
                showDropdown
                onPress={() => setShowUnitMenu(prev => !prev)}
                variant="tonal"
                forcePressed={showUnitMenu}
              />
              <Menu
                items={ALL_UNITS}
                selectedId={selectedUnit}
                visible={showUnitMenu}
                onSelect={(id) => { setSelectedUnit(id); setShowUnitMenu(false); }}
                onClose={() => setShowUnitMenu(false)}
                style={styles.unitMenu}
                maxHeight={200}
              />
            </View>
          </View>
        ) : (
          <View style={styles.row}>
            <View style={styles.unitWrapFull}>
              <Text style={styles.unitLabel}>단위</Text>
              <Selector
                label={currentUnitDef?.label ?? selectedUnit}
                showDropdown
                onPress={() => setShowUnitMenu(prev => !prev)}
                variant="tonal"
                forcePressed={showUnitMenu}
              />
              <Menu
                items={ALL_UNITS}
                selectedId={selectedUnit}
                visible={showUnitMenu}
                onSelect={(id) => { setSelectedUnit(id); setShowUnitMenu(false); }}
                onClose={() => setShowUnitMenu(false)}
                style={styles.unitMenu}
                maxHeight={200}
              />
            </View>
          </View>
        )}
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
  unitWrap: {
    position: 'relative' as const,
  },
  unitWrapFull: {
    flex: 1,
    position: 'relative' as const,
  },
  unitLabel: {
    ...Typography.label.medium,
    color: colors['foreground/on-surface-muted'],
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  unitMenu: {
    position: 'absolute' as const,
    bottom: '100%' as unknown as number,
    right: 0,
    zIndex: 10,
    marginBottom: Spacing.xs,
  },
  noAmountHint: {
    ...Typography.body.small,
    color: colors['foreground/on-surface-muted'],
    textAlign: 'center',
    marginTop: FONT_BASELINE_OFFSET,
  },
});
