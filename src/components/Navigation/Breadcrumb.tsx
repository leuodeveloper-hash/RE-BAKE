import React from 'react';
import {StyleSheet, View} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {GlassContainer} from '@components/Container';
import {Selector} from '@components/Selector';
import {IconChevronRight, IconArrowLeft} from '@components/Icon/IconIndex';
import {useColors} from '@contexts/ThemeContext';
import {NavPillButton} from '@components/Navigation';

export interface BreadcrumbProps {
  /** 1뎁스: 축 라벨 (전체/레시피 북/공법/회고 노트) */
  axisLabel: string;
  /** 축 아이콘 — 2뎁스에서 뒤로가기 버튼에 쓴다(돌아갈 곳을 알린다). */
  axisIcon?: React.FC<SvgProps>;
  /** 축 아이콘 색 — 축마다 달라 어디로 돌아가는지 색으로도 구분된다 */
  axisIconColor?: string;
  /** 2뎁스: 선택 항목 (특정 책/공법). 없으면 1뎁스만 */
  itemLabel?: string;
  onAxisPress?: () => void;
  onItemPress?: () => void;
  /**
   * 항목으로 '들어간' 상태일 때만 넘긴다 — 주면 축 아이콘이 뒤로가기가 된다.
   * 없으면 축 아이콘은 축 메뉴(onAxisPress)를 연다.
   */
  onBack?: () => void;
  /** 셀렉터 알약 안 맨 앞에 넣을 노드(작성자 아바타 등). */
  leadingNode?: React.ReactNode;
}

/**
 * 앱바 타이틀용 2뎁스 브레드크럼. `[축] › [선택 항목]`
 * 각 세그먼트가 탭 가능 (메뉴는 부모가 AppBar titleMenu로 앵커링).
 *
 * onBack이 주어지고 항목(2뎁스)이 있으면: `[‹ 뒤로가기] [항목 ⌄]` 형태로 축 텍스트를 버튼으로 대체.
 */
export function Breadcrumb({axisLabel, axisIcon, axisIconColor, itemLabel, onAxisPress, onItemPress, onBack, leadingNode}: BreadcrumbProps) {
  const colors = useColors();
  const hasItem = itemLabel != null && itemLabel !== '';

  // 항목(2뎁스)이 있으면 늘 [축 아이콘][항목 ⌄] — 모양 규칙은 여기 한 곳에서만 정한다.
  // 아이콘은 들어간 상태(onBack)면 뒤로가기, 아니면 축 메뉴.
  if (hasItem) {
    return (
      <View style={styles.row}>
        {/* 돌아갈 곳의 아이콘을 쓴다 — 화살표만 있으면 어디서 들어왔는지
            (레시피들인지 레시피북인지) 알 수 없다 */}
        <NavPillButton
          icon={axisIcon ?? IconArrowLeft}
          iconColor={axisIconColor}
          onPress={onBack ?? onAxisPress}
          variant="ghost-secondary"
        />
        <GlassContainer contentStyle={styles.pill}>
          {leadingNode ? <View style={styles.leading}>{leadingNode}</View> : null}
          <Selector
            label={itemLabel!}
            showDropdown
            onPress={onItemPress}
            variant="ghost"
          />
        </GlassContainer>
      </View>
    );
  }

  return (
    <GlassContainer contentStyle={styles.pill}>
      {leadingNode ? <View style={styles.leading}>{leadingNode}</View> : null}
      <Selector
        label={axisLabel}
        showDropdown={!hasItem}
        onPress={onAxisPress}
        variant="ghost"
      />
      {hasItem && (
        <>
          <IconChevronRight width={14} height={14} color={colors['foreground/on-surface-muted']} />
          <Selector
            label={itemLabel!}
            showDropdown
            onPress={onItemPress}
            variant="ghost"
          />
        </>
      )}
    </GlassContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  // 아바타는 셀렉터에 딱 붙인다(갭 0). 셀렉터 자체 좌측 패딩이 최소 간격 역할.
  leading: {
    marginRight: 0,
  },
});
