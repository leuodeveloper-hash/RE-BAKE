import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {SemanticColorsLight, Radius} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {IconEllipsisVertical, IconPhoto} from '@components/Icon/IconIndex';
import {IconButton} from '@components/Layout/IconButton';

export type RecipeCardLayout = 'grid' | 'photoList' | 'list';

export interface RecipeCardProps {
  title: string;
  category?: string;
  method?: string;
  reviewCount?: number;
  imageUrl?: string;
  imageSource?: ImageSourcePropType;
  onPress?: () => void;
  onMenuPress?: () => void;
  layout?: RecipeCardLayout;
}

export function RecipeCard({
  title,
  category = '제과',
  method,
  reviewCount = 0,
  imageUrl,
  imageSource,
  onPress,
  onMenuPress,
  layout = 'grid',
}: RecipeCardProps) {
  const hasImage = imageUrl || imageSource;
  const subtitle = method
    ? `${category} · ${method} · ${reviewCount}개의 회고`
    : `${category} · ${reviewCount}개의 회고`;

  // List 레이아웃
  if (layout === 'list') {
    return (
      <View style={styles.listWrapper}>
        <Pressable
          style={({pressed}) => [
            styles.listContainer,
            pressed && styles.listContainerPressed,
          ]}
          onPress={onPress}>
          {/* 썸네일 */}
          <View style={styles.listThumbnail}>
            {hasImage ? (
              <Image
                source={imageSource || {uri: imageUrl}}
                style={styles.listImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.listPlaceholder}>
                <IconPhoto
                  width={24}
                  height={24}
                  color={SemanticColorsLight['foreground-onsurfacemuted']}
                />
              </View>
            )}
          </View>

          {/* 콘텐츠 */}
          <View style={styles.listContent}>
            <Text style={styles.listTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.listSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>

          {/* 메뉴 버튼 */}
          <View style={styles.listActions}>
            <IconButton
              icon={IconEllipsisVertical}
              onPress={onMenuPress}
              variant="ghost-secondary"
              size="small"
            />
          </View>
        </Pressable>
        <View style={styles.listDivider} />
      </View>
    );
  }

  // Grid / PhotoList 레이아웃
  const isPhotoList = layout === 'photoList';

  return (
    <TouchableOpacity
      style={[
        styles.gridContainer,
        isPhotoList && styles.photoListContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.8}>
      {/* Empty state (이미지 없을 때) */}
      {!hasImage && (
        <View style={styles.emptyState}>
          <IconPhoto
            width={40}
            height={40}
            color={SemanticColorsLight['foreground-onsurfacemuted']}
          />
        </View>
      )}

      {/* 썸네일 이미지 */}
      {hasImage && (
        <Image
          source={imageSource || {uri: imageUrl}}
          style={[StyleSheet.absoluteFill, styles.gridImage]}
          resizeMode="cover"
        />
      )}

      {/* 그라디언트 오버레이 (항상 적용) */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* 콘텐츠 */}
      <View style={styles.gridContent}>
        <Text style={styles.gridTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.gridSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Grid 레이아웃
  gridContainer: {
    width: '100%',
    aspectRatio: 292 / 194,
    borderRadius: 20,
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
  },
  photoListContainer: {
    aspectRatio: 292 / 117,
  },
  emptyState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SemanticColorsLight['surface-surfacecontainer'],
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  gridTitle: {
    fontFamily: Typography.title.medium.fontFamily,
    fontSize: Typography.title.medium.fontSize,
    fontWeight: Typography.title.medium.fontWeight as '700',
    lineHeight: Typography.title.medium.lineHeight,
    letterSpacing: 0,
    color: SemanticColorsLight['foreground-onsurfaceinverse'],
  },
  gridSubtitle: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    letterSpacing: -0.25,
    color: SemanticColorsLight['foreground-onsurfaceinversevar'],
  },

  // List 레이아웃
  listContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.sm,
    borderRadius: Radius['radius-lg'],
  },
  listContainerPressed: {
    backgroundColor: SemanticColorsLight['background-statelayers-surfacefocus_press'],
  },
  listThumbnail: {
    width: 68,
    height: 68,
    borderRadius: Radius['radius-sm'],
    overflow: 'hidden',
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  listPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SemanticColorsLight['surface-surfacecontainer'],
  },
  listContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  listTitle: {
    fontFamily: Typography.title.large.fontFamily,
    fontSize: Typography.title.large.fontSize,
    fontWeight: Typography.title.large.fontWeight as '700',
    lineHeight: Typography.title.large.lineHeight,
    letterSpacing: -0.25,
    color: SemanticColorsLight['foreground-onsurface'],
  },
  listSubtitle: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    letterSpacing: -0.25,
    color: SemanticColorsLight['foreground-onsurfacemuted'],
  },
  listActions: {
    paddingVertical: Spacing.xs,
  },
});
