import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, Pressable, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {BlurView} from 'expo-blur';
import {AppBar, BottomTabBar, ContentContainer, contentAreaPadding} from '@components/Layout';
import {RecipeCard, RecipeCardLayout} from '@components/Recipe/RecipeCard';
import {Menu} from '@components/Menu';
import {SemanticColorsLight} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {MockRecipe} from '@data/mockRecipes';
import {Snackbar} from '@components/Snackbar';
import {Dialog, PdfPreviewDialog} from '@components/Dialog';
import {Button} from '@components/Button';
import {TextInput} from '@components/TextInput';
import {generateRecipeListHtml} from '@utils/generateRecipeHtml';
import {useRecipeStorage} from '@hooks/useRecipeStorage';
import {RecipeDetailScreen} from './RecipeDetailScreen';
import {RecipeEditScreen} from './RecipeEditScreen';
import {ProfileScreen} from './ProfileScreen';
import {
  IconHomeFilled,
  IconBookFilled,
  IconAdd,
  IconEarthFilled,
  IconUserFilled,
  IconLayoutGridFilled,
  IconLayoutPanelTop,
  IconList,
  IconTrash,
  IconBookTwotone,
  IconArrowDownToLine,
} from '@components/Icon/IconIndex';

// 레이아웃 메뉴 아이템
const LAYOUT_MENU_ITEMS = [
  {id: 'grid', label: '그리드', icon: IconLayoutGridFilled},
  {id: 'photoList', label: '사진 목록', icon: IconLayoutPanelTop},
  {id: 'list', label: '목록', icon: IconList},
];

// 더보기 메뉴 아이템
const MORE_MENU_ITEMS = [
  {id: 'downloadAll', label: 'PDF 다운로드', icon: IconArrowDownToLine},
  {id: 'deleteAll', label: '전체 삭제', icon: IconTrash, destructive: true},
];


