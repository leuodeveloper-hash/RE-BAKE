import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  ImageStyle,
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Svg, {Defs, RadialGradient, Rect, Stop} from 'react-native-svg';
import MaskedView from '@react-native-masked-view/masked-view';

import {LinearGradient} from 'expo-linear-gradient';
import {Image as ExpoImage} from 'expo-image';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {triggerHaptic} from '@utils/haptics';
import {useColors, useTheme} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {SvgProps} from 'react-native-svg';
import {IconArrowTopRight, IconChartNoAxesGantt, IconEllipsisVertical, IconLockFilled, IconEyeClosed, IconPhoto} from '@components/Icon/IconIndex';
import {IconButton} from '@components/IconButton';
import {Thumbnail} from '@components/Thumbnail';

// ---- 무지개 radial shimmer (Apple Intelligence 스타일, 반경이 커지며 펄스) ----

function RainbowShimmer({loop = true}: {loop?: boolean}) {
  const progress = useRef(new Animated.Value(0)).current;
  const [size, setSize] = useState({w: 0, h: 0});

  useEffect(() => {
    const seq = Animated.timing(progress, {
      toValue: 1,
      duration: 1600,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });
    const runner = loop ? Animated.loop(seq) : seq;
    runner.start();
    return () => {
      if (loop) (runner as any).stop();
    };
  }, [progress, loop]);

  // 좌상 바깥 → 우하 바깥으로 대각선 이동
  const range = Math.max(size.w, size.h) * 1.4;
  const translateX = progress.interpolate({inputRange: [0, 1], outputRange: [-range, range]});
  const translateY = progress.interpolate({inputRange: [0, 1], outputRange: [-range, range]});
  // 보이지 않다가 페이드인 → 페이드아웃
  const opacity = progress.interpolate({inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.5, 0.5, 0]});

  return (
    <View
      style={[StyleSheet.absoluteFill, {overflow: 'hidden'}]}
      pointerEvents="none"
      onLayout={e => setSize({w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height})}>
      {size.w > 0 && (
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <Svg width="100%" height="100%">
              <Defs>
                <RadialGradient id="softmask" cx="50%" cy="50%" rx="70%" ry="70%">
                  <Stop offset="0%" stopColor="white" stopOpacity="1" />
                  <Stop offset="60%" stopColor="white" stopOpacity="0.7" />
                  <Stop offset="100%" stopColor="white" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#softmask)" />
            </Svg>
          }>
          <Animated.View
            style={{
              position: 'absolute',
              width: size.w * 2,
              height: size.h * 2,
              left: -size.w / 2,
              top: -size.h / 2,
              opacity,
              transform: [{translateX}, {translateY}],
            }}>
            <LinearGradient
              colors={[
                'rgba(150, 200, 80, 0)',
                'rgba(180, 200, 100, 0.08)',
                'rgba(220, 200, 120, 0.18)',
                'rgba(240, 180, 140, 0.25)',
                'rgba(235, 150, 160, 0.3)',
                'rgba(210, 140, 180, 0.25)',
                'rgba(180, 150, 210, 0.18)',
                'rgba(150, 170, 220, 0.08)',
                'rgba(140, 180, 230, 0)',
              ]}
              locations={[0, 0.15, 0.3, 0.4, 0.5, 0.6, 0.7, 0.85, 1]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </MaskedView>
      )}
    </View>
  );
}

// ---- 이미지 페이드인 (expo-image: memory+disk 캐시로 재로딩/깜빡임 방지) ----

const resizeToContentFit = {
  cover: 'cover',
  contain: 'contain',
  stretch: 'fill',
  center: 'none',
} as const;

// 로딩 블러업(뭉개짐→선명): 같은 이미지를 두 겹으로 깔고 뒤는 항상 블러,
// 앞(선명)은 expo-image 내장 transition(네이티브 크로스디졸브)으로 페이드인.
// ⚠️ 수동 onLoad+Animated는 쓰지 않는다 — 캐시된 이미지에서 onLoad가 안 떠
//    영영 블러로 멈추고(stuck blur), 마운트마다 opacity가 0으로 리셋돼 뷰 전환 때마다
//    다시 블러부터 시작했다. 네이티브 transition은 캐시에서도 안정적으로 발화하고
//    캐시 히트 시 거의 즉시 표시된다. (참고: feedback_rn_web_image_onload)
const LOAD_BLUR_RADIUS = 18;

