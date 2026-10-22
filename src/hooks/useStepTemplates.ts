import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {doc, getDoc, setDoc} from 'firebase/firestore';
import {db} from '@config/firebase';
import {useAuth} from '@contexts/AuthContext';
import {isLocalUri, uploadImageTo} from '@utils/imageUpload';
import type {StepPhoto} from '../types/recipe';

const CACHE_KEY = 'step_templates';
/** 너무 많으면 고르기 어렵다 */
export const MAX_STEP_TEMPLATES = 50;

/** 템플릿 안 과정 하나 */
export interface TemplateStep {
  description: string;
  tip?: string;
  caution?: string;
  photos?: StepPhoto[];
}

/**
 * 자주 쓰는 과정 — 과정 하나(설명·팁·주의·사진), 또는 group이 있으면 묶음(섹션) 통째로
 * (묶음 이름·타이머·안의 과정 전부).
 */
export interface StepTemplate {
  id: string;
  /** 묶음 템플릿 — 불러오면 이 묶음 전체가 새 묶음으로 들어간다 */
  group?: {title: string; timer?: string; steps: TemplateStep[]};
  description: string;
  tip?: string;
  caution?: string;
  photos?: StepPhoto[];
  /** 어느 레시피에서 저장했는지(요리명) */
  source?: string;
  createdAt: string;
}

/**
 * 자주 쓰는 과정 템플릿 — 회고처럼 계정(users/{uid}.stepTemplates)에 두고 AsyncStorage는 캐시.
 * 로그인 전엔 기기에만, 로그인하면 계정 값과 합친다.
 * 사진은 저장할 때 Storage에 올려 주소로 둔다(다른 기기에서도 보이게).
 */
function useStepTemplatesState() {
  const {user} = useAuth();
  const [templates, setTemplates] = useState<StepTemplate[]>([]);
  const uidRef = useRef<string | undefined>(undefined);
  uidRef.current = user?.uid;

  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then(v => { if (v) { const p = JSON.parse(v); if (Array.isArray(p)) setTemplates(p); } })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    let alive = true;
    getDoc(doc(db, 'users', uid)).then(snap => {
      if (!alive) return;
      const remote: StepTemplate[] = Array.isArray(snap.data()?.stepTemplates) ? snap.data()!.stepTemplates : [];
      setTemplates(prev => {
        const ids = new Set(remote.map(r => r.id));
        const next = [...remote, ...prev.filter(p => !ids.has(p.id))].slice(0, MAX_STEP_TEMPLATES);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
        if (prev.some(p => !ids.has(p.id))) {
          setDoc(doc(db, 'users', uid), {stepTemplates: next}, {mergeFields: ['stepTemplates']}).catch(() => {});
        }
        return next;
      });
    }).catch(e => console.warn('[useStepTemplates] 불러오기 실패:', e));
    return () => { alive = false; };
  }, [user?.uid]);

  const persist = useCallback((next: StepTemplate[]) => {
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
    const uid = uidRef.current;
    if (uid) setDoc(doc(db, 'users', uid), {stepTemplates: next}, {mergeFields: ['stepTemplates']})
      .catch(e => console.warn('[useStepTemplates] 저장 실패:', e));
  }, []);

  /** 과정 하나를 템플릿으로 — 기기 안 사진은 먼저 올린다(로그인했을 때) */
  const addTemplate = useCallback(async (step: {description: string; tip?: string; caution?: string; photos?: StepPhoto[]; source?: string}) => {
    const uid = uidRef.current;
    const id = `t_${Date.now().toString(36)}`;
    const photos = await Promise.all((step.photos ?? []).map(async (p, i) => {
      if (!uid || !isLocalUri(p.uri)) return p;
      try {
        return {...p, uri: await uploadImageTo(p.uri, `recipe_images/tpl_${uid}_${id}_${i}`)};
      } catch {
        return p;
      }
    }));
    const tpl: StepTemplate = {
      id,
      description: step.description.trim(),
      ...(step.tip?.trim() ? {tip: step.tip.trim()} : {}),
      ...(step.caution?.trim() ? {caution: step.caution.trim()} : {}),
      ...(photos.length ? {photos: photos.map(p => (p.caption ? {uri: p.uri, caption: p.caption} : {uri: p.uri}))} : {}),
      ...(step.source?.trim() ? {source: step.source.trim()} : {}),
      createdAt: new Date().toISOString(),
    };
    setTemplates(prev => {
      const next = [tpl, ...prev].slice(0, MAX_STEP_TEMPLATES);
      persist(next);
      return next;
    });
    return tpl;
  }, [persist]);

  /** 묶음(섹션) 통째로 템플릿으로 — 안 과정들의 기기 안 사진도 올린다 */
  const addGroupTemplate = useCallback(async (group: {title: string; timer?: string; steps: TemplateStep[]; source?: string}) => {
    const uid = uidRef.current;
    const id = `g_${Date.now().toString(36)}`;
    const steps = await Promise.all(group.steps.map(async (st, si) => {
      const photos = await Promise.all((st.photos ?? []).map(async (p, i) => {
        if (!uid || !isLocalUri(p.uri)) return p;
        try { return {...p, uri: await uploadImageTo(p.uri, `recipe_images/tpl_${uid}_${id}_${si}_${i}`)}; } catch { return p; }
      }));
      return {
        description: st.description.trim(),
        ...(st.tip?.trim() ? {tip: st.tip.trim()} : {}),
        ...(st.caution?.trim() ? {caution: st.caution.trim()} : {}),
        ...(photos.length ? {photos: photos.map(p => (p.caption ? {uri: p.uri, caption: p.caption} : {uri: p.uri}))} : {}),
      };
    }));
    const tpl: StepTemplate = {
      id,
      group: {title: group.title.trim(), ...(group.timer ? {timer: group.timer} : {}), steps},
      description: group.title.trim(),
      ...(group.source?.trim() ? {source: group.source.trim()} : {}),
      createdAt: new Date().toISOString(),
    };
    setTemplates(prev => {
      const next = [tpl, ...prev].slice(0, MAX_STEP_TEMPLATES);
      persist(next);
      return next;
    });
    return tpl;
  }, [persist]);

  /** 글만 고친다(사진은 그대로) */
  const updateTemplate = useCallback((id: string, patch: {description: string; tip?: string; caution?: string}) => {
    setTemplates(prev => {
      const next = prev.map(t => {
        if (t.id !== id) return t;
        const {tip: _tip, caution: _caution, ...rest} = t;
        return {
          ...rest,
          description: patch.description.trim(),
          ...(patch.tip?.trim() ? {tip: patch.tip.trim()} : {}),
          ...(patch.caution?.trim() ? {caution: patch.caution.trim()} : {}),
        };
      });
      persist(next);
      return next;
    });
  }, [persist]);

  const removeTemplate = useCallback((id: string) => {
    setTemplates(prev => {
      const next = prev.filter(t => t.id !== id);
      persist(next);
      return next;
    });
  }, [persist]);

  return {templates, addTemplate, addGroupTemplate, updateTemplate, removeTemplate};
}

type Value = ReturnType<typeof useStepTemplatesState>;
const Ctx = createContext<Value | null>(null);

export function StepTemplatesProvider({children}: {children: React.ReactNode}) {
  const value = useStepTemplatesState();
  return React.createElement(Ctx.Provider, {value}, children);
}

export function useStepTemplates(): Value {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStepTemplates must be used within StepTemplatesProvider');
  return ctx;
}