export function RecipeListScreen() {
  const {recipes, setRecipes, exportRecipes, importRecipes} = useRecipeStorage();
  const [layout, setLayout] = useState<RecipeCardLayout>('grid');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<MockRecipe | null>(null);
  const [showEditScreen, setShowEditScreen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<MockRecipe | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [showCookbookDialog, setShowCookbookDialog] = useState(false);
  const [cookbookName, setCookbookName] = useState('');
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfHtml, setPdfHtml] = useState('');
  const [showProfile, setShowProfile] = useState(false);

  const showComingSoon = useCallback(() => {
    setShowSnackbar(true);
  }, []);

  // 탭 아이템 - add 탭에 onPress 연결
  const tabs = useMemo(
    () => [
      {id: 'home', label: '홈', icon: IconHomeFilled, onPress: () => setShowProfile(false)},
      {id: 'group', label: '그룹', icon: IconBookFilled, onPress: showComingSoon},
      {id: 'add', label: '추가', icon: IconAdd, onPress: () => setShowAddSheet(true)},
      {id: 'explore', label: '둘러보기', icon: IconEarthFilled, onPress: showComingSoon},
      {id: 'profile', label: '나', icon: IconUserFilled, useRandomAvatar: true, onPress: () => setShowProfile(true)},
    ],
    []
  );

  const handleFilterPress = () => {
    setShowMoreMenu(false);
    setShowLayoutMenu(prev => !prev);
  };

  const handleMenuPress = () => {
    setShowLayoutMenu(false);
    setShowMoreMenu(prev => !prev);
  };

  const handleMoreMenuSelect = (id: string) => {
    setShowMoreMenu(false);
    if (id === 'downloadAll') {
      const pdfData = recipes.map(r => ({
        title: r.title,
        category: r.category,
        method: r.method,
        reviewCount: r.reviewCount,
        time: r.time,
        servings: r.servings,
        session: r.session,
        ingredientGroups: r.ingredientGroups ?? [],
        tools: r.tools ?? [],
        steps: r.steps,
        stepGroups: r.stepGroups,
      }));
      setPdfHtml(generateRecipeListHtml(pdfData));
      setShowPdfPreview(true);
    } else if (id === 'deleteAll') {
      showComingSoon();
    }
  };

  const handleLayoutSelect = (id: string) => {
    setLayout(id as RecipeCardLayout);
    setShowLayoutMenu(false);
  };

  const handleOverlayPress = () => {
    setShowLayoutMenu(false);
    setShowMoreMenu(false);
  };

  const handleAddSheetClose = () => {
    setShowAddSheet(false);
  };

  // 그리드 레이아웃일 때만 2열
  const numColumns = layout === 'grid' ? 2 : 1;

  const handleAddItemPress = (item: {id: string}) => {
    setShowAddSheet(false);
    if (item.id === 'recipe') {
      setShowEditScreen(true);
    } else if (item.id === 'cookbook') {
      setCookbookName('');
      setShowCookbookDialog(true);
    }
  };

  // 프로필 화면 표시
  if (showProfile) {
    return (
      <View style={styles.container}>
        <ProfileScreen
          recipeCount={recipes.length}
          onBack={() => setShowProfile(false)}
          onExport={exportRecipes}
          onImport={importRecipes}
          onComingSoon={showComingSoon}
        />
        <View style={styles.tabBarWrapper}>
          <BottomTabBar
            tabs={tabs}
            activeTab="profile"
            expanded={false}
            onClose={() => {}}
            onAddItemPress={() => {}}
          />
        </View>
      </View>
    );
  }

  // 편집 화면 표시 (탭바 없음)
  if (showEditScreen) {
    return (
      <RecipeEditScreen
        recipe={editingRecipe ?? undefined}
        onClose={() => { setShowEditScreen(false); setEditingRecipe(null); }}
        onSave={(data) => {
          if (editingRecipe) {
            const updated = {...editingRecipe, ...data};
            setRecipes(prev => prev.map(r => r.id === editingRecipe.id ? updated : r));
            setSelectedRecipe(updated);
          }
          setShowEditScreen(false);
          setEditingRecipe(null);
        }}
        onComingSoon={showComingSoon}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* 콘텐츠 영역: 리스트 또는 상세 */}
      {selectedRecipe ? (
        <RecipeDetailScreen
          title={selectedRecipe.title}
          category={selectedRecipe.category}
          method={selectedRecipe.method}
          reviewCount={selectedRecipe.reviewCount}
          imageSource={selectedRecipe.imageSource}
          time={selectedRecipe.time}
          servings={selectedRecipe.servings}
          session={selectedRecipe.session}
          ingredientGroups={selectedRecipe.ingredientGroups}
          tools={selectedRecipe.tools}
          steps={selectedRecipe.steps}
          stepGroups={selectedRecipe.stepGroups}
          activeFieldIds={selectedRecipe.activeFieldIds}
          onBack={() => setSelectedRecipe(null)}
          onComingSoon={showComingSoon}
          onEdit={() => {
            setEditingRecipe(selectedRecipe);
            setShowEditScreen(true);
          }}
        />
      ) : (
        <>
          <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ContentContainer style={styles.contentWrapper} horizontalPadding={false}>
              {/* 레시피 리스트 */}
              <FlatList
                key={layout}
                data={recipes}
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
                      onPress={() => setSelectedRecipe(item)}
                      onMenuPress={showComingSoon}
                    />
                  </View>
                )}
              />

              {/* 오버레이 */}
              <Pressable
                style={styles.overlay}
                onPress={handleOverlayPress}
                pointerEvents={showLayoutMenu || showMoreMenu ? 'auto' : 'none'}
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

              {/* 더보기 메뉴 */}
              <Menu
                items={MORE_MENU_ITEMS}
                onSelect={handleMoreMenuSelect}
                style={styles.moreMenu}
                visible={showMoreMenu}
              />
            </ContentContainer>
          </SafeAreaView>

          {/* 상단 앱바 (리스트에서만) */}
          <AppBar
            title="모든 요리책"
            showDropdown
            onTitlePress={showComingSoon}
            onAddPress={() => setShowEditScreen(true)}
            onFilterPress={handleFilterPress}
            onMenuPress={handleMenuPress}
            filterMenuOpen={showLayoutMenu}
            menuOpen={showMoreMenu}
          />
        </>
      )}

      {/* 스크림 (추가 바텀시트 열릴 때) */}
      {showAddSheet && (
        <Pressable style={styles.scrim} onPress={handleAddSheetClose}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>
      )}

      {/* 요리책 만들기 다이얼로그 */}
      <Dialog
        visible={showCookbookDialog}
        onClose={() => setShowCookbookDialog(false)}
        icon={IconBookTwotone}
        avatarColor="brown"
        title="요리책 만들기"
        actions={<>
          <Button label="취소" variant="soft" onPress={() => setShowCookbookDialog(false)} />
          <Button label="확인" variant="filled" onPress={() => { setShowCookbookDialog(false); showComingSoon(); }} />
        </>}>
        <TextInput
          placeholder="예: 제과"
          value={cookbookName}
          onChangeText={setCookbookName}
        />
      </Dialog>

      {/* PDF 미리보기 다이얼로그 */}
      <PdfPreviewDialog
        visible={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        html={pdfHtml}
        filename="모든 요리책"
      />

      {/* 스낵바 */}
      <View style={styles.snackbarWrapper}>
        <Snackbar
          message="기능 추가 예정입니다"
          visible={showSnackbar}
          onClose={() => setShowSnackbar(false)}
        />
      </View>

      {/* 하단 탭바 (항상 표시) */}
      <View style={styles.tabBarWrapper}>
        <BottomTabBar
          tabs={tabs}
          activeTab="home"
          expanded={showAddSheet}
          onClose={handleAddSheetClose}
          onAddItemPress={handleAddItemPress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SemanticColorsLight['surface-surfacedim'],
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
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
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 20,
  },
  snackbarWrapper: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  tabBarWrapper: {
    position: 'absolute',
    bottom: Spacing.lg,
    alignSelf: 'center',
    zIndex: 30,
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
  moreMenu: {
    position: 'absolute',
    top: 60,
    right: Spacing.md,
  },
});
