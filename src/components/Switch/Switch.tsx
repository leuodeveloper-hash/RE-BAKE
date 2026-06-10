import React from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import type {SemanticColorsV2} from '@constants/tokensV2';
import {useThemedStylesV2} from '@hooks/useThemedStyles';

interface SwitchProps {
  label?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function Switch({label, value, onValueChange}: SwitchProps) {
  const styles = useThemedStylesV2(createStyles);

  return (
    <Pressable style={styles.container} onPress={() => onValueChange(!value)}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.track, value && styles.trackActive]}>
        <Animated.View style={[styles.thumb, value && {transform: [{translateX: 16}]}]} />
      </View>
    </Pressable>
  );
}

const createStyles = (colors: SemanticColorsV2) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      padding: 2,
    },
    label: {
      ...Typography.label.medium,
      color: colors['foreground/on-surface-muted'],
      marginTop: FONT_BASELINE_OFFSET,
    },
    track: {
      width: 36,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors['foreground/on-surface-muted'],
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    trackActive: {
      backgroundColor: colors['custom/orange-var'],
    },
    thumb: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#fff',
    },
  });
