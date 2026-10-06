/**
 * 앱의 모든 날짜 표기 — 'M월 D일'(연도가 필요하면 'YYYY년 M월 D일'). 다른 포맷(10/6, 2026.10.06 등)을 따로 만들지 않는다.
 * 문자열('YYYY-MM-DD'·ISO 시각) 또는 Date를 받는다.
 * 'YYYY-MM-DD'는 현지 날짜로 읽는다(new Date('YYYY-MM-DD')는 UTC라 시간대에 따라 하루 밀린다).
 */
export function shortDate(value: string | Date, opts?: {withYear?: boolean}): string {
  const d = toDate(value);
  if (!d) return '-';
  const md = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return opts?.withYear ? `${d.getFullYear()}년 ${md}` : md;
}

/** 날짜 + 시각 'M월 D일 HH:mm' */
export function dateTime(value: string | Date): string {
  const d = toDate(value);
  if (!d) return '-';
  return `${shortDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function toDate(value: string | Date): Date | null {
  let d: Date;
  if (value instanceof Date) d = value;
  else {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
  }
  return Number.isNaN(d.getTime()) ? null : d;
}


/** 마지막 동기화 표시 — 방금 / N분 전 / N시간 전 / 그 전은 'M월 D일 HH:mm' */
export function syncTimeLabel(date: Date, t: (key: string, params?: Record<string, unknown>) => string): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return t('profile.syncJustNow');
  if (diffMin < 60) return t('profile.syncMinutesAgo', {count: diffMin});
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t('profile.syncHoursAgo', {count: diffHour});
  return dateTime(date);
}
