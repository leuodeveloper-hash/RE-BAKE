import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  Pressable,
  StyleSheet,
  TextInputProps as RNTextInputProps,
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
  Platform,
  StyleProp,
  TextStyle,
} from 'react-native';
import {IconCloseCircleFilled} from '@components/Icon/IconIndex';
import {useThemedStylesV2} from '@hooks/useThemedStyles';
import {useColorsV2} from '@contexts/ThemeContext';
import type {SemanticColorsV2} from '@constants/tokens';
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
  /** 컬러 배리언트 (yellow: 조언 등 옐로우 카드 내부용) */
  variant?: 'default' | 'yellow';
  /** 내용 지우기 (x) 버튼 표시 */
  clearable?: boolean;
  /** 실제 입력 텍스트 스타일 오버라이드 (폰트 크기/색 등). variant 스타일 뒤에 병합되어 우선함 */
  inputStyle?: StyleProp<TextStyle>;
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
  variant = 'default',
  clearable = false,
  inputStyle,
  value,
  onChangeText,
  onContentSizeChange,
  ...props
}, ref) => {
  const styles = useThemedStylesV2(createStyles);
  const colors = useColorsV2();
  const isGhost = style === 'ghost';
  const isSmall = size === 'small';
  const isYellow = variant === 'yellow';
  const autoResize = multiline;

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
    if (autoResize) {
      if (Platform.OS === 'web') {
        requestAnimationFrame(resizeWeb);
      } else {
        setContentHeight(undefined);
      }
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
            isYellow && styles.inputYellow,
            autoResize && contentHeight != null ? {height: contentHeight} : undefined,
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={isYellow ? colors['custom/yellow-var'] + '80' : colors['foreground/on-surface-muted']}
          selectionColor={isYellow ? colors['custom/yellow-var'] : colors['foreground/on-surface']}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : undefined}
          value={value}
          onChangeText={handleChangeText}
          onContentSizeChange={handleContentSizeChange}
          {...props}
        />
        {clearable && value && value.length > 0 ? (
          <Pressable onPress={() => onChangeText?.('')} hitSlop={8} style={styles.clearButton}>
            {React.createElement(IconCloseCircleFilled as any, {width: 16, height: 16, color: colors['foreground/on-surface-muted']})}
          </Pressable>
        ) : trailingIcon ? (
          <View style={styles.trailingIcon}>{trailingIcon}</View>
        ) : null}
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

const createStyles = (colors: SemanticColorsV2) => StyleSheet.create({
  container: {
    width: '100%',
  },
  containerSmall: {
    flex: 1,
  },
  containerGhost: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    ...Typography.label.medium,
    color: colors['foreground/on-surface-muted'],
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors['surface/container'],
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
    borderColor: colors['foreground/negative'],
  },
  input: {
    flex: 1,
    minWidth: 0,
    ...Typography.body.medium,
    color: colors['foreground/on-surface'],
    paddingVertical: Spacing.sm,
    minHeight: 24,
    outlineStyle: 'none',
  } as any,
  inputSmall: {
    flex: 1,
    minWidth: 0,
    ...Typography.body.medium,
    color: colors['foreground/on-surface'],
    paddingVertical: Spacing.xs,
    minHeight: 20,
    textAlign: 'center',
    outlineStyle: 'none',
  } as any,
  inputGhost: {
    flex: 1,
    minWidth: 0,
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground/on-surface'],
    padding: 0,
    marginTop: FONT_BASELINE_OFFSET,
    outlineStyle: 'none',
  } as any,
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  inputYellow: {
    color: colors['custom/yellow-var'],
  },
  leadingIcon: {
    marginRight: Spacing.sm,
  },
  trailingIcon: {
    marginLeft: Spacing.sm,
  },
  clearButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    flexShrink: 0,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  errorText: {
    ...Typography.body.small,
    color: colors['foreground/negative'],
  },
  supportingText: {
    ...Typography.body.small,
    color: colors['foreground/on-surface-var'],
    marginTop: Spacing.xs,
  },
});
