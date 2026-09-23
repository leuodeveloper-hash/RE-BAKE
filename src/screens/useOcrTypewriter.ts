import {useCallback, useEffect, useRef, useState} from 'react';
import {Platform} from 'react-native';
import {triggerHaptic} from '@utils/haptics';
import type {RecipeOcrField} from '@utils/recipeOcr';

/** steps 점진 노출 후 마무리 대기 시간 */
const REVEAL_TAIL_MS = 3800;
/** steps 청크 간격 (2 항목씩) */
const CHUNK_INTERVAL_MS = 220;
/**
 * 안전장치: RainbowText onDone이 (인터럽트 등으로) 안 떠도 입력이 transparent로
 * 영영 남지 않도록, 최대 애니메이션 시간 후 강제로 타이핑 종료해 글을 노출시킨다.
 */
const TYPING_SAFETY_MS = 6000;

interface TypewriteStepsDeps {
  /** 첫 묶음의 과정을 점진적으로 채운다 */
  setSteps: (descriptions: string[]) => void;
}

/**
 * OCR(이미지 인식) 결과를 "타자기처럼" 써 넣는 로직.
 *
 * 편집 화면에서 분리했다 — 화면 파일이 3,786줄이라 읽기 어려웠고, 이 로직은
 * 타이머·햅틱만 다뤄 화면 구조와 거의 무관하다.
 *
 * 화면은 typing/typingField를 받아 입력 글자를 transparent로 만들고 그 위에
 * 무지개 오버레이를 덮는다. 둘은 **반드시 같은 조건**을 써야 한다 — 한쪽만
 * 참이면 글자도 오버레이도 없는 "빈 화면"이 된다(실제로 그랬다).
 */
export function useOcrTypewriter({setSteps}: TypewriteStepsDeps) {
  const [typing, setTyping] = useState(false);
  const [typingField, setTypingField] = useState<RecipeOcrField | null>(null);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTargetRef = useRef<{value: string; setter: (v: string) => void} | null>(null);
  const stepsTypewriterRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 과정 타자기 안전장치 — typewriteSteps에서 설정/해제한다 */
  const stepsSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    if (stepsTypewriterRef.current) clearTimeout(stepsTypewriterRef.current);
    if (stepsSafetyRef.current) clearTimeout(stepsSafetyRef.current);
  }, []);

  // 애니메이션 종료(RainbowText onDone)에서 호출 — 오버레이 숨기고 실제 입력값 노출
  const finishTyping = useCallback(() => {
    if (typewriterRef.current) { clearTimeout(typewriterRef.current); typewriterRef.current = null; }
    setTyping(false);
    setTypingField(null);
    typingTargetRef.current = null;
    // 한 필드 reveal(쓱싹)이 끝날 때마다 가벼운 햅틱
    triggerHaptic('selection');
  }, []);

  // 글씨가 써지는(타자기 reveal) 동안 연속 진동 "브아아앙"
  useEffect(() => {
    if (Platform.OS === 'web' || !typing) return;
    const id = setInterval(() => triggerHaptic('selection'), 60);
    return () => clearInterval(id);
  }, [typing]);

  /** 최종 값을 세팅하고 RainbowText 애니메이션(muted reveal → on-surface 변환 파도) 시작 */
  const typewriteString = useCallback((target: string, setter: (v: string) => void, field: RecipeOcrField | null = null) => {
    if (typewriterRef.current) { clearTimeout(typewriterRef.current); typewriterRef.current = null; }
    typingTargetRef.current = {value: target, setter};
    setter(target);
    setTyping(true);
    setTypingField(field);
    typewriterRef.current = setTimeout(finishTyping, TYPING_SAFETY_MS);
  }, [finishTyping]);

  /** 기존 텍스트(prefix)에 새 항목을 이어붙인 최종 값을 세팅하고 애니메이션 시작 */
  const typewriteAppendItems = useCallback((newItems: string[], prefix: string, setter: (v: string) => void, field: RecipeOcrField | null = null, separator = ', ') => {
    if (typewriterRef.current) { clearTimeout(typewriterRef.current); typewriterRef.current = null; }
    const full = prefix + newItems.join(separator);
    typingTargetRef.current = {value: full, setter};
    setter(full);
    setTyping(true);
    setTypingField(field);
    typewriterRef.current = setTimeout(finishTyping, TYPING_SAFETY_MS);
  }, [finishTyping]);

  /** 타이핑/OCR 중단: 현재 타이핑 중이면 즉시 전체 값 채우고 종료 */
  const stopTyping = useCallback(() => {
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current);
      typewriterRef.current = null;
    }
    const t = typingTargetRef.current;
    if (t) t.setter(t.value);
    typingTargetRef.current = null;
    if (stepsTypewriterRef.current) {
      clearTimeout(stepsTypewriterRef.current);
      stepsTypewriterRef.current = null;
    }
    if (stepsSafetyRef.current) {
      clearTimeout(stepsSafetyRef.current);
      stepsSafetyRef.current = null;
    }
    setTyping(false);
    setTypingField(null);
  }, []);

  /** step descriptions를 2개씩 점진적으로 추가 + 무지개 스윕 유지 */
  const typewriteSteps = useCallback((descriptions: string[]) => {
    if (typewriterRef.current) { clearTimeout(typewriterRef.current); typewriterRef.current = null; }
    if (stepsTypewriterRef.current) { clearTimeout(stepsTypewriterRef.current); stepsTypewriterRef.current = null; }
    if (stepsSafetyRef.current) { clearTimeout(stepsSafetyRef.current); stepsSafetyRef.current = null; }
    if (descriptions.length === 0) return;
    setTyping(true);
    setTypingField('steps');
    // 안전장치: 청크 타이머가 끊기면(화면 이동·인터럽트 등) typing이 true로 남아
    // 입력 글자가 transparent인 채 무지개 오버레이도 없는 "빈 화면"이 된다.
    // 예상 소요시간 + 여유 뒤에는 무조건 글을 노출시킨다.
    const expectedMs = Math.ceil(descriptions.length / 2) * CHUNK_INTERVAL_MS + REVEAL_TAIL_MS + 2000;
    stepsSafetyRef.current = setTimeout(() => {
      setTyping(false);
      setTypingField(null);
      stepsSafetyRef.current = null;
    }, expectedMs);
    // 시작: 빈 step만 남기기
    setSteps([]);
    let revealed = 0;
    const CHUNK = 2;
    const finalize = () => {
      stepsTypewriterRef.current = setTimeout(() => {
        setTyping(false);
        setTypingField(null);
        stepsTypewriterRef.current = null;
        if (stepsSafetyRef.current) { clearTimeout(stepsSafetyRef.current); stepsSafetyRef.current = null; }
      }, REVEAL_TAIL_MS);
    };
    const tick = () => {
      revealed = Math.min(revealed + CHUNK, descriptions.length);
      setSteps(descriptions.slice(0, revealed));
      // 청크가 찍힐 때마다 쓱싹 햅틱
      triggerHaptic('selection');
      if (revealed >= descriptions.length) {
        finalize();
      } else {
        stepsTypewriterRef.current = setTimeout(tick, CHUNK_INTERVAL_MS);
      }
    };
    stepsTypewriterRef.current = setTimeout(tick, 0);
  }, [setSteps]);

  return {
    typing,
    typingField,
    finishTyping,
    typewriteString,
    typewriteAppendItems,
    typewriteSteps,
    stopTyping,
  };
}
