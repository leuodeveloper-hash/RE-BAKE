import React, {useState, useEffect} from 'react';
import {ScrollView, StyleSheet} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {Dialog} from './Dialog';
import {Card} from '@components/Layout';
import {ListItem} from '@components/ListItem';
import {Button} from '@components/Button';
import {Spacing} from '@constants/spacing';
import {
  IconAdd,
  IconBookFilled,
  IconBookTwotone,
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
} from '@components/Icon/IconIndex';

// 필드 정의
interface FieldDef {
  id: string;
  label: string;
  icon: React.FC<SvgProps>;
  fixed: boolean;
}

const ALL_FIELDS: FieldDef[] = [
  {id: 'info', label: '레시피 정보', icon: IconDescription, fixed: true},
  {id: 'photo', label: '사진', icon: IconPhoto, fixed: true},
  {id: 'time', label: '시간', icon: IconClockFilled, fixed: true},
  {id: 'ingredients', label: '재료', icon: IconLeafFilled, fixed: true},
  {id: 'tools', label: '도구', icon: IconToolCaseFilled, fixed: false},
  {id: 'steps', label: '과정', icon: IconProcess, fixed: true},
  {id: 'servings', label: '분량', icon: IconUserFilled, fixed: true},
  {id: 'method', label: '공법', icon: IconOpenbookFilled, fixed: false},
  {id: 'ratio', label: '비중', icon: IconWind, fixed: false},
  {id: 'cookbook', label: '요리책', icon: IconBookFilled, fixed: false},
  {id: 'review', label: '회고', icon: IconChartNoAxesGantt, fixed: false},
];

export interface FieldManageDialogProps {
  visible: boolean;
  onClose: () => void;
  activeFieldIds: string[];
  onConfirm: (activeFieldIds: string[]) => void;
}

export function FieldManageDialog({
  visible,
  onClose,
  activeFieldIds,
  onConfirm,
}: FieldManageDialogProps) {
  const [localActiveIds, setLocalActiveIds] = useState<string[]>(activeFieldIds);

  useEffect(() => {
    if (visible) {
      setLocalActiveIds(activeFieldIds);
    }
  }, [visible, activeFieldIds]);

  const fixedFields = ALL_FIELDS.filter(f => f.fixed);
  const optionalFields = ALL_FIELDS.filter(f => !f.fixed);
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

  const handleRemove = (fieldId: string) => {
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
      title="필드 관리"
      surface="dim"
      actions={
        <>
          <Button label="취소" variant="soft" onPress={onClose} />
          <Button label="확인" variant="filled" onPress={handleConfirm} />
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
