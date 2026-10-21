import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, FlatList, Linking, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {Image as ExpoImage} from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import {FloatingNavBar, NavPillButton} from '@components/Navigation';
import {useAppBarContentTop} from '@components/Navigation/FloatingNavBar';
import {Breadcrumb} from '@components/Navigation/Breadcrumb';
import {Menu} from '@components/Menu';
import {Button} from '@components/Button';
import {IconClose, IconPhoto} from '@components/Icon/IconIndex';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {triggerHaptic} from '@utils/haptics';
import {registerAlbumPicker, type PickedAsset} from './albumPicker';
import {VideoFrameCapture, formatClock, type CapturedFrame} from '@components/VideoFrameCapture';

const LAST_ALBUM_KEY = '@bakle_last_album';
/** 레시피별 마지막 앨범 */
const scopedKey = (scope: string) => `${LAST_ALBUM_KEY}:${scope}`;
/** '모든 사진' — 앨범을 고르지 않은 상태 */
const ALL = '__all__';
const COLS = 4;
const GAP = 2;
const PAGE = 80;

/**
 * 앱 안 사진첩 — 앨범을 고르고 사진을 고른다. 마지막으로 연 앨범을 기억해 다음엔 그 앨범부터 연다
 * (시스템 선택 창은 시작 앨범을 정할 수 없어 매번 앨범을 다시 찾아야 했다).
 * 앱 루트에 하나만 둔다 — 어디서든 launchLibrary()로 연다.
 */
export function AlbumPickerHost() {
  const [request, setRequest] = useState<{limit: number; scope?: string; resolve: (v: PickedAsset[] | null) => void} | null>(null);

  useEffect(() => {
    registerAlbumPicker((limit, scope) => new Promise(resolve => setRequest({limit, scope, resolve})));
    return () => registerAlbumPicker(null);
  }, []);

  const finish = useCallback((v: PickedAsset[] | null) => {
    request?.resolve(v);
    setRequest(null);
  }, [request]);

  return (
    <Modal visible={!!request} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => finish(null)}>
      <SafeAreaProvider>
        {request ? <AlbumPickerScreen limit={request.limit} scope={request.scope} onDone={finish} /> : null}
      </SafeAreaProvider>
    </Modal>
  );
}

