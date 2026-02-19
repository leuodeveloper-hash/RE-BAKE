import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  TextInputProps as RNTextInputProps,
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
  Platform,
} from 'react-native';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import type {SemanticColors} from '@constants/tokens';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  placeholder?: string;
  error?: boolean;
  errorText?: string;
  supportingText?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  style?: 'outlined' | 'ghost';
  size?: 'medium' | 'small';
  multiline?: boolean;
}

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(({
  label,
  placeholder,
  error = false,
  errorText,
  supportingText,
  leadingIcon,
  trailingIcon,
  style = 'outlined',
  size = 'medium',
  multiline = false,
  value,
  onChangeText,
  onContentSizeChange,
  ...props
}, ref) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const hasValue = value && value.length > 0;
  const isGhost = style === 'ghost';
  const isSmall = size === 'small';
  const autoResize = isGhost && multiline;

  // Internal ref for web textarea resize
  const internalRef = useRef<any>(null);
  const setRefs = useCallback((node: any) => {
    internalRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.MutableRefObject<any>).current = node;
  }, [ref]);

  // Ghost + multiline auto-resize
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  // Web: resize textarea by reading scrollHeight
  const resizeWeb = useCallback(() => {
    if (!autoResize || Platform.OS !== 'web') return;
    const node = internalRef.current;
    if (!node) return;
    const el = (node as any)?._node ?? node;
    const textarea = el?.tagName === 'TEXTAREA' ? el : el?.querySelector?.('textarea');
    if (!textarea) return;
    textarea.style.height = '0';
    const h = textarea.scrollHeight;
    textarea.style.height = h + 'px';
    setContentHeight(h > 0 ? h : undefined);
  }, [autoResize]);

  // Initial resize on mount (web)
  useEffect(() => {
    if (!autoResize || Platform.OS !== 'web') return;
    const frame = requestAnimationFrame(resizeWeb);
    return () => cancelAnimationFrame(frame);
  }, [autoResize, resizeWeb]);

  const handleChangeText = useCallback((text: string) => {
    onChangeText?.(text);
    if (autoResize && Platform.OS === 'web') {
      requestAnimationFrame(resizeWeb);
    }
  }, [onChangeText, autoResize, resizeWeb]);

  // Native: use onContentSizeChange
  const handleContentSizeChange = useCallback(
    (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      if (autoResize && Platform.OS !== 'web') {
        const h = e.nativeEvent.contentSize.height;
        setContentHeight(h > 0 ? Math.ceil(h) : undefined);
      }
      onContentSizeChange?.(e);
    },
    [autoResize, onContentSizeChange],
  );

  return (
    <View style={isGhost ? styles.containerGhost : (isSmall ? styles.containerSmall : styles.container)}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View
        style={[
          isGhost ? styles.inputContainerGhost : styles.inputContainer,
          !isGhost && isSmall && styles.inputContainerSmall,
          error && styles.inputContainerError,
        ]}>
        {leadingIcon && (
          <View style={styles.leadingIcon}>{leadingIcon}</View>
        )}
        <RNTextInput
          ref={setRefs}
          style={[
            isGhost ? styles.inputGhost : (isSmall ? styles.inputSmall : styles.input),
            multiline && !isGhost && styles.inputMultiline,
            hasValue ? styles.inputFilled : styles.inputPlaceholder,
            autoResize && contentHeight != null ? {height: contentHeight} : undefined,
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors['foreground-onsurfacemuted']}
          selectionColor={colors['foreground-primary']}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : undefined}
          value={value}
          onChangeText={handleChangeText}
          onContentSizeChange={handleContentSizeChange}
          {...props}
        />
        {trailingIcon && (
          <View style={styles.trailingIcon}>{trailingIcon}</View>
        )}
      </View>
      {error && errorText && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorText}</Text>
        </View>
      )}
      {supportingText && !error && (
        <Text style={styles.supportingText}>{supportingText}</Text>
      )}
    </View>
  );
});

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {
    width: '100%',
  },
  containerSmall: {
    flex: 1,
  },
  containerGhost: {
    flex: 1,
  },
  label: {
    ...Typography.label.medium,
    color: colors['foreground-onsurfacemuted'],
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors['surface-surfacecontainer'],
    borderRadius: Radius['radius-md'],
    paddingHorizontal: Spacing.md,
    minHeight: 48,
    borderWidth: 0,
  },
  inputContainerSmall: {
    minHeight: 40,
    paddingHorizontal: Spacing.smd,
  },
  inputContainerGhost: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainerError: {
    borderWidth: 1,
    borderColor: colors['foreground-error'],
  },
  input: {
    flex: 1,
    ...Typography.body.medium,
    color: colors['foreground-onsurface'],
    paddingVertical: Spacing.sm,
    minHeight: 24,
    outlineStyle: 'none',
  } as any,
  inputSmall: {
    flex: 1,
    ...Typography.body.medium,
    color: colors['foreground-onsurface'],
    paddingVertical: Spacing.xs,
    minHeight: 20,
    textAlign: 'center',
    outlineStyle: 'none',
  } as any,
  inputGhost: {
    flex: 1,
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground-onsurface'],
    padding: 0,
    marginTop: FONT_BASELINE_OFFSET,
    outlineStyle: 'none',
  } as any,
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  inputFilled: {
    color: colors['foreground-onsurface'],
  },
  inputPlaceholder: {
    color: colors['foreground-onsurfacemuted'],
  },
  leadingIcon: {
    marginRight: Spacing.sm,
  },
  trailingIcon: {
    marginLeft: Spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  errorText: {
    ...Typography.body.small,
    color: colors['foreground-error'],
  },
  supportingText: {
    ...Typography.body.small,
    color: colors['foreground-onsurfacevar'],
    marginTop: Spacing.xs,
  },
});
