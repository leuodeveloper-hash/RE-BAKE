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

/**
 * 가운데 슬롯 — 일반(text: 제목 + 설명 한 줄) / 커스텀(custom: 입력창·강조 글 등 무엇이든).
 * 줄은 늘 [왼쪽 슬롯] [가운데 슬롯] [오른쪽 값 + 오른쪽 슬롯] 세 칸이고, 가운데만 갈아 끼운다.
 *  - 설정: text(제목 + 서브카피)
 *  - 편집: custom(입력창)
 *  - 상세 재료: custom(재료 이름)
 */
export type ListItemContentType =
  | {type: 'text'; title: string; description?: string}
  | {type: 'custom'; element: React.ReactNode};

// ---- ListItem Props ----

export type ListItemVariant = 'default' | 'yellow';

export interface ListItemProps {
  /** 가운데 슬롯 — 일반(text) / 커스텀(custom). 아래 title·description·children은 이것의 줄임 표기 */
  content?: ListItemContentType;
  /** 줄임: content {type:'text'}의 제목 */
  title?: string;
  /** 줄임: content {type:'text'}의 설명 한 줄 (muted) */
  description?: string;
  /** 줄임: content {type:'custom'} — 태그 사이에 넣은 내용 */
  children?: React.ReactNode;
  /** 왼쪽 슬롯 (아이콘, 숫자, 아이콘 버튼) */
  leading?: ListItemElementType;
  /** 오른쪽 슬롯 (아이콘, 숫자, 아이콘 버튼) */
  trailing?: ListItemElementType;
  /**
   * 우측 끝(보통 > 아이콘) 앞에 붙는 값 — "12개"처럼 들어가지 않고도
   * 알 수 있어야 하는 수치. 설정 목록이 공통으로 쓴다.
   */
  trailingValue?: string;
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
  /** 행 안쪽 여백(상하좌우 같은 값) — 기본은 좌우 12·상하 8. 큰 카드형 줄(예: [+] 시트 레시피북 만들기)에서 16 등 */
  padding?: number;
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
      // 폭은 내용대로(28로 묶으면 잘린다). 최소 28 칸 가운데, 더 크면(탭·스위치) 그만큼 — 줄 위아래 여백 8은 그대로 둔다
      return <View style={styles.customSlot}>{element.element}</View>;
  }
}

// ---- ListItem 컴포넌트 ----

/** 목록 줄 제목 글자 — 옆에 놓이는 버튼(OptionTile) 라벨도 이걸 써서 크기를 맞춘다 */
export const LIST_ITEM_TITLE_TEXT = {
  fontFamily: Typography.body.medium.fontFamily,
  fontSize: Typography.body.medium.fontSize,
  fontWeight: Typography.body.medium.fontWeight as '500',
  lineHeight: Typography.body.medium.lineHeight,
  letterSpacing: -0.25,
};

export function ListItem({
  content,
  title,
  description,
  children,
  leading,
  trailing,
  trailingValue,
  showDivider = true,
  titleNumberOfLines = 1,
  disabled = false,
  variant,
  onPress,
  onLongPress,
  style,
  padding,
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
  // 가운데 슬롯 — content가 정식, title·description·children은 줄임 표기
  const centerSlot: ListItemContentType = content
    ?? (children != null ? {type: 'custom', element: children} : {type: 'text', title: title ?? '', description});
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
          padding != null && {paddingHorizontal: padding, paddingVertical: padding},
          pressed && (isYellow ? styles.stateLayerPressedYellow : styles.stateLayerPressed),
          disabled && styles.disabled,
        ],
      }
    : {style: [styles.stateLayer, multiline && styles.stateLayerTop, padding != null && {paddingHorizontal: padding, paddingVertical: padding}, disabled && styles.disabled]};

  return (
    <View style={style}>
      <Wrapper {...(wrapperProps as any)}>
        {leading && renderSlotElement(leading, colors, styles, resolvedVariant)}
        <View style={styles.content}>
          {centerSlot.type === 'custom' ? centerSlot.element : (
            <>
              <Text style={[styles.title, isYellow && styles.titleYellow]} numberOfLines={titleNumberOfLines || undefined}>
                {centerSlot.title}
              </Text>
              {centerSlot.description ? <Text style={styles.description} numberOfLines={1}>{centerSlot.description}</Text> : null}
            </>
          )}
        </View>
        {trailingValue ? <Text style={styles.trailingValue}>{trailingValue}</Text> : null}
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
    customSlot: {
      minHeight: 28,
      justifyContent: 'center',
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
    // 오른쪽 값 — 다른 줄의 값(마지막 동기화, 레시피북 이름 등)과 같은 body.medium.
    // label.medium(12)이라 스탬프북 개수만 한 단계 작아 보였다.
    trailingValue: {
      ...Typography.body.medium,
      color: colors['foreground/on-surface-muted'],
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
      ...LIST_ITEM_TITLE_TEXT,
      color: colors['foreground/on-surface'],
      marginTop: FONT_BASELINE_OFFSET,
    },
    // 설명 — 캡션 서체(Figma caption-medium, label.small)
    description: {
      // 제목 아래 설명 — label small은 작아 안 읽혔다, 한 단계 크게
      ...Typography.caption.medium,
      color: colors['foreground/on-surface-muted'],
      marginTop: 2,
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
