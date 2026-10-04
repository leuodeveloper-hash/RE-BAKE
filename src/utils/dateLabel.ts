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

