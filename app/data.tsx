import {PageScrollView} from '@components/Page';
import React, {useCallback, useState} from 'react';
import {Dialog} from '@components/Dialog/Dialog';
import {Button} from '@components/Button';
import {Alert, Platform, ScrollView, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
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
import {SectionHeader} from '@components/SectionHeader';
import app from '@config/firebase';
import {getFunctions, httpsCallable} from 'firebase/functions';
import {syncTimeLabel} from '@utils/dateLabel';

/**
 * 데이터 관리 — 설정에서 한 뎁스. 마지막 동기화 · 내보내기 · 가져오기 · 사진 클라우드 백업.
 */
export default function DataRoute() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  // 앱바는 안전영역(노치) 아래에 떠 있다 — 내용도 그만큼 내려야 앱바에 가리지 않는다
  const insets = useSafeAreaInsets();
  const {t} = useTranslation();
  const {showSnackbar} = useSnackbar();
  const {user, isAdmin} = useAuth();
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

  const restoreAt = useCallback(async (minutesAgo: number, scope?: 'explore') => {
    try {
      showSnackbar(`${minutesAgo}분 전 내용을 찾는 중…`);
      const res: any = await httpsCallable(getFunctions(app, 'asia-northeast3'), 'restoreRecipesAt')({minutesAgo, scope});
      const n = res?.data?.restored ?? 0;
      showSnackbar(n > 0 ? `복구본 ${n}개를 만들었어요. 홈에서 '(복구본 ${minutesAgo}분 전)'을 확인하세요` : `${minutesAgo}분 전과 지금이 같아요`);
    } catch (e: any) {
      showSnackbar(`되살리기 실패: ${e?.message ?? e}`, {tone: 'error'});
    }
  }, [showSnackbar]);

  // 사진 클라우드 백업은 Pro 기능 — 무료면 플랜을 보여준다
  // 끌 때는 한 번 묻는다 — 끄면 새로 넣는 사진이 이 기기에만 남아 다른 기기·웹에서 안 보인다
  const [confirmBackupOff, setConfirmBackupOff] = useState(false);
  const toggleBackup = useCallback((v: boolean) => {
    if (v && !isPro) { openPlanSheet(); return; }
    if (!v) { setConfirmBackupOff(true); return; }
    setPhotoCloudBackup(true);
  }, [isPro, openPlanSheet, setPhotoCloudBackup]);

  return (
    <View style={styles.container}>
      <PageScrollView>
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

        {/* 덮어쓴 레시피 되살리기 — 최근 1시간 안의 한 시점을 골라 그때 내용을 '(복구본)' 사본으로 넣는다 */}
        {user ? (
          <ContentContainer style={{marginTop: Spacing.lg}}>
            <SectionHeader title="덮어쓴 레시피 되살리기 (최근 1시간)" />
            <Card>
              {[5, 15, 30, 50].map((m, i, arr) => (
                <ListItem
                  key={m}
                  title={`${m}분 전 내용으로 복구본 만들기`}
                  leading={{type: 'icon', icon: IconImport}}
                  trailing={{type: 'icon', icon: IconChevronRight}}
                  showDivider={i < arr.length - 1}
                  onPress={() => restoreAt(m)}
                />
              ))}
            </Card>
            {/* 어드민 — 공식(둘러보기) 레시피도 같은 방식(복구본은 숨김으로 들어간다) */}
            {isAdmin ? (
              <>
                <SectionHeader title="공식 레시피 되살리기 (최근 1시간)" />
                <Card>
                  {[5, 15, 30, 50].map((m, i, arr) => (
                    <ListItem
                      key={m}
                      title={`${m}분 전 공식 레시피로 복구본 만들기`}
                      leading={{type: 'icon', icon: IconImport}}
                      trailing={{type: 'icon', icon: IconChevronRight}}
                      showDivider={i < arr.length - 1}
                      onPress={() => restoreAt(m, 'explore')}
                    />
                  ))}
                </Card>
              </>
            ) : null}
          </ContentContainer>
        ) : null}
      </PageScrollView>

      <Dialog
        visible={confirmBackupOff}
        onClose={() => setConfirmBackupOff(false)}
        icon={IconPhoto}
        avatarColor="lightblue"
        title={t('profile.photoBackupOffTitle')}
        description={t('profile.photoBackupOffDesc')}
        actions={
          <>
            <Button label={t('profile.photoBackupKeep')} variant="soft" onPress={() => setConfirmBackupOff(false)} />
            <Button
              label={t('profile.photoBackupTurnOff')}
              variant="soft"
              destructive
              onPress={() => { setConfirmBackupOff(false); setPhotoCloudBackup(false); }}
            />
          </>
        }
      />
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