function FadeInImage({
  source,
  style,
  resizeMode = 'cover',
  local = false,
}: {
  source: number | {uri: string};
  style?: StyleProp<ImageStyle | ViewStyle | TextStyle>;
  resizeMode?: keyof typeof resizeToContentFit;
  /** 로컬 require 이미지 여부 — true면 블러 백킹·페이드·다운샘플 모두 끔(즉시 또렷) */
  local?: boolean;
}) {
  const contentFit = resizeToContentFit[resizeMode];
  // source를 uri(또는 require 숫자) 기준으로 안정화한다. 부모가 리렌더될 때마다
  // {uri} 객체가 새로 만들어지면 expo-image가 같은 이미지를 재로딩하며 깜빡인다
  // (검색 중 타이핑마다 카드 썸네일 깜빡임). 같은 키면 레퍼런스를 유지해 재로딩 방지.
  const sourceKey = typeof source === 'object' && source !== null ? source.uri : source;
  const stableSource = useMemo(() => source, [sourceKey]);
  // 재활용 리스트(팩뷰/그리드)에서 뷰 재사용 시 옛 이미지 잔상 방지
  const recyclingKey = typeof sourceKey === 'string' ? sourceKey : String(sourceKey);
  // 로컬 require 이미지는 즉시 로드돼 로딩 블러업이 불필요하고, 투명 일러스트의 경우
  // 뒤 블러 복사본이 가장자리로 번져 "그림자(헤일로)"처럼 보인다. → 로컬이면 블러 끔.
  // ⚠️ source 모양(string/number/object)으로는 판별 불가(웹 require는 {uri} 객체라
  //    원격으로 오판됨) → 호출부가 원본 imageUrl로 local 플래그를 명시적으로 넘긴다.
  const isRemote = !local;
  return (
    <View style={[style as any, {overflow: 'hidden'}]}>
      {/* 뒤: 원격 이미지 로딩 중 "뭉개짐" 상태로 보이는 블러 레이어 */}
      {isRemote && (
      <ExpoImage
        source={stableSource}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        cachePolicy="memory-disk"
        recyclingKey={recyclingKey}
        blurRadius={LOAD_BLUR_RADIUS}
        pointerEvents="none"
      />
      )}
      {/* 앞: 선명한 레이어 — 원격은 네이티브 transition으로 페이드인, 로컬 require는
          즉시 로드되므로 transition 없이 바로 표시(투명 일러스트의 페이드 번짐 방지) */}
      <ExpoImage
        source={stableSource}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        cachePolicy="memory-disk"
        recyclingKey={recyclingKey}
        transition={isRemote ? {duration: 400, effect: 'cross-dissolve'} : undefined}
        // 로컬 일러스트는 다운샘플 끄고 원본 해상도로 그려 또렷하게(작게 줄어든 선화 번짐 방지)
        allowDownscaling={isRemote}
      />
    </View>
  );
}

// ---- 공통 stacked 카드 썸네일 (grid/list/팩뷰 모두 사용) ----

