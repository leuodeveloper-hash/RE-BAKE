import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {BottomSheet, sheetTileWidth} from './BottomSheet';
import {OptionTile} from '@components/OptionTile';
import {Menu} from '@components/Menu';
import {ListItem, LIST_ITEM_TITLE_TEXT} from '@components/ListItem';
import {IconThumbnail} from '@components/Thumbnail';
import {IconScanText, IconUrl, IconText, IconBookFilled, IconAdd} from '@components/Icon/IconIndex';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {photoSourceMenuItems, type PhotoSource} from '@utils/photoSourceMenu';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {Radius} from '@constants/tokens';

export type AddRecipeInput = 'text' | 'url' | PhotoSource;

export interface AddRecipeSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 위 3칸 — 이미지(촬영/갤러리)·URL·텍스트로 새 레시피를 채워 시작 */
  onStartRecipe: (input: AddRecipeInput) => void;
  /** 아래 줄 — 새 레시피북 만들기 */
  onCreateCookbook: () => void;
  /** 시트가 완전히 내려간 뒤 — 사진 고르기 등은 여기서 이어 한다(iOS) */
  onDismissed?: () => void;
}

/**
 * 하단 탭 [+] 시트. 아이콘 색: 이미지 오렌지 · URL 라임 · 텍스트 옐로우 · 레시피북 블루. 위는 3칸 버튼(OptionTile), 아래는 레시피북 만들기 줄(ListItem).
 * 이미지를 누르면 그 칸 아래로 촬영/갤러리 메뉴가 뜬다(공통 사진 메뉴와 같은 라벨).
 */
export function AddRecipeSheet({visible, onClose, onStartRecipe, onCreateCookbook, onDismissed}: AddRecipeSheetProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {t} = useTranslation();
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  // 3칸 — 재료 준비 칸과 같은 방식(숫자 폭 바깥 View + 안쪽은 꽉 채움)
  const {width: windowWidth} = useWindowDimensions();
  const tileWidth = sheetTileWidth(windowWidth, 3, ROW_PADDING, TILE_GAP);
  const cell = (key: string, tile: React.ReactNode, extra?: React.ReactNode) => (
    // 메뉴가 열린 칸은 형제(옆 칸·아래 줄)보다 위로 — 메뉴가 그 뒤에 가리지 않게
    <View key={key} style={[styles.cell, {width: tileWidth}, extra ? styles.cellRaised : null]}>{tile}{extra}</View>
  );
  useEffect(() => { if (!visible) setPhotoMenuOpen(false); }, [visible]);

  const start = (input: AddRecipeInput) => { onClose(); onStartRecipe(input); };

  return (
    <BottomSheet visible={visible} onClose={onClose} onDismissed={onDismissed}>
      <View style={styles.body}>
        {/* 메뉴가 아래 줄(레시피북 만들기) 위로 뜨게 줄 자체도 올린다 */}
        <View style={[styles.tiles, photoMenuOpen && styles.cellRaised]}>
          {[
                cell('image', <OptionTile icon={IconScanText} iconColor={colors['custom/orange-var']} label={t('layout.addImage')} size="large" surface="faint" gap={ICON_LABEL_GAP} labelStyle={LIST_ITEM_TITLE_TEXT}
                  style={styles.tileFill} onPress={() => setPhotoMenuOpen(v => !v)} />,
                  photoMenuOpen ? (
                    <Menu
                      items={photoSourceMenuItems(t)}
                      visible
                      onSelect={id => { setPhotoMenuOpen(false); start(id as PhotoSource); }}
                      onClose={() => setPhotoMenuOpen(false)}
                      style={styles.photoMenu}
                    />
                  ) : null),
                cell('url', <OptionTile icon={IconUrl} iconColor={colors['custom/lime-var']} label={t('layout.addUrl')} size="large" surface="faint" gap={ICON_LABEL_GAP} labelStyle={LIST_ITEM_TITLE_TEXT}
                  style={styles.tileFill} onPress={() => start('url')} />),
                cell('text', <OptionTile icon={IconText} iconColor={colors['custom/yellow-var']} label={t('layout.addText')} size="large" surface="faint" gap={ICON_LABEL_GAP} labelStyle={LIST_ITEM_TITLE_TEXT}
                  style={styles.tileFill} onPress={() => start('text')} />),
              ]}
        </View>
        <View style={styles.rowCard}>
          {/* 설정 목록과 같은 공통 줄 — 슬롯만 다르다(왼쪽 북 아바타, 오른쪽 +) */}
          <ListItem
            title={t('layout.addCookbook')}
            description={t('layout.addCookbookDesc')}
            leading={{type: 'custom', element: (
              <View style={styles.avatarSlot}><IconThumbnail size={THUMB} icon={IconBookFilled} iconColor={colors['custom/blue-var']} /></View>
            )}}
            trailing={{type: 'icon', icon: IconAdd}}
            onPress={() => { onClose(); onCreateCookbook(); }}
            padding={ROW_INNER}
            showDivider={false}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

/** 칸 줄 좌우 여백 · 칸 사이 */
const ROW_PADDING = Spacing.sm;
const TILE_GAP = Spacing.smd;
/** 아래 줄 안쪽 여백 16 + 썸네일 56 = 줄 높이 88 — 위 3칸도 같은 높이 */
const ROW_INNER = Spacing.md;
/** 3칸 버튼의 아이콘·라벨 사이 */
const ICON_LABEL_GAP = 6;
const THUMB = 56;
const ROW_HEIGHT = ROW_INNER * 2 + THUMB;
/** 북 아바타 ↔ 글씨 */
const AVATAR_TEXT_GAP = Spacing.md;

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  body: {
    paddingHorizontal: ROW_PADDING,
    paddingTop: Spacing.sm,
    gap: TILE_GAP,
  },
  tiles: {
    flexDirection: 'row',
    gap: TILE_GAP,
  },
  // 칸(바깥 View) — 숫자 폭은 tileWidth로, 늘거나 줄지 않게 고정
  cell: {
    height: ROW_HEIGHT,
    flexGrow: 0,
    flexShrink: 0,
  },
  cellRaised: {
    zIndex: 20,
    elevation: 20,
  },
  // 편집 화면 사진 칸 메뉴와 같은 자리 — 칸 바로 아래 왼쪽 정렬
  photoMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    zIndex: 20,
  },
  tileFill: {
    width: '100%',
    height: '100%',
  },
  rowCard: {
    borderRadius: Radius['radius-lg'],
    backgroundColor: colors['fill/faint'],
    overflow: 'hidden',
  },
  // 아바타 ↔ 글씨 16 — 공통 줄의 글 영역 기본 여백(8)에 8을 더한다
  avatarSlot: {
    marginRight: AVATAR_TEXT_GAP - Spacing.sm,
  },
});
