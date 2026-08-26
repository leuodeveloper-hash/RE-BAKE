import React from 'react';
import {Platform, Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {SvgProps} from 'react-native-svg';
import {IconButton} from '@components/IconButton';
import {Checkbox} from '@components/Checkbox/Checkbox';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {triggerHaptic} from '@utils/haptics';
import {useColors} from '@contexts/ThemeContext';
import {useCardVariant} from '@components/Container/Card';

// ---- Leading/Trailing 슬롯 타입 ----

export type ListItemElementType =
  | {type: 'icon'; icon: React.FC<SvgProps>}
  | {type: 'number'; value: number}
  | {type: 'checkbox'; checked: boolean}
  | {type: 'iconButton'; icon: React.FC<SvgProps>; onPress?: () => void; variant?: 'filled' | 'tonal' | 'soft' | 'ghost-secondary' | 'ghost-yellow'; disabled?: boolean; size?: 'small' | 'medium' | 'large'}
  | {type: 'custom'; element: React.ReactNode};

// ---- ListItem Props ----

export type ListItemVariant = 'default' | 'yellow';

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
  /** 컬러 배리언트 */
  variant?: ListItemVariant;
  onPress?: () => void;
  /** 롱프레스 — 보기 화면에서 해당 행을 편집으로 넘기는 용도 등 */
  onLongPress?: () => void;
  style?: ViewStyle;
}

// ---- 슬롯 렌더러 ----

