import React, {useCallback} from 'react';
import {Linking, StyleProp, Text, TextStyle, View} from 'react-native';
import {IconArrowTopRight} from '@components/Icon/IconIndex';
import {useColors} from '@contexts/ThemeContext';
import {parseRichText} from '@utils/richText';

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
 * 링크는 옅은 보더 색 언더라인 + 우상단 화살표 아이콘.
 * 링크가 없으면 일반 Text와 동일하게 동작하므로 그냥 갈아끼워도 된다.
 */
export function RichText({children, style, numberOfLines, inline}: RichTextProps) {
  const colors = useColors();
  const segments = parseRichText(children ?? '');

  const open = useCallback((url: string) => {
    Linking.openURL(url).catch(() => { /* 열 수 없는 주소는 무시 */ });
  }, []);

  // 링크가 없으면 굳이 조각내지 않는다 (인라인이면 문자열 그대로)
  if (!segments.some(s => s.url)) {
    return inline
      ? <>{children}</>
      : <Text style={style} numberOfLines={numberOfLines}>{children}</Text>;
  }

  const parts = segments.map((seg, i) => seg.url ? (
    <Text
      key={i}
      onPress={() => open(seg.url!)}
      // 참고링크/출처(UrlField)와 동일한 링크 표현으로 통일:
      // 옅은 보더 색 언더라인 + 우상단 화살표
      style={{
        color: colors['custom/yellow-var'],
        textDecorationLine: 'underline',
        textDecorationColor: colors['border/normal'],
      }}>
      {seg.text}
      <View style={{transform: [{translateY: 2}]}}>
        <IconArrowTopRight width={14} height={14} color={colors['custom/yellow-var']} />
      </View>
    </Text>
  ) : (
    <Text key={i}>{seg.text}</Text>
  ));

  // 이미 <Text> 안이면 조각만 (바깥 Text를 또 만들면 스타일 상속이 깨진다)
  if (inline) return <>{parts}</>;

  return (
    <Text style={style} numberOfLines={numberOfLines}>{parts}</Text>
  );
}

export default RichText;