function AlbumPickerScreen({limit, scope, onDone}: {limit: number; scope?: string; onDone: (v: PickedAsset[] | null) => void}) {
  const colors = useColors();
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  // 앱바는 위에 떠 있다 — 사진·안내는 그 아래부터
  const contentTop = useAppBarContentTop();
  const cell = Math.floor((width - GAP * (COLS - 1)) / COLS);

  const [perm, setPerm] = useState<'loading' | 'all' | 'limited' | 'denied'>('loading');
  const [albums, setAlbums] = useState<MediaLibrary.Album[]>([]);
  const [albumId, setAlbumId] = useState<string>(ALL);
  const [showAlbums, setShowAlbums] = useState(false);
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  // 영상에서 고른 장면 — 영상 id → 캡처한 사진. 장면 고르기 화면에 띄울 영상
  const [frames, setFrames] = useState<Record<string, CapturedFrame>>({});
  const [capturing, setCapturing] = useState<{id: string; uri: string; durationMs: number} | null>(null);
  const cursor = useRef<{after?: string; hasNext: boolean}>({hasNext: true});
  const loading = useRef(false);

  // 권한 → 앨범 목록 → 마지막 앨범
  useEffect(() => {
    (async () => {
      const p = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
      if (!p.granted) { setPerm('denied'); return; }
      const list = await MediaLibrary.getAlbumsAsync({includeSmartAlbums: true}).catch(() => []);
      const withPhotos = list.filter(a => (a.assetCount ?? 0) > 0).sort((a, b) => (b.assetCount ?? 0) - (a.assetCount ?? 0));
      // 이 레시피에서 마지막으로 연 앨범 → 없으면 앱 전체 마지막 앨범.
      // 앨범을 정한 뒤에 권한 상태를 넣는다 — 먼저 넣으면 '모든 사진'으로 한 번 불러오며 기억을 덮어썼다
      const [scoped, last] = await Promise.all([
        scope ? AsyncStorage.getItem(scopedKey(scope)).catch(() => null) : Promise.resolve(null),
        AsyncStorage.getItem(LAST_ALBUM_KEY).catch(() => null),
      ]);
      const pick = [scoped, last].find(id => id && (id === ALL || withPhotos.some(a => a.id === id)));
      setAlbums(withPhotos);
      setAlbumId(pick ?? ALL);
      setPerm(p.accessPrivileges === 'limited' ? 'limited' : 'all');
    })();
  }, []);

  const loadMore = useCallback(async (reset = false) => {
    if (loading.current || (!reset && !cursor.current.hasNext)) return;
    loading.current = true;
    try {
      const page = await MediaLibrary.getAssetsAsync({
        first: PAGE,
        after: reset ? undefined : cursor.current.after,
        // 영상도 — 누르면 장면을 골라 사진처럼 넣는다
        mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        ...(albumId !== ALL ? {album: albumId} : {}),
      });
      cursor.current = {after: page.endCursor, hasNext: page.hasNextPage};
      setAssets(prev => (reset ? page.assets : [...prev, ...page.assets]));
    } catch (e) {
      console.warn('[AlbumPicker] 사진 불러오기 실패:', e);
    } finally {
      loading.current = false;
    }
  }, [albumId]);

  // 앨범이 바뀌면 처음부터 — 기억도 한다
  useEffect(() => {
    if (perm === 'loading' || perm === 'denied') return;
    cursor.current = {hasNext: true};
    setAssets([]);
    loadMore(true);
  }, [albumId, perm, loadMore]);

  // 앨범을 고르면 기억 — 앱 전체 + 이 레시피(열 때 정해진 앨범은 다시 쓰지 않는다)
  const chooseAlbum = useCallback((id: string) => {
    setAlbumId(id);
    AsyncStorage.setItem(LAST_ALBUM_KEY, id).catch(() => {});
    if (scope) AsyncStorage.setItem(scopedKey(scope), id).catch(() => {});
  }, [scope]);

  // 영상 — 고른 적 없으면 장면 고르기 화면(아이폰 ph:// 영상은 파일 경로로 바꿔야 장면을 뽑는다)
  const openVideo = async (a: MediaLibrary.Asset) => {
    triggerHaptic('light');
    // 이미 장면을 넣은 영상을 다시 누르면 빼고 장면도 지운다 — 다시 누르면 새로 고른다
    if (selected.includes(a.id)) {
      setSelected(prev => prev.filter(x => x !== a.id));
      setFrames(prev => { const n = {...prev}; delete n[a.id]; return n; });
      return;
    }
    const info = await MediaLibrary.getAssetInfoAsync(a, {shouldDownloadFromNetwork: true}).catch(() => null);
    setCapturing({id: a.id, uri: info?.localUri ?? a.uri, durationMs: (a.duration ?? 0) * 1000});
  };

  const toggle = (id: string) => {
    triggerHaptic('light');
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (limit === 1) return [id];
      return prev.length >= limit ? prev : [...prev, id];
    });
  };

  const confirm = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      // 고른 순서대로 — 파일 경로(아이폰 ph://는 업로드·압축이 못 읽는다)
      const out: PickedAsset[] = [];
      for (const id of selected) {
        const a = assets.find(x => x.id === id);
        if (!a) continue;
        // 영상은 고른 장면을 사진으로
        if (frames[id]) { out.push({uri: frames[id].uri, width: frames[id].width, height: frames[id].height, type: 'image'}); continue; }
        const info = await MediaLibrary.getAssetInfoAsync(a, {shouldDownloadFromNetwork: true});
        out.push({uri: info.localUri ?? a.uri, width: a.width, height: a.height, type: 'image'});
      }
      // 사진을 넣은 앨범을 이 레시피 앨범으로 — 다음에 이 레시피에서 열면 여기부터
      if (scope) AsyncStorage.setItem(scopedKey(scope), albumId).catch(() => {});
      onDone(out);
    } finally {
      setBusy(false);
    }
  };

  const albumLabel = albumId === ALL ? t('albumPicker.allPhotos') : (albums.find(a => a.id === albumId)?.title ?? t('albumPicker.allPhotos'));
  // 홈 레시피북 메뉴와 같은 형식 — 아이콘 + 이름
  // 앨범 목록은 글자만 — 같은 사진 아이콘을 줄마다 반복하면 시끄럽고, 앨범 표지는 앨범마다 사진을 따로 읽어야 해 느리다
  const albumItems = [{id: ALL, label: t('albumPicker.allPhotos')}, ...albums.map(a => ({id: a.id, label: a.title}))];

  return (
    <View style={[styles.root, {backgroundColor: colors['surface/dim']}]}>
      {/* 홈의 레시피북 고르기와 같은 공통 앱바 셀렉터 — 닫기 옆 앨범 이름, 누르면 아래 메뉴 */}
      {/* 앱바 — 왼쪽 닫기, 가운데 앨범 셀렉터(홈과 같은 Breadcrumb), 그 아래 메뉴(앨범이 많으면 검색) */}
      <FloatingNavBar
        left={<NavPillButton icon={IconClose} onPress={() => onDone(null)} />}
        center={
          <Breadcrumb
            axisLabel={albumLabel}
            axisIcon={IconPhoto}
            onAxisPress={perm === 'all' || perm === 'limited' ? () => setShowAlbums(v => !v) : undefined}
          />
        }
        centerMenu={
          <Menu
            items={albumItems}
            selectedId={albumId}
            onSelect={id => { setShowAlbums(false); setSelected([]); chooseAlbum(id); }}
            visible={showAlbums}
            onClose={() => setShowAlbums(false)}
            maxHeight={Math.round(height * 0.6)}
            searchable={albums.length > 8}
          />
        }
      />
      {perm === 'loading' ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : perm === 'denied' ? (
        <View style={styles.center}>
          <Text style={[styles.message, {color: colors['foreground/on-surface-var']}]}>{t('albumPicker.denied')}</Text>
          <Button label={t('permission.openSettings')} variant="soft" size="small" onPress={() => Linking.openSettings()} />
        </View>
      ) : (
        <>
          {perm === 'limited' ? (
            <Pressable style={[styles.limited, {marginTop: contentTop}]} onPress={() => MediaLibrary.presentPermissionsPickerAsync(['photo']).then(() => loadMore(true)).catch(() => {})}>
              <Text style={[styles.limitedText, {color: colors['foreground/on-surface-var']}]}>{t('albumPicker.limited')}</Text>
            </Pressable>
          ) : null}
          <FlatList
            data={assets}
            keyExtractor={a => a.id}
            numColumns={COLS}
            columnWrapperStyle={{gap: GAP}}
            contentContainerStyle={{gap: GAP, paddingTop: perm === 'limited' ? 0 : contentTop, paddingBottom: insets.bottom + 88}}
            onEndReached={() => loadMore()}
            onEndReachedThreshold={0.6}
            renderItem={({item}) => {
              const order = selected.indexOf(item.id);
              return (
                <Pressable onPress={() => (item.mediaType === MediaLibrary.MediaType.video ? openVideo(item) : toggle(item.id))} style={{width: cell, height: cell}}>
                  {/* 영상은 고른 장면이 있으면 그 장면을 보여준다 */}
                  <ExpoImage source={{uri: frames[item.id]?.uri ?? item.uri}} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={item.id + (frames[item.id] ? ':f' : '')} />
                  {item.mediaType === MediaLibrary.MediaType.video ? (
                    <Text style={styles.duration}>{formatClock((item.duration ?? 0) * 1000)}</Text>
                  ) : null}
                  {order >= 0 ? (
                    <View style={[styles.check, {backgroundColor: colors['surface/inverse'], borderColor: '#fff'}]}>
                      <Text style={[styles.checkText, {color: colors['foreground/on-surface-inverse']}]}>{limit === 1 ? '✓' : order + 1}</Text>
                    </View>
                  ) : (
                    <View style={[styles.check, styles.checkEmpty]} />
                  )}
                </Pressable>
              );
            }}
          />
          <View style={[styles.bottom, {paddingBottom: insets.bottom + Spacing.sm, backgroundColor: colors['surface/dim']}]}>
            <Button
              label={selected.length > 0 ? t('albumPicker.choose', {count: selected.length}) : t('albumPicker.chooseNone')}
              variant="filled"
              onPress={confirm}
              disabled={selected.length === 0 || busy}
              loading={busy}
            />
          </View>
        </>
      )}
      {/* 장면 고르기 — 사진첩 위에 덮는다(Modal 안 Modal은 아이폰이 무시) */}
      {capturing ? (
        <VideoFrameCapture
          uri={capturing.uri}
          durationMs={capturing.durationMs}
          onCancel={() => setCapturing(null)}
          onCapture={frame => {
            const id = capturing.id;
            // 고른 컷은 폰 사진첩에도 남긴다(촬영과 같게 — 저장 실패해도 넣기는 그대로)
            MediaLibrary.requestPermissionsAsync(true)
              .then(p => (p.granted ? MediaLibrary.saveToLibraryAsync(frame.uri) : undefined))
              .catch(e => console.warn('[AlbumPicker] 컷 사진첩 저장 실패:', e));
            setFrames(prev => ({...prev, [id]: frame}));
            setSelected(prev => (prev.includes(id) ? prev : limit === 1 ? [id] : prev.length >= limit ? prev : [...prev, id]));
            setCapturing(null);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg},
  message: {...Typography.body.medium, textAlign: 'center'},
  limited: {paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm},
  limitedText: {...Typography.caption.medium},
  check: {position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center'},
  checkEmpty: {borderColor: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(0,0,0,0.15)'},
  checkText: {...Typography.caption.medium, fontWeight: '700'},
  // 영상 길이 — 왼쪽 아래
  duration: {position: 'absolute', left: 6, bottom: 4, ...Typography.caption.small, color: '#fff', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3},
  bottom: {position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm},
});
