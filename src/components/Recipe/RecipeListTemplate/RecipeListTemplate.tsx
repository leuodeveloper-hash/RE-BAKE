import React, {useCallback, useMemo, useState} from 'react';
import {Dimensions, FlatList, Pressable, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ContentContainer, contentAreaPadding, APPBAR_CONTENT_BOTTOM} from '@components/Layout';
import {RecipeCard, RecipeCardLayout} from '@components/Recipe/RecipeCard';
import {Menu, MenuItemData} from '@components/Menu';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {MockRecipe} from '@data/mockRecipes';
import {parseSession} from '@utils/session';
import {
  IconLayoutGridFilled,
  IconLayoutPanelTop,
  IconList,
} from '@components/Icon/IconIndex';

const LAYOUT_MENU_ITEMS: MenuItemData[] = [
  {id: 'grid', label: '그리드', icon: IconLayoutGridFilled},
  {id: 'photoList', label: '사진 목록', icon: IconLayoutPanelTop},
  {id: 'list', label: '목록', icon: IconList},
];

export interface RecipeListHelpers {
  layout: RecipeCardLayout;
  showLayoutMenu: boolean;
  handleFilterPress: () => void;
  closeMenus: () => void;
}

export interface RecipeListTemplateProps {
  data: MockRecipe[];
  onRecipePress: (recipe: MockRecipe) => void;
  cardMenuItems?: MenuItemData[] | ((recipe: MockRecipe) => MenuItemData[]);
  onCardMenuSelect?: (id: string, recipe: MockRecipe) => void;
  renderAppBar: (helpers: RecipeListHelpers) => React.ReactNode;
  onOverlayPress?: () => void;
  extraOverlayVisible?: boolean;
  contentExtra?: React.ReactNode;
  listEmptyComponent?: React.ReactElement;
  /** 외부에서 레이아웃 강제 (검색 결과 등) */
  forceLayout?: RecipeCardLayout;
  children?: React.ReactNode;
}

export function RecipeListTemplate({
  data,
  onRecipePress,
  cardMenuItems,
  onCardMenuSelect,
  renderAppBar,
  onOverlayPress,
  extraOverlayVisible = false,
  contentExtra,
  listEmptyComponent,
  forceLayout,
  children,
}: RecipeListTemplateProps) {
  const styles = useThemedStyles(createStyles);
  const [layout, setLayout] = useState<RecipeCardLayout>('grid');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [cardMenuTarget, setCardMenuTarget] = useState<MockRecipe | null>(null);
  const [cardMenuPosition, setCardMenuPosition] = useState<{top: number; right: number} | null>(null);

  const closeMenus = useCallback(() => {
    setShowLayoutMenu(false);
    setCardMenuTarget(null);
  }, []);

  const handleFilterPress = useCallback(() => {
    setCardMenuTarget(null);
    setShowLayoutMenu(prev => !prev);
  }, []);

  const handleLayoutSelect = useCallback((id: string) => {
    setLayout(id as RecipeCardLayout);
    setShowLayoutMenu(false);
  }, []);

  const handleCardMenuPress = useCallback((recipe: MockRecipe, position: {pageX: number; pageY: number; width: number; height: number}) => {
    setShowLayoutMenu(false);
    const screenWidth = Dimensions.get('window').width;
    setCardMenuPosition({
      top: position.pageY + position.height + Spacing.xs,
      right: screenWidth - (position.pageX + position.width),
    });
    setCardMenuTarget(prev => (prev?.id === recipe.id ? null : recipe));
  }, []);

  const handleCardMenuSelectInternal = useCallback((id: string) => {
    const target = cardMenuTarget;
    setCardMenuTarget(null);
    if (target) {
      onCardMenuSelect(id, target);
    }
  }, [cardMenuTarget, onCardMenuSelect]);

  const handleOverlayPress = useCallback(() => {
    closeMenus();
    onOverlayPress?.();
  }, [closeMenus, onOverlayPress]);

  const activeLayout = forceLayout ?? layout;
  const numColumns = activeLayout === 'grid' ? 2 : 1;
  const overlayActive = showLayoutMenu || !!cardMenuTarget || extraOverlayVisible;

  // 그리드 모드에서 홀수 개일 때 빈 placeholder 추가하여 마지막 카드 크기 일정하게 유지
  const paddedData = useMemo(() => {
    if (activeLayout === 'grid' && data.length % 2 === 1) {
      return [...data, {id: '__placeholder__'} as MockRecipe];
    }
    return data;
  }, [data, activeLayout]);

  const helpers: RecipeListHelpers = {
    layout,
    showLayoutMenu,
    handleFilterPress,
    closeMenus,
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ContentContainer style={styles.contentWrapper} horizontalPadding={false}>
          <FlatList
            key={activeLayout}
            data={paddedData}
            numColumns={numColumns}
            keyExtractor={item => item.id}
            contentContainerStyle={[styles.listContent, data.length === 0 && styles.listContentEmpty]}
            columnWrapperStyle={activeLayout === 'grid' ? styles.row : undefined}
            ListEmptyComponent={listEmptyComponent}
            renderItem={({item}) =>
              item.id === '__placeholder__' ? (
                <View style={styles.gridCardContainer} />
              ) : (
                <View style={activeLayout === 'grid' ? styles.gridCardContainer : styles.listCardContainer}>
                  <RecipeCard
                    title={item.title}
                    category={item.category}
                    method={item.method}
                    reviewCount={item.reviewCount || item.reviews?.length || 0}
                    sessionCount={parseSession(item.session).total}
                    imageSource={item.imageSource}
                    layout={activeLayout}
                    onPress={() => onRecipePress(item)}
                    onMenuPress={cardMenuItems ? (pos) => handleCardMenuPress(item, pos) : undefined}
                  />
                </View>
              )
            }
          />

          {contentExtra}
        </ContentContainer>
      </SafeAreaView>

      {renderAppBar(helpers)}

      <Pressable
        style={styles.overlay}
        onPress={handleOverlayPress}
        pointerEvents={overlayActive ? 'auto' : 'none'}
      />

      <Menu
        title="레이아웃"
        items={LAYOUT_MENU_ITEMS}
        selectedId={layout}
        onSelect={handleLayoutSelect}
        style={styles.layoutMenu}
        visible={showLayoutMenu}
      />

      {cardMenuItems && cardMenuTarget ? (
        <Menu
          items={typeof cardMenuItems === 'function' ? cardMenuItems(cardMenuTarget) : cardMenuItems}
          visible={!!cardMenuTarget}
          onSelect={handleCardMenuSelectInternal}
          style={cardMenuPosition ? {
            position: 'absolute',
            top: cardMenuPosition.top,
            right: cardMenuPosition.right,
            zIndex: 50,
          } : undefined}
        />
      ) : null}

      {children}
    </>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors['surface-surfacedim'],
  },
  contentWrapper: {
    flex: 1,
  },
  listContent: {
    ...contentAreaPadding,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  row: {
    gap: Spacing.md,
  },
  gridCardContainer: {
    flex: 1,
    maxWidth: '50%',
    marginBottom: Spacing.md,
  },
  listCardContainer: {
    marginBottom: Spacing.sm,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  layoutMenu: {
    position: 'absolute',
    top: APPBAR_CONTENT_BOTTOM + Spacing.xs,
    right: Spacing.md,
  },
});
