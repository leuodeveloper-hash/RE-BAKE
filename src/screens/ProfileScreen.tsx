import React, {useCallback, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  GlassContainer,
  IconButton,
  ContentContainer,
  Card,
  FloatingNavBar,
  navPillStyle,
} from '@components/Layout';
import {ListItem} from '@components/ListItem';
import {Avatar} from '@components/Avatar/Avatar';
import {Snackbar} from '@components/Snackbar';
import {SemanticColorsLight} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import {
  IconArrowLeft,
  IconImport,
  IconExport,
  IconChevronRight,
} from '@components/Icon/IconIndex';

export interface ProfileScreenProps {
  recipeCount: number;
  onBack: () => void;
  onExport: () => Promise<void>;
  onImport: () => Promise<boolean>;
  onComingSoon: () => void;
}

export function ProfileScreen({
  recipeCount,
  onBack,
  onExport,
  onImport,
  onComingSoon,
}: ProfileScreenProps) {
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);

  const showMessage = useCallback((msg: string) => {
    setSnackbarMessage(msg);
    setShowSnackbar(true);
  }, []);

  const handleExport = useCallback(async () => {
    try {
      await onExport();
      showMessage('데이터를 내보냈습니다');
    } catch {
      showMessage('내보내기에 실패했습니다');
    }
  }, [onExport, showMessage]);

  const handleImport = useCallback(async () => {
    const success = await onImport();
    if (success) {
      showMessage('데이터를 가져왔습니다');
    } else {
      showMessage('가져오기에 실패했습니다');
    }
  }, [onImport, showMessage]);

  return (
    <View style={styles.container}>
      {/* 상단 네비게이션 */}
      <FloatingNavBar
        left={
          <GlassContainer contentStyle={navPillStyle}>
            <IconButton
              icon={IconArrowLeft}
              variant="ghost-secondary"
              size="medium"
              onPress={onBack}
            />
          </GlassContainer>
        }
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* 프로필 섹션 */}
          <ContentContainer style={styles.profileSection}>
            <Avatar type="random" size="xlarge" shape="circle" seed={42} />
            <Text style={styles.profileName}>Baker</Text>
            <Text style={styles.profileSub}>레시피 {recipeCount}개</Text>
          </ContentContainer>

          {/* 데이터 관리 섹션 */}
          <ContentContainer style={styles.section}>
            <Text style={styles.sectionTitle}>데이터 관리</Text>
            <Card>
              <ListItem
                title="데이터 내보내기"
                leading={{type: 'icon', icon: IconExport}}
                trailing={{type: 'icon', icon: IconChevronRight}}
                onPress={handleExport}
              />
              <ListItem
                title="데이터 가져오기"
                leading={{type: 'icon', icon: IconImport}}
                trailing={{type: 'icon', icon: IconChevronRight}}
                showDivider={false}
                onPress={handleImport}
              />
            </Card>
          </ContentContainer>
        </ScrollView>
      </SafeAreaView>

      {/* 스낵바 */}
      <View style={styles.snackbarWrapper}>
        <Snackbar
          message={snackbarMessage}
          visible={showSnackbar}
          onClose={() => setShowSnackbar(false)}
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 80,
    paddingBottom: 120,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  profileName: {
    fontFamily: Typography.title.large.fontFamily,
    fontSize: Typography.title.large.fontSize,
    fontWeight: Typography.title.large.fontWeight as '700',
    lineHeight: Typography.title.large.lineHeight,
    color: SemanticColorsLight['foreground-onsurface'],
    marginTop: Spacing.md,
  },
  profileSub: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '400',
    lineHeight: Typography.body.medium.lineHeight,
    color: SemanticColorsLight['foreground-onsurfacemuted'],
    marginTop: Spacing.xs,
  },
  section: {
    paddingTop: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '500',
    lineHeight: Typography.label.medium.lineHeight,
    color: SemanticColorsLight['foreground-onsurfacemuted'],
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    marginTop: FONT_BASELINE_OFFSET,
  },
  snackbarWrapper: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
});
