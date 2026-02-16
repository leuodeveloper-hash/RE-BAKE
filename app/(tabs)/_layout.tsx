import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Tabs, useRouter} from 'expo-router';
import {BlurView} from 'expo-blur';
import type {BottomTabBarProps as RNBottomTabBarProps} from '@react-navigation/bottom-tabs';
import {BottomTabBar, type TabItem, type AddMenuItem} from '@components/Layout/BottomTabBar';
import {Snackbar} from '@components/Snackbar';
import {Dialog} from '@components/Dialog';
import {Button} from '@components/Button';
import {TextInput} from '@components/TextInput';
import {useAddSheet} from '@contexts/AddSheetContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useRecipes} from '@contexts/RecipeContext';
import {useAuth} from '@contexts/AuthContext';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {
  IconHomeFilled,
  IconBookFilled,
  IconAdd,
  IconEarthFilled,
  IconUserFilled,
  IconNoteFilled,
  IconBookTwotone,
  IconTrash,
} from '@components/Icon/IconIndex';

// 탭 id → 라우트 이름 매핑
const TAB_ROUTES = ['index', 'group', '__add__', 'explore', 'profile'] as const;
const TAB_IDS = ['home', 'group', 'add', 'explore', 'profile'] as const;

function CustomTabBar({state, navigation}: RNBottomTabBarProps) {
  const router = useRouter();
  const {showAddSheet, setShowAddSheet} = useAddSheet();
  const {snackbar, clearSnackbar, showSnackbar} = useSnackbar();
  const {recipes, setRecipes} = useRecipes();
  const {isAdmin} = useAuth();
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const [showCookbookDialog, setShowCookbookDialog] = useState(false);
  const [cookbookName, setCookbookName] = useState('');

  // expo-router 탭 인덱스에서 activeTab id 결정
  const activeRouteName = state.routes[state.index]?.name;
  // recipe/[id] 등 서브 라우트에서는 직전 탭 유지 (home 기본)
  const activeTab = activeRouteName === 'index' ? 'home'
    : ['group', 'explore', 'profile'].includes(activeRouteName) ? activeRouteName
    : 'home';

  const tabs = useMemo<TabItem[]>(() => [
    {id: 'home', label: '홈', icon: IconHomeFilled, onPress: () => navigation.navigate('index')},
    {id: 'group', label: '그룹', icon: IconBookFilled, onPress: () => navigation.navigate('group')},
    {id: 'add', label: '추가', icon: IconAdd, onPress: () => setShowAddSheet(true)},
    {id: 'explore', label: '둘러보기', icon: IconEarthFilled, onPress: () => navigation.navigate('explore')},
    {id: 'profile', label: '나', icon: IconUserFilled, useRandomAvatar: true, onPress: () => navigation.navigate('profile')},
  ], [navigation, setShowAddSheet]);

  const addMenuItems = useMemo<AddMenuItem[]>(() => {
    const items: AddMenuItem[] = [
      {id: 'recipe', label: '레시피', icon: IconNoteFilled, iconColor: colors['custom-greenvar']},
      {id: 'cookbook', label: '요리책', icon: IconBookFilled, iconColor: colors['custom-brownvar']},
    ];
    if (isAdmin) {
      items.push({id: 'official', label: '공식 레시피', icon: IconNoteFilled, iconColor: colors['custom-yellow']});
    }
    return items;
  }, [colors, isAdmin]);

  const handleAddItemPress = useCallback((item: AddMenuItem) => {
    setShowAddSheet(false);
    if (item.id === 'recipe') {
      router.push('/recipe/edit');
    } else if (item.id === 'official') {
      router.push('/recipe/edit?official=true' as any);
    } else if (item.id === 'cookbook') {
      setCookbookName('');
      setShowCookbookDialog(true);
    }
  }, [router, setShowAddSheet]);

  const handleAddSheetClose = useCallback(() => {
    setShowAddSheet(false);
  }, [setShowAddSheet]);

  return (
    <>
      {/* 스크림 */}
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
          <Button label="확인" variant="filled" onPress={() => {
            setShowCookbookDialog(false);
            showSnackbar('기능 추가 예정입니다');
          }} />
        </>}>
        <TextInput
          placeholder="예: 제과"
          value={cookbookName}
          onChangeText={setCookbookName}
        />
      </Dialog>

      {/* 스낵바 */}
      <View style={styles.snackbarWrapper}>
        <Snackbar
          message={snackbar?.message ?? ''}
          action={snackbar?.action}
          visible={!!snackbar}
          onClose={clearSnackbar}
        />
      </View>

      {/* 탭바 */}
      <View style={styles.tabBarWrapper}>
        <BottomTabBar
          tabs={tabs}
          activeTab={activeTab}
          expanded={showAddSheet}
          onClose={handleAddSheetClose}
          addMenuItems={addMenuItems}
          onAddItemPress={handleAddItemPress}
        />
      </View>
    </>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{headerShown: false}}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="group" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
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
});