function renderSlotElement(
  element: ListItemElementType,
  colors: SemanticColors,
  styles: ReturnType<typeof createStyles>,
  variant: ListItemVariant = 'default',
) {
  switch (element.type) {
    case 'icon': {
      const Icon = element.icon;
      const iconColor = variant === 'yellow'
        ? colors['custom/yellow']
        : colors['foreground/on-surface-muted'];
      return (
        <View style={styles.slotContainer}>
          <Icon
            width={20}
            height={20}
            color={iconColor}
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
    case 'checkbox':
      return (
        <View style={styles.iconButtonSlot}>
          <Checkbox checked={element.checked} />
        </View>
      );
    case 'iconButton':
      // 아이콘 슬롯(28)과 정렬 맞춤: 40 버튼을 28 슬롯 중앙에 넘치게(overflow) 배치
      return (
        <View style={styles.iconButtonSlot}>
          <IconButton
            icon={element.icon}
            onPress={element.onPress}
            variant={element.variant ?? 'tonal'}
            // 호출부가 지정 가능. 예전엔 medium 고정이라, 크기를 바꾸려면
            // type:'custom'으로 우회해야 했고 그래서 헤더마다 버튼 크기가 갈렸다.
            size={element.size ?? 'medium'}
            disabled={element.disabled}
          />
        </View>
      );
    case 'custom':
      // 슬롯으로 감싸지 않는다 — 28 고정 폭을 강제하면 안에 든 요소가 잘리고
      // 옆 글씨가 밀린다. 크기는 호출부가 알아서 맞춘다.
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
  variant,
  onPress,
  onLongPress,
  style,
}: ListItemProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const cardVariant = useCardVariant();
  const resolvedVariant = variant ?? cardVariant;
  const multiline = titleNumberOfLines === 0;
  // 롱프레스만 있어도 Pressable이어야 한다(탭 없이 롱프레스만 쓰는 행 대응)
  const isClickable = (onPress || onLongPress) && !disabled;
  const Wrapper = isClickable ? Pressable : View;
  const isYellow = resolvedVariant === 'yellow';
  const wrapperProps = isClickable
    ? {
        onPress: onPress ? () => { triggerHaptic('light'); onPress(); } : undefined,
        onLongPress: onLongPress ? () => { triggerHaptic('medium'); onLongPress(); } : undefined,
        delayLongPress: 400,
        // 웹: 클릭 가능한 행 전체에 손가락 커서. 함수형 style에선 RN Web 자동 커서가
        // 안 붙는 경우가 있어 명시적으로 지정.
        style: ({pressed}: {pressed: boolean}) => [
          styles.stateLayer,
          Platform.OS === 'web' && ({cursor: 'pointer'} as any),
          multiline && styles.stateLayerTop,
          pressed && (isYellow ? styles.stateLayerPressedYellow : styles.stateLayerPressed),
          disabled && styles.disabled,
        ],
      }
    : {style: [styles.stateLayer, multiline && styles.stateLayerTop, disabled && styles.disabled]};

  return (
    <View style={style}>
      <Wrapper {...(wrapperProps as any)}>
        {leading && renderSlotElement(leading, colors, styles, resolvedVariant)}
        <View style={styles.content}>
          {children ?? (
            <Text style={[styles.title, isYellow && styles.titleYellow]} numberOfLines={titleNumberOfLines || undefined}>
              {title}
            </Text>
          )}
        </View>
        {trailing && renderSlotElement(trailing, colors, styles, resolvedVariant)}
      </Wrapper>
      {showDivider && (
        <View style={styles.dividerContainer}>
          <View style={[styles.divider, isYellow && styles.dividerYellow]} />
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
    /**
     * 여러 줄 항목.
     *
     * 한 줄일 땐 minHeight(48) 안에서 세로 중앙이라 위아래가 균등해 보이지만,
     * 줄이 늘어나 minHeight를 넘어서면 중앙 정렬이 무력해지고 paddingVertical만
     * 남는다. 그래서 "한 줄 = 넉넉 / 여러 줄 = 위가 좁음"으로 어긋나 보였다.
     *
     * → 여러 줄에서는 중앙 정렬에 기대지 않고, 한 줄일 때와 같은 여백
     *   ((48 - lineHeight) / 2)을 패딩으로 직접 준다. 줄 수와 무관하게 동일하다.
     *
     * alignItems는 'flex-start' — 우측 버튼(삭제 등)이 첫 줄과 나란히 와야 한다.
     * 여백은 위 패딩이 잡으므로, 한 줄일 때도 중앙 정렬과 같은 위치가 된다.
     */
    /**
     * 여러 줄 항목 — 우측 버튼이 첫 줄과 나란히 오도록 위 정렬.
     *
     * 세로 패딩은 stateLayer(8)와 같게 둔다. 이보다 키우면
     * 패딩(2배) + 슬롯(28)이 minHeight 48을 넘겨, 슬롯 없는 행보다 높아진다.
     */
    stateLayerTop: {
      alignItems: 'flex-start',
      paddingVertical: Spacing.sm,
    },
    stateLayerPressed: {
      backgroundColor:
        colors['fill/subtle'],
    },
    // 옐로우 카드 안에서는 누름 효과도 같은 계열로 — 회색이면 배경에서 튄다
    stateLayerPressedYellow: {
      backgroundColor: colors['custom/yellow-subtle'],
    },
    slotContainer: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderRadius: Radius['radius-full'],
    },
    // 아이콘버튼/체크박스 등 28보다 큰 요소용 슬롯: 중앙정렬 + overflow 허용(넘치게)
    iconButtonSlot: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numberContainer: {
      backgroundColor: colors['surface/container'],
    },
    numberText: {
      fontFamily: Typography.body.medium.fontFamily,
      fontSize: Typography.body.medium.fontSize,
      fontWeight: Typography.body.medium.fontWeight as '500',
      lineHeight: Typography.body.medium.lineHeight,
      letterSpacing: -0.25,
      color: colors['foreground/on-surface-muted'],
      textAlign: 'center',
    },
    /**
     * 글줄 영역 — 글줄 높이만 차지한다.
     *
     * 슬롯(28)에 맞춰 minHeight를 키우면 행이 글보다 커져, 같은 카드의
     * 팁·주의 칩 행보다 눈에 띄게 넓어진다. 여백은 stateLayer가 잡으므로
     * 여기서는 글줄 그대로 둔다.
     */
    content: {
      flex: 1,
      paddingHorizontal: Spacing.sm,
      // 글줄(20)을 좌우 슬롯(28) 중앙에 맞춘다 — 위 정렬(stateLayerTop) 행에서
      // 패딩이 없으면 첫 줄이 슬롯보다 (28-20)/2 = 4px 위로 떠 보인다.
      // 여러 줄로 늘어나도 첫 줄 기준은 그대로 유지된다.
      paddingVertical: 4,
    },
    title: {
      fontFamily: Typography.body.medium.fontFamily,
      fontSize: Typography.body.medium.fontSize,
      fontWeight: Typography.body.medium.fontWeight as '500',
      lineHeight: Typography.body.medium.lineHeight,
      letterSpacing: -0.25,
      color: colors['foreground/on-surface'],
      marginTop: FONT_BASELINE_OFFSET,
    },
    dividerContainer: {
      // 디바이더(선) 대신 칸과 칸 사이 1px 배경색 간격으로 구분
    },
    divider: {
      height: 1,
      backgroundColor: colors['surface/dim'],
    },
    // 옐로우 카드 안에서는 구분선도 같은 계열로 — 기본 회색이면 카드에서 튄다.
    // 카드 배경과 같은 yellow-subtle을 쓰면 묻혀서 안 보이므로,
    // 한 단계 진한 yellow-border를 쓴다.
    dividerYellow: {
      backgroundColor: colors['custom/yellow-border'],
    },
    titleYellow: {
      // 같은 카드의 아이콘과 동일한 색 — 톤이 갈리지 않게
      color: colors['custom/yellow'],
    },
    disabled: {
      opacity: 0.38,
    },
  });
