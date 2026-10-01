import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useColors} from '@contexts/ThemeContext';
import {Card} from '@components/Container';
import {ListItem} from '@components/ListItem';
import {TextInput} from '@components/TextInput';
import {IconChartNoAxesGantt, IconCornerDownRight} from '@components/Icon/IconIndex';
import {useTranslation} from '@contexts/LanguageContext';
import {InputGroup} from '@components/InputGroup';

export interface ReviewFieldsProps {
  evaluation: string;
  improvement: string;
  onChangeEvaluation: (v: string) => void;
  onChangeImprovement: (v: string) => void;
  /** 평가 칸 ref — 편집 화면이 섹션 이동 시 포커스를 준다 */
  evaluationRef?: (node: any) => void;
  /**
   * 'card'(기본) = 편집 화면 회고 카드([회고] 제목 줄 + 칸).
   * 'group' = 제목 없이 로그인처럼 fill/subtle 묶음 — 회고 쓰기 시트용.
   */
  variant?: 'card' | 'group';
}

/**
 * 회고 입력 — 레시피 편집 화면의 회고 카드 형식 그대로
 * ([회고] 제목 줄 → 평가 → ↳ 개선점). 편집 화면·회고 창·만들었어요 시트가 같이 쓴다.
 * 자리마다 칸을 따로 만들면 한쪽만 한 칸이 되는 식으로 어긋난다(실제로 그랬다).
 */
export function ReviewFields({evaluation, improvement, onChangeEvaluation, onChangeImprovement, evaluationRef, variant = 'card'}: ReviewFieldsProps) {
  const {t} = useTranslation();
  const colors = useColors();
  if (variant === 'group') {
    return (
      <InputGroup>
        <TextInput
          ref={evaluationRef}
          style="ghost"
          multiline
          value={evaluation}
          onChangeText={onChangeEvaluation}
          placeholder={t('recipeEdit.reviewEvaluationPlaceholder')}
        />
        {/* 개선점 앞 ↳ — 카드 형식과 같게, 평가에 이어지는 칸임을 보여준다 */}
        <View style={styles.improvementRow}>
          <IconCornerDownRight width={18} height={18} color={colors['foreground/on-surface-muted']} />
          <View style={styles.improvementInput}>
            <TextInput
              style="ghost"
              multiline
              value={improvement}
              onChangeText={onChangeImprovement}
              placeholder={t('recipeEdit.reviewImprovementPlaceholder')}
            />
          </View>
        </View>
      </InputGroup>
    );
  }
  return (
    <Card>
      <ListItem
        title={t('recipeEdit.review')}
        leading={{type: 'icon', icon: IconChartNoAxesGantt}}
      />
      <ListItem showDivider>
        <TextInput
          ref={evaluationRef}
          style="ghost"
          multiline
          value={evaluation}
          onChangeText={onChangeEvaluation}
          placeholder={t('recipeEdit.reviewEvaluationPlaceholder')}
        />
      </ListItem>
      <ListItem
        leading={{type: 'icon', icon: IconCornerDownRight}}
        showDivider={false}
      >
        <TextInput
          style="ghost"
          multiline
          value={improvement}
          onChangeText={onChangeImprovement}
          placeholder={t('recipeEdit.reviewImprovementPlaceholder')}
        />
      </ListItem>
    </Card>
  );
}

const styles = StyleSheet.create({
  improvementRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  improvementInput: {
    flex: 1,
  },
});
