import React, {useMemo, useState} from 'react';
import {FlatList, Pressable, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppBar, BottomTabBar, PageTransition, contentAreaPadding} from '@components/Layout';
import {RecipeCard, RecipeCardLayout} from '@components/Recipe/RecipeCard';
import {Menu} from '@components/Menu';
import {SemanticColorsLight} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {MOCK_RECIPES} from '@data/mockRecipes';
import {
  IconHomeFilled,
  IconBookFilled,
  IconAdd,
  IconEarthFilled,
  IconUserFilled,
  IconLayoutGridFilled,
  IconLayoutPanelTop,
  IconList,
} from '@components/Icon/IconIndex';

// 레이아웃 메뉴 아이템
const LAYOUT_MENU_ITEMS = [
  {id: 'grid', label: '그리드', icon: IconLayoutGridFilled},
  {id: 'photoList', label: '사진 목록', icon: IconLayoutPanelTop},
  {id: 'list', label: '목록', icon: IconList},
];

// 콘텐츠 영역 최대 너비
const MAX_CONTENT_WIDTH = 800;

export function RecipeListScreen() {
  const [layout, setLayout] = useState<RecipeCardLayout>('grid');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);

  // 탭 아이템 - add 탭에 onPress 연결
  const tabs = useMemo(
    () => [
      {id: 'home', label: '홈', icon: IconHomeFilled},
      {id: 'group', label: '그룹', icon: IconBookFilled},
      {id: 'add', label: '추가', icon: IconAdd, onPress: () => setShowAddSheet(true)},
      {id: 'explore', label: '둘러보기', icon: IconEarthFilled},
      {id: 'profile', label: '나', icon: IconUserFilled, useRandomAvatar: true},
    ],
    []
  );

  const handleFilterPress = () => {
    setShowLayoutMenu(prev => !prev);
  };

  const handleLayoutSelect = (id: string) => {
    setLayout(id as RecipeCardLayout);
    setShowLayoutMenu(false);
  };

  const handleOverlayPress = () => {
    setShowLayoutMenu(false);
  };

  const handleAddSheetClose = () => {
    setShowAddSheet(false);
  };

  // 그리드 레이아웃일 때만 2열
  const numColumns = layout === 'grid' ? 2 : 1;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PageTransition style={styles.contentWrapper}>
        {/* 상단 앱바 */}
        <AppBar
          title="모든 요리책"
          showDropdown
          onTitlePress={() => console.log('Title pressed')}
          onAddPress={() => console.log('Add pressed')}
          onFilterPress={handleFilterPress}
          onMenuPress={() => console.log('Menu pressed')}
          filterMenuOpen={showLayoutMenu}
        />

        {/* 레시피 리스트 */}
        <FlatList
          key={layout} // 레이아웃 변경 시 리스트 리렌더링
          data={MOCK_RECIPES}
          numColumns={numColumns}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={layout === 'grid' ? styles.row : undefined}
          renderItem={({item}) => (
            <View style={layout === 'grid' ? styles.gridCardContainer : styles.listCardContainer}>
              <RecipeCard
                title={item.title}
                category={item.category}
                method={item.method}
                reviewCount={item.reviewCount}
                imageSource={item.imageSource}
                layout={layout}
                onPress={() => console.log('Card pressed:', item.title)}
                onMenuPress={() => console.log('Menu pressed:', item.title)}
              />
            </View>
          )}
        />

        {/* 오버레이 */}
        <Pressable
          style={styles.overlay}
          onPress={handleOverlayPress}
          pointerEvents={showLayoutMenu ? 'auto' : 'none'}
        />

        {/* 레이아웃 메뉴 */}
        <Menu
          title="레이아웃"
          items={LAYOUT_MENU_ITEMS}
          selectedId={layout}
          onSelect={handleLayoutSelect}
          style={styles.layoutMenu}
          visible={showLayoutMenu}
        />
      </PageTransition>

      {/* 하단 탭바 (확장 시 추가 메뉴로 모핑) */}
      <View style={styles.tabBarWrapper}>
        <BottomTabBar
          tabs={tabs}
          activeTab="home"
          expanded={showAddSheet}
          onClose={handleAddSheetClose}
          onAddItemPress={item => console.log('Add item selected:', item.id)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SemanticColorsLight['surface-surfacedim'],
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
  listContent: {
    ...contentAreaPadding,
  },
  row: {
    gap: Spacing.md,
  },
  gridCardContainer: {
    flex: 1,
    marginBottom: Spacing.md,
  },
  listCardContainer: {
    marginBottom: Spacing.sm,
  },
  tabBarWrapper: {
    position: 'absolute',
    bottom: Spacing.lg,
    alignSelf: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  layoutMenu: {
    position: 'absolute',
    top: 60,
    right: Spacing.md,
  },
});
