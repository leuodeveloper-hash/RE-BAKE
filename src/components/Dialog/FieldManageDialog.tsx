import React, {useState, useEffect} from 'react';
import {ScrollView, StyleSheet} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {Dialog} from './Dialog';
import {Card} from '@components/Container';
import {ListItem} from '@components/ListItem';
import {Button} from '@components/Button';
import {Spacing} from '@constants/spacing';
import {useTranslation} from '@contexts/LanguageContext';
import {
  IconAdd,
  IconBookFilled,
  IconBookTwotone,
  IconExprolerBookFilled,
  IconChartNoAxesGantt,
  IconDescription,
  IconClockFilled,
  IconLeafFilled,
  IconMinus,
  IconOpenbookFilled,
  IconPhoto,
  IconProcess,
  IconToolCaseFilled,
  IconUserFilled,
  IconWind,
  IconLogoSymbol,
  IconLink,
} from '@components/Icon/IconIndex';

// 필드 정의
interface FieldDef {
  id: string;
  label: string;
  icon: React.FC<SvgProps>;
  fixed: boolean;
}

const makeAllFields = (t: (key: string) => string): FieldDef[] => [
  {id: 'info', label: t('fieldManage.recipeInfo'), icon: IconDescription, fixed: true},
  {id: 'photo', label: t('fieldManage.photo'), icon: IconPhoto, fixed: true},
  {id: 'time', label: t('fieldManage.time'), icon: IconClockFilled, fixed: true},
  {id: 'ingredients', label: t('fieldManage.ingredients'), icon: IconLeafFilled, fixed: false},
  {id: 'tools', label: t('fieldManage.tools'), icon: IconToolCaseFilled, fixed: false},
  {id: 'steps', label: t('fieldManage.steps'), icon: IconProcess, fixed: true},
  {id: 'servings', label: t('fieldManage.servings'), icon: IconUserFilled, fixed: true},
  {id: 'method', label: t('fieldManage.method'), icon: IconOpenbookFilled, fixed: false},
  {id: 'ratio', label: t('fieldManage.ratio'), icon: IconWind, fixed: false},
  {id: 'cookbook', label: t('fieldManage.cookbook'), icon: IconBookFilled, fixed: false},
  {id: 'advice', label: t('fieldManage.advice'), icon: IconLogoSymbol, fixed: false},
  {id: 'review', label: t('fieldManage.review'), icon: IconChartNoAxesGantt, fixed: false},
  {id: 'source', label: t('fieldManage.source'), icon: IconLink, fixed: true},
];

export interface FieldManageDialogProps {
  visible: boolean;
  onClose: () => void;
  activeFieldIds: string[];
  onConfirm: (activeFieldIds: string[]) => void;
  /** 공식 레시피 북 편집 모드 */
  isExplore?: boolean;
}

export function FieldManageDialog({
  visible,
  onClose,
  activeFieldIds,
  onConfirm,
  isExplore,
}: FieldManageDialogProps) {
  const {t} = useTranslation();
  const [localActiveIds, setLocalActiveIds] = useState<string[]>(activeFieldIds);

  useEffect(() => {
    if (visible) {
      setLocalActiveIds(activeFieldIds);
    }
  }, [visible, activeFieldIds]);

  const allFields = makeAllFields(t);
  const fields = isExplore
    ? allFields.map(f => f.id === 'cookbook' ? {...f, fixed: true, icon: IconExprolerBookFilled} : f)
    : allFields;
  const fixedFields = fields.filter(f => f.fixed);
  const optionalFields = fields.filter(f => !f.fixed);
  const activeOptional = optionalFields.filter(f =>
    localActiveIds.includes(f.id),
  );
  const inactiveOptional = optionalFields.filter(
    f => !localActiveIds.includes(f.id),
  );
  const activeFields = [...fixedFields, ...activeOptional];

  const handleAdd = (fieldId: string) => {
    setLocalActiveIds(prev => [...prev, fieldId]);
  };

  // 재료/도구 중 하나는 반드시 활성
  const PAIRED_FIELDS = ['ingredients', 'tools'];

  const canRemove = (fieldId: string) => {
    if (!PAIRED_FIELDS.includes(fieldId)) return true;
    const otherActive = PAIRED_FIELDS.filter(id => id !== fieldId).some(id => localActiveIds.includes(id));
    return otherActive;
  };

  const handleRemove = (fieldId: string) => {
    if (!canRemove(fieldId)) return;
    setLocalActiveIds(prev => prev.filter(id => id !== fieldId));
  };

  const handleConfirm = () => {
    onConfirm(localActiveIds);
    onClose();
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      icon={IconBookTwotone}
      avatarColor="brown"
      title={t('fieldManage.title')}
      surface="dim"
      actions={
        <>
          <Button label={t('fieldManage.cancel')} variant="soft" onPress={onClose} />
          <Button label={t('fieldManage.confirm')} variant="filled" onPress={handleConfirm} />
        </>
      }>
      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}>
        {/* 활성 필드 */}
        <Card>
          {activeFields.map((field, index) => (
            <ListItem
              key={field.id}
              title={field.label}
              leading={{type: 'icon', icon: field.icon}}
              trailing={
                field.fixed
                  ? undefined
                  : {
                      type: 'iconButton',
                      icon: IconMinus,
                      onPress: () => handleRemove(field.id),
                      disabled: !canRemove(field.id),
                    }
              }
              showDivider={index < activeFields.length - 1}
            />
          ))}
        </Card>

        {/* 비활성 필드 (추가 가능) */}
        {inactiveOptional.length > 0 && (
          <Card style={styles.availableCard}>
            {inactiveOptional.map((field, index) => (
              <ListItem
                key={field.id}
                title={field.label}
                leading={{type: 'icon', icon: field.icon}}
                trailing={{
                  type: 'iconButton',
                  icon: IconAdd,
                  onPress: () => handleAdd(field.id),
                }}
                showDivider={index < inactiveOptional.length - 1}
              />
            ))}
          </Card>
        )}
      </ScrollView>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    maxHeight: 400,
  },
  availableCard: {
    marginTop: Spacing.smd,
  },
});
