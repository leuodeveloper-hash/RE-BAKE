import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, FlatList, Linking, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {Image as ExpoImage} from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppBar} from '@components/Navigation';
import {Selector} from '@components/Selector';
import {Menu} from '@components/Menu';
import {Button} from '@components/Button';
import {IconClose} from '@components/Icon/IconIndex';
import {useColors} from '@contexts/ThemeContext';
import {useTranslation} from '@contexts/LanguageContext';
import {Spacing} from '@constants/spacing';
import {Typography} from '@constants/typography';
import {triggerHaptic} from '@utils/haptics';
import {registerAlbumPicker, type PickedAsset} from './albumPicker';

const LAST_ALBUM_KEY = '@bakle_last_album';
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
  const [request, setRequest] = useState<{limit: number; resolve: (v: PickedAsset[] | null) => void} | null>(null);

  useEffect(() => {
    registerAlbumPicker(limit => new Promise(resolve => setRequest({limit, resolve})));
    return () => registerAlbumPicker(null);
  }, []);

  const finish = useCallback((v: PickedAsset[] | null) => {
    request?.resolve(v);
    setRequest(null);
  }, [request]);

  return (
    <Modal visible={!!request} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => finish(null)}>
      <SafeAreaProvider>
        {request ? <AlbumPickerScreen limit={request.limit} onDone={finish} /> : null}
      </SafeAreaProvider>
    </Modal>
  );
}

function AlbumPickerScreen({limit, onDone}: {limit: number; onDone: (v: PickedAsset[] | null) => void}) {
  const colors = useColors();
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();
  const cell = Math.floor((width - GAP * (COLS - 1)) / COLS);

  const [perm, setPerm] = useState<'loading' | 'all' | 'limited' | 'denied'>('loading');
  const [albums, setAlbums] = useState<MediaLibrary.Album[]>([]);
  const [albumId, setAlbumId] = useState<string>(ALL);
  const [showAlbums, setShowAlbums] = useState(false);
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const cursor = useRef<{after?: string; hasNext: boolean}>({hasNext: true});
  const loading = useRef(false);

  // 권한 → 앨범 목록 → 마지막 앨범
  useEffect(() => {
    (async () => {
      const p = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
      if (!p.granted) { setPerm('denied'); return; }
      setPerm(p.accessPrivileges === 'limited' ? 'limited' : 'all');
      const list = await MediaLibrary.getAlbumsAsync({includeSmartAlbums: true}).catch(() => []);
      const withPhotos = list.filter(a => (a.assetCount ?? 0) > 0).sort((a, b) => (b.assetCount ?? 0) - (a.assetCount ?? 0));
      setAlbums(withPhotos);
      const last = await AsyncStorage.getItem(LAST_ALBUM_KEY).catch(() => null);
      setAlbumId(last && withPhotos.some(a => a.id === last) ? last : ALL);
    })();
  }, []);

  const loadMore = useCallback(async (reset = false) => {
    if (loading.current || (!reset && !cursor.current.hasNext)) return;
    loading.current = true;
    try {
      const page = await MediaLibrary.getAssetsAsync({
        first: PAGE,
        after: reset ? undefined : cursor.current.after,
        mediaType: MediaLibrary.MediaType.photo,
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
    AsyncStorage.setItem(LAST_ALBUM_KEY, albumId).catch(() => {});
  }, [albumId, perm, loadMore]);

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
        const info = await MediaLibrary.getAssetInfoAsync(a, {shouldDownloadFromNetwork: true});
        out.push({uri: info.localUri ?? a.uri, width: a.width, height: a.height, type: 'image'});
      }
      onDone(out);
    } finally {
      setBusy(false);
    }
  };

  const albumLabel = albumId === ALL ? t('albumPicker.allPhotos') : (albums.find(a => a.id === albumId)?.title ?? t('albumPicker.allPhotos'));
  const albumItems = [{id: ALL, label: t('albumPicker.allPhotos')}, ...albums.map(a => ({id: a.id, label: `${a.title}  ${a.assetCount ?? ''}`}))];

  return (
    <View style={[styles.root, {backgroundColor: colors['surface/dim']}]}>
      <AppBar
        centered
        leftIcon={IconClose}
        onLeftPress={() => onDone(null)}
        titleNode={perm === 'all' || perm === 'limited' ? (
          <View>
            <Selector label={albumLabel} onPress={() => setShowAlbums(v => !v)} />
            <Menu items={albumItems} visible={showAlbums} selectedId={albumId} onSelect={id => { setShowAlbums(false); setSelected([]); setAlbumId(id); }} onClose={() => setShowAlbums(false)} />
          </View>
        ) : undefined}
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
            <Pressable style={styles.limited} onPress={() => MediaLibrary.presentPermissionsPickerAsync(['photo']).then(() => loadMore(true)).catch(() => {})}>
              <Text style={[styles.limitedText, {color: colors['foreground/on-surface-var']}]}>{t('albumPicker.limited')}</Text>
            </Pressable>
          ) : null}
          <FlatList
            data={assets}
            keyExtractor={a => a.id}
            numColumns={COLS}
            columnWrapperStyle={{gap: GAP}}
            contentContainerStyle={{gap: GAP, paddingBottom: insets.bottom + 88}}
            onEndReached={() => loadMore()}
            onEndReachedThreshold={0.6}
            renderItem={({item}) => {
              const order = selected.indexOf(item.id);
              return (
                <Pressable onPress={() => toggle(item.id)} style={{width: cell, height: cell}}>
                  <ExpoImage source={{uri: item.uri}} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={item.id} />
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
  bottom: {position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm},
});
