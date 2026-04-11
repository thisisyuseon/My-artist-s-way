import { Client } from "@notionhq/client";
import { MorningEntry } from "@/types";

// 서버 사이드 전용 — API Route에서만 import
export const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const DB_MORNING  = process.env.NOTION_DB_MORNING!;
const DB_ARTIST   = process.env.NOTION_DB_ARTIST!;
const DB_CHECKIN  = process.env.NOTION_DB_CHECKIN!;

// ── 헬퍼: rich_text 값 추출 ─────────────────────────────────────────
function getText(prop: any): string {
  return prop?.rich_text?.map((r: any) => r.plain_text).join("") ?? "";
}
function getTitle(prop: any): string {
  return prop?.title?.map((r: any) => r.plain_text).join("") ?? "";
}
function getDate(prop: any): string {
  return prop?.date?.start ?? "";
}
function getSelect(prop: any): string {
  return prop?.select?.name ?? "";
}
function getNumber(prop: any): number {
  return prop?.number ?? 0;
}

// ── 모닝페이지 전체 조회 ─────────────────────────────────────────────
export async function queryMorningPages(): Promise<MorningEntry[]> {
  const results: MorningEntry[] = [];
  let cursor: string | undefined;

  do {
    const res = await notion.databases.query!({
      database_id: DB_MORNING,
      sorts: [{ property: "날짜", direction: "descending" }],
      start_cursor: cursor,
    });

    for (const page of res.results as any[]) {
      const p = page.properties;
      results.push({
        date: getDate(p["날짜"]),
        text: getText(p["내용"]),
        mood: getSelect(p["기분"]),
      });
    }

    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return results;
}

// ── 체크인 완료 주차 조회 ────────────────────────────────────────────
export async function queryCheckinWeeks(): Promise<number[]> {
  const weeks: number[] = [];
  let cursor: string | undefined;

  do {
    const res = await notion.databases.query!({
      
      database_id: DB_CHECKIN,
      start_cursor: cursor,
    });

    for (const page of res.results as any[]) {
      const w = getNumber(page.properties["주차"]);
      if (w) weeks.push(w);
    }

    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return weeks;
}

// ── 모닝페이지 저장 ──────────────────────────────────────────────────
export async function createMorningPage(data: {
  date: string; text: string; mood: string; chars: number; title: string;
}) {
  return notion.pages.create({
    parent: { database_id: DB_MORNING },
    properties: {
      "제목":  { title: [{ text: { content: data.title } }] },
      "날짜":  { date: { start: data.date } },
      "내용":  { rich_text: [{ text: { content: data.text.slice(0, 2000) } }] },
      "기분":  { select: data.mood ? { name: data.mood } : null },
      "글자수": { number: data.chars },
      "완료":  { checkbox: true },
    },
  });
}

// ── 아티스트 데이트 저장 ─────────────────────────────────────────────
export async function createArtistDate(data: {
  title: string; date: string; place: string; category: string;
  alone: boolean; feeling: string; keywords: string;
}) {
  return notion.pages.create({
    parent: { database_id: DB_ARTIST },
    properties: {
      "제목":       { title: [{ text: { content: data.title } }] },
      "날짜":       { date: { start: data.date } },
      "장소":       { rich_text: [{ text: { content: data.place } }] },
      "카테고리":   { select: data.category ? { name: data.category } : null },
      "혼자였나요": { checkbox: data.alone },
      "느낀점":     { rich_text: [{ text: { content: data.feeling } }] },
      "영감 키워드":{ rich_text: [{ text: { content: data.keywords } }] },
    },
  });
}

// ── 주간 체크인 저장 ─────────────────────────────────────────────────
export async function createCheckin(data: {
  week: number; theme: string; date: string;
  mpDays: number; adDone: boolean; readingFast: boolean;
  feeling: string; qaText: string; discovery: string; nextWeek: string;
}) {
  return notion.pages.create({
    parent: { database_id: DB_CHECKIN },
    properties: {
      "제목":               { title: [{ text: { content: `Week ${data.week} — ${data.theme}` } }] },
      "주차":               { number: data.week },
      "완료일":             { date: { start: data.date } },
      "모닝페이지 일수":    { number: data.mpDays },
      "아티스트 데이트 했나요": { checkbox: data.adDone },
      "읽기 금지 했나요":   { checkbox: data.readingFast },
      "이번 주 전반적인 느낌": { select: data.feeling ? { name: data.feeling } : null },
      "장 요약 & 나의 인사이트": { rich_text: [{ text: { content: data.qaText.slice(0, 2000) } }] },
      "이번 주 가장 큰 발견":   { rich_text: [{ text: { content: data.discovery } }] },
      "다음 주에 가져갈 것":    { rich_text: [{ text: { content: data.nextWeek } }] },
    },
  });
}
