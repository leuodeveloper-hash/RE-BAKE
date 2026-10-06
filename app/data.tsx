import React, {useCallback} from 'react';
import {Alert, Platform, ScrollView, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {AppBar, APPBAR_CONTENT_BOTTOM} from '@components/Navigation';
import {ContentContainer, Card} from '@components/Container';
import {ListItem} from '@components/ListItem';
import {Switch} from '@components/Switch';
import {IconArrowLeft, IconChevronRight, IconCloudFilled, IconExport, IconImport, IconPhoto} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useAuth} from '@contexts/AuthContext';
import {useRecipes} from '@contexts/RecipeContext';
import {useSubscription} from '@contexts/SubscriptionContext';
import {usePlanSheet} from '@contexts/PlanSheetContext';
import {useAuthSheet} from '@contexts/AuthSheetContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {goBackOr} from '@utils/navigation';
import {syncTimeLabel} from '@utils/dateLabel';

/**
 * 데이터 관리 — 설정에서 한 뎁스. 마지막 동기화 · 내보내기 · 가져오기 · 사진 클라우드 백업.
 */
export default function DataRoute() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const {t} = useTranslation();
  const {showSnackbar} = useSnackbar();
  const {user} = useAuth();
  const {recipes, exportRecipes, importRecipes, lastSyncedAt, lastSyncedDevice} = useRecipes();
  const {isPro, photoCloudBackup, setPhotoCloudBackup} = useSubscription();
  const {open: openPlanSheet} = usePlanSheet();
  const {open: openAuthSheet} = useAuthSheet();

  const syncLabel = lastSyncedAt
    ? (lastSyncedDevice ? `${lastSyncedDevice}, ${syncTimeLabel(lastSyncedAt, t)}` : syncTimeLabel(lastSyncedAt, t))
    : null;

  const handleExport = useCallback(async () => {
    try {
      await exportRecipes();
      showSnackbar(t('profile.exportSuccess'));
    } catch {
      showSnackbar(t('profile.exportFailed'));
    }
  }, [exportRecipes, showSnackbar, t]);

  const handleImport = useCallback(async () => {
    const confirmOverwrite = (count: number): Promise<boolean> => {
      const msg = t('profile.importOverwriteMessage', {count});
      if (Platform.OS === 'web') return Promise.resolve(window.confirm(msg));
      return new Promise(res => {
        Alert.alert(t('profile.importTitle'), msg, [
          {text: t('profile.importSkip'), style: 'cancel', onPress: () => res(false)},
          {text: t('profile.importOverwrite'), style: 'destructive', onPress: () => res(true)},
        ]);
      });
    };
    const ok = await importRecipes(confirmOverwrite);
    showSnackbar(ok ? t('profile.importSuccess') : t('profile.importFailed'));
  }, [importRecipes, showSnackbar, t]);

  // 사진 클라우드 백업은 Pro 기능 — 무료면 플랜을 보여준다
  const toggleBackup = useCallback((v: boolean) => {
    if (v && !isPro) { openPlanSheet(); return; }
    setPhotoCloudBackup(v);
  }, [isPro, openPlanSheet, setPhotoCloudBackup]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{paddingTop: APPBAR_CONTENT_BOTTOM + Spacing.lg, paddingBottom: 100}}>
        <ContentContainer>
          <Card>
            {/* 마지막 동기화 — 늘 맨 위. 로그인 전·기록 없을 땐 그 상태를 그대로 적는다 */}
            <ListItem
              title={t('profile.lastSync')}
              leading={{type: 'icon', icon: IconCloudFilled}}
              // 로그인 전엔 다른 줄처럼 값 + 화살표, 줄을 누르면 로그인
              trailingValue={user ? syncLabel ?? t('profile.syncNever') : t('profile.loginToSync')}
              trailing={user ? undefined : {type: 'icon', icon: IconChevronRight}}
              onPress={user ? undefined : () => openAuthSheet()}
              showDivider
            />
            <ListItem
              title={t('profile.export')}
              leading={{type: 'icon', icon: IconExport}}
              trailing={{type: 'icon', icon: IconChevronRight}}
              // 늘 눌린다 — 로그인 전이면 로그인, 레시피가 없으면 알림
              showDivider
              onPress={() => {
                if (!user) { openAuthSheet(); return; }
                if (recipes.length === 0) { showSnackbar(t('explore.noRecipesToExport')); return; }
                handleExport();
              }}
            />
            <ListItem
              title={t('profile.import')}
              leading={{type: 'icon', icon: IconImport}}
              trailing={{type: 'icon', icon: IconChevronRight}}
              showDivider
              onPress={handleImport}
            />
            <ListItem
              title={photoCloudBackup ? t('profile.photoCloudBackupOn') : t('profile.photoCloudBackupLocal')}
              leading={{type: 'icon', icon: IconPhoto}}
              onPress={() => toggleBackup(!photoCloudBackup)}
              trailing={{type: 'custom', element: <Switch value={photoCloudBackup} onValueChange={toggleBackup} />}}
              showDivider={false}
            />
          </Card>
        </ContentContainer>
      </ScrollView>

      <AppBar centered title={t('profile.dataManagement')} leftIcon={IconArrowLeft} onLeftPress={() => goBackOr(router)} />
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors['surface/dim'],
    },
  });
