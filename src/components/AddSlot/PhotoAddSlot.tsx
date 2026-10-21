import React, {useState} from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {Menu, type MenuItemData} from '@components/Menu/Menu';
import {useTranslation} from '@contexts/LanguageContext';
import {photoSourceMenuItems} from '@utils/photoSourceMenu';
import {Spacing} from '@constants/spacing';
import {AddSlot, type AddSlotProps} from './AddSlot';

export interface PhotoAddSlotProps extends Omit<AddSlotProps, 'onPress'> {
  /** 고를 항목 — 기본 촬영 / 갤러리(공통 사진 넣기 메뉴). 하나면 메뉴 없이 바로 */
  items?: MenuItemData[];
  onSelect: (id: string) => void;
  /** 메뉴 열림/닫힘 — 감싼 쪽이 이 줄을 위 레이어로 올릴 때 */
  onOpenChange?: (open: boolean) => void;
  /** 칸을 감싸는 자리 스타일(기울임 등) */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * 사진 넣기 칸 — 점선 + 칸을 누르면 바로 아래 촬영 / 갤러리 메뉴.
 * 과정 사진·요리모드·조언 사진이 모두 이걸 쓴다(한 곳 고치면 다 바뀐다). 크기·바탕만 쓰는 곳에서 정한다
 */
export function PhotoAddSlot({items, onSelect, onOpenChange, containerStyle, ...slot}: PhotoAddSlotProps) {
  const {t} = useTranslation();
  const list = items ?? photoSourceMenuItems(t);
  const [open, setOpenState] = useState(false);
  const setOpen = (v: boolean) => { setOpenState(v); onOpenChange?.(v); };
  return (
    <View style={[styles.anchor, open && styles.anchorOpen, containerStyle]}>
      <AddSlot
        {...slot}
        onPress={() => {
          if (list.length === 1) onSelect(list[0].id);
          else setOpen(!open);
        }}
      />
      {list.length > 1 ? (
        <Menu
          items={list}
          visible={open}
          onSelect={id => { setOpen(false); onSelect(id); }}
          onClose={() => setOpen(false)}
          style={styles.menu}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // 메뉴가 아래 줄에 가리지 않게(드롭다운 z-index)
  anchor: {overflow: 'visible'},
  anchorOpen: {zIndex: 1000, elevation: 1000},
  menu: {position: 'absolute', top: '100%', left: 0, marginTop: Spacing.xs, zIndex: 1000, elevation: 1000},
});
