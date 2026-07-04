import React from 'react';
import {ViewStyle} from 'react-native';
import {IconButton} from '@components/IconButton';
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
  style,
}: EditorToolbarProps) {
  return (
    <KeyboardToolbar
      style={style}
      above={above}
      left={
        <>
          <IconButton icon={IconChevronLeft} onPress={prev?.onPress} variant="ghost-primary" size="medium" disabled={isOff(prev)} />
          <IconButton icon={IconChevronRight} onPress={next?.onPress} variant="ghost-primary" size="medium" disabled={isOff(next)} />
          <IconButton icon={IconUndo} onPress={undo?.onPress} variant="ghost-primary" size="medium" disabled={isOff(undo)} />
          <IconButton icon={IconRedo} onPress={redo?.onPress} variant="ghost-primary" size="medium" disabled={isOff(redo)} />
          <IconButton icon={IconAdd} onPress={add?.onPress} variant="ghost-primary" size="medium" disabled={isOff(add)} forcePressed={add?.active} />
          <IconButton icon={IconMic} onPress={voice?.onPress} variant="ghost-primary" size="medium" disabled={isOff(voice)} forcePressed={voice?.active} />
          <IconButton icon={IconScanText} onPress={scan?.onPress} variant="ghost-primary" size="medium" disabled={isOff(scan)} forcePressed={scan?.active} />
        </>
      }
      right={
        <IconButton icon={IconTick} onPress={onDone} variant="ghost-primary" size="large" disabled={doneDisabled} />
      }
    />
  );
}
