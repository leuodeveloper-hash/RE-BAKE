import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {Radius} from '@constants/tokens';
import type {SemanticColors} from '@constants/tokens';
import {Spacing} from '@constants/spacing';
import {Typography, FONT_BASELINE_OFFSET} from '@constants/typography';
import type {AvatarColor} from '@components/Avatar/Avatar';
import {IconClose} from '@components/Icon/IconIndex';
import {IconButton} from '@components/IconButton';
import {SheetHeader} from '@components/BottomSheet/SheetHeader';
import {EdgeFade} from '@components/Container/ContentMask';
import {BlurView} from 'expo-blur';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {APPBAR_TOP_PADDING} from '@components/Navigation';
import {useThemedStyles} from '@hooks/useThemedStyles';
import {useColors} from '@contexts/ThemeContext';

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  /** 좌상단 아이콘 */
  icon?: React.FC<SvgProps>;
  /** 아바타 색상 */
  avatarColor?: AvatarColor;
  /** 상단 중앙 그래픽 (세로 레이아웃) */
  headerGraphic?: React.ReactNode;
  /** 상단 풀폭 이미지 (이미지 헤더 타입) */
  headerImage?: ImageSourcePropType;
  /** 타이틀 텍스트 */
  title?: string;
  /** 타이틀 아래 설명 텍스트 (문자열 또는 인라인 Text 노드) */
  description?: React.ReactNode;
  /** 커스텀 콘텐츠 */
  children?: React.ReactNode;
  /** 하단 버튼 영역 */
  actions?: React.ReactNode;
  /** 닫기 버튼 표시 (기본: true) */
  showCloseButton?: boolean;
  /** 배경 탭으로 닫기 (기본: true) */
  enableBackdropDismiss?: boolean;
  /** 카드 배경 (기본: 'bright') */
  surface?: 'bright' | 'dim';
  /** 카드 너비 (기본: 312) */
  width?: number;
  /**
   * 내용이 길면 이 높이까지만 보이고 안에서 스크롤 — 위아래에 가림 그라디언트(앱바·시트와 같은 EdgeFade)가
   * 깔려 헤더·버튼 쪽에서 글이 부드럽게 사라진다.
   */
  scrollMaxHeight?: number;
  /** 머리 없이 내용만 꽉 채울 때 — 위·좌우 여백을 이 값 하나로(카드 같은 내용을 팝업 모서리와 같은 간격으로) */
  contentInset?: number;
  /** 배경 블러 (기본: false) */
  blurBackdrop?: boolean;
  /** 헤더 레이아웃 (기본: 'default') */
  /**
   * 화면 위치 — 'center'(기본) | 'top'(통합 검색처럼 앱바 높이에 붙임).
   * 입력칸이 있는 팝업은 'top' — 가운데면 키보드가 올라올 때 칸이 가려지거나 팝업이 튄다.
   */
  position?: 'center' | 'top';
  /** 헤더 오른쪽 슬롯 — 사진에서 읽기 같은 보조 버튼 */
  headerRight?: React.ReactNode;
  headerType?: 'default' | 'center';
}

const ANIMATION_DURATION = 200;

