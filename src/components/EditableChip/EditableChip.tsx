import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleProp, StyleSheet, Text, TextInput as RNTextInput, View, ViewStyle} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {IconAstriks, IconCircleAlertFilled, IconCloseCircleFilled} from '@components/Icon/IconIndex';
import {Radius} from '@constants/tokens';
import {useColors} from '@contexts/ThemeContext';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';

const noOutline: any = {outlineStyle: 'none', fieldSizing: 'content'};

export type EditableChipVariant = 'tip' | 'yellow';
export type EditableChipSize = 'small' | 'medium' | 'large';

export interface EditableChipProps {
  label: string;
  variant?: EditableChipVariant;
  size?: EditableChipSize;
  icon?: React.FC<SvgProps>;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  onRemove?: () => void;
  onChangeText?: (text: string) => void;
}

const SIZE_CONFIG = {
  small: {
    lineHeight: Typography.body.small.lineHeight,
    fontFamily: Typography.body.small.fontFamily,
    fontSize: Typography.body.small.fontSize,
    fontWeight: Typography.body.small.fontWeight as '400',
    iconSize: 12,
    padding: Spacing.sm,
    gap: Spacing.xs,
    borderRadius: Radius['radius-sm'],
  },
  medium: {
    lineHeight: Typography.body.medium.lineHeight,
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    iconSize: 14,
    padding: Spacing.sm,
    gap: Spacing.xs,
    borderRadius: Radius['radius-sm'],
  },
  large: {
    lineHeight: Typography.body.xlarge.lineHeight,
    fontFamily: Typography.body.xlarge.fontFamily,
    fontSize: Typography.body.xlarge.fontSize,
    fontWeight: Typography.body.xlarge.fontWeight as '500',
    iconSize: 18,
    padding: Spacing.sm,
    gap: Spacing.sm,
    borderRadius: Radius['radius-md'],
  },
} as const;

export function EditableChip({
  label,
  variant = 'tip',
  size = 'small',
  icon,
  placeholder = '팁을 입력하세요',
  style,
  onRemove,
  onChangeText,
}: EditableChipProps) {
  const colors = useColors();
  const sizeConfig = SIZE_CONFIG[size];

  const variantConfig = useMemo((): Record<
    EditableChipVariant,
    {
      backgroundColor: string;
      iconColor: string;
      textColor: string;
      placeholderColor: string;
      Icon: React.FC<SvgProps>;
    }
  > => ({
    tip: {
      backgroundColor: colors['surface-surfacecontainerhigh'],
      iconColor: colors['foreground-onsurfacevar'],
      textColor: colors['foreground-onsurfacevar'],
      placeholderColor: colors['foreground-onsurfacemuted'],
      Icon: IconAstriks,
    },
    yellow: {
      backgroundColor: colors['custom-yellowcontainer'],
      iconColor: colors['custom-yellow'],
      textColor: colors['custom-onyellowcontainer'],
      placeholderColor: colors['custom-yellowvar'],
      Icon: IconCircleAlertFilled,
    },
  }), [colors]);

  const config = variantConfig[variant];
  const Icon = icon ?? config.Icon;
  const [inputHeight, setInputHeight] = useState<number>(sizeConfig.lineHeight);
  const inputRef = useRef<any>(null);

  // 웹: scrollHeight로 grow + shrink 모두 지원
  const resizeFromDom = useCallback(() => {
    const node = inputRef.current;
    if (!node) return;
    const el = (node as any)?._node ?? node;
    const textarea = el?.tagName === 'TEXTAREA' ? el : el?.querySelector?.('textarea');
    if (!textarea) return;
    textarea.style.height = '0';
    const h = Math.max(sizeConfig.lineHeight, textarea.scrollHeight);
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
    <View style={[styles.container, {backgroundColor: config.backgroundColor, padding: sizeConfig.padding, gap: sizeConfig.gap, borderRadius: sizeConfig.borderRadius}, style]}>
      <View style={[styles.iconWrap, {height: sizeConfig.lineHeight + FONT_BASELINE_OFFSET}]}>
        <Icon width={sizeConfig.iconSize} height={sizeConfig.iconSize} color={config.iconColor} />
      </View>
      {onChangeText ? (
        <RNTextInput
          ref={inputRef}
          style={[styles.label, styles.labelInput, noOutline, {
            color: config.textColor,
            height: inputHeight,
            fontFamily: sizeConfig.fontFamily,
            fontSize: sizeConfig.fontSize,
            fontWeight: sizeConfig.fontWeight,
            lineHeight: sizeConfig.lineHeight,
          }]}
          value={label}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={config.placeholderColor}
          multiline
          onContentSizeChange={e => {
            setInputHeight(Math.max(sizeConfig.lineHeight, Math.ceil(e.nativeEvent.contentSize.height)));
          }}
        />
      ) : (
        <Text style={[styles.label, {
          color: config.textColor,
          fontFamily: sizeConfig.fontFamily,
          fontSize: sizeConfig.fontSize,
          fontWeight: sizeConfig.fontWeight,
          lineHeight: sizeConfig.lineHeight,
        }]}>
          {label}
        </Text>
      )}
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={4} style={[styles.iconWrap, {height: sizeConfig.lineHeight + FONT_BASELINE_OFFSET}]}>
          <IconCloseCircleFilled width={sizeConfig.iconSize} height={sizeConfig.iconSize} color={config.iconColor} />
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
