import React from 'react';
import {Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import {TextInput} from '@components/TextInput';
import {IconArrowTopRight} from '@components/Icon/IconIndex';
import {useColors} from '@contexts/ThemeContext';
import {useThemedStyles} from '@hooks/useThemedStyles';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export interface UrlFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  /** 유효한 URL일 때 탭 동작. 없으면 Linking.openURL */
  onOpen?: () => void;
  editable?: boolean;
  onSubmitEditing?: () => void;
  onBlur?: () => void;
  inputRef?: (node: any) => void;
}

/** http(s) 주소로 볼 수 있는지 — 입력칸/링크칩 전환 기준 */
export function isUrlLike(v: string): boolean {
  return /^https?:\/\/.+/.test(v.trim());
}

/**
 * URL 한 줄 필드 — 값이 유효한 주소면 "링크 칩"(언더라인 + 우상단 화살표),
 * 아니면 입력칸으로 보여준다.
 *
 * 참고링크·출처 등 여러 곳에서 같은 모양을 각자 조립하던 것을 하나로 합친 것.
 * 링크 표현(언더라인 + IconArrowTopRight)은 본문 링크(RichText)와도 동일하다.
 */
export function UrlField({
  value,
  onChangeText,
  placeholder,
  onOpen,
  editable = true,
  onSubmitEditing,
  onBlur,
  inputRef,
}: UrlFieldProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const trimmed = value.trim();

  if (isUrlLike(trimmed)) {
    return (
      <Pressable
        style={styles.chip}
        onPress={() => (onOpen ? onOpen() : Linking.openURL(trimmed).catch(() => {}))}>
        <Text style={styles.linkText} numberOfLines={1}>{trimmed}</Text>
        <IconArrowTopRight width={16} height={16} color={colors['foreground/on-surface-muted']} />
      </Pressable>
    );
  }

  return (
    <TextInput
      ref={inputRef as any}
      style="ghost"
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmitEditing}
      onBlur={onBlur}
      placeholder={placeholder}
      keyboardType="url"
      autoCapitalize="none"
      autoCorrect={false}
      editable={editable}
    />
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minWidth: 0,
    // ghost 입력은 padding:0이라 상하 여백이 없다.
    // 칩에만 여백을 주면 값 유무에 따라 이 필드만 위아래로 벌어져 어긋난다.
    minHeight: Typography.body.medium.lineHeight,
  },
  linkText: {
    flexShrink: 1,
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
    textDecorationLine: 'underline',
    textDecorationColor: colors['border/normal'],
  },
});

export default UrlField;