export function Dialog({
  visible,
  onClose,
  icon,
  avatarColor,
  headerGraphic,
  headerImage,
  title,
  description,
  children,
  actions,
  showCloseButton = true,
  enableBackdropDismiss = true,
  surface = 'bright',
  width,
  blurBackdrop = false,
  headerType,
  contentInset,
  scrollMaxHeight,
  position = 'center',
  headerRight,
}: DialogProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {height: windowHeight} = useWindowDimensions();
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(false);
  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      wasVisible.current = true;
      setRendered(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: false,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    } else if (!visible && wasVisible.current) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(scale, {
          toValue: 0.95,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start(() => {
        wasVisible.current = false;
        setRendered(false);
      });
    }
  }, [visible, backdropOpacity, scale, contentOpacity]);

  const effectiveHeaderType = headerType ?? 'center';
  const handleBackdropPress = () => {
    if (enableBackdropDismiss) onClose();
  };

  return (
    <Modal visible={visible || rendered} transparent animationType="none" statusBarTranslucent>
    <View style={[styles.overlay, position === 'top' && [styles.overlayTop, {paddingTop: insets.top + APPBAR_TOP_PADDING}]]}>
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          blurBackdrop && styles.blurBackdrop,
          {
            opacity: blurBackdrop
              ? backdropOpacity
              : backdropOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.4],
                }),
          },
        ]}>
        {blurBackdrop && (
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        )}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
      </Animated.View>

      {/* Dialog Card */}
      <Animated.View style={{alignSelf: 'center'}}>
      <Animated.View
        style={[
          styles.card,
          // 화면 안 — 위아래 안전영역(상태바·홈 인디케이터)을 빼고. 넘치면 내용만 스크롤(헤더·버튼은 고정)
          {maxHeight: Math.min(windowHeight * 0.85, windowHeight - insets.top - insets.bottom - Spacing.lg * 2)},
          width != null && {width},
          surface === 'dim' && {backgroundColor: colors['surface/dim']},
          {
            opacity: contentOpacity,
            transform: [{scale}],
          },
        ]}>
        {/* Header: image type or default */}
        {headerImage ? (
          <>
            <View style={styles.imageHeader}>
              <Image source={headerImage} style={styles.headerImage} resizeMode="cover" />
              {showCloseButton && (
                <View style={styles.imageCloseButton}>
                  <IconButton icon={IconClose} variant="soft" onImage size="small" onPress={onClose} />
                </View>
              )}
            </View>
            <View style={styles.imageHeaderText}>
              {title && <Text style={styles.imageTitle}>{title}</Text>}
              {description && <Text style={styles.imageDescription}>{typeof description === 'string' ? description : description}</Text>}
            </View>
          </>
        ) : (icon || title || showCloseButton) && (
          // 팝업 머리 = 공통 시트 헤더 두 종류.
          //  - 일반 헤더(기본): 라벨 가운데 · 왼쪽 X
          //  - 아이콘 헤더(headerType="default"): 아이콘(동그란 색 바탕) · 왼쪽 정렬 제목·설명 · 오른쪽 X — 상세 메타데이터(시간·분량·반죽 온도·분할 무게) 팝업
          <SheetHeader
            title={title ?? ''}
            description={description}
            icon={icon}
            avatarColor={avatarColor}
            headerGraphic={headerGraphic}
            headerType={effectiveHeaderType}
            headerRight={headerRight}
            onClose={showCloseButton ? onClose : undefined}
          />
        )}

        {/* Content */}
        {/* 라벨 가운데 헤더(앱바형)면 헤더 아래·버튼 위 여백을 8로 — 기본 20은 미리보기처럼 큰 내용에서 휑했다 */}
        {children && (scrollMaxHeight != null ? (
          // 스크롤 내용 — 위아래 가림 그라디언트는 팝업 바탕색으로
          // flexShrink — 화면이 낮으면 이 칸만 줄어 헤더·버튼은 늘 보인다(바텀시트와 같은 구조)
          <View style={[effectiveHeaderType === 'center' && styles.contentCompact, {maxHeight: scrollMaxHeight, flexShrink: 1}]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {children}
            </ScrollView>
            <EdgeFade position="top" height={Spacing.md} color={(surface === 'dim' ? colors['surface/dim'] : colors['surface/bright']) as string} />
            <EdgeFade position="bottom" height={Spacing.md} color={(surface === 'dim' ? colors['surface/dim'] : colors['surface/bright']) as string} />
          </View>
        ) : (
          <View style={[
            styles.content,
            effectiveHeaderType === 'center' && styles.contentCompact,
            contentInset != null && {paddingHorizontal: contentInset, paddingTop: contentInset, marginTop: 0},
          ]}>{children}</View>
        ))}

        {/* Actions */}
        {actions && (
          <View style={styles.actions}>
            {React.Children.map(
              (actions as any)?.type === React.Fragment
                ? (actions as any).props.children
                : actions,
              child => child ? <View style={{flex: 1}}>{child}</View> : null,
            )}
          </View>
        )}
      </Animated.View>
      </Animated.View>
    </View>
    </Modal>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    overlayTop: {
      justifyContent: 'flex-start',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors['overlay/strong'],
    },
    blurBackdrop: {
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    card: {
      width: 312,
      minHeight: 160,
      backgroundColor: colors['surface/bright'],
      borderRadius: Radius['radius-xl'],
      paddingBottom: Spacing.lg,
    },
    content: {
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    // 헤더 줄 아래 여백(12) 위로 4 더해 헤더와 16, 버튼과도 16
    // 스크롤 내용 — 가림 그라디언트 높이만큼 위아래를 비워 첫·끝 줄이 가려지지 않게
    scrollContent: {
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    contentCompact: {
      paddingTop: 0,
      paddingBottom: 0,
      marginTop: Spacing.xs,
      marginBottom: Spacing.md,
    },
    actions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
    },
    imageHeader: {
      alignSelf: 'stretch',
      aspectRatio: 2,
      overflow: 'hidden' as const,
      borderTopLeftRadius: Radius['radius-xl'],
      borderTopRightRadius: Radius['radius-xl'],
    },
    headerImage: {
      width: '100%' as any,
      height: '100%' as any,
    },
    imageCloseButton: {
      position: 'absolute' as const,
      top: Spacing.smd,
      right: Spacing.smd,
    },
    imageHeaderText: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      alignItems: 'center' as const,
    },
    imageTitle: {
      ...Typography.title.large,
      color: colors['foreground/on-surface'],
      marginTop: FONT_BASELINE_OFFSET,
      textAlign: 'center' as const,
    },
    imageDescription: {
      ...Typography.body.medium,
      color: colors['foreground/on-surface-muted'],
      marginTop: Spacing.sm,
      textAlign: 'center' as const,
    },
  });
