import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, StyleProp, StyleSheet, Text, TextInput as RNTextInput, View, ViewStyle} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {IconAstriks, IconCircleAlertFilled, IconCloseCircleFilled} from '@components/Icon/IconIndex';
import {Radius, SemanticColorsLight} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

const noOutline: any = {outlineStyle: 'none', fieldSizing: 'content'};

export type EditableChipVariant = 'tip' | 'yellow';

export interface EditableChipProps {
  label: string;
  variant?: EditableChipVariant;
  icon?: React.FC<SvgProps>;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  onRemove?: () => void;
  onChangeText?: (text: string) => void;
}

const variantConfig: Record<
  EditableChipVariant,
  {
    backgroundColor: string;
    iconColor: string;
    textColor: string;
    placeholderColor: string;
    Icon: React.FC<SvgProps>;
  }
> = {
  tip: {
    backgroundColor: SemanticColorsLight['surface-surfacecontainerhigh'],
    iconColor: SemanticColorsLight['foreground-onsurfacevar'],
    textColor: SemanticColorsLight['foreground-onsurfacevar'],
    placeholderColor: SemanticColorsLight['foreground-onsurfacemuted'],
    Icon: IconAstriks,
  },
  yellow: {
    backgroundColor: SemanticColorsLight['custom-yellowcontainer'],
    iconColor: SemanticColorsLight['custom-yellow'],
    textColor: SemanticColorsLight['custom-onyellowcontainer'],
    placeholderColor: SemanticColorsLight['custom-yellowvar'],
    Icon: IconCircleAlertFilled,
  },
};

const LINE_HEIGHT = Typography.body.small.lineHeight;

export function EditableChip({
  label,
  variant = 'tip',
  icon,
  placeholder = '팁을 입력하세요',
  style,
  onRemove,
  onChangeText,
}: EditableChipProps) {
  const config = variantConfig[variant];
  const Icon = icon ?? config.Icon;
  const [inputHeight, setInputHeight] = useState<number>(LINE_HEIGHT);
  const inputRef = useRef<any>(null);

  // 웹: scrollHeight로 grow + shrink 모두 지원
  const resizeFromDom = useCallback(() => {
    const node = inputRef.current;
    if (!node) return;
    const el = (node as any)?._node ?? node;
    const textarea = el?.tagName === 'TEXTAREA' ? el : el?.querySelector?.('textarea');
    if (!textarea) return;
    textarea.style.height = '0';
    const h = Math.max(LINE_HEIGHT, textarea.scrollHeight);
    textarea.style.height = h + 'px';
    setInputHeight(prev => (prev === h ? prev : h));
  }, []);

  const handleChangeText = useCallback((text: string) => {
    onChangeText?.(text);
    resizeFromDom();
  }, [onChangeText, resizeFromDom]);

  // 마운트 시 기존 텍스트에 맞게 높이 설정
  useEffect(() => {
    if (onChangeText && label) {
      requestAnimationFrame(resizeFromDom);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[styles.container, {backgroundColor: config.backgroundColor}, style]}>
      <View style={styles.iconWrap}>
        <Icon width={12} height={12} color={config.iconColor} />
      </View>
      {onChangeText ? (
        <RNTextInput
          ref={inputRef}
          style={[styles.label, styles.labelInput, noOutline, {color: config.textColor, height: inputHeight}]}
          value={label}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={config.placeholderColor}
          multiline
          onContentSizeChange={e => {
            setInputHeight(Math.max(LINE_HEIGHT, Math.ceil(e.nativeEvent.contentSize.height)));
          }}
        />
      ) : (
        <Text style={[styles.label, {color: config.textColor}]}>
          {label}
        </Text>
      )}
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={4} style={styles.iconWrap}>
          <IconCloseCircleFilled width={12} height={12} color={config.iconColor} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    borderRadius: Radius['radius-sm'],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  iconWrap: {
    height: Typography.body.small.lineHeight + FONT_BASELINE_OFFSET,
    justifyContent: 'center',
    paddingTop: FONT_BASELINE_OFFSET,
  },
  label: {
    fontFamily: Typography.body.small.fontFamily,
    fontSize: Typography.body.small.fontSize,
    fontWeight: Typography.body.small.fontWeight as '400',
    lineHeight: Typography.body.small.lineHeight,
    letterSpacing: -0.25,
    marginTop: FONT_BASELINE_OFFSET,
    flexShrink: 1,
  },
  labelInput: {
    padding: 0,
  },
});
