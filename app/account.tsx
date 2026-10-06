import React, {useCallback, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {AppBar, APPBAR_CONTENT_BOTTOM} from '@components/Navigation';
import {ContentContainer, Card} from '@components/Container';
import {ListItem} from '@components/ListItem';
import {Dialog} from '@components/Dialog';
import {Button} from '@components/Button';
import {IconArrowLeft, IconTrash, IconMailFilled, IconChevronRight} from '@components/Icon/IconIndex';
import {TextInput} from '@components/TextInput';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useAuth} from '@contexts/AuthContext';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useTranslation} from '@contexts/LanguageContext';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {goBackOr} from '@utils/navigation';

/**
 * 계정 설정 — 설정에서 한 뎁스 들어온 화면. 이름·아이디·이메일 · 계정 삭제(로그아웃은 설정 맨 아래).
 * 계정 삭제는 되돌릴 수 없어 설정 첫 화면에 바로 두지 않고 여기 안에 둔다(확인 창을 거친다).
 */
export default function AccountRoute() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const {t} = useTranslation();
  const {showSnackbar} = useSnackbar();
  const {user, handle, displayName, deleteAccount, updateHandle, updateDisplayName} = useAuth();
  // 이름·아이디 고치기 — 어느 칸인지
  const [editing, setEditing] = useState<'name' | 'handle' | null>(null);
  const [draft, setDraft] = useState('');
  const openEdit = (which: 'name' | 'handle') => {
    setDraft(which === 'name' ? displayName ?? '' : (handle ?? '').replace(/^@/, ''));
    setEditing(which);
  };
  const saveEdit = useCallback(async () => {
    try {
      if (editing === 'handle') {
        const cleaned = draft.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!cleaned) { showSnackbar(t('profile.handleRequired')); return; }
        await updateHandle(cleaned);
        showSnackbar(t('profile.handleChanged'));
      } else {
        await updateDisplayName(draft.trim());
        showSnackbar(t('profile.displayNameChanged'));
      }
      setEditing(null);
    } catch {
      showSnackbar(t(editing === 'handle' ? 'profile.handleChangeFailed' : 'profile.displayNameChangeFailed'), {tone: 'error'});
    }
  }, [editing, draft, updateHandle, updateDisplayName, showSnackbar, t]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      setDeleteOpen(false);
      showSnackbar(t('profile.accountDeleted'));
      goBackOr(router);
    } catch (e) {
      console.error('[account] deleteAccount failed', e);
      showSnackbar(t('profile.deleteAccountFailed'), {tone: 'error'});
    } finally {
      setDeleting(false);
    }
  }, [deleteAccount, showSnackbar, t, router]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{paddingTop: APPBAR_CONTENT_BOTTOM + Spacing.lg, paddingBottom: 100}}>
        <ContentContainer style={styles.section}>
          <Card>
            {/* 이름·아이디는 눌러서 고친다, 이메일은 보기만 */}
            <ListItem
              title={t('profile.editDisplayName')}
              trailingValue={displayName || handle || ''}
              trailing={{type: 'icon', icon: IconChevronRight}}
              showDivider
              onPress={() => openEdit('name')}
            />
            <ListItem
              title={t('profile.editHandle')}
              trailingValue={handle ? `@${handle.replace(/^@/, '')}` : ''}
              trailing={{type: 'icon', icon: IconChevronRight}}
              showDivider
              onPress={() => openEdit('handle')}
            />
            <ListItem
              title={user?.email ?? ''}
              leading={{type: 'icon', icon: IconMailFilled}}
              showDivider={false}
            />
          </Card>
        </ContentContainer>
        <ContentContainer style={styles.section}>
          <Card>
            {/* 계정 삭제 — 앱 안에서 바로(앱스토어 요구). 확인 창을 거친다 */}
            <ListItem
              title={t('profile.deleteAccount')}
              leading={{type: 'icon', icon: IconTrash}}
              showDivider={false}
              onPress={() => setDeleteOpen(true)}
            />
          </Card>
        </ContentContainer>
      </ScrollView>

      <Dialog
        visible={deleteOpen}
        onClose={() => { if (!deleting) setDeleteOpen(false); }}
        title={t('profile.deleteAccountTitle')}
        description={t('profile.deleteAccountMessage')}
        actions={<>
          <Button label={t('common.cancel')} variant="soft" onPress={() => setDeleteOpen(false)} disabled={deleting} />
          <Button
            label={deleting ? t('profile.deleting') : t('profile.deleteAccountConfirm')}
            variant="filled"
            destructive
            disabled={deleting}
            onPress={handleDelete}
          />
        </>}
      />

      <Dialog
        position="top"
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'handle' ? t('profile.editHandle') : t('profile.editDisplayName')}
        actions={<>
          <Button label={t('common.cancel')} variant="soft" onPress={() => setEditing(null)} />
          <Button label={t('profile.save')} variant="filled" onPress={saveEdit} />
        </>}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={editing === 'handle' ? 'handle' : t('profile.displayNamePlaceholder')}
          autoCapitalize="none"
          autoFocus
          clearable
        />
      </Dialog>

      <AppBar
        centered
        title={t('profile.accountSettings')}
        leftIcon={IconArrowLeft}
        onLeftPress={() => goBackOr(router)}
      />
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors['surface/dim'],
    },
    section: {
      marginBottom: Spacing.lg,
    },
  });
