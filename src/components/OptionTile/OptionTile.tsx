import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {SemanticColorsLight} from '@constants/tokens';
import {Typography} from '@constants/typography';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {ElevationLight} from '@constants/elevation';

export interface OptionTileProps {
  icon?: React.ReactNode;
  label: string;
  style?: ViewStyle;
}

export const OptionTile: React.FC<OptionTileProps> = ({icon, label, style}) => {
  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SemanticColorsLight['surface-surfacebright'],
    borderRadius: Radius['radius-md'],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    ...ElevationLight['3'],
  },
  iconContainer: {
    width: 16,
    height: 16,
  },
  label: {
    ...Typography.label['medium - semibold'],
    color: SemanticColorsLight['foreground-onsurfacemuted'],
    textAlign: 'center',
  },
});
