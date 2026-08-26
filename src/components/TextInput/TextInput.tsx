import React, {useCallback, useMemo, useRef} from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  Pressable,
  StyleSheet,
  TextInputProps as RNTextInputProps,
  StyleProp,
  TextStyle,
} from 'react-native';
import {IconCloseCircleFilled} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useLinkTargetBinding} from '@hooks/useLinkTargetBinding';
import {useAutoGrow} from '@hooks/useAutoGrow';
import type {SemanticColors} from '@constants/tokens';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';

// style을 배리언트 문자열로 재정의하므로 RN의 style은 제외한다
// (Omit 없이 extends하면 타입이 충돌한다)
export interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
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
  /**
   * 라벨·아이콘·에러 등 껍데기를 렌더하지 않고 입력만 반환한다.
   * 부모 레이아웃(행 정렬 등)을 컨테이너가 바꾸면 안 되는 인라인 입력용.
   */
  bare?: boolean;
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
  bare = false,
  value,
  onChangeText,
  onContentSizeChange,
  onSelectionChange,
  onBlur,
  ...props
}, ref) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  // "선택한 텍스트에 링크" 배선.
  // 링크 표시·URL 숨김은 RichEditor(contentEditable)가 전담한다.
  // 여기서 마크다운을 변환하면 bulk 입력처럼 링크와 무관한 필드가 깨진다.
  const {handleSelectionChange, handleBlur} = useLinkTargetBinding(
    value, onChangeText, onSelectionChange, onBlur,
  );
  const isGhost = style === 'ghost';
  const isSmall = size === 'small';
  const isYellow = variant === 'yellow';
  // 외부 ref와 내부 ref를 함께 채운다
  const internalRef = useRef<any>(null);
  const setRefs = useCallback((node: any) => {
    internalRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.MutableRefObject<any>).current = node;
  }, [ref]);

  // 여러 줄 자동 확장 — 네이티브/웹 처리는 useAutoGrow 한 곳에 있다
  const {height, onTextChanged, onContentSize} = useAutoGrow(multiline, internalRef);

  const handleChangeText = useCallback((v: string) => {
    onTextChanged();
    onChangeText?.(v);
  }, [onTextChanged, onChangeText]);

  const handleContentSize = useCallback((e: any) => {
    onContentSize(e);
    onContentSizeChange?.(e);
  }, [onContentSize, onContentSizeChange]);

  const inputEl = (
    <RNTextInput
      ref={setRefs}
      style={[
        isGhost ? styles.inputGhost : (isSmall ? styles.inputSmall : styles.input),
        multiline && !isGhost && styles.inputMultiline,
        isYellow && styles.inputYellow,
        inputStyle,
        // 측정된 자동 높이는 호출부 스타일(minHeight 등)보다 뒤에 와야 이긴다.
        // 앞에 두면 minHeight에 갇혀 내용이 길어져도 늘어나지 않는다.
        height != null ? {height} : undefined,
      ]}
      placeholder={placeholder}
      placeholderTextColor={isYellow ? colors['custom/yellow-var'] + '80' : colors['foreground/on-surface-muted']}
      selectionColor={isYellow ? colors['custom/yellow-var'] : colors['foreground/on-surface']}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : undefined}
      blurOnSubmit={multiline ? false : undefined}
      value={value}
      onChangeText={handleChangeText}
      onContentSizeChange={handleContentSize}
      {...props}
      onSelectionChange={handleSelectionChange}
      onBlur={handleBlur}
    />
  );

  // 껍데기 없이 입력만 — 부모 레이아웃을 컨테이너가 바꾸지 않는다
  if (bare) return inputEl;

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
        {inputEl}
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

const createStyles = (colors: SemanticColors) => StyleSheet.create({
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
    // 같은 카드의 아이콘과 동일한 색 — 톤이 갈리지 않게
    color: colors['custom/yellow'],
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
