import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Spacing} from '@constants/spacing';
import {
  IconAdd,
  IconFilter,
  IconEllipsisVertical,
} from '@components/Icon/IconIndex';
import {IconButton} from './IconButton';
import {Selector} from './Selector';
import {GlassContainer} from './GlassContainer';

export interface AppBarProps {
  title?: string;
  onTitlePress?: () => void;
  onAddPress?: () => void;
  onFilterPress?: () => void;
  onMenuPress?: () => void;
  showDropdown?: boolean;
  showAddButton?: boolean;
  showFilterButton?: boolean;
  showMenuButton?: boolean;
  filterMenuOpen?: boolean; // 필터 메뉴 열림 상태 (버튼 pressed 표시용)
}

export function AppBar({
  title = '모든 요리책',
  onTitlePress,
  onAddPress,
  onFilterPress,
  onMenuPress,
  showDropdown = true,
  showAddButton = true,
  showFilterButton = true,
  showMenuButton = true,
  filterMenuOpen = false,
}: AppBarProps) {
  const hasRightButtons = showAddButton || showFilterButton || showMenuButton;

  return (
    <View style={styles.container}>
      {/* 왼쪽: 타이틀 버튼 */}
      <GlassContainer contentStyle={styles.titlePill}>
        <Selector
          label={title}
          showDropdown={showDropdown}
          onPress={onTitlePress}
          variant="ghost"
        />
      </GlassContainer>

      {/* 오른쪽: 아이콘 버튼들 */}
      {hasRightButtons && (
        <GlassContainer contentStyle={styles.actionsPill}>
          {showAddButton && (
            <IconButton
              icon={IconAdd}
              onPress={onAddPress}
              variant="ghost-secondary"
              size="medium"
            />
          )}
          {showFilterButton && (
            <IconButton
              icon={IconFilter}
              onPress={onFilterPress}
              variant="ghost-secondary"
              size="medium"
              forcePressed={filterMenuOpen}
            />
          )}
          {showMenuButton && (
            <IconButton
              icon={IconEllipsisVertical}
              onPress={onMenuPress}
              variant="ghost-secondary"
              size="medium"
            />
          )}
        </GlassContainer>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  titlePill: {
    height: 48,
    justifyContent: 'center',
    padding: Spacing.xs,
  },
  actionsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    padding: Spacing.xs,
    gap: Spacing.xs,
  },
});
