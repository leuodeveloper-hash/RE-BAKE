import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Button} from '@components/Button';
import {NavPillGroup} from '@components/Navigation/NavPillButton';
import {SvgProps} from 'react-native-svg';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {withAlpha} from '@utils/color';
import type {SemanticColors} from '@constants/tokens';
import {PrimitiveColors, Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';

export interface FloatingNoticeItem {
  label: string;
  icon?: React.FC<SvgProps>;
  onPress: () => void;
  /** 처리 중 — 아이콘 자리에 돌아가는 표시, 누르기 막음 */
  loading?: boolean;
}

export interface FloatingNoticeProps {
  /** 띄울 알림들 — 여럿이면 가운데에 나란히(새 버전 + 레시피 업데이트됨 등) */
  items: FloatingNoticeItem[];
  /** 화면 아래에서 띄울 거리(탭바·하단 바 위). 기본 110 */
  bottom?: number;
}

/**
 * 화면 아래쪽에 떠 있는 알림 버튼 — "업데이트됨"처럼 눌러서 바로 처리하는 한 줄 안내.
 * 떠 있는 유리 알약 안에 고스트 스몰 버튼. 위치(가운데·아래)는 이 컴포넌트가 정한다.
 */
/** 알림 알약 공통 — 업데이트됨 알림·과정 타이머가 같은 크기·색을 쓴다 */
export const NOTICE_COLOR = PrimitiveColors['blue/50'];
export const noticePillStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: Spacing.xs,
  height: 36,
  paddingHorizontal: Spacing.md,
  borderRadius: Radius['radius-full'],
};
export const noticeShadow = (color: string) => `0px 6px 16px -2px ${withAlpha(color, 0.45)}`;
export const noticeLabelStyle = {...Typography.caption.large, fontWeight: '600' as const};

export function FloatingNotice({items, bottom = 110}: FloatingNoticeProps) {
  const styles = useThemedStyles(createStyles);
  if (items.length === 0) return null;
  // 떠 있는 유리 컨테이너(앱바 알약과 같은 NavPillGroup) 안에 고스트 스몰 둥근 버튼 — 앱바 버튼들과 같은 타입
  return (
    <View pointerEvents="box-none" style={[styles.wrap, {bottom}]}>
      {items.map(item => (
        <NavPillGroup key={item.label}>
          <Button
            label={item.label}
            icon={item.icon}
            variant="ghost"
            size="small"
            loading={item.loading}
            disabled={item.loading}
            onPress={item.onPress}
          />
        </NavPillGroup>
      ))}
    </View>
  );
}

const createStyles = (_colors: SemanticColors) => StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    // 여럿이면 가운데에 나란히(사이 8)
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
});
