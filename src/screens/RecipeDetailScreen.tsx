import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import {SemanticColorsLight, BaseColors} from '@constants/tokens';
import {Typography} from '@constants/typography';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {ElevationLight} from '@constants/elevation';
import {
  IconArrowLeft,
  IconPlay,
  IconEllipsis,
  IconEllipsisVertical,
  IconClock,
  IconUsers,
  IconHash,
  IconHome,
  IconBook,
  IconAdd,
  IconSearch,
  IconUser,
  IconHash as IconHashMenu,
  IconEdit,
  IconArrowTop as IconDownload,
  IconTrash,
} from '@components/Icon/IconIndex';
import {OptionTile} from '@components/OptionTile';
import {TextInput} from '@components/TextInput';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface Ingredient {
  id: string;
  percentage: string;
  name: string;
  amount: string;
}

interface Step {
  id: string;
  number: number;
  text: string;
}

export const RecipeDetailScreen: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);

  const ingredients: Ingredient[] = [
    {id: '1', percentage: '100%', name: '박력분', amount: '25g'},
    {id: '2', percentage: '100%', name: '계란', amount: '25g'},
  ];

  const steps: Step[] = [
    {id: '1', number: 1, text: '물을 끓입니다.'},
    {id: '2', number: 2, text: '면을 넣습니다.'},
    {id: '3', number: 3, text: '스프와 고명을 넣습니다.'},
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header Image Section */}
      <View style={styles.headerImageContainer}>
        <View style={styles.gradient} />
        <View style={styles.headerContent}>
          <Text style={styles.recipeTitle}>레시피 이름</Text>
          <Text style={styles.recipeDescription}>설명</Text>
        </View>
      </View>

      {/* Top Navigation Bar */}
      <View style={styles.topNavBar}>
        <TouchableOpacity style={styles.topNavButton}>
          <View style={styles.topNavButtonContainer}>
            <IconArrowLeft width={20} height={20} fill={SemanticColorsLight['foreground-onsurface']} />
          </View>
        </TouchableOpacity>
        <View style={styles.topNavRight}>
          <TouchableOpacity style={styles.topNavButton}>
            <View style={styles.topNavButtonContainer}>
              <IconPlay width={20} height={20} fill={SemanticColorsLight['foreground-onsurface']} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.topNavButton}>
            <View style={styles.topNavButtonContainer}>
              <IconEllipsis width={20} height={20} fill={SemanticColorsLight['foreground-onsurface']} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topNavButton}
            onPress={() => setShowMenu(!showMenu)}>
            <View style={styles.topNavButtonContainer}>
              <IconEllipsisVertical width={20} height={20} fill={SemanticColorsLight['foreground-onsurface']} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Dropdown */}
      {showMenu && (
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem}>
            <IconHashMenu width={20} height={20} fill={SemanticColorsLight['foreground-onsurface']} />
            <Text style={styles.menuItemText}>다시 만들기: 2회차</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <IconEdit width={20} height={20} fill={SemanticColorsLight['foreground-onsurface']} />
            <Text style={styles.menuItemText}>편집</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <IconDownload width={20} height={20} fill={SemanticColorsLight['foreground-onsurface']} />
            <Text style={styles.menuItemText}>PDF 다운로드</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <IconTrash width={20} height={20} fill={SemanticColorsLight['foreground-error']} />
            <Text style={[styles.menuItemText, styles.menuItemTextError]}>삭제</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Metadata Cards */}
        <View style={styles.metadataRow}>
          <OptionTile
            icon={<IconClock width={16} height={16} fill={SemanticColorsLight['foreground-onsurface']} />}
            label="1시간 30분"
          />
          <OptionTile
            icon={<IconUsers width={16} height={16} fill={SemanticColorsLight['foreground-onsurface']} />}
            label="1개"
          />
          <OptionTile
            icon={<IconHash width={16} height={16} fill={SemanticColorsLight['foreground-onsurface']} />}
            label="1/3 회차"
          />
        </View>

        {/* Ingredients Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>재료</Text>
          <View style={styles.ingredientsContainer}>
            {ingredients.map((ingredient, index) => (
              <View key={ingredient.id}>
                <View style={styles.ingredientRow}>
                  <View style={styles.ingredientPercentage}>
                    <Text style={styles.ingredientPercentageText}>{ingredient.percentage}</Text>
                  </View>
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{ingredient.name}</Text>
                    <Text style={styles.ingredientAmount}>{ingredient.amount}</Text>
                  </View>
                </View>
                {index < ingredients.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Steps Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>과정</Text>
          <View style={styles.stepsContainer}>
            {steps.map((step, index) => (
              <View key={step.id}>
                <View style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{step.number}</Text>
                  </View>
                  <View style={styles.stepTextContainer}>
                    <Text style={styles.stepText}>{step.text}</Text>
                  </View>
                </View>
                {index < steps.length - 1 && <View style={styles.dividerInset} />}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem}>
          <IconHome width={24} height={24} fill={SemanticColorsLight['foreground-onsurfacemuted']} />
          <Text style={styles.tabLabel}>홈</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <IconBook width={24} height={24} fill={SemanticColorsLight['foreground-onsurfacemuted']} />
          <Text style={styles.tabLabel}>요리책</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <IconAdd width={24} height={24} fill={SemanticColorsLight['foreground-onsurfacemuted']} />
          <Text style={styles.tabLabel}>추가</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <IconSearch width={24} height={24} fill={SemanticColorsLight['foreground-onsurfacemuted']} />
          <Text style={styles.tabLabel}>둘러보기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <View style={styles.avatarContainer}>
            <IconUser width={24} height={24} fill={SemanticColorsLight['foreground-onprimary']} />
          </View>
          <Text style={styles.tabLabel}>나</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BaseColors['color-base-greybrown-10'],
  },
  headerImageContainer: {
    height: 320,
    width: '100%',
    backgroundColor: BaseColors['color-base-greybrown-30'],
    justifyContent: 'flex-end',
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerContent: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  recipeTitle: {
    ...Typography.headline.small,
    color: SemanticColorsLight['foreground-onprimary'],
    marginBottom: Spacing.md,
  },
  recipeDescription: {
    ...Typography.body.medium,
    color: SemanticColorsLight['foreground-onprimary'],
  },
  topNavBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    zIndex: 10,
  },
  topNavButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topNavButtonContainer: {
    backgroundColor: SemanticColorsLight['background-transparent'],
    borderRadius: Radius['radius-full'],
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...ElevationLight['4'],
  },
  topNavRight: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  menuContainer: {
    position: 'absolute',
    top: 64,
    right: Spacing.md,
    backgroundColor: SemanticColorsLight['surface-surface'],
    borderRadius: Radius['radius-md'],
    padding: Spacing.xs,
    minWidth: 200,
    ...ElevationLight['3'],
    zIndex: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  menuItemText: {
    ...Typography.title.medium,
    color: SemanticColorsLight['foreground-onsurface'],
  },
  menuItemTextError: {
    color: SemanticColorsLight['foreground-error'],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 120,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  metadataRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.label.large,
    color: SemanticColorsLight['foreground-onsurfacemuted'],
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  ingredientsContainer: {
    backgroundColor: SemanticColorsLight['surface-surfacebright'],
    borderRadius: Radius['radius-lg'],
    overflow: 'hidden',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    minHeight: 48,
  },
  ingredientPercentage: {
    width: 89,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs / 2,
  },
  ingredientPercentageText: {
    ...Typography.body.medium,
    color: SemanticColorsLight['foreground-onsurfacemuted'],
  },
  ingredientInfo: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs / 2,
  },
  ingredientName: {
    ...Typography.body.medium,
    color: SemanticColorsLight['foreground-onsurface'],
  },
  ingredientAmount: {
    ...Typography.body.medium,
    color: SemanticColorsLight['foreground-onsurface'],
  },
  divider: {
    height: 1,
    backgroundColor: SemanticColorsLight['border-borderlight'],
    marginLeft: Spacing.md,
  },
  stepsContainer: {
    backgroundColor: SemanticColorsLight['surface-surfacebright'],
    borderRadius: Radius['radius-md'],
    overflow: 'hidden',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    minHeight: 48,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: Radius['radius-full'],
    backgroundColor: SemanticColorsLight['surface-surfacecontainer'],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  stepNumberText: {
    ...Typography.body.medium,
    color: SemanticColorsLight['foreground-onsurfacevar'],
  },
  stepTextContainer: {
    flex: 1,
    paddingVertical: Spacing.xs / 2,
  },
  stepText: {
    ...Typography.body.medium,
    color: SemanticColorsLight['foreground-onsurface'],
  },
  dividerInset: {
    height: 1,
    backgroundColor: SemanticColorsLight['border-borderlight'],
    marginLeft: Spacing.xl + 28,
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: SemanticColorsLight['background-transparent'],
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius['radius-full'],
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    ...ElevationLight['4'],
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  tabLabel: {
    ...Typography.label['medium - semibold'],
    color: SemanticColorsLight['foreground-onsurfacemuted'],
  },
  avatarContainer: {
    width: 24,
    height: 24,
    borderRadius: Radius['radius-full'],
    backgroundColor: SemanticColorsLight['background-primarycontainer'],
    justifyContent: 'center',
    alignItems: 'center',
  },
});
