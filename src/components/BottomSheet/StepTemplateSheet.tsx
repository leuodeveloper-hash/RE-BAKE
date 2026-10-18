import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Image as ExpoImage} from 'expo-image';
import {BottomSheet} from './BottomSheet';
import {Card} from '@components/Container';
import {ListItem} from '@components/ListItem';
import {Button} from '@components/Button';
import {Menu} from '@components/Menu';
import {TextInput} from '@components/TextInput';
import {IconStarFilled, IconEllipsisVertical, IconEdit, IconTrash, IconProcess} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useTranslation} from '@contexts/LanguageContext';
import {useStepTemplates, type StepTemplate} from '@hooks/useStepTemplates';
import type {SemanticColors} from '@constants/tokens';
import {Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export interface StepTemplateSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 고르면 — 지금 과정 아래 새 과정으로 넣는다 */
  onPick: (tpl: StepTemplate) => void;
  /** 지금 커서가 있는 과정을 저장 — 비어 있으면 버튼이 꺼진다 */
  onSaveCurrent?: () => void;
  canSaveCurrent?: boolean;
}

/** 자주 쓰는 과정 — 골라 넣고, ⋮로 편집·삭제, 지금 과정을 저장한다 */
export function StepTemplateSheet({visible, onClose, onPick, onSaveCurrent, canSaveCurrent}: StepTemplateSheetProps) {
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const {templates, updateTemplate, removeTemplate} = useStepTemplates();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // 편집 중인 템플릿 — 있으면 시트가 편집 칸으로 바뀐다(뒤로가기로 목록)
  const [editing, setEditing] = useState<StepTemplate | null>(null);
  const [draft, setDraft] = useState({description: '', tip: '', caution: ''});

  useEffect(() => { if (!visible) { setMenuFor(null); setEditing(null); } }, [visible]);

  const startEdit = (tpl: StepTemplate) => {
    setMenuFor(null);
    setDraft({description: tpl.description, tip: tpl.tip ?? '', caution: tpl.caution ?? ''});
    setEditing(tpl);
  };

  if (editing) {
    return (
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title={t('stepTemplate.editTitle')}
        headerType="center"
        onBack={() => setEditing(null)}
        bottomAction={
          <Button
            label={t('stepTemplate.editSave')}
            variant="filled"
            style={{flex: 1}}
            disabled={!draft.description.trim() && !editing.photos?.length}
            onPress={() => { updateTemplate(editing.id, draft); setEditing(null); }}
          />
        }>
        <View style={styles.body}>
          <TextInput label={t('stepTemplate.fieldStep')} value={draft.description} onChangeText={v => setDraft(d => ({...d, description: v}))} multiline />
          <TextInput label={t('stepTemplate.fieldTip')} value={draft.tip} onChangeText={v => setDraft(d => ({...d, tip: v}))} multiline />
          <TextInput label={t('stepTemplate.fieldCaution')} value={draft.caution} onChangeText={v => setDraft(d => ({...d, caution: v}))} multiline variant="yellow" />
          {editing.photos?.length ? (
            <View style={styles.photoRow}>
              {editing.photos.map((p, i) => <ExpoImage key={i} source={{uri: p.uri}} style={styles.thumb} contentFit="cover" />)}
            </View>
          ) : null}
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('stepTemplate.title')}
      headerType="center"
      bottomAction={onSaveCurrent ? (
        <Button label={t('stepTemplate.saveCurrent')} variant="filled" onPress={onSaveCurrent} disabled={!canSaveCurrent} style={{flex: 1}} />
      ) : undefined}>
      <View style={styles.body}>
        {templates.length === 0 ? (
          <Text style={styles.empty}>{t('stepTemplate.empty')}</Text>
        ) : (
          // 메뉴가 열리면 카드 잘라내기를 풀고 그 줄을 위로(드롭다운 3종 세트)
          <Card style={menuFor ? {overflow: 'visible'} : undefined}>
            {templates.map((tpl, i) => {
              const isGroup = !!tpl.group;
              const sub = isGroup
                ? t('stepTemplate.groupSub', {count: tpl.group!.steps.length})
                : [tpl.tip, tpl.caution].filter(Boolean).join(' · ');
              const thumb = isGroup ? tpl.group!.steps.flatMap(st => st.photos ?? [])[0]?.uri : tpl.photos?.[0]?.uri;
              const open = menuFor === tpl.id;
              return (
                <View key={tpl.id} style={open ? styles.rowOpen : undefined}>
                  <ListItem
                    title={tpl.description || t('stepTemplate.photoOnly')}
                    description={sub || (tpl.photos?.length ? t('stepTemplate.photoCount', {count: tpl.photos.length}) : undefined)}
                    leading={thumb
                      ? {type: 'custom', element: <ExpoImage source={{uri: thumb}} style={styles.thumb} contentFit="cover" />}
                      : {type: 'icon', icon: isGroup ? IconProcess : IconStarFilled}}
                    trailing={{type: 'iconButton', icon: IconEllipsisVertical, variant: 'ghost-secondary', onPress: () => setMenuFor(open ? null : tpl.id)}}
                    onPress={() => onPick(tpl)}
                    showDivider={i < templates.length - 1}
                  />
                  <View pointerEvents="box-none" style={styles.menuAnchor}>
                    <Menu
                      items={[
                        // 묶음은 글을 칸 하나로 고칠 수 없다 — 삭제만(고치려면 레시피에서 고쳐 다시 저장)
                        ...(isGroup ? [] : [{id: 'edit', label: t('stepTemplate.edit'), icon: IconEdit}]),
                        {id: 'delete', label: t('stepTemplate.delete'), icon: IconTrash, destructive: true},
                      ]}
                      visible={open}
                      onSelect={id => {
                        if (id === 'edit') startEdit(tpl);
                        else { setMenuFor(null); removeTemplate(tpl.id); }
                      }}
                      onClose={() => setMenuFor(null)}
                    />
                  </View>
                </View>
              );
            })}
          </Card>
        )}
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  body: {paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, gap: Spacing.sm},
  empty: {...Typography.body.medium, color: colors['foreground/on-surface-muted'], textAlign: 'center', paddingVertical: Spacing.lg},
  thumb: {width: 40, height: 40, borderRadius: Radius['radius-sm']},
  photoRow: {flexDirection: 'row', gap: Spacing.sm},
  // 메뉴가 열린 줄 — 아래 줄들보다 위로
  rowOpen: {zIndex: 20, elevation: 20},
  // ⋮ 바로 아래 오른쪽 정렬
  menuAnchor: {position: 'absolute', right: Spacing.sm, top: '100%', zIndex: 20},
});