export function StackedThumbnail({
  size,
  imageUrl,
  colors,
  paperTitle,
  paperPreview,
  showPaper = true,
  radius: radiusOverride,
  fill = false,
  bare = false,
  transparent = false,
}: {
  size: number;
  imageUrl?: string | number;
  colors: ReturnType<typeof useColors>;
  paperTitle?: string;
  paperPreview?: string[];
  /** 이미지 뒤 종이 표시 여부 (이미지 없으면 항상 표시) */
  showPaper?: boolean;
  /** 카드/이미지 모서리 라운딩 (미지정 시 cardSize 비례 자동) */
  radius?: number;
  /** true면 카드가 size 박스를 꽉 채움(0.68 축소·팬 오프셋 없음). 책 표지용 정사각 이미지. */
  fill?: boolean;
  /** true면 이미지 카드의 그림자·테두리 제거 (책 표지 안 썸넬용) */
  bare?: boolean;
  /** true면 이미지 레이어 배경색 제거 (투명 일러스트가 떠 보이도록) */
  transparent?: boolean;
}) {
  const {isDark} = useTheme();
  // 흰 테두리 제거 후 경계가 보이도록 강한 그림자 사용 (토큰 strong보다 더 진하게 — 카드 전용 로컬값)
  const shadow = {
    boxShadow: isDark
      ? '0px 8px 16px -4px rgba(0, 0, 0, 0.52)'
      : '0px 8px 18px -4px rgba(14, 14, 13, 0.22)',
  } as const;
  const cardSize = fill ? size : size * 0.68;
  const radius = radiusOverride ?? cardSize * 0.18;
  const offset = size * 0.1;
  const paperPadding = cardSize * 0.12;
  const lineHeight = Math.max(cardSize * 0.04, 1.5);
  const lineGap = lineHeight * 0.9;
  const innerHeight = cardSize - 2 * paperPadding;
  const lineCount = Math.max(1, Math.floor((innerHeight + lineGap) / (lineHeight + lineGap)));
  // 폰트 크기는 cardSize에 비례
  const fontSize = Math.max(cardSize * 0.04, 4);
  const textLineHeight = fontSize * 1.3;
  const textMaxLines = Math.max(1, Math.floor(innerHeight / textLineHeight));
  const hasText = !!paperTitle || (paperPreview && paperPreview.length > 0);
  // 이미지 없으면 종이는 항상 표시 (빈 카드 방지)
  const renderPaper = showPaper || !imageUrl;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {/* 종이 — 이미지 있으면 우측 기울임, 없으면 정중앙 */}
      {renderPaper && (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: cardSize,
          height: cardSize,
          backgroundColor: colors['surface/bright'],
          borderRadius: radius,
          padding: paperPadding,
          transform: imageUrl
            ? [{translateX: offset}, {rotate: '8deg'}]
            : [],
          ...shadow,
          gap: hasText ? fontSize * 0.4 : lineGap,
        }}>
        {hasText ? (
          <>
            {!!paperTitle && (
              <Text
                style={{
                  fontSize,
                  lineHeight: textLineHeight,
                  color: colors['foreground/on-surface-muted'],
                  fontFamily: Typography.label.medium.fontFamily,
                  textAlign: 'left',
                }}
                numberOfLines={1}>
                {paperTitle}
              </Text>
            )}
            {paperPreview && paperPreview.length > 0 && (
              <Text
                style={{
                  fontSize,
                  lineHeight: textLineHeight,
                  color: colors['foreground/on-surface-muted'],
                  fontFamily: Typography.label.medium.fontFamily,
                  textAlign: 'justify',
                  width: '100%',
                }}
                numberOfLines={Math.max(1, textMaxLines - (paperTitle ? 1 : 0))}
                ellipsizeMode="tail">
                {paperPreview.join(' ')}
              </Text>
            )}
          </>
        ) : (
          Array.from({length: lineCount}).map((_, i) => (
            <View
              key={i}
              style={{
                width: '90%',
                height: lineHeight,
                borderRadius: lineHeight / 2,
                backgroundColor: colors['fill/faint'],
                opacity: 0.6,
              }}
            />
          ))
        )}
      </View>
      )}
      {/* 이미지 (앞쪽, 좌측 기울임) */}
      {/* 그림자(바깥) + 클립(안) 레이어 분리: iOS에서 boxShadow+overflow:'hidden'+
          borderRadius+rotate를 한 View에 같이 주면 코너 라운드가 깨져 한쪽만 둥글게
          렌더된다. 바깥은 그림자만, 안쪽은 overflow로 이미지만 클립한다. */}
      {imageUrl ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: cardSize,
            height: cardSize,
            backgroundColor: transparent ? 'transparent' : colors['surface/bright'],
            borderRadius: radius,
            // 종이가 같이 보일 때만 좌측 비킴+기울임(종이 노출), 종이 없으면 평평하게
            // (멀티 카드 팬은 FAN 회전만 적용돼 좌우 대칭 유지)
            transform: renderPaper
              ? [{translateX: -offset}, {rotate: '-8deg'}]
              : [{translateX: 0}, {rotate: '0deg'}],
            ...(bare ? {} : shadow),
          }}>
          <View style={{flex: 1, borderRadius: radius, overflow: 'hidden', ...(bare ? {} : {borderWidth: 1, borderColor: colors['surface/bright']})}}>
            <FadeInImage
              // 문자열 uri만 {uri}로 감싼다. 숫자(네이티브 require)·객체(웹 require)는
              // 그대로 expo-image에 넘겨야 한다. 웹에서 require(png)는 객체를 반환하므로
              // {uri: object}로 감싸면 expo-image 내부 startsWith 호출에서 크래시한다.
              source={typeof imageUrl === 'string' ? {uri: imageUrl} : imageUrl}
              // 문자열이 아니면(숫자/객체 require) 로컬 이미지 → 블러·페이드 끔
              local={typeof imageUrl !== 'string'}
              style={{width: '100%', height: '100%'}}
              resizeMode="cover"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ---- 그리드 썸네일: thumbnail 컨테이너 측정 후 StackedThumbnail에 사이즈 전달 ----

