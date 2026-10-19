import React from 'react';
import type {SvgProps} from 'react-native-svg';
import {IconArrowTop} from './IconIndex';

/** 아래 화살표 — 위 화살표(arrow_top)를 뒤집어 쓴다(같은 모양·굵기로 짝을 맞춘다) */
export function IconArrowBottom(props: SvgProps) {
  return <IconArrowTop {...props} style={[props.style, {transform: [{rotate: '180deg'}]}]} />;
}
