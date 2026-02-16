import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppBar, ContentContainer, APPBAR_CONTENT_BOTTOM} from '@components/Layout';
import {RecipeCard} from '@components/Recipe/RecipeCard';
import {Menu} from '@components/Menu';
import {Dialog} from '@components/Dialog';
import {Button} from '@components/Button';
import {TextInput} from '@components/TextInput';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {MockRecipe} from '@data/mockRecipes';
import {IconTrashFilled, IconBookFilled, IconChartNoAxesGantt, IconEditFilled, IconColliections} from '@components/Icon/IconIndex';

export interface GroupScreenProps {
  recipes: MockRecipe[];
  onComingSoon: () => void;
  onRenameCookbook?: (oldName: string, newName: string) => void;
  onCookbookPress?: (cookbookName: string) => void;
}

// 그룹 필터 메뉴 아이템
const GROUP_FILTER_MENU_ITEMS = [
  {id: '__all__', label: '모든 그룹', icon: IconColliections},
  {id: 'cookbook', label: '요리책', icon: IconBookFilled},
  {id: 'retrospective', label: '회고록', icon: IconChartNoAxesGantt},
];

const GROUP_FILTER_LABELS: Record<string, string> = {
  '__all__': '모든 그룹',
  'cookbook': '요리책',
  'retrospective': '회고록',
};

const MORE_MENU_ITEMS = [
  {id: 'deleteAll', label: '모두 삭제', icon: IconTrashFilled, destructive: true},
];

const COOKBOOK_MENU_ITEMS = [
  {id: 'rename', label: '이름 수정', icon: IconEditFilled},
  {id: 'delete', label: '삭제', icon: IconTrashFilled, destructive: true},
];

