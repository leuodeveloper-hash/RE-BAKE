import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Dialog} from './Dialog';
import {Button} from '@components/Button';
import {TextInput} from '@components/TextInput';
import {Tabs} from '@components/Tabs';
import {InputGroup} from '@components/InputGroup';
import {NavPillButton} from '@components/Navigation/NavPillButton';
import {IconTrash} from '@components/Icon/IconIndex';
import {useTranslation} from '@contexts/LanguageContext';
import {Spacing} from '@constants/spacing';
import type {BakingMethod, MethodCategory} from '@constants/bakingMethods';

export interface DictionaryTermDialogProps {
  visible: boolean;
  onClose: () => void;
  /** 고칠 항목 — 없으면 새로 만들기 */
  term?: BakingMethod | null;
  /** 새로 만들 때 처음 분류(사전 페이지에서 보던 탭) */
  initialCategory?: MethodCategory;
  onSave: (v: {id?: string; name: string; description: string; category: MethodCategory}) => void;
  onDelete?: (id: string) => void;
}

/**
 * 사전 항목 하나 — 포스트잇처럼 한 장씩 만들고 고친다(어드민).
 * 이름 · 분류(제과/제빵) · 설명. 고칠 땐 헤더 오른쪽 알약에 삭제.
 */
export function DictionaryTermDialog({visible, onClose, term, initialCategory, onSave, onDelete}: DictionaryTermDialogProps) {
  const {t} = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MethodCategory>('pastry');
  // 열 때 값을 잡아 둔다 — 닫힘 애니메이션 중 term이 비어도 제목이 바뀌지 않게
  const [editId, setEditId] = useState<string | undefined>();

  useEffect(() => {
    if (!visible) return;
    setName(term?.name ?? '');
    setDescription(term?.description ?? '');
    setCategory(term?.category ?? initialCategory ?? 'pastry');
    setEditId(term?.id);
  }, [visible, term, initialCategory]);

  const canSave = !!name.trim() && !!description.trim();

  return (
    <Dialog
      position="top"
      visible={visible}
      onClose={onClose}
      // 머리는 일반 시트 헤더(라벨 가운데 · 왼쪽 X · 오른쪽 삭제 알약)
      headerType="center"
      title={editId ? t('dictionary.editTitle') : t('dictionary.createTitle')}
      headerRight={editId && onDelete ? (
        <NavPillButton icon={IconTrash} onPress={() => { onDelete(editId); onClose(); }} />
      ) : undefined}
      actions={<>
        <Button label={t('time.cancel')} variant="soft" onPress={onClose} />
        <Button
          label={t('time.confirm')}
          variant="filled"
          disabled={!canSave}
          onPress={() => { onSave({id: editId, name, description, category}); onClose(); }}
        />
      </>}>
      <View style={styles.content}>
        <Tabs
          tabs={[
            {id: 'pastry', label: t('methodGuide.pastry')},
            {id: 'bakery', label: t('methodGuide.bakery')},
          ]}
          selectedId={category}
          onSelect={id => setCategory(id as MethodCategory)}
          fullWidth
        />
        {/* 로그인 칸처럼 레이블 없이 한 덩어리(InputGroup) — 이름 / 설명 */}
        <InputGroup>
          <TextInput style="ghost" value={name} onChangeText={setName} placeholder={t('dictionary.namePlaceholder')} />
          <TextInput style="ghost" value={description} onChangeText={setDescription} placeholder={t('dictionary.descriptionPlaceholder')} multiline />
        </InputGroup>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
  },
});
