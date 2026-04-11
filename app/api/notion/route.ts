import { NextRequest, NextResponse } from "next/server";
import {
  queryMorningPages,
  queryCheckinWeeks,
  createMorningPage,
  createArtistDate,
  createCheckin,
} from "../../lib/notion";
import { fmtDate } from "@/app/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── 모닝페이지 전체 로드 ─────────────────────────────────────────
    if (action === "query_morning") {
      const entries = await queryMorningPages();
      return NextResponse.json({ entries });
    }

    // ── 체크인 완료 주차 로드 ────────────────────────────────────────
    if (action === "query_checkin") {
      const weeks = await queryCheckinWeeks();
      return NextResponse.json({ weeks });
    }

    // ── 모닝페이지 저장 ──────────────────────────────────────────────
    if (action === "create_morning") {
      const { date, text, mood } = body;
      await createMorningPage({
        date,
        text,
        mood,
        chars: text.length,
        title: `${fmtDate(date)} 모닝페이지`,
      });
      return NextResponse.json({ success: true });
    }

    // ── 아티스트 데이트 저장 ─────────────────────────────────────────
    if (action === "create_artist") {
      await createArtistDate(body);
      return NextResponse.json({ success: true });
    }

    // ── 체크인 저장 ──────────────────────────────────────────────────
    if (action === "create_checkin") {
      const { week, theme, date, mpDays, adDone, readingFast,
              feeling, answers, questions, discovery, nextWeek } = body;

      const qaText = (questions as string[])
        .map((q: string, i: number) => `Q${i + 1}. ${q}\n→ ${answers[i] || "(미작성)"}`)
        .join("\n\n");

      await createCheckin({ week, theme, date, mpDays, adDone, readingFast,
                            feeling, qaText, discovery, nextWeek });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });

  } catch (err: any) {
    console.error("[notion/route]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
