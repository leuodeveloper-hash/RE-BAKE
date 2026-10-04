import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {BottomSheet} from './BottomSheet';
import {Button} from '@components/Button';
import {Tabs} from '@components/Tabs';
import {TextInput} from '@components/TextInput';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useAuth} from '@contexts/AuthContext';
import {useTranslation} from '@contexts/LanguageContext';
import {Spacing} from '@constants/spacing';
import type {SemanticColors} from '@constants/tokens';

// 종류는 저장하는 쪽(appInquiry)이 정의한다 — 두 군데에 두면 어긋난다
import type {InquiryKind} from '@utils/appInquiry';

const KINDS: InquiryKind[] = ['recipeLimit', 'bug', 'etc'];

export interface InquirySheetProps {
  visible: boolean;
  onClose: () => void;
  /** 열 때 미리 골라 둘 종류 — 한도 안내에서 열면 '레시피 한도'로 연다 */
  initialKind?: InquiryKind;
  onSubmit: (kind: InquiryKind, message: string, replyTo: string) => void;
}

/**
 * 앱 문의 보내기.
 *
 * mailto:로 메일 앱을 열면 받는 주소가 그대로 노출되고, 사용자는 앱을 벗어나
 * 다시 써야 한다. 여기서 쓰고 보내면 서버가 대신 전달한다.
 */
export function InquirySheet({visible, onClose, initialKind = 'etc', onSubmit}: InquirySheetProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const [kind, setKind] = useState<InquiryKind>(initialKind);
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState('');
  // 로그인했으면 답장 주소를 계정 이메일로 미리 채운다(고칠 수 있음). 홈·설정 어디서 열어도 같게 시트 안에서
  const {user} = useAuth();
  const accountEmail = user?.email ?? '';

  // 열 때마다 비운다 — 이전 내용이 남아 있으면 잘못 보낸다.
  // 종류는 들어온 자리에 맞춰 둔다(한도 안내 → '레시피 한도').
  useEffect(() => {
    if (visible) {
      setKind(initialKind);
      setMessage('');
      setReplyTo(accountEmail);
    }
  }, [visible, initialKind, accountEmail]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      // 공통 시트 헤더 — 라벨 가운데(다른 시트와 같게)
      headerType="center"
      // 설정 메뉴 라벨과 같은 이름
      title={t('profile.inquiry')}
      bottomAction={
        <Button
          label={t('inquiry.send')}
          onPress={() => { onSubmit(kind, message.trim(), replyTo.trim()); onClose(); }}
          disabled={message.trim().length === 0}
          style={{flex: 1}}
        />
      }>
      <View style={styles.body}>
        {/* 종류를 먼저 고르게 한다 — 자유 입력만 두면 분류가 안 돼 먼저 볼 것을 못 고른다 */}
        <Tabs
          tabs={KINDS.map(k => ({id: k, label: t(`inquiry.kind.${k}`)}))}
          selectedId={kind}
          onSelect={id => setKind(id as InquiryKind)}
          fullWidth
        />

        {/* 공통 TextInput(라벨 포함) — 직접 조립한 칸은 라벨·칸 간격과 여백이 제각각이었다 */}
        <TextInput
          label={t('inquiry.messageLabel')}
          placeholder={t('inquiry.placeholder')}
          value={message}
          onChangeText={setMessage}
          multiline
        />

        {/* 답을 받을 주소는 본인이 적는다 — 없으면 답장 없이 반영만 된다 */}
        <TextInput
          label={t('inquiry.replyToLabel')}
          placeholder={t('inquiry.replyToPlaceholder')}
          value={replyTo}
          onChangeText={setReplyTo}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  body: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
});