function GridThumbnail({
  styles,
  imageUrl,
  colors,
  paperTitle,
  paperPreview,
}: {
  styles: ReturnType<typeof createStyles>;
  imageUrl?: string;
  colors: ReturnType<typeof useColors>;
  paperTitle?: string;
  paperPreview?: string[];
}) {
  const [containerHeight, setContainerHeight] = useState(0);
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setContainerHeight(h);
  }, []);

  // 겹침(종이+기울임)은 팩뷰 전용. grid는 이미지 있으면 풀블리드 단일 이미지,
  // 이미지 없을 때만 미리보기 종이 카드를 단독(겹침 없이) 표시한다.
  return (
    <View style={styles.thumbnail} onLayout={handleLayout}>
      {imageUrl ? (
        <FadeInImage
          source={{uri: imageUrl}}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : containerHeight > 0 ? (
        <StackedThumbnail
          size={Math.min(containerHeight * 1.4, 180)}
          colors={colors}
          paperTitle={paperTitle}
          paperPreview={paperPreview}
          showPaper={false}
        />
      ) : null}
    </View>
  );
}

export type RecipeCardLayout = 'grid' | 'photoList' | 'list' | 'pack';

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
  /** 잠금 상태 (paywall용): BlurView 오버레이 + 잠금 아이콘 표시 */
  locked?: boolean;
  /** 비공개(숨김) — 제목 뒤에 자물쇠 표시 (어드민 전용 공식 콘텐츠 표시) */
  hidden?: boolean;
  /** list 레이아웃 크기 (기본: 'default', 'small': 44px 썸네일) */
  size?: 'default' | 'small';
  /** list 레이아웃 썸네일 앞 번호 */
  leadingNumber?: number;
  /** list 레이아웃 커스텀 서브타이틀 (제공 시 cookbook·method 대신 표시) */
  customSubtitle?: string;
  /** customSubtitle 최대 줄 수 (기본: 1). 설명형이면 2 등으로 늘려 두 줄 표시 */
  subtitleNumberOfLines?: number;
  /** 커스텀 서브타이틀 아이콘 */
  subtitleIcon?: React.FC<SvgProps>;
  /** grid 레이아웃 이미지 없을 때 종이에 표시할 미리보기 텍스트 라인 (재료 등) */
  paperPreview?: string[];
  /** 종이 상단에 단독 줄로 표시할 제목 */
  paperTitle?: string;
  /** grid 레이아웃 PDF 스타일 미리보기에 사용할 레시피 데이터 */
  recipePdfData?: import('@utils/generateRecipeHtml').RecipePdfData;
  /** list 레이아웃 하단 디바이더 숨김 (마지막 아이템/단독 아이템) */
  hideDivider?: boolean;
  /** 참고 링크(referenceUrl) 보유 여부 — 메타데이터 줄 맨 뒤에 링크 아이콘 표시 */
  hasReference?: boolean;
}

