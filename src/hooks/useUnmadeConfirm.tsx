import React, {useCallback, useState} from 'react';
import {Dialog} from '@components/Dialog/Dialog';
import {Button} from '@components/Button';
import {IconTrashTwotone} from '@components/Icon/IconIndex';
import {useMadeStamps} from '@hooks/useMadeStamps';
import {useRecipeReviews} from '@hooks/useRecipeReviews';
import {useSnackbar} from '@contexts/SnackbarContext';
import {useTranslation} from '@contexts/LanguageContext';

/**
 * '만들었어요' 해제 — 회고는 만든 뒤에 쓰는 기록이라, 그 회차에 회고가 있으면 함께 지운다는 확인을 먼저 띄운다.
 * 회고가 없으면 바로 해제(되돌리기 스낵바). 상세 ⋮·목록 ⋮가 같이 쓴다.
 *   const {requestUnmade, unmadeDialog} = useUnmadeConfirm();
 *   requestUnmade(sessionKey(recipe));  …  {unmadeDialog}
 */
export function useUnmadeConfirm() {
  const {setMade} = useMadeStamps();
  const {reviewOf, saveReview} = useRecipeReviews();
  const {showSnackbar} = useSnackbar();
  const {t} = useTranslation();
  const [target, setTarget] = useState<string | null>(null);

  const unmadeNow = useCallback((key: string) => {
    setMade(key, false);
    showSnackbar(t('home.unmarked'), {label: t('home.undo'), onPress: () => setMade(key, true)});
  }, [setMade, showSnackbar, t]);

  const requestUnmade = useCallback((key: string) => {
    const rv = reviewOf(key);
    const hasReview = !!(rv && (rv.evaluation?.trim() || rv.improvement?.trim() || rv.photos?.length));
    if (hasReview) setTarget(key);
    else unmadeNow(key);
  }, [reviewOf, unmadeNow]);

  const confirm = useCallback(() => {
    if (!target) return;
    setMade(target, false);
    // 빈 회고로 저장하면 지운 것으로 기록된다(useRecipeReviews)
    saveReview(target, {evaluation: '', improvement: '', photos: []});
    showSnackbar(t('unmade.withReviewDone'));
    setTarget(null);
  }, [target, setMade, saveReview, showSnackbar, t]);

  const unmadeDialog = (
    <Dialog
      visible={!!target}
      onClose={() => setTarget(null)}
      icon={IconTrashTwotone}
      avatarColor="red"
      title={t('unmade.withReviewTitle')}
      description={t('unmade.withReviewDesc')}
      actions={
        <>
          <Button label={t('common.cancel')} variant="soft" onPress={() => setTarget(null)} style={{flex: 1}} />
          <Button label={t('unmade.withReviewConfirm')} variant="soft" destructive onPress={confirm} style={{flex: 1}} />
        </>
      }
    />
  );

  return {requestUnmade, unmadeDialog};
}
