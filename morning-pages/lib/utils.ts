import { Stats, WeekDay } from "@/types";

export const todayStr = (): string =>
  new Date().toISOString().slice(0, 10);

export const fmtDate = (k: string): string => {
  const [y, m, d] = k.split("-");
  return `${y}년 ${m}월 ${d}일`;
};

export const rand = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

export function calcStats(dates: string[]): Stats {
  const set = new Set(dates);
  const today = todayStr();

  // 연속 작성일 계산
  let streak = 0;
  const d = new Date();
  while (true) {
    const k = d.toISOString().slice(0, 10);
    if (!set.has(k)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }

  // 이번 주 월~일 계산
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const daysSinceMon = (dow + 6) % 7; // Mon=0 ... Sun=6
  const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

  const week: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(now);
    dd.setDate(now.getDate() - daysSinceMon + i);
    const k = dd.toISOString().slice(0, 10);
    return { key: k, day: DAY_LABELS[i], done: set.has(k) };
  });

  return {
    streak,
    week,
    weekCount: week.filter((w) => w.done).length,
    todayDone: set.has(today),
  };
}
