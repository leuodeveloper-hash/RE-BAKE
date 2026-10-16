import React from 'react';
import {requestWidgetUpdate, type WidgetInfo, type WidgetTaskHandlerProps} from 'react-native-android-widget';
import {BakleAndroidWidget} from './BakleAndroidWidget';
import {ANDROID_WIDGET_NAME, examBanner, readAndroidWidgetData, setForToday} from './androidWidgetData';

async function render(info: WidgetInfo) {
  const {sets, exam} = await readAndroidWidgetData();
  return (
    <BakleAndroidWidget
      width={info.width}
      height={info.height}
      recipe={setForToday(sets)}
      banner={examBanner(exam)}
    />
  );
}

/** 런처가 부를 때(추가·주기 갱신·크기 변경) — 앱이 꺼져 있어도 백그라운드 JS로 돈다 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(await render(props.widgetInfo));
      break;
    default:
      break;
  }
}

/** 앱이 데이터를 새로 저장한 뒤 — 홈 화면에 놓인 위젯을 바로 다시 그린다 */
export function refreshAndroidWidget() {
  return requestWidgetUpdate({widgetName: ANDROID_WIDGET_NAME, renderWidget: render}).catch(() => {});
}
