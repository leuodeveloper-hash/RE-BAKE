import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {SvgProps} from 'react-native-svg';
import {IconButton} from '@components/Layout/IconButton';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';

// ---- Leading/Trailing 슬롯 타입 ----

export type ListItemElementType =
  | {type: 'icon'; icon: React.FC<SvgProps>}
  | {type: 'number'; value: number}
  | {type: 'iconButton'; icon: React.FC<SvgProps>; onPress?: () => void; variant?: 'soft' | 'ghost-secondary'}
  | {type: 'custom'; element: React.ReactNode};

// ---- ListItem Props ----

export interface ListItemProps {
  /** 기본 텍스트 타이틀 (children이 없을 때 사용) */
  title?: string;
  /** 커스텀 콘텐츠 (title 대신 사용) */
  children?: React.ReactNode;
  /** 왼쪽 슬롯 (아이콘, 숫자, 아이콘 버튼) */
  leading?: ListItemElementType;
  /** 오른쪽 슬롯 (아이콘, 숫자, 아이콘 버튼) */
  trailing?: ListItemElementType;
  /** 하단 구분선 표시 여부 (기본: true) */
  showDivider?: boolean;
  /** 타이틀 최대 줄 수 (기본: 1, 0이면 무제한) */
  titleNumberOfLines?: number;
  /** 비활성화 상태 */
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

// ---- 슬롯 렌더러 ----

function renderSlotElement(
  element: ListItemElementType,
  colors: SemanticColors,
  styles: ReturnType<typeof createStyles>,
) {
  switch (element.type) {
    case 'icon': {
      const Icon = element.icon;
      return (
        <View style={styles.slotContainer}>
          <Icon
            width={16}
            height={16}
            color={colors['foreground-onsurfacemuted']}
          />
        </View>
      );
    }
    case 'number':
      return (
        <View style={[styles.slotContainer, styles.numberContainer]}>
          <Text style={styles.numberText}>{element.value}</Text>
        </View>
      );
    case 'iconButton':
      return (
        <IconButton
          icon={element.icon}
          onPress={element.onPress}
          variant={element.variant ?? 'soft'}
          size="small"
        />
      );
    case 'custom':
      return <>{element.element}</>;
  }
}

// ---- ListItem 컴포넌트 ----

export function ListItem({
  title,
  children,
  leading,
  trailing,
  showDivider = true,
  titleNumberOfLines = 1,
  disabled = false,
  onPress,
  style,
}: ListItemProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const multiline = titleNumberOfLines === 0;
  const isClickable = onPress && !disabled;
  const Wrapper = isClickable ? Pressable : View;
  const wrapperProps = isClickable
    ? {
        onPress,
        style: ({pressed}: {pressed: boolean}) => [
          styles.stateLayer,
          multiline && styles.stateLayerTop,
          pressed && styles.stateLayerPressed,
          disabled && styles.disabled,
        ],
      }
    : {style: [styles.stateLayer, multiline && styles.stateLayerTop, disabled && styles.disabled]};

  return (
    <View style={style}>
      <Wrapper {...(wrapperProps as any)}>
        {leading && renderSlotElement(leading, colors, styles)}
        <View style={styles.content}>
          {children ?? (
            <Text style={styles.title} numberOfLines={titleNumberOfLines || undefined}>
              {title}
            </Text>
          )}
        </View>
        {trailing && renderSlotElement(trailing, colors, styles)}
      </Wrapper>
      {showDivider && (
        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
        </View>
      )}
    </View>
  );
}

// ---- Styles ----

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    stateLayer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: Spacing.smd,
      paddingVertical: Spacing.sm,
      borderRadius: Radius['radius-md'],
      gap: 4,
    },
    stateLayerTop: {
      alignItems: 'flex-start',
    },
    stateLayerPressed: {
      backgroundColor:
        colors['background-statelayers-surfacefocus_press'],
    },
    slotContainer: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderRadius: Radius['radius-full'],
    },
    numberContainer: {
      backgroundColor: colors['surface-surfacecontainer'],
    },
    numberText: {
      fontFamily: Typography.body.medium.fontFamily,
      fontSize: Typography.body.medium.fontSize,
      fontWeight: Typography.body.medium.fontWeight as '500',
      lineHeight: Typography.body.medium.lineHeight,
      letterSpacing: -0.25,
      color: colors['foreground-onsurfacemuted'],
      textAlign: 'center',
      marginTop: FONT_BASELINE_OFFSET,
    },
    content: {
      flex: 1,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
    },
    title: {
      fontFamily: Typography.body.medium.fontFamily,
      fontSize: Typography.body.medium.fontSize,
      fontWeight: Typography.body.medium.fontWeight as '500',
      lineHeight: Typography.body.medium.lineHeight,
      letterSpacing: -0.25,
      color: colors['foreground-onsurface'],
      marginTop: FONT_BASELINE_OFFSET,
    },
    dividerContainer: {
      paddingLeft: 44,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors['border-borderlight'],
    },
    disabled: {
      opacity: 0.38,
    },
  });
