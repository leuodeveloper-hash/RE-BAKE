import React, {useCallback} from 'react';
import {Platform, StyleProp, Text, TextStyle, View} from 'react-native';
import {useRecipeLink, internalRecipeId} from '@contexts/RecipeLinkContext';
import {IconArrowTopRight} from '@components/Icon/IconIndex';
import {useColors} from '@contexts/ThemeContext';
import {parseRichText, isSecretUrl} from '@utils/richText';
import {SpoilerText} from '@components/SpoilerText';
import {splitMethodTerms} from '@constants/bakingMethods';
import type {SemanticColors} from '@constants/tokens';

/**
 * 모든 글자 링크의 공통 모양 — 본문 글자 색 그대로 + 보더 색 대시 밑줄.
 * (대시는 iOS·웹. 안드로이드는 지원하지 않아 실선으로 보인다)
 */
export const linkTextStyle = (colors: SemanticColors, opts?: {onImage?: boolean}): TextStyle => ({
  textDecorationLine: 'underline',
  // 점(dotted)은 너무 자잘해 대시(dashed)로 — 끊긴 선이지만 마디가 굵직하다
  textDecorationStyle: 'dashed',
  // 밑줄을 글자에서 띄운다(웹만 — iOS·안드로이드 글자 밑줄은 간격을 정할 수 없다)
  ...(Platform.OS === 'web' ? ({textUnderlineOffset: 4} as any) : null),
  // 사진 위(상세 히어로 등)에선 회색 보더가 안 보여 사진 위 전용 보더 색
  textDecorationColor: colors[opts?.onImage ? 'border/on-image' : 'border/strong'],
});

export interface RichTextProps {
  /** 마크다운 링크가 섞일 수 있는 원문 */
  children: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /**
   * 이미 <Text> 안에 있을 때 사용 — 바깥 <Text>를 만들지 않고 조각만 반환한다.
   * (중첩 Text 구조에서 스타일 상속을 깨뜨리지 않기 위함)
   */
  inline?: boolean;
}

/**
 * 본문 렌더 — [텍스트](url) 를 링크로 표시한다.
 * 링크는 보더 색 점선 밑줄(linkTextStyle) + 바깥 링크만 우상단 화살표. 공법 이름도 같은 밑줄로 링크된다.
 * 링크가 없으면 일반 Text와 동일하게 동작하므로 그냥 갈아끼워도 된다.
 */
export function RichText({children, style, numberOfLines, inline}: RichTextProps) {
  const colors = useColors();
  const segments = parseRichText(children ?? '');
  // 링크 종류별로 연다 — 팁은 바텀시트, 레시피는 앱 안 상세, 그 밖은 브라우저(RecipeLinkContext)
  const {openLink, linkKind, openMethod} = useRecipeLink();
  const open = useCallback((url: string) => openLink(url), [openLink]);
  const link = linkTextStyle(colors);

  // 링크 아닌 글 — 공법 이름(시폰법 등)은 밑줄 링크로, 누르면 정리해 둔 공법 설명 시트
  const plain = (text: string, key: number) => {
    const parts = openMethod ? splitMethodTerms(text) : [{text}];
    if (!parts.some(p => p.method)) return <Text key={key}>{text}</Text>;
    return (
      <Text key={key}>
        {parts.map((p, j) => p.method
          ? <Text key={j} onPress={() => openMethod!(p.method!)} style={link}>{p.text}</Text>
          : p.text)}
      </Text>
    );
  };
  const hasMethod = !!openMethod && segments.some(s => !s.url && splitMethodTerms(s.text).some(p => p.method));

  // 링크가 없으면 굳이 조각내지 않는다 (인라인이면 문자열 그대로)
  if (!segments.some(s => s.url) && !hasMethod) {
    return inline
      ? <>{children}</>
      : <Text style={style} numberOfLines={numberOfLines}>{children}</Text>;
  }

  const parts = segments.map((seg, i) => seg.url && isSecretUrl(seg.url) ? (
    // 비밀재료 — 글자 자리에 반짝이는 먼지 점(스포일러). 누르면 링크(팁 등)를 연다. 비공개·없는 링크면 가리기만
    <SpoilerText key={i} textStyle={style} onPress={linkKind(seg.url) === 'dead' ? undefined : () => open(seg.url!)}>{seg.text}</SpoilerText>
  ) : seg.url && linkKind(seg.url) === 'dead' ? (
    // 가리키는 레시피가 없거나 비공개 — 링크가 없는 것처럼 글자만
    <Text key={i}>{seg.text}</Text>
  ) : seg.url && linkKind(seg.url) === 'tip' ? (
    // 팁 링크 — 본문 글자 그대로에 밑줄만(화살표·색 없이). 누르면 팁 바텀시트
    <Text
      key={i}
      onPress={() => open(seg.url!)}
      style={link}>
      {seg.text}
    </Text>
  ) : seg.url ? (
    <Text
      key={i}
      onPress={() => open(seg.url!)}
      // 참고링크/출처(UrlField)와 동일한 링크 표현으로 통일:
      // 옅은 보더 색 언더라인 + 우상단 화살표
      // 노란 글자는 없앴다 — 본문 글자 색 그대로 + 밑줄
      style={link}>
      {seg.text}
      {/* 화살표는 밖(새 창)으로 나가는 링크에만 — 앱 안 레시피 링크는 밑줄만 */}
      {!internalRecipeId(seg.url) && (
        <View style={{transform: [{translateY: 2}]}}>
          <IconArrowTopRight width={14} height={14} color={colors['foreground/on-surface-muted']} />
        </View>
      )}
    </Text>
  ) : plain(seg.text, i));

  // 이미 <Text> 안이면 조각만 (바깥 Text를 또 만들면 스타일 상속이 깨진다)
  if (inline) return <>{parts}</>;

  return (
    <Text style={style} numberOfLines={numberOfLines}>{parts}</Text>
  );
}

export default RichText;
