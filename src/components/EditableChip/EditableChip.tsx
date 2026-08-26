import React, {useMemo} from 'react';
import {Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {IconAstriks, IconCircleAlertFilled, IconClose} from '@components/Icon/IconIndex';
import {TextInput} from '@components/TextInput';
import {RichText} from '@components/RichText/RichText';
import {Radius} from '@constants/tokens';
import {useColors} from '@contexts/ThemeContext';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {useTranslation} from '@contexts/LanguageContext';

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
  /** 편집 입력칸에 마운트 시 자동 포커스 (팁/주의 방금 추가 → 커서 바로 이동) */
  autoFocus?: boolean;
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
  placeholder,
  style,
  onRemove,
  onChangeText,
  autoFocus,
}: EditableChipProps) {
  const {t} = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('editableChip.tipPlaceholder');
  const colors = useColors();
  const sizeConfig = SIZE_CONFIG[size];

  const variantConfig = useMemo((): Record<
    EditableChipVariant,
    {
      backgroundColor: string;
      iconColor: string;
      textColor: string;
      // 좌측 바 색 — 텍스트보다 한 톤 더 뮤티드(덜 튀게)
      barColor: string;
      placeholderColor: string;
      Icon: React.FC<SvgProps>;
    }
  > => ({
    tip: {
      backgroundColor: colors['surface/container-high'],
      iconColor: colors['foreground/on-surface-var'],
      textColor: colors['custom/grey-var'],
      barColor: colors['foreground/on-surface-muted'],
      placeholderColor: colors['foreground/on-surface-muted'],
      Icon: IconAstriks,
    },
    yellow: {
      backgroundColor: colors['custom/yellow-subtle'],
      iconColor: colors['custom/yellow'],
      textColor: colors['custom/yellow-var'],
      barColor: colors['custom/yellow-var'],
      placeholderColor: colors['custom/yellow-var'],
      Icon: IconCircleAlertFilled,
    },
  }), [colors]);

  const config = variantConfig[variant];
  const Icon = icon ?? config.Icon;

  // 입력/표시 공통 텍스트 스타일 (사이즈별 폰트 + variant 색)
  const textStyle = {
    color: config.textColor,
    fontFamily: sizeConfig.fontFamily,
    fontSize: sizeConfig.fontSize,
    fontWeight: sizeConfig.fontWeight,
    lineHeight: sizeConfig.lineHeight,
    letterSpacing: -0.25,
  };

  return (
    <View style={[styles.container, {paddingVertical: 0, paddingLeft: 8, paddingRight: 4, gap: sizeConfig.gap}, onChangeText && styles.containerEditing, style]}>
      {/* 좌측 바 — border 대신 상하 inset된 라인으로 글자 높이에 맞춰(line-height leading만큼 튀어나오지 않게) */}
      <View pointerEvents="none" style={[styles.bar, {backgroundColor: config.barColor}]} />
      {onChangeText ? (
        // 편집 모드: 아이콘 없이 풀폭 입력(좌측 끝부터). 공용 TextInput 멀티라인 변형 사용
        // → flex:1+minWidth:0 로 줄바꿈, 자동 높이 증가 내장
        <TextInput
          style="ghost"
          multiline
          autoFocus={autoFocus}
          value={label}
          onChangeText={onChangeText}
          placeholder={resolvedPlaceholder}
          placeholderTextColor={config.placeholderColor}
          selectionColor={config.textColor}
          inputStyle={[styles.inputReset, textStyle]}
        />
      ) : (
        // 보기 모드: 아이콘 없이 텍스트만 (칩 타입 일관 — tip/주의 색만 다름)
        <RichText style={[styles.label, textStyle]}>{label}</RichText>
      )}
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={4} style={[styles.iconWrap, {height: sizeConfig.lineHeight + FONT_BASELINE_OFFSET, marginLeft: 10}]}>
          <IconClose width={sizeConfig.iconSize + 4} height={sizeConfig.iconSize + 4} color={config.iconColor} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    borderRadius: Radius['radius-sm'],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  // 좌측 세로 바 — 상하 inset으로 글자에 붙임(line-height 여백만큼 안 튀게)
  bar: {
    position: 'absolute',
    left: 0,
    top: 3,
    bottom: 3,
    width: 2,
    borderRadius: 1,
  },
  iconWrap: {
    height: Typography.body.small.lineHeight + FONT_BASELINE_OFFSET,
    justifyContent: 'center',
    paddingTop: FONT_BASELINE_OFFSET,
  },
  // 보기 모드 인라인 아이콘 (Text 안 View) — 텍스트 baseline에 맞춰 살짝 내림
  inlineIcon: {
    transform: [{translateY: 3}],
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
  // 보기(label)와 같은 baseline 오프셋을 써야 편집/보기 전환 시 글이 위아래로
  // 어긋나지 않는다(같은 size인데 크기가 달라 보이던 원인).
  inputReset: {
    marginTop: FONT_BASELINE_OFFSET,
  },
  // 편집 모드: 내용에 쪼그라들지(flex-start) 않고 가로로 펴져 멀티라인이 자연 줄바꿈
  containerEditing: {
    alignSelf: 'stretch',
    width: '100%',
  },
});
