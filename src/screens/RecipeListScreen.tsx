import React, {useCallback, useMemo, useState} from 'react';
import {Dimensions, FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {BlurView} from 'expo-blur';
import {AppBar, BottomTabBar, ContentContainer, contentAreaPadding, APPBAR_CONTENT_BOTTOM} from '@components/Layout';
import {RecipeCard, RecipeCardLayout} from '@components/Recipe/RecipeCard';
import {Menu} from '@components/Menu';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {MockRecipe} from '@data/mockRecipes';
import {Snackbar} from '@components/Snackbar';
import {Dialog, PdfPreviewDialog} from '@components/Dialog';
import {Button} from '@components/Button';
import {TextInput} from '@components/TextInput';
import {generateRecipeListHtml} from '@utils/generateRecipeHtml';
import {useRecipeStorage} from '@hooks/useRecipeStorage';
import {useEscapeKey} from '@hooks/useEscapeKey';
import {RecipeDetailScreen} from './RecipeDetailScreen';
import {RecipeEditScreen} from './RecipeEditScreen';
import {ProfileScreen} from './ProfileScreen';
import {GroupScreen} from './GroupScreen';
import {ExploreScreen} from './ExploreScreen';
import {generateRecipeHtml} from '@utils/generateRecipeHtml';
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
  IconTrashTwotone,
  IconBookTwotone,
  IconArrowDownToLine,
  IconEdit,
  IconHash,
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

// 카드 메뉴 아이템 (상세와 동일)
const CARD_MENU_ITEMS = [
  {id: 'remake', label: '다시 만들기', icon: IconHash},
  {id: 'edit', label: '편집', icon: IconEdit},
  {id: 'download', label: 'PDF 다운로드', icon: IconArrowDownToLine},
  {id: 'delete', label: '삭제', icon: IconTrash, destructive: true},
];


export function RecipeListScreen() {
  const styles = useThemedStyles(createStyles);
  const {recipes, setRecipes, exportRecipes, importRecipes} = useRecipeStorage();
  const [layout, setLayout] = useState<RecipeCardLayout>('grid');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<MockRecipe | null>(null);
  const [showEditScreen, setShowEditScreen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<MockRecipe | null>(null);
  const [editSection, setEditSection] = useState<string | undefined>(undefined);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [snackbar, setSnackbar] = useState<{message: string; action?: {label: string; onPress: () => void}} | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showCookbookDialog, setShowCookbookDialog] = useState(false);
  const [cookbookName, setCookbookName] = useState('');
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfHtml, setPdfHtml] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [showExplore, setShowExplore] = useState(false);
  const [showCookbookMenu, setShowCookbookMenu] = useState(false);
  const [selectedCookbook, setSelectedCookbook] = useState<string | null>(null);
  const [cardMenuTarget, setCardMenuTarget] = useState<MockRecipe | null>(null);
  const [cardMenuPosition, setCardMenuPosition] = useState<{top: number; right: number} | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MockRecipe | null>(null);

  const showComingSoon = useCallback(() => {
    setSnackbar({message: '기능 추가 예정입니다'});
  }, []);

  // ESC 키로 닫기 (우선순위: 메뉴 → 다이얼로그 → 시트 → 상세 → 서브탭 → 홈)
  useEscapeKey(useCallback(() => {
    if (deleteTarget) { setDeleteTarget(null); return true; }
    if (cardMenuTarget) { setCardMenuTarget(null); return true; }
    if (showLayoutMenu || showMoreMenu || showCookbookMenu) {
      setShowLayoutMenu(false); setShowMoreMenu(false); setShowCookbookMenu(false);
      return true;
    }
    if (showPdfPreview) { setShowPdfPreview(false); return true; }
    if (showDeleteAllDialog) { setShowDeleteAllDialog(false); return true; }
    if (showCookbookDialog) { setShowCookbookDialog(false); return true; }
    if (showAddSheet) { setShowAddSheet(false); return true; }
    if (showEditScreen) { setShowEditScreen(false); setEditingRecipe(null); return true; }
    if (selectedRecipe) { setSelectedRecipe(null); return true; }
    if (showExplore || showGroup || showProfile) {
      setShowExplore(false); setShowGroup(false); setShowProfile(false);
      return true;
    }
    return false;
  }, [deleteTarget, cardMenuTarget, showLayoutMenu, showMoreMenu, showCookbookMenu, showPdfPreview, showDeleteAllDialog, showCookbookDialog, showAddSheet, showEditScreen, selectedRecipe, showExplore, showGroup, showProfile]));

  // 탭 아이템 - add 탭에 onPress 연결
  const tabs = useMemo(
    () => [
      {id: 'home', label: '홈', icon: IconHomeFilled, onPress: () => { setSelectedRecipe(null); setShowProfile(false); setShowGroup(false); setShowExplore(false); }},
      {id: 'group', label: '그룹', icon: IconBookFilled, onPress: () => { setSelectedRecipe(null); setShowGroup(true); setShowProfile(false); setShowExplore(false); }},
      {id: 'add', label: '추가', icon: IconAdd, onPress: () => setShowAddSheet(true)},
      {id: 'explore', label: '둘러보기', icon: IconEarthFilled, onPress: () => { setSelectedRecipe(null); setShowExplore(true); setShowProfile(false); setShowGroup(false); }},
      {id: 'profile', label: '나', icon: IconUserFilled, useRandomAvatar: true, onPress: () => { setSelectedRecipe(null); setShowProfile(true); setShowExplore(false); setShowGroup(false); }},
    ],
    []
  );

  // 요리책 메뉴 아이템 (카테고리별)
  const availableCookbooks = useMemo(() => {
    return [...new Set(recipes.map(r => r.category).filter(Boolean))] as string[];
  }, [recipes]);

  const cookbookMenuItems = useMemo(() => {
    const categories = new Set(recipes.map(r => r.category || '그룹없음'));
    const items = [{id: '__all__', label: '모든 요리책', icon: IconBookFilled}];
    for (const cat of categories) {
      items.push({id: cat, label: cat, icon: IconBookFilled});
    }
    return items;
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    if (!selectedCookbook) return recipes;
    return recipes.filter(r => (r.category || '그룹없음') === selectedCookbook);
  }, [recipes, selectedCookbook]);

  const handleTitlePress = () => {
    setShowLayoutMenu(false);
    setShowMoreMenu(false);
    setShowCookbookMenu(prev => !prev);
  };

  const handleCookbookSelect = (id: string) => {
    setShowCookbookMenu(false);
    setSelectedCookbook(id === '__all__' ? null : id);
  };

  const handleFilterPress = () => {
    setShowMoreMenu(false);
    setShowCookbookMenu(false);
    setShowLayoutMenu(prev => !prev);
  };

  const handleMenuPress = () => {
    setShowLayoutMenu(false);
    setShowCookbookMenu(false);
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
      setShowDeleteAllDialog(true);
    }
  };

  const handleDeleteAll = useCallback(() => {
    const backup = [...recipes];
    setRecipes([]);
    setShowDeleteAllDialog(false);
    setSnackbar({
      message: `레시피 ${backup.length}개를 삭제했습니다`,
      action: {
        label: '되돌리기',
        onPress: () => setRecipes(backup),
      },
    });
  }, [recipes, setRecipes]);

  const handleDeleteRecipe = useCallback(() => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setRecipes(prev => prev.filter(r => r.id !== target.id));
    setDeleteTarget(null);
    if (selectedRecipe?.id === target.id) setSelectedRecipe(null);
    setSnackbar({
      message: `'${target.title}' 삭제했습니다`,
      action: {
        label: '되돌리기',
        onPress: () => setRecipes(prev => [...prev, target]),
      },
    });
  }, [deleteTarget, selectedRecipe, setRecipes]);

  const handleLayoutSelect = (id: string) => {
    setLayout(id as RecipeCardLayout);
    setShowLayoutMenu(false);
  };

  const handleCardMenuPress = useCallback((recipe: MockRecipe, position: {pageX: number; pageY: number; width: number; height: number}) => {
    setShowLayoutMenu(false);
    setShowMoreMenu(false);
    setShowCookbookMenu(false);
    const screenWidth = Dimensions.get('window').width;
    setCardMenuPosition({
      top: position.pageY + position.height + Spacing.xs,
      right: screenWidth - (position.pageX + position.width),
    });
    setCardMenuTarget(prev => (prev?.id === recipe.id ? null : recipe));
  }, []);

  const handleCardMenuSelect = useCallback((id: string) => {
    const target = cardMenuTarget;
    setCardMenuTarget(null);
    if (!target) return;
    if (id === 'edit') {
      setEditingRecipe(target);
      setShowEditScreen(true);
    } else if (id === 'download') {
      setPdfHtml(generateRecipeHtml({
        title: target.title,
        category: target.category,
        method: target.method,
        reviewCount: target.reviewCount,
        time: target.time,
        servings: target.servings,
        session: target.session,
        ingredientGroups: target.ingredientGroups ?? [],
        tools: target.tools ?? [],
        steps: target.steps,
        stepGroups: target.stepGroups,
      }));
      setShowPdfPreview(true);
    } else if (id === 'delete') {
      setDeleteTarget(target);
    } else if (id === 'remake') {
      showComingSoon();
    } else {
      showComingSoon();
    }
  }, [cardMenuTarget, showComingSoon]);

  const handleOverlayPress = () => {
    setShowLayoutMenu(false);
    setShowMoreMenu(false);
    setShowCookbookMenu(false);
    setCardMenuTarget(null);
  };

  const handleAddSheetClose = () => {
    setShowAddSheet(false);
  };

  // 그리드 레이아웃일 때만 2열
  const numColumns = layout === 'grid' ? 2 : 1;


  const handleImportRecipe = useCallback((recipe: MockRecipe) => {
    const copied: MockRecipe = {
      ...recipe,
      id: `user_${Date.now()}`,
      sourceId: recipe.id,
    };
    setRecipes(prev => [...prev, copied]);
    setSnackbar({
      message: '내 레시피에 저장했습니다',
      action: {
        label: '이동',
        onPress: () => {
          setSelectedRecipe(null);
          setShowExplore(false);
          setShowGroup(false);
          setShowProfile(false);
        },
      },
    });
  }, [setRecipes]);

  const myRecipeIds = useMemo(() => recipes.map(r => r.sourceId ?? r.id), [recipes]);

  const handleRenameCookbook = useCallback((oldName: string, newName: string) => {
    setRecipes(prev => prev.map(r =>
      r.category === oldName ? {...r, category: newName} : r,
    ));
  }, [setRecipes]);

  const handleAddItemPress = (item: {id: string}) => {
    setShowAddSheet(false);
    if (item.id === 'recipe') {
      setShowEditScreen(true);
    } else if (item.id === 'cookbook') {
      setCookbookName('');
      setShowCookbookDialog(true);
    }
  };

  // 편집 화면 표시 (탭바 없음 — 독립 화면)
  if (showEditScreen) {
    return (
      <RecipeEditScreen
        recipe={editingRecipe ?? undefined}
        cookbooks={availableCookbooks}
        initialSection={editSection}
        onClose={() => { setShowEditScreen(false); setEditingRecipe(null); setEditSection(undefined); }}
        onSave={(data) => {
          if (editingRecipe) {
            const updated = {...editingRecipe, ...data};
            setRecipes(prev => prev.map(r => r.id === editingRecipe.id ? updated : r));
            setSelectedRecipe(updated);
          }
          setShowEditScreen(false);
          setEditingRecipe(null);
          setEditSection(undefined);
        }}
      />
    );
  }

  // 현재 활성 탭
  const activeTab = showExplore ? 'explore' : showGroup ? 'group' : showProfile ? 'profile' : 'home';

  return (
    <View style={styles.container}>
      {/* 메인 콘텐츠 영역 */}
      {selectedRecipe ? (
        <RecipeDetailScreen
          title={selectedRecipe.title}
          category={selectedRecipe.category}
          method={selectedRecipe.method}
          reviewCount={selectedRecipe.reviewCount}
          reviews={selectedRecipe.reviews}
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
          onEdit={!showExplore ? (section?: string) => {
            setEditingRecipe(selectedRecipe);
            setEditSection(section);
            setShowEditScreen(true);
          } : undefined}
          onImport={showExplore && !myRecipeIds.includes(selectedRecipe.id)
            ? () => handleImportRecipe(selectedRecipe)
            : undefined}
          onDelete={!showExplore ? () => {
            setRecipes(prev => prev.filter(r => r.id !== selectedRecipe.id));
            setSelectedRecipe(null);
            setSnackbar({message: '레시피가 삭제되었습니다.'});
          } : undefined}
          onRemake={!showExplore ? showComingSoon : undefined}
          onUpdate={!showExplore ? (data) => {
            const updated = {...selectedRecipe, ...data} as MockRecipe;
            setRecipes(prev => prev.map(r => r.id === selectedRecipe.id ? updated : r));
            setSelectedRecipe(updated);
          } : undefined}
        />
      ) : showExplore ? (
        <ExploreScreen
          myRecipeIds={myRecipeIds}
          onImportRecipe={handleImportRecipe}
          onRecipePress={setSelectedRecipe}
          onComingSoon={showComingSoon}
        />
      ) : showGroup ? (
        <GroupScreen
          recipes={recipes}
          onComingSoon={showComingSoon}
          onRenameCookbook={handleRenameCookbook}
          onCookbookPress={(name) => {
            setSelectedCookbook(name);
            setShowGroup(false);
          }}
        />
      ) : showProfile ? (
        <ProfileScreen
          recipeCount={recipes.length}
          onBack={() => setShowProfile(false)}
          onExport={exportRecipes}
          onImport={importRecipes}
          onLogout={showComingSoon}
        />
      ) : (
        <>
          <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ContentContainer style={styles.contentWrapper} horizontalPadding={false}>
              {/* 레시피 리스트 */}
              <FlatList
                key={layout}
                data={filteredRecipes}
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
                      onMenuPress={(pos) => handleCardMenuPress(item, pos)}
                    />
                  </View>
                )}
              />

              {/* 오버레이 */}
              <Pressable
                style={styles.overlay}
                onPress={handleOverlayPress}
                pointerEvents={showLayoutMenu || showMoreMenu || showCookbookMenu || cardMenuTarget ? 'auto' : 'none'}
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
                items={MORE_MENU_ITEMS.map(item =>
                  item.id === 'deleteAll' ? {...item, disabled: recipes.length === 0} : item
                )}
                onSelect={handleMoreMenuSelect}
                style={styles.moreMenu}
                visible={showMoreMenu}
              />

            </ContentContainer>
          </SafeAreaView>

          {/* 상단 앱바 (리스트에서만) */}
          <AppBar
            title={selectedCookbook || '모든 요리책'}
            showDropdown
            onTitlePress={handleTitlePress}
            onAddPress={() => setShowEditScreen(true)}
            onFilterPress={handleFilterPress}
            onMenuPress={handleMenuPress}
            filterMenuOpen={showLayoutMenu}
            menuOpen={showMoreMenu}
            titleMenu={
              <Menu
                items={cookbookMenuItems}
                selectedId={selectedCookbook || '__all__'}
                onSelect={handleCookbookSelect}
                visible={showCookbookMenu}
              />
            }
          />

          {/* 카드 컨텍스트 메뉴 */}
          <Menu
            items={CARD_MENU_ITEMS}
            visible={!!cardMenuTarget}
            onSelect={handleCardMenuSelect}
            style={cardMenuPosition ? {
              position: 'absolute',
              top: cardMenuPosition.top,
              right: cardMenuPosition.right,
              zIndex: 50,
            } : undefined}
          />
        </>
      )}

      {/* 스크림 (추가 바텀시트 열릴 때) */}
      {showAddSheet && (
        <Pressable style={styles.scrim} onPress={handleAddSheetClose}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>
      )}

      {/* 전체 삭제 확인 다이얼로그 */}
      <Dialog
        visible={showDeleteAllDialog}
        onClose={() => setShowDeleteAllDialog(false)}
        icon={IconTrashTwotone}
        avatarColor="red"
        title="전체 삭제"
        actions={<>
          <Button label="취소" variant="soft" onPress={() => setShowDeleteAllDialog(false)} />
          <Button label="삭제" variant="filled" destructive onPress={handleDeleteAll} />
        </>}>
        <Text style={styles.deleteAllDescription}>
          모든 레시피 <Text style={styles.deleteAllCount}>{recipes.length}개</Text>가 삭제됩니다.{'\n'}이 작업은 되돌릴 수 있습니다.
        </Text>
      </Dialog>

      {/* 개별 삭제 확인 다이얼로그 */}
      <Dialog
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        icon={IconTrashTwotone}
        avatarColor="red"
        title="레시피 삭제"
        actions={<>
          <Button label="취소" variant="soft" onPress={() => setDeleteTarget(null)} />
          <Button label="삭제" variant="filled" destructive onPress={handleDeleteRecipe} />
        </>}>
        <Text style={styles.deleteAllDescription}>
          '<Text style={styles.deleteAllCount}>{deleteTarget?.title}</Text>'을(를) 삭제합니다.{'\n'}이 작업은 되돌릴 수 있습니다.
        </Text>
      </Dialog>

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
          message={snackbar?.message ?? ''}
          action={snackbar?.action}
          visible={!!snackbar}
          onClose={() => setSnackbar(null)}
        />
      </View>

      {/* 하단 탭바 (항상 표시) */}
      <View style={styles.tabBarWrapper}>
        <BottomTabBar
          tabs={tabs}
          activeTab={activeTab}
          expanded={showAddSheet}
          onClose={handleAddSheetClose}
          onAddItemPress={handleAddItemPress}
        />
      </View>
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
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
  },
  listContent: {
    ...contentAreaPadding,
  },
  row: {
    marginHorizontal: -Spacing.sm,
  },
  gridCardContainer: {
    flex: 1,
    maxWidth: '50%',
    paddingHorizontal: Spacing.sm,
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
    top: APPBAR_CONTENT_BOTTOM + Spacing.xs,
    right: Spacing.md,
  },
  moreMenu: {
    position: 'absolute',
    top: APPBAR_CONTENT_BOTTOM + Spacing.xs,
    right: Spacing.md,
  },
  deleteAllDescription: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '400',
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground-onsurfacemuted'],
  },
  deleteAllCount: {
    color: colors['foreground-onsurfacevar'],
  },
});
