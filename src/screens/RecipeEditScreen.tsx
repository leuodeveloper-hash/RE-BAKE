import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {SemanticColorsLight} from '@constants/tokens';
import {Typography} from '@constants/typography';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {TextInput} from '@components/TextInput';
import {OptionTile} from '@components/OptionTile';
import {
  IconClose,
  IconTick,
  IconArrowTop,
  IconPhoto,
  IconClock,
  IconUsers,
  IconHash,
  IconAdd,
  IconLeaf,
  IconList,
  IconChevronRight,
  IconSettings,
} from '@components/Icon/IconIndex';

export const RecipeEditScreen: React.FC = () => {
  const [recipeTitle, setRecipeTitle] = useState('');
  const [description, setDescription] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton}>
          <IconClose width={24} height={24} fill={SemanticColorsLight['foreground-onsurface']} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton}>
            <IconArrowTop width={24} height={24} fill={SemanticColorsLight['foreground-onsurface']} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerButton, styles.headerButtonActive]}>
            <IconTick width={24} height={24} fill={SemanticColorsLight['foreground-onprimary']} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <TextInput
            label="레시피 제목"
            placeholder="레시피 제목을 입력하세요"
            value={recipeTitle}
            onChangeText={setRecipeTitle}
            style="outlined"
          />
        </View>

        <View style={styles.section}>
          <TextInput
            label="설명"
            placeholder="설명을 입력하세요"
            value={description}
            onChangeText={setDescription}
            style="outlined"
            multiline
          />
        </View>

        <View style={styles.metadataRow}>
          <OptionTile
            icon={<IconPhoto width={16} height={16} fill={SemanticColorsLight['foreground-onsurface']} />}
            label="사진"
          />
          <OptionTile
            icon={<IconClock width={16} height={16} fill={SemanticColorsLight['foreground-onsurface']} />}
            label="1시간 30분"
          />
          <OptionTile
            icon={<IconUsers width={16} height={16} fill={SemanticColorsLight['foreground-onsurface']} />}
            label="분량"
          />
          <OptionTile
            icon={<IconHash width={16} height={16} fill={SemanticColorsLight['foreground-onsurface']} />}
            label="회차"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <IconLeaf width={20} height={20} fill={SemanticColorsLight['foreground-onsurface']} />
              <Text style={styles.sectionTitle}>재료</Text>
            </View>
            <TouchableOpacity>
              <IconAdd width={24} height={24} fill={SemanticColorsLight['foreground-onsurface']} />
            </TouchableOpacity>
          </View>

          <View style={styles.ingredientItem}>
            <View style={styles.ingredientInput}>
              <TextInput
                placeholder="예: 감자"
                style="ghost"
              />
            </View>
            <View style={styles.quantityContainer}>
              <Text style={styles.quantityText}>0g</Text>
              <View style={styles.quantityButtons}>
                <TouchableOpacity style={styles.quantityButton}>
                  <IconArrowTop width={16} height={16} fill={SemanticColorsLight['foreground-onsurface']} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.quantityButton}>
                  <IconArrowTop
                    width={16}
                    height={16}
                    fill={SemanticColorsLight['foreground-onsurface']}
                    style={{transform: [{rotate: '180deg'}]}}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.addButton}>
            <IconAdd width={24} height={24} fill={SemanticColorsLight['foreground-onsurface']} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.addGroupButton}>
            <Text style={styles.addGroupButtonText}>+ 재료 묶음 추가</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <IconList width={20} height={20} fill={SemanticColorsLight['foreground-onsurface']} />
              <Text style={styles.sectionTitle}>과정</Text>
            </View>
            <TouchableOpacity>
              <IconAdd width={24} height={24} fill={SemanticColorsLight['foreground-onsurface']} />
            </TouchableOpacity>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepInput}>
              <TextInput
                placeholder="예: 물과 반죽을 넣어 거품기로 친다."
                style="ghost"
                multiline
              />
            </View>
            <View style={styles.stepButtons}>
              <TouchableOpacity style={styles.stepButton}>
                <IconArrowTop width={16} height={16} fill={SemanticColorsLight['foreground-onsurface']} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.stepButton}>
                <IconArrowTop
                  width={16}
                  height={16}
                  fill={SemanticColorsLight['foreground-onsurface']}
                  style={{transform: [{rotate: '180deg'}]}}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.addButton}>
            <IconAdd width={24} height={24} fill={SemanticColorsLight['foreground-onsurface']} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.addGroupButton}>
            <Text style={styles.addGroupButtonText}>+ 과정 묶음 추가</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <IconList width={20} height={20} fill={SemanticColorsLight['foreground-onsurface']} />
              <Text style={styles.menuItemText}>회고</Text>
            </View>
            <IconChevronRight width={20} height={20} fill={SemanticColorsLight['foreground-onsurface']} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <IconSettings width={20} height={20} fill={SemanticColorsLight['foreground-onsurface']} />
              <Text style={styles.menuItemText}>필드 관리</Text>
            </View>
            <IconChevronRight width={20} height={20} fill={SemanticColorsLight['foreground-onsurface']} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SemanticColorsLight['surface-surfacebright'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  headerButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonActive: {
    backgroundColor: SemanticColorsLight['background-primarycontainer'],
    borderRadius: Radius['radius-full'],
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  metadataRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.title.small,
    color: SemanticColorsLight['foreground-onsurface'],
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  ingredientInput: {
    flex: 1,
    minHeight: 0,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  quantityText: {
    ...Typography.body.medium,
    color: SemanticColorsLight['foreground-onsurface'],
    minWidth: 40,
  },
  quantityButtons: {
    flexDirection: 'column',
  },
  quantityButton: {
    padding: Spacing.xs,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: Radius['radius-full'],
    backgroundColor: SemanticColorsLight['surface-surfacecontainer'],
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  addGroupButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius['radius-md'],
    borderWidth: 1,
    borderColor: SemanticColorsLight['border-border'],
    alignSelf: 'flex-start',
  },
  addGroupButtonText: {
    ...Typography.label.large,
    color: SemanticColorsLight['foreground-onsurface'],
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  stepInput: {
    flex: 1,
    minHeight: 0,
  },
  stepButtons: {
    flexDirection: 'column',
    paddingTop: Spacing.xs,
  },
  stepButton: {
    padding: Spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuItemText: {
    ...Typography.body.large,
    color: SemanticColorsLight['foreground-onsurface'],
  },
});
