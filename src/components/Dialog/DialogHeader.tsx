import React from 'react';
import {SheetHeader, type SheetHeaderProps} from '@components/BottomSheet/SheetHeader';

/** 팝업 여백 — 머리·내용·버튼 줄·카드 아래가 모두 이 값(시트는 24) */
export const DIALOG_PADDING = 20;

/**
 * 팝업 머리 — 시트 머리와 같은 형식(아이콘 머리 · 가운데 제목)이되 여백 20,
 * 제목은 Figma title-medium/bold(SemiBold 16/22). 팝업 여백·제목을 고칠 땐 여기서
 */
export function DialogHeader(props: Omit<SheetHeaderProps, 'inset'>) {
  return <SheetHeader {...props} inset={DIALOG_PADDING} />;
}