export function GroupScreen({recipes, onComingSoon, onRenameCookbook, onCookbookPress}: GroupScreenProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showGroupFilterMenu, setShowGroupFilterMenu] = useState(false);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('__all__');
  const [cookbookMenuTarget, setCookbookMenuTarget] = useState<string | null>(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameTarget, setRenameTarget] = useState('');
  const [renameName, setRenameName] = useState('');

  // 레시피를 카테고리별로 그룹핑 → 요리책 섹션
  const cookbooks = useMemo(() => {
    const map = new Map<string, MockRecipe[]>();
    // '그룹없음'을 기본으로 항상 포함
    map.set('그룹없음', []);
    for (const recipe of recipes) {
      const key = recipe.category || '그룹없음';
      const list = map.get(key) || [];
      list.push(recipe);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([name, items]) => ({name, items}));
  }, [recipes]);

  // 회고가 있는 레시피 → 회고록 섹션
  const retrospectives = useMemo(
    () => recipes.filter(r => r.reviewCount > 0),
    [recipes],
  );

  const handleTitlePress = () => {
    setShowMoreMenu(false);
    setCookbookMenuTarget(null);
    setShowGroupFilterMenu(prev => !prev);
  };

  const handleGroupFilterSelect = (id: string) => {
    setShowGroupFilterMenu(false);
    setSelectedGroupFilter(id);
  };

  const handleMenuPress = () => {
    setShowGroupFilterMenu(false);
    setCookbookMenuTarget(null);
    setShowMoreMenu(prev => !prev);
  };

  const handleOverlayPress = () => {
    setShowGroupFilterMenu(false);
    setShowMoreMenu(false);
    setCookbookMenuTarget(null);
  };

  const handleCookbookMenuPress = (name: string) => {
    setShowGroupFilterMenu(false);
    setShowMoreMenu(false);
    setCookbookMenuTarget(prev => (prev === name ? null : name));
  };

  const handleCookbookMenuSelect = (id: string) => {
    const target = cookbookMenuTarget;
    setCookbookMenuTarget(null);
    if (id === 'rename' && target) {
      setRenameTarget(target);
      setRenameName(target);
      setShowRenameDialog(true);
    } else {
      onComingSoon();
    }
  };

  const handleRenameConfirm = () => {
    if (renameName.trim() && renameName !== renameTarget) {
      onRenameCookbook?.(renameTarget, renameName.trim());
    }
    setShowRenameDialog(false);
  };

  const showCookbookSection = selectedGroupFilter === '__all__' || selectedGroupFilter === 'cookbook';
  const showRetrospectiveSection = selectedGroupFilter === '__all__' || selectedGroupFilter === 'retrospective';
  const anyMenuOpen = showGroupFilterMenu || showMoreMenu || !!cookbookMenuTarget;

  return (
    <View style={styles.container}>
      <AppBar
        title={GROUP_FILTER_LABELS[selectedGroupFilter]}
        showDropdown
        onTitlePress={handleTitlePress}
        onAddPress={onComingSoon}
        onFilterPress={onComingSoon}
        onMenuPress={handleMenuPress}
        menuOpen={showMoreMenu}
        titleMenu={
          <Menu
            items={GROUP_FILTER_MENU_ITEMS}
            selectedId={selectedGroupFilter}
            visible={showGroupFilterMenu}
            onSelect={handleGroupFilterSelect}
          />
        }
      />

      {/* 더보기 메뉴 */}
      <Menu
        items={MORE_MENU_ITEMS}
        visible={showMoreMenu}
        onSelect={() => {
          setShowMoreMenu(false);
          onComingSoon();
        }}
        style={styles.moreMenu}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* 오버레이 */}
        <Pressable
          style={styles.overlay}
          onPress={handleOverlayPress}
          pointerEvents={anyMenuOpen ? 'auto' : 'none'}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <ContentContainer style={styles.sections}>
            {/* 요리책 섹션 */}
            {showCookbookSection && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>요리책</Text>
                </View>
                <View>
                  {cookbooks.map(cookbook => (
                    <View key={cookbook.name}>
                      <RecipeCard
                        title={cookbook.name}
                        category={`${cookbook.items.length}개의 레시피`}
                        reviewCount={cookbook.items.reduce((sum, r) => sum + r.reviewCount, 0)}
                        layout="list"
                        placeholderIcon={IconBookFilled}
                        placeholderIconColor={colors['custom-brownvar']}
                        onPress={() => onCookbookPress?.(cookbook.name)}
                        onMenuPress={() => handleCookbookMenuPress(cookbook.name)}
                      />
                      <Menu
                        items={COOKBOOK_MENU_ITEMS}
                        visible={cookbookMenuTarget === cookbook.name}
                        onSelect={handleCookbookMenuSelect}
                        style={styles.cookbookMenu}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 회고록 섹션 */}
            {showRetrospectiveSection && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>회고록</Text>
                </View>
                {retrospectives.length > 0 ? (
                  <View>
                    {retrospectives.map(recipe => (
                      <RecipeCard
                        key={recipe.id}
                        title={recipe.title}
                        category={recipe.category}
                        method={recipe.method}
                        reviewCount={recipe.reviewCount}
                        imageSource={recipe.imageSource}
                        layout="list"
                        placeholderIcon={IconChartNoAxesGantt}
                        placeholderIconColor={colors['custom-lightbluevar']}
                        onPress={onComingSoon}
                        onMenuPress={onComingSoon}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <View style={styles.emptyThumbnail}>
                      <IconChartNoAxesGantt
                        width={24}
                        height={24}
                        color={colors['custom-lightbluevar']}
                      />
                    </View>
                    <View style={styles.emptyContent}>
                      <Text style={styles.emptyText}>아직 작성된 회고록이 없습니다.</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ContentContainer>
        </ScrollView>
      </SafeAreaView>

      {/* 요리책 이름 수정 다이얼로그 */}
      <Dialog
        visible={showRenameDialog}
        onClose={() => setShowRenameDialog(false)}
        icon={IconBookFilled}
        avatarColor="brown"
        title="요리책 이름 수정"
        actions={<>
          <Button label="취소" variant="soft" onPress={() => setShowRenameDialog(false)} />
          <Button label="확인" variant="filled" onPress={handleRenameConfirm} />
        </>}>
        <TextInput
          placeholder="요리책 이름"
          value={renameName}
          onChangeText={setRenameName}
        />
      </Dialog>
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors['surface-surfacedim'],
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 80,
    paddingBottom: 120,
  },
  sections: {
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Typography.label.large.fontFamily,
    fontSize: Typography.label.large.fontSize,
    fontWeight: Typography.label.large.fontWeight as '500',
    lineHeight: Typography.label.large.lineHeight,
    color: colors['foreground-onsurfacemuted'],
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 5,
  },
  moreMenu: {
    position: 'absolute',
    top: APPBAR_CONTENT_BOTTOM + Spacing.xs,
    right: Spacing.md,
    zIndex: 20,
  },
  cookbookMenu: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.sm,
  },
  emptyThumbnail: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: 'rgba(94, 94, 94, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    height: 68,
  },
  emptyText: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground-onsurfacemuted'],
  },
});
