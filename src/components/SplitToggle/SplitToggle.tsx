import React from 'react';
import {View} from 'react-native';
import {IconButton} from '@components/IconButton';
import {IconSliceVertical} from '@components/Icon/IconIndex';

/**
 * 분할 토글 — 줄마다 나눈 칸(분할) / 한 덩어리 글. 상세 보기·편집 쓰기 공통.
 * 머리줄 ⋮와 같은 작은 고스트 아이콘(편집 툴바 '묶음 나누기'와 같은 아이콘). 켜짐(분할)은 IconButton 'ghost-accent'(오렌지 var)
 */
/** 상세·편집 머리줄 모두 옆 버튼(⋮·+)과 같은 크기(medium, 28 칸) */
export function SplitToggle({split, onChange, disabled, size = 'medium'}: {split: boolean; onChange: (split: boolean) => void; disabled?: boolean; size?: 'small' | 'medium'}) {
  return (
    <View style={{width: 28, height: 28, alignItems: 'center', justifyContent: 'center'}}>
    <IconButton
      icon={IconSliceVertical}
      variant={split ? 'ghost-accent' : 'ghost-secondary'}
      size={size}
      // 켜도 꺼도 누를 때 바탕 없이 — 색만 바뀐다
      pressedBackground={false}
      disabled={disabled}
      onPress={() => onChange(!split)}
    />
    </View>
  );
}
