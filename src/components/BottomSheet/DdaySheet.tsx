import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {BottomSheet} from './BottomSheet';
import {Button} from '@components/Button';
import {TextInput} from '@components/TextInput';
import {CalendarPicker} from '@components/CalendarPicker';
import {SelectField} from '@components/SelectField';
import {InputGroup} from '@components/InputGroup';
import {MenuItem} from '@components/Menu';

import {shortDate} from '@utils/dateLabel';
import {useTranslation} from '@contexts/LanguageContext';
import {Spacing} from '@constants/spacing';
import {DDAY_REPEATS, type CustomDday, type DdayRepeat} from '@utils/customDdays';

const REPEAT_KEY: Record<DdayRepeat, string> = {
  none: 'dday.repeatNone', weekly: 'dday.repeatWeekly', monthly: 'dday.repeatMonthly', yearly: 'dday.repeatYearly',
};

export interface DdaySheetProps {
  visible: boolean;
  onClose: () => void;
  /** 고칠 D-day — 없으면 새로 만들기 */
  editing?: CustomDday | null;
  onSave: (value: {title: string; date: string; repeat: DdayRepeat}) => void;
  onDelete?: () => void;
}

/** 내 D-day 만들기·고치기 — 제목 · 날짜 · 반복. 날짜와 반복은 필드를 누르면 다음 단계(헤더 뒤로가기)에서 고른다 */
export function DdaySheet({visible, onClose, editing, onSave, onDelete}: DdaySheetProps) {
  const {t} = useTranslation();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [repeat, setRepeat] = useState<DdayRepeat>('none');
  // 단계 — 필드들(form) / 날짜 필드를 누르면 달력(date) / 반복 필드를 누르면 주기 목록(repeat)
  // 단계 — 필드들(form) / 날짜 필드 → 달력(date) / 반복 필드 → 주기 목록(repeat, 공통 MenuItem)
  // 반복을 드롭다운으로 펼치면 시트 아래에서 잘려 안 보여 다음 단계로 뺐다
  const [step, setStep] = useState<'form' | 'date' | 'repeat'>('form');
  useEffect(() => {
    if (!visible) return;
    setTitle(editing?.title ?? '');
    setDate(editing?.date ?? null);
    setRepeat(editing?.repeat ?? 'none');
    setStep('form');
  }, [visible, editing]);

  const canSave = !!title.trim() && !!date;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={step === 'date' ? t('dday.pickDate') : step === 'repeat' ? t('dday.repeat') : editing ? t('dday.editTitle') : t('dday.addTitle')}
      // 라벨 가운데 헤더 — 첫 단계는 좌측 닫기, 다음 단계는 좌측 뒤로가기만
      headerType="center"
      // 다음 단계에선 헤더 왼쪽 뒤로가기(공통 시트 헤더)
      onBack={step === 'form' ? undefined : () => setStep('form')}
      bottomAction={step !== 'form' ? undefined : (
        <>
          {editing && onDelete ? (
            <Button label={t('dday.delete')} variant="soft" onPress={() => { onDelete(); onClose(); }} style={{flex: 1}} />
          ) : null}
          <Button
            label={t('dday.save')}
            disabled={!canSave}
            onPress={() => { if (canSave) { onSave({title: title.trim(), date: date!, repeat}); onClose(); } }}
            style={{flex: 1}}
          />
        </>
      )}>
      <View style={styles.body}>
        {step === 'form' ? (
          <>
            {/* 로그인처럼 필드를 한 묶음으로 붙인다(공통 InputGroup) */}
            <InputGroup>
              <TextInput style="ghost" value={title} onChangeText={setTitle} placeholder={t('dday.titlePlaceholder')} maxLength={30} />
              {/* 날짜·반복은 누르면 다음 단계에서 고른다 */}
              <SelectField style="ghost" value={date ? shortDate(date) : null} placeholder={t('dday.datePlaceholder')} onPress={() => setStep('date')} />
              <SelectField style="ghost" value={t(REPEAT_KEY[repeat])} placeholder={t('dday.repeat')} onPress={() => setStep('repeat')} />
            </InputGroup>
          </>
        ) : step === 'repeat' ? (
          // 고르면 바로 앞 단계로
          <View>
            {DDAY_REPEATS.map(r => (
              <MenuItem key={r} id={r} label={t(REPEAT_KEY[r])} selected={r === repeat}
                onPress={() => { setRepeat(r); setStep('form'); }} />
            ))}
          </View>
        ) : (
          // 날짜를 누르면 바로 정해지고 앞 단계로 돌아간다
          <CalendarPicker value={date} onChange={d => { setDate(d); setStep('form'); }} />
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
});