// 메타데이터 줄 링크 표시 아이콘 — list/grid/photoList 공통. (참고 링크 보유 표시)
function MetaLinkIcon({show, size, color}: {show: boolean; size: number; color: string}) {
  if (!show) return null;
  return <IconArrowTopRight width={size} height={size} color={color} />;
}

export function RecipeCard({
  id,
  title,
  cookbook,
  method,
  specificGravity,
  reviewCount = 0,
  imageUrl,
  onPress,
  onMenuPress,
  layout = 'grid',
  placeholderIcon: PlaceholderIcon = IconPhoto,
  placeholderIconColor,
  trailingIcon,
  trailingIconColor,
  locked = false,
  hidden = false,
  size = 'default',
  leadingNumber,
  customSubtitle,
  subtitleNumberOfLines = 1,
  subtitleIcon: SubtitleIcon,
  paperPreview,
  paperTitle,
  recipePdfData,
  hideDivider = false,
  hasReference = false,
}: RecipeCardProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const {t} = useTranslation();
  const menuButtonRef = useRef<View>(null);
  const hasImage = !!imageUrl;
  const parts = [cookbook, method].filter(Boolean);
  if (specificGravity) parts.push(t('recipeCard.specificGravity', {value: specificGravity}));
  const subtitle = parts.join(' · ');

  const handlePress = useCallback(() => {
    if (!onPress) return;
    triggerHaptic('light');
    onPress();
  }, [onPress]);

  const handleMenuPress = useCallback(() => {
    menuButtonRef.current?.measureInWindow((x, y, width, height) => {
      onMenuPress?.({pageX: x, pageY: y, width, height});
    });
  }, [onMenuPress]);

  // List 레이아웃
  if (layout === 'list') {
    const isSmall = size === 'small';
    return (
      <View style={styles.listWrapper}>
        <Pressable
          style={({pressed, focused}: {pressed: boolean; focused: boolean}) => [
            styles.listContainer,
            isSmall && styles.listContainerSmall,
            (pressed || focused) && styles.listContainerPressed,
          ]}
          onPress={handlePress}>
          {/* 번호 */}
          {leadingNumber != null && (
            <Text style={styles.leadingNumber}>{leadingNumber}</Text>
          )}

          {/* 썸네일 — 레시피 북 등 placeholderIcon 명시 시엔 원래 Thumbnail, 아니면 stacked */}
          {PlaceholderIcon !== IconPhoto ? (
            <View
              style={{
                width: isSmall ? 44 : 64,
                height: isSmall ? 44 : 64,
                borderRadius: isSmall ? Radius['radius-sm'] : Radius['radius-md'],
                backgroundColor: colors['fill/subtle'],
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
              {hasImage ? (
                <FadeInImage
                  source={{uri: imageUrl!}}
                  style={styles.listImage}
                  resizeMode="cover"
                />
              ) : (
                <PlaceholderIcon
                  width={isSmall ? 18 : 24}
                  height={isSmall ? 18 : 24}
                  color={placeholderIconColor || colors['foreground/on-surface-muted']}
                />
              )}
            </View>
          ) : (
            <View style={[styles.listStackedWrapper, {width: isSmall ? 44 : 64, height: isSmall ? 44 : 64}]}>
              {/* 겹침은 팩뷰 전용 — 이미지 있으면 슬롯을 꽉 채운 단일 썸네일,
                  없으면 미리보기 종이 카드를 단독(겹침 없이) 표시 */}
              <StackedThumbnail
                size={isSmall ? 44 : 64}
                imageUrl={imageUrl}
                colors={colors}
                paperTitle={paperTitle || title}
                paperPreview={paperPreview}
                showPaper={false}
                fill
              />
            </View>
          )}

          {/* 콘텐츠 */}
          <View style={isSmall ? styles.listContentSmall : styles.listContent}>
            {!!title && (
              <View style={styles.gridTitleRow}>
                {locked && (
                  <IconLockFilled width={16} height={16} color={colors['foreground/on-surface-muted']} />
                )}
                <Text style={isSmall ? styles.listTitleSmall : styles.listTitle} numberOfLines={1}>
                  {title}
                </Text>
                {hidden && (
                  <IconEyeClosed width={14} height={14} color={colors['foreground/on-surface-muted']} />
                )}
              </View>
            )}
            {customSubtitle ? (
              <View style={styles.listSubtitleRow}>
                {SubtitleIcon && (
                  <SubtitleIcon width={12} height={12} color={colors['foreground/on-surface-muted']} />
                )}
                <Text style={styles.listSubtitle} numberOfLines={subtitleNumberOfLines}>
                  {customSubtitle}
                </Text>
              </View>
            ) : (subtitle || reviewCount > 0 || hasReference) && (
              <View style={styles.listSubtitleRow}>
                {!!subtitle && (
                  <Text style={styles.listSubtitle} numberOfLines={1}>
                    {subtitle}
                  </Text>
                )}
                <MetaLinkIcon show={hasReference} size={12} color={colors['foreground/on-surface-muted']} />
                {reviewCount > 0 && (subtitle || hasReference) && (
                  <Text style={styles.listSubtitle}>·</Text>
                )}
                {reviewCount > 0 && (
                  <View style={styles.reviewBadge}>
                    <IconChartNoAxesGantt width={12} height={12} color={colors['foreground/on-surface-muted']} />
                    <Text style={styles.reviewBadgeText}>{reviewCount}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 메뉴 버튼 (잠금 여부 무관하게 trailing은 ...) */}
          {(onMenuPress || trailingIcon) ? (
            <View ref={menuButtonRef}>
              <IconButton
                icon={trailingIcon || IconEllipsisVertical}
                iconColor={trailingIconColor}
                onPress={handleMenuPress}
                variant="ghost-secondary"
                size={isSmall ? 'small' : 'medium'}
              />
            </View>
          ) : null}
        </Pressable>
        {!isSmall && !hideDivider && <View style={styles.listDivider} />}
      </View>
    );
  }

  // PhotoList 레이아웃 (이미지 풀블리드 + 그라디언트 오버레이)
  if (layout === 'photoList') {
    return (
      <TouchableOpacity
        style={[styles.gridContainer, styles.photoListContainer]}
        onPress={handlePress}
        activeOpacity={0.8}>
        {!hasImage && (
          <View style={styles.emptyState}>
            <IconPhoto
              width={40}
              height={40}
              color={colors['foreground/on-surface-muted']}
            />
          </View>
        )}

        {hasImage && (
          <FadeInImage
            source={{uri: imageUrl!}}
            style={[StyleSheet.absoluteFill, styles.gridImage]}
            resizeMode="cover"
          />
        )}

        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        {onMenuPress ? (
          <View ref={menuButtonRef} style={styles.gridMenuButton}>
            <IconButton
              icon={IconEllipsisVertical}
              onPress={handleMenuPress}
              variant="ghost-inverse"
              size="medium"
            />
          </View>
        ) : null}

        <View style={styles.photoListContent}>
          <View style={styles.gridTitleRow}>
            {locked && (
              <IconLockFilled width={16} height={16} color="rgba(255,255,255,0.9)" />
            )}
            <Text style={styles.photoListTitle} numberOfLines={1}>{title}</Text>
            {hidden && (
              <IconEyeClosed width={14} height={14} color="rgba(255,255,255,0.9)" />
            )}
          </View>
          <View style={styles.gridSubtitleRow}>
            {!!subtitle && <Text style={styles.photoListSubtitle} numberOfLines={1}>{subtitle}</Text>}
            <MetaLinkIcon show={hasReference} size={10} color="rgba(255,255,255,0.7)" />
            {reviewCount > 0 && (subtitle || hasReference) && <Text style={styles.photoListSubtitle}>·</Text>}
            {reviewCount > 0 && (
              <View style={styles.gridReviewBadge}>
                <IconChartNoAxesGantt width={10} height={10} color="rgba(255,255,255,0.7)" />
                <Text style={styles.photoListSubtitle}>{reviewCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Grid 레이아웃 (썸네일 + 하단 콘텐츠)
  return (
    <TouchableOpacity
      style={styles.gridCard}
      onPress={handlePress}
      activeOpacity={0.8}>
      <GridThumbnail
        styles={styles}
        imageUrl={imageUrl}
        colors={colors}
        paperTitle={paperTitle || title}
        paperPreview={paperPreview}
      />

      <View style={styles.gridContentRow}>
        <View style={styles.gridTextColumn}>
          {!!title && (
            <View style={styles.gridTitleRow}>
              {locked && (
                <IconLockFilled width={16} height={16} color={colors['foreground/on-surface-muted']} />
              )}
              <Text style={styles.gridTitle} numberOfLines={1}>{title}</Text>
              {hidden && (
                <IconEyeClosed width={14} height={14} color={colors['foreground/on-surface-muted']} />
              )}
            </View>
          )}
          {(subtitle || reviewCount > 0 || hasReference) && (
            <View style={styles.gridSubtitleRow}>
              {!!subtitle && (
                <Text style={styles.gridSubtitle} numberOfLines={1}>{subtitle}</Text>
              )}
              <MetaLinkIcon show={hasReference} size={12} color={colors['foreground/on-surface-muted']} />
              {reviewCount > 0 && (!!subtitle || hasReference) && (
                <Text style={styles.gridSubtitle}>·</Text>
              )}
              {reviewCount > 0 && (
                <View style={styles.gridReviewBadge}>
                  <IconChartNoAxesGantt width={12} height={12} color={colors['foreground/on-surface-muted']} />
                  <Text style={styles.gridSubtitle}>{reviewCount}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {onMenuPress ? (
          <View ref={menuButtonRef}>
            <IconButton
              icon={IconEllipsisVertical}
              onPress={handleMenuPress}
              variant="ghost-secondary"
              size="medium"
            />
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  // Grid 레이아웃 (새 디자인: 썸네일 + 하단 콘텐츠)
  gridCard: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 2,
    borderRadius: 20,
    backgroundColor: colors['fill/faint'],
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: '1%',
  },
  paperWrapper: {
    width: '46%',
    marginTop: '18%',
    // overflow visible so imageSticker can stick out
  },
  paperA4: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors['surface/bright'],
    borderRadius: 20,
    overflow: 'hidden',
    padding: '12%',
    gap: 3,
  },
  paperBehind: {
    transform: [{translateX: -16}, {rotate: '-8deg'}],
    shadowColor: '#0E0E0D',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  imageCardFront: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors['surface/bright'],
    borderWidth: 4,
    borderColor: colors['surface/bright'],
    transform: [{translateX: 16}, {rotate: '8deg'}],
    shadowColor: '#0E0E0D',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  imageStickerImg: {
    width: '100%',
    height: '100%',
  },
  contentBox: {
    position: 'absolute',
    left: '14.16%',
    right: '14.16%',
    top: '10.14%',
    aspectRatio: 209.3 / 165.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageInner: {
    width: '87.93%',
    aspectRatio: 184 / 122,
    borderRadius: 16,
    overflow: 'hidden',
    transform: [{rotate: '-15deg'}],
  },
  imageFill: {
    width: '100%',
    height: '100%',
  },
  paper: {
    width: '87.93%',
    aspectRatio: 184 / 122,
    backgroundColor: colors['surface/bright'],
    borderRadius: 16,
    paddingHorizontal: '4%',
    paddingVertical: '6%',
    transform: [{rotate: '-15deg'}],
    gap: 3,
    overflow: 'hidden',
    shadowColor: '#0E0E0D',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 1,
    elevation: 1,
  },
  paperOverlay: {
    position: 'absolute',
    width: '50%',
    right: '4%',
    top: '12%',
    transform: [{rotate: '0deg'}],
    borderWidth: 0.5,
    borderColor: colors['border/muted'],
  },
  paperLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: colors['foreground/on-surface-muted'],
    opacity: 0.4,
  },
  paperText: {
    fontSize: 5,
    lineHeight: 7,
    color: colors['foreground/on-surface-muted'],
    fontFamily: Typography.label.medium.fontFamily,
    letterSpacing: 0,
    textAlign: 'justify',
    width: '100%',
  },
  paperTitleText: {
    fontSize: 5,
    lineHeight: 7,
    color: colors['foreground/on-surface'],
    fontFamily: Typography.label.medium.fontFamily,
    letterSpacing: 0,
    flexShrink: 1,
  },
  paperTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  gridTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gridContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 64,
    paddingHorizontal: 4,
    width: '100%',
  },
  gridTextColumn: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  gridTitle: {
    fontFamily: Typography.title.medium.fontFamily,
    fontSize: Typography.title.medium.fontSize,
    fontWeight: Typography.title.medium.fontWeight as '700',
    lineHeight: Typography.title.medium.lineHeight,
    letterSpacing: 0,
    color: colors['foreground/on-surface'],
  },
  gridSubtitle: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    letterSpacing: 0.2,
    color: colors['foreground/on-surface-muted'],
  },
  gridSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  gridReviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  // PhotoList 레이아웃 (기존 디자인 유지)
  gridContainer: {
    width: '100%',
    aspectRatio: 292 / 194,
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0px 6px 16px 0px rgba(0, 0, 0, 0.04)',
    backgroundColor: 'transparent',
  },
  photoListContainer: {
    aspectRatio: 292 / 117,
  },
  emptyState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors['surface/container'],
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
  photoListContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  photoListTitle: {
    fontFamily: Typography.title.medium.fontFamily,
    fontSize: Typography.title.medium.fontSize,
    fontWeight: Typography.title.medium.fontWeight as '700',
    lineHeight: Typography.title.medium.lineHeight,
    letterSpacing: 0,
    color: colors['foreground/on-image'],
  },
  photoListSubtitle: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground/on-image-var'],
  },

  // List 레이아웃
  listWrapper: {
    position: 'relative',
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors['border/muted'],
    marginLeft: 64 + Spacing.sm + Spacing.md,
  },
  listContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius['radius-lg'],
  },
  listContainerPressed: {
    backgroundColor: colors['state/pressed'],
  },
  listStackedWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  listContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    minHeight: Spacing.xxl,
    justifyContent: 'center',
  },
  listTitle: {
    fontFamily: Typography.title.medium.fontFamily,
    fontSize: Typography.title.medium.fontSize,
    fontWeight: Typography.title.medium.fontWeight as '700',
    lineHeight: Typography.title.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground/on-surface'],
  },
  listSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  listSubtitle: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground/on-surface-muted'],
    flexShrink: 1,
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewBadgeText: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: Typography.label.medium.fontWeight as '600',
    lineHeight: Typography.label.medium.lineHeight,
    color: colors['foreground/on-surface-muted'],
  },

  // List Small
  listTitleSmall: {
    fontFamily: Typography.body.medium.fontFamily,
    fontSize: Typography.body.medium.fontSize,
    fontWeight: Typography.body.medium.fontWeight as '500',
    lineHeight: Typography.body.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground/on-surface'],
  },
  listContainerSmall: {
    alignItems: 'center',
  },
  listContentSmall: {
    flex: 1,
    paddingHorizontal: Spacing.smd,
    paddingVertical: 2,
    gap: Spacing.xs,
  },

  // Leading number
  leadingNumber: {
    fontFamily: Typography.label.medium.fontFamily,
    fontSize: Typography.label.medium.fontSize,
    fontWeight: '600',
    lineHeight: Typography.label.medium.lineHeight,
    letterSpacing: -0.25,
    color: colors['foreground/on-surface-muted'],
    width: 20,
    textAlign: 'center',
    marginRight: Spacing.sm,
  },

});
