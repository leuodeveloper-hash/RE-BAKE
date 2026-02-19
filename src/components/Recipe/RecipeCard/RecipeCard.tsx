import React, {useCallback, useRef} from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';
import {SvgProps} from 'react-native-svg';
import {IconEllipsisVertical, IconPhoto} from '@components/Icon/IconIndex';
import {IconButton} from '@components/IconButton';
import {Thumbnail} from '@components/Thumbnail';

// ---- 이미지 페이드인 (리모트 URI만, 로컬 번들은 즉시 표시) ----

const loadedUris = new Set<string>();

function FadeInImage(props: React.ComponentProps<typeof Image>) {
  const source = props.source;
  const uri = !!source && typeof source === 'object' && !Array.isArray(source) && 'uri' in source
    ? (source as {uri: string}).uri
    : null;
  const needsFade = !!uri && !loadedUris.has(uri);

  const opacity = useRef(new Animated.Value(needsFade ? 0 : 1)).current;

  const handleLoad = useCallback(() => {
    if (uri) loadedUris.add(uri);
    if (needsFade) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, []);

  if (!needsFade) return <Image {...props} />;

  return (
    <Animated.Image
      {...props}
      style={[props.style, {opacity}]}
      onLoad={handleLoad}
    />
  );
}

export type RecipeCardLayout = 'grid' | 'photoList' | 'list';

export interface RecipeCardProps {
  /** 레시피 ID (shared element transition tag 용) */
  id?: string;
  title: string;
  cookbook?: string;
  method?: string;
  specificGravity?: string;
  reviewCount?: number;
  sessionCount?: number;
  imageUrl?: string;
  imageSource?: ImageSourcePropType;
  onPress?: () => void;
  onMenuPress?: (position: {pageX: number; pageY: number; width: number; height: number}) => void;
  layout?: RecipeCardLayout;
  /** list 레이아웃 플레이스홀더 아이콘 (기본: IconPhoto) */
  placeholderIcon?: React.FC<SvgProps>;
  /** list 레이아웃 플레이스홀더 아이콘 색상 */
  placeholderIconColor?: string;
  /** list 레이아웃 trailing 아이콘 커스텀 (기본: IconEllipsisVertical) */
  trailingIcon?: React.FC<SvgProps>;
  /** trailing 아이콘 색상 */
  trailingIconColor?: string;
}

export function RecipeCard({
  id,
  title,
  cookbook,
  method,
  specificGravity,
  reviewCount = 0,
  sessionCount,
  imageUrl,
  imageSource,
  onPress,
  onMenuPress,
  layout = 'grid',
  placeholderIcon: PlaceholderIcon = IconPhoto,
  placeholderIconColor,
  trailingIcon,
  trailingIconColor,
}: RecipeCardProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const menuButtonRef = useRef<View>(null);
  const hasImage = imageUrl || imageSource;
  const parts = [cookbook, method].filter(Boolean);
  if (specificGravity) parts.push(`비중 ${specificGravity}`);
  if (sessionCount && sessionCount > 1) parts.push(`${sessionCount}개의 회차`);
  if (reviewCount > 0) parts.push(`${reviewCount}개의 회고`);
  const subtitle = parts.join(' · ');

  const handleMenuPress = useCallback(() => {
    menuButtonRef.current?.measureInWindow((x, y, width, height) => {
      onMenuPress?.({pageX: x, pageY: y, width, height});
    });
  }, [onMenuPress]);

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
          <Thumbnail
            icon={PlaceholderIcon}
            iconColor={placeholderIconColor || colors['foreground-onsurfacemuted']}>
            {hasImage && (
              <FadeInImage
                source={imageSource || {uri: imageUrl!}}
                style={styles.listImage}
                resizeMode="cover"
              />
            )}
          </Thumbnail>

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
          {(onMenuPress || trailingIcon) && (
            <View ref={menuButtonRef}>
              <IconButton
                icon={trailingIcon || IconEllipsisVertical}
                iconColor={trailingIconColor}
                onPress={handleMenuPress}
                variant="ghost-secondary"
                size="medium"
              />
            </View>
          )}
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
            color={colors['foreground-onsurfacemuted']}
          />
        </View>
      )}

      {/* 썸네일 이미지 */}
      {hasImage && (
        <FadeInImage
          source={imageSource || {uri: imageUrl!}}
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

      {/* 더보기 버튼 */}
      {onMenuPress && (
        <View ref={menuButtonRef} style={styles.gridMenuButton}>
          <IconButton
            icon={IconEllipsisVertical}
            onPress={handleMenuPress}
            variant="ghost-inverse"
            size="medium"
          />
        </View>
      )}

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

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  // Grid 레이아웃
  gridContainer: {
    width: '100%',
    aspectRatio: 292 / 194,
    borderRadius: 20,
    overflow: 'hidden',
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
    backgroundColor: colors['surface-surfacecontainer'],
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridMenuButton: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    zIndex: 1,
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
    color: colors['foreground-onimage'],
  },
  gridSubtitle: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground-onimagevar'],
  },

  // List 레이아웃
  listWrapper: {
    position: 'relative',
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors['border-borderlight'],
    marginLeft: 62 + Spacing.sm + Spacing.md,
  },
  listContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.sm,
    borderRadius: Radius['radius-lg'],
  },
  listContainerPressed: {
    backgroundColor: colors['background-statelayers-surfacefocus_press'],
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  listContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.smd,
    gap: Spacing.xs,
  },
  listTitle: {
    fontFamily: Typography.title.large.fontFamily,
    fontSize: Typography.title.large.fontSize,
    fontWeight: Typography.title.large.fontWeight as '700',
    lineHeight: Typography.title.large.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground-onsurface'],
  },
  listSubtitle: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground-onsurfacemuted'],
  },
});
