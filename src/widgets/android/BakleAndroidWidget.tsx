import React from 'react';
import {FlexWidget, ImageWidget, OverlapWidget, TextWidget} from 'react-native-android-widget';
import type {AndroidDailySet} from './androidWidgetData';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOGO = require('../../../assets/widget/logo.png');

/** 사진이 없을 때 바탕 — 아이폰 위젯 widgetFallback과 같은 색 */
const FALLBACK_BG = '#F8F5ED';

export interface BakleAndroidWidgetProps {
  /** 위젯 크기(dp) — 런처가 알려준다 */
  width: number;
  height: number;
  recipe: AndroidDailySet | null;
  banner: {label: string; dday: string} | null;
}

/**
 * 안드로이드 홈 화면 위젯 — 아이폰 위젯과 같은 구성.
 * 사진 가득 + 아래 어둡게, 오른쪽 위 흰 로고, 왼쪽 아래 D-day(시험이 있으면) 또는 레시피 제목.
 * 탭하면 그 레시피 상세로(bakle://recipe/{id}).
 */
export function BakleAndroidWidget({width, height, recipe, banner}: BakleAndroidWidgetProps) {
  const small = Math.min(width, height) < 160;
  const pad = small ? 12 : 16;
  const logo = small ? 22 : 26;
  const uri = recipe?.id ? `bakle://recipe/${recipe.id}` : 'bakle://';

  if (!recipe) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{height: 'match_parent', width: 'match_parent', backgroundColor: FALLBACK_BG, borderRadius: 22, alignItems: 'center', justifyContent: 'center', padding: 12}}>
        <TextWidget text="🥐" style={{fontSize: 32}} />
        <TextWidget
          text="앱을 열어 오늘의 레시피를 받아보세요"
          maxLines={3}
          style={{fontSize: 12, color: '#6B6B66', fontFamily: 'Pretendard-Regular', textAlign: 'center', marginTop: 6}}
        />
      </FlexWidget>
    );
  }

  return (
    <OverlapWidget
      clickAction="OPEN_URI"
      clickActionData={{uri}}
      style={{height: 'match_parent', width: 'match_parent', borderRadius: 22, backgroundColor: FALLBACK_BG}}>
      {recipe.imageUrl ? (
        <ImageWidget image={recipe.imageUrl as `https:${string}`} imageWidth={width} imageHeight={height} radius={22} resizeMode="cover" />
      ) : null}
      {/* 아래쪽 어둡게 — 글자가 사진 위에서 읽히게(아이폰과 같은 비율) */}
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          borderRadius: 22,
          backgroundGradient: {from: 'rgba(0, 0, 0, 0)', to: 'rgba(0, 0, 0, 0.75)', orientation: 'TOP_BOTTOM'},
        }}
      />
      <FlexWidget style={{height: 'match_parent', width: 'match_parent', padding: pad, flexDirection: 'column', justifyContent: 'space-between'}}>
        <FlexWidget style={{width: 'match_parent', flexDirection: 'row', justifyContent: 'flex-end'}}>
          <ImageWidget image={LOGO} imageWidth={logo} imageHeight={logo} />
        </FlexWidget>
        {banner ? (
          <FlexWidget style={{flexDirection: 'column'}}>
            <TextWidget text={banner.label} maxLines={1} truncate="END" style={{fontSize: 10, color: '#FFFFFF', fontFamily: 'Pretendard-Medium'}} />
            <TextWidget text={banner.dday} maxLines={1} style={{fontSize: small ? 30 : 36, color: '#FFFFFF', fontFamily: 'Pretendard-Regular'}} />
          </FlexWidget>
        ) : (
          <TextWidget
            text={recipe.title}
            maxLines={2}
            truncate="END"
            style={{fontSize: small ? 15 : 17, color: '#FFFFFF', fontFamily: 'Pretendard-Bold'}}
          />
        )}
      </FlexWidget>
    </OverlapWidget>
  );
}
