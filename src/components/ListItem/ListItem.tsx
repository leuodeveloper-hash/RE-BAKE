import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {SemanticColorsLight, Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {SvgProps} from 'react-native-svg';
import {IconButton} from '@components/Layout/IconButton';

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
  onPress?: () => void;
  style?: ViewStyle;
}

// ---- 슬롯 렌더러 ----

function renderSlotElement(element: ListItemElementType) {
  switch (element.type) {
    case 'icon': {
      const Icon = element.icon;
      return (
        <View style={styles.slotContainer}>
          <Icon
            width={16}
            height={16}
            color={SemanticColorsLight['foreground-onsurfacemuted']}
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
  onPress,
  style,
}: ListItemProps) {
  const multiline = titleNumberOfLines === 0;
  const Wrapper = onPress ? Pressable : View;
  const wrapperProps = onPress
    ? {
        onPress,
        style: ({pressed}: {pressed: boolean}) => [
          styles.stateLayer,
          multiline && styles.stateLayerTop,
          pressed && styles.stateLayerPressed,
        ],
      }
    : {style: [styles.stateLayer, multiline && styles.stateLayerTop]};

  return (
    <View style={style}>
      <Wrapper {...(wrapperProps as any)}>
        {leading && renderSlotElement(leading)}
        <View style={styles.content}>
          {children ?? (
            <Text style={styles.title} numberOfLines={titleNumberOfLines || undefined}>
              {title}
            </Text>
          )}
        </View>
        {trailing && renderSlotElement(trailing)}
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

const styles = StyleSheet.create({
  stateLayer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.smd,
    paddingVertical: Spacing.sm,
    borderRadius: Radius['radius-md'],
  },
  stateLayerTop: {
    alignItems: 'flex-start',
  },
  stateLayerPressed: {
    backgroundColor:
      SemanticColorsLight['background-statelayers-surfacefocus_press'],
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
    backgroundColor: SemanticColorsLight['surface-surfacecontainer'],
  },
  numberText: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: SemanticColorsLight['foreground-onsurfacemuted'],
    textAlign: 'center',
    marginTop: FONT_BASELINE_OFFSET,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.smd,
    paddingVertical: 2,
  },
  title: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: SemanticColorsLight['foreground-onsurface'],
    marginTop: FONT_BASELINE_OFFSET,
  },
  dividerContainer: {
    paddingLeft: 44,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: SemanticColorsLight['border-borderlight'],
  },
});
