import React, {useState, useEffect} from 'react';
import {StyleSheet} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {Dialog} from './Dialog';
import {Card} from '@components/Container';
import {SectionHeader} from '@components/SectionHeader';
import {ListItem} from '@components/ListItem';
import {Button} from '@components/Button';
import {Spacing} from '@constants/spacing';
import {useTranslation} from '@contexts/LanguageContext';
import {
  IconPlusCircleFilled,
  IconMinusCircleFilled,
  IconBookFilled,
  IconExprolerBookFilled,
  IconPenTipFilled,
  IconDescriptionFilled, IconTitleFilled,
  IconClockFilled,
  IconLeafFilled,
  IconProcess,
  IconPhoto, IconCoverFilled,
  IconFlow,
  IconToolCaseFilled,
  IconUsersRoundFilled,
  IconWind,
  IconBlackNose,
  IconLink,
  IconImport, IconDoughTempFilled, IconSplitFilled} from '@components/Icon/IconIndex';

// 필드 정의
interface FieldDef {
  id: string;
  label: string;
  icon: React.FC<SvgProps>;
  fixed: boolean;
}

const makeAllFields = (t: (key: string) => string): FieldDef[] => [
  // 고정 — 레시피명·레시피 북·이미지(비어 있어도 늘 보이는 칸이라 끌 수 없다). 순서는 디자인 그대로
  {id: 'info', label: t('fieldManage.recipeInfo'), icon: IconTitleFilled, fixed: true},
  {id: 'cookbook', label: t('fieldManage.cookbook'), icon: IconBookFilled, fixed: true},
  {id: 'photo', label: t('fieldManage.photo'), icon: IconCoverFilled, fixed: true},
  {id: 'time', label: t('fieldManage.time'), icon: IconClockFilled, fixed: false},
  {id: 'ingredients', label: t('fieldManage.ingredients'), icon: IconLeafFilled, fixed: false},
  {id: 'tools', label: t('fieldManage.tools'), icon: IconToolCaseFilled, fixed: false},
  {id: 'steps', label: t('fieldManage.steps'), icon: IconFlow, fixed: false},
  {id: 'servings', label: t('fieldManage.servings'), icon: IconUsersRoundFilled, fixed: false},
  {id: 'doughTemp', label: t('fieldManage.doughTemp'), icon: IconDoughTempFilled, fixed: false},
  {id: 'method', label: t('fieldManage.method'), icon: IconProcess, fixed: false},
  {id: 'ratio', label: t('fieldManage.ratio'), icon: IconWind, fixed: false},
  {id: 'advice', label: t('fieldManage.advice'), icon: IconBlackNose, fixed: false},
  {id: 'review', label: t('fieldManage.review'), icon: IconPenTipFilled, fixed: false},
  {id: 'source', label: t('fieldManage.source'), icon: IconLink, fixed: false},
  // 설명 — 기본 꺼짐. 켜면 제목 카드 안(제목 아래)에 칸이 나오고, 상세에선 제목 아래 두 줄
  {id: 'description', label: t('fieldManage.description'), icon: IconDescriptionFilled, fixed: false},
  {id: 'divideWeight', label: t('fieldManage.divideWeight'), icon: IconSplitFilled, fixed: false},
  {id: 'origin', label: t('fieldManage.origin'), icon: IconImport, fixed: false},
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
    // 고정 필드는 늘 켜진 것으로 저장 — 예전 레시피에 빠져 있어도 화면에 나오게
    onConfirm([...new Set([...fixedFields.map(f => f.id), ...localActiveIds])]);
    onClose();
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      // 머리는 공통 시트 헤더(라벨 가운데 · 닫기) — 큰 아이콘 머리가 긴 목록 위에서 자리를 많이 먹었다
      headerType="center"
      title={t('fieldManage.title')}
      surface="dim"
      // 길면 공통 팝업이 스크롤 + 위아래 가림 그라디언트
      scrollMaxHeight={400}
      actions={
        <>
          <Button label={t('fieldManage.cancel')} variant="soft" onPress={onClose} />
          <Button label={t('fieldManage.confirm')} variant="filled" onPress={handleConfirm} />
        </>
      }>
      <>
        {/* 상세·설정과 같은 구조 — 회색 소제목 + 카드 */}
        <SectionHeader title={t('fieldManage.sectionActive')} />
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
                      icon: IconMinusCircleFilled,
                      onPress: () => handleRemove(field.id),
                      disabled: !canRemove(field.id),
                      variant: 'ghost-secondary',
                    }
              }
              showDivider={index < activeFields.length - 1}
            />
          ))}
        </Card>

        {/* 비활성 필드 (추가 가능) */}
        {inactiveOptional.length > 0 && (
          <>
          {/* 꺼진 필드 — 소제목 없이 간격만(디자인) */}
          <Card style={styles.availableCard}>
            {inactiveOptional.map((field, index) => (
              <ListItem
                key={field.id}
                title={field.label}
                leading={{type: 'icon', icon: field.icon}}
                trailing={{
                  type: 'iconButton',
                  icon: IconPlusCircleFilled,
                  onPress: () => handleAdd(field.id),
                  variant: 'ghost-secondary',
                }}
                showDivider={index < inactiveOptional.length - 1}
              />
            ))}
          </Card>
          </>
        )}
      </>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  availableCard: {
    marginTop: Spacing.md,
  },

});
