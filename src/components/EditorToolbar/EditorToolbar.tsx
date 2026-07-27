import React from 'react';
import {ViewStyle} from 'react-native';
import {SvgProps} from 'react-native-svg';
import {IconButton} from '@components/IconButton';
import {Button} from '@components/Button';
import {KeyboardToolbar} from '@components/KeyboardToolbar';
import {
  IconChevronLeft,
  IconChevronRight,
  IconUndo,
  IconRedo,
  IconAdd,
  IconMic,
  IconScanText,
  IconTick,
} from '@components/Icon/IconIndex';

/**
 * 편집/생성/요리모드 공용 입력 툴바.
 *
 * 규칙(사용자 지시): 툴바는 **하나의 공통 컴포넌트**이고, 버튼 세트는 고정.
 * 컨텍스트별로 다른 건 오직 **각 버튼의 handler/disabled**뿐이다.
 * (handler(onPress)를 안 넘기면 자동으로 disabled — "경우에 따라 disable만")
 *
 * 고정 버튼: ◀ ▶ · undo · redo · +추가 · 음성 · OCR스캔 · 완료(✓)
 * 전부 variant="ghost-primary" (라인형).
 */
export interface ToolbarAction {
  /** 없으면 버튼 자동 disabled */
  onPress?: () => void;
  /** onPress가 있어도 강제로 끌 때 */
  disabled?: boolean;
  /** 눌린 상태 표시(메뉴 열림 등) */
  active?: boolean;
}

/** 서브뷰(뎁스) 안의 레이블 버튼 하나 */
export interface ToolbarSubAction {
  label: string;
  // 프로젝트 svg 아이콘(.svg import)은 FC<SvgProps>로 온전히 안 잡혀 ComponentType로 받는다.
  icon?: React.ComponentType<SvgProps>;
  onPress: () => void;
  disabled?: boolean;
}

/** 서브뷰(뎁스): 지정 시 툴바 좌측이 [뒤로가기]+[레이블 버튼들]로 바뀐다 */
export interface ToolbarSubView {
  onBack: () => void;
  actions: ToolbarSubAction[];
}

export interface EditorToolbarProps {
  prev?: ToolbarAction;
  next?: ToolbarAction;
  undo?: ToolbarAction;
  redo?: ToolbarAction;
  /** +추가 (칩/사진 메뉴 트리거) */
  add?: ToolbarAction;
  /** 음성 입력 */
  voice?: ToolbarAction;
  /** OCR 스캔 */
  scan?: ToolbarAction;
  /** 완료(✓) */
  onDone?: () => void;
  doneDisabled?: boolean;
  /** 바 위에 뜨는 슬롯 (추가/스캔 메뉴) */
  above?: React.ReactNode;
  /** 하위 뎁스 뷰 — 지정 시 좌측을 [뒤로가기]+[레이블 버튼]으로 대체 */
  subView?: ToolbarSubView | null;
  style?: ViewStyle;
}

/** onPress 없으면 disabled */
const isOff = (a?: ToolbarAction): boolean => a?.disabled ?? !a?.onPress;

export function EditorToolbar({
  prev,
  next,
  undo,
  redo,
  add,
  voice,
  scan,
  onDone,
  doneDisabled,
  above,
  subView,
  style,
}: EditorToolbarProps) {
  return (
    <KeyboardToolbar
      style={style}
      above={subView ? undefined : above}
      left={
        subView ? (
          // 하위 뎁스: [뒤로가기 아이콘] + [레이블 버튼들]
          <>
            <IconButton icon={IconChevronLeft} onPress={subView.onBack} variant="ghost-primary" size="medium" />
            {subView.actions.map((a, i) => (
              <Button
                key={i}
                label={a.label}
                icon={a.icon}
                onPress={a.onPress}
                disabled={a.disabled}
                variant="soft"
                size="small"
                shape="square"
              />
            ))}
          </>
        ) : (
          <>
            <IconButton icon={IconChevronLeft} onPress={prev?.onPress} variant="ghost-primary" size="medium" disabled={isOff(prev)} />
            <IconButton icon={IconChevronRight} onPress={next?.onPress} variant="ghost-primary" size="medium" disabled={isOff(next)} />
            <IconButton icon={IconUndo} onPress={undo?.onPress} variant="ghost-primary" size="medium" disabled={isOff(undo)} />
            <IconButton icon={IconRedo} onPress={redo?.onPress} variant="ghost-primary" size="medium" disabled={isOff(redo)} />
            <IconButton icon={IconAdd} onPress={add?.onPress} variant="ghost-primary" size="medium" disabled={isOff(add)} forcePressed={add?.active} />
            <IconButton icon={IconMic} onPress={voice?.onPress} variant="ghost-primary" size="medium" disabled={isOff(voice)} forcePressed={voice?.active} />
            <IconButton icon={IconScanText} onPress={scan?.onPress} variant="ghost-primary" size="medium" disabled={isOff(scan)} forcePressed={scan?.active} />
          </>
        )
      }
      right={
        <IconButton icon={IconTick} onPress={onDone} variant="ghost-primary" size="large" disabled={doneDisabled} />
      }
    />
  );
}
