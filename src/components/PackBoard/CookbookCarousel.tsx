import React, {useRef} from 'react';
import {Animated, StyleSheet, useWindowDimensions, View} from 'react-native';
import {RecipePack, BOOK_PACK_WIDTH} from './RecipePack';
import {RetrospectiveNote} from './RetrospectiveNote';
import type {PackBoardItem} from './PackBoard';

const GAP = 24;
// 가운데 카드 외 양옆은 축소·반투명으로 살짝만 보이게
const SIDE_SCALE = 0.82;
const SIDE_OPACITY = 0.55;

/**
 * 레시피 북 전용 센터 카드 캐러셀.
 * 가운데 한 권을 크게, 양옆을 살짝 보여주며 한 권씩 스냅 스크롤.
 * 카드 탭 시 RecipePack이 자기 위치를 measure해 onPress(rect)로 펼침을 띄운다(기존 동작).
 */
export function CookbookCarousel({items}: {items: PackBoardItem[]}) {
  const {width} = useWindowDimensions();
  const ITEM_W = BOOK_PACK_WIDTH;
  const SNAP = ITEM_W + GAP;
  const sidePad = Math.max(0, (width - ITEM_W) / 2);
  const scrollX = useRef(new Animated.Value(0)).current;

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP}
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={{paddingHorizontal: sidePad, alignItems: 'center'}}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {x: scrollX}}}],
          {useNativeDriver: true},
        )}
        scrollEventThrottle={16}>
        {items.map((item, i) => {
          const center = i * SNAP;
          const inputRange = [center - SNAP, center, center + SNAP];
          const scale = scrollX.interpolate({inputRange, outputRange: [SIDE_SCALE, 1, SIDE_SCALE], extrapolate: 'clamp'});
          const opacity = scrollX.interpolate({inputRange, outputRange: [SIDE_OPACITY, 1, SIDE_OPACITY], extrapolate: 'clamp'});
          return (
            <Animated.View
              key={item.id}
              style={{
                width: ITEM_W,
                marginRight: i === items.length - 1 ? 0 : GAP,
                transform: [{scale}],
                opacity,
              }}>
              {item.variant === 'note'
                ? <RetrospectiveNote {...item} rotate={0} />
                : <RecipePack {...item} rotate={0} />}
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
});
